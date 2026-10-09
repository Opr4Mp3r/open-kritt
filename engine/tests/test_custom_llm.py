import json

import pytest

from open_kritt_engine.custom_llm import (
    CustomLlm,
    CustomLlmError,
    codex_custom_config_args,
    load_custom_llm,
    require_custom_llm,
    wait_for_custom_llm_runtime,
)
from open_kritt_engine.generation import GenerationValidationError, validate_generation_job
from open_kritt_engine.harnesses import codex_exec_command

PROVIDER_ID = "custom:11111111-1111-4111-8111-111111111111"
API_KEY = "custom-secret-key"


def _custom(**overrides):
    payload = {
        "id": PROVIDER_ID,
        "name": "Relay",
        "harness": "codex",
        "base_url": "https://relay.example/v1",
        "wire_api": "responses",
        "api_key": API_KEY,
        "models": ("gpt-x",),
        "default_model": "gpt-x",
        "enabled": True,
    }
    payload.update(overrides)
    return CustomLlm(**payload)


def test_codex_command_points_at_the_custom_endpoint_without_the_key():
    custom = _custom()
    command = codex_exec_command(
        repo_dir="/work",
        model="gpt-x",
        schema_path="/tmp/schema.json",
        output_path="/tmp/out.json",
        model_provider=PROVIDER_ID,
        thinking_effort="medium",
        allow_tools=False,
        custom_llm=custom,
    )
    rendered = " ".join(command)
    assert API_KEY not in rendered
    assert f'model_provider="{custom.codex_provider_id}"' in rendered
    assert 'base_url="https://relay.example/v1"' in rendered
    assert 'env_key="OPEN_KRITT_CUSTOM_LLM_KEY"' in rendered
    assert 'wire_api="responses"' in rendered
    assert "--search" not in command
    assert codex_custom_config_args(custom)


def _provider_payload(*, harness, wire_api, model, base_url, api_key=None):
    payload = {
        "id": PROVIDER_ID,
        "name": "Relay",
        "harness": harness,
        "baseUrl": base_url,
        "wireApi": wire_api,
        "models": [{"id": model}],
        "defaultModel": model,
        "enabled": True,
    }
    if api_key is not None:
        payload["apiKey"] = api_key
    return payload


def test_custom_llm_round_trip_keeps_the_key_out_of_the_catalog(tmp_path):
    credentials = tmp_path / "providers.json"
    (tmp_path / "custom-llm-providers.json").write_text(
        json.dumps(
            {
                "version": 1,
                "providers": [
                    _provider_payload(
                        harness="claude-code",
                        wire_api="anthropic",
                        model="claude-x",
                        base_url="https://claude.example",
                    )
                ],
            }
        ),
        encoding="utf-8",
    )
    (tmp_path / "custom-llm-runtime.json").write_text(
        json.dumps(
            {
                "version": 1,
                "providers": [
                    _provider_payload(
                        harness="claude-code",
                        wire_api="anthropic",
                        model="claude-x",
                        base_url="https://claude.example",
                        api_key=API_KEY,
                    )
                ],
            }
        ),
        encoding="utf-8",
    )
    loaded = load_custom_llm(PROVIDER_ID, credentials_path=str(credentials))
    assert loaded is not None
    assert loaded.api_key == API_KEY
    assert loaded.harness == "claude-code"
    assert API_KEY not in (tmp_path / "custom-llm-providers.json").read_text(encoding="utf-8")
    try:
        require_custom_llm(PROVIDER_ID, expected_harness="codex", credentials_path=str(credentials))
    except Exception as exc:
        assert "claude-code" in str(exc)
    else:
        raise AssertionError("expected a harness mismatch")


def test_codex_chat_wire_api_is_not_passed_to_the_cli():
    custom = _custom(wire_api="chat")
    with pytest.raises(CustomLlmError, match="Responses"):
        codex_custom_config_args(custom)


def _write_custom_files(tmp_path, *, harness, wire_api, model):
    credentials = tmp_path / "providers.json"
    provider = _provider_payload(
        harness=harness,
        wire_api=wire_api,
        model=model,
        base_url="https://relay.example/v1",
    )
    (tmp_path / "custom-llm-providers.json").write_text(
        json.dumps({"version": 1, "providers": [provider]}),
        encoding="utf-8",
    )
    (tmp_path / "custom-llm-runtime.json").write_text(
        json.dumps({"version": 1, "providers": [{**provider, "apiKey": API_KEY}]}),
        encoding="utf-8",
    )
    return str(credentials)


def test_startup_waits_for_one_runtime_snapshot_and_does_not_join_old_files(tmp_path):
    credentials = tmp_path / "providers.json"
    (tmp_path / "custom-llm-providers.json").write_text(
        json.dumps(
            {
                "version": 1,
                "providers": [
                    _provider_payload(
                        harness="codex",
                        wire_api="responses",
                        model="gpt-x",
                        base_url="https://new.example/v1",
                    )
                ],
            }
        ),
        encoding="utf-8",
    )
    (tmp_path / "custom-llm-secrets.json").write_text(
        json.dumps({"version": 1, "secrets": {PROVIDER_ID: "new-key"}}),
        encoding="utf-8",
    )

    assert load_custom_llm(PROVIDER_ID, credentials_path=str(credentials)) is None
    assert wait_for_custom_llm_runtime(credentials_path=str(credentials), timeout_seconds=0, poll_seconds=0.01) is False

    (tmp_path / "custom-llm-runtime.json").write_text(
        json.dumps(
            {
                "version": 1,
                "providers": [
                    _provider_payload(
                        harness="codex",
                        wire_api="responses",
                        model="gpt-x",
                        base_url="https://old.example/v1",
                        api_key="old-key",
                    )
                ],
            }
        ),
        encoding="utf-8",
    )
    assert wait_for_custom_llm_runtime(credentials_path=str(credentials), timeout_seconds=0) is True
    loaded = load_custom_llm(PROVIDER_ID, credentials_path=str(credentials))
    assert loaded is not None
    assert loaded.base_url == "https://old.example/v1"
    assert loaded.api_key == "old-key"


def test_startup_does_not_wait_when_no_older_custom_llm_files_exist(tmp_path):
    assert wait_for_custom_llm_runtime(credentials_path=str(tmp_path / "providers.json"), timeout_seconds=30) is True


def test_executor_keeps_the_runtime_endpoint_and_key_together(tmp_path):
    credentials = tmp_path / "providers.json"
    (tmp_path / "custom-llm-providers.json").write_text(
        json.dumps(
            {
                "version": 1,
                "providers": [
                    _provider_payload(
                        harness="codex",
                        wire_api="responses",
                        model="gpt-x",
                        base_url="https://new.example/v1",
                    )
                ],
            }
        ),
        encoding="utf-8",
    )
    (tmp_path / "custom-llm-secrets.json").write_text(
        json.dumps({"version": 1, "secrets": {PROVIDER_ID: "new-key"}}),
        encoding="utf-8",
    )
    (tmp_path / "custom-llm-runtime.json").write_text(
        json.dumps(
            {
                "version": 1,
                "providers": [
                    _provider_payload(
                        harness="codex",
                        wire_api="responses",
                        model="gpt-x",
                        base_url="https://old.example/v1",
                        api_key="old-key",
                    )
                ],
            }
        ),
        encoding="utf-8",
    )

    loaded = require_custom_llm(PROVIDER_ID, expected_harness="codex", credentials_path=str(credentials))

    assert loaded.base_url == "https://old.example/v1"
    assert loaded.api_key == "old-key"


def _generation_job(kind, harness, model):
    return {
        "kind": kind,
        "request": "Draft a focused review.",
        "model": model,
        "model_provider": PROVIDER_ID,
        "harness": harness,
        "thinking_effort": "medium",
    }


@pytest.mark.parametrize("kind", ["workflow", "post_script"])
def test_generation_accepts_a_saved_custom_provider_for_workflow_and_post_script(tmp_path, kind):
    credentials = _write_custom_files(tmp_path, harness="codex", wire_api="responses", model="gpt-x")

    accepted = validate_generation_job(
        _generation_job(kind, "codex", "gpt-x"),
        credentials_path=credentials,
    )

    assert accepted["model_provider"] == PROVIDER_ID
    assert accepted["kind"] == kind


def test_generation_rejects_a_custom_provider_on_the_wrong_harness(tmp_path):
    credentials = _write_custom_files(tmp_path, harness="claude-code", wire_api="anthropic", model="claude-x")

    with pytest.raises(GenerationValidationError) as exc_info:
        validate_generation_job(_generation_job("workflow", "codex", "claude-x"), credentials_path=credentials)

    assert any(item["field"] == "harness" for item in exc_info.value.errors)


def test_generation_rejects_an_unknown_custom_provider(tmp_path):
    with pytest.raises(GenerationValidationError) as exc_info:
        validate_generation_job(
            _generation_job("post_script", "codex", "gpt-x"),
            credentials_path=str(tmp_path / "providers.json"),
        )

    assert any("not configured" in item["message"] for item in exc_info.value.errors)

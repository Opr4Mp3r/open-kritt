"""Custom LLM endpoints bound to one harness.

A harness is the agent runtime (Codex CLI, Claude Code). A custom LLM is only
the endpoint that runtime calls. Codex receives an OpenAI Responses
``model_providers`` entry. Claude Code receives an Anthropic-compatible base
URL and token. The pinned Codex CLI rejects ``wire_api="chat"``; Chat
Completions endpoints are not translated here. The API key stays in the
environment named by ``env_key`` and is never placed on the command line.
"""

import json
import logging
import os
import re
import time
from dataclasses import dataclass
from pathlib import Path

LOGGER = logging.getLogger("open_kritt_engine")

CUSTOM_LLM_ID_RE = re.compile(r"^custom:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
CUSTOM_LLM_ENV_KEY = "OPEN_KRITT_CUSTOM_LLM_KEY"
MAX_FILE_BYTES = 1024 * 1024


class CustomLlmError(RuntimeError):
    """The saved custom LLM cannot be used. The message is safe to show."""


@dataclass(frozen=True)
class CustomLlm:
    id: str
    name: str
    harness: str
    base_url: str
    wire_api: str
    api_key: str
    models: tuple[str, ...]
    default_model: str
    enabled: bool

    def __repr__(self) -> str:
        return f"CustomLlm(id={self.id!r}, harness={self.harness!r}, wire_api={self.wire_api!r})"

    @property
    def codex_provider_id(self) -> str:
        return "c" + self.id.removeprefix("custom:").replace("-", "")


def is_custom_model_provider(value) -> bool:
    return bool(CUSTOM_LLM_ID_RE.fullmatch(str(value or "").strip().lower()))


def codex_provider_id(provider_id: str) -> str:
    return "c" + str(provider_id).strip().lower().removeprefix("custom:").replace("-", "")


def custom_llm_paths(credentials_path: str | None = None) -> dict[str, Path]:
    configured = credentials_path or os.getenv("OPEN_KRITT_PROVIDER_CREDENTIALS_PATH") or "/credentials/providers.json"
    root = Path(configured)
    return {
        "catalog": root.with_name("custom-llm-providers.json"),
        "secrets": root.with_name("custom-llm-secrets.json"),
        "runtime": root.with_name("custom-llm-runtime.json"),
    }


def _read_json(path: Path):
    try:
        if path.stat().st_size > MAX_FILE_BYTES:
            return None
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def _text(payload: dict, *keys: str) -> str:
    for key in keys:
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


def custom_llm_runtime_is_ready(credentials_path: str | None = None) -> bool:
    """True when a job can read one snapshot, or when there is nothing to restore.

    An older directory has a catalog and secrets file but no runtime file.
    Those two files are not a snapshot: joining them can pair a new key with
    the previous endpoint. Wait for the backend to publish the runtime file.
    """

    paths = custom_llm_paths(credentials_path)
    if paths["runtime"].is_file():
        return True
    return not (paths["catalog"].is_file() or paths["secrets"].is_file())


def wait_for_custom_llm_runtime(
    *,
    credentials_path: str | None = None,
    timeout_seconds: float = 120.0,
    poll_seconds: float = 0.2,
) -> bool:
    """Wait until startup has published the runtime snapshot. Do not read the split files."""

    if custom_llm_runtime_is_ready(credentials_path):
        return True
    deadline = time.monotonic() + max(0.0, timeout_seconds)
    while time.monotonic() < deadline:
        time.sleep(poll_seconds)
        if custom_llm_runtime_is_ready(credentials_path):
            return True
    if custom_llm_runtime_is_ready(credentials_path):
        return True
    LOGGER.error(
        "custom LLM runtime snapshot was not published; refusing to pair the older catalog and credential files"
    )
    return False


def load_custom_llm(provider_id: str, *, credentials_path: str | None = None) -> CustomLlm | None:
    provider = str(provider_id or "").strip().lower()
    if not is_custom_model_provider(provider):
        return None
    # One snapshot file. Reading the catalog and the secret file separately can
    # pair a new key with the previous endpoint while a save is in progress.
    runtime = _read_json(custom_llm_paths(credentials_path)["runtime"])
    providers = runtime.get("providers") if isinstance(runtime, dict) else None
    if not isinstance(providers, list):
        return None
    match = next(
        (
            item
            for item in providers
            if isinstance(item, dict) and str(item.get("id") or "").strip().lower() == provider
        ),
        None,
    )
    if not isinstance(match, dict):
        return None
    models = []
    for model in match.get("models") or []:
        if isinstance(model, str) and model.strip():
            models.append(model.strip())
        elif isinstance(model, dict) and str(model.get("id") or "").strip():
            models.append(str(model["id"]).strip())
    raw_key = match.get("apiKey")
    api_key = raw_key if isinstance(raw_key, str) else ""
    return CustomLlm(
        id=provider,
        name=_text(match, "name") or provider,
        harness=_text(match, "harness"),
        base_url=_text(match, "baseUrl", "base_url"),
        wire_api=_text(match, "wireApi", "wire_api"),
        api_key=api_key,
        models=tuple(models),
        default_model=_text(match, "defaultModel", "default_model"),
        enabled=match.get("enabled") is not False,
    )


def require_custom_llm(
    provider_id: str,
    *,
    expected_harness: str,
    credentials_path: str | None = None,
) -> CustomLlm:
    custom = load_custom_llm(provider_id, credentials_path=credentials_path)
    if custom is None or not custom.base_url or not custom.api_key:
        raise CustomLlmError("The selected custom LLM is missing its endpoint or API key.")
    if custom.harness != expected_harness:
        raise CustomLlmError(
            f'The selected custom LLM is configured for harness "{custom.harness}", not "{expected_harness}".'
        )
    if expected_harness == "codex" and custom.wire_api != "responses":
        raise CustomLlmError(
            'Codex 0.145.0 rejects wire_api="chat". Use an OpenAI Responses endpoint for this custom LLM.'
        )
    if expected_harness == "claude-code" and custom.wire_api != "anthropic":
        raise CustomLlmError("Claude Code custom LLMs must use the Anthropic Messages protocol.")
    return custom


def codex_custom_config_args(custom: CustomLlm) -> list[str]:
    """Non-secret Codex `-c` overrides for one custom endpoint.

    The CLI provider always uses ``wire_api="responses"``. A Chat Completions
    upstream is not rewritten into that protocol.
    """

    if custom.wire_api != "responses":
        raise CustomLlmError(
            'Codex 0.145.0 rejects wire_api="chat". Use an OpenAI Responses endpoint for this custom LLM.'
        )
    provider_id = custom.codex_provider_id
    prefix = f"model_providers.{provider_id}"
    return [
        "-c",
        f"{prefix}.name={json.dumps(custom.name)}",
        "-c",
        f"{prefix}.base_url={json.dumps(custom.base_url)}",
        "-c",
        f'{prefix}.env_key="{CUSTOM_LLM_ENV_KEY}"',
        "-c",
        f'{prefix}.wire_api="responses"',
        "-c",
        'web_search="disabled"',
    ]

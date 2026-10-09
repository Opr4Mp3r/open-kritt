-- Custom LLM endpoints bound to one harness. The harness is the agent runtime.
-- The provider row is only the endpoint, protocol, and model list for that runtime.
-- API keys stay out of this table.

CREATE TABLE IF NOT EXISTS public.custom_llm_providers (
    id text PRIMARY KEY CHECK (
        id ~ '^custom:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    ),
    name text NOT NULL,
    harness text NOT NULL CHECK (harness IN ('codex', 'claude-code')),
    base_url text NOT NULL,
    wire_api text NOT NULL,
    models jsonb NOT NULL,
    default_model text NOT NULL,
    enabled boolean NOT NULL DEFAULT true,
    inserted_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT custom_llm_providers_wire_api_check CHECK (
        (harness = 'codex' AND wire_api IN ('responses', 'chat'))
        OR (harness = 'claude-code' AND wire_api = 'anthropic')
    )
);

CREATE INDEX IF NOT EXISTS custom_llm_providers_harness_idx
    ON public.custom_llm_providers (harness);

-- Draft generation stores the provider id. Allow custom:<uuid> beside the built-ins.
-- 032 and 033 drop and recreate these checks on every startup, so they must
-- allow the same ids. This file still restates the final predicate.
ALTER TABLE public.generations
    DROP CONSTRAINT IF EXISTS generations_model_provider_check;

ALTER TABLE public.generations
    ADD CONSTRAINT generations_model_provider_check
    CHECK (
        model_provider IN ('codex', 'claude', 'openrouter', 'xai', 'deepseek')
        OR model_provider ~ '^custom:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    );

ALTER TABLE public.generations
    DROP CONSTRAINT IF EXISTS generations_check;

ALTER TABLE public.generations
    ADD CONSTRAINT generations_check
    CHECK (
        (model_provider = 'codex' AND harness = 'codex') OR
        (model_provider = 'claude' AND harness = 'claude-code') OR
        model_provider = 'openrouter' OR
        (model_provider = 'xai' AND harness = 'grok-build') OR
        (model_provider = 'deepseek' AND harness = 'codex') OR
        model_provider ~ '^custom:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    );

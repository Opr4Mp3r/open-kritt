-- Allow DeepSeek draft generation through the Codex harness.
--
-- Startup replays this file before 034. Keep custom:<uuid> in the rebuilt
-- checks so an existing custom generation does not abort the replay here.

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

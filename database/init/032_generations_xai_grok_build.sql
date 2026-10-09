-- Allow xAI Grok Build generations alongside existing provider/harness pairs.
--
-- Backend startup replays every file in this directory, in order. This rebuild
-- therefore has to accept provider ids added by later files (deepseek, and
-- custom:<uuid>). A narrower check fails when those rows already exist and
-- stops the process before 033 or 034 can run.

ALTER TABLE public.generations
    DROP CONSTRAINT IF EXISTS generations_model_provider_check;

ALTER TABLE public.generations
    ADD CONSTRAINT generations_model_provider_check
    CHECK (
        model_provider IN ('codex', 'claude', 'openrouter', 'xai', 'deepseek')
        OR model_provider ~ '^custom:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    );

ALTER TABLE public.generations
    DROP CONSTRAINT IF EXISTS generations_harness_check;

ALTER TABLE public.generations
    ADD CONSTRAINT generations_harness_check
    CHECK (harness IN ('codex', 'claude-code', 'grok-build'));

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

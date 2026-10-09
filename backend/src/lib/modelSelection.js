import { prisma } from '../db.js';
import { HARNESS_THINKING_EFFORTS, isCustomModelProvider } from './constants.js';
import { readCustomLlmRuntimeSync } from './customLlm.js';
import { modelCatalogEntry } from './modelCatalog.js';
import { isModelProviderConfigured } from './modelProviders.js';
import { ValidationError } from './validation.js';

async function findCatalog(provider) {
  return prisma.modelCatalog.findUnique({ where: { provider } });
}

function findCustomLlm(modelProvider) {
  const id = `${modelProvider || ''}`.trim().toLowerCase();
  const record = readCustomLlmRuntimeSync().providers.find((provider) => provider.id === id) || null;
  if (!record) return null;
  const { apiKey, ...safe } = record;
  return { ...safe, apiKeyConfigured: Boolean(apiKey) };
}

export async function assertModelSelectionAvailable(
  { modelProvider, model, thinkingEffort, harness },
  { providerConfigured = isModelProviderConfigured, getCatalog = findCatalog, getCustomLlm = findCustomLlm } = {}
) {
  if (isCustomModelProvider(modelProvider)) {
    const record = await getCustomLlm(modelProvider);
    if (!record?.enabled || !record.apiKeyConfigured) {
      throw new ValidationError([{ field: 'model_provider', message: 'The selected custom LLM is not configured.' }]);
    }
    if (harness && record.harness !== harness) {
      throw new ValidationError([
        {
          field: 'harness',
          message: `Harness "${harness}" is not compatible with custom LLM "${record.name}". Use ${record.harness}.`,
        },
      ]);
    }
    if (!record.models.some((candidate) => candidate.id === model)) {
      throw new ValidationError([
        { field: 'model', message: `Model "${model}" is not available for custom LLM "${record.name}".` },
      ]);
    }
    const efforts = HARNESS_THINKING_EFFORTS[record.harness] || [];
    if (thinkingEffort && !efforts.includes(thinkingEffort)) {
      throw new ValidationError([
        {
          field: 'thinking_effort',
          message: `Thinking effort "${thinkingEffort}" is not available for harness "${record.harness}".`,
        },
      ]);
    }
    return;
  }

  if (!(await providerConfigured(modelProvider))) {
    throw new ValidationError([{ field: 'model_provider', message: 'The selected model provider is not configured.' }]);
  }

  if (modelProvider === 'openrouter' || modelProvider === 'xai') return;

  const catalog = modelCatalogEntry(modelProvider, await getCatalog(modelProvider));
  if (catalog.status !== 'ready') {
    throw new ValidationError([
      { field: 'model', message: `The ${modelProvider} model catalog is not available yet.` },
    ]);
  }

  const selectedModel = catalog.models.find((candidate) => candidate.id === model);
  if (!selectedModel) {
    throw new ValidationError([
      { field: 'model', message: `Model "${model}" is not available for provider "${modelProvider}".` },
    ]);
  }

  if (thinkingEffort && !selectedModel.thinkingEfforts.includes(thinkingEffort)) {
    throw new ValidationError([
      {
        field: 'thinking_effort',
        message: `Thinking effort "${thinkingEffort}" is not available for model "${model}".`,
      },
    ]);
  }
}

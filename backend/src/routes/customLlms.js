import { Router } from 'express';

import { prisma as defaultPrisma } from '../db.js';
import {
  CUSTOM_LLM_HARNESSES,
  deleteCustomLlmSecret,
  isCustomModelProvider,
  newCustomLlmId,
  publishCustomLlmCatalog,
  readCustomLlmSecretsSync,
  serializeCustomLlm,
  validateCustomLlmInput,
  withCustomLlmMutation,
  writeCustomLlmSecret,
} from '../lib/customLlm.js';

function harnessCatalog() {
  return Object.entries(CUSTOM_LLM_HARNESSES).map(([id, spec]) => ({
    id,
    label: spec.label,
    wireApis: spec.wireApis,
    defaultWireApi: spec.defaultWireApi,
  }));
}

function providerData(record) {
  return {
    name: record.name,
    harness: record.harness,
    baseUrl: record.baseUrl,
    wireApi: record.wireApi,
    models: Array.isArray(record.models) ? [...record.models] : record.models,
    defaultModel: record.defaultModel,
    enabled: record.enabled,
  };
}

async function restoreSecret(id, previousSecret, credentialsPath) {
  if (previousSecret) await writeCustomLlmSecret(id, previousSecret, credentialsPath);
  else await deleteCustomLlmSecret(id, credentialsPath);
}

export function createCustomLlmsRouter({ prisma = defaultPrisma, credentialsPath } = {}) {
  const router = Router();

  async function loadRecords() {
    return prisma.customLlmProvider.findMany({ orderBy: { insertedAt: 'asc' } });
  }

  async function publishRecords(options) {
    // Read inside the catalog write queue. A GET that loaded rows earlier must
    // not publish that snapshot after a PATCH has already saved a newer one.
    await publishCustomLlmCatalog(() => loadRecords(), credentialsPath, options);
  }

  function publicRecord(record) {
    return serializeCustomLlm(record, readCustomLlmSecretsSync(credentialsPath).secrets);
  }

  async function usageCount(id) {
    const [scans, generations, metadata, postProcess, supplemental] = await Promise.all([
      prisma.scan.findMany({ select: { modelProvider: true, configuration: true, modelOverrides: true } }),
      prisma.generation.count({ where: { modelProvider: id } }),
      prisma.stepMetadata.count({ where: { modelProvider: id } }),
      prisma.postProcessMetadata.count({ where: { modelProvider: id } }),
      prisma.supplementalPostScriptRun.count({ where: { modelProvider: id } }),
    ]);
    const scanHits = scans.filter((scan) => {
      if (scan.modelProvider === id) return true;
      const configuration = JSON.stringify(scan.configuration ?? '');
      const overrides = JSON.stringify(scan.modelOverrides ?? '');
      return configuration.includes(id) || overrides.includes(id);
    }).length;
    return scanHits + generations + metadata + postProcess + supplemental;
  }

  router.get('/', async (req, res, next) => {
    try {
      const body = await withCustomLlmMutation(credentialsPath, async () => {
        // A damaged credential file keeps the last runtime snapshot. A save
        // uses the default mode and fails instead of reporting success.
        await publishRecords({ onCredentialError: 'keep-runtime' });
        const records = await loadRecords();
        const harness = typeof req.query.harness === 'string' ? req.query.harness : '';
        const providers = records.map(publicRecord).filter((provider) => !harness || provider.harness === harness);
        return { providers, harnesses: harnessCatalog() };
      });
      res.json(body);
    } catch (error) {
      next(error);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const input = validateCustomLlmInput(req.body, { requireApiKey: true });
      const id = newCustomLlmId();
      const body = await withCustomLlmMutation(credentialsPath, async () => {
        const row = await prisma.customLlmProvider.create({
          data: {
            id,
            name: input.name,
            harness: input.harness,
            baseUrl: input.baseUrl,
            wireApi: input.wireApi,
            models: input.models,
            defaultModel: input.defaultModel,
            enabled: input.enabled,
          },
        });
        try {
          await writeCustomLlmSecret(id, input.apiKey, credentialsPath);
          await publishRecords();
        } catch (error) {
          // Drop the new row and key before publishing again. A damaged credential
          // file is left as it was, and that failure must not publish the new row.
          let consistent = true;
          try {
            await deleteCustomLlmSecret(id, credentialsPath);
          } catch {
            consistent = false;
          }
          try {
            await prisma.customLlmProvider.delete({ where: { id } });
          } catch {
            consistent = false;
          }
          if (consistent) await publishRecords().catch(() => {});
          throw error;
        }
        return publicRecord(row);
      });
      res.status(201).json(body);
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:id', async (req, res, next) => {
    try {
      const id = `${req.params.id || ''}`.toLowerCase();
      if (!isCustomModelProvider(id)) return res.status(404).json({ error: 'Custom LLM not found.' });
      const result = await withCustomLlmMutation(credentialsPath, async () => {
        const existing = await prisma.customLlmProvider.findUnique({ where: { id } });
        if (!existing) return { status: 404, body: { error: 'Custom LLM not found.' } };
        const input = validateCustomLlmInput({
          name: req.body?.name ?? existing.name,
          harness: req.body?.harness ?? existing.harness,
          baseUrl: req.body?.baseUrl ?? existing.baseUrl,
          wireApi: req.body?.wireApi ?? existing.wireApi,
          models: req.body?.models ?? existing.models,
          defaultModel: req.body?.defaultModel ?? existing.defaultModel,
          enabled: req.body?.enabled ?? existing.enabled,
          apiKey: req.body?.apiKey,
        });
        if (input.harness !== existing.harness && (await usageCount(id)) > 0) {
          return {
            status: 409,
            body: { error: 'This custom LLM is used by a scan or draft. Create another one for a different harness.' },
          };
        }
        const previousData = providerData(existing);
        let updated;
        let previousSecret = null;
        let secretWritten = false;
        try {
          // Reject a damaged credential file before the database changes. A 409
          // must leave the saved endpoint, key, and catalog together.
          if (input.apiKey) {
            previousSecret = await writeCustomLlmSecret(id, input.apiKey, credentialsPath);
            secretWritten = true;
          }
          updated = await prisma.customLlmProvider.update({
            where: { id },
            data: providerData(input),
          });
          await publishRecords();
        } catch (error) {
          // This still holds the mutation lock, so the restored key is the one
          // read above, not a key saved by a request that arrived later.
          let consistent = true;
          if (updated) {
            try {
              await prisma.customLlmProvider.update({ where: { id }, data: previousData });
            } catch {
              consistent = false;
            }
          }
          if (secretWritten) {
            try {
              await restoreSecret(id, previousSecret, credentialsPath);
            } catch {
              consistent = false;
            }
          }
          if (consistent && (updated || secretWritten)) await publishRecords().catch(() => {});
          throw error;
        }
        return { status: 200, body: publicRecord(updated) };
      });
      res.status(result.status).json(result.body);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const id = `${req.params.id || ''}`.toLowerCase();
      if (!isCustomModelProvider(id)) return res.status(404).json({ error: 'Custom LLM not found.' });
      const result = await withCustomLlmMutation(credentialsPath, async () => {
        const existing = await prisma.customLlmProvider.findUnique({ where: { id } });
        if (!existing) return { status: 404, body: { error: 'Custom LLM not found.' } };
        if ((await usageCount(id)) > 0) {
          return {
            status: 409,
            body: { error: 'This custom LLM is used by a scan or draft. Remove that selection before deleting it.' },
          };
        }
        const previousData = { id, ...providerData(existing) };
        let removedSecret = null;
        let secretRemoved = false;
        let deleted = false;
        try {
          removedSecret = await deleteCustomLlmSecret(id, credentialsPath);
          secretRemoved = true;
          await prisma.customLlmProvider.delete({ where: { id } });
          deleted = true;
          await publishRecords();
        } catch (error) {
          let consistent = true;
          if (deleted) {
            try {
              await prisma.customLlmProvider.create({ data: previousData });
            } catch {
              consistent = false;
            }
          }
          if (secretRemoved) {
            try {
              await restoreSecret(id, removedSecret, credentialsPath);
            } catch {
              consistent = false;
            }
          }
          if (consistent && (deleted || secretRemoved)) await publishRecords().catch(() => {});
          throw error;
        }
        return { status: 204 };
      });
      if (result.status === 204) return res.status(204).end();
      return res.status(result.status).json(result.body);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

const router = createCustomLlmsRouter();

export default router;

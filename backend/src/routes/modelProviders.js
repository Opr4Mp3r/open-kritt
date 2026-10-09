import { Router } from 'express';

import { selectableCustomLlms } from '../lib/customLlm.js';
import { configuredModelProviders } from '../lib/modelProviders.js';

const router = Router();

// GET /api/model-providers — provider IDs with usable credentials only.
router.get('/', async (req, res, next) => {
  try {
    const custom = selectableCustomLlms().map((provider) => provider.id);
    res.json({ providers: [...(await configuredModelProviders()), ...custom] });
  } catch (e) {
    next(e);
  }
});

export default router;

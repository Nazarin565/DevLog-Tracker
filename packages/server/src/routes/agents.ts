import { Router } from 'express';

// Agent registry and implementations are wired in Step 6.
// This router is registered now so the route contract is in place.
export function createAgentRouter(): Router {
  const router = Router();

  router.post('/:agentId/run', (_req, res) => {
    res.status(503).json({ error: { message: 'Agent layer not yet initialised', code: 'not_ready' } });
  });

  return router;
}

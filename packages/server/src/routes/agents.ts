import { Router } from 'express';

export function createAgentRouter(): Router {
  const router = Router();

  router.post('/:agentId/run', (_req, res) => {
    res.status(503).json({ error: { message: 'Agent layer not yet initialised', code: 'not_ready' } });
  });

  return router;
}

import { Router } from 'express';
import { getAgent, listAgents } from '../agents/index.js';
import type { AgentContext } from '../agents/index.js';

export function createAgentRouter(ctx: AgentContext): Router {
  const router = Router();

  router.post('/:agentId/run', async (req, res, next) => {
    try {
      const agent = getAgent(req.params.agentId);
      if (!agent) {
        res.status(404).json({
          error: {
            message: `Agent '${req.params.agentId}' not found`,
            code: 'agent_not_found',
            available: listAgents(),
          },
        });
        return;
      }

      const result = await agent.run(req.body, ctx);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

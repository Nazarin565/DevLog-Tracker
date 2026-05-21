import { Router } from 'express';
import { DecomposeInputSchema, PrioritiseInputSchema } from '@devlog/shared';
import { getAgent, listAgents } from '../agents/index.js';
import type { AgentContext } from '../agents/index.js';

const INPUT_SCHEMAS: Record<string, { parse: (v: unknown) => unknown }> = {
  decompose: DecomposeInputSchema,
  prioritise: PrioritiseInputSchema,
};

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

      const schema = INPUT_SCHEMAS[req.params.agentId];
      const input = schema ? schema.parse(req.body) : req.body;

      const result = await agent.run(input, ctx);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

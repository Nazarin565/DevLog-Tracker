import { DecompositionResultSchema, type DecompositionResult } from '@devlog/shared';
import { SYSTEM_PROMPTS } from '../../llm/index.js';
import type { Agent, AgentContext, AgentMeta, AgentResult } from '../types.js';

const meta: AgentMeta = {
  id: 'decompose',
  name: 'Task Decomposition',
  description:
    'Breaks a task into concrete subtasks. If the description is too vague, asks clarifying questions instead.',
};

interface DecomposeInput {
  taskId: string;
}

export const decomposeAgent: Agent<DecomposeInput, DecompositionResult> = {
  id: meta.id,
  describe: () => meta,

  async run(input, ctx: AgentContext): Promise<AgentResult<DecompositionResult>> {
    const steps = [];

    const task = ctx.taskRepo.findById(input.taskId);
    if (!task) throw new Error(`Task '${input.taskId}' not found`);
    steps.push({ label: 'Fetched task', detail: task.title });

    steps.push({ label: 'Calling LLM' });

    const prompt = `Task title: ${task.title}\nDescription: ${task.description}`;
    const raw = await ctx.llm.complete(prompt, { systemPrompt: SYSTEM_PROMPTS.decomposition });

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      throw new Error(`LLM returned non-JSON output: ${raw.slice(0, 200)}`);
    }

    const parsed = DecompositionResultSchema.safeParse(parsedJson);
    if (!parsed.success) {
      throw new Error(`LLM output failed validation: ${parsed.error.message}`);
    }

    steps.push({ label: 'Validated LLM output', detail: `type: ${parsed.data.type}` });

    return { output: parsed.data, steps };
  },
};

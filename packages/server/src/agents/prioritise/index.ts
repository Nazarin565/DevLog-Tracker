import { PrioritisationOutputSchema, type PrioritisationOutput } from '@devlog/shared';
import { SYSTEM_PROMPTS } from '../../llm/index.js';
import { scoreTasks } from './scoring.js';
import type { Agent, AgentContext, AgentMeta, AgentResult } from '../types.js';

const meta: AgentMeta = {
  id: 'prioritise',
  name: 'Task Prioritisation',
  description: 'Scores active tasks by priority, age and status, then asks the LLM to produce an ordered plan with per-task reasoning.',
};

export const prioritiseAgent: Agent<Record<string, never>, PrioritisationOutput> = {
  id: meta.id,
  describe: () => meta,

  async run(_input, ctx: AgentContext): Promise<AgentResult<PrioritisationOutput>> {
    const steps = [];

    const allTasks = ctx.taskRepo.findAll();
    const activeTasks = allTasks.filter((t) => t.status !== 'done');
    steps.push({ label: 'Fetched tasks', detail: `${activeTasks.length} active task(s)` });

    const scored = scoreTasks(activeTasks, new Date());
    steps.push({
      label: 'Pre-scored tasks',
      detail: scored.map((s) => `${s.task.title}: ${s.score.toFixed(1)}`).join(', '),
    });

    const taskList = scored
      .map(
        (s) =>
          `- id: ${s.task.id} | title: ${s.task.title} | priority: ${s.task.priority} | status: ${s.task.status} | age: ${s.ageInDays.toFixed(0)}d | score: ${s.score.toFixed(1)}`
      )
      .join('\n');

    const prompt = `Tasks to prioritise (pre-scored, highest score = most urgent):\n${taskList}`;

    const raw = await ctx.llm.complete(prompt, { systemPrompt: SYSTEM_PROMPTS.prioritisation });
    steps.push({ label: 'LLM ranked tasks' });

    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(cleaned);
    } catch {
      throw new Error(`LLM returned non-JSON output: ${raw.slice(0, 200)}`);
    }

    const parsed = PrioritisationOutputSchema.safeParse(parsedJson);
    if (!parsed.success) {
      throw new Error(`LLM output failed validation: ${parsed.error.message}`);
    }

    steps.push({ label: 'Validated LLM output' });

    return { output: parsed.data, steps };
  },
};

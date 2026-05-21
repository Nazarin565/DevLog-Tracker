import { z } from 'zod';

// Agent A (prioritisation) — structured LLM output
export const PrioritisedTaskSchema = z.object({
  taskId: z.string(),
  reasoning: z.string(),
});

export const PrioritisationOutputSchema = z.object({
  rankedTasks: z.array(PrioritisedTaskSchema),
  summary: z.string(),
});

// Agent B (decomposition) — two explicit result branches (discriminated union)
export const SubtaskProposalSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

export const DecompositionResultSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('subtasks'),
    subtasks: z.array(SubtaskProposalSchema).min(1),
  }),
  z.object({
    type: z.literal('clarify'),
    questions: z.array(z.string().min(1)).min(1),
  }),
]);

export type PrioritisedTask = z.infer<typeof PrioritisedTaskSchema>;
export type PrioritisationOutput = z.infer<typeof PrioritisationOutputSchema>;
export type SubtaskProposal = z.infer<typeof SubtaskProposalSchema>;
export type DecompositionResult = z.infer<typeof DecompositionResultSchema>;

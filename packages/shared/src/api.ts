import { z } from 'zod';
import { PrioritySchema, TaskStatusSchema } from './domain.js';

export const CreateTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(''),
  priority: PrioritySchema.default('medium'),
});

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: TaskStatusSchema.optional(),
  priority: PrioritySchema.optional(),
});

export const CreateSubtasksSchema = z.object({
  subtasks: z.array(z.object({ title: z.string().min(1) })).min(1),
});

export const TaskQuerySchema = z.object({
  status: TaskStatusSchema.optional(),
  sortBy: z.enum(['priority', 'createdAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type CreateSubtasksInput = z.infer<typeof CreateSubtasksSchema>;
export type TaskQuery = z.infer<typeof TaskQuerySchema>;

import { z } from 'zod';

export const TaskStatusSchema = z.enum(['todo', 'in-progress', 'done']);
export const PrioritySchema = z.enum(['low', 'medium', 'high']);

export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type Priority = z.infer<typeof PrioritySchema>;

export const SubtaskSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  title: z.string().min(1),
  done: z.boolean(),
  createdAt: z.string(),
});

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string(),
  status: TaskStatusSchema,
  priority: PrioritySchema,
  createdAt: z.string(),
  subtasks: z.array(SubtaskSchema).optional(),
});

export type Subtask = z.infer<typeof SubtaskSchema>;
export type Task = z.infer<typeof TaskSchema>;

import type { TaskRepository } from '../db/taskRepository.js';
import type { SubtaskRepository } from '../db/subtaskRepository.js';
import type { LLMClient } from '../llm/index.js';

export interface AgentContext {
  taskRepo: TaskRepository;
  subtaskRepo: SubtaskRepository;
  llm: LLMClient;
}

export interface AgentStep {
  label: string;
  detail?: string;
}

export interface AgentResult<T> {
  output: T;
  steps: AgentStep[];
}

export interface AgentMeta {
  id: string;
  name: string;
  description: string;
}

export interface Agent<Input = unknown, Output = unknown> {
  id: string;
  describe(): AgentMeta;
  run(input: Input, ctx: AgentContext): Promise<AgentResult<Output>>;
}

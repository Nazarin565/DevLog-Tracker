import type { Task, Subtask, CreateTaskInput, UpdateTaskInput, CreateSubtasksInput } from '@devlog/shared';

export interface AgentStep {
  label: string;
  detail?: string;
}

export interface AgentResult<T> {
  output: T;
  steps: AgentStep[];
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type TaskFilters = {
  status?: string;
  sortBy?: 'priority' | 'createdAt';
  order?: 'asc' | 'desc';
};

export const api = {
  tasks: {
    list(filters?: TaskFilters): Promise<Task[]> {
      const params = new URLSearchParams();
      if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
      if (filters?.sortBy) params.set('sortBy', filters.sortBy);
      if (filters?.order) params.set('order', filters.order);
      const qs = params.toString();
      return request<Task[]>(`/api/tasks${qs ? `?${qs}` : ''}`);
    },
    get(id: string): Promise<Task> {
      return request<Task>(`/api/tasks/${id}`);
    },
    create(data: CreateTaskInput): Promise<Task> {
      return request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(data) });
    },
    update(id: string, data: UpdateTaskInput): Promise<Task> {
      return request<Task>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    },
    remove(id: string): Promise<void> {
      return request<void>(`/api/tasks/${id}`, { method: 'DELETE' });
    },
  },
  subtasks: {
    create(taskId: string, data: CreateSubtasksInput): Promise<Subtask[]> {
      return request<Subtask[]>(`/api/tasks/${taskId}/subtasks`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  },
  agents: {
    run<T>(agentId: string, input: unknown): Promise<AgentResult<T>> {
      return request<AgentResult<T>>(`/api/agents/${agentId}/run`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
  },
};

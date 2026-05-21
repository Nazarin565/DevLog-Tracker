'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type TaskFilters, type AgentResult } from '../lib/api';
import type { CreateTaskInput, UpdateTaskInput, CreateSubtasksInput, Subtask } from '@devlog/shared';

export function useTasks(filters?: TaskFilters) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => api.tasks.list(filters),
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => api.tasks.get(id),
    enabled: Boolean(id),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTaskInput) => api.tasks.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useUpdateTask(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateTaskInput) => api.tasks.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task', id] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.tasks.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useCreateSubtasks(taskId: string) {
  const qc = useQueryClient();
  return useMutation<Subtask[], Error, CreateSubtasksInput>({
    mutationFn: (data: CreateSubtasksInput) => api.subtasks.create(taskId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task', taskId] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useRunAgent<T>() {
  return useMutation({
    mutationFn: ({ agentId, input }: { agentId: string; input: unknown }) =>
      api.agents.run<T>(agentId, input),
  });
}

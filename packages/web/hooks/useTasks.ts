'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type TaskFilters, type AgentResult } from '../lib/api';
import type { CreateTaskInput, UpdateTaskInput, CreateSubtasksInput, UpdateSubtaskInput, Subtask } from '@devlog/shared';

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

export function useToggleSubtask(taskId: string) {
  const qc = useQueryClient();
  return useMutation<Subtask, Error, { subId: string; done: boolean }>({
    mutationFn: ({ subId, done }) => api.subtasks.setDone(taskId, subId, done),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task', taskId] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useAddSubtask(taskId: string) {
  const qc = useQueryClient();
  return useMutation<Subtask, Error, string>({
    mutationFn: (title) => api.subtasks.createOne(taskId, title),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task', taskId] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateSubtask(taskId: string) {
  const qc = useQueryClient();
  return useMutation<Subtask, Error, { subId: string; data: UpdateSubtaskInput }>({
    mutationFn: ({ subId, data }) => api.subtasks.update(taskId, subId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task', taskId] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteSubtask(taskId: string) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (subId) => api.subtasks.remove(taskId, subId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task', taskId] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useRunAgent<T>(taskId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ agentId, input }: { agentId: string; input: unknown }) =>
      api.agents.run<T>(agentId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      if (taskId) qc.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });
}

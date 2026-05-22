'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRunAgent } from './useTasks';
import { PrioritisationOutputSchema } from '@devlog/shared';
import type { PrioritisationOutput } from '@devlog/shared';

const LS_KEY = 'devlog:prioritisation';
const QK = ['prioritisation-result'] as const;

export type StoredPrioritisation = {
  rankedIds: string[];
  summary: string | undefined;
  savedAt: string;
};

function loadFromStorage(): StoredPrioritisation | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredPrioritisation;
  } catch {
    return null;
  }
}

function saveToStorage(data: StoredPrioritisation) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

export function usePrioritisationResult() {
  return useQuery<StoredPrioritisation | null>({
    queryKey: QK,
    queryFn: loadFromStorage,
    staleTime: Infinity,
  });
}

export function useRunPrioritisation() {
  const qc = useQueryClient();
  const runAgent = useRunAgent<unknown>();

  async function run() {
    const res = await runAgent.mutateAsync({ agentId: 'prioritise', input: {} });
    const parsed = PrioritisationOutputSchema.safeParse(res.output);
    if (!parsed.success) throw new Error('Unexpected response from agent.');

    const output: PrioritisationOutput = parsed.data;
    const stored: StoredPrioritisation = {
      rankedIds: output.rankedTasks.map((t) => t.taskId),
      summary: output.summary,
      savedAt: new Date().toISOString(),
    };
    saveToStorage(stored);
    qc.setQueryData(QK, stored);
  }

  return { run, isPending: runAgent.isPending, isError: runAgent.isError, error: runAgent.error };
}

export function useClearPrioritisation() {
  const qc = useQueryClient();
  return () => {
    localStorage.removeItem(LS_KEY);
    qc.setQueryData(QK, null);
  };
}

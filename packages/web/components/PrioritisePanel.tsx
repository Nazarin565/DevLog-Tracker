'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRunAgent, useTasks } from '../hooks/useTasks';
import { PrioritisationOutputSchema } from '@devlog/shared';
import type { PrioritisationOutput } from '@devlog/shared';
import type { AgentResult } from '../lib/api';
import { StepTrace } from './AgentPanel';

export function PrioritisePanel() {
  const qc = useQueryClient();
  const [result, setResult] = useState<AgentResult<unknown> | null>(null);
  const { data: allTasks } = useTasks();
  const runAgent = useRunAgent<unknown>();

  const taskTitleMap = Object.fromEntries((allTasks ?? []).map((t) => [t.id, t.title]));

  async function handleRun() {
    setResult(null);
    try {
      const res = await runAgent.mutateAsync({ agentId: 'prioritise', input: {} });
      setResult(res);
      qc.invalidateQueries({ queryKey: ['tasks'] });
    } catch {
      // error surfaced via runAgent.isError
    }
  }

  const parsed = result ? PrioritisationOutputSchema.safeParse(result.output) : null;
  const pResult: PrioritisationOutput | null = parsed?.success ? parsed.data : null;

  return (
    <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-purple-900">AI Prioritisation</h3>
          <p className="text-xs text-purple-700 mt-0.5">Ranks all active tasks by priority, age, and status.</p>
        </div>
        <button
          onClick={handleRun}
          disabled={runAgent.isPending}
          className="px-4 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 disabled:opacity-50 shrink-0 cursor-pointer"
        >
          {runAgent.isPending ? 'Running...' : 'Prioritise All'}
        </button>
      </div>

      {runAgent.isError && (
        <p className="mt-3 text-sm text-red-600">Error: {(runAgent.error as Error).message}</p>
      )}

      {result && (
        <div className="mt-4 space-y-3">
          <StepTrace steps={result.steps} />
          {pResult ? (
            <div>
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Prioritised order</p>
              {pResult.summary && <p className="text-sm text-gray-600 mb-2 italic">{pResult.summary}</p>}
              <ol className="space-y-2">
                {pResult.rankedTasks.map((t, i) => (
                  <li key={t.taskId} className="flex gap-2 text-sm">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 text-xs font-bold">
                      {i + 1}
                    </span>
                    <span>
                      <span className="font-medium text-gray-800">{taskTitleMap[t.taskId] ?? t.taskId}</span>
                      {t.reasoning && <span className="text-gray-500 ml-1">— {t.reasoning}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            result && <p className="text-sm text-red-600">Unexpected response from agent.</p>
          )}
        </div>
      )}
    </div>
  );
}

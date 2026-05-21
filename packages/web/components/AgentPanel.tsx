'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRunAgent, useCreateSubtasks } from '../hooks/useTasks';
import type { PrioritisationOutput, DecompositionResult, SubtaskProposal } from '@devlog/shared';
import type { AgentResult } from '../lib/api';

interface Props {
  taskId: string;
}

type AgentId = 'prioritise' | 'decompose';

export function AgentPanel({ taskId }: Props) {
  const qc = useQueryClient();
  const [activeAgent, setActiveAgent] = useState<AgentId>('decompose');
  const [result, setResult] = useState<AgentResult<unknown> | null>(null);

  const runAgent = useRunAgent<unknown>();
  const createSubtasks = useCreateSubtasks(taskId);

  async function handleRun() {
    setResult(null);
    const input = activeAgent === 'decompose' ? { taskId } : {};
    const res = await runAgent.mutateAsync({ agentId: activeAgent, input });
    setResult(res);
    if (activeAgent === 'prioritise') {
      qc.invalidateQueries({ queryKey: ['tasks'] });
    }
  }

  async function handleCreateSubtasks(subtasks: SubtaskProposal[]) {
    await createSubtasks.mutateAsync({ subtasks });
    setResult(null);
  }

  return (
    <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
      <h3 className="font-semibold text-purple-900 mb-3">AI Agents</h3>

      <div className="flex gap-2 mb-4">
        {(['decompose', 'prioritise'] as AgentId[]).map((id) => (
          <button
            key={id}
            onClick={() => { setActiveAgent(id); setResult(null); }}
            className={`px-3 py-1 text-sm rounded-md ${activeAgent === id ? 'bg-purple-600 text-white' : 'border border-purple-300 text-purple-700 hover:bg-purple-100'}`}
          >
            {id === 'decompose' ? 'Decompose Task' : 'Prioritise All'}
          </button>
        ))}
      </div>

      <p className="text-sm text-purple-700 mb-3">
        {activeAgent === 'decompose'
          ? 'Breaks this task into concrete subtasks. If the description is vague, asks clarifying questions instead.'
          : 'Analyses all active tasks and ranks them by priority, age, and status.'}
      </p>

      <button
        onClick={handleRun}
        disabled={runAgent.isPending}
        className="px-4 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 disabled:opacity-50"
      >
        {runAgent.isPending ? 'Running...' : 'Run Agent'}
      </button>

      {runAgent.isError && (
        <p className="mt-3 text-sm text-red-600">Error: {(runAgent.error as Error).message}</p>
      )}

      {result && (
        <div className="mt-4 space-y-3">
          <StepTrace steps={result.steps} />
          <AgentOutput
            agentId={activeAgent}
            output={result.output}
            onCreateSubtasks={handleCreateSubtasks}
            isCreating={createSubtasks.isPending}
          />
        </div>
      )}
    </div>
  );
}

function StepTrace({ steps }: { steps: AgentResult<unknown>['steps'] }) {
  return (
    <div>
      <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">Reasoning trace</p>
      <ol className="space-y-1">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-2 text-xs text-gray-700">
            <span className="w-4 h-4 rounded-full bg-purple-200 text-purple-800 flex items-center justify-center shrink-0 text-[10px] font-bold">
              {i + 1}
            </span>
            <span>
              <span className="font-medium">{step.label}</span>
              {step.detail && <span className="text-gray-500"> — {step.detail}</span>}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function AgentOutput({
  agentId,
  output,
  onCreateSubtasks,
  isCreating,
}: {
  agentId: AgentId;
  output: unknown;
  onCreateSubtasks: (subtasks: SubtaskProposal[]) => void;
  isCreating: boolean;
}) {
  if (agentId === 'decompose') {
    const result = output as DecompositionResult;
    if (!result || typeof (result as DecompositionResult).type !== 'string') {
      return <p className="text-sm text-red-600">Unexpected response from agent.</p>;
    }
    if (result.type === 'clarify') {
      return (
        <div>
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Clarifying questions</p>
          <ul className="space-y-1">
            {result.questions.map((q, i) => (
              <li key={i} className="text-sm text-gray-700 flex gap-2">
                <span className="text-amber-500">?</span>{q}
              </li>
            ))}
          </ul>
        </div>
      );
    }
    return (
      <div>
        <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Proposed subtasks</p>
        <ul className="space-y-1 mb-3">
          {result.subtasks.map((st, i) => (
            <li key={i} className="text-sm text-gray-700 flex gap-2">
              <span className="text-green-500">•</span>{st.title}
            </li>
          ))}
        </ul>
        <button
          onClick={() => onCreateSubtasks(result.subtasks)}
          disabled={isCreating}
          className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {isCreating ? 'Creating...' : 'Create Subtasks'}
        </button>
      </div>
    );
  }

  const pResult = output as PrioritisationOutput;
  if (!pResult || !Array.isArray(pResult.rankedTasks)) {
    return <p className="text-sm text-red-600">Unexpected response from agent.</p>;
  }
  return (
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
              <span className="font-mono text-xs text-gray-400">{t.taskId}</span>
              {t.reasoning && <span className="text-gray-600 ml-1">— {t.reasoning}</span>}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

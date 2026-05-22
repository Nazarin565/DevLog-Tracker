'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Subtask } from '@devlog/shared';
import { DecompositionResultSchema } from '@devlog/shared';
import type { SubtaskProposal } from '@devlog/shared';
import { useToggleSubtask, useUpdateSubtask, useDeleteSubtask, useAddSubtask, useCreateSubtasks, useRunAgent } from '../hooks/useTasks';
import { api } from '../lib/api';

interface Props {
  subtasks: Subtask[];
  taskId: string;
}

export function SubtaskList({ subtasks, taskId }: Props) {
  const qc = useQueryClient();
  const toggle = useToggleSubtask(taskId);
  const updateSubtask = useUpdateSubtask(taskId);
  const deleteSubtask = useDeleteSubtask(taskId);
  const addSubtask = useAddSubtask(taskId);
  const createSubtasks = useCreateSubtasks(taskId);
  const runAgent = useRunAgent<unknown>(taskId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [addTitle, setAddTitle] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [proposed, setProposed] = useState<SubtaskProposal[] | null>(null);
  const [clarifyQuestions, setClarifyQuestions] = useState<string[] | null>(null);
  const [clarifyAnswer, setClarifyAnswer] = useState('');
  const [decomposeError, setDecomposeError] = useState<string | null>(null);

  function startEdit(st: Subtask) {
    setEditingId(st.id);
    setEditTitle(st.title);
  }

  async function commitEdit(subId: string) {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== subtasks.find((s) => s.id === subId)?.title) {
      await updateSubtask.mutateAsync({ subId, data: { title: trimmed } });
    }
    setEditingId(null);
  }

  async function handleAdd() {
    const trimmed = addTitle.trim();
    if (!trimmed) return;
    await addSubtask.mutateAsync(trimmed);
    setAddTitle('');
    setShowAdd(false);
  }

  async function runDecompose(answers?: string) {
    setProposed(null);
    setClarifyQuestions(null);
    setDecomposeError(null);

    try {
      const res = await runAgent.mutateAsync({ agentId: 'decompose', input: { taskId, ...(answers ? { answers } : {}) } });
      const parsed = DecompositionResultSchema.safeParse(res.output);
      if (!parsed.success) {
        setDecomposeError('Unexpected response from agent.');
        return;
      }
      if (parsed.data.type === 'clarify') {
        setClarifyQuestions(parsed.data.questions);
        setClarifyAnswer('');
      } else {
        setProposed(parsed.data.subtasks);
      }
    } catch {
      setDecomposeError((runAgent.error as Error | null)?.message ?? 'Agent error.');
    }
  }

  function handleDecomposeClick() {
    runDecompose();
  }

  function handleSubmitAnswers() {
    const trimmed = clarifyAnswer.trim();
    if (!trimmed) return;
    runDecompose(trimmed);
  }

  async function handleConfirmSubtasks() {
    if (!proposed) return;
    await Promise.all(subtasks.map((s) => api.subtasks.remove(taskId, s.id)));
    await createSubtasks.mutateAsync({ subtasks: proposed });
    setProposed(null);
  }

  return (
    <div>
      {subtasks.length > 0 && (
        <ul className="mt-2 space-y-1">
          {subtasks.map((st) => (
            <li key={st.id} className="flex items-center gap-2 text-sm text-gray-600 group">
              <label className="flex items-center gap-2 cursor-pointer select-none min-w-0 flex-1">
                <input
                  type="checkbox"
                  checked={st.done}
                  disabled={toggle.isPending}
                  onChange={() => toggle.mutate({ subId: st.id, done: !st.done })}
                  className="sr-only"
                />
                <span className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${st.done ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-green-400'}`}>
                  {st.done && <span className="text-white text-xs">✓</span>}
                </span>

                {editingId === st.id ? (
                  <input
                    autoFocus
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => commitEdit(st.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEdit(st.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="flex-1 border-b border-gray-300 focus:border-blue-500 outline-none bg-transparent text-sm"
                    onClick={(e) => e.preventDefault()}
                  />
                ) : (
                  <span className={`truncate ${st.done ? 'line-through text-gray-400' : ''}`}>{st.title}</span>
                )}
              </label>

              {editingId !== st.id && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => startEdit(st)}
                    className="text-xs text-gray-400 hover:text-gray-700 px-1 cursor-pointer"
                    title="Edit"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => deleteSubtask.mutate(st.id)}
                    disabled={deleteSubtask.isPending}
                    className="text-xs text-gray-400 hover:text-red-600 px-1 disabled:opacity-50 cursor-pointer"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 space-y-2">
        {showAdd ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={addTitle}
              onChange={(e) => setAddTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') { setShowAdd(false); setAddTitle(''); }
              }}
              placeholder="Subtask title…"
              className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleAdd}
              disabled={addSubtask.isPending || !addTitle.trim()}
              className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              Add
            </button>
            <button
              onClick={() => { setShowAdd(false); setAddTitle(''); }}
              className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-gray-600 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="text-xs text-blue-500 hover:text-blue-700 cursor-pointer"
          >
            + Add subtask
          </button>
        )}

        <button
          onClick={handleDecomposeClick}
          disabled={runAgent.isPending}
          className="w-full px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
        >
          <span className="text-base leading-none">✦</span>
          <span>{runAgent.isPending ? 'Decomposing…' : 'Decompose task'}</span>
        </button>
      </div>

      {decomposeError && (
        <p className="mt-2 text-xs text-red-600">{decomposeError}</p>
      )}

      {clarifyQuestions && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Clarifying questions</p>
          <ul className="space-y-1 mb-3">
            {clarifyQuestions.map((q, i) => (
              <li key={`q-${i}`} className="text-sm text-gray-700 flex gap-2">
                <span className="text-amber-500 shrink-0">?</span>{q}
              </li>
            ))}
          </ul>
          <textarea
            value={clarifyAnswer}
            onChange={(e) => setClarifyAnswer(e.target.value)}
            placeholder="Answer the questions above…"
            rows={3}
            className="w-full text-sm border border-amber-300 rounded px-2 py-1 focus:outline-none focus:border-amber-500 bg-white resize-none"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleSubmitAnswers}
              disabled={runAgent.isPending || !clarifyAnswer.trim()}
              className="text-xs px-3 py-1 bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50 cursor-pointer"
            >
              {runAgent.isPending ? 'Thinking…' : 'Submit answer'}
            </button>
            <button
              onClick={() => { setClarifyQuestions(null); setClarifyAnswer(''); }}
              className="text-xs px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-gray-600 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {proposed && (
        <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">Proposed subtasks</p>
          <ul className="space-y-1 mb-3">
            {proposed.map((st, i) => (
              <li key={`st-${i}`} className="text-sm text-gray-700 flex gap-2">
                <span className="text-purple-400 shrink-0">•</span>{st.title}
              </li>
            ))}
          </ul>
          {subtasks.length > 0 && (
            <p className="text-xs text-amber-600 mb-2">
              ⚠ Saving will replace your {subtasks.length} existing subtask{subtasks.length !== 1 ? 's' : ''}.
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleConfirmSubtasks}
              disabled={createSubtasks.isPending}
              className="text-xs px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 cursor-pointer"
            >
              {createSubtasks.isPending ? 'Saving…' : 'Save subtasks'}
            </button>
            <button
              onClick={() => setProposed(null)}
              className="text-xs px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-gray-600 cursor-pointer"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import type { Subtask } from '@devlog/shared';
import { useToggleSubtask, useUpdateSubtask, useDeleteSubtask, useAddSubtask } from '../hooks/useTasks';

interface Props {
  subtasks: Subtask[];
  taskId: string;
}

export function SubtaskList({ subtasks, taskId }: Props) {
  const toggle = useToggleSubtask(taskId);
  const updateSubtask = useUpdateSubtask(taskId);
  const deleteSubtask = useDeleteSubtask(taskId);
  const addSubtask = useAddSubtask(taskId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [addTitle, setAddTitle] = useState('');
  const [showAdd, setShowAdd] = useState(false);

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

      {showAdd ? (
        <div className="flex items-center gap-2 mt-2">
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
            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Add
          </button>
          <button
            onClick={() => { setShowAdd(false); setAddTitle(''); }}
            className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-gray-600"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="mt-2 text-xs text-blue-500 hover:text-blue-700 cursor-pointer"
        >
          + Add subtask
        </button>
      )}
    </div>
  );
}

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { useTasks, useDeleteTask } from '../hooks/useTasks';
import { usePrioritisationResult, useClearPrioritisation } from '../hooks/usePrioritisation';
import { TaskCard } from '../components/TaskCard';
import { PrioritiseButton } from '../components/PrioritisePanel';
import type { TaskFilters } from '../lib/api';

function TaskListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = searchParams.get('status') ?? 'all';
  const sortBy = searchParams.get('sortBy') ?? 'createdAt';
  const order = (searchParams.get('order') ?? 'desc') as TaskFilters['order'];
  const isAiSort = sortBy === 'ai';

  const filters: TaskFilters = isAiSort
    ? { status, sortBy: 'createdAt', order: 'desc' }
    : { status, sortBy: sortBy as TaskFilters['sortBy'], order };

  const { data: tasks, isLoading, isError } = useTasks(filters);
  const { data: prioritisation } = usePrioritisationResult();
  const clearPrioritisation = useClearPrioritisation();
  const deleteTask = useDeleteTask();

  const displayedTasks = (() => {
    if (!tasks) return [];
    if (!isAiSort || !prioritisation) return tasks;
    const idxMap = new Map(prioritisation.rankedIds.map((id, i) => [id, i]));
    return [...tasks].sort((a, b) => {
      const ai = idxMap.get(a.id) ?? Infinity;
      const bi = idxMap.get(b.id) ?? Infinity;
      return ai - bi;
    });
  })();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`?${params.toString()}`);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this task?')) return;
    await deleteTask.mutateAsync(id);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <div className="flex items-center gap-2">
          <PrioritiseButton />
          <Link
            href="/tasks/new"
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            + New Task
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div>
          <label className="text-xs text-gray-500 mr-1">Status:</label>
          {['all', 'todo', 'in-progress', 'done'].map((s) => (
            <button
              key={s}
              onClick={() => setParam('status', s)}
              className={`mr-1 px-3 py-1 text-xs rounded-full border cursor-pointer ${status === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
            >
              {s}
            </button>
          ))}
        </div>
        <div>
          <label className="text-xs text-gray-500 mr-1">Sort:</label>
          {(['priority', 'createdAt'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setParam('sortBy', s)}
              className={`mr-1 px-3 py-1 text-xs rounded-full border cursor-pointer ${sortBy === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
            >
              {s === 'createdAt' ? 'Date' : 'Priority'}
            </button>
          ))}
          {prioritisation && (
            <button
              onClick={() => setParam('sortBy', 'ai')}
              className={`mr-1 px-3 py-1 text-xs rounded-full border cursor-pointer inline-flex items-center gap-1 ${isAiSort ? 'bg-purple-600 text-white border-purple-600' : 'border-purple-300 text-purple-700 hover:bg-purple-50'}`}
            >
              <span>✦</span>
              <span>AI</span>
            </button>
          )}
        </div>
        {!isAiSort && (
          <div>
            <label className="text-xs text-gray-500 mr-1">Order:</label>
            {(['asc', 'desc'] as const).map((o) => (
              <button
                key={o}
                onClick={() => setParam('order', o)}
                className={`mr-1 px-3 py-1 text-xs rounded-full border cursor-pointer ${order === o ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              >
                {o}
              </button>
            ))}
          </div>
        )}
        {isAiSort && prioritisation && (
          <div className="flex items-center gap-2 text-xs text-purple-700">
            <span>Sorted by AI · {new Date(prioritisation.savedAt).toLocaleDateString()}</span>
            {prioritisation.summary && <span className="text-gray-500 italic">— {prioritisation.summary}</span>}
            <button
              onClick={() => { clearPrioritisation(); setParam('sortBy', 'createdAt'); }}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {isLoading && <p className="text-gray-500">Loading tasks...</p>}
      {isError && <p className="text-red-500">Failed to load tasks.</p>}
      {displayedTasks.length === 0 && !isLoading && !isError && (
        <p className="text-gray-400 text-center py-12">No tasks yet. <Link href="/tasks/new" className="text-blue-500 hover:underline">Create one</Link>.</p>
      )}
      <div className="space-y-3">
        {displayedTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onDelete={handleDelete}
            isDeleting={deleteTask.isPending && deleteTask.variables === task.id}
          />
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<p className="text-gray-500">Loading...</p>}>
      <TaskListPage />
    </Suspense>
  );
}

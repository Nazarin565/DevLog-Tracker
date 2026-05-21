'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useTask, useUpdateTask, useDeleteTask, useTasks } from '../../../hooks/useTasks';
import { TaskForm } from '../../../components/TaskForm';
import { SubtaskList } from '../../../components/SubtaskList';
import { AgentPanel } from '../../../components/AgentPanel';

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  const { data: task, isLoading, isError } = useTask(id);
  const { data: allTasks } = useTasks();
  const updateTask = useUpdateTask(id);
  const deleteTask = useDeleteTask();

  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  if (isError || !task) return <p className="text-red-500">Task not found.</p>;

  const subtasks = task.subtasks ?? [];

  async function handleDelete() {
    if (!confirm('Delete this task?')) return;
    await deleteTask.mutateAsync(id);
    router.push('/');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">← Back</Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-700 truncate">{task.title}</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        {editing ? (
          <>
            <h2 className="text-lg font-semibold mb-4">Edit Task</h2>
            <TaskForm
              mode="edit"
              task={task}
              isPending={updateTask.isPending}
              onSubmit={async (data) => {
                await updateTask.mutateAsync(data);
                setEditing(false);
              }}
              onCancel={() => setEditing(false)}
            />
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold">{task.title}</h1>
                {task.description && (
                  <p className="text-gray-600 mt-2 whitespace-pre-wrap">{task.description}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setEditing(true)}
                  className="px-3 py-1 text-sm border border-gray-200 rounded hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteTask.isPending}
                  className="px-3 py-1 text-sm border border-red-200 rounded hover:bg-red-50 text-red-600 disabled:opacity-50"
                >
                  {deleteTask.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-4 text-sm">
              <span className="text-gray-500">Status: <span className="font-medium text-gray-800">{task.status}</span></span>
              <span className="text-gray-300">|</span>
              <span className="text-gray-500">Priority: <span className="font-medium text-gray-800">{task.priority}</span></span>
              <span className="text-gray-300">|</span>
              <span className="text-gray-500">Created: <span className="font-medium text-gray-800">{new Date(task.createdAt).toLocaleDateString()}</span></span>
            </div>
          </>
        )}
      </div>

      {subtasks.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="font-semibold mb-3">Subtasks ({subtasks.length})</h2>
          <SubtaskList subtasks={subtasks} />
        </div>
      )}

      <AgentPanel taskId={id} taskTitleMap={Object.fromEntries((allTasks ?? []).map((t) => [t.id, t.title]))} />
    </div>
  );
}

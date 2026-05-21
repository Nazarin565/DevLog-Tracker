'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Task } from '@devlog/shared';
import { SubtaskList } from './SubtaskList';

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-600',
};

const STATUS_COLORS: Record<string, string> = {
  'todo': 'bg-gray-100 text-gray-600',
  'in-progress': 'bg-blue-100 text-blue-700',
  'done': 'bg-green-100 text-green-700',
};

interface Props {
  task: Task;
  onDelete: (id: string) => void;
}

export function TaskCard({ task, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const subtasks = task.subtasks ?? [];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Link href={`/tasks/${task.id}`} className="font-medium text-gray-900 hover:text-blue-600 truncate block">
            {task.title}
          </Link>
          {task.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href={`/tasks/${task.id}`}
            className="text-xs px-2 py-1 border border-gray-200 rounded hover:bg-gray-50 text-gray-600"
          >
            Edit
          </Link>
          <button
            onClick={() => onDelete(task.id)}
            className="text-xs px-2 py-1 border border-red-200 rounded hover:bg-red-50 text-red-600"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>
          {task.priority}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[task.status]}`}>
          {task.status}
        </span>
        <span className="text-xs text-gray-400 ml-auto">
          {new Date(task.createdAt).toLocaleDateString()}
        </span>
        {subtasks.length > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-blue-500 hover:text-blue-700"
          >
            {expanded ? '▲' : '▼'} {subtasks.length} subtask{subtasks.length !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {expanded && <SubtaskList subtasks={subtasks} />}
    </div>
  );
}

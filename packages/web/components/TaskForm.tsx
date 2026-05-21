'use client';

import { useState } from 'react';
import type { Task, CreateTaskInput, UpdateTaskInput, Priority, TaskStatus } from '@devlog/shared';

type Props =
  | { mode: 'create'; onSubmit: (data: CreateTaskInput) => void; onCancel?: () => void }
  | { mode: 'edit'; task: Task; onSubmit: (data: UpdateTaskInput) => void; onCancel?: () => void };

export function TaskForm(props: Props) {
  const initial =
    props.mode === 'edit'
      ? { title: props.task.title, description: props.task.description, priority: props.task.priority, status: props.task.status }
      : { title: '', description: '', priority: 'medium' as Priority, status: 'todo' as TaskStatus };

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [priority, setPriority] = useState<Priority>(initial.priority);
  const [status, setStatus] = useState<TaskStatus>(initial.status);
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    setError('');
    if (props.mode === 'create') {
      props.onSubmit({ title: title.trim(), description, priority });
    } else {
      props.onSubmit({ title: title.trim(), description, priority, status });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="title">Title</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Task title"
        />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">Description</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Optional description"
        />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="priority">Priority</label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        {props.mode === 'edit' && (
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="status">Status</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todo">Todo</option>
              <option value="in-progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        {props.onCancel && (
          <button type="button" onClick={props.onCancel} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
            Cancel
          </button>
        )}
        <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
          {props.mode === 'create' ? 'Create Task' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

'use client';

import type { Subtask } from '@devlog/shared';
import { useToggleSubtask } from '../hooks/useTasks';

interface Props {
  subtasks: Subtask[];
  taskId: string;
}

export function SubtaskList({ subtasks, taskId }: Props) {
  const toggle = useToggleSubtask(taskId);

  if (subtasks.length === 0) return null;

  return (
    <ul className="mt-2 space-y-1">
      {subtasks.map((st) => (
        <li key={st.id} className="flex items-center gap-2 text-sm text-gray-600">
          <label className="flex items-center gap-2 cursor-pointer select-none w-full">
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
            <span className={st.done ? 'line-through text-gray-400' : ''}>{st.title}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

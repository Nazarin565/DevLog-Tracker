'use client';

import type { Subtask } from '@devlog/shared';

interface Props {
  subtasks: Subtask[];
}

export function SubtaskList({ subtasks }: Props) {
  if (subtasks.length === 0) return null;

  return (
    <ul className="mt-2 space-y-1">
      {subtasks.map((st) => (
        <li key={st.id} className="flex items-center gap-2 text-sm text-gray-600">
          <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${st.done ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
            {st.done && <span className="text-white text-xs">✓</span>}
          </span>
          <span className={st.done ? 'line-through text-gray-400' : ''}>{st.title}</span>
        </li>
      ))}
    </ul>
  );
}

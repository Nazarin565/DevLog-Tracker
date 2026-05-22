'use client';

import { useRunPrioritisation } from '../hooks/usePrioritisation';

export function PrioritiseButton() {
  const { run, isPending } = useRunPrioritisation();

  return (
    <button
      onClick={run}
      disabled={isPending}
      className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 disabled:opacity-60 cursor-pointer"
    >
      <span className="text-base leading-none">✦</span>
      <span>{isPending ? 'Prioritising…' : 'AI Prioritise'}</span>
    </button>
  );
}

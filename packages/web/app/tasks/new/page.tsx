'use client';

import { useRouter } from 'next/navigation';
import { TaskForm } from '../../../components/TaskForm';
import { useCreateTask } from '../../../hooks/useTasks';

export default function NewTaskPage() {
  const router = useRouter();
  const createTask = useCreateTask();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">New Task</h1>
      <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-xl">
        <TaskForm
          mode="create"
          onSubmit={async (data) => {
            await createTask.mutateAsync(data);
            router.push('/');
          }}
          onCancel={() => router.push('/')}
        />
        {createTask.isError && (
          <p className="mt-3 text-sm text-red-500">{(createTask.error as Error).message}</p>
        )}
      </div>
    </div>
  );
}

'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';

type CreateTicketResponse = {
  id: string;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_USER' | 'CLOSED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
};

export default function NewTicketPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim()) {
      setError('Completá título y descripción');
      return;
    }

    setSubmitting(true);

    try {
      const token = getToken();
      if (!token) {
        router.push('/login');
        return;
      }

      const created = await apiFetch<CreateTicketResponse>('/tickets', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          priority,
        }),
      });

      router.push(`/tickets/${created.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo crear el ticket';

      if (message.toLowerCase().includes('unauthorized')) {
        clearToken();
        router.push('/login');
        return;
      }

      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => router.push('/tickets')}
          className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          ← Volver a tickets
        </button>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-zinc-100">
            Nuevo ticket
          </h1>
          <p className="text-sm text-gray-600 dark:text-zinc-400">
            Creá un ticket de soporte desde el frontend.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-800 dark:text-zinc-200">
              Título
            </label>
            <input
              type="text"
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: No puedo entrar al sistema"
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none focus:ring focus:ring-gray-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-700"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
              {title.length}/120
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-800 dark:text-zinc-200">
              Descripción
            </label>
            <textarea
              rows={6}
              maxLength={5000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contanos qué está pasando..."
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none focus:ring focus:ring-gray-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-700"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
              {description.length}/5000
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-800 dark:text-zinc-200">
              Prioridad
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:ring focus:ring-gray-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-700"
            >
              <option value="LOW">Baja</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
            </select>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={submitting || !title.trim() || !description.trim()}
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {submitting ? 'Creando...' : 'Crear ticket'}
            </button>

            <button
              type="button"
              onClick={() => {
                setTitle('');
                setDescription('');
                setPriority('MEDIUM');
                setError(null);
              }}
              disabled={submitting}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Limpiar
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

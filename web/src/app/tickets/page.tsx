'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { clearToken, getToken, type CurrentUser } from '@/lib/auth';
import type { PaginatedTickets } from '@/lib/types';

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En progreso',
  WAITING_USER: 'Esperando al usuario',
  CLOSED: 'Cerrado',
  CANCELLED: 'Cancelado',
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
};

export default function TicketsPage() {
  const router = useRouter();

  const [data, setData] = useState<PaginatedTickets | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<string>('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '10');
    if (status) params.set('status', status);
    if (q.trim()) params.set('q', q.trim());
    return params.toString();
  }, [page, q, status]);

  async function loadTickets() {
    setLoading(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        router.push('/login');
        return;
      }

      const [meResult, ticketsResult] = await Promise.all([
        apiFetch<CurrentUser>('/auth/me'),
        apiFetch<PaginatedTickets>(`/tickets?${queryString}`),
      ]);

      setCurrentUser(meResult);
      setData(ticketsResult);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando tickets';

      // Si el token expiró o está mal, mandamos a login
      if (message.toLowerCase().includes('unauthorized')) {
        clearToken();
        router.push('/login');
        return;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  function onLogout() {
    clearToken();
    router.push('/login');
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 text-gray-900 md:p-6 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-zinc-100">
              Tickets
            </h1>
            <p className="text-sm text-gray-600 dark:text-zinc-400">
              Listado de tickets (DeskFlow)
            </p>
          </div>
          <div className="flex gap-2 self-start">
            {currentUser && currentUser.role !== 'USER' && (
              <button
                onClick={() => router.push('/metrics')}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                Métricas
              </button>
            )}

            <button
              onClick={onLogout}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="grid gap-3 md:grid-cols-[220px_1fr_auto]">
            <select
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:ring focus:ring-gray-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-700"
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
            >
              <option value="">Todos los estados</option>
              <option value="OPEN">Abierto</option>
              <option value="IN_PROGRESS">En progreso</option>
              <option value="WAITING_USER">Esperando al usuario</option>
              <option value="CLOSED">Cerrado</option>
              <option value="CANCELLED">Cancelado</option>
            </select>

            <input
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none focus:ring focus:ring-gray-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-700"
              type="text"
              placeholder="Buscar por título o descripción..."
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
            />

            <button
              onClick={() => {
                setStatus('');
                setQ('');
                setPage(1);
              }}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-900 hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Limpiar
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {loading ? (
            <div className="p-6 text-sm text-gray-600 dark:text-zinc-400">
              Cargando tickets...
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-red-700 dark:text-red-400">{error}</div>
          ) : !data || data.items.length === 0 ? (
            <div className="p-6 text-sm text-gray-600 dark:text-zinc-400">
              No hay tickets para mostrar.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-gray-900 dark:text-zinc-100">
                  <thead className="bg-gray-50 text-left dark:bg-zinc-800">
                    <tr>
                      <th className="px-4 py-3 font-medium text-gray-900 dark:text-zinc-100">
                        Título
                      </th>
                      <th className="px-4 py-3 font-medium text-gray-900 dark:text-zinc-100">
                        Estado
                      </th>
                      <th className="px-4 py-3 font-medium text-gray-900 dark:text-zinc-100">
                        Prioridad
                      </th>
                      <th className="px-4 py-3 font-medium text-gray-900 dark:text-zinc-100">
                        Asignado
                      </th>
                      <th className="px-4 py-3 font-medium text-gray-900 dark:text-zinc-100">
                        Eventos
                      </th>
                      <th className="px-4 py-3 font-medium text-gray-900 dark:text-zinc-100">
                        Creado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((ticket) => (
                      <tr
                        key={ticket.id}
                        className="cursor-pointer border-t border-gray-200 hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-800/60"
                        onClick={() => router.push(`/tickets/${ticket.id}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-zinc-100">
                            {ticket.title}
                          </div>
                          <div className="line-clamp-1 text-xs text-gray-500 dark:text-zinc-400">
                            {ticket.description}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-zinc-100">
                          {STATUS_LABELS[ticket.status] ?? ticket.status}
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-zinc-100">
                          {PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-zinc-100">
                          {ticket.assignedTo ? ticket.assignedTo.name : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-zinc-100">
                          {ticket._count.events}
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-zinc-100">
                          {new Date(ticket.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                <div>
                  Página {data.meta.page} de {data.meta.totalPages} · Total: {data.meta.total}
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-gray-900 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    disabled={data.meta.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Anterior
                  </button>
                  <button
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-gray-900 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    disabled={data.meta.page >= data.meta.totalPages}
                    onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

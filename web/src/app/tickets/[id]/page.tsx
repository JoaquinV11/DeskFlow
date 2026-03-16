'use client';

import { useEffect, useState, useMemo, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';

type Role = 'USER' | 'AGENT' | 'ADMIN';
type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_USER' | 'CLOSED' | 'CANCELLED';
type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH';
type CurrentUser = {
  userId: string;
  email: string;
  role: 'USER' | 'AGENT' | 'ADMIN';
};

type TicketDetail = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  cancelledAt: string | null;
  creator: { id: string; email: string; name: string; role: Role };
  assignedTo: { id: string; email: string; name: string; role: Role } | null;
  category: { id: string; name: string } | null;
  _count: { events: number; attachments: number };
};

type TicketEvent = {
  id: string;
  type: 'CREATED' | 'MESSAGE' | 'ASSIGNED' | 'STATUS_CHANGED';
  visibility: 'PUBLIC' | 'INTERNAL';
  message: string | null;
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus | null;
  createdAt: string;
  actor: { id: string; email: string; name: string; role: Role } | null;
};

type PaginatedTicketEvents = {
  items: TicketEvent[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

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

const ALLOWED_STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_USER', 'CLOSED', 'CANCELLED'],
  WAITING_USER: ['IN_PROGRESS', 'CLOSED', 'CANCELLED'],
  CLOSED: [],
  CANCELLED: [],
};

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const ticketId = params?.id as string;

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [events, setEvents] = useState<PaginatedTicketEvents | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [messageText, setMessageText] = useState('');
  const [messageVisibility, setMessageVisibility] = useState<'PUBLIC' | 'INTERNAL'>('PUBLIC');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);

  const [nextStatus, setNextStatus] = useState<TicketStatus | ''>('');
  const [statusReason, setStatusReason] = useState('');
  const [changingStatus, setChangingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const allowedNextStatuses = useMemo(() => {
    if (!ticket) return [];
    return ALLOWED_STATUS_TRANSITIONS[ticket.status] ?? [];
  }, [ticket]);

  useEffect(() => {
    if (!allowedNextStatuses.length) {
      setNextStatus('');
      return;
    }

    setNextStatus((prev) => {
      if (prev && allowedNextStatuses.includes(prev as TicketStatus)) {
        return prev;
      }
      return allowedNextStatuses[0];
    });
  }, [allowedNextStatuses]);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        router.push('/login');
        return;
      }

      const [meResult, ticketResult, eventsResult] = await Promise.all([
        apiFetch<CurrentUser>('/auth/me'),
        apiFetch<TicketDetail>(`/tickets/${ticketId}`),
        apiFetch<PaginatedTicketEvents>(`/tickets/${ticketId}/events?page=1&limit=50`),
      ]);

      setCurrentUser(meResult);
      setTicket(ticketResult);
      setEvents(eventsResult);

      // Si es USER, por UI lo dejo fijo en PUBLIC
      if (meResult.role === 'USER') {
        setMessageVisibility('PUBLIC');
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando ticket';

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


  async function onSubmitMessage(e: FormEvent) {
    e.preventDefault();

    if (!ticket) return;
    if (!messageText.trim()) return;

    setSendingMessage(true);
    setMessageError(null);

    try {
      const visibility =
        currentUser?.role === 'USER' ? 'PUBLIC' : messageVisibility;

      await apiFetch(`/tickets/${ticket.id}/events/message`, {
        method: 'POST',
        body: JSON.stringify({
          message: messageText.trim(),
          visibility,
        }),
      });

      setMessageText('');
      if (currentUser?.role === 'USER') {
        setMessageVisibility('PUBLIC');
      }

      await loadData(); // recarga timeline + detalle
    } catch (err) {
      setMessageError(err instanceof Error ? err.message : 'No se pudo enviar el mensaje');
    } finally {
      setSendingMessage(false);
    }
  }

  async function onSubmitStatus(e: FormEvent) {
    e.preventDefault();

    if (!ticket) return;
    if (!nextStatus) return;

    setChangingStatus(true);
    setStatusError(null);

    try {
      await apiFetch(`/tickets/${ticket.id}/status`, {
        method: 'POST',
        body: JSON.stringify({
          toStatus: nextStatus,
          reason: statusReason.trim() || undefined,
        }),
      });

      setStatusReason('');
      await loadData(); // recarga detalle + timeline
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo cambiar el estado';

      if (message.toLowerCase().includes('unauthorized')) {
        clearToken();
        router.push('/login');
        return;
      }

      setStatusError(message);
    } finally {
      setChangingStatus(false);
    }
  }

  useEffect(() => {
    if (!ticketId) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 text-gray-900 md:p-6 dark:bg-zinc-950 dark:text-zinc-100">
        <div className="mx-auto max-w-5xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-gray-600 dark:text-zinc-400">Cargando ticket...</p>
        </div>
      </main>
    );
  }

  if (error || !ticket) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 text-gray-900 md:p-6 dark:bg-zinc-950 dark:text-zinc-100">
        <div className="mx-auto max-w-5xl space-y-4">
          <button
            onClick={() => router.push('/tickets')}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            ← Volver a tickets
          </button>

          <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-900/40 dark:bg-zinc-900">
            <p className="text-sm text-red-700 dark:text-red-400">
              {error ?? 'No se pudo cargar el ticket'}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 text-gray-900 md:p-6 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => router.push('/tickets')}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            ← Volver
          </button>

          <button
            onClick={loadData}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Recargar
          </button>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-zinc-100">
                {ticket.title}
              </h1>
              <p className="text-sm text-gray-600 dark:text-zinc-400">{ticket.description}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs text-gray-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                Estado: {STATUS_LABELS[ticket.status] ?? ticket.status}
              </span>
              <span className="rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs text-gray-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                Prioridad: {PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/60">
              <p className="text-xs text-gray-500 dark:text-zinc-400">Creado por</p>
              <p className="font-medium">{ticket.creator.name}</p>
              <p className="text-gray-600 dark:text-zinc-400">{ticket.creator.email}</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/60">
              <p className="text-xs text-gray-500 dark:text-zinc-400">Asignado a</p>
              {ticket.assignedTo ? (
                <>
                  <p className="font-medium">{ticket.assignedTo.name}</p>
                  <p className="text-gray-600 dark:text-zinc-400">{ticket.assignedTo.email}</p>
                </>
              ) : (
                <p className="text-gray-600 dark:text-zinc-400">Sin asignar</p>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/60">
              <p className="text-xs text-gray-500 dark:text-zinc-400">Categoría</p>
              <p className="font-medium">{ticket.category?.name ?? 'Sin categoría'}</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/60">
              <p className="text-xs text-gray-500 dark:text-zinc-400">Eventos / Adjuntos</p>
              <p className="font-medium">
                {ticket._count.events} eventos · {ticket._count.attachments} adjuntos
              </p>
            </div>
          </div>
        </section>

        {currentUser && currentUser.role !== 'USER' && (
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
                Cambiar estado
              </h2>
              <p className="text-sm text-gray-600 dark:text-zinc-400">
                Gestioná el workflow del ticket desde el frontend.
              </p>
            </div>

            {allowedNextStatuses.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-300">
                Este ticket está en estado final ({STATUS_LABELS[ticket.status] ?? ticket.status}) y no tiene transiciones disponibles.
              </div>
            ) : (
              <form onSubmit={onSubmitStatus} className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-800 dark:text-zinc-200">
                    Nuevo estado
                  </label>
                  <select
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value as TicketStatus)}
                    className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:ring focus:ring-gray-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-700"
                  >
                    {allowedNextStatuses.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status] ?? status}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-800 dark:text-zinc-200">
                    Motivo (opcional)
                  </label>
                  <textarea
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    rows={3}
                    placeholder="Ej: Tomado por soporte para análisis"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none focus:ring focus:ring-gray-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-700"
                  />
                </div>

                {statusError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                    {statusError}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={changingStatus || !nextStatus}
                    className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
                  >
                    {changingStatus ? 'Actualizando...' : 'Cambiar estado'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStatusReason('');
                      setStatusError(null);
                    }}
                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Limpiar
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
              Agregar mensaje
            </h2>
            <p className="text-sm text-gray-600 dark:text-zinc-400">
              {currentUser?.role === 'USER'
                ? 'Tu mensaje será público para soporte.'
                : 'Podés enviar mensajes públicos o notas internas.'}
            </p>
          </div>

          <form onSubmit={onSubmitMessage} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-800 dark:text-zinc-200">
                Mensaje
              </label>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={4}
                placeholder="Escribí un comentario..."
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none focus:ring focus:ring-gray-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-700"
              />
            </div>

            {currentUser && currentUser.role !== 'USER' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-800 dark:text-zinc-200">
                  Visibilidad
                </label>
                <select
                  value={messageVisibility}
                  onChange={(e) => setMessageVisibility(e.target.value as 'PUBLIC' | 'INTERNAL')}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:ring focus:ring-gray-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-700"
                >
                  <option value="PUBLIC">Público</option>
                  <option value="INTERNAL">Interno</option>
                </select>
              </div>
            )}

            {messageError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                {messageError}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={sendingMessage || !messageText.trim()}
                className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {sendingMessage ? 'Enviando...' : 'Enviar mensaje'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMessageText('');
                  setMessageError(null);
                  if (currentUser?.role === 'USER') setMessageVisibility('PUBLIC');
                }}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                Limpiar
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Timeline</h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              {events?.meta.total ?? 0} eventos
            </p>
          </div>

          {!events || events.items.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-zinc-400">
              No hay eventos para mostrar.
            </p>
          ) : (
            <div className="space-y-3">
              {events.items.map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/60"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-gray-300 bg-white px-2 py-0.5 text-gray-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                      {event.type}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 ${
                        event.visibility === 'INTERNAL'
                          ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                          : 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                      }`}
                    >
                      {event.visibility === 'INTERNAL' ? 'Interno' : 'Público'}
                    </span>
                    <span className="text-gray-500 dark:text-zinc-400">
                      {new Date(event.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="text-sm text-gray-800 dark:text-zinc-200">
                    {event.message ? <p>{event.message}</p> : <p className="italic">Sin mensaje</p>}
                  </div>

                  {(event.fromStatus || event.toStatus) && (
                    <p className="mt-2 text-xs text-gray-600 dark:text-zinc-400">
                      Estado: {event.fromStatus ? (STATUS_LABELS[event.fromStatus] ?? event.fromStatus) : '—'} →{' '}
                      {event.toStatus ? (STATUS_LABELS[event.toStatus] ?? event.toStatus) : '—'}
                    </p>
                  )}

                  {event.actor && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-zinc-400">
                      Por {event.actor.name} ({event.actor.role})
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

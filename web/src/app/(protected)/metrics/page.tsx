'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';

type MetricsOverviewResponse = {
  generatedAt: string;
  tickets: {
    total: number;
    byStatus: {
      OPEN: number;
      IN_PROGRESS: number;
      WAITING_USER: number;
      CLOSED: number;
      CANCELLED: number;
    };
    unassigned: number;
    createdLast7Days: number;
    closedLast7Days: number;
  };
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Abiertos',
  IN_PROGRESS: 'En progreso',
  WAITING_USER: 'Esperando usuario',
  CLOSED: 'Cerrados',
  CANCELLED: 'Cancelados',
};

function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm text-gray-600 dark:text-zinc-400">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-zinc-100">
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">{subtitle}</p>
      )}
    </div>
  );
}

export default function MetricsPage() {
  const router = useRouter();

  const [data, setData] = useState<MetricsOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadMetrics() {
    setLoading(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        router.push('/login');
        return;
      }

      const result = await apiFetch<MetricsOverviewResponse>('/metrics/overview');
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando métricas';

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
    loadMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-zinc-100">
              Métricas
            </h1>
            <p className="text-sm text-gray-600 dark:text-zinc-400">
              Resumen operativo de tickets (DeskFlow)
            </p>
          </div>


          <div className="flex gap-2">
            <button
              onClick={loadMetrics}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Recargar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-gray-600 dark:text-zinc-400">
              Cargando métricas...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-900/40 dark:bg-zinc-900">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        ) : !data ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-gray-600 dark:text-zinc-400">
              No hay datos disponibles.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard title="Total de tickets" value={data.tickets.total} />
              <MetricCard title="Sin asignar" value={data.tickets.unassigned} />
              <MetricCard title="Creados (7 días)" value={data.tickets.createdLast7Days} />
              <MetricCard title="Cerrados (7 días)" value={data.tickets.closedLast7Days} />
            </div>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
                  Tickets por estado
                </h2>
                <p className="text-xs text-gray-500 dark:text-zinc-500">
                  Generado: {new Date(data.generatedAt).toLocaleString()}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {Object.entries(data.tickets.byStatus).map(([status, count]) => (
                  <div
                    key={status}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/60"
                  >
                    <p className="text-sm text-gray-600 dark:text-zinc-400">
                      {STATUS_LABELS[status] ?? status}
                    </p>
                    <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-zinc-100">
                      {count}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { clearToken, getToken, type CurrentUser } from '@/lib/auth';

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  async function loadMe() {
    setLoadingUser(true);
    try {
      const token = getToken();
      if (!token) {
        setCurrentUser(null);
        return;
      }

      const me = await apiFetch<CurrentUser>('/auth/me');
      setCurrentUser(me);
    } catch {
      // Si falla auth/me, limpio token para evitar estados raros
      clearToken();
      setCurrentUser(null);
    } finally {
      setLoadingUser(false);
    }
  }

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function onLogout() {
    clearToken();
    router.push('/login');
  }

  const isStaff = currentUser?.role === 'AGENT' || currentUser?.role === 'ADMIN';

  return (
    <header className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
            DeskFlow
          </h1>

          {loadingUser ? (
            <p className="text-sm text-gray-500 dark:text-zinc-400">Cargando usuario...</p>
          ) : currentUser ? (
            <p className="truncate text-sm text-gray-600 dark:text-zinc-400">
              Logueado como{' '}
              <span className="font-medium text-gray-900 dark:text-zinc-100">
                {currentUser.email}
              </span>{' '}
              ·{' '}
              <span className="inline-flex items-center rounded-full border border-gray-300 bg-gray-50 px-2 py-0.5 text-xs text-gray-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                {currentUser.role}
              </span>
            </p>
          ) : (
            <p className="text-sm text-gray-500 dark:text-zinc-400">Sin sesión activa</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => router.push('/tickets')}
            className={`rounded-xl border px-4 py-2 text-sm ${
              pathname?.startsWith('/tickets')
                ? 'border-black bg-black text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                : 'border-gray-300 bg-white text-gray-900 hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            Tickets
          </button>

          {isStaff && (
            <button
              onClick={() => router.push('/metrics')}
              className={`rounded-xl border px-4 py-2 text-sm ${
                pathname?.startsWith('/metrics')
                  ? 'border-black bg-black text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                  : 'border-gray-300 bg-white text-gray-900 hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800'
              }`}
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
    </header>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import { apiFetch } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';

type CurrentUser = {
  userId: string;
  email: string;
  role: 'USER' | 'AGENT' | 'ADMIN';
};

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const token = getToken();

        if (!token) {
          router.replace('/login');
          return;
        }

        const me = await apiFetch<CurrentUser>('/auth/me');

        if (cancelled) return;
        setCurrentUser(me);
      } catch {
        clearToken();
        if (!cancelled) router.replace('/login');
      } finally {
        if (!cancelled) setCheckingAuth(false);
      }
    }

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // UX guard (backend sigue siendo la seguridad real)
  useEffect(() => {
    if (!currentUser) return;
    if (pathname?.startsWith('/metrics') && currentUser.role === 'USER') {
      router.replace('/tickets');
    }
  }, [currentUser, pathname, router]);

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 text-gray-900 md:p-6 dark:bg-zinc-950 dark:text-zinc-100">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-gray-600 dark:text-zinc-400">
              Verificando sesión...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 text-gray-900 md:p-6 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-6xl space-y-4">
        <AppHeader />
        {children}
      </div>
    </main>
  );
}

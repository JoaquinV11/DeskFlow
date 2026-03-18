'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { saveToken } from '@/lib/auth';

type LoginResponse = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: 'USER' | 'AGENT' | 'ADMIN';
  };
};

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('demo123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      saveToken(result.accessToken);
      router.push('/tickets');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-zinc-100">DeskFlow</h1>
        <p className="text-sm text-gray-600 mb-6 dark:text-zinc-400">
          Iniciá sesión para acceder al panel de tickets
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-800 dark:text-zinc-200">Email</label>
            <input
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none focus:ring focus:ring-gray-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-700"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@demo.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-800 dark:text-zinc-200">Contraseña</label>
            <input
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none focus:ring focus:ring-gray-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-700"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="demo123"
              required
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-black text-white py-2.5 font-medium disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <div className="mt-5 text-xs text-gray-500 space-y-1">
          <p>Demo:</p>
          <p>admin@demo.com / demo123</p>
          <p>agent@demo.com / demo123</p>
          <p>user@demo.com / demo123</p>
        </div>
      </div>
    </main>
  );
}

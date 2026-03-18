export const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("deskflow_token");
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || `HTTP ${res.status}`);
  }

  return data as T;
}

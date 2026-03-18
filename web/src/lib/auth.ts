export type CurrentUser = {
  userId: string;
  email: string;
  role: "USER" | "AGENT" | "ADMIN";
};

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('deskflow_token');
}

export function saveToken(token: string) {
  localStorage.setItem("deskflow_token", token);
}

export function clearToken() {
  localStorage.removeItem("deskflow_token");
}

const SERVER_API = process.env.API_BASE_URL || 'http://localhost:4000';
const CLIENT_API =
  typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'
    : SERVER_API;

export function getApiBase() {
  return typeof window !== 'undefined' ? CLIENT_API : SERVER_API;
}

export async function apiFetch(path, options = {}) {
  const base = getApiBase();
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }
  return res.json();
}

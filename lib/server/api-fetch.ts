import { cookies } from 'next/headers';

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

async function buildCookieHeader(): Promise<string> {
  const all = (await cookies()).getAll();
  return all.map((c: { name: string; value: string }) => `${c.name}=${c.value}`).join('; ');
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = `${getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;

  const headers = new Headers(init?.headers);
  const cookieHeader = await buildCookieHeader();
  if (cookieHeader) {
    headers.set('cookie', cookieHeader);
  }

  return fetch(url, { ...init, headers });
}

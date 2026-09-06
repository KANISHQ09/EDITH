/**
 * Universal API helper for EDITH frontend.
 * Dynamically resolves the backend base URL across local dev,
 * Vercel serverless proxy, or direct Render backend URL.
 */

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const publicUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (publicUrl && publicUrl.startsWith('http')) {
      return publicUrl.replace(/\/+$/, '');
    }
  }
  return '';
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${cleanPath}` : cleanPath;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const primaryUrl = apiUrl(path);
  const headers = new Headers(init?.headers);
  if (!headers.has('Authorization')) {
    headers.set('Authorization', 'Bearer dev-token');
  }
  const mergedInit: RequestInit = { ...init, headers };

  try {
    const res = await fetch(primaryUrl, mergedInit);
    // If direct fetch succeeded or is not a 404/502, return it
    if (res.status !== 404 && res.status !== 502) {
      return res;
    }
    // If primary was absolute and failed with 404/502, try relative fallback
    if (primaryUrl.startsWith('http')) {
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      const fallbackRes = await fetch(cleanPath, mergedInit);
      return fallbackRes;
    }
    return res;
  } catch (err) {
    // If direct absolute fetch failed with network error, try relative fallback
    if (primaryUrl.startsWith('http')) {
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      return fetch(cleanPath, mergedInit);
    }
    throw err;
  }
}

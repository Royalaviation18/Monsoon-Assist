/**
 * Resolves the base URL for all API calls.
 *
 * - In development: Vite dev-server proxies `/api` → http://localhost:3001 (vite.config.ts).
 * - In production:  Set VITE_API_URL env var in your hosting provider (e.g. Vercel) to your
 *                   Render backend URL: https://rainready-api.onrender.com
 */
export const API_BASE = import.meta.env.VITE_API_URL ?? '';

/**
 * Convenience wrapper around fetch that prepends the API base URL.
 * Usage: apiFetch('/api/monsoon/plans')  →  https://rainready-api.onrender.com/api/monsoon/plans
 */
export const apiFetch = (path: string, options?: RequestInit): Promise<Response> =>
  fetch(`${API_BASE}${path}`, options);

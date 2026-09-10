export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
export const WS_URL = API_URL.replace(/^http/, 'ws');

// Base URL for server-side fetches (Server Components, generateMetadata, sitemap).
// Inside Docker Compose, "localhost" from the frontend container points at itself,
// not the backend container, so server-side calls need the internal service hostname.
export const SERVER_API_URL = process.env.INTERNAL_API_URL || API_URL;

export function apiFetch(path, options = {}) {
    return fetch(`${API_URL}${path}`, { ...options, credentials: 'include' });
}

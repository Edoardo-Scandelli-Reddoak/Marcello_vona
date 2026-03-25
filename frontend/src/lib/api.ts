const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const MEDIA_URL = process.env.NEXT_PUBLIC_MEDIA_URL || 'http://localhost:8000';

export function mediaUrl(path: string | null | undefined): string {
  if (!path) return '/placeholder.jpg';
  if (path.startsWith('http')) return path;
  return `${MEDIA_URL}${path}`;
}

async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const url = `${API_URL}${endpoint}`;
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Errore di rete' }));
    throw new Error(error.detail || JSON.stringify(error));
  }

  return res.json();
}

async function fetchApiFormData(endpoint: string, formData: FormData) {
  const url = `${API_URL}${endpoint}`;
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Errore di rete' }));
    throw new Error(error.detail || JSON.stringify(error));
  }

  return res.json();
}

// Auth
export const authApi = {
  register: (data: { email: string; password: string; password_confirm: string; user_type: string }) =>
    fetchApi('/auth/register/', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    fetchApi('/auth/login/', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => fetchApi('/auth/logout/', { method: 'POST' }),
  me: () => fetchApi('/auth/me/'),
  refresh: () => fetchApi('/auth/refresh/', { method: 'POST' }),
};

// Professioniste
export const professionisteApi = {
  list: (params?: string) => fetchApi(`/professioniste/${params ? `?${params}` : ''}`),
  featured: () => fetchApi('/professioniste/featured/'),
  nearby: (lat?: number, lng?: number) =>
    fetchApi(`/professioniste/nearby/${lat ? `?lat=${lat}&lng=${lng}` : ''}`),
  detail: (slug: string) => fetchApi(`/professioniste/${slug}/`),
  map: () => fetchApi('/professioniste/map/'),
  revealTelefono: (slug: string) =>
    fetchApi(`/professioniste/${slug}/telefono/`, { method: 'POST' }),
  register: (formData: FormData) => fetchApiFormData('/professioniste/register/', formData),
  dashboard: () => fetchApi('/professioniste/dashboard/'),
  updateDashboard: (data: FormData) =>
    fetchApiFormData('/professioniste/dashboard/', data),
};

// Recensioni
export const recensioniApi = {
  list: (slug: string) => fetchApi(`/professioniste/${slug}/recensioni/`),
  create: (slug: string, data: { stelle: number; testo: string }) =>
    fetchApi(`/professioniste/${slug}/recensioni/create/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  sito: () => fetchApi('/recensioni-sito/'),
};

// Categorie & Tags
export const categorieApi = {
  list: () => fetchApi('/categorie/'),
};

export const tagsApi = {
  list: () => fetchApi('/tags/'),
};

export const provinceApi = {
  list: () => fetchApi('/province/') as Promise<{ provincia: string; count: number }[]>,
};

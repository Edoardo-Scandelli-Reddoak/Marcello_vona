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
  register: (data: { email: string; password: string; password_confirm: string; user_type: string; first_name?: string }) =>
    fetchApi('/auth/register/', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    fetchApi('/auth/login/', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => fetchApi('/auth/logout/', { method: 'POST' }),
  me: () => fetchApi('/auth/me/'),
  refresh: () => fetchApi('/auth/refresh/', { method: 'POST' }),
};

export interface PosizioneTemporanea {
  attivo: boolean;
  indirizzo: string;
  citta: string;
  lat: number;
  lng: number;
  aggiornato_at: string;
}

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
  setMiTrovoQui: (indirizzo: string) =>
    fetchApi('/professioniste/dashboard/mi-trovo-qui/', {
      method: 'POST',
      body: JSON.stringify({ indirizzo }),
    }) as Promise<{
      via: string;
      cap: string;
      citta: string;
      provincia: string;
      nazione: string;
      lat: number;
      lng: number;
      aggiornato_at: string;
    }>,
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

// Abbonamenti & pagamenti
export interface PianoAbbonamento {
  id: number;
  tipo: 'standard' | 'evidenza';
  tipo_display: string;
  nome: string;
  durata_giorni: number;
  prezzo_centesimi: number;
  prezzo_eur: number;
  ordine: number;
}

export interface Abbonamento {
  id: number;
  piano: PianoAbbonamento;
  stato: 'in_attesa' | 'attivo' | 'scaduto' | 'annullato';
  stato_display: string;
  importo_centesimi: number;
  importo_eur: number;
  inizio: string | null;
  scadenza: string | null;
  is_attivo: boolean;
  payment_method: string;
  created_at: string;
  paid_at: string | null;
}

export interface CheckoutResponse {
  mock: boolean;
  redirect_url: string;
  abbonamento_id: number;
}

export interface DiscountInfo {
  early_bird_eligible: boolean;
  discount_pct: number;
  limit: number;
  remaining_slots: number;
}

export const abbonamentiApi = {
  piani: () => fetchApi('/piani/') as Promise<PianoAbbonamento[]>,
  checkout: (piano_id: number) =>
    fetchApi('/abbonamenti/checkout/', {
      method: 'POST',
      body: JSON.stringify({ piano_id }),
    }) as Promise<CheckoutResponse>,
  checkSession: (params: { session_id?: string; abbonamento_id?: number }) => {
    const q = new URLSearchParams();
    if (params.session_id) q.set('session_id', params.session_id);
    if (params.abbonamento_id) q.set('abbonamento_id', String(params.abbonamento_id));
    return fetchApi(`/abbonamenti/check-session/?${q.toString()}`) as Promise<Abbonamento>;
  },
  miei: () => fetchApi('/abbonamenti/me/') as Promise<Abbonamento[]>,
  discountInfo: () => fetchApi('/abbonamenti/discount-info/') as Promise<DiscountInfo>,
};

// Notifiche
export interface Notifica {
  id: number;
  tipo: string;
  tipo_display: string;
  titolo: string;
  messaggio: string;
  link: string;
  letta: boolean;
  created_at: string;
  read_at: string | null;
}

export const notificheApi = {
  list: () => fetchApi('/notifiche/me/') as Promise<Notifica[]>,
  marcaLetta: (id: number) =>
    fetchApi(`/notifiche/${id}/letta/`, { method: 'POST' }),
  marcaTutteLette: () =>
    fetchApi('/notifiche/leggi-tutte/', { method: 'POST' }),
};

// Sblocchi social
export const sblocchiApi = {
  checkout: (professionista_id: number) =>
    fetchApi('/sblocchi/checkout/', {
      method: 'POST',
      body: JSON.stringify({ professionista_id }),
    }) as Promise<{
      mock: boolean;
      redirect_url: string | null;
      sblocco_id: number;
      already_unlocked?: boolean;
    }>,
};

// Preferiti
export const preferitiApi = {
  list: () => fetchApi('/preferiti/me/'),
  toggle: (profId: number) =>
    fetchApi(`/preferiti/${profId}/`, { method: 'POST' }) as Promise<{ is_favorite: boolean; count: number }>,
};

// Banner pubblicitari
export interface Banner {
  id: number;
  posizione: string;
  titolo: string;
  descrizione: string;
  immagine: string | null;
  button_testo: string;
  button_link: string;
}

export const bannersApi = {
  byPosition: async (posizione: string): Promise<Banner | null> => {
    const res = await fetch(`${API_URL}/banners/${posizione}/`, { credentials: 'include' });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Errore di rete');
    return res.json();
  },
};

'use client';

import { useState, useEffect } from 'react';

interface GeoState {
  lat: number | null;
  lng: number | null;
  loading: boolean;
  error: string | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    lat: null,
    lng: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, loading: false, error: 'Geolocalizzazione non supportata' }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          loading: false,
          error: null,
        });
      },
      () => {
        setState(prev => ({ ...prev, loading: false, error: 'Permesso negato' }));
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, []);

  return state;
}

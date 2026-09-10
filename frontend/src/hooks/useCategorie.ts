'use client';

import { useEffect, useState } from 'react';
import { escortApi, type Categoria } from '@/lib/api';

/**
 * Categorie caricate da /categorie/.
 *
 * Sono gestite dall'admin Django: aggiungerne una la fa comparire nei filtri
 * e nei menu a tendina senza toccare il frontend. In caso di errore di rete
 * torna una lista vuota (il select mostra solo la voce segnaposto), come gia'
 * fa il caricamento delle province.
 */
export function useCategorie(): Categoria[] {
  const [categorie, setCategorie] = useState<Categoria[]>([]);

  useEffect(() => {
    let annullato = false;
    escortApi
      .categorie()
      .then((dati) => {
        if (!annullato) setCategorie(Array.isArray(dati) ? dati : []);
      })
      .catch(() => {
        if (!annullato) setCategorie([]);
      });
    return () => {
      annullato = true;
    };
  }, []);

  return categorie;
}

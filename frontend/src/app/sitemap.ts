import type { MetadataRoute } from 'next';
import { CITTA } from '@/lib/citta';
import { CATEGORIE_SEO } from '@/lib/seo';

// Sitemap dinamica: pagine statiche del sito + (in futuro) elenco escort
// pubbliche. Tenuto semplice per ora — quando il sito ha più traffico SEO
// si può estendere con fetch dell'elenco escort da /api/escort/.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://escort-bella.it';
  const now = new Date();
  const pagine: MetadataRoute.Sitemap = [
    { url: `${base}/`,             lastModified: now, changeFrequency: 'daily',  priority: 1.0 },
    { url: `${base}/escort`,       lastModified: now, changeFrequency: 'daily',  priority: 0.9 },
    { url: `${base}/chi-siamo`,    lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/registrati`,   lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/registrazione`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/login`,        lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/privacy`,      lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
    { url: `${base}/cookie`,       lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
    { url: `${base}/termini`,      lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
  ];
  // Pagine città (/milano, /bergamo, ...): non sono nel menu, Google le
  // scopre da qui.
  const citta: MetadataRoute.Sitemap = CITTA.map((c) => ({
    url: `${base}/${c.slug}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: c.capoluogoRegione ? 0.8 : 0.7,
  }));
  // Categorie (/donna) e categoria × città (/donna/milano).
  const categorie: MetadataRoute.Sitemap = CATEGORIE_SEO.flatMap((k) => [
    { url: `${base}/${k.slug}`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.8 },
    ...CITTA.map((c) => ({
      url: `${base}/${k.slug}/${c.slug}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })),
  ]);
  return [...pagine, ...citta, ...categorie];
}

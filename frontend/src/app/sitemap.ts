import type { MetadataRoute } from 'next';

// Sitemap dinamica: pagine statiche del sito + (in futuro) elenco escort
// pubbliche. Tenuto semplice per ora — quando il sito ha più traffico SEO
// si può estendere con fetch dell'elenco escort da /api/escort/.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://escort-bella.it';
  const now = new Date();
  return [
    { url: `${base}/`,             lastModified: now, changeFrequency: 'daily',  priority: 1.0 },
    { url: `${base}/escort`,       lastModified: now, changeFrequency: 'daily',  priority: 0.9 },
    { url: `${base}/registrati`,   lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/registrazione`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/login`,        lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/privacy`,      lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
    { url: `${base}/cookie`,       lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
    { url: `${base}/termini`,      lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
  ];
}

import type { MetadataRoute } from 'next';

// robots.txt dinamico generato da Next. Permette a tutti i crawler tranne
// le aree riservate (admin, dashboard, registrazione, abbonamento). Punta
// al sitemap così Google trova subito tutte le URL pubbliche.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/registrati/',
          '/registrazione/',
          '/login',
          '/abbonamento/',
        ],
      },
    ],
    sitemap: 'https://escort-bella.it/sitemap.xml',
    host: 'https://escort-bella.it',
  };
}

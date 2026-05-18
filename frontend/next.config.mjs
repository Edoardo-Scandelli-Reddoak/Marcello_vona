/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone: genera una build minimale (.next/standalone) che contiene SOLO
  // i node_modules necessari → immagine Docker ~10x più piccola, meno memoria
  // in fase di build su Railway/altri PaaS con limiti di RAM.
  output: 'standalone',
  // ESLint warnings non devono far fallire il build di produzione.
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      // Dev locale
      { protocol: 'http', hostname: 'localhost', port: '8000' },
      { protocol: 'http', hostname: 'localhost', port: '8001' },
      { protocol: 'http', hostname: 'backend', port: '8000' },
      // Esterni
      { protocol: 'https', hostname: 'unpkg.com' },
      // Railway: tutti i sottodomini del PaaS
      { protocol: 'https', hostname: '**.railway.app' },
      { protocol: 'https', hostname: '**.up.railway.app' },
    ],
  },
};

export default nextConfig;

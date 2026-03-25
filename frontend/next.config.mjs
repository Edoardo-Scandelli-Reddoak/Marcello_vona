/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
      },
      {
        protocol: 'http',
        hostname: 'backend',
        port: '8000',
      },
      {
        protocol: 'https',
        hostname: 'unpkg.com',
      },
    ],
  },
};

export default nextConfig;

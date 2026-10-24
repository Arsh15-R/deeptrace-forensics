/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
      }
    ],
  },
  async rewrites() {
    const backend = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    return [
      {
        source: '/api/media/:path*',
        destination: `${backend}/api/media/:path*`,
      },
      {
        source: '/api/py/:path*',
        destination: `${backend}/:path*`,
      },
    ];
  },
};

export default nextConfig;

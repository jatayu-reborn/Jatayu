/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, 
  images: {
    domains: ['apis.mapmyindia.com', 'apis.mappls.com'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.resolve.fallback = { 
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false
    };
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            // Allow workers from blob: to fix the MapMyIndia worker error
            value: "default-src 'self'; connect-src 'self' blob: https://*.mappls.com https://*.mapmyindia.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://*.mappls.com https://*.mapmyindia.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.mappls.com https://*.mapmyindia.com; font-src 'self' data:; worker-src 'self' blob:;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

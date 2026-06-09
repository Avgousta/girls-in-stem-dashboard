/** @type {import('next').NextConfig} */
const nextConfig = {
  // TypeScript and ESLint — errors must be fixed, not suppressed
  // typescript: { ignoreBuildErrors: true },  // REMOVED — audit fix C2
  // eslint:     { ignoreDuringBuilds: true },  // REMOVED — audit fix C2

  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }],
  },

  experimental: {
    serverActions: {
      // Production domain added — audit fix C4
      allowedOrigins: [
        'localhost:3000',
        'girls-stem-dashboard.vercel.app',
      ],
    },
  },

  // Security headers — audit fix T4
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",   // Next.js requires unsafe-inline
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https://*.supabase.co",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
              "font-src 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

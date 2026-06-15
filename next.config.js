const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }],
  },

  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        'girls-stem-dashboard.vercel.app',
      ],
    },
  },

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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.sentry.io",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https://*.supabase.co",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io",
              "font-src 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = withSentryConfig(nextConfig, {
  // Sentry organisation + project — update these after creating your Sentry project
  org:     process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Upload source maps silently during build
  silent: true,

  // Automatically instrument Next.js Data Fetching methods and API routes
  autoInstrumentServerFunctions: true,

  // Tree-shake Sentry debug code in production builds
  disableLogger: true,

  // Avoid sending source maps to Sentry in development
  sourcemaps: {
    disable: process.env.NODE_ENV !== 'production',
  },
});

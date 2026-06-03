/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allows server actions (used for candidate status updates)
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
}

export default nextConfig

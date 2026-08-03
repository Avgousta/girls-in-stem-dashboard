import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Girls in STEM Platform',
    short_name: 'Girls in STEM',
    description: 'Learner management and analytics platform for the Melisizwe Girls in STEM programme',
    start_url: '/',
    display: 'standalone',
    background_color: '#0B0B14',
    theme_color: '#7C3AED',
    icons: [
      { src: '/icon', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

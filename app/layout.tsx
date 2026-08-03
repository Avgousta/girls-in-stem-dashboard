import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display, DM_Sans, Plus_Jakarta_Sans } from 'next/font/google';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/ThemeProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});
const jakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: { default: 'Girls in STEM Platform', template: '%s | Girls in STEM' },
  description: 'Empowering girls through STEM education — learner management and analytics platform',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Girls in STEM',
  },
};

export const viewport: Viewport = {
  themeColor: '#7C3AED',
};

// Runs before React hydration — prevents flash of wrong theme
const themeScript = `(function(){try{var t=localStorage.getItem('girls-stem-theme')||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

// A registered service worker is required for Chrome to offer the PWA install prompt
const swScript = `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});});}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${inter.variable} ${playfair.variable} ${dmSans.variable} ${jakartaSans.variable}`}
    >
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: swScript }} />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}

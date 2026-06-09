export const dynamic = 'force-dynamic';
import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import SponsorLogout from './SponsorLogout';

export default async function SponsorLayout({ children }: { children: React.ReactNode }) {
  const user     = await requireAuth(['sponsor']);
  const supabase = await createClient();

  const { data: sponsor } = await supabase
    .from('sponsors')
    .select('sponsor_name, contact_name')
    .eq('sponsor_id', user.sponsor_id)
    .single();

  const sponsorName = (sponsor as { sponsor_name: string } | null)?.sponsor_name || 'Sponsor';
  const initials    = sponsorName.split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase();

  const nav = [
    { href: '/sponsor',            label: 'Overview' },
    { href: '/sponsor/learners',   label: 'Learner Portfolio' },
    { href: '/sponsor/programmes', label: 'Programmes' },
    { href: '/sponsor/reports',    label: 'Reports & Insights' },
  ];

  const today = new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen" style={{ background: '#0C0919', fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif" }}>

      {/* Top header bar */}
      <header style={{ background: '#080514', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="max-w-7xl mx-auto px-6 py-0">
          <div className="flex items-center justify-between h-16">

            {/* Brand + sponsor */}
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-3">
                {/* GirlsInSTEM wordmark */}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center text-white font-black text-xs"
                    style={{ background: '#7C3AED' }}>
                    G
                  </div>
                  <span className="text-white font-bold text-sm tracking-tight hidden sm:block">
                    Girls in STEM
                  </span>
                </div>
                <div className="w-px h-5 bg-white/20" />
                {/* Sponsor badge */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black"
                    style={{ background: 'linear-gradient(135deg,#7C3AED,#A78BFA)' }}>
                    {initials}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-white/40 text-[10px] uppercase tracking-widest leading-none">Sponsor Portal</p>
                    <p className="text-white text-sm font-semibold leading-tight">{sponsorName}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — date + logout */}
            <div className="flex items-center gap-4">
              <p className="hidden md:block text-white/35 text-xs">{today}</p>
              <div className="h-4 w-px bg-white/20 hidden md:block" />
              <SponsorLogout />
            </div>
          </div>

          {/* Nav tabs */}
          <nav className="flex gap-0 -mb-px">
            {nav.map(({ href, label }) => (
              <Link key={href} href={href}
                className="px-4 py-3 text-sm font-medium border-b-2 border-transparent transition-all whitespace-nowrap"
                style={{
                  color: 'rgba(255,255,255,0.5)',
                }
                // Active state handled client-side via CSS for now; hover is sufficient
              }>
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-6 mt-12"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs" style={{ color: 'rgba(240,238,255,0.4)' }}>
            Girls in STEM Digital Platform — Sponsor Portal &nbsp;·&nbsp; Data updated in real-time
          </p>
          <p className="text-xs" style={{ color: 'rgba(240,238,255,0.4)' }}>
            Confidential &nbsp;·&nbsp; {sponsorName}
          </p>
        </div>
      </footer>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  Menu, X, Sparkles, ArrowRight, Zap,
  Shield, BookOpen, GraduationCap, Heart,
  TrendingUp, Calendar, Award, BarChart3, Users, Star,
  Check, ChevronRight,
} from 'lucide-react';

// ─── Data ─────────────────────────────────────────────────────────────────────

const STATS = [
  { value: '46',   label: 'Active Learners' },
  { value: '6',    label: 'Programmes' },
  { value: '86%',  label: 'Attendance Rate' },
  { value: '100%', label: 'Female Led' },
] as const;

const PORTALS = [
  {
    icon: Shield,
    title: 'Administrator',
    accent: '#7C3AED',
    accentLight: 'rgba(124,58,237,0.15)',
    accentBorder: 'rgba(124,58,237,0.5)',
    href: '/login',
    cta: 'Admin Login',
    features: ['Learner & cohort management', 'Risk scores & analytics', 'Bulk decisions & reports'],
  },
  {
    icon: BookOpen,
    title: 'Instructor',
    accent: '#2DD4A0',
    accentLight: 'rgba(45,212,160,0.12)',
    accentBorder: 'rgba(45,212,160,0.45)',
    href: '/login',
    cta: 'Instructor Login',
    features: ['Attendance tracking', 'Assessment submission', 'Mentorship sessions'],
  },
  {
    icon: GraduationCap,
    title: 'Student',
    accent: '#F59E0B',
    accentLight: 'rgba(245,158,11,0.12)',
    accentBorder: 'rgba(245,158,11,0.45)',
    href: '/register',
    cta: 'Apply Now',
    features: ['Learning journey dashboard', 'Progress & achievements', 'Mentor connection'],
  },
  {
    icon: Heart,
    title: 'Sponsor',
    accent: '#EC4899',
    accentLight: 'rgba(236,72,153,0.12)',
    accentBorder: 'rgba(236,72,153,0.45)',
    href: '/login',
    cta: 'Sponsor Portal',
    features: ['Impact reports', 'Learner visibility', 'Programme outcomes'],
  },
] as const;

const FEATURES = [
  {
    icon: TrendingUp,
    title: 'Risk Monitoring',
    description: 'Automated risk scoring flags at-risk learners before they fall behind, enabling early and targeted intervention.',
  },
  {
    icon: Calendar,
    title: 'Attendance Tracking',
    description: 'Real-time session attendance with trend analysis and automated alerts for chronic absenteeism.',
  },
  {
    icon: Award,
    title: 'Gamification',
    description: 'Achievement badges and milestone rewards keep learners motivated and engaged throughout their journey.',
  },
  {
    icon: BarChart3,
    title: 'Assessments',
    description: 'Structured templates with automatic grade-band classification and cohort performance comparisons.',
  },
  {
    icon: Users,
    title: 'Mentorship',
    description: 'Structured sessions with goal-setting, progress notes, and meeting ratings for continuous improvement.',
  },
  {
    icon: Star,
    title: 'Sponsor Impact',
    description: 'Transparent impact reporting gives sponsors real-time visibility into outcomes and learner progress.',
  },
] as const;

// ─── Gradient text style ───────────────────────────────────────────────────────

const gradientText: React.CSSProperties = {
  background: 'linear-gradient(92deg, #C4B5FD 0%, #A78BFA 35%, #2DD4A0 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

// ─── Portal Card ──────────────────────────────────────────────────────────────

function PortalCard({
  icon: Icon, title, accent, accentLight, accentBorder, href, cta, features,
}: typeof PORTALS[number]) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer"
      style={{
        background: hovered ? accentLight : 'rgba(255,255,255,0.04)',
        border: `1px solid ${hovered ? accentBorder : 'rgba(255,255,255,0.09)'}`,
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? `0 20px 40px ${accentLight}` : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* top accent bar */}
      <div className="h-1 w-full" style={{ background: accent }} />

      <div className="flex flex-col flex-1 p-7">
        {/* Icon */}
        <div
          className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ background: accentLight, border: `1px solid ${accentBorder}` }}
        >
          <Icon size={22} style={{ color: accent }} />
        </div>

        {/* Title */}
        <h3 className="mb-2 text-lg font-bold text-white">{title}</h3>

        {/* Features */}
        <ul className="mb-6 flex flex-col gap-2 flex-1">
          {features.map(feat => (
            <li key={feat} className="flex items-start gap-2.5">
              <span
                className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                style={{ background: accentLight }}
              >
                <Check size={10} style={{ color: accent }} strokeWidth={3} />
              </span>
              <span className="text-sm leading-snug" style={{ color: 'rgba(255,255,255,0.72)' }}>
                {feat}
              </span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Link
          href={href}
          className="mt-auto flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-all duration-200"
          style={{ background: hovered ? accent : 'rgba(255,255,255,0.07)', border: `1px solid ${hovered ? accent : 'rgba(255,255,255,0.1)'}` }}
          onClick={e => e.stopPropagation()}
        >
          {cta}
          <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled]   = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div style={{ background: '#0F0820', fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif", color: '#fff' }}>

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav
        className="fixed inset-x-0 top-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(15,8,32,0.88)' : 'transparent',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(124,58,237,0.2)' : 'none',
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}
            >
              <Sparkles size={15} className="text-white" />
            </div>
            <div>
              <span className="block text-sm font-bold text-white leading-tight">Girls in STEM</span>
              <span className="block text-[10px] font-medium" style={{ color: 'rgba(167,139,250,0.8)' }}>Melisizwe Programme</span>
            </div>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {['#portals', '#features'].map((href, i) => (
              <a key={href} href={href} className="text-sm font-medium transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {['Portals', 'Features'][i]}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.1)' }}>
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}
            >
              Get started
            </Link>
          </div>

          <button
            className="rounded-md p-1.5 transition-colors hover:text-white md:hidden"
            style={{ color: 'rgba(255,255,255,0.6)' }}
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t px-6 py-5 md:hidden" style={{ background: 'rgba(15,8,32,0.97)', borderColor: 'rgba(124,58,237,0.18)' }}>
            <div className="flex flex-col gap-4">
              {[['#portals', 'Portals'], ['#features', 'Features']].map(([href, label]) => (
                <a key={href} href={href} className="text-sm font-medium hover:text-white" style={{ color: 'rgba(255,255,255,0.7)' }} onClick={() => setMenuOpen(false)}>
                  {label}
                </a>
              ))}
              <hr style={{ borderColor: 'rgba(124,58,237,0.18)' }} />
              <Link href="/login" className="rounded-xl py-3 text-center text-sm font-medium" style={{ color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }} onClick={() => setMenuOpen(false)}>
                Sign in
              </Link>
              <Link href="/register" className="rounded-xl py-3 text-center text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }} onClick={() => setMenuOpen(false)}>
                Get started
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section
        className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pb-20 pt-32 text-center"
        style={{ background: 'linear-gradient(160deg, #0F0820 0%, #1C0B38 45%, #2D1B4E 100%)' }}
      >
        {/* Glows */}
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 55% at 50% -5%, rgba(124,58,237,0.45) 0%, transparent 60%)' }} />
        <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2" style={{ width: '600px', height: '300px', background: 'radial-gradient(ellipse at center, rgba(45,212,160,0.1) 0%, transparent 70%)' }} />

        {/* Badge */}
        <div
          className="relative z-10 mb-8 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold"
          style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(167,139,250,0.35)', color: '#C4B5FD', letterSpacing: '0.06em' }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
          MELISIZWE PROGRAMME · SOUTH AFRICA · EST. 2024
        </div>

        {/* Headline */}
        <h1
          className="relative z-10 max-w-4xl text-4xl font-extrabold leading-tight sm:text-5xl md:text-6xl lg:text-[4.5rem]"
          style={{ letterSpacing: '-0.02em' }}
        >
          Empowering the next generation of{' '}
          <span style={gradientText}>women in STEM</span>
        </h1>

        {/* Sub */}
        <p className="relative z-10 mt-6 max-w-2xl text-base leading-relaxed sm:text-lg" style={{ color: 'rgba(255,255,255,0.62)' }}>
          A unified platform connecting administrators, instructors, students, and sponsors —
          tracking every learner&apos;s journey from enrolment to excellence.
        </p>

        {/* CTAs */}
        <div className="relative z-10 mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="group inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-bold text-white shadow-xl transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', boxShadow: '0 0 32px rgba(124,58,237,0.5)' }}
          >
            Get started free
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#portals"
            className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-semibold transition-all hover:bg-white/10"
            style={{ border: '1px solid rgba(255,255,255,0.16)', color: 'rgba(255,255,255,0.82)' }}
          >
            Explore portals
          </a>
        </div>

        {/* Stats */}
        <div
          className="relative z-10 mt-16 grid grid-cols-2 overflow-hidden rounded-2xl md:grid-cols-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
        >
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className="flex flex-col items-center px-8 py-6 sm:px-10"
              style={{ borderRight: i < STATS.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}
            >
              <span className="text-3xl font-extrabold sm:text-4xl" style={gradientText}>{stat.value}</span>
              <span className="mt-1.5 text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── PORTALS ──────────────────────────────────────────────── */}
      <section id="portals" className="px-6 py-24" style={{ background: 'linear-gradient(180deg, #1C0B38 0%, #231444 100%)' }}>
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: '#A78BFA' }}>
              Four portals, one platform
            </p>
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl md:text-5xl" style={{ letterSpacing: '-0.02em' }}>
              Built for every stakeholder
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base" style={{ color: 'rgba(255,255,255,0.55)', lineHeight: '1.7' }}>
              Each role gets a tailored experience — the right data, the right tools, no clutter.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PORTALS.map(portal => (
              <PortalCard key={portal.title} {...portal} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section id="features" className="px-6 py-24" style={{ background: 'linear-gradient(180deg, #231444 0%, #1C0B38 100%)' }}>
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: '#A78BFA' }}>
              Platform capabilities
            </p>
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl md:text-5xl" style={{ letterSpacing: '-0.02em' }}>
              Everything you need to run a{' '}
              <span style={{ color: '#A78BFA' }}>world-class programme</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base" style={{ color: 'rgba(255,255,255,0.55)', lineHeight: '1.7' }}>
              Purpose-built tools for monitoring, engagement, and continuous improvement across your entire learner cohort.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="group rounded-2xl p-6 transition-all duration-200 hover:-translate-y-1"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                onMouseOver={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(124,58,237,0.4)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(124,58,237,0.07)'; }}
                onMouseOut={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'; }}
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'rgba(124,58,237,0.18)', border: '1px solid rgba(124,58,237,0.3)' }}>
                  <Icon size={20} style={{ color: '#A78BFA' }} />
                </div>
                <h3 className="mb-2 text-base font-bold text-white">{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.58)' }}>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden px-6 py-28 text-center"
        style={{ background: 'linear-gradient(135deg, #3B1F64 0%, #7C3AED 55%, #5B21B6 100%)' }}
      >
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 80% at 50% 50%, rgba(255,255,255,0.08) 0%, transparent 65%)' }} />
        <div className="relative z-10 mx-auto max-w-2xl">
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.9)' }}
          >
            <Zap size={11} /> Open applications now
          </div>
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl md:text-5xl" style={{ letterSpacing: '-0.02em' }}>
            Start your journey today
          </h2>
          <p className="mt-4 text-base sm:text-lg" style={{ color: 'rgba(255,255,255,0.72)' }}>
            Join the platform built to close the gender gap in STEM — one learner at a time.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold shadow-xl transition-all hover:bg-white/92"
              style={{ color: '#6D28D9' }}
            >
              Apply now <ArrowRight size={15} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/10"
              style={{ border: '1px solid rgba(255,255,255,0.3)' }}
            >
              Sign in to portal
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer className="px-6 py-12" style={{ background: '#080514', borderTop: '1px solid rgba(124,58,237,0.15)' }}>
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>
              <Sparkles size={13} className="text-white" />
            </div>
            <div>
              <span className="block text-sm font-bold" style={{ color: 'rgba(255,255,255,0.8)' }}>Girls in STEM</span>
              <span className="block text-[10px]" style={{ color: 'rgba(167,139,250,0.7)' }}>Melisizwe Programme</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {[
              { label: 'Portals', href: '#portals' },
              { label: 'Features', href: '#features' },
              { label: 'Sign in', href: '/login' },
              { label: 'Register', href: '/register' },
            ].map(link => (
              <a key={link.label} href={link.href} className="text-xs font-medium transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.38)' }}>
                {link.label}
              </a>
            ))}
          </div>

          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.28)' }}>
            © {new Date().getFullYear()} Melisizwe Girls in STEM. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

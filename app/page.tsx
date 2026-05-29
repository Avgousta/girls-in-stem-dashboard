'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  Menu, X, Shield, BookOpen, GraduationCap, Heart,
  TrendingUp, Calendar, Award, BarChart3, Users, Sparkles,
  ArrowRight, Star, Zap,
} from 'lucide-react';

const PORTALS = [
  {
    icon: Shield,
    title: 'Administrator',
    accent: '#7C3AED',
    description:
      'Full platform oversight — manage learners, instructors, sponsors, risk scores, and system-wide analytics from a single command centre.',
  },
  {
    icon: BookOpen,
    title: 'Instructor',
    accent: '#2DD4A0',
    description:
      'Track attendance, submit assessments, monitor at-risk learners, and manage mentorship sessions for your cohort.',
  },
  {
    icon: GraduationCap,
    title: 'Student',
    accent: '#F59E0B',
    description:
      'Follow your learning journey — view progress, achievements, projects, and connect with your mentor and support network.',
  },
  {
    icon: Heart,
    title: 'Sponsor',
    accent: '#EC4899',
    description:
      'See the direct impact of your investment — track the learners you support and view programme outcomes and reports.',
  },
] as const;

const FEATURES = [
  {
    icon: TrendingUp,
    title: 'Risk Monitoring',
    description:
      'Automated risk scoring flags at-risk learners before they fall behind, enabling early, targeted intervention.',
  },
  {
    icon: Calendar,
    title: 'Attendance Tracking',
    description:
      'Real-time session attendance with trend analysis and automated alerts for chronic absenteeism.',
  },
  {
    icon: Award,
    title: 'Gamification',
    description:
      'Achievement badges and milestone rewards keep learners motivated and engaged throughout their journey.',
  },
  {
    icon: BarChart3,
    title: 'Assessments',
    description:
      'Structured assessment templates with automatic grade-band classification and cohort performance comparisons.',
  },
  {
    icon: Users,
    title: 'Mentorship',
    description:
      'Structured mentorship sessions with goal-setting, progress notes, and meeting ratings for continuous improvement.',
  },
  {
    icon: Star,
    title: 'Sponsor Impact',
    description:
      'Transparent impact reporting gives sponsors real-time visibility into outcomes and learner progress.',
  },
] as const;

const STATS = [
  { value: '46', label: 'Active Learners' },
  { value: '6', label: 'Programmes' },
  { value: '86%', label: 'Attendance Rate' },
] as const;

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div style={{ background: '#2D1B4E', fontFamily: 'var(--font-dm-sans, sans-serif)' }}>

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav
        className="fixed inset-x-0 top-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(20, 9, 42, 0.92)' : 'transparent',
          backdropFilter: scrolled ? 'blur(14px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(124,58,237,0.18)' : 'none',
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}
            >
              <Sparkles size={15} className="text-white" />
            </div>
            <span
              className="text-lg font-semibold text-white"
              style={{ fontFamily: 'var(--font-playfair, serif)' }}
            >
              Girls in STEM
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#portals"
              className="text-sm font-medium text-white/60 transition-colors hover:text-white"
            >
              Portals
            </a>
            <a
              href="#features"
              className="text-sm font-medium text-white/60 transition-colors hover:text-white"
            >
              Features
            </a>
          </div>

          {/* Desktop CTAs */}
          <div className="hidden items-center gap-2 md:flex">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}
            >
              Get started
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="rounded-md p-1.5 text-white/60 transition-colors hover:text-white md:hidden"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div
            className="border-t px-6 py-5 md:hidden"
            style={{
              background: 'rgba(20, 9, 42, 0.97)',
              borderColor: 'rgba(124,58,237,0.18)',
            }}
          >
            <div className="flex flex-col gap-4">
              <a
                href="#portals"
                className="text-sm font-medium text-white/70 hover:text-white"
                onClick={() => setMenuOpen(false)}
              >
                Portals
              </a>
              <a
                href="#features"
                className="text-sm font-medium text-white/70 hover:text-white"
                onClick={() => setMenuOpen(false)}
              >
                Features
              </a>
              <hr style={{ borderColor: 'rgba(124,58,237,0.18)' }} />
              <Link
                href="/login"
                className="rounded-xl py-3 text-center text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}
                onClick={() => setMenuOpen(false)}
              >
                Sign in
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section
        className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pb-20 pt-28 text-center"
        style={{
          background: 'linear-gradient(160deg, #140928 0%, #2D1B4E 45%, #3B1F64 100%)',
        }}
      >
        {/* Radial glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 75% 55% at 50% 0%, rgba(124,58,237,0.38) 0%, transparent 65%)',
          }}
        />

        {/* Programme badge */}
        <div
          className="relative z-10 mb-8 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest"
          style={{
            background: 'rgba(124,58,237,0.14)',
            border: '1px solid rgba(167,139,250,0.3)',
            color: '#A78BFA',
          }}
        >
          <Zap size={11} />
          Melisizwe Girls in STEM Programme
        </div>

        {/* Headline */}
        <h1
          className="relative z-10 max-w-4xl text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl lg:text-[4.25rem]"
          style={{ fontFamily: 'var(--font-playfair, serif)' }}
        >
          Empowering the next generation of{' '}
          <span
            style={{
              background: 'linear-gradient(92deg, #C4B5FD 0%, #A78BFA 40%, #2DD4A0 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            women in STEM
          </span>
        </h1>

        {/* Subheading */}
        <p className="relative z-10 mt-6 max-w-2xl text-lg leading-relaxed text-white/55 sm:text-xl">
          A unified platform connecting administrators, instructors, students, and sponsors —
          tracking every learner's journey from enrolment to excellence.
        </p>

        {/* CTAs */}
        <div className="relative z-10 mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login"
            className="group inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-violet-900/40 transition-all hover:opacity-90 hover:shadow-violet-700/30"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}
          >
            Get started
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#portals"
            className="inline-flex items-center gap-2 rounded-xl border px-7 py-3.5 text-sm font-semibold text-white/75 transition-all hover:bg-white/5 hover:text-white"
            style={{ borderColor: 'rgba(255,255,255,0.14)' }}
          >
            Explore portals
          </a>
        </div>

        {/* Stats row */}
        <div
          className="relative z-10 mt-16 inline-flex overflow-hidden rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className="flex flex-col items-center px-8 py-6 sm:px-12"
              style={{
                borderRight: i < STATS.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              }}
            >
              <span
                className="text-3xl font-bold text-white sm:text-4xl"
                style={{ fontFamily: 'var(--font-playfair, serif)' }}
              >
                {stat.value}
              </span>
              <span className="mt-1 text-xs font-medium uppercase tracking-wider text-white/45">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── PORTALS ──────────────────────────────────────────────── */}
      <section
        id="portals"
        className="px-6 py-24"
        style={{ background: 'linear-gradient(180deg, #231444 0%, #2D1B4E 100%)' }}
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <p
              className="mb-3 text-xs font-semibold uppercase tracking-widest"
              style={{ color: '#A78BFA' }}
            >
              Four portals, one platform
            </p>
            <h2
              className="text-3xl font-bold text-white sm:text-4xl md:text-5xl"
              style={{ fontFamily: 'var(--font-playfair, serif)' }}
            >
              Built for every stakeholder
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-white/50">
              Each role gets a tailored experience — the right data, the right tools, no clutter.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PORTALS.map(({ icon: Icon, title, accent, description }) => (
              <PortalCard
                key={title}
                icon={Icon}
                title={title}
                accent={accent}
                description={description}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section
        id="features"
        className="px-6 py-24"
        style={{ background: 'linear-gradient(180deg, #2D1B4E 0%, #1C0E38 100%)' }}
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <p
              className="mb-3 text-xs font-semibold uppercase tracking-widest"
              style={{ color: '#A78BFA' }}
            >
              Platform capabilities
            </p>
            <h2
              className="text-3xl font-bold text-white sm:text-4xl md:text-5xl"
              style={{ fontFamily: 'var(--font-playfair, serif)' }}
            >
              Everything you need to run a{' '}
              <span style={{ color: '#A78BFA' }}>world-class programme</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-white/50">
              Purpose-built tools for monitoring, engagement, and continuous improvement across your
              entire learner cohort.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl p-6 transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <div
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ background: 'rgba(124,58,237,0.18)' }}
                >
                  <Icon size={20} style={{ color: '#A78BFA' }} />
                </div>
                <h3 className="mb-2 text-base font-semibold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-white/52">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden px-6 py-28 text-center"
        style={{
          background: 'linear-gradient(135deg, #4C1D95 0%, #7C3AED 55%, #5B21B6 100%)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 65% 90% at 50% 50%, rgba(255,255,255,0.07) 0%, transparent 65%)',
          }}
        />
        <div className="relative z-10 mx-auto max-w-2xl">
          <h2
            className="text-3xl font-bold text-white sm:text-4xl md:text-5xl"
            style={{ fontFamily: 'var(--font-playfair, serif)' }}
          >
            Start your journey today
          </h2>
          <p className="mt-4 text-base text-white/65 sm:text-lg">
            Join the platform built to close the gender gap in STEM — one learner at a time.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold shadow-xl transition-all hover:bg-white/92"
              style={{ color: '#6D28D9' }}
            >
              Sign in to your portal
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer
        className="px-6 py-12"
        style={{
          background: '#0F0820',
          borderTop: '1px solid rgba(124,58,237,0.14)',
        }}
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 sm:flex-row sm:justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}
            >
              <Sparkles size={13} className="text-white" />
            </div>
            <span
              className="text-sm font-semibold text-white/75"
              style={{ fontFamily: 'var(--font-playfair, serif)' }}
            >
              Girls in STEM
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            {[
              { label: 'Portals', href: '#portals' },
              { label: 'Features', href: '#features' },
              { label: 'Sign in', href: '/login' },
            ].map(link => (
              <a
                key={link.label}
                href={link.href}
                className="text-xs font-medium text-white/38 transition-colors hover:text-white/65"
              >
                {link.label}
              </a>
            ))}
          </div>

          <p className="text-xs text-white/28">
            © {new Date().getFullYear()} Melisizwe Girls in STEM. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ── Portal card with JS hover for colour-matched border ── */
function PortalCard({
  icon: Icon,
  title,
  accent,
  description,
}: {
  icon: React.ElementType;
  title: string;
  accent: string;
  description: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
      style={{
        background: hovered ? `${accent}10` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${hovered ? `${accent}45` : 'rgba(255,255,255,0.08)'}`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ background: `${accent}1A` }}
      >
        <Icon size={22} style={{ color: accent }} />
      </div>
      <h3
        className="mb-2 text-lg font-semibold text-white"
        style={{ fontFamily: 'var(--font-playfair, serif)' }}
      >
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-white/52">{description}</p>
    </div>
  );
}

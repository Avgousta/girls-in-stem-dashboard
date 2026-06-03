import Link from 'next/link'

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconBriefcase() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" aria-hidden="true">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}

function IconGraduationCap() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" aria-hidden="true">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  )
}

function IconHeart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function IconBarChart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function IconMail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

function IconStar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function IconArrowRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconFlask() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" aria-hidden="true">
      <path d="M9 3h6M9 3v7L4 17a2 2 0 0 0 1.72 3h12.56A2 2 0 0 0 20 17L15 10V3" />
      <line x1="9" y1="13" x2="15" y2="13" />
    </svg>
  )
}

function LogoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  )
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const stats = [
  { value: '46', label: 'Active Learners' },
  { value: '6',  label: 'Programmes' },
  { value: '86%', label: 'Attendance Rate' },
  { value: '100%', label: 'Female Led' },
]

const portals = [
  {
    title: 'Administrator',
    description: 'Full control over the platform. Manage learners, track scores, send decisions, generate reports, and oversee all programme activity.',
    icon: <IconShield />,
    href: '/login',
    cta: 'Admin Login',
    gradient: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
    topBar: 'linear-gradient(90deg, #7c3aed, #a855f7)',
    badge: 'Platform Control',
    features: ['Candidate scoring', 'Bulk decisions', 'Analytics & reports'],
  },
  {
    title: 'Instructor',
    description: 'Review candidates, evaluate applications, score assessments, and collaborate with the team to identify top talent.',
    icon: <IconBriefcase />,
    href: '/login',
    cta: 'Instructor Login',
    gradient: 'linear-gradient(135deg, #e11d48, #be185d)',
    topBar: 'linear-gradient(90deg, #e11d48, #f472b6)',
    badge: 'Evaluation Tools',
    features: ['Score assessments', 'Review applications', 'Team collaboration'],
  },
  {
    title: 'Student',
    description: 'Apply to the Melisizwe Girls in STEM programme, complete assessments, track your progress, and access learning resources.',
    icon: <IconGraduationCap />,
    href: '/register',
    cta: 'Apply Now',
    gradient: 'linear-gradient(135deg, #d97706, #b45309)',
    topBar: 'linear-gradient(90deg, #f59e0b, #f97316)',
    badge: 'Your Journey',
    features: ['Online application', 'Assessment portal', 'Progress tracking'],
  },
  {
    title: 'Sponsor',
    description: 'Support the next generation of African women in STEM. View programme impact, track scholarship recipients, and engage with learners.',
    icon: <IconHeart />,
    href: '/login',
    cta: 'Sponsor Portal',
    gradient: 'linear-gradient(135deg, #0d9488, #0e7490)',
    topBar: 'linear-gradient(90deg, #14b8a6, #06b6d4)',
    badge: 'Make Impact',
    features: ['Impact reports', 'Learner profiles', 'Scholarship tracking'],
  },
]

const features = [
  {
    icon: <IconBarChart />,
    title: 'Smart Scoring Engine',
    description: 'Composite scoring across aptitude, academic performance, psychometric, and video assessments with automatic decision thresholds.',
  },
  {
    icon: <IconMail />,
    title: 'Automated Communications',
    description: 'Intelligent email workflows for applications, decisions, guardian consent, and progress nudges — all triggered automatically.',
  },
  {
    icon: <IconStar />,
    title: 'Multi-stage Assessments',
    description: 'Structured maths, science, and psychometric tests with real-time scoring, time limits, and fraud-resistant delivery.',
  },
  {
    icon: <IconUsers />,
    title: 'Role-based Access',
    description: 'Separate portals for administrators, instructors, students, and sponsors — each with precisely scoped permissions.',
  },
  {
    icon: <IconFlask />,
    title: 'Programme Management',
    description: 'Run multiple STEM programmes simultaneously with independent cohort tracking, deadlines, and reporting.',
  },
  {
    icon: <IconShield />,
    title: 'Secure & Private',
    description: 'Row-level security, encrypted storage, and POPIA-compliant data handling to protect every learner\'s information.',
  },
]

// ─── Gradient text helper ─────────────────────────────────────────────────────

const gradientTextStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f97316 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}

const purplePinkGradient: React.CSSProperties = {
  background: 'linear-gradient(135deg, #a855f7, #ec4899)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
      style={{
        background: 'rgba(10,10,15,0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}
        >
          <LogoIcon />
        </div>
        <div>
          <span className="font-bold text-sm block" style={{ color: '#e8e6f0' }}>Girls in STEM</span>
          <span className="hidden sm:block text-xs" style={{ color: '#9996aa' }}>Melisizwe Programme</span>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-8 text-sm font-medium">
        <a href="#portals" className="lp-nav-link cursor-pointer">Portals</a>
        <a href="#features" className="lp-nav-link cursor-pointer">Features</a>
        <a href="#about" className="lp-nav-link cursor-pointer">About</a>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/login" className="lp-nav-signin hidden sm:block text-sm font-medium px-4 py-2 rounded-lg cursor-pointer">
          Sign in
        </Link>
        <Link
          href="/register"
          className="lp-btn-primary text-sm font-semibold px-4 py-2 rounded-lg cursor-pointer"
        >
          Get started
        </Link>
      </div>
    </nav>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-28 pb-20"
      style={{ background: 'var(--bg)' }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(168,85,247,0.15) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      {/* Badge */}
      <div
        className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full mb-8"
        style={{
          background: 'rgba(168,85,247,0.12)',
          border: '1px solid rgba(168,85,247,0.3)',
          color: '#c084fc',
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#a855f7' }} aria-hidden="true" />
        South Africa · Melisizwe Programme · Est. 2024
      </div>

      {/* Headline */}
      <h1
        className="max-w-4xl text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6"
        style={{ color: '#e8e6f0', letterSpacing: '-0.02em' }}
      >
        Empowering the Next{' '}
        <span style={gradientTextStyle}>Generation</span>{' '}
        of STEM Leaders
      </h1>

      {/* Subheading */}
      <p className="max-w-2xl text-base sm:text-lg mb-12 leading-relaxed" style={{ color: '#9996aa' }}>
        A comprehensive recruitment and learning management platform for the
        Melisizwe Girls in STEM programme — connecting administrators, instructors,
        students, and sponsors across South Africa.
      </p>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-20">
        <Link href="/register" className="lp-btn-primary flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-base cursor-pointer">
          Get started free
          <IconArrowRight />
        </Link>
        <Link href="/login" className="lp-btn-secondary px-8 py-4 rounded-xl font-semibold text-base cursor-pointer">
          Sign in to platform
        </Link>
      </div>

      {/* Stats bar */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden w-full max-w-3xl"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center justify-center py-6 px-4"
            style={{ background: 'rgba(10,10,15,0.8)' }}
          >
            <span className="text-3xl md:text-4xl font-bold mb-1" style={purplePinkGradient}>{stat.value}</span>
            <span className="text-xs font-medium" style={{ color: '#9996aa' }}>{stat.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Portals ──────────────────────────────────────────────────────────────────

function PortalsSection() {
  return (
    <section id="portals" className="py-24 px-6" style={{ background: 'var(--bg2)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#a855f7' }}>
            Access Portals
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#e8e6f0', letterSpacing: '-0.02em' }}>
            One platform, four tailored experiences
          </h2>
          <p className="text-base max-w-xl mx-auto" style={{ color: '#9996aa', lineHeight: '1.7' }}>
            Every stakeholder has a purpose-built portal designed for their specific role in the Girls in STEM programme.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {portals.map((portal) => (
            <div key={portal.title} className="lp-portal-card rounded-2xl overflow-hidden cursor-pointer">
              {/* Top colour band */}
              <div className="h-1.5 w-full" style={{ background: portal.topBar }} aria-hidden="true" />

              <div className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: portal.gradient, color: 'white' }}
                  >
                    {portal.icon}
                  </div>
                  <span
                    className="text-xs font-semibold px-3 py-1 rounded-full"
                    style={{
                      background: 'rgba(255,255,255,0.07)',
                      color: '#9996aa',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    {portal.badge}
                  </span>
                </div>

                <h3 className="text-xl font-bold mb-3" style={{ color: '#e8e6f0' }}>{portal.title}</h3>
                <p className="text-sm mb-6 leading-relaxed" style={{ color: '#9996aa' }}>{portal.description}</p>

                <ul className="space-y-2 mb-8">
                  {portal.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2.5 text-sm" style={{ color: '#9996aa' }}>
                      <span
                        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7' }}
                      >
                        <IconCheck />
                      </span>
                      {feat}
                    </li>
                  ))}
                </ul>

                <Link
                  href={portal.href}
                  className="lp-portal-cta flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-white cursor-pointer"
                  style={{ background: portal.gradient }}
                >
                  {portal.cta}
                  <IconArrowRight />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Features ─────────────────────────────────────────────────────────────────

function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-6" style={{ background: 'var(--bg)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#a855f7' }}>
            Platform Features
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#e8e6f0', letterSpacing: '-0.02em' }}>
            Everything you need to run a world-class STEM programme
          </h2>
          <p className="text-base max-w-xl mx-auto" style={{ color: '#9996aa', lineHeight: '1.7' }}>
            From application to graduation — every workflow is handled, automated, and tracked in one place.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat) => (
            <div key={feat.title} className="lp-feature-card rounded-2xl p-6">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7' }}
              >
                {feat.icon}
              </div>
              <h3 className="font-semibold mb-2 text-base" style={{ color: '#e8e6f0' }}>{feat.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#9996aa' }}>{feat.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── About ────────────────────────────────────────────────────────────────────

function AboutSection() {
  return (
    <section id="about" className="py-24 px-6" style={{ background: 'var(--bg2)' }}>
      <div className="max-w-4xl mx-auto">
        <div
          className="rounded-3xl p-10 md:p-16 text-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(236,72,153,0.10) 100%)',
            border: '1px solid rgba(168,85,247,0.25)',
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(168,85,247,0.12) 0%, transparent 70%)' }}
            aria-hidden="true"
          />

          <div
            className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full mb-8"
            style={{
              background: 'rgba(168,85,247,0.15)',
              border: '1px solid rgba(168,85,247,0.3)',
              color: '#c084fc',
            }}
          >
            About the Programme
          </div>

          <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: '#e8e6f0', letterSpacing: '-0.02em' }}>
            Bridging the gender gap in{' '}
            <span style={purplePinkGradient}>African STEM</span>
          </h2>

          <p className="text-base leading-relaxed mb-10 max-w-2xl mx-auto" style={{ color: '#9996aa' }}>
            The Melisizwe Girls in STEM programme identifies and supports talented young women across
            South Africa, providing access to world-class STEM education, mentorship, and opportunities
            that would otherwise be out of reach.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { label: 'Founded', value: '2024' },
              { label: 'Provinces', value: '3+' },
              { label: 'Acceptance Rate', value: '<30%' },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className="text-2xl font-bold mb-1" style={purplePinkGradient}>{item.value}</div>
                <div className="text-sm" style={{ color: '#9996aa' }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function CTASection() {
  return (
    <section className="py-24 px-6" style={{ background: 'var(--bg)' }}>
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: '#e8e6f0', letterSpacing: '-0.02em' }}>
          Ready to be part of something bigger?
        </h2>
        <p className="text-base mb-10 leading-relaxed" style={{ color: '#9996aa' }}>
          Whether you&apos;re a learner with a dream, an educator with a mission, or a sponsor with the
          means to make a difference — your place in the Melisizwe Girls in STEM programme starts here.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/register" className="lp-btn-primary flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-base cursor-pointer">
            Register now
            <IconArrowRight />
          </Link>
          <Link href="/login" className="lp-btn-secondary px-8 py-4 rounded-xl font-semibold text-base cursor-pointer">
            Sign in
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="py-12 px-6" style={{ background: 'var(--bg2)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}
              >
                <LogoIcon />
              </div>
              <span className="font-bold text-sm" style={{ color: '#e8e6f0' }}>Girls in STEM</span>
            </div>
            <p className="text-sm leading-relaxed mb-4" style={{ color: '#9996aa', maxWidth: '280px' }}>
              Empowering South African girls to lead the future of science, technology, engineering, and mathematics.
            </p>
            <p className="text-xs" style={{ color: '#5a5870' }}>Melisizwe Programme · South Africa</p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#e8e6f0' }}>Platform</h4>
            <ul className="space-y-3">
              {[
                { label: 'Admin Portal', href: '/login' },
                { label: 'Instructor Portal', href: '/login' },
                { label: 'Student Portal', href: '/register' },
                { label: 'Sponsor Portal', href: '/login' },
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="lp-footer-link text-sm cursor-pointer">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Programme */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#e8e6f0' }}>Programme</h4>
            <ul className="space-y-3">
              {[
                { label: 'Apply', href: '/register' },
                { label: 'Sign In', href: '/login' },
                { label: 'FAQ', href: '#' },
                { label: 'Contact', href: '#' },
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="lp-footer-link text-sm cursor-pointer">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-xs" style={{ color: '#5a5870' }}>
            © {new Date().getFullYear()} Melisizwe Girls in STEM Programme. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="#" className="lp-footer-legal text-xs cursor-pointer">Privacy</Link>
            <Link href="#" className="lp-footer-legal text-xs cursor-pointer">Terms</Link>
            <Link href="#" className="lp-footer-legal text-xs cursor-pointer">POPIA</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <HeroSection />
      <PortalsSection />
      <FeaturesSection />
      <AboutSection />
      <CTASection />
      <Footer />
    </>
  )
}

import Link from 'next/link';

const DARK_BG = 'linear-gradient(160deg, #0F0820 0%, #1C0B38 50%, #2D1B4E 100%)';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section style={{ marginBottom: '2rem' }}>
    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#C4B5FD', marginBottom: '0.75rem' }}>{title}</h2>
    <div style={{ color: 'rgba(240,238,255,0.75)', fontSize: '0.9rem', lineHeight: 1.75 }}>{children}</div>
  </section>
);

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: DARK_BG, fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        <Link href="/register" style={{ color: '#A78BFA', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-block', marginBottom: '1.5rem' }}>
          ← Back to registration
        </Link>

        <div style={{ marginBottom: '2.5rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(196,181,253,0.6)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Melisizwe Girls in STEM
          </p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>Terms of Service</h1>
          <p style={{ fontSize: '0.8rem', color: 'rgba(240,238,255,0.4)' }}>Last updated: June 2026 · Effective immediately</p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '2rem' }}>

          <Section title="1. Acceptance">
            <p>
              By creating an account on the Melisizwe Girls in STEM platform, you agree to these Terms of Service.
              If you are registering on behalf of a learner under 18, you confirm that you are a parent or legal guardian
              with authority to accept these terms on their behalf.
            </p>
          </Section>

          <Section title="2. Who may use this platform">
            <p>This platform is intended for:</p>
            <ul style={{ marginTop: '0.75rem', paddingLeft: '1.25rem', listStyle: 'disc' }}>
              <li style={{ marginBottom: '0.4rem' }}>Learners enrolled in the Melisizwe Girls in STEM programme</li>
              <li style={{ marginBottom: '0.4rem' }}>Instructors, mentors, and facilitators engaged by the Organisation</li>
              <li style={{ marginBottom: '0.4rem' }}>Parents and guardians of enrolled learners</li>
              <li style={{ marginBottom: '0.4rem' }}>Programme sponsors authorised by the Organisation</li>
              <li style={{ marginBottom: '0.4rem' }}>Organisation staff and administrators</li>
            </ul>
            <p style={{ marginTop: '0.75rem' }}>
              Access is by invitation or approval only. Unauthorised access is prohibited.
            </p>
          </Section>

          <Section title="3. Acceptable use">
            <p>You agree to use the platform only for its intended purpose. You must not:</p>
            <ul style={{ marginTop: '0.75rem', paddingLeft: '1.25rem', listStyle: 'disc' }}>
              <li style={{ marginBottom: '0.4rem' }}>Share your login credentials with any other person</li>
              <li style={{ marginBottom: '0.4rem' }}>Access any account or data that does not belong to you</li>
              <li style={{ marginBottom: '0.4rem' }}>Upload, share, or submit any content that is offensive, harmful, or illegal</li>
              <li style={{ marginBottom: '0.4rem' }}>Attempt to circumvent security controls or exploit vulnerabilities</li>
              <li style={{ marginBottom: '0.4rem' }}>Use the platform to send unsolicited communications</li>
              <li style={{ marginBottom: '0.4rem' }}>Reproduce or distribute programme materials without written consent</li>
            </ul>
          </Section>

          <Section title="4. Learner data and privacy">
            <p>
              All personal information is handled in accordance with our{' '}
              <Link href="/privacy" style={{ color: '#A78BFA', textDecoration: 'none' }}>Privacy Notice</Link>{' '}
              and South Africa&apos;s Protection of Personal Information Act (POPIA). Academic and wellbeing
              data recorded on this platform is used solely for programme administration and learner support.
            </p>
          </Section>

          <Section title="5. Intellectual property">
            <p>
              All content on this platform — including curriculum materials, assessments, reports, and certificates —
              is the property of the Melisizwe Organisation. You may not reproduce, distribute, or commercialise any
              content without prior written permission.
            </p>
            <p style={{ marginTop: '0.75rem' }}>
              Learner-submitted project work remains the intellectual property of the learner.
            </p>
          </Section>

          <Section title="6. WhatsApp communications">
            <p>
              If you provide a WhatsApp number and opt in to WhatsApp notifications, you consent to receiving
              programme-related messages (absence alerts, progress summaries, re-engagement messages) via WhatsApp.
              You may withdraw this consent at any time by updating your profile or contacting{' '}
              <strong style={{ color: '#C4B5FD' }}>aldrid@melisizwe.co.za</strong>.
            </p>
          </Section>

          <Section title="7. Certificates">
            <p>
              Certificates issued through this platform are authentic and verifiable via the public verification page.
              Any attempt to forge, alter, or misrepresent a certificate constitutes fraud and may be reported to the
              relevant authorities.
            </p>
          </Section>

          <Section title="8. Termination">
            <p>
              We reserve the right to suspend or terminate access to the platform for any user who violates these Terms,
              engages in misconduct, or is no longer associated with the programme. Learners who withdraw or are
              removed from the programme will have their accounts deactivated.
            </p>
          </Section>

          <Section title="9. Limitation of liability">
            <p>
              The platform is provided &ldquo;as is&rdquo; for programme management purposes. The Organisation is not
              liable for any loss or damage arising from platform downtime, data errors, or technical failures, except
              where required by applicable law.
            </p>
          </Section>

          <Section title="10. Governing law">
            <p>
              These Terms are governed by the laws of the Republic of South Africa. Any disputes will be subject to
              the jurisdiction of the South African courts.
            </p>
          </Section>

          <Section title="11. Contact">
            <p>
              For questions about these Terms, contact us at{' '}
              <strong style={{ color: '#C4B5FD' }}>aldrid@melisizwe.co.za</strong>.
            </p>
          </Section>

        </div>

        <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.8rem', color: 'rgba(240,238,255,0.3)' }}>
          Melisizwe Girls in STEM · South Africa ·{' '}
          <Link href="/privacy" style={{ color: '#A78BFA', textDecoration: 'none' }}>Privacy Notice</Link>
        </p>
      </div>
    </div>
  );
}

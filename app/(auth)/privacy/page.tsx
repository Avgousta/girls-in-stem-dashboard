import Link from 'next/link';

const DARK_BG = 'linear-gradient(160deg, #0F0820 0%, #1C0B38 50%, #2D1B4E 100%)';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section style={{ marginBottom: '2rem' }}>
    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#C4B5FD', marginBottom: '0.75rem' }}>{title}</h2>
    <div style={{ color: 'rgba(240,238,255,0.75)', fontSize: '0.9rem', lineHeight: 1.75 }}>{children}</div>
  </section>
);

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: DARK_BG, fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Back link */}
        <Link href="/register" style={{ color: '#A78BFA', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-block', marginBottom: '1.5rem' }}>
          ← Back to registration
        </Link>

        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(196,181,253,0.6)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Melisizwe Girls in STEM
          </p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>Privacy Notice</h1>
          <p style={{ fontSize: '0.8rem', color: 'rgba(240,238,255,0.4)' }}>Last updated: June 2026 · Effective immediately</p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '2rem' }}>

          <Section title="1. Who we are">
            <p>
              The <strong style={{ color: '#e2e8f0' }}>Melisizwe Girls in STEM Programme</strong> is operated by Melisizwe
              (the &ldquo;Organisation&rdquo;). We are the Responsible Party under the Protection of Personal Information
              Act 4 of 2013 (<strong style={{ color: '#e2e8f0' }}>POPIA</strong>) for all personal information processed
              through this platform.
            </p>
            <p style={{ marginTop: '0.75rem' }}>
              <strong style={{ color: '#e2e8f0' }}>Information Officer:</strong> Aldrid McAnda<br />
              <strong style={{ color: '#e2e8f0' }}>Contact:</strong> aldrid@melisizwe.co.za
            </p>
          </Section>

          <Section title="2. What personal information we collect">
            <p>We collect and process the following categories of personal information:</p>
            <ul style={{ marginTop: '0.75rem', paddingLeft: '1.25rem', listStyle: 'disc' }}>
              <li style={{ marginBottom: '0.4rem' }}><strong style={{ color: '#e2e8f0' }}>Learner information:</strong> full name, age/grade, school, email address, phone number, learner code, parent/guardian name and contact details</li>
              <li style={{ marginBottom: '0.4rem' }}><strong style={{ color: '#e2e8f0' }}>Academic data:</strong> assessment scores, attendance records, project submissions, mentorship session notes</li>
              <li style={{ marginBottom: '0.4rem' }}><strong style={{ color: '#e2e8f0' }}>Wellbeing data:</strong> weekly pulse check-ins (anonymous ratings), barrier flags, re-engagement records</li>
              <li style={{ marginBottom: '0.4rem' }}><strong style={{ color: '#e2e8f0' }}>Contact preferences:</strong> WhatsApp number and opt-in status (only if you voluntarily provide it)</li>
              <li style={{ marginBottom: '0.4rem' }}><strong style={{ color: '#e2e8f0' }}>Instructor/staff information:</strong> full name, email, school affiliation, role</li>
              <li style={{ marginBottom: '0.4rem' }}><strong style={{ color: '#e2e8f0' }}>Usage data:</strong> login timestamps, pages visited (no third-party analytics trackers are used)</li>
            </ul>
          </Section>

          <Section title="3. Why we collect your information (purpose)">
            <p>We collect and process personal information only for the following specific purposes:</p>
            <ul style={{ marginTop: '0.75rem', paddingLeft: '1.25rem', listStyle: 'disc' }}>
              <li style={{ marginBottom: '0.4rem' }}>Administering and running the Girls in STEM programme</li>
              <li style={{ marginBottom: '0.4rem' }}>Tracking learner academic progress and identifying learners who may need additional support</li>
              <li style={{ marginBottom: '0.4rem' }}>Communicating programme updates, attendance alerts, and progress reports to learners, parents, and instructors</li>
              <li style={{ marginBottom: '0.4rem' }}>Generating anonymised impact reports for programme funders and sponsors</li>
              <li style={{ marginBottom: '0.4rem' }}>Issuing certificates of achievement</li>
              <li style={{ marginBottom: '0.4rem' }}>Complying with legal and regulatory obligations</li>
            </ul>
            <p style={{ marginTop: '0.75rem' }}>
              We do not use personal information for marketing, advertising, or any purpose not listed above.
            </p>
          </Section>

          <Section title="4. Children's information">
            <p>
              Many of our learners are under 18 years of age. Under POPIA, we may only process a child&apos;s personal
              information with the <strong style={{ color: '#e2e8f0' }}>consent of a competent person</strong> (a parent
              or legal guardian). By registering a learner under 18, the parent or guardian confirms they have reviewed
              this Privacy Notice and consent to their child&apos;s information being processed for programme purposes.
            </p>
            <p style={{ marginTop: '0.75rem' }}>
              We do not knowingly collect information from children for any purpose beyond programme administration,
              and we do not share children&apos;s personal information with any third party except as described in
              Section 5.
            </p>
          </Section>

          <Section title="5. Who we share your information with">
            <p>We share personal information only with the following parties, and only to the extent necessary:</p>
            <ul style={{ marginTop: '0.75rem', paddingLeft: '1.25rem', listStyle: 'disc' }}>
              <li style={{ marginBottom: '0.4rem' }}><strong style={{ color: '#e2e8f0' }}>Supabase (Ireland/EU):</strong> our database and authentication provider — stores all personal data securely with encryption at rest and in transit</li>
              <li style={{ marginBottom: '0.4rem' }}><strong style={{ color: '#e2e8f0' }}>Vercel (USA):</strong> our hosting provider — processes request data to serve the platform</li>
              <li style={{ marginBottom: '0.4rem' }}><strong style={{ color: '#e2e8f0' }}>Resend (USA):</strong> our email delivery provider — receives email addresses and message content to send programme communications</li>
              <li style={{ marginBottom: '0.4rem' }}><strong style={{ color: '#e2e8f0' }}>Twilio (USA):</strong> our WhatsApp messaging provider — receives WhatsApp numbers and message content only for opted-in users</li>
              <li style={{ marginBottom: '0.4rem' }}><strong style={{ color: '#e2e8f0' }}>Programme sponsors:</strong> receive anonymised, aggregated impact reports only — no individual learner names or contact details are shared</li>
            </ul>
            <p style={{ marginTop: '0.75rem' }}>
              We do not sell personal information. We do not share personal information with schools, government bodies,
              or any other third party without your explicit consent, except where required by law.
            </p>
          </Section>

          <Section title="6. How long we keep your information">
            <ul style={{ paddingLeft: '1.25rem', listStyle: 'disc' }}>
              <li style={{ marginBottom: '0.4rem' }}>Active learner records: retained for the duration of programme participation plus 3 years</li>
              <li style={{ marginBottom: '0.4rem' }}>Alumni records: retained for up to 5 years post-graduation for longitudinal impact tracking</li>
              <li style={{ marginBottom: '0.4rem' }}>Assessment and attendance data: retained for 3 years after programme completion</li>
              <li style={{ marginBottom: '0.4rem' }}>WhatsApp opt-in consent records: retained for 5 years</li>
              <li style={{ marginBottom: '0.4rem' }}>Account credentials: deleted within 30 days of a verified deletion request</li>
            </ul>
          </Section>

          <Section title="7. Your rights under POPIA">
            <p>As a data subject, you have the following rights:</p>
            <ul style={{ marginTop: '0.75rem', paddingLeft: '1.25rem', listStyle: 'disc' }}>
              <li style={{ marginBottom: '0.4rem' }}><strong style={{ color: '#e2e8f0' }}>Right to access:</strong> request a copy of the personal information we hold about you</li>
              <li style={{ marginBottom: '0.4rem' }}><strong style={{ color: '#e2e8f0' }}>Right to correction:</strong> request that inaccurate or incomplete information be corrected</li>
              <li style={{ marginBottom: '0.4rem' }}><strong style={{ color: '#e2e8f0' }}>Right to deletion:</strong> request that your personal information be deleted (subject to legal retention obligations)</li>
              <li style={{ marginBottom: '0.4rem' }}><strong style={{ color: '#e2e8f0' }}>Right to object:</strong> object to the processing of your personal information</li>
              <li style={{ marginBottom: '0.4rem' }}><strong style={{ color: '#e2e8f0' }}>Right to withdraw consent:</strong> withdraw consent at any time (this does not affect processing already carried out)</li>
            </ul>
            <p style={{ marginTop: '0.75rem' }}>
              To exercise any of these rights, email our Information Officer at{' '}
              <strong style={{ color: '#C4B5FD' }}>aldrid@melisizwe.co.za</strong>. We will respond within 30 days.
            </p>
          </Section>

          <Section title="8. Security">
            <p>
              We implement appropriate technical and organisational measures to protect personal information, including:
              row-level security on all database tables, encrypted connections (TLS), password hashing, session-based
              authentication, and access controls based on user roles. Staff access to personal information is limited
              to what is necessary for their role.
            </p>
            <p style={{ marginTop: '0.75rem' }}>
              In the event of a data breach that poses a risk to data subjects, we will notify the{' '}
              <strong style={{ color: '#e2e8f0' }}>Information Regulator of South Africa</strong> and affected
              individuals within 72 hours of becoming aware of the breach.
            </p>
          </Section>

          <Section title="9. Complaints">
            <p>
              If you believe we have handled your personal information incorrectly, you may lodge a complaint with the
              Information Regulator of South Africa:
            </p>
            <p style={{ marginTop: '0.75rem' }}>
              <strong style={{ color: '#e2e8f0' }}>Information Regulator (South Africa)</strong><br />
              Website: <span style={{ color: '#C4B5FD' }}>inforegulator.org.za</span><br />
              Email: inforeg@justice.gov.za<br />
              Tel: 010 023 5207
            </p>
          </Section>

          <Section title="10. Changes to this notice">
            <p>
              We may update this Privacy Notice from time to time. Material changes will be communicated to registered
              users via email before they take effect. The date at the top of this page reflects the most recent revision.
            </p>
          </Section>

        </div>

        <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.8rem', color: 'rgba(240,238,255,0.3)' }}>
          Melisizwe Girls in STEM · South Africa · <Link href="/terms" style={{ color: '#A78BFA', textDecoration: 'none' }}>Terms of Service</Link>
        </p>
      </div>
    </div>
  );
}

import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { CheckCircle2, XCircle, GraduationCap, ExternalLink } from 'lucide-react';

interface Props { params: Promise<{ code: string }> }

type CertRow = {
  certificate_id: string; cert_type: string; issued_at: string; verification_code: string;
  learners: { learner_code: string; learner_profiles: { first_name: string; last_name: string } | null; schools: { school_name: string } | null } | null;
  programs: { program_name: string } | null;
};

const CERT_TITLES: Record<string, string> = {
  completion:    'Certificate of Completion',
  achievement:   'Certificate of Achievement',
  participation: 'Certificate of Participation',
};

export default async function VerifyCertificatePage({ params }: Props) {
  const { code }   = await params;
  const supabase   = await createClient();

  const { data, error } = await supabase
    .from('certificates')
    .select(`
      certificate_id, cert_type, issued_at, verification_code,
      learners!inner(
        learner_code,
        learner_profiles(first_name, last_name),
        schools(school_name)
      ),
      programs(program_name)
    `)
    .eq('verification_code', code.toUpperCase())
    .single();

  const cert = error ? null : (data as unknown as CertRow);

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', fontFamily: 'system-ui, sans-serif' }}>

      {/* Branding */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <GraduationCap style={{ width: 20, height: 20, color: '#fff' }} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1D4ED8' }}>Melisizwe</p>
          <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>Girls in STEM Programme</p>
        </div>
      </div>

      {cert ? (
        <div style={{ background: '#fff', borderRadius: 16, padding: '40px 48px', maxWidth: 480, width: '100%', textAlign: 'center', border: '1px solid #e2e8f0', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <CheckCircle2 style={{ width: 48, height: 48, color: '#059669', margin: '0 auto 16px' }} />
          <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#059669' }}>
            Verified ✓
          </p>
          <h1 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 800, color: '#1e293b' }}>
            {CERT_TITLES[cert.cert_type] ?? 'Certificate'}
          </h1>

          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '20px', marginBottom: 24, textAlign: 'left' }}>
            {[
              { label: 'Recipient',   value: `${cert.learners?.learner_profiles?.first_name ?? ''} ${cert.learners?.learner_profiles?.last_name ?? ''}`.trim() },
              { label: 'School',      value: cert.learners?.schools?.school_name ?? '—' },
              { label: 'Programme',   value: cert.programs?.program_name ?? 'Girls in STEM' },
              { label: 'Issued',      value: fmt(cert.issued_at) },
              { label: 'Certificate', value: cert.verification_code },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0', gap: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', textAlign: 'right' }}>{value}</span>
              </div>
            ))}
          </div>

          <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
            This certificate was issued by the Melisizwe Girls in STEM Programme and its authenticity has been verified.
          </p>

          <a href={`/api/v1/reports/certificate/${cert.certificate_id}`} target="_blank" rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1D4ED8', color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            View Certificate <ExternalLink style={{ width: 14, height: 14 }} />
          </a>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 16, padding: '40px 48px', maxWidth: 420, width: '100%', textAlign: 'center', border: '1px solid #fecaca', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <XCircle style={{ width: 48, height: 48, color: '#dc2626', margin: '0 auto 16px' }} />
          <h1 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 800, color: '#1e293b' }}>
            Certificate Not Found
          </h1>
          <p style={{ margin: '0 0 8px', fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
            The verification code <strong style={{ fontFamily: 'monospace', color: '#1e293b' }}>{code.toUpperCase()}</strong> does not match any certificate in our records.
          </p>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
            Please check the code and try again, or contact the programme coordinator.
          </p>
        </div>
      )}

      <p style={{ marginTop: 32, fontSize: 11, color: '#94a3b8' }}>
        © Melisizwe Girls in STEM · <Link href="/" style={{ color: '#1D4ED8', textDecoration: 'none' }}>Platform Home</Link>
      </p>
    </div>
  );
}

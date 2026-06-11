export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface Params { params: Promise<{ id: string }> }

const CERT_TITLES: Record<string, string> = {
  completion:    'Certificate of Completion',
  achievement:   'Certificate of Achievement',
  participation: 'Certificate of Participation',
};

const CERT_BODY: Record<string, string> = {
  completion:    'has successfully completed the',
  achievement:   'has demonstrated outstanding achievement in the',
  participation: 'has actively participated in the',
};

export async function GET(_: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { id }   = await params;

  const { data: cert, error } = await supabase
    .from('certificates')
    .select(`
      certificate_id, cert_type, issued_at, verification_code, notes,
      learners!inner(
        learner_code,
        learner_profiles(first_name, last_name),
        schools(school_name)
      ),
      programs(program_name),
      issued_by_user:users!issued_by(full_name)
    `)
    .eq('certificate_id', id)
    .single();

  if (error || !cert) {
    return new NextResponse('Certificate not found', { status: 404 });
  }

  type CertRow = {
    certificate_id: string; cert_type: string; issued_at: string; verification_code: string; notes: string | null;
    learners: { learner_code: string; learner_profiles: { first_name: string; last_name: string } | null; schools: { school_name: string } | null } | null;
    programs: { program_name: string } | null;
    issued_by_user: { full_name: string } | null;
  };
  const c = cert as unknown as CertRow;

  const learnerName = `${c.learners?.learner_profiles?.first_name ?? ''} ${c.learners?.learner_profiles?.last_name ?? ''}`.trim();
  const school      = c.learners?.schools?.school_name ?? '';
  const programme   = c.programs?.program_name ?? 'Girls in STEM Programme';
  const title       = CERT_TITLES[c.cert_type]  ?? CERT_TITLES.completion;
  const body        = CERT_BODY[c.cert_type]     ?? CERT_BODY.completion;
  const issuedDate  = new Date(c.issued_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
  const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title} — ${learnerName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #f1f5f9; font-family: 'Georgia', 'Times New Roman', serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 32px 16px; }
    .cert { background: #fff; width: 100%; max-width: 720px; border: 2px solid #1D4ED8; border-radius: 4px; padding: 64px 72px; text-align: center; position: relative; }
    .cert::before { content: ''; position: absolute; inset: 8px; border: 1px solid rgba(29,78,216,0.25); border-radius: 2px; pointer-events: none; }
    .logo { font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #1D4ED8; margin-bottom: 32px; font-family: system-ui, sans-serif; }
    .title { font-size: 30px; font-weight: 400; color: #1e293b; letter-spacing: 0.02em; margin-bottom: 24px; }
    .this-is { font-size: 13px; color: #64748b; letter-spacing: 0.08em; text-transform: uppercase; font-family: system-ui, sans-serif; margin-bottom: 12px; }
    .name { font-size: 42px; color: #1D4ED8; font-weight: 700; margin-bottom: 8px; font-family: 'Georgia', serif; }
    .school { font-size: 14px; color: #64748b; font-family: system-ui, sans-serif; margin-bottom: 28px; }
    .body { font-size: 16px; color: #475569; line-height: 1.7; font-family: system-ui, sans-serif; margin-bottom: 6px; }
    .programme { font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 32px; }
    .divider { width: 80px; height: 2px; background: #1D4ED8; margin: 0 auto 32px; }
    .date { font-size: 13px; color: #64748b; font-family: system-ui, sans-serif; margin-bottom: 32px; }
    .verify { font-size: 11px; color: #94a3b8; font-family: system-ui, sans-serif; margin-top: 40px; }
    .code { font-size: 13px; font-weight: 700; color: #1D4ED8; letter-spacing: 0.15em; font-family: 'Courier New', monospace; }
    .no-print { font-family: system-ui, sans-serif; }
    @media print {
      body { background: #fff; padding: 0; }
      .no-print { display: none !important; }
      .cert { border: 2px solid #1D4ED8 !important; box-shadow: none !important; page-break-inside: avoid; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:right;width:100%;max-width:720px;margin-bottom:16px;">
    <button onclick="window.print()" style="background:#1D4ED8;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:system-ui,sans-serif;">
      ↓ Save / Print PDF
    </button>
  </div>

  <div class="cert">
    <!-- Header -->
    <div class="logo">Melisizwe Girls in STEM Programme</div>
    <div class="title">${title}</div>

    <!-- Recipient -->
    <div class="this-is">This is to certify that</div>
    <div class="name">${learnerName}</div>
    <div class="school">${school}</div>

    <!-- Body -->
    <div class="body">${body}</div>
    <div class="programme">${programme}</div>

    <div class="divider"></div>

    <div class="date">Issued ${issuedDate}</div>

    <!-- Signature area -->
    <div style="display:flex;justify-content:space-around;margin-top:8px;padding-top:24px;border-top:1px solid #e2e8f0;">
      <div style="text-align:center;">
        <div style="width:120px;border-bottom:1px solid #94a3b8;margin:0 auto 6px;"></div>
        <p style="font-size:11px;color:#94a3b8;font-family:system-ui,sans-serif;">Programme Director</p>
        <p style="font-size:11px;color:#94a3b8;font-family:system-ui,sans-serif;">Melisizwe</p>
      </div>
      ${c.notes ? `<div style="text-align:center;max-width:240px;">
        <p style="font-size:12px;color:#64748b;font-style:italic;font-family:system-ui,sans-serif;">"${c.notes}"</p>
      </div>` : ''}
    </div>

    <!-- Verification -->
    <div class="verify">
      <p>Verification Code: <span class="code">${c.verification_code}</span></p>
      <p style="margin-top:4px;">Verify authenticity at <a href="${appUrl}/verify/${c.verification_code}" style="color:#1D4ED8;">${appUrl}/verify/${c.verification_code}</a></p>
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

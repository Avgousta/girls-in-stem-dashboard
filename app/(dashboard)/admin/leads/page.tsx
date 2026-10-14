import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Handshake, Download, ExternalLink } from 'lucide-react';
import { DS } from '@/components/platform/tokens';
import type { LeadRow } from '@/lib/connect';
import LeadRegister from './LeadRegister';

export const dynamic = 'force-dynamic';

export default async function ConferenceLeadsPage() {
  await requireAuth(['admin']);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('conference_leads')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold" style={{ color: DS.text }}>
            <Handshake className="h-6 w-6" style={{ color: DS.primary }} /> Conference Leads
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: DS.textMuted }}>
            Enquiries from the SSOW Amsterdam 2026 QR code · restricted to admins
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/connect" target="_blank" className="btn-secondary flex items-center gap-2">
            <ExternalLink className="h-4 w-4" /> Landing page
          </a>
          <a href="/api/v1/connect/leads/export" className="btn-primary flex items-center gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </a>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl p-4 text-sm" style={{ background: DS.dangerLight, color: DS.danger }}>
          Could not load leads: {error.message}. Has migration 027_conference_leads.sql been applied?
        </div>
      ) : (
        <LeadRegister initialLeads={(data ?? []) as LeadRow[]} />
      )}
    </div>
  );
}

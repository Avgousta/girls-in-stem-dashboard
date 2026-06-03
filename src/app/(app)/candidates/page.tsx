import { getCandidates } from '@/lib/server-data'
import { PageHeader } from '@/components/ui'
import { CandidatesTable } from '@/components/CandidatesTable'

export const revalidate = 30

export default async function CandidatesPage() {
  const candidates = await getCandidates()

  return (
    <div>
      <PageHeader
        title="All Candidates"
        subtitle={`${candidates.length} candidates — 2025 cohort`}
        actions={
          <a
            href="/apply"
            className="text-xs font-medium px-3 py-2 rounded-lg"
            style={{
              background: 'linear-gradient(135deg, #7c6ef5, #c084fc)',
              color: '#fff',
            }}
          >
            + New Application
          </a>
        }
      />
      <CandidatesTable candidates={candidates} />
    </div>
  )
}

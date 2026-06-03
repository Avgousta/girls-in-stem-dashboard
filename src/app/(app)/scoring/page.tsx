import { PageHeader } from '@/components/ui'
import { ScoringCalculator } from '@/components/ScoringCalculator'

export default function ScoringPage() {
  return (
    <div>
      <PageHeader
        title="Scoring Engine"
        subtitle="Live composite score calculator and weighting framework"
      />
      <ScoringCalculator />
    </div>
  )
}

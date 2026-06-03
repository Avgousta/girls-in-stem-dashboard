import { PageHeader } from '@/components/ui'
import { ApplicationForm } from '@/components/ApplicationForm'

export default function ApplyPage() {
  return (
    <div>
      <PageHeader
        title="New Application"
        subtitle="Girls in STEM 2025 — Add a candidate or share the form link with schools"
      />
      <ApplicationForm />
    </div>
  )
}

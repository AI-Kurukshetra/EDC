import { EmptyState } from '@/components/data-display/EmptyState'

type StudyAuditPageProps = Record<string, never>

/** Reserves the study-specific audit trail workspace for future implementation. */
export default function StudyAuditPage(_props: StudyAuditPageProps) {
  return (
    <EmptyState
      title="Audit trail route ready"
      description="Audit log search, filtering, diff rendering, and export workflows will live here."
    />
  )
}

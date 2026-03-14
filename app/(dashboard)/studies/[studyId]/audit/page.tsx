import { StudyAuditWorkspace } from '@/components/studies/study-audit-workspace'
import { getStudyAuditWorkspace } from '@/lib/queries/study-operations'

type StudyAuditPageProps = {
  params: Promise<{ studyId: string }>
}

/** Renders the study-scoped audit trail available for oversight review. */
export default async function StudyAuditPage({ params }: StudyAuditPageProps) {
  const { studyId } = await params
  const events = await getStudyAuditWorkspace(studyId)

  return <StudyAuditWorkspace events={events} />
}

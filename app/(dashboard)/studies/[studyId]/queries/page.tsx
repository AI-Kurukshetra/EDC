import { StudyQueriesWorkspace } from '@/components/studies/study-queries-workspace'
import { getStudyQueriesWorkspace } from '@/lib/queries/study-operations'

type StudyQueriesPageProps = {
  params: Promise<{ studyId: string }>
}

/** Renders the study-level query queue with current ownership and response state. */
export default async function StudyQueriesPage({ params }: StudyQueriesPageProps) {
  const { studyId } = await params
  const workspace = await getStudyQueriesWorkspace(studyId)

  return <StudyQueriesWorkspace workspace={workspace} />
}

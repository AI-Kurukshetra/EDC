import { StudyDocumentsWorkspace } from '@/components/studies/study-documents-workspace'
import { getStudyDocumentsWorkspace } from '@/lib/queries/study-operations'

type StudyDocumentsPageProps = {
  params: Promise<{ studyId: string }>
}

/** Renders the study-scoped document register and signature readiness view. */
export default async function StudyDocumentsPage({ params }: StudyDocumentsPageProps) {
  const { studyId } = await params
  const workspace = await getStudyDocumentsWorkspace(studyId)

  return <StudyDocumentsWorkspace workspace={workspace} />
}

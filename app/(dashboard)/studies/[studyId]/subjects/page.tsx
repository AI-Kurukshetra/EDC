import { StudySubjectsWorkspace } from '@/components/studies/study-subjects-workspace'
import { getStudySubjectsWorkspace } from '@/lib/queries/study-operations'

type StudySubjectsPageProps = {
  params: Promise<{ studyId: string }>
}

/** Renders the study subject roster and data-capture summary view. */
export default async function StudySubjectsPage({ params }: StudySubjectsPageProps) {
  const { studyId } = await params
  const subjects = await getStudySubjectsWorkspace(studyId)

  return <StudySubjectsWorkspace subjects={subjects} />
}

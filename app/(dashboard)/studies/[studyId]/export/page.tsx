import { StudyExportWorkspace } from '@/components/studies/study-export-workspace'
import { getStudyExportWorkspace } from '@/lib/queries/study-operations'

type StudyExportPageProps = {
  params: Promise<{ studyId: string }>
}

/** Renders the study export console and recent export history. */
export default async function StudyExportPage({ params }: StudyExportPageProps) {
  const { studyId } = await params
  const workspace = await getStudyExportWorkspace(studyId)

  return <StudyExportWorkspace workspace={workspace} />
}

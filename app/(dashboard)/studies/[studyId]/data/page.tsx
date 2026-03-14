import { StudyDataWorkspace } from '@/components/forms/study-data-workspace'
import { getStudyDataWorkspace } from '@/lib/queries/study-data'

type StudyDataPageProps = {
  params: Promise<{ studyId: string }>
}

/** Renders the live eCRF data-entry workspace for the selected study. */
export default async function StudyDataPage({ params }: StudyDataPageProps) {
  const { studyId } = await params
  const data = await getStudyDataWorkspace(studyId)

  return <StudyDataWorkspace studyId={studyId} data={data} />
}

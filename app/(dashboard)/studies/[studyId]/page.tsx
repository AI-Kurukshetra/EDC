import { StudyOverviewWorkspace } from '@/components/studies/study-overview-workspace'
import { getStudyOverviewWorkspace } from '@/lib/queries/studies'

type StudyOverviewPageProps = {
  params: Promise<{ studyId: string }>
}

/** Presents the overview metrics and site rollout summary for a study. */
export default async function StudyOverviewPage({ params }: StudyOverviewPageProps) {
  const { studyId } = await params
  const workspace = await getStudyOverviewWorkspace(studyId)

  if (!workspace) {
    return null
  }

  return <StudyOverviewWorkspace workspace={workspace} />
}

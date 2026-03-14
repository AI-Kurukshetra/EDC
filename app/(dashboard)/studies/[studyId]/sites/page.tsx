import { StudySitesWorkspace } from '@/components/studies/study-sites-workspace'
import { getStudySitesWorkspace } from '@/lib/queries/study-operations'

type StudySitesPageProps = {
  params: Promise<{ studyId: string }>
}

/** Renders the study site operations view with rollout and workload metrics. */
export default async function StudySitesPage({ params }: StudySitesPageProps) {
  const { studyId } = await params
  const sites = await getStudySitesWorkspace(studyId)

  return <StudySitesWorkspace sites={sites} />
}

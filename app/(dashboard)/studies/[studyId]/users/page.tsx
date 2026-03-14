import { StudyUsersWorkspace } from '@/components/studies/study-users-workspace'
import { getStudyUsersWorkspace } from '@/lib/queries/study-operations'

type StudyUsersPageProps = {
  params: Promise<{ studyId: string }>
}

/** Renders the study sponsor and site-user assignment roster. */
export default async function StudyUsersPage({ params }: StudyUsersPageProps) {
  const { studyId } = await params
  const users = await getStudyUsersWorkspace(studyId)

  return <StudyUsersWorkspace users={users} />
}

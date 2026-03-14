import { EmptyState } from '@/components/data-display/EmptyState'

type StudyUsersPageProps = Record<string, never>

/** Reserves the study user assignment route for future implementation. */
export default function StudyUsersPage(_props: StudyUsersPageProps) {
  return (
    <EmptyState
      title="User assignment route ready"
      description="This route will manage role approvals, site-user mapping, and access reviews for each study."
    />
  )
}

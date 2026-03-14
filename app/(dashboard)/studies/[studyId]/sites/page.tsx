import { EmptyState } from '@/components/data-display/EmptyState'

type StudySitesPageProps = Record<string, never>

/** Reserves the study site administration route for future implementation. */
export default function StudySitesPage(_props: StudySitesPageProps) {
  return (
    <EmptyState
      title="Site management route ready"
      description="Use this module for site activation, PI assignment, enrollment tracking, and site-specific access control."
    />
  )
}

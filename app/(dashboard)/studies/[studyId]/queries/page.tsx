import { EmptyState } from '@/components/data-display/EmptyState'

type StudyQueriesPageProps = Record<string, never>

/** Reserves the study query management route for future implementation. */
export default function StudyQueriesPage(_props: StudyQueriesPageProps) {
  return (
    <EmptyState
      title="Query management route ready"
      description="This screen will host field-level query threads, assignment workflows, and monitor/data-manager resolution queues."
    />
  )
}

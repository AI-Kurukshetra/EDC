import { EmptyState } from '@/components/data-display/EmptyState'

type StudySubjectsPageProps = Record<string, never>

/** Reserves the study subject management route for future implementation. */
export default function StudySubjectsPage(_props: StudySubjectsPageProps) {
  return (
    <EmptyState
      title="Subject management route ready"
      description="This route will host enrollment, consent capture, visit timelines, and withdrawal workflows."
    />
  )
}

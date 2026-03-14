import { EmptyState } from '@/components/data-display/EmptyState'

type StudyDataPageProps = Record<string, never>

/** Reserves the study data entry workspace for future implementation. */
export default function StudyDataPage(_props: StudyDataPageProps) {
  return (
    <EmptyState
      title="Data entry workspace pending"
      description="This module will render eCRFs from the stored form schema with autosave, server validation, and locking flows."
    />
  )
}

import { EmptyState } from '@/components/data-display/EmptyState'

type StudyExportPageProps = Record<string, never>

/** Reserves the study export workflow surface for future implementation. */
export default function StudyExportPage(_props: StudyExportPageProps) {
  return (
    <EmptyState
      title="Export route ready"
      description="This module will orchestrate background export jobs, signed download links, and export history."
    />
  )
}

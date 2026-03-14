import { StudyFormsWorkspace } from '@/components/forms/study-forms-workspace'
import { getStudyFormTemplates } from '@/lib/queries/form-templates'

type StudyFormsPageProps = {
  params: Promise<{ studyId: string }>
}

/** Renders the study-level CRF builder workspace backed by stored form templates. */
export default async function StudyFormsPage({ params }: StudyFormsPageProps) {
  const { studyId } = await params
  const templates = await getStudyFormTemplates(studyId)

  return <StudyFormsWorkspace studyId={studyId} templates={templates} />
}

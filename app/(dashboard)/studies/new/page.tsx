import { CreateStudyForm } from '@/app/(dashboard)/studies/new/_components/create-study-form'

type NewStudyPageProps = Record<string, never>

/** Hosts the study creation wizard for new protocol setup. */
export default function NewStudyPage(_props: NewStudyPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-[0.08em] text-[color:var(--color-navy-700)] uppercase">
          Study setup wizard
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[color:var(--color-gray-900)]">
          Launch a new clinical study
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-[color:var(--color-gray-600)]">
          Capture protocol metadata, assign participating sites, and map your first wave of
          operational users.
        </p>
      </div>

      <CreateStudyForm />
    </div>
  )
}

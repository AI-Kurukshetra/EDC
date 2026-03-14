import { CreateStudyForm } from './_components/create-study-form'
import { getServerSupabase } from '@/lib/supabase/server'

type NewStudyPageProps = Record<string, never>

/** Hosts the study creation wizard for new protocol setup. */
export default async function NewStudyPage(_props: NewStudyPageProps) {
  const supabase = await getServerSupabase()
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, is_active')
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  const teamUserOptions = (data ?? []).map((row) => ({
    id: row.id as string,
    fullName: row.full_name as string,
    email: row.email as string,
    role: row.role as string,
  }))

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

      <CreateStudyForm teamUserOptions={teamUserOptions} />
    </div>
  )
}

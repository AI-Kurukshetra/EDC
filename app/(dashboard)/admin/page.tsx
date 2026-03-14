import { EmptyState } from '@/components/data-display/EmptyState'

type AdminPageProps = Record<string, never>

/** Reserves the platform administration surface for future governance workflows. */
export default function AdminPage(_props: AdminPageProps) {
  return (
    <EmptyState
      title="Admin panel scaffolded"
      description="Super-admin approval workflows, role governance, and platform controls will be built here."
    />
  )
}

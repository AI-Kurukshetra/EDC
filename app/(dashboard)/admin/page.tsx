import { AdminWorkspaceView } from '@/components/admin/admin-workspace'
import { getAdminWorkspace } from '@/lib/queries/admin'

type AdminPageProps = Record<string, never>

/** Renders the initial Phase 2 platform administration surface for super admins. */
export default async function AdminPage(_props: AdminPageProps) {
  const workspace = await getAdminWorkspace()

  return <AdminWorkspaceView workspace={workspace} />
}

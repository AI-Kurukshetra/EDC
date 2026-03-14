import { notFound } from 'next/navigation'

import { AccountWorkspace } from '@/components/account/account-workspace'
import { getAccountWorkspace } from '@/lib/queries/account'

type AccountPageProps = Record<string, never>

/** Renders the signed-in user's account summary and current study/site assignments. */
export default async function AccountPage(_props: AccountPageProps) {
  const workspace = await getAccountWorkspace()

  if (!workspace) {
    notFound()
  }

  return <AccountWorkspace workspace={workspace} />
}

import type { ReactNode } from 'react'

import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopNav } from '@/components/layout/TopNav'
import { getCurrentSessionProfile } from '@/lib/queries/account'

type DashboardLayoutProps = {
  children: ReactNode
}

/** Composes the authenticated dashboard shell with navigation and session context. */
export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const profile = await getCurrentSessionProfile()
  const canAccessAdmin = profile?.role === 'super_admin' && profile.isActive
  const canCreateStudy = Boolean(
    profile &&
    profile.isActive &&
    ['sponsor', 'data_manager', 'super_admin'].includes(profile.role),
  )

  return (
    <div className="min-h-screen">
      <Sidebar canAccessAdmin={canAccessAdmin} canCreateStudy={canCreateStudy} />
      <div className="lg:pl-80">
        <TopNav profile={profile} />
        <main className="px-4 py-6 xl:px-8">
          <div className="mb-6">
            <Breadcrumbs />
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}

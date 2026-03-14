import type { ReactNode } from 'react'

import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopNav } from '@/components/layout/TopNav'
import { getAuthenticatedUser } from '@/lib/supabase/server'

type DashboardLayoutProps = {
  children: ReactNode
}

/** Composes the authenticated dashboard shell with navigation and session context. */
export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const user = await getAuthenticatedUser()

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-80">
        <TopNav userEmail={user?.email ?? null} />
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

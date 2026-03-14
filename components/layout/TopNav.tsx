'use client'

import { Bell, Menu } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useUiStore } from '@/lib/stores/ui-store'
import { cn } from '@/lib/utils/cn'

type TopNavProps = {
  userEmail: string | null
  className?: string
}

function initialsFromEmail(email: string | null) {
  if (!email) return 'CD'

  const name = email.split('@')[0] ?? 'cd'
  return name.slice(0, 2).toUpperCase()
}

/** Displays the sticky dashboard header and current session summary. */
export function TopNav({ userEmail, className }: TopNavProps) {
  const toggleSidebar = useUiStore((state) => state.toggleSidebar)

  return (
    <header
      className={cn(
        'sticky top-0 z-20 border-b border-[color:var(--color-gray-200)] bg-white/90 px-4 py-4 backdrop-blur xl:px-8',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button className="lg:hidden" size="icon" variant="outline" onClick={toggleSidebar}>
            <Menu className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-xs font-medium tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
              Clinical Operations
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[color:var(--color-gray-900)]">
              Phase 1 Control Panel
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button size="icon" variant="outline">
            <Bell className="h-4 w-4" />
          </Button>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-[color:var(--color-gray-900)]">
              {userEmail ?? 'Trial Operator'}
            </p>
            <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
              Active session
            </p>
          </div>
          <Avatar>
            <AvatarFallback>{initialsFromEmail(userEmail)}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}

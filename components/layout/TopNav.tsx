'use client'

import { useTransition } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Bell, LogOut, Menu, UserCircle2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { logout } from '@/lib/actions/auth'
import { useUiStore } from '@/lib/stores/ui-store'
import { cn } from '@/lib/utils/cn'
import type { SessionProfileSummary } from '@/types'

type TopNavProps = {
  profile: SessionProfileSummary | null
  className?: string
}

function initialsFromEmail(email: string | null) {
  if (!email) return 'CD'

  const name = email.split('@')[0] ?? 'cd'
  return name.slice(0, 2).toUpperCase()
}

function formatRoleLabel(role: SessionProfileSummary['role'] | null) {
  if (!role) {
    return 'Trial operator'
  }

  return role.replaceAll('_', ' ')
}

/** Displays the sticky dashboard header and current session summary. */
export function TopNav({ profile, className }: TopNavProps) {
  const toggleSidebar = useUiStore((state) => state.toggleSidebar)
  const router = useRouter()
  const [isLoggingOut, startLogoutTransition] = useTransition()

  function handleLogout() {
    startLogoutTransition(() => {
      void (async () => {
        const result = await logout()

        if (!result.success) {
          toast.error(typeof result.error === 'string' ? result.error : 'Unable to sign out.')
          return
        }

        router.push(result.data)
        router.refresh()
      })()
    })
  }

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
              Clinical Data Hub
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild className="relative" size="icon" variant="outline">
            <Link href="/account#inbox">
              <Bell className="h-4 w-4" />
              {profile && profile.unreadNotificationCount > 0 ? (
                <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-[color:var(--color-danger-500)]" />
              ) : null}
            </Link>
          </Button>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-[color:var(--color-gray-900)]">
              {profile?.fullName ?? profile?.email ?? 'Trial Operator'}
            </p>
            <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
              {formatRoleLabel(profile?.role ?? null)}
            </p>
          </div>
          {profile ? <Badge variant="muted">{profile.unreadNotificationCount} unread</Badge> : null}
          <Button asChild className="hidden sm:inline-flex" variant="outline">
            <Link href="/account">
              <UserCircle2 className="h-4 w-4" />
              Account
            </Link>
          </Button>
          <Button disabled={isLoggingOut} variant="ghost" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{isLoggingOut ? 'Signing out...' : 'Logout'}</span>
          </Button>
          <Avatar>
            <AvatarFallback>{initialsFromEmail(profile?.email ?? null)}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}

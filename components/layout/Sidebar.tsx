'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { BarChart3, ClipboardCheck, FlaskConical, FolderKanban, ShieldCheck, X } from 'lucide-react'

import { AppLogo } from '@/components/layout/AppLogo'
import { Button } from '@/components/ui/button'
import { useUiStore } from '@/lib/stores/ui-store'
import { cn } from '@/lib/utils/cn'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/studies', label: 'Studies', icon: FlaskConical },
  { href: '/studies/new', label: 'New Study', icon: FolderKanban },
  { href: '/admin', label: 'Admin', icon: ShieldCheck },
]

const QUICK_ACTIONS = [{ href: '/queries', label: 'Review Queries', icon: ClipboardCheck }]

type SidebarProps = {
  canAccessAdmin?: boolean
  canCreateStudy?: boolean
  className?: string
}

/** Renders the primary dashboard navigation with mobile overlay behavior. */
export function Sidebar({
  canAccessAdmin = false,
  canCreateStudy = false,
  className,
}: SidebarProps) {
  const pathname = usePathname()
  const sidebarOpen = useUiStore((state) => state.sidebarOpen)
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen)
  const navItems = NAV_ITEMS.filter((item) => {
    if (item.href === '/admin' && !canAccessAdmin) {
      return false
    }

    if (item.href === '/studies/new' && !canCreateStudy) {
      return false
    }

    return true
  })
  const activeHref =
    navItems
      .slice()
      .sort((left, right) => right.href.length - left.href.length)
      .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.href ?? null

  return (
    <>
      <div
        aria-hidden
        className={cn(
          'fixed inset-0 z-30 bg-[color:rgba(13,33,55,0.32)] backdrop-blur-sm transition-opacity lg:hidden',
          sidebarOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => {
          setSidebarOpen(false)
        }}
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-80 flex-col border-r border-[color:var(--color-gray-200)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(238,245,251,0.92))] px-6 py-6 transition-transform lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          className,
        )}
      >
        <div className="flex items-center justify-between">
          <AppLogo />
          <Button
            className="lg:hidden"
            size="icon"
            variant="ghost"
            onClick={() => {
              setSidebarOpen(false)
            }}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="mt-8 rounded-3xl border border-[color:var(--color-gray-200)] bg-white/90 p-4">
          <p className="text-xs font-medium tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
            Clinical Command Center
          </p>
          <p className="mt-2 text-sm text-[color:var(--color-gray-700)]">
            Track enrollment, queries, data quality, and audit readiness in one place.
          </p>
        </div>

        <nav className="mt-8 flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = activeHref === item.href

            return (
              <Link
                key={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[color:var(--color-navy-800)] text-white shadow-[0_18px_32px_-24px_rgba(31,78,121,0.95)]'
                    : 'text-[color:var(--color-gray-700)] hover:bg-[color:var(--color-navy-50)] hover:text-[color:var(--color-navy-800)]',
                )}
                href={item.href}
                onClick={() => {
                  setSidebarOpen(false)
                }}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto">
          <p className="mb-3 text-xs font-medium tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
            Quick Actions
          </p>
          <div className="flex flex-col gap-2">
            {QUICK_ACTIONS.map((item) => (
              <Link
                key={item.href}
                className="flex items-center gap-3 rounded-2xl border border-[color:var(--color-gray-200)] bg-white px-4 py-3 text-sm font-medium text-[color:var(--color-gray-700)] transition-colors hover:border-[color:var(--color-navy-700)] hover:text-[color:var(--color-navy-800)]"
                href={item.href}
                onClick={() => {
                  setSidebarOpen(false)
                }}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </aside>
    </>
  )
}

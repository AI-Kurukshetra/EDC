'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils/cn'

const SEGMENT_LABELS: Record<string, string> = {
  studies: 'Studies',
  new: 'New Study',
  admin: 'Admin',
  account: 'Account',
  subjects: 'Subjects',
  forms: 'Forms',
  data: 'Data',
  queries: 'Queries',
  sites: 'Sites',
  users: 'Users',
  audit: 'Audit',
  export: 'Export',
}

type BreadcrumbsProps = {
  className?: string
}

/** Renders the current route hierarchy for dashboard navigation context. */
export function Breadcrumbs({ className }: BreadcrumbsProps) {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  const items = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join('/')}`
    const label = SEGMENT_LABELS[segment] ?? segment

    return { href, label }
  })

  return (
    <nav aria-label="Breadcrumb" className={cn(className)}>
      <ol className="flex flex-wrap items-center gap-2 text-sm text-[color:var(--color-gray-600)]">
        <li>
          <Link className="transition-colors hover:text-[color:var(--color-navy-800)]" href="/">
            Dashboard
          </Link>
        </li>
        {items.map((item) => (
          <li key={item.href} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4" />
            <Link
              className="transition-colors hover:text-[color:var(--color-navy-800)]"
              href={item.href}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  )
}

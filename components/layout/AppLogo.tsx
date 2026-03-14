import Link from 'next/link'

import { cn } from '@/lib/utils/cn'

type AppLogoProps = {
  className?: string
}

/** Displays the product wordmark and icon lockup used in global navigation. */
export function AppLogo({ className }: AppLogoProps) {
  return (
    <Link className={cn('flex items-center gap-3', className)} href="/">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--color-navy-800),var(--color-navy-700))] shadow-[0_12px_26px_-18px_rgba(31,78,121,0.95)]">
        <span className="grid h-5 w-5 grid-cols-2 gap-0.5">
          <span className="rounded-full bg-white/95" />
          <span className="rounded-full bg-white/70" />
          <span className="rounded-full bg-white/70" />
          <span className="rounded-full bg-white/95" />
        </span>
      </span>
      <div className="flex flex-col">
        <span className="font-[family-name:var(--font-display)] text-base font-semibold tracking-tight text-[color:var(--color-gray-900)]">
          Clinical Data Hub
        </span>
        <span className="text-[11px] tracking-[0.12em] text-[color:var(--color-gray-600)] uppercase">
          Precision EDC
        </span>
      </div>
    </Link>
  )
}

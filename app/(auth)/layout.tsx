import type { ReactNode } from 'react'

import { AppLogo } from '@/components/layout/AppLogo'

type AuthLayoutProps = {
  children: ReactNode
}

/** Wraps authentication routes in the split-screen onboarding shell. */
export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen bg-[linear-gradient(180deg,rgba(238,245,251,0.92),rgba(249,250,251,1))] lg:grid-cols-[1.15fr_0.85fr]">
      <section className="grid-surface relative hidden overflow-hidden border-r border-[color:var(--color-gray-200)] px-12 py-12 lg:flex lg:flex-col">
        <AppLogo />
        <div className="mt-auto max-w-xl">
          <p className="text-xs font-medium tracking-[0.1em] text-[color:var(--color-navy-700)] uppercase">
            Phase 1 MVP
          </p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-5xl leading-tight font-semibold text-[color:var(--color-gray-900)]">
            The instrument panel of clinical science.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-[color:var(--color-gray-600)]">
            Run study setup, site coordination, subject tracking, query resolution, audit trails,
            and data exports from one modern control room.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
        <div className="w-full max-w-xl">{children}</div>
      </section>
    </div>
  )
}

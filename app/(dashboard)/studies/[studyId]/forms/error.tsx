'use client'

import { useEffect } from 'react'

import { Button } from '@/components/ui/button'

type StudyFormsErrorPageProps = {
  error: Error
  reset: () => void
}

/** Renders a graceful fallback when the forms workspace throws a client/runtime error. */
export default function StudyFormsErrorPage({ error, reset }: StudyFormsErrorPageProps) {
  useEffect(() => {
    console.error('Study forms page failed to render', error)
  }, [error])

  return (
    <div className="space-y-4 rounded-2xl border border-[color:var(--color-danger-100)] bg-[color:var(--color-danger-100)]/40 px-5 py-5">
      <h2 className="text-xl font-semibold text-[color:var(--color-gray-900)]">
        Unable to load form builder
      </h2>
      <p className="text-sm text-[color:var(--color-gray-700)]">
        The form workspace hit an unexpected issue. Try reloading this section. If it persists,
        open another study and return.
      </p>
      <Button
        onClick={() => {
          reset()
        }}
      >
        Retry
      </Button>
    </div>
  )
}

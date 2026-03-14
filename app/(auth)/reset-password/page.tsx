import Link from 'next/link'

import { ResetPasswordForm } from './_components/reset-password-form'

type ResetPasswordPageProps = Record<string, never>

/** Renders the password recovery completion flow after an authenticated recovery redirect. */
export default function ResetPasswordPage(_props: ResetPasswordPageProps) {
  return (
    <div className="space-y-6">
      <ResetPasswordForm />
      <p className="text-center text-sm text-[color:var(--color-gray-600)]">
        Remembered it already?{' '}
        <Link className="font-medium text-[color:var(--color-navy-800)]" href="/login">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}

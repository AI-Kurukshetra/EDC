import Link from 'next/link'

import { RegisterForm } from './_components/register-form'

type RegisterPageProps = Record<string, never>

/** Renders the self-service access request flow for new users. */
export default function RegisterPage(_props: RegisterPageProps) {
  return (
    <div className="space-y-6">
      <RegisterForm />
      <p className="text-center text-sm text-[color:var(--color-gray-600)]">
        Already have access?{' '}
        <Link className="font-medium text-[color:var(--color-navy-800)]" href="/login">
          Sign in
        </Link>
      </p>
    </div>
  )
}

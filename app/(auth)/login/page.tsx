import Link from 'next/link'

import { LoginForm } from '@/app/(auth)/login/_components/login-form'

type LoginPageProps = Record<string, never>

/** Renders the credential and magic-link sign-in entry point. */
export default function LoginPage(_props: LoginPageProps) {
  return (
    <div className="space-y-6">
      <LoginForm />
      <p className="text-center text-sm text-[color:var(--color-gray-600)]">
        Need access?{' '}
        <Link className="font-medium text-[color:var(--color-navy-800)]" href="/register">
          Request an account
        </Link>
      </p>
    </div>
  )
}

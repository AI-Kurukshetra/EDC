import Link from 'next/link'

import { LoginForm } from './_components/login-form'

type LoginPageProps = {
  searchParams: Promise<{
    error?: string
  }>
}

/** Renders the credential and magic-link sign-in entry point. */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams

  return (
    <div className="space-y-6">
      <LoginForm authError={params.error} />
      <p className="text-center text-sm text-[color:var(--color-gray-600)]">
        Need access?{' '}
        <Link className="font-medium text-[color:var(--color-navy-800)]" href="/register">
          Request an account
        </Link>
      </p>
    </div>
  )
}

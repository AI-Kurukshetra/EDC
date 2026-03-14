import Link from 'next/link'

const coreCapabilities = [
  {
    title: 'Protocol-Centered Study Setup',
    description:
      'Create studies with structured protocol metadata, site assignments, and operational ownership from day one.',
  },
  {
    title: 'Role-Based Access and Governance',
    description:
      'Sponsor, site, monitor, data manager, and super admin roles keep actions aligned to responsibility and compliance.',
  },
  {
    title: 'Form and Subject Workspaces',
    description:
      'Manage forms, subjects, exports, signatures, and operational reviews in one connected workflow.',
  },
  {
    title: 'Audit-Friendly Operations',
    description:
      'Track approvals, review steps, status transitions, and updates with clear accountability at each stage.',
  },
]

const workflowSteps = [
  {
    title: '1. Launch Study',
    detail: 'Define protocol basics, timelines, phase, and participating sites.',
  },
  {
    title: '2. Assign Teams',
    detail: 'Map site users and central users to study roles and permissions.',
  },
  {
    title: '3. Build Data Collection',
    detail: 'Configure forms and required fields for each study workflow.',
  },
  {
    title: '4. Execute and Review',
    detail: 'Capture subject data, run reviews, and close actions with sign-off.',
  },
]

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <section className="relative overflow-hidden border-b border-[var(--color-navy-100)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(46,117,182,0.18),transparent_32%),radial-gradient(circle_at_90%_20%,rgba(74,144,196,0.14),transparent_36%)]" />
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-20 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-6">
            <p className="inline-flex rounded-full border border-[var(--color-navy-100)] bg-white px-4 py-1 text-sm font-semibold text-[var(--color-navy-800)]">
              Clinical Study Operations Platform
            </p>
            <h1
              className="text-4xl font-semibold tracking-tight text-[var(--color-gray-950)] sm:text-5xl"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Run clinical studies with one secure workflow from setup to sign-off.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-[var(--color-gray-700)]">
              Our app helps teams launch studies faster, coordinate sites and roles, manage forms and
              subject data, and keep every critical action auditable.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/register"
                className="rounded-xl bg-[var(--color-navy-800)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-navy-900)]"
              >
                Get Started
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-[var(--color-navy-100)] bg-white px-5 py-3 text-sm font-semibold text-[var(--color-gray-900)] transition hover:border-[var(--color-navy-700)]"
              >
                Sign In
              </Link>
              <Link
                href="/studies"
                className="rounded-xl px-5 py-3 text-sm font-semibold text-[var(--color-navy-800)] transition hover:text-[var(--color-navy-900)]"
              >
                Open Dashboard
              </Link>
            </div>
          </div>
          <div className="grid w-full max-w-xl gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--color-navy-100)] bg-white/90 p-5 shadow-sm">
              <p className="text-sm font-semibold text-[var(--color-gray-600)]">Studies Managed</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--color-gray-950)]">100+</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-navy-100)] bg-white/90 p-5 shadow-sm">
              <p className="text-sm font-semibold text-[var(--color-gray-600)]">Role-Aware Security</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--color-gray-950)]">RLS + RBAC</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-navy-100)] bg-white/90 p-5 shadow-sm">
              <p className="text-sm font-semibold text-[var(--color-gray-600)]">Core Workspaces</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--color-gray-950)]">Forms, Subjects</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-navy-100)] bg-white/90 p-5 shadow-sm">
              <p className="text-sm font-semibold text-[var(--color-gray-600)]">Operational Control</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--color-gray-950)]">Review Ready</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2
          className="text-3xl font-semibold tracking-tight text-[var(--color-gray-950)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          What the platform covers
        </h2>
        <p className="mt-3 max-w-3xl text-[var(--color-gray-700)]">
          Built for operational teams that need clarity, compliance, and speed across the full study
          lifecycle.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {coreCapabilities.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-[var(--color-gray-200)] bg-white p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-[var(--color-gray-950)]">{item.title}</h3>
              <p className="mt-2 text-[var(--color-gray-700)]">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid-surface border-y border-[var(--color-gray-200)] bg-white/80">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2
            className="text-3xl font-semibold tracking-tight text-[var(--color-gray-950)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            How it works
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {workflowSteps.map((step) => (
              <article
                key={step.title}
                className="rounded-2xl border border-[var(--color-navy-100)] bg-white p-5 shadow-sm"
              >
                <h3 className="text-base font-semibold text-[var(--color-navy-900)]">{step.title}</h3>
                <p className="mt-2 text-sm text-[var(--color-gray-700)]">{step.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-3xl border border-[var(--color-navy-100)] bg-[var(--color-navy-50)] p-8 sm:p-10">
          <h2
            className="text-3xl font-semibold tracking-tight text-[var(--color-gray-950)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Ready to run your next study?
          </h2>
          <p className="mt-3 max-w-3xl text-[var(--color-gray-700)]">
            Use the platform to launch, manage, and monitor clinical studies with better alignment
            across sponsor and site teams.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="rounded-xl bg-[var(--color-navy-800)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-navy-900)]"
            >
              Create Account
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-[var(--color-navy-100)] bg-white px-5 py-3 text-sm font-semibold text-[var(--color-gray-900)] transition hover:border-[var(--color-navy-700)]"
            >
              Login
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

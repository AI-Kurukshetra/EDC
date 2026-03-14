import Link from 'next/link'

const productPillars = [
  {
    title: 'End-to-End Study Operations',
    description: 'From protocol setup to forms, queries, exports, and signatures in one workspace.',
  },
  {
    title: 'Built-In Governance',
    description: 'Role-aware access controls and auditable actions for compliant execution at scale.',
  },
  {
    title: 'Operational Clarity',
    description: 'Clear ownership across sponsor, site, monitoring, and data management teams.',
  },
]

const workflowSteps = [
  {
    step: '01',
    title: 'Launch',
    detail: 'Define protocol metadata, timelines, and participating sites.',
  },
  {
    step: '02',
    title: 'Assign Teams',
    detail: 'Map users by site and role with clear responsibilities.',
  },
  {
    step: '03',
    title: 'Execute',
    detail: 'Capture subject data, run form workflows, and manage study operations.',
  },
  {
    step: '04',
    title: 'Review and Sign Off',
    detail: 'Resolve queries, complete reviews, and maintain complete audit history.',
  },
]

const roleCards = [
  {
    title: 'Sponsors',
    detail: 'Monitor study progress, oversight checkpoints, and portfolio-level readiness.',
  },
  {
    title: 'Site Teams',
    detail: 'Work through assigned forms and subject workflows with low-friction navigation.',
  },
  {
    title: 'Data Managers',
    detail: 'Track data quality, resolve issues quickly, and maintain clean exports.',
  },
  {
    title: 'Super Admins',
    detail: 'Control access, user provisioning, and governance across the platform.',
  },
]

const featureGrid = [
  'Study and site management',
  'Form workspace with templates',
  'Subject lifecycle tracking',
  'Query and review operations',
  'Export-ready data workflows',
  'Audit and signature support',
]

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_10%_0%,rgba(74,144,196,0.2),transparent_28%),radial-gradient(circle_at_88%_12%,rgba(13,33,55,0.12),transparent_34%),linear-gradient(180deg,#f6fbff_0%,#eef4fb_55%,#f9fafb_100%)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-28 h-64 w-64 rounded-full bg-[rgba(74,144,196,0.22)] blur-3xl hero-glow-pulse" />
        <div className="absolute -right-24 top-40 h-72 w-72 rounded-full bg-[rgba(13,33,55,0.18)] blur-3xl hero-glow-pulse [animation-delay:1.2s]" />
        <div className="absolute left-[35%] top-[32rem] h-52 w-52 rounded-full bg-[rgba(46,117,182,0.2)] blur-3xl hero-glow-pulse [animation-delay:2.4s]" />
      </div>

      <header className="sticky top-0 z-20 border-b border-[var(--color-gray-200)] bg-white/75 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--color-navy-900)]">
            Clinical Data Hub
          </p>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-[var(--color-gray-700)] transition hover:bg-[var(--color-gray-100)]"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-[var(--color-navy-800)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-navy-900)]"
            >
              Get started
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative mx-auto grid max-w-6xl gap-10 px-6 pb-14 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="space-y-7">
          <p className="inline-flex rounded-full border border-[var(--color-navy-100)] bg-white px-4 py-1 text-xs font-semibold tracking-[0.08em] text-[var(--color-navy-800)] uppercase">
            Clinical Trial Operations
          </p>
          <h1
            className="text-4xl font-semibold tracking-tight text-[var(--color-gray-950)] sm:text-5xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            The operating layer for modern clinical studies.
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-[var(--color-gray-700)]">
            Launch studies faster, coordinate teams with role-based access, and run forms,
            subjects, reviews, and signatures in one connected system.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/register"
              className="rounded-xl bg-[var(--color-navy-800)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_-12px_rgba(31,78,121,0.7)] transition hover:bg-[var(--color-navy-900)]"
            >
              Start Now
            </Link>
            <Link
              href="/studies"
              className="rounded-xl border border-[var(--color-navy-100)] bg-white px-5 py-3 text-sm font-semibold text-[var(--color-gray-900)] transition hover:border-[var(--color-navy-700)]"
            >
              Open Dashboard
            </Link>
          </div>
          <div className="grid max-w-xl grid-cols-3 gap-3 text-center">
            <div className="glass-panel rounded-xl border border-[var(--color-navy-100)] p-3">
              <p className="text-xl font-semibold text-[var(--color-gray-950)]">100+</p>
              <p className="text-xs text-[var(--color-gray-600)]">Studies</p>
            </div>
            <div className="glass-panel rounded-xl border border-[var(--color-navy-100)] p-3">
              <p className="text-xl font-semibold text-[var(--color-gray-950)]">RLS</p>
              <p className="text-xs text-[var(--color-gray-600)]">Data Security</p>
            </div>
            <div className="glass-panel rounded-xl border border-[var(--color-navy-100)] p-3">
              <p className="text-xl font-semibold text-[var(--color-gray-950)]">24x7</p>
              <p className="text-xs text-[var(--color-gray-600)]">Operational View</p>
            </div>
          </div>
        </div>

        <aside className="relative rounded-3xl border border-[var(--color-navy-100)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(238,245,251,0.9))] p-6 shadow-[0_28px_52px_-28px_rgba(13,33,55,0.58)]">
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full border border-[rgba(74,144,196,0.45)] bg-[rgba(255,255,255,0.35)] backdrop-blur hero-float" />
          <div className="pointer-events-none absolute -left-5 bottom-12 h-12 w-12 rounded-full border border-[rgba(31,78,121,0.32)] bg-[rgba(255,255,255,0.45)] backdrop-blur hero-float [animation-delay:1.6s]" />
          <p className="text-xs font-semibold tracking-[0.08em] text-[var(--color-navy-700)] uppercase">
            Mission Control Snapshot
          </p>
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-[var(--color-gray-200)] bg-white p-4">
              <p className="text-xs text-[var(--color-gray-600)]">Active Study</p>
              <p className="mt-1 text-base font-semibold text-[var(--color-gray-950)]">
                Phase II Cardiology Cohort
              </p>
              <p className="mt-1 text-sm text-[var(--color-gray-600)]">16 sites | 382 subjects</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[var(--color-gray-200)] bg-white p-4">
                <p className="text-xs text-[var(--color-gray-600)]">Open Queries</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-warning-700)]">24</p>
                <div className="mt-2 h-1.5 rounded-full bg-[var(--color-warning-100)]">
                  <div className="h-full w-2/5 rounded-full bg-[var(--color-warning-700)]" />
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--color-gray-200)] bg-white p-4">
                <p className="text-xs text-[var(--color-gray-600)]">Signed Forms</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-success-700)]">91%</p>
                <div className="mt-2 h-1.5 rounded-full bg-[var(--color-success-100)]">
                  <div className="h-full w-[91%] rounded-full bg-[var(--color-success-700)]" />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--color-navy-100)] bg-[var(--color-navy-50)] p-4">
              <p className="text-sm font-medium text-[var(--color-gray-700)]">
                All critical actions are time-stamped and role-attributed for audit readiness.
              </p>
            </div>
          </div>
        </aside>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-4 md:grid-cols-3">
          {productPillars.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-[var(--color-gray-200)] bg-white p-6 shadow-[0_18px_38px_-30px_rgba(13,33,55,0.5)] transition hover:-translate-y-0.5 hover:border-[var(--color-navy-100)]"
            >
              <h2 className="text-lg font-semibold text-[var(--color-gray-950)]">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--color-gray-700)]">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-14">
        <div className="relative overflow-hidden rounded-3xl border border-[var(--color-navy-100)] bg-white p-8 shadow-sm">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_100%,rgba(214,228,240,0.45),transparent_34%),radial-gradient(circle_at_100%_0%,rgba(214,228,240,0.35),transparent_36%)]" />
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <h2
                className="text-3xl font-semibold tracking-tight text-[var(--color-gray-950)]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Designed for every clinical operations role
              </h2>
              <p className="mt-3 text-[var(--color-gray-700)]">
                Teams get personalized responsibility while leadership keeps one unified operational
                picture.
              </p>
            </div>
            <Link
              href="/register"
              className="inline-flex rounded-xl border border-[var(--color-navy-100)] px-4 py-2 text-sm font-semibold text-[var(--color-navy-800)] transition hover:border-[var(--color-navy-700)]"
            >
              Request access
            </Link>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {roleCards.map((card) => (
              <article
                key={card.title}
                className="rounded-2xl border border-[var(--color-gray-200)] bg-[var(--color-gray-50)] p-5"
              >
                <h3 className="font-semibold text-[var(--color-gray-950)]">{card.title}</h3>
                <p className="mt-2 text-sm text-[var(--color-gray-700)]">{card.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="grid-surface border-y border-[var(--color-gray-200)] bg-white/75">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2
            className="text-3xl font-semibold tracking-tight text-[var(--color-gray-950)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            One connected workflow
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {workflowSteps.map((step) => (
              <article
                key={step.step}
                className="rounded-2xl border border-[var(--color-navy-100)] bg-white p-5"
              >
                <p className="text-xs font-semibold tracking-[0.08em] text-[var(--color-navy-700)]">
                  STEP {step.step}
                </p>
                <h3 className="mt-2 text-base font-semibold text-[var(--color-navy-900)]">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-[var(--color-gray-700)]">{step.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-4 md:grid-cols-2">
          {featureGrid.map((feature) => (
            <div
              key={feature}
              className="rounded-xl border border-[var(--color-gray-200)] bg-white px-4 py-3 text-sm font-medium text-[var(--color-gray-800)] shadow-[0_14px_30px_-30px_rgba(13,33,55,0.65)]"
            >
              {feature}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="rounded-3xl border border-[var(--color-navy-100)] bg-[linear-gradient(145deg,var(--color-navy-900),var(--color-navy-800))] p-8 text-white shadow-[0_32px_56px_-34px_rgba(13,33,55,0.9)] sm:p-10">
          <h2
            className="text-3xl font-semibold tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Ready to bring every study operation into one control room?
          </h2>
          <p className="mt-3 max-w-3xl text-[rgba(255,255,255,0.82)]">
            Give your team a faster, cleaner, and more accountable way to execute clinical studies.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[var(--color-navy-900)] transition hover:bg-[var(--color-gray-100)]"
            >
              Create Account
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-[rgba(255,255,255,0.45)] bg-transparent px-5 py-3 text-sm font-semibold text-white transition hover:border-white"
            >
              Login
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

'use client'

import { useState, useTransition } from 'react'

import { ShieldCheck } from 'lucide-react'
import { toast } from 'react-hot-toast'

import { EmptyState } from '@/components/data-display/EmptyState'
import { StatCard } from '@/components/data-display/StatCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { signStudyRecord } from '@/lib/actions/study-signatures'
import { formatDate, formatDateTime, formatPercentage } from '@/lib/utils/format'
import {
  STUDY_SIGNATURE_MEANINGS,
  type StudyOverviewWorkspace as StudyOverviewWorkspaceData,
  type StudySignatureMeaning,
} from '@/types'

type StudyOverviewWorkspaceProps = {
  workspace: StudyOverviewWorkspaceData
}

/** Presents study readiness context plus study-level electronic sign-off controls. */
export function StudyOverviewWorkspace({ workspace }: StudyOverviewWorkspaceProps) {
  const [isPending, startTransition] = useTransition()
  const [signatureMeaning, setSignatureMeaning] = useState<StudySignatureMeaning>(
    STUDY_SIGNATURE_MEANINGS[0],
  )
  const [signaturePassword, setSignaturePassword] = useState('')
  const [signaturePreviewAt, setSignaturePreviewAt] = useState<string | null>(
    new Date().toISOString(),
  )

  const latestSignature = workspace.signatures[0] ?? null
  const distinctSignerCount = new Set(
    workspace.signatures.map(
      (signature) => signature.signedByEmail ?? signature.signedByName ?? signature.id,
    ),
  ).size

  function handleSignStudy() {
    startTransition(() => {
      void (async () => {
        const result = await signStudyRecord({
          studyId: workspace.study.id,
          signatureMeaning,
          password: signaturePassword,
        })

        if (!result.success) {
          toast.error(
            typeof result.error === 'string' ? result.error : 'Unable to sign this study.',
          )
          return
        }

        setSignaturePassword('')
        setSignaturePreviewAt(new Date().toISOString())
        toast.success('Study sign-off captured.')
      })()
    })
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Study overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <section className="grid gap-4 md:grid-cols-3">
              <StatCard
                label="Enrolled subjects"
                value={workspace.study.enrolledSubjects}
                detail="Participants currently counted as enrolled, randomized, or completed."
              />
              <StatCard
                label="Data completion"
                value={formatPercentage(workspace.study.completionRate)}
                detail="Submitted, locked, or SDV-complete entries across captured study data."
              />
              <StatCard
                label="Participating sites"
                value={workspace.study.sites.length}
                detail="Sites currently registered against this study record."
              />
            </section>

            <div className="grid gap-3 text-sm text-[color:var(--color-gray-700)] md:grid-cols-3">
              <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4">
                <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                  Target enrollment
                </p>
                <p className="mt-2 font-medium">
                  {workspace.study.targetEnrollment ?? 'Not defined'}
                </p>
              </div>
              <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4">
                <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                  Start date
                </p>
                <p className="mt-2 font-medium">{formatDate(workspace.study.startDate)}</p>
              </div>
              <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4">
                <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                  End date
                </p>
                <p className="mt-2 font-medium">{formatDate(workspace.study.endDate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Site rollout</CardTitle>
          </CardHeader>
          <CardContent>
            {workspace.study.sites.length === 0 ? (
              <EmptyState
                title="No sites configured"
                description="Add a site during study setup to enable subject enrollment and coordinator access."
              />
            ) : (
              <div className="space-y-3">
                {workspace.study.sites.map((site) => (
                  <div
                    key={site.id}
                    className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-[color:var(--color-gray-900)]">
                          {site.name}
                        </p>
                        <p className="font-[family-name:var(--font-mono)] text-xs text-[color:var(--color-gray-600)]">
                          {site.siteCode}
                        </p>
                      </div>
                      <p className="text-sm text-[color:var(--color-gray-600)]">{site.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Study sign-off</CardTitle>
                <p className="mt-2 text-sm leading-6 text-[color:var(--color-gray-600)]">
                  Capture an immutable study-level electronic signature for oversight-ready
                  approval.
                </p>
              </div>
              <Badge variant={workspace.canSignStudy ? 'success' : 'muted'}>
                {workspace.canSignStudy ? 'signing enabled' : 'view only'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 text-sm text-[color:var(--color-gray-700)] md:grid-cols-3">
              <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4">
                <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                  Sign-offs
                </p>
                <p className="mt-2 font-medium">{workspace.signatures.length}</p>
              </div>
              <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4">
                <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                  Distinct signers
                </p>
                <p className="mt-2 font-medium">{distinctSignerCount}</p>
              </div>
              <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4">
                <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                  Latest sign-off
                </p>
                <p className="mt-2 font-medium">{formatDateTime(latestSignature?.signedAt)}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[#fefefe] px-4 py-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-2 text-sm text-[color:var(--color-gray-700)]">
                  <span className="font-medium">Signature meaning</span>
                  <select
                    className="flex h-10 w-full rounded-xl border border-[color:var(--color-gray-200)] bg-white px-3 py-2 text-sm text-[color:var(--color-gray-900)] shadow-sm outline-none focus:border-[color:var(--color-navy-700)] focus:ring-2 focus:ring-[color:var(--color-navy-100)]"
                    disabled={isPending}
                    value={signatureMeaning}
                    onChange={(event) => {
                      setSignatureMeaning(event.target.value as StudySignatureMeaning)
                    }}
                  >
                    {STUDY_SIGNATURE_MEANINGS.map((meaningOption) => (
                      <option key={meaningOption} value={meaningOption}>
                        {meaningOption}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm text-[color:var(--color-gray-700)]">
                  <span className="font-medium">Timestamp preview</span>
                  <Input disabled value={formatDateTime(signaturePreviewAt)} />
                </label>
              </div>

              <div className="mt-4 rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4 text-sm text-[color:var(--color-gray-800)]">
                <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                  Electronic record declaration
                </p>
                <p className="mt-2 leading-6">
                  By signing, you confirm that this electronic signature is legally equivalent to
                  your handwritten signature for the current study record and will remain tied to
                  the immutable audit trail.
                </p>
                <p className="mt-2">
                  Signer: {workspace.viewerName ?? 'Current user'}{' '}
                  {workspace.viewerEmail ? `(${workspace.viewerEmail})` : ''}
                </p>
              </div>

              <label className="mt-4 block space-y-2 text-sm text-[color:var(--color-gray-700)]">
                <span className="font-medium">Password re-entry</span>
                <Input
                  autoComplete="current-password"
                  disabled={isPending}
                  placeholder="Re-enter your password"
                  type="password"
                  value={signaturePassword}
                  onChange={(event) => {
                    setSignaturePassword(event.target.value)
                  }}
                />
              </label>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  disabled={
                    isPending || !workspace.canSignStudy || signaturePassword.trim().length === 0
                  }
                  type="button"
                  onClick={handleSignStudy}
                >
                  <ShieldCheck className="h-4 w-4" />
                  {isPending ? 'Signing...' : 'Capture study sign-off'}
                </Button>
                {!workspace.canSignStudy ? (
                  <p className="text-sm text-[color:var(--color-gray-600)]">
                    Only the study sponsor, monitors, data managers, or super admins can sign.
                  </p>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent study signatures</CardTitle>
          </CardHeader>
          <CardContent>
            {workspace.signatures.length === 0 ? (
              <EmptyState
                title="No study signatures captured"
                description="Study-level sign-offs will appear here once an authorized oversight user certifies the record."
              />
            ) : (
              <div className="space-y-3">
                {workspace.signatures.map((signature) => (
                  <div
                    key={signature.id}
                    className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-[color:var(--color-gray-900)]">
                          {signature.signatureMeaning}
                        </p>
                        <p className="mt-2 text-sm text-[color:var(--color-gray-600)]">
                          {signature.signedByName ?? 'Unknown user'}
                          {signature.signedByRole
                            ? ` • ${signature.signedByRole.replace('_', ' ')}`
                            : ''}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--color-gray-600)]">
                          {signature.signedByEmail ?? 'No direct email record'}
                        </p>
                      </div>
                      <div className="text-sm text-[color:var(--color-gray-600)]">
                        {formatDateTime(signature.signedAt)}
                      </div>
                    </div>
                    <p className="mt-3 font-[family-name:var(--font-mono)] text-xs break-all text-[color:var(--color-gray-600)]">
                      {signature.certificateHash}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

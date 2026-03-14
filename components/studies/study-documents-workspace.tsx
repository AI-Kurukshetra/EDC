'use client'

import { useDeferredValue, useState, useTransition } from 'react'

import { useRouter } from 'next/navigation'

import { Search } from 'lucide-react'
import { toast } from 'react-hot-toast'

import { EmptyState } from '@/components/data-display/EmptyState'
import { StatCard } from '@/components/data-display/StatCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  createStudyDocumentVersion,
  updateStudyDocument,
} from '@/lib/actions/study-document-lifecycle'
import { registerStudyDocument } from '@/lib/actions/study-documents'
import { signStudyDocument } from '@/lib/actions/study-signatures'
import { formatDateTime } from '@/lib/utils/format'
import {
  DOCUMENT_SIGNATURE_MEANINGS,
  STUDY_DOCUMENT_CATEGORIES,
  type StudyDocumentCategory,
  type DocumentSignatureMeaning,
  type StudyOperationsDocumentsWorkspace,
} from '@/types'

const SELECT_CLASS_NAME =
  'flex h-10 w-full rounded-xl border border-[color:var(--color-gray-200)] bg-white px-3 py-2 text-sm text-[color:var(--color-gray-900)] shadow-sm outline-none focus:border-[color:var(--color-navy-700)] focus:ring-2 focus:ring-[color:var(--color-navy-100)]'

type StudyDocumentsWorkspaceProps = {
  workspace: StudyOperationsDocumentsWorkspace
}

type DocumentLifecycleMode = 'edit' | 'version'

function formatDocumentCategory(category: StudyDocumentCategory) {
  return category.replaceAll('_', ' ')
}

/** Provides a study-scoped document register with optional manager-only registration controls. */
export function StudyDocumentsWorkspace({ workspace }: StudyDocumentsWorkspaceProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [filePath, setFilePath] = useState('')
  const [category, setCategory] = useState<StudyDocumentCategory>('general')
  const [version, setVersion] = useState('1')
  const [searchValue, setSearchValue] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | StudyDocumentCategory>('all')
  const [signatureFilter, setSignatureFilter] = useState<'all' | 'signed' | 'unsigned'>('all')
  const [versionFilter, setVersionFilter] = useState<'all' | 'latest' | 'history'>('latest')
  const [lifecycleDocumentId, setLifecycleDocumentId] = useState<string | null>(null)
  const [lifecycleMode, setLifecycleMode] = useState<DocumentLifecycleMode | null>(null)
  const [lifecycleName, setLifecycleName] = useState('')
  const [lifecycleFilePath, setLifecycleFilePath] = useState('')
  const [lifecycleCategory, setLifecycleCategory] = useState<StudyDocumentCategory>('general')
  const [signingDocumentId, setSigningDocumentId] = useState<string | null>(null)
  const [signatureMeaning, setSignatureMeaning] = useState<DocumentSignatureMeaning>(
    DOCUMENT_SIGNATURE_MEANINGS[0],
  )
  const [signaturePassword, setSignaturePassword] = useState('')
  const [signaturePreviewAt, setSignaturePreviewAt] = useState<string | null>(null)
  const [isSaving, startSavingTransition] = useTransition()
  const [isManagingLifecycle, startLifecycleTransition] = useTransition()
  const [isSigning, startSigningTransition] = useTransition()
  const deferredSearchValue = useDeferredValue(searchValue)
  const normalizedSearchValue = deferredSearchValue.trim().toLowerCase()
  const filteredDocuments = workspace.documents.filter((document) => {
    const matchesSearch =
      normalizedSearchValue.length === 0 ||
      [
        document.name,
        document.filePath,
        document.category,
        document.uploadedByName ?? '',
        document.uploadedByEmail ?? '',
        document.latestSignedByName ?? '',
        document.latestSignedByEmail ?? '',
        document.latestSignatureMeaning ?? '',
      ].some((value) => value.toLowerCase().includes(normalizedSearchValue))
    const matchesCategory = categoryFilter === 'all' || document.category === categoryFilter
    const matchesSignature =
      signatureFilter === 'all' ||
      (signatureFilter === 'signed' ? document.signatureCount > 0 : document.signatureCount === 0)
    const matchesVersion =
      versionFilter === 'all' ||
      (versionFilter === 'latest' ? document.isLatestVersion : !document.isLatestVersion)

    return matchesSearch && matchesCategory && matchesSignature && matchesVersion
  })
  const activeFilterCount =
    Number(searchValue.trim().length > 0) +
    Number(categoryFilter !== 'all') +
    Number(signatureFilter !== 'all') +
    Number(versionFilter !== 'latest')
  const signedDocumentCount = workspace.documents.filter(
    (document) => document.signatureCount > 0,
  ).length
  const totalSignatureCount = workspace.documents.reduce(
    (count, document) => count + document.signatureCount,
    0,
  )
  const latestDocumentCount = workspace.documents.filter(
    (document) => document.isLatestVersion,
  ).length
  const versionedFamilyCount = workspace.documents
    .filter((document) => document.isLatestVersion)
    .filter((document) => document.familyVersionCount > 1).length

  function resetComposer() {
    setName('')
    setFilePath('')
    setCategory('general')
    setVersion('1')
  }

  function resetLifecycleComposer() {
    setLifecycleDocumentId(null)
    setLifecycleMode(null)
    setLifecycleName('')
    setLifecycleFilePath('')
    setLifecycleCategory('general')
  }

  function openLifecycleComposer(
    mode: DocumentLifecycleMode,
    document: StudyOperationsDocumentsWorkspace['documents'][number],
  ) {
    setLifecycleDocumentId(document.id)
    setLifecycleMode(mode)
    setLifecycleName(document.name)
    setLifecycleFilePath(document.filePath)
    setLifecycleCategory(document.category)
  }

  function resetSignatureComposer() {
    setSigningDocumentId(null)
    setSignatureMeaning(DOCUMENT_SIGNATURE_MEANINGS[0])
    setSignaturePassword('')
    setSignaturePreviewAt(null)
  }

  function openSignatureComposer(documentId: string) {
    setSigningDocumentId(documentId)
    setSignatureMeaning(DOCUMENT_SIGNATURE_MEANINGS[0])
    setSignaturePassword('')
    setSignaturePreviewAt(new Date().toISOString())
  }

  function handleRegisterDocument() {
    startSavingTransition(() => {
      void (async () => {
        const result = await registerStudyDocument({
          studyId: workspace.studyId,
          name,
          filePath,
          category,
          version,
        })

        if (!result.success) {
          toast.error(
            typeof result.error === 'string' ? result.error : 'Unable to register document.',
          )
          return
        }

        toast.success(`Registered ${name} in ${workspace.studyTitle}.`)
        resetComposer()
        router.refresh()
      })()
    })
  }

  function handleSignDocument(documentId: string) {
    startSigningTransition(() => {
      void (async () => {
        const result = await signStudyDocument({
          studyId: workspace.studyId,
          documentId,
          signatureMeaning,
          password: signaturePassword,
        })

        if (!result.success) {
          toast.error(
            typeof result.error === 'string' ? result.error : 'Unable to capture signature.',
          )
          return
        }

        toast.success('Signature captured.')
        resetSignatureComposer()
        router.refresh()
      })()
    })
  }

  function handleUpdateDocument(documentId: string) {
    startLifecycleTransition(() => {
      void (async () => {
        const result = await updateStudyDocument({
          studyId: workspace.studyId,
          documentId,
          name: lifecycleName,
          filePath: lifecycleFilePath,
          category: lifecycleCategory,
        })

        if (!result.success) {
          toast.error(
            typeof result.error === 'string' ? result.error : 'Unable to update the document.',
          )
          return
        }

        toast.success('Document metadata updated.')
        resetLifecycleComposer()
        router.refresh()
      })()
    })
  }

  function handleCreateNextVersion(documentId: string) {
    startLifecycleTransition(() => {
      void (async () => {
        const result = await createStudyDocumentVersion({
          studyId: workspace.studyId,
          documentId,
          name: lifecycleName,
          filePath: lifecycleFilePath,
          category: lifecycleCategory,
        })

        if (!result.success) {
          toast.error(
            typeof result.error === 'string'
              ? result.error
              : 'Unable to create the next document version.',
          )
          return
        }

        toast.success(`Created version ${String(result.data.version)}.`)
        resetLifecycleComposer()
        router.refresh()
      })()
    })
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Documents"
          value={latestDocumentCount}
          detail="Current document families represented by their latest registered version."
        />
        <StatCard
          label="Signed documents"
          value={signedDocumentCount}
          detail="Documents that already have at least one immutable signature record."
        />
        <StatCard
          label="Signature records"
          value={totalSignatureCount}
          detail="All document-linked signatures currently visible in this study."
        />
        <StatCard
          label="Versioned families"
          value={versionedFamilyCount}
          detail="Current document families that now carry at least one older version in history."
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Document intake</CardTitle>
            <CardDescription>
              Record canonical file locations for protocol, consent, monitoring, and reporting
              artifacts without leaving the study workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {workspace.canManageDocuments ? (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-[color:var(--color-gray-700)]">
                    <span className="font-medium">Category</span>
                    <select
                      className={SELECT_CLASS_NAME}
                      disabled={isSaving}
                      value={category}
                      onChange={(event) => {
                        setCategory(event.target.value as StudyDocumentCategory)
                      }}
                    >
                      {STUDY_DOCUMENT_CATEGORIES.map((categoryOption) => (
                        <option key={categoryOption} value={categoryOption}>
                          {formatDocumentCategory(categoryOption)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2 text-sm text-[color:var(--color-gray-700)]">
                    <span className="font-medium">Version</span>
                    <Input
                      disabled={isSaving}
                      inputMode="numeric"
                      value={version}
                      onChange={(event) => {
                        setVersion(event.target.value)
                      }}
                    />
                  </label>
                </div>

                <label className="space-y-2 text-sm text-[color:var(--color-gray-700)]">
                  <span className="font-medium">Document name</span>
                  <Input
                    disabled={isSaving}
                    placeholder="Monitoring visit report 01"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value)
                    }}
                  />
                </label>

                <label className="space-y-2 text-sm text-[color:var(--color-gray-700)]">
                  <span className="font-medium">Canonical file path</span>
                  <Input
                    disabled={isSaving}
                    placeholder="study-documents/CDH-001/monitoring-visit-report-01.pdf"
                    value={filePath}
                    onChange={(event) => {
                      setFilePath(event.target.value)
                    }}
                  />
                </label>

                <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4 text-sm text-[color:var(--color-gray-700)]">
                  <p className="font-medium text-[color:var(--color-gray-900)]">
                    This register stores metadata only.
                  </p>
                  <p className="mt-2">
                    Upload the binary file to your storage bucket or repository first, then record
                    the stable path here for downstream review and signature workflows.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <Button disabled={isSaving} variant="outline" onClick={resetComposer}>
                    Reset
                  </Button>
                  <Button
                    disabled={
                      isSaving ||
                      name.trim().length < 3 ||
                      filePath.trim().length < 3 ||
                      Number(version) < 1
                    }
                    onClick={handleRegisterDocument}
                  >
                    {isSaving ? 'Registering...' : 'Register document'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4 text-sm text-[color:var(--color-gray-700)]">
                <p className="font-medium text-[color:var(--color-gray-900)]">
                  Read-only access for your current role
                </p>
                <p className="mt-2">
                  Document registration is limited to the study sponsor, data managers, and super
                  admins. Your current session role is{' '}
                  <span className="font-medium">
                    {workspace.viewerRole ? workspace.viewerRole.replaceAll('_', ' ') : 'unknown'}
                  </span>
                  .
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Register overview</CardTitle>
            <CardDescription>
              Review document coverage, signature readiness, and the latest recorded artifacts for
              this study.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4">
              <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                Unsigned backlog
              </p>
              <p className="mt-2 text-3xl font-semibold text-[color:var(--color-gray-900)]">
                {workspace.documents.length - signedDocumentCount}
              </p>
              <p className="mt-2 text-sm text-[color:var(--color-gray-600)]">
                Artifacts without any linked signature yet.
              </p>
            </div>
            <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4">
              <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                Latest registration
              </p>
              <p className="mt-2 text-lg font-semibold text-[color:var(--color-gray-900)]">
                {workspace.documents[0]?.name ?? 'No documents yet'}
              </p>
              <p className="mt-2 text-sm text-[color:var(--color-gray-600)]">
                {formatDateTime(workspace.documents[0]?.createdAt ?? null)}
              </p>
            </div>
            <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4">
              <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                Latest signature
              </p>
              <p className="mt-2 text-lg font-semibold text-[color:var(--color-gray-900)]">
                {workspace.documents.find((document) => document.latestSignedAt)
                  ?.latestSignedByName ?? 'No signatures yet'}
              </p>
              <p className="mt-2 text-sm text-[color:var(--color-gray-600)]">
                {formatDateTime(
                  workspace.documents.find((document) => document.latestSignedAt)?.latestSignedAt ??
                    null,
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Study documents</CardTitle>
          <CardDescription>
            Search the study register by artifact, uploader, or signature activity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] p-4 lg:grid-cols-[1fr_14rem_12rem_12rem_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[color:var(--color-gray-400)]" />
              <Input
                className="h-10 pl-10"
                placeholder="Search documents, uploaders, paths, or signature meaning"
                value={searchValue}
                onChange={(event) => {
                  setSearchValue(event.target.value)
                }}
              />
            </div>

            <select
              className={SELECT_CLASS_NAME}
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value as 'all' | StudyDocumentCategory)
              }}
            >
              <option value="all">All categories</option>
              {STUDY_DOCUMENT_CATEGORIES.map((categoryOption) => (
                <option key={categoryOption} value={categoryOption}>
                  {formatDocumentCategory(categoryOption)}
                </option>
              ))}
            </select>

            <select
              className={SELECT_CLASS_NAME}
              value={signatureFilter}
              onChange={(event) => {
                setSignatureFilter(event.target.value as 'all' | 'signed' | 'unsigned')
              }}
            >
              <option value="all">All signature states</option>
              <option value="signed">Signed only</option>
              <option value="unsigned">Unsigned only</option>
            </select>

            <select
              className={SELECT_CLASS_NAME}
              value={versionFilter}
              onChange={(event) => {
                setVersionFilter(event.target.value as 'all' | 'latest' | 'history')
              }}
            >
              <option value="latest">Latest versions</option>
              <option value="all">All versions</option>
              <option value="history">History only</option>
            </select>

            <Button
              disabled={activeFilterCount === 0}
              variant="outline"
              onClick={() => {
                setSearchValue('')
                setCategoryFilter('all')
                setSignatureFilter('all')
                setVersionFilter('latest')
              }}
            >
              Reset filters
            </Button>
          </div>

          <div className="flex flex-col gap-2 text-sm text-[color:var(--color-gray-600)] sm:flex-row sm:items-center sm:justify-between">
            <p>
              Showing {filteredDocuments.length} of {workspace.documents.length} document records.
            </p>
            <p>
              {activeFilterCount > 0
                ? `${String(activeFilterCount)} filters active`
                : 'No filters applied'}
            </p>
          </div>

          {filteredDocuments.length > 0 ? (
            filteredDocuments.map((document) => (
              <div
                key={document.id}
                className="rounded-2xl border border-[color:var(--color-gray-200)] bg-white px-4 py-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[color:var(--color-gray-900)]">
                        {document.name}
                      </p>
                      <Badge variant="muted">{formatDocumentCategory(document.category)}</Badge>
                      <Badge variant="default">v{document.version}</Badge>
                      <Badge variant={document.signatureCount > 0 ? 'success' : 'warning'}>
                        {document.signatureCount > 0 ? 'signed' : 'unsigned'}
                      </Badge>
                      <Badge variant={document.isLatestVersion ? 'success' : 'muted'}>
                        {document.isLatestVersion ? 'current' : 'superseded'}
                      </Badge>
                      {document.signatureCount > 0 ? <Badge variant="danger">locked</Badge> : null}
                    </div>
                    <p className="mt-2 font-[family-name:var(--font-mono)] text-xs text-[color:var(--color-gray-600)]">
                      {document.filePath}
                    </p>
                    <p className="mt-2 text-sm text-[color:var(--color-gray-600)]">
                      Version family: {document.familyVersionCount} record
                      {document.familyVersionCount === 1 ? '' : 's'} with latest v
                      {document.latestVersion}.
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm text-[color:var(--color-gray-700)] sm:grid-cols-2 lg:min-w-[24rem]">
                    <div className="rounded-xl bg-[color:var(--color-gray-50)] px-3 py-3">
                      <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                        Registered by
                      </p>
                      <p className="mt-1 font-medium">
                        {document.uploadedByName ?? 'System record'}
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--color-gray-600)]">
                        {document.uploadedByEmail ?? 'No direct uploader email'}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[color:var(--color-gray-50)] px-3 py-3">
                      <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                        Registered
                      </p>
                      <p className="mt-1 font-medium">{formatDateTime(document.createdAt)}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-[color:var(--color-gray-700)] md:grid-cols-3">
                  <div className="rounded-xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-3 py-3">
                    <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                      Signature records
                    </p>
                    <p className="mt-1 font-medium">{document.signatureCount}</p>
                  </div>
                  <div className="rounded-xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-3 py-3">
                    <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                      Latest signer
                    </p>
                    <p className="mt-1 font-medium">
                      {document.latestSignedByName ?? 'Not signed yet'}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--color-gray-600)]">
                      {document.latestSignedByEmail ?? 'No signer recorded'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-3 py-3">
                    <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                      Latest signature
                    </p>
                    <p className="mt-1 font-medium">{formatDateTime(document.latestSignedAt)}</p>
                    <p className="mt-1 text-xs text-[color:var(--color-gray-600)]">
                      {document.latestSignatureMeaning ?? 'No signature meaning recorded yet'}
                    </p>
                  </div>
                </div>

                {document.familyVersionCount > 1 ? (
                  <div className="mt-4 rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4">
                    <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                      Version history
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {document.versionHistory.map((versionEntry) => (
                        <div
                          key={versionEntry.id}
                          className="rounded-xl border border-[color:var(--color-gray-200)] bg-white px-3 py-3 text-sm text-[color:var(--color-gray-700)]"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">v{versionEntry.version}</span>
                            <Badge variant={versionEntry.isLatestVersion ? 'success' : 'muted'}>
                              {versionEntry.isLatestVersion ? 'current' : 'history'}
                            </Badge>
                            <Badge
                              variant={versionEntry.signatureCount > 0 ? 'success' : 'warning'}
                            >
                              {versionEntry.signatureCount > 0
                                ? `${String(versionEntry.signatureCount)} signed`
                                : 'unsigned'}
                            </Badge>
                          </div>
                          <p className="mt-2 text-xs text-[color:var(--color-gray-600)]">
                            {formatDateTime(versionEntry.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {workspace.canManageDocuments ? (
                  <div className="mt-4 rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm text-[color:var(--color-gray-700)]">
                        {document.signatureCount > 0
                          ? 'Signed document metadata is locked. Create a next version for downstream changes.'
                          : 'Unsigned document metadata can be corrected in place or branched into a new version.'}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          disabled={isManagingLifecycle || document.signatureCount > 0}
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            openLifecycleComposer('edit', document)
                          }}
                        >
                          Edit metadata
                        </Button>
                        <Button
                          disabled={isManagingLifecycle}
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            openLifecycleComposer('version', document)
                          }}
                        >
                          Next version
                        </Button>
                      </div>
                    </div>

                    {lifecycleDocumentId === document.id && lifecycleMode ? (
                      <div className="mt-4 space-y-4 rounded-2xl border border-[color:var(--color-gray-200)] bg-white px-4 py-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-medium text-[color:var(--color-gray-900)]">
                              {lifecycleMode === 'edit'
                                ? 'Edit document metadata'
                                : 'Create next document version'}
                            </p>
                            <p className="mt-1 text-sm text-[color:var(--color-gray-600)]">
                              {lifecycleMode === 'edit'
                                ? 'This updates the current unsigned record in place.'
                                : `This keeps version ${String(document.version)} intact and creates a new follow-on record.`}
                            </p>
                          </div>

                          <Button
                            disabled={isManagingLifecycle}
                            size="sm"
                            variant="outline"
                            onClick={resetLifecycleComposer}
                          >
                            Cancel
                          </Button>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="space-y-2 text-sm text-[color:var(--color-gray-700)]">
                            <span className="font-medium">Document name</span>
                            <Input
                              disabled={isManagingLifecycle || lifecycleMode === 'version'}
                              value={lifecycleName}
                              onChange={(event) => {
                                setLifecycleName(event.target.value)
                              }}
                            />
                          </label>

                          <label className="space-y-2 text-sm text-[color:var(--color-gray-700)]">
                            <span className="font-medium">
                              {lifecycleMode === 'edit' ? 'Current version' : 'Next version'}
                            </span>
                            <Input
                              disabled
                              value={
                                lifecycleMode === 'edit'
                                  ? `v${String(document.version)}`
                                  : `v${String(document.version + 1)}+`
                              }
                            />
                          </label>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="space-y-2 text-sm text-[color:var(--color-gray-700)]">
                            <span className="font-medium">Category</span>
                            <select
                              className={SELECT_CLASS_NAME}
                              disabled={isManagingLifecycle || lifecycleMode === 'version'}
                              value={lifecycleCategory}
                              onChange={(event) => {
                                setLifecycleCategory(event.target.value as StudyDocumentCategory)
                              }}
                            >
                              {STUDY_DOCUMENT_CATEGORIES.map((categoryOption) => (
                                <option key={categoryOption} value={categoryOption}>
                                  {formatDocumentCategory(categoryOption)}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="space-y-2 text-sm text-[color:var(--color-gray-700)]">
                            <span className="font-medium">Canonical file path</span>
                            <Input
                              disabled={isManagingLifecycle}
                              value={lifecycleFilePath}
                              onChange={(event) => {
                                setLifecycleFilePath(event.target.value)
                              }}
                            />
                          </label>
                        </div>

                        {lifecycleMode === 'version' ? (
                          <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4 text-sm text-[color:var(--color-gray-700)]">
                            Name and category stay fixed so the version family remains intact. Use
                            the canonical file path for the updated artifact location.
                          </div>
                        ) : null}

                        <div className="flex justify-end">
                          <Button
                            disabled={
                              isManagingLifecycle ||
                              lifecycleName.trim().length < 3 ||
                              lifecycleFilePath.trim().length < 3
                            }
                            onClick={() => {
                              if (lifecycleMode === 'edit') {
                                handleUpdateDocument(document.id)
                                return
                              }

                              handleCreateNextVersion(document.id)
                            }}
                          >
                            {(() => {
                              if (isManagingLifecycle) {
                                return lifecycleMode === 'edit' ? 'Saving...' : 'Creating...'
                              }

                              return lifecycleMode === 'edit'
                                ? 'Save metadata'
                                : 'Create next version'
                            })()}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {workspace.canSignDocuments ? (
                  <div className="mt-4 rounded-2xl border border-[color:var(--color-navy-100)] bg-[color:var(--color-navy-50)] px-4 py-4">
                    {signingDocumentId === document.id ? (
                      <div className="space-y-4 rounded-2xl border border-[color:var(--color-gray-200)] bg-[#fefefe] px-4 py-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-medium text-[color:var(--color-gray-900)]">
                              Electronic signature
                            </p>
                            <p className="mt-1 text-sm text-[color:var(--color-gray-600)]">
                              Re-enter your password to certify this document under your current
                              account.
                            </p>
                          </div>

                          <Button
                            disabled={isSigning}
                            size="sm"
                            variant="outline"
                            onClick={resetSignatureComposer}
                          >
                            Cancel
                          </Button>
                        </div>

                        <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4 text-sm text-[color:var(--color-gray-800)]">
                          <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
                            Certification meaning
                          </p>
                          <p className="mt-2 leading-6">{signatureMeaning}</p>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="space-y-2 text-sm text-[color:var(--color-gray-700)]">
                            <span className="font-medium">Meaning</span>
                            <select
                              className={SELECT_CLASS_NAME}
                              disabled={isSigning}
                              value={signatureMeaning}
                              onChange={(event) => {
                                setSignatureMeaning(event.target.value as DocumentSignatureMeaning)
                              }}
                            >
                              {DOCUMENT_SIGNATURE_MEANINGS.map((meaningOption) => (
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

                        <label className="space-y-2 text-sm text-[color:var(--color-gray-700)]">
                          <span className="font-medium">Password re-entry</span>
                          <Input
                            autoComplete="current-password"
                            disabled={isSigning}
                            placeholder="Re-enter your password"
                            type="password"
                            value={signaturePassword}
                            onChange={(event) => {
                              setSignaturePassword(event.target.value)
                            }}
                          />
                        </label>

                        <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4 text-sm text-[color:var(--color-gray-600)]">
                          <p>
                            By signing, you confirm that this electronic signature is legally
                            equivalent to your handwritten signature for this study record and will
                            be stored as an immutable audit event.
                          </p>
                          <p className="mt-2">
                            Signer: {workspace.viewerName ?? 'Current user'}{' '}
                            {workspace.viewerEmail ? `(${workspace.viewerEmail})` : ''}
                          </p>
                        </div>

                        <div className="flex justify-end">
                          <Button
                            disabled={isSigning || signaturePassword.trim().length === 0}
                            onClick={() => {
                              handleSignDocument(document.id)
                            }}
                          >
                            {isSigning ? 'Signing...' : 'Sign document'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-sm text-[color:var(--color-gray-700)]">
                          Capture a 21 CFR Part 11-style electronic signature for this document.
                        </div>

                        <Button
                          disabled={isSigning}
                          size="sm"
                          onClick={() => {
                            openSignatureComposer(document.id)
                          }}
                        >
                          Capture signature
                        </Button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <EmptyState
              title="No document records match the current filters"
              description="Adjust the search or filters to widen the current study register view."
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

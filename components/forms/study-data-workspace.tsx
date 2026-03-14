'use client'

import { useEffect, useState } from 'react'

import { EmptyState } from '@/components/data-display/EmptyState'
import { CrfDataEntryEditor } from '@/components/forms/crf-data-entry-editor'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'
import type {
  StudyDataEntry,
  StudyDataWorkspace,
  StudyFormTemplate,
  StudySubjectSummary,
} from '@/types'

const SUBJECT_STATUS_VARIANTS = {
  screened: 'muted',
  enrolled: 'success',
  randomized: 'default',
  completed: 'success',
  withdrawn: 'warning',
  screen_failed: 'danger',
} as const

const DATA_ENTRY_STATUS_VARIANTS = {
  draft: 'muted',
  submitted: 'default',
  locked: 'danger',
  sdv_required: 'warning',
  sdv_complete: 'success',
} as const

type StudyDataWorkspaceProps = {
  studyId: string
  data: StudyDataWorkspace
}

function getSubjectTemplateKey(subjectId: string, templateId: string) {
  return `${subjectId}:${templateId}`
}

function getEntrySortValue(entry: StudyDataEntry) {
  return entry.visitNumber
}

function getDefaultVisitNumber(template: StudyFormTemplate | null, entries: StudyDataEntry[]) {
  if (!template) {
    return 1
  }

  if (entries.length === 0) {
    return 1
  }

  if (template.visitSchedule?.repeatable) {
    return entries[entries.length - 1]?.visitNumber ?? 1
  }

  return entries[0]?.visitNumber ?? 1
}

/** Coordinates subject selection, published form selection, and the live eCRF data-entry editor. */
export function StudyDataWorkspace({ studyId, data }: StudyDataWorkspaceProps) {
  const {
    subjects,
    templates,
    queries,
    entries: initialEntries,
    canSignEntries,
    viewerName,
    viewerEmail,
  } = data
  const [entries, setEntries] = useState(initialEntries)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(subjects[0]?.id ?? null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    templates[0]?.id ?? null,
  )
  const [visitNumber, setVisitNumber] = useState(1)

  useEffect(() => {
    setEntries(initialEntries)
  }, [initialEntries])

  useEffect(() => {
    if (subjects.length === 0) {
      setSelectedSubjectId(null)
      return
    }

    if (!selectedSubjectId || !subjects.some((subject) => subject.id === selectedSubjectId)) {
      setSelectedSubjectId(subjects[0]?.id ?? null)
    }
  }, [selectedSubjectId, subjects])

  useEffect(() => {
    if (templates.length === 0) {
      setSelectedTemplateId(null)
      return
    }

    if (!selectedTemplateId || !templates.some((template) => template.id === selectedTemplateId)) {
      setSelectedTemplateId(templates[0]?.id ?? null)
    }
  }, [selectedTemplateId, templates])

  const entryListBySubjectTemplate = new Map<string, StudyDataEntry[]>()
  const openQueryCountByEntryId = new Map<string, number>()

  for (const entry of entries) {
    const key = getSubjectTemplateKey(entry.subjectId, entry.formTemplateId)
    const existingEntries = entryListBySubjectTemplate.get(key) ?? []
    existingEntries.push(entry)
    entryListBySubjectTemplate.set(key, existingEntries)
  }

  for (const entryList of entryListBySubjectTemplate.values()) {
    entryList.sort((left, right) => getEntrySortValue(left) - getEntrySortValue(right))
  }

  for (const query of queries) {
    if (query.status !== 'open') {
      continue
    }

    openQueryCountByEntryId.set(
      query.dataEntryId,
      (openQueryCountByEntryId.get(query.dataEntryId) ?? 0) + 1,
    )
  }

  const selectedSubject =
    subjects.find((subject) => subject.id === selectedSubjectId) ?? subjects[0] ?? null
  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ?? templates[0] ?? null

  function getEntriesForSelection(subjectId: string | null, templateId: string | null) {
    if (!subjectId || !templateId) {
      return []
    }

    return entryListBySubjectTemplate.get(getSubjectTemplateKey(subjectId, templateId)) ?? []
  }

  function syncVisitNumber(nextSubjectId: string | null, nextTemplateId: string | null) {
    const nextTemplate = templates.find((template) => template.id === nextTemplateId) ?? null
    const nextEntries = getEntriesForSelection(nextSubjectId, nextTemplateId)
    setVisitNumber(getDefaultVisitNumber(nextTemplate, nextEntries))
  }

  function handleSelectSubject(subject: StudySubjectSummary) {
    setSelectedSubjectId(subject.id)
    syncVisitNumber(subject.id, selectedTemplate?.id ?? null)
  }

  function handleSelectTemplate(template: StudyFormTemplate) {
    setSelectedTemplateId(template.id)
    syncVisitNumber(selectedSubject?.id ?? null, template.id)
  }

  function handleCreateNextVisit() {
    const matchingEntries = getEntriesForSelection(
      selectedSubject?.id ?? null,
      selectedTemplate?.id ?? null,
    )
    const nextVisitNumber = (matchingEntries[matchingEntries.length - 1]?.visitNumber ?? 0) + 1
    setVisitNumber(Math.max(1, nextVisitNumber))
  }

  function handleEntrySaved(savedEntry: StudyDataEntry) {
    setEntries((currentEntries) => {
      const nextEntries = currentEntries.filter((entry) => entry.id !== savedEntry.id)
      nextEntries.push(savedEntry)
      nextEntries.sort((left, right) => left.updatedAt.localeCompare(right.updatedAt))
      return nextEntries
    })

    setVisitNumber(savedEntry.visitNumber)
  }

  const matchingEntries = getEntriesForSelection(
    selectedSubject?.id ?? null,
    selectedTemplate?.id ?? null,
  )

  useEffect(() => {
    if (!selectedTemplate) {
      return
    }

    const nextVisitNumber = getDefaultVisitNumber(selectedTemplate, matchingEntries)
    const hasSelectedVisit = matchingEntries.some((entry) => entry.visitNumber === visitNumber)

    if (
      (!hasSelectedVisit || !selectedTemplate.visitSchedule?.repeatable) &&
      nextVisitNumber !== visitNumber
    ) {
      setVisitNumber(nextVisitNumber)
    }
  }, [matchingEntries, selectedTemplate, visitNumber])

  if (subjects.length === 0) {
    return (
      <EmptyState
        title="No subjects available for data capture"
        description="Enroll or seed at least one subject before site teams can enter eCRF responses for this study."
      />
    )
  }

  if (templates.length === 0) {
    return (
      <EmptyState
        title="No published CRFs available"
        description="Publish at least one study form before this workspace can capture eCRF data."
        actionHref={`/studies/${studyId}/forms`}
        actionLabel="Open form library"
      />
    )
  }

  const isSelectedTemplateRepeatable = selectedTemplate?.visitSchedule?.repeatable === true
  const selectedEntry =
    matchingEntries.find((entry) => entry.visitNumber === visitNumber) ??
    (isSelectedTemplateRepeatable ? null : (matchingEntries[0] ?? null))
  const currentQueries = matchingEntries.length
    ? queries.filter((query) => matchingEntries.some((entry) => entry.id === query.dataEntryId))
    : []

  return (
    <div className="grid gap-6 xl:grid-cols-[0.82fr_1.35fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader className="gap-4">
            <div>
              <CardTitle>Subject roster</CardTitle>
              <CardDescription>
                Choose the subject encounter you want to document in the eCRF workspace.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {subjects.map((subject) => {
              const subjectEntries = entries.filter((entry) => entry.subjectId === subject.id)
              const openSubjectQueries = queries.filter(
                (query) => query.subjectId === subject.id && query.status === 'open',
              ).length

              return (
                <button
                  key={subject.id}
                  type="button"
                  className={cn(
                    'w-full rounded-2xl border px-4 py-4 text-left transition-colors',
                    subject.id === selectedSubject?.id
                      ? 'border-[color:var(--color-navy-700)] bg-[color:var(--color-navy-50)]'
                      : 'border-[color:var(--color-gray-200)] bg-white hover:border-[color:var(--color-gray-300)]',
                  )}
                  onClick={() => {
                    handleSelectSubject(subject)
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[color:var(--color-gray-900)]">
                        {subject.subjectId}
                      </p>
                      <p className="mt-1 text-sm text-[color:var(--color-gray-600)]">
                        {subject.siteName}
                      </p>
                    </div>
                    <Badge variant={SUBJECT_STATUS_VARIANTS[subject.status]}>
                      {subject.status}
                    </Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="muted">{subject.siteCode}</Badge>
                    <Badge variant="muted">{String(subjectEntries.length)} entries</Badge>
                    <Badge variant={openSubjectQueries > 0 ? 'warning' : 'success'}>
                      {openSubjectQueries > 0
                        ? `${String(openSubjectQueries)} open queries`
                        : 'No open queries'}
                    </Badge>
                  </div>
                </button>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-4">
            <div>
              <CardTitle>Published CRFs</CardTitle>
              <CardDescription>
                Pick the form version to complete for the selected subject and visit instance.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {templates.map((template) => {
              const templateEntries = getEntriesForSelection(
                selectedSubject?.id ?? null,
                template.id,
              )
              const latestEntry = templateEntries[templateEntries.length - 1] ?? null
              const openTemplateQueries = templateEntries.reduce((count, entry) => {
                return count + (openQueryCountByEntryId.get(entry.id) ?? 0)
              }, 0)

              return (
                <button
                  key={template.id}
                  type="button"
                  className={cn(
                    'w-full rounded-2xl border px-4 py-4 text-left transition-colors',
                    template.id === selectedTemplate?.id
                      ? 'border-[color:var(--color-navy-700)] bg-[color:var(--color-navy-50)]'
                      : 'border-[color:var(--color-gray-200)] bg-white hover:border-[color:var(--color-gray-300)]',
                  )}
                  onClick={() => {
                    handleSelectTemplate(template)
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[color:var(--color-gray-900)]">
                        {template.name}
                      </p>
                      <p className="mt-1 text-sm text-[color:var(--color-gray-600)]">
                        {template.visitSchedule
                          ? template.visitSchedule.visitKey.replaceAll('_', ' ')
                          : 'unscheduled'}
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Badge variant="default">v{template.version}</Badge>
                      {latestEntry ? (
                        <Badge variant={DATA_ENTRY_STATUS_VARIANTS[latestEntry.status]}>
                          {latestEntry.status.replaceAll('_', ' ')}
                        </Badge>
                      ) : (
                        <Badge variant="muted">Not started</Badge>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="muted">{template.formType.replaceAll('_', ' ')}</Badge>
                    <Badge variant="muted">{String(templateEntries.length)} visits</Badge>
                    <Badge variant={openTemplateQueries > 0 ? 'warning' : 'success'}>
                      {openTemplateQueries > 0
                        ? `${String(openTemplateQueries)} open queries`
                        : 'No open queries'}
                    </Badge>
                  </div>
                </button>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {selectedSubject && selectedTemplate ? (
        <CrfDataEntryEditor
          canSignEntries={canSignEntries}
          studyId={studyId}
          subject={selectedSubject}
          template={selectedTemplate}
          entry={selectedEntry}
          entries={matchingEntries}
          queries={currentQueries}
          visitNumber={visitNumber}
          viewerEmail={viewerEmail}
          viewerName={viewerName}
          onVisitNumberChange={setVisitNumber}
          onCreateNextVisit={handleCreateNextVisit}
          onEntrySaved={handleEntrySaved}
        />
      ) : null}
    </div>
  )
}

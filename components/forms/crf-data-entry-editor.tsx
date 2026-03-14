'use client'

import type { SyntheticEvent } from 'react'
import { useEffect, useRef, useState, useTransition } from 'react'

import { useRouter } from 'next/navigation'

import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarDays, Plus, Save, Send } from 'lucide-react'
import { type Resolver, useForm, useFormContext } from 'react-hook-form'
import { toast } from 'react-hot-toast'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { saveStudyDataEntry } from '@/lib/actions/data-entries'
import { cn } from '@/lib/utils/cn'
import {
  buildCrfEntrySchema,
  createCrfEntryDefaultValues,
  getVisibleCrfFields,
  isReadOnlyDataEntryStatus,
} from '@/lib/utils/crf-entry'
import type {
  CrfEntryRecord,
  CrfField,
  StudyDataEntry,
  StudyDataQuery,
  StudyFormTemplate,
  StudySubjectSummary,
} from '@/types'

const SELECT_CLASS_NAME =
  'flex h-11 w-full rounded-xl border border-[color:var(--color-gray-200)] bg-white px-3 py-2 text-sm text-[color:var(--color-gray-900)] shadow-sm outline-none focus:border-[color:var(--color-navy-700)] focus:ring-2 focus:ring-[color:var(--color-navy-100)]'

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

const QUERY_STATUS_VARIANTS = {
  open: 'warning',
  answered: 'default',
  closed: 'success',
  cancelled: 'muted',
} as const

const QUERY_PRIORITY_VARIANTS = {
  low: 'muted',
  normal: 'default',
  high: 'danger',
} as const

type SaveMode = 'draft' | 'submit'

type CrfDataEntryEditorProps = {
  studyId: string
  subject: StudySubjectSummary
  template: StudyFormTemplate
  entry: StudyDataEntry | null
  entries: StudyDataEntry[]
  queries: StudyDataQuery[]
  visitNumber: number
  onVisitNumberChange: (visitNumber: number) => void
  onCreateNextVisit: () => void
  onEntrySaved: (entry: StudyDataEntry) => void
}

type CrfFieldEditorProps = {
  field: CrfField
  queries: StudyDataQuery[]
  disabled: boolean
}

function formatDateLabel(value: string | null) {
  if (!value) {
    return 'Not captured yet'
  }

  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(
    new Date(`${value}T00:00:00`),
  )
}

function formatTimestampLabel(value: string | null) {
  if (!value) {
    return 'Not yet submitted'
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getVisitScheduleLabel(template: StudyFormTemplate) {
  const visitKey = template.visitSchedule?.visitKey ?? 'unscheduled'
  const dayOffset = template.visitSchedule?.dayOffset
  const windowBefore = template.visitSchedule?.windowBefore
  const windowAfter = template.visitSchedule?.windowAfter

  const parts = [visitKey.replaceAll('_', ' ')]

  if (typeof dayOffset === 'number') {
    parts.push(`Day ${String(dayOffset)}`)
  }

  if (typeof windowBefore === 'number' || typeof windowAfter === 'number') {
    parts.push(`Window -${String(windowBefore ?? 0)}/+${String(windowAfter ?? 0)}`)
  }

  return parts.join(' • ')
}

function isFieldCompleted(field: CrfField, value: CrfEntryRecord[string]) {
  if (field.type === 'multiselect' || field.type === 'checkbox') {
    return Array.isArray(value) && value.length > 0
  }

  if (field.type === 'number') {
    return typeof value === 'number'
  }

  return typeof value === 'string' && value.trim().length > 0
}

function FieldQueries({ queries }: { queries: StudyDataQuery[] }) {
  if (queries.length === 0) {
    return null
  }

  return (
    <div className="space-y-2 rounded-2xl border border-[color:var(--color-warning-100)] bg-[color:var(--color-warning-50)] p-4">
      {queries.map((query) => (
        <div
          key={query.id}
          className="rounded-xl border border-[color:var(--color-warning-100)] bg-white px-3 py-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={QUERY_STATUS_VARIANTS[query.status]}>{query.status}</Badge>
            <Badge variant={QUERY_PRIORITY_VARIANTS[query.priority]}>{query.priority}</Badge>
          </div>
          <p className="mt-2 text-sm leading-6 text-[color:var(--color-gray-700)]">
            {query.queryText}
          </p>
          <p className="mt-2 text-xs text-[color:var(--color-gray-600)]">
            Updated {formatTimestampLabel(query.updatedAt)}
          </p>
        </div>
      ))}
    </div>
  )
}

function CrfFieldEditor({ field, queries, disabled }: CrfFieldEditorProps) {
  const form = useFormContext<CrfEntryRecord>()

  if (field.type === 'section_header') {
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-4">
        <p className="font-semibold text-[color:var(--color-gray-900)]">{field.label}</p>
        {field.description ? (
          <p className="mt-2 text-sm text-[color:var(--color-gray-600)]">{field.description}</p>
        ) : null}
      </div>
    )
  }

  return (
    <FormField
      control={form.control}
      name={field.id}
      render={({ field: rhfField }) => {
        const currentValue = rhfField.value

        return (
          <FormItem className="rounded-2xl border border-[color:var(--color-gray-200)] bg-white px-4 py-4">
            <FormLabel>
              {field.label}
              {field.required ? ' *' : ''}
            </FormLabel>

            {field.type === 'text' ? (
              <FormControl>
                <Input
                  disabled={disabled}
                  placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}`}
                  {...rhfField}
                  value={typeof currentValue === 'string' ? currentValue : ''}
                />
              </FormControl>
            ) : null}

            {field.type === 'textarea' ? (
              <FormControl>
                <Textarea
                  disabled={disabled}
                  placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}`}
                  {...rhfField}
                  value={typeof currentValue === 'string' ? currentValue : ''}
                />
              </FormControl>
            ) : null}

            {field.type === 'number' ? (
              <FormControl>
                <Input
                  disabled={disabled}
                  min={field.validation?.min}
                  max={field.validation?.max}
                  placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}`}
                  type="number"
                  name={rhfField.name}
                  ref={rhfField.ref}
                  value={typeof currentValue === 'number' ? currentValue : ''}
                  onBlur={rhfField.onBlur}
                  onChange={(event) => {
                    rhfField.onChange(
                      event.target.value === '' ? undefined : Number(event.target.value),
                    )
                  }}
                />
              </FormControl>
            ) : null}

            {field.type === 'date' ? (
              <FormControl>
                <Input
                  disabled={disabled}
                  type="date"
                  {...rhfField}
                  value={typeof currentValue === 'string' ? currentValue : ''}
                />
              </FormControl>
            ) : null}

            {field.type === 'select' ? (
              <FormControl>
                <select
                  className={SELECT_CLASS_NAME}
                  disabled={disabled}
                  name={rhfField.name}
                  ref={rhfField.ref}
                  value={typeof currentValue === 'string' ? currentValue : ''}
                  onBlur={rhfField.onBlur}
                  onChange={rhfField.onChange}
                >
                  <option value="">Select an option</option>
                  {(field.options ?? []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </FormControl>
            ) : null}

            {field.type === 'radio' ? (
              <FormControl>
                <div className="grid gap-2">
                  {(field.options ?? []).map((option) => (
                    <label
                      key={option}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border border-[color:var(--color-gray-200)] px-3 py-3 text-sm text-[color:var(--color-gray-700)]',
                        disabled && 'bg-[color:var(--color-gray-50)]',
                      )}
                    >
                      <input
                        checked={currentValue === option}
                        disabled={disabled}
                        name={rhfField.name}
                        type="radio"
                        value={option}
                        onBlur={rhfField.onBlur}
                        onChange={() => {
                          rhfField.onChange(option)
                        }}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </FormControl>
            ) : null}

            {field.type === 'multiselect' || field.type === 'checkbox' ? (
              <FormControl>
                <div className="grid gap-2">
                  {(field.options ?? []).map((option) => {
                    const selectedValues = Array.isArray(currentValue) ? currentValue : []
                    const isChecked = selectedValues.includes(option)

                    return (
                      <label
                        key={option}
                        className={cn(
                          'flex items-center gap-3 rounded-xl border border-[color:var(--color-gray-200)] px-3 py-3 text-sm text-[color:var(--color-gray-700)]',
                          disabled && 'bg-[color:var(--color-gray-50)]',
                        )}
                      >
                        <input
                          checked={isChecked}
                          disabled={disabled}
                          type="checkbox"
                          value={option}
                          onBlur={rhfField.onBlur}
                          onChange={() => {
                            const nextValues = isChecked
                              ? selectedValues.filter((item) => item !== option)
                              : [...selectedValues, option]

                            rhfField.onChange(nextValues)
                          }}
                        />
                        <span>{option}</span>
                      </label>
                    )
                  })}
                </div>
              </FormControl>
            ) : null}

            {field.description ? <FormDescription>{field.description}</FormDescription> : null}
            <FormMessage />
            <FieldQueries queries={queries} />
          </FormItem>
        )
      }}
    />
  )
}

/** Renders a live eCRF editor for one subject/form/visit combination, including draft save and submission. */
export function CrfDataEntryEditor({
  studyId,
  subject,
  template,
  entry,
  entries,
  queries,
  visitNumber,
  onVisitNumberChange,
  onCreateNextVisit,
  onEntrySaved,
}: CrfDataEntryEditorProps) {
  const router = useRouter()
  const submitModeRef = useRef<SaveMode>('draft')
  const [visitDate, setVisitDate] = useState(entry?.visitDate ?? '')
  const [isSaving, startSavingTransition] = useTransition()

  const form = useForm<CrfEntryRecord>({
    resolver: zodResolver(buildCrfEntrySchema(template.schema.fields)) as Resolver<CrfEntryRecord>,
    defaultValues: createCrfEntryDefaultValues(template.schema.fields, entry?.data),
    mode: 'onTouched',
    shouldUnregister: true,
  })

  useEffect(() => {
    form.reset(createCrfEntryDefaultValues(template.schema.fields, entry?.data))
    setVisitDate(entry?.visitDate ?? '')
  }, [
    entry?.data,
    entry?.id,
    entry?.updatedAt,
    entry?.visitDate,
    form,
    template.schema.fields,
    visitNumber,
  ])

  const watchedValues = form.watch()
  const visibleFields = getVisibleCrfFields(template.schema.fields, watchedValues)
  const visibleDataFields = visibleFields.filter((field) => field.type !== 'section_header')
  const completedFieldCount = visibleDataFields.filter((field) =>
    isFieldCompleted(field, watchedValues[field.id]),
  ).length
  const entryQueries = entry ? queries.filter((query) => query.dataEntryId === entry.id) : []
  const openQueryCount = entryQueries.filter((query) => query.status === 'open').length
  const isFormReadOnly = Boolean(entry && isReadOnlyDataEntryStatus(entry.status))
  const isRepeatable = Boolean(template.visitSchedule?.repeatable)

  function handleStartSave(mode: SaveMode) {
    submitModeRef.current = mode
  }

  function handleSubmit(values: CrfEntryRecord) {
    startSavingTransition(() => {
      void (async () => {
        const saveMode = submitModeRef.current
        const result = await saveStudyDataEntry({
          id: entry?.id,
          studyId,
          subjectId: subject.id,
          formTemplateId: template.id,
          visitNumber,
          visitDate,
          saveMode,
          data: values,
        })

        if (!result.success) {
          if (typeof result.error === 'object') {
            Object.entries(result.error).forEach(([fieldName, messages]) => {
              form.setError(fieldName, {
                message: messages[0] ?? 'Invalid value',
              })
            })

            toast.error('Fix the highlighted eCRF issues before saving.')
            return
          }

          toast.error(result.error)
          return
        }

        onEntrySaved(result.data)
        setVisitDate(result.data.visitDate ?? '')
        toast.success(saveMode === 'submit' ? 'Data entry submitted.' : 'Draft saved.')
        router.refresh()
      })()
    })
  }

  function handleFormSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    void form.handleSubmit(handleSubmit)(event)
  }

  return (
    <Card>
      <CardHeader className="gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={SUBJECT_STATUS_VARIANTS[subject.status]}>{subject.status}</Badge>
              <Badge variant="muted">{subject.siteCode}</Badge>
              <Badge variant="muted">{template.formType.replaceAll('_', ' ')}</Badge>
            </div>
            <CardTitle className="mt-3">
              {template.name} for subject {subject.subjectId}
            </CardTitle>
            <CardDescription className="mt-2 max-w-3xl">
              Capture source-backed eCRF responses for {subject.siteName}. This screen validates the
              rendered CRF against the published template before saving.
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="default">v{template.version}</Badge>
            <Badge variant={DATA_ENTRY_STATUS_VARIANTS[entry?.status ?? 'draft']}>
              {entry?.status.replaceAll('_', ' ') ?? 'new draft'}
            </Badge>
            <Badge variant={openQueryCount > 0 ? 'warning' : 'success'}>
              {openQueryCount > 0 ? `${String(openQueryCount)} open queries` : 'No open queries'}
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-3">
            <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
              Visit schedule
            </p>
            <p className="mt-2 font-medium text-[color:var(--color-gray-900)]">
              {getVisitScheduleLabel(template)}
            </p>
          </div>

          <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-3">
            <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
              Completion
            </p>
            <p className="mt-2 font-medium text-[color:var(--color-gray-900)]">
              {String(completedFieldCount)} of {String(visibleDataFields.length)} visible fields
            </p>
          </div>

          <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-3">
            <p className="text-xs tracking-[0.08em] text-[color:var(--color-gray-600)] uppercase">
              Last submission
            </p>
            <p className="mt-2 font-medium text-[color:var(--color-gray-900)]">
              {formatTimestampLabel(entry?.submittedAt ?? null)}
            </p>
          </div>
        </div>

        {isFormReadOnly ? (
          <div className="rounded-2xl border border-[color:var(--color-danger-100)] bg-[color:var(--color-danger-50)] px-4 py-3 text-sm text-[color:var(--color-danger-700)]">
            This data entry is locked. It can be reviewed here, but responses can no longer be
            changed.
          </div>
        ) : null}

        {template.schema.description ? (
          <div className="rounded-2xl border border-[color:var(--color-navy-100)] bg-[color:var(--color-navy-50)] px-4 py-3 text-sm leading-6 text-[color:var(--color-gray-700)]">
            {template.schema.description}
          </div>
        ) : null}
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form className="space-y-6" onSubmit={handleFormSubmit} noValidate>
            <fieldset
              disabled={isSaving || isFormReadOnly}
              className="m-0 min-w-0 space-y-6 border-0 p-0"
            >
              <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="mb-2 block">Visit number</Label>
                      <Input
                        min={1}
                        disabled={!isRepeatable || isSaving || isFormReadOnly}
                        type="number"
                        value={visitNumber}
                        onChange={(event) => {
                          onVisitNumberChange(Math.max(1, Number(event.target.value) || 1))
                        }}
                      />
                    </div>

                    <div>
                      <Label className="mb-2 block">Visit date</Label>
                      <Input
                        type="date"
                        value={visitDate}
                        onChange={(event) => {
                          setVisitDate(event.target.value)
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="muted">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDateLabel(visitDate || null)}
                    </Badge>
                    {isRepeatable ? (
                      <Button size="sm" variant="outline" onClick={onCreateNextVisit}>
                        <Plus className="mr-2 h-4 w-4" />
                        New visit
                      </Button>
                    ) : null}
                  </div>
                </div>

                {entries.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {entries.map((item) => (
                      <Button
                        key={item.id}
                        size="sm"
                        variant={item.visitNumber === visitNumber ? 'default' : 'outline'}
                        onClick={() => {
                          onVisitNumberChange(item.visitNumber)
                        }}
                      >
                        Visit {String(item.visitNumber)}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="space-y-4">
                {visibleFields.map((field) => (
                  <CrfFieldEditor
                    key={field.id}
                    field={field}
                    disabled={isSaving || isFormReadOnly}
                    queries={
                      entry ? entryQueries.filter((query) => query.fieldId === field.id) : []
                    }
                  />
                ))}
              </div>
            </fieldset>

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={isSaving || isFormReadOnly}
                onClick={() => {
                  handleStartSave('draft')
                }}
                type="submit"
              >
                <Save className="mr-2 h-4 w-4" />
                Save draft
              </Button>
              <Button
                size="sm"
                disabled={isSaving || isFormReadOnly}
                onClick={() => {
                  handleStartSave('submit')
                }}
                type="submit"
              >
                <Send className="mr-2 h-4 w-4" />
                Submit for review
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

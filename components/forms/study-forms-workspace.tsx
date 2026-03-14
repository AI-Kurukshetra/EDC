'use client'

import type { ReactNode, SyntheticEvent } from 'react'
import { useEffect, useRef, useState, useTransition } from 'react'

import { useRouter } from 'next/navigation'

import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowDown, ArrowUp, CopyPlus, Eye, FilePlus2, Save, Send, Trash2 } from 'lucide-react'
import { type Resolver, useFieldArray, useForm } from 'react-hook-form'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { saveStudyFormTemplate } from '@/lib/actions/form-templates'
import { cn } from '@/lib/utils/cn'
import {
  createDefaultCrfField,
  createEmptyStudyFormTemplate,
  createNextFormTemplateVersion,
  createUniqueFieldId,
  evaluateCrfCondition,
  fieldSupportsNumericLimits,
  fieldSupportsOptions,
  fieldSupportsPlaceholder,
  fieldSupportsTextLimits,
  getPreviewSeedValues,
  parseOptionList,
  serializeOptionList,
} from '@/lib/utils/crf-builder'
import {
  SaveStudyFormTemplateSchema,
  type SaveStudyFormTemplateInput,
} from '@/lib/validations/form-template.schema'
import {
  CRF_CONDITION_OPERATORS,
  CRF_FIELD_TYPES,
  FORM_TEMPLATE_TYPES,
  type CrfConditionOperator,
  type CrfField,
  type CrfFieldCondition,
  type CrfFieldType,
  type StudyFormTemplateDraft,
  type StudyFormTemplate,
} from '@/types'

const SELECT_CLASS_NAME =
  'flex h-11 w-full rounded-xl border border-[color:var(--color-gray-200)] bg-white px-3 py-2 text-sm text-[color:var(--color-gray-900)] shadow-sm outline-none focus:border-[color:var(--color-navy-700)] focus:ring-2 focus:ring-[color:var(--color-navy-100)]'

const FIELD_TYPE_LABELS = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  select: 'Select',
  multiselect: 'Multi-select',
  radio: 'Radio group',
  checkbox: 'Checkboxes',
  textarea: 'Textarea',
  section_header: 'Section header',
} satisfies Record<CrfFieldType, string>

type BuilderTab = 'builder' | 'schedule' | 'preview'

type StudyFormsWorkspaceProps = {
  studyId: string
  templates: StudyFormTemplate[]
}

type SaveMode = 'draft' | 'publish'
type StudyFormsWorkspaceFieldValues = SaveStudyFormTemplateInput['schema']['fields'][number]

function toFieldArrayIndex(index: number): `${number}` {
  return String(index) as `${number}`
}

function normalizeConditionValue(
  condition: CrfFieldCondition | StudyFormsWorkspaceFieldValues['condition'],
): CrfFieldCondition | undefined {
  if (!condition || condition.fieldId.length === 0 || typeof condition.value !== 'string') {
    return undefined
  }

  return {
    fieldId: condition.fieldId,
    operator: condition.operator,
    value: condition.value,
  }
}

function normalizeFieldValue(
  field: Partial<StudyFormsWorkspaceFieldValues> | CrfField | undefined,
  fallbackId: string,
): StudyFormsWorkspaceFieldValues {
  return {
    id: field?.id ?? fallbackId,
    label: field?.label ?? 'Untitled field',
    type: field?.type ?? 'text',
    required: field?.required ?? false,
    description: field?.description ?? undefined,
    placeholder: field?.placeholder ?? undefined,
    options: field?.options ?? [],
    validation: {
      min: field?.validation?.min ?? undefined,
      max: field?.validation?.max ?? undefined,
      minLength: field?.validation?.minLength ?? undefined,
      maxLength: field?.validation?.maxLength ?? undefined,
      pattern: field?.validation?.pattern ?? undefined,
    },
    condition: normalizeConditionValue(field?.condition),
  }
}

function normalizeFormValues(
  template: SaveStudyFormTemplateInput | StudyFormTemplate | StudyFormTemplateDraft,
): SaveStudyFormTemplateInput {
  return {
    id: 'id' in template ? template.id : undefined,
    studyId: template.studyId,
    name: template.name,
    formType: template.formType,
    version: template.version,
    isPublished: template.isPublished,
    schema: {
      description: template.schema.description ?? undefined,
      fields: template.schema.fields.map((field, index) =>
        normalizeFieldValue(field, `field_${String(index + 1)}`),
      ),
    },
    visitSchedule: {
      visitKey: template.visitSchedule?.visitKey ?? 'unscheduled',
      dayOffset: template.visitSchedule?.dayOffset ?? undefined,
      windowBefore: template.visitSchedule?.windowBefore ?? undefined,
      windowAfter: template.visitSchedule?.windowAfter ?? undefined,
      repeatable: template.visitSchedule?.repeatable ?? false,
    },
  }
}

/** Provides the CRF builder workspace for form-template authoring, preview, and publishing. */
export function StudyFormsWorkspace({ studyId, templates }: StudyFormsWorkspaceProps) {
  const router = useRouter()
  const submitModeRef = useRef<SaveMode>('draft')
  const [activeTab, setActiveTab] = useState<BuilderTab>('builder')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    templates[0]?.id ?? null,
  )
  const [draftTemplate, setDraftTemplate] = useState<SaveStudyFormTemplateInput | null>(null)
  const [isSaving, startSavingTransition] = useTransition()

  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? null
  const initialTemplateValues = selectedTemplate
    ? normalizeFormValues(selectedTemplate)
    : normalizeFormValues(createEmptyStudyFormTemplate(studyId))

  const form = useForm<SaveStudyFormTemplateInput>({
    resolver: zodResolver(SaveStudyFormTemplateSchema) as Resolver<SaveStudyFormTemplateInput>,
    defaultValues: initialTemplateValues,
    mode: 'onTouched',
  })

  const fields = useFieldArray({
    control: form.control,
    name: 'schema.fields',
  })

  const watchedValues = form.watch()
  const watchedFields = watchedValues.schema.fields.map((field, index) =>
    normalizeFieldValue(field, fields.fields[index]?.id ?? `field_${String(index + 1)}`),
  )
  const previewValues = getPreviewSeedValues({
    description: watchedValues.schema.description,
    fields: watchedFields,
  })
  const hasValidationIssues = Object.keys(form.formState.errors).length > 0
  const isPublishedTemplateLocked = Boolean(selectedTemplate?.isPublished && !draftTemplate)
  const isEditorDisabled = isSaving || isPublishedTemplateLocked

  useEffect(() => {
    const matchingTemplate = selectedTemplateId
      ? templates.find((template) => template.id === selectedTemplateId)
      : null

    if (draftTemplate) {
      form.reset(draftTemplate)
      return
    }

    if (matchingTemplate) {
      form.reset(normalizeFormValues(matchingTemplate))
      return
    }

    form.reset(normalizeFormValues(createEmptyStudyFormTemplate(studyId)))
  }, [draftTemplate, form, selectedTemplateId, studyId, templates])

  useEffect(() => {
    if (!draftTemplate?.id) {
      return
    }

    if (templates.some((template) => template.id === draftTemplate.id)) {
      setDraftTemplate(null)
    }
  }, [draftTemplate, templates])

  function handleSelectTemplate(templateId: string) {
    setDraftTemplate(null)
    setSelectedTemplateId(templateId)
  }

  function handleCreateTemplate() {
    setSelectedTemplateId(null)
    setDraftTemplate(normalizeFormValues(createEmptyStudyFormTemplate(studyId)))
    setActiveTab('builder')
  }

  function handleCreateNextVersion() {
    if (!selectedTemplate) {
      return
    }

    setSelectedTemplateId(null)
    setDraftTemplate(normalizeFormValues(createNextFormTemplateVersion(selectedTemplate)))
    setActiveTab('builder')
  }

  function handleAddField(type: CrfFieldType) {
    const existingIds = fields.fields.map((field) => field.id)
    fields.append(
      normalizeFieldValue(
        createDefaultCrfField(type, existingIds),
        `field_${String(fields.fields.length + 1)}`,
      ),
    )
    setActiveTab('builder')
  }

  function handleDuplicateField(index: number) {
    const fieldPathIndex = toFieldArrayIndex(index)
    const field = form.getValues(`schema.fields.${fieldPathIndex}`)

    const otherIds = form
      .getValues('schema.fields')
      .map((item) => item.id)
      .filter((id) => id !== field.id)

    fields.insert(index + 1, {
      ...normalizeFieldValue(field, `field_${String(index + 2)}`),
      id: createUniqueFieldId(`${field.id}_copy`, otherIds),
      label: `${field.label} copy`,
    })
  }

  function handleFieldTypeChange(index: number, type: CrfFieldType) {
    const fieldPathIndex = toFieldArrayIndex(index)
    const currentField = form.getValues(`schema.fields.${fieldPathIndex}`)

    const otherIds = form
      .getValues('schema.fields')
      .map((field) => field.id)
      .filter((fieldId) => fieldId !== currentField.id)
    const defaultField = createDefaultCrfField(type, otherIds)

    fields.update(index, {
      ...normalizeFieldValue(defaultField, currentField.id),
      id: currentField.id,
      label: currentField.label,
      condition: currentField.condition,
    })
  }

  function handleOptionListChange(index: number, rawValue: string) {
    const fieldPathIndex = toFieldArrayIndex(index)

    form.setValue(`schema.fields.${fieldPathIndex}.options`, parseOptionList(rawValue), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
  }

  function handleConditionSourceChange(index: number, fieldId: string) {
    const fieldPathIndex = toFieldArrayIndex(index)

    if (!fieldId) {
      form.setValue(`schema.fields.${fieldPathIndex}.condition`, undefined, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
      return
    }

    form.setValue(
      `schema.fields.${fieldPathIndex}.condition`,
      {
        fieldId,
        operator: 'equals',
        value: '',
      },
      {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      },
    )
  }

  function handleRegenerateFieldId(index: number) {
    const fieldPathIndex = toFieldArrayIndex(index)
    const label = form.getValues(`schema.fields.${fieldPathIndex}.label`)
    const currentId = form.getValues(`schema.fields.${fieldPathIndex}.id`)
    const otherIds = form
      .getValues('schema.fields')
      .map((field) => field.id)
      .filter((fieldId) => fieldId !== currentId)

    form.setValue(`schema.fields.${fieldPathIndex}.id`, createUniqueFieldId(label, otherIds), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
  }

  function handleStartSave(mode: SaveMode) {
    submitModeRef.current = mode
  }

  function handleSubmit(values: SaveStudyFormTemplateInput) {
    const saveMode = submitModeRef.current

    startSavingTransition(() => {
      void (async () => {
        const result = await saveStudyFormTemplate({
          ...values,
          isPublished: saveMode === 'publish',
        })

        if (!result.success) {
          if (typeof result.error === 'object') {
            Object.entries(result.error).forEach(([field, messages]) => {
              form.setError(field as keyof SaveStudyFormTemplateInput, {
                message: messages[0] ?? 'Invalid value',
              })
            })

            toast.error('Fix the highlighted form-template issues.')
            return
          }

          toast.error(result.error)
          return
        }

        const nextValues = {
          ...values,
          id: result.data.id,
          isPublished: result.data.isPublished,
        }

        setDraftTemplate(normalizeFormValues(nextValues))
        setSelectedTemplateId(result.data.id)
        toast.success(saveMode === 'publish' ? 'Template published.' : 'Template saved.')
        router.refresh()
      })()
    })
  }

  function handleFormSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    void form.handleSubmit(handleSubmit)(event)
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.35fr]">
      <Card className="h-fit">
        <CardHeader className="gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Template library</CardTitle>
              <CardDescription>
                Switch between published CRFs, draft versions, or start a new template.
              </CardDescription>
            </div>
            <Button size="sm" onClick={handleCreateTemplate}>
              <FilePlus2 className="mr-2 h-4 w-4" />
              New template
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-dashed border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-[color:var(--color-gray-900)]">Working draft</p>
                <p className="text-sm text-[color:var(--color-gray-600)]">
                  Start a brand-new CRF or fork the selected published template into the next
                  version.
                </p>
              </div>
              {selectedTemplate?.isPublished ? (
                <Button size="sm" variant="outline" onClick={handleCreateNextVersion}>
                  <CopyPlus className="mr-2 h-4 w-4" />
                  Next version
                </Button>
              ) : null}
            </div>
          </div>

          {templates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[color:var(--color-gray-200)] bg-white p-5 text-sm text-[color:var(--color-gray-600)]">
              No templates exist for this study yet. Create the first enrollment, visit, or
              completion CRF from the builder.
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={cn(
                    'w-full rounded-2xl border px-4 py-4 text-left transition-colors',
                    selectedTemplateId === template.id
                      ? 'border-[color:var(--color-navy-700)] bg-[color:var(--color-navy-50)]'
                      : 'border-[color:var(--color-gray-200)] bg-white hover:border-[color:var(--color-gray-300)]',
                  )}
                  onClick={() => {
                    handleSelectTemplate(template.id)
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[color:var(--color-gray-900)]">
                        {template.name}
                      </p>
                      <p className="mt-1 text-sm text-[color:var(--color-gray-600)]">
                        {template.schema.fields.length} fields
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Badge variant={template.isPublished ? 'success' : 'muted'}>
                        {template.isPublished ? 'Published' : 'Draft'}
                      </Badge>
                      <Badge variant="default">v{template.version}</Badge>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="muted">{template.formType.replace('_', ' ')}</Badge>
                    {template.visitSchedule?.visitKey ? (
                      <Badge variant="muted">{template.visitSchedule.visitKey}</Badge>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Form {...form}>
        <form className="space-y-6" onSubmit={handleFormSubmit} noValidate>
          <fieldset disabled={isEditorDisabled} className="m-0 min-w-0 border-0 p-0">
            <Card>
              <CardHeader className="gap-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle>CRF builder</CardTitle>
                    <CardDescription>
                      Configure metadata, arrange fields, define visit timing, and preview what site
                      teams will complete.
                    </CardDescription>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isEditorDisabled}
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
                      disabled={isEditorDisabled}
                      onClick={() => {
                        handleStartSave('publish')
                      }}
                      type="submit"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Save and publish
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Template name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Demographics CRF" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="formType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Form type</FormLabel>
                        <FormControl>
                          <select
                            className={SELECT_CLASS_NAME}
                            name={field.name}
                            ref={field.ref}
                            value={field.value}
                            onBlur={field.onBlur}
                            onChange={field.onChange}
                          >
                            {FORM_TEMPLATE_TYPES.map((formType) => (
                              <option key={formType} value={formType}>
                                {formType.replace('_', ' ')}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="version"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Version</FormLabel>
                        <FormControl>
                          <Input
                            min={1}
                            name={field.name}
                            ref={field.ref}
                            type="number"
                            value={field.value}
                            onBlur={field.onBlur}
                            onChange={(event) => {
                              field.onChange(Number(event.target.value))
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Increment when publishing a protocol revision.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="schema.description"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Builder note</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Explain how this CRF should be completed or reviewed."
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {hasValidationIssues ? (
                  <div className="rounded-2xl border border-[color:var(--color-danger-100)] bg-[color:var(--color-danger-100)]/40 px-4 py-3 text-sm text-[color:var(--color-danger-700)]">
                    Fix the highlighted validation issues before saving or publishing this template.
                  </div>
                ) : null}

                {isPublishedTemplateLocked ? (
                  <div className="rounded-2xl border border-[color:var(--color-warning-100)] bg-[color:var(--color-warning-50)] px-4 py-3 text-sm text-[color:var(--color-warning-700)]">
                    Published templates are locked to preserve version history. Use{' '}
                    <span className="font-medium">Next version</span> to create a draft before
                    editing.
                  </div>
                ) : null}
              </CardHeader>
            </Card>
          </fieldset>

          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value as BuilderTab)
            }}
          >
            <TabsList>
              <TabsTrigger value="builder">Builder</TabsTrigger>
              <TabsTrigger value="schedule">Visit schedule</TabsTrigger>
              <TabsTrigger value="preview">Live preview</TabsTrigger>
            </TabsList>

            <TabsContent value="builder" className="space-y-6">
              <fieldset disabled={isEditorDisabled} className="m-0 min-w-0 space-y-6 border-0 p-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Field palette</CardTitle>
                    <CardDescription>
                      Add building blocks to the template and then tune them below.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {CRF_FIELD_TYPES.map((fieldType) => (
                      <Button
                        key={fieldType}
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          handleAddField(fieldType)
                        }}
                        type="button"
                      >
                        <FilePlus2 className="mr-2 h-4 w-4" />
                        {FIELD_TYPE_LABELS[fieldType]}
                      </Button>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <CardTitle>Field canvas</CardTitle>
                        <CardDescription>
                          Reorder questions, define validation rules, and attach conditional display
                          logic.
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="default">{watchedFields.length} total fields</Badge>
                        <Badge variant="muted">
                          {watchedFields.filter((field) => field.required).length} required
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {fields.fields.map((field, index) => {
                      const fieldPathIndex = toFieldArrayIndex(index)
                      const liveField = watchedFields[index]
                      const fieldType = liveField?.type ?? 'text'
                      const condition = liveField?.condition
                      const fieldId = liveField?.id
                      const previousFieldOptions = watchedFields
                        .slice(0, index)
                        .filter((item) => item.type !== 'section_header')

                      return (
                        <div
                          key={field.id}
                          className="rounded-3xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] p-5"
                        >
                          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-[color:var(--color-gray-900)]">
                                Field {index + 1}
                              </p>
                              <p className="text-sm text-[color:var(--color-gray-600)]">
                                {FIELD_TYPE_LABELS[fieldType]}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={index === 0}
                                onClick={() => {
                                  fields.move(index, index - 1)
                                }}
                                type="button"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={index === fields.fields.length - 1}
                                onClick={() => {
                                  fields.move(index, index + 1)
                                }}
                                type="button"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  handleDuplicateField(index)
                                }}
                                type="button"
                              >
                                <CopyPlus className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  fields.remove(index)
                                }}
                                type="button"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                              control={form.control}
                              name={`schema.fields.${fieldPathIndex}.label`}
                              render={({ field: labelField }) => (
                                <FormItem>
                                  <FormLabel>Label</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Field label" {...labelField} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`schema.fields.${fieldPathIndex}.type`}
                              render={({ field: typeField }) => (
                                <FormItem>
                                  <FormLabel>Field type</FormLabel>
                                  <FormControl>
                                    <select
                                      className={SELECT_CLASS_NAME}
                                      name={typeField.name}
                                      ref={typeField.ref}
                                      value={typeField.value}
                                      onBlur={typeField.onBlur}
                                      onChange={(event) => {
                                        handleFieldTypeChange(
                                          index,
                                          event.target.value as CrfFieldType,
                                        )
                                      }}
                                    >
                                      {CRF_FIELD_TYPES.map((value) => (
                                        <option key={value} value={value}>
                                          {FIELD_TYPE_LABELS[value]}
                                        </option>
                                      ))}
                                    </select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
                            <FormField
                              control={form.control}
                              name={`schema.fields.${fieldPathIndex}.id`}
                              render={({ field: idField }) => (
                                <FormItem>
                                  <FormLabel>Field id</FormLabel>
                                  <FormControl>
                                    <Input placeholder="subject_weight" {...idField} />
                                  </FormControl>
                                  <FormDescription>
                                    Stable identifier used in exports, validation rules, and query
                                    generation.
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="flex items-end">
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full md:w-auto"
                                onClick={() => {
                                  handleRegenerateFieldId(index)
                                }}
                                type="button"
                              >
                                Regenerate
                              </Button>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <FormField
                              control={form.control}
                              name={`schema.fields.${fieldPathIndex}.description`}
                              render={({ field: descriptionField }) => (
                                <FormItem>
                                  <FormLabel>Help text</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Guide the site coordinator or CRA."
                                      {...descriptionField}
                                      value={descriptionField.value ?? ''}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`schema.fields.${fieldPathIndex}.required`}
                              render={({ field: requiredField }) => (
                                <FormItem className="rounded-2xl border border-[color:var(--color-gray-200)] bg-white p-4">
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <FormLabel>Required field</FormLabel>
                                      <FormDescription>
                                        Mark whether this response must be completed before
                                        submission.
                                      </FormDescription>
                                    </div>
                                    <FormControl>
                                      <input
                                        checked={requiredField.value}
                                        className="h-4 w-4 rounded border-[color:var(--color-gray-300)] text-[color:var(--color-navy-800)] focus:ring-[color:var(--color-navy-700)]"
                                        name={requiredField.name}
                                        ref={requiredField.ref}
                                        type="checkbox"
                                        onBlur={requiredField.onBlur}
                                        onChange={(event) => {
                                          requiredField.onChange(event.target.checked)
                                        }}
                                      />
                                    </FormControl>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="space-y-4">
                              {fieldSupportsPlaceholder(fieldType) ? (
                                <FormField
                                  control={form.control}
                                  name={`schema.fields.${fieldPathIndex}.placeholder`}
                                  render={({ field: placeholderField }) => (
                                    <FormItem>
                                      <FormLabel>Placeholder</FormLabel>
                                      <FormControl>
                                        <Input
                                          placeholder="Optional placeholder"
                                          {...placeholderField}
                                          value={placeholderField.value ?? ''}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              ) : null}
                            </div>
                          </div>

                          {fieldSupportsOptions(fieldType) ? (
                            <div className="mt-4">
                              <FormField
                                control={form.control}
                                name={`schema.fields.${fieldPathIndex}.options`}
                                render={({ field: optionsField }) => (
                                  <FormItem>
                                    <FormLabel>Options</FormLabel>
                                    <FormControl>
                                      <Textarea
                                        placeholder={'One option per line\nYes\nNo'}
                                        value={serializeOptionList(optionsField.value)}
                                        onChange={(event) => {
                                          handleOptionListChange(index, event.target.value)
                                        }}
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      Enter one response choice per line. These choices drive
                                      selects, radio groups, and checkbox lists.
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          ) : null}

                          {fieldSupportsNumericLimits(fieldType) ||
                          fieldSupportsTextLimits(fieldType) ? (
                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                              {fieldSupportsNumericLimits(fieldType) ? (
                                <>
                                  <FormField
                                    control={form.control}
                                    name={`schema.fields.${fieldPathIndex}.validation.min`}
                                    render={({ field: minField }) => (
                                      <FormItem>
                                        <FormLabel>Minimum</FormLabel>
                                        <FormControl>
                                          <Input
                                            placeholder="Optional minimum"
                                            type="number"
                                            value={minField.value ?? ''}
                                            onChange={(event) => {
                                              minField.onChange(
                                                event.target.value === ''
                                                  ? undefined
                                                  : Number(event.target.value),
                                              )
                                            }}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`schema.fields.${fieldPathIndex}.validation.max`}
                                    render={({ field: maxField }) => (
                                      <FormItem>
                                        <FormLabel>Maximum</FormLabel>
                                        <FormControl>
                                          <Input
                                            placeholder="Optional maximum"
                                            type="number"
                                            value={maxField.value ?? ''}
                                            onChange={(event) => {
                                              maxField.onChange(
                                                event.target.value === ''
                                                  ? undefined
                                                  : Number(event.target.value),
                                              )
                                            }}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </>
                              ) : null}

                              {fieldSupportsTextLimits(fieldType) ? (
                                <>
                                  <FormField
                                    control={form.control}
                                    name={`schema.fields.${fieldPathIndex}.validation.minLength`}
                                    render={({ field: minLengthField }) => (
                                      <FormItem>
                                        <FormLabel>Minimum length</FormLabel>
                                        <FormControl>
                                          <Input
                                            placeholder="Optional minimum"
                                            type="number"
                                            value={minLengthField.value ?? ''}
                                            onChange={(event) => {
                                              minLengthField.onChange(
                                                event.target.value === ''
                                                  ? undefined
                                                  : Number(event.target.value),
                                              )
                                            }}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`schema.fields.${fieldPathIndex}.validation.maxLength`}
                                    render={({ field: maxLengthField }) => (
                                      <FormItem>
                                        <FormLabel>Maximum length</FormLabel>
                                        <FormControl>
                                          <Input
                                            placeholder="Optional maximum"
                                            type="number"
                                            value={maxLengthField.value ?? ''}
                                            onChange={(event) => {
                                              maxLengthField.onChange(
                                                event.target.value === ''
                                                  ? undefined
                                                  : Number(event.target.value),
                                              )
                                            }}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </>
                              ) : null}
                            </div>
                          ) : null}

                          <div className="mt-4 rounded-2xl border border-[color:var(--color-gray-200)] bg-white p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-medium text-[color:var(--color-gray-900)]">
                                  Conditional display
                                </p>
                                <p className="text-sm text-[color:var(--color-gray-600)]">
                                  Show this field only when an earlier answer matches the specified
                                  condition.
                                </p>
                              </div>
                              <Badge variant={condition ? 'success' : 'muted'}>
                                {condition ? 'Enabled' : 'Off'}
                              </Badge>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-3">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-[color:var(--color-gray-900)]">
                                  Source field
                                </label>
                                <select
                                  className={SELECT_CLASS_NAME}
                                  value={condition?.fieldId ?? ''}
                                  onChange={(event) => {
                                    handleConditionSourceChange(index, event.target.value)
                                  }}
                                >
                                  <option value="">No conditional rule</option>
                                  {previousFieldOptions.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.label || item.id}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <FormField
                                control={form.control}
                                name={`schema.fields.${fieldPathIndex}.condition.operator`}
                                render={({ field: operatorField }) => (
                                  <FormItem>
                                    <FormLabel>Operator</FormLabel>
                                    <FormControl>
                                      <select
                                        className={SELECT_CLASS_NAME}
                                        disabled={!condition}
                                        name={operatorField.name}
                                        ref={operatorField.ref}
                                        value={operatorField.value ?? 'equals'}
                                        onBlur={operatorField.onBlur}
                                        onChange={(event) => {
                                          operatorField.onChange(
                                            event.target.value as CrfConditionOperator,
                                          )
                                        }}
                                      >
                                        {CRF_CONDITION_OPERATORS.map((operator) => (
                                          <option key={operator} value={operator}>
                                            {operator.replace('_', ' ')}
                                          </option>
                                        ))}
                                      </select>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`schema.fields.${fieldPathIndex}.condition.value`}
                                render={({ field: conditionValueField }) => (
                                  <FormItem>
                                    <FormLabel>Comparison value</FormLabel>
                                    <FormControl>
                                      <Input
                                        disabled={!condition}
                                        placeholder="e.g. Yes"
                                        {...conditionValueField}
                                        value={conditionValueField.value ?? ''}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            {fieldId ? (
                              <p className="mt-3 text-xs text-[color:var(--color-gray-600)]">
                                This field is currently saved as{' '}
                                <span className="font-medium">{fieldId}</span>.
                              </p>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              </fieldset>
            </TabsContent>

            <TabsContent value="schedule">
              <fieldset disabled={isEditorDisabled} className="m-0 min-w-0 border-0 p-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Visit schedule mapping</CardTitle>
                    <CardDescription>
                      Anchor the CRF to the visit plan so enrollment, periodic visits, and
                      completion forms stay aligned with protocol timing.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="visitSchedule.visitKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Visit key</FormLabel>
                          <FormControl>
                            <Input placeholder="visit_1" {...field} />
                          </FormControl>
                          <FormDescription>
                            Use a stable schedule identifier such as `screening`, `visit_1`, or
                            `follow_up`.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="visitSchedule.dayOffset"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nominal day</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="1"
                              type="number"
                              value={field.value ?? ''}
                              onChange={(event) => {
                                field.onChange(
                                  event.target.value === ''
                                    ? undefined
                                    : Number(event.target.value),
                                )
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="visitSchedule.windowBefore"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Window before</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="2"
                              type="number"
                              value={field.value ?? ''}
                              onChange={(event) => {
                                field.onChange(
                                  event.target.value === ''
                                    ? undefined
                                    : Number(event.target.value),
                                )
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Allowed days before the nominal visit date.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="visitSchedule.windowAfter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Window after</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="2"
                              type="number"
                              value={field.value ?? ''}
                              onChange={(event) => {
                                field.onChange(
                                  event.target.value === ''
                                    ? undefined
                                    : Number(event.target.value),
                                )
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Allowed days after the nominal visit date.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="visitSchedule.repeatable"
                      render={({ field }) => (
                        <FormItem className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] p-4 md:col-span-2">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <FormLabel>Repeatable template</FormLabel>
                              <FormDescription>
                                Enable for forms that can recur multiple times within the same study
                                visit, such as concomitant medications or adverse events.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <input
                                checked={field.value}
                                className="h-4 w-4 rounded border-[color:var(--color-gray-300)] text-[color:var(--color-navy-800)] focus:ring-[color:var(--color-navy-700)]"
                                name={field.name}
                                ref={field.ref}
                                type="checkbox"
                                onBlur={field.onBlur}
                                onChange={(event) => {
                                  field.onChange(event.target.checked)
                                }}
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </fieldset>
            </TabsContent>

            <TabsContent value="preview">
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle>Live preview</CardTitle>
                      <CardDescription>
                        Review the rendered CRF structure as it would appear to a coordinator or
                        monitor.
                      </CardDescription>
                    </div>
                    <Badge variant="default">
                      <Eye className="mr-1 h-3.5 w-3.5" />
                      {
                        watchedFields.filter((field) =>
                          evaluateCrfCondition(field.condition, previewValues),
                        ).length
                      }{' '}
                      visible fields
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {watchedFields.map((field) => {
                    const isVisible = evaluateCrfCondition(field.condition, previewValues)

                    if (!isVisible) {
                      return null
                    }

                    if (field.type === 'section_header') {
                      return (
                        <div
                          key={field.id}
                          className="rounded-3xl border border-[color:var(--color-gray-200)] bg-[linear-gradient(135deg,rgba(238,245,251,0.92),rgba(255,255,255,0.96))] px-5 py-4"
                        >
                          <p className="text-lg font-semibold text-[color:var(--color-gray-900)]">
                            {field.label}
                          </p>
                          {field.description ? (
                            <p className="mt-1 text-sm text-[color:var(--color-gray-600)]">
                              {field.description}
                            </p>
                          ) : null}
                        </div>
                      )
                    }

                    return (
                      <div
                        key={field.id}
                        className="rounded-3xl border border-[color:var(--color-gray-200)] bg-white p-5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-[color:var(--color-gray-900)]">
                              {field.label}
                            </p>
                            {field.description ? (
                              <p className="mt-1 text-sm text-[color:var(--color-gray-600)]">
                                {field.description}
                              </p>
                            ) : null}
                          </div>
                          {field.required ? <Badge variant="warning">Required</Badge> : null}
                        </div>

                        <div className="mt-4">
                          <PreviewFieldShell fieldType={field.type}>
                            {renderPreviewFieldContent(field)}
                          </PreviewFieldShell>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </div>
  )
}

type PreviewFieldShellProps = {
  children: ReactNode
  fieldType: CrfFieldType
}

function renderPreviewFieldContent(field: StudyFormsWorkspaceFieldValues): ReactNode {
  switch (field.type) {
    case 'select':
    case 'multiselect':
    case 'radio':
      return (
        <div className="space-y-2">
          {field.options.map((option) => (
            <div
              key={option}
              className="rounded-xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-3 py-2 text-sm text-[color:var(--color-gray-700)]"
            >
              {option}
            </div>
          ))}
        </div>
      )
    case 'checkbox':
      return (
        <div className="space-y-2">
          {field.options.map((option) => (
            <label
              key={option}
              className="flex items-center gap-3 rounded-xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-3 py-2 text-sm text-[color:var(--color-gray-700)]"
            >
              <input disabled type="checkbox" />
              <span>{option}</span>
            </label>
          ))}
        </div>
      )
    case 'textarea':
      return (
        <div className="min-h-28 rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-3 text-sm text-[color:var(--color-gray-500)]">
          {field.placeholder ?? 'Long-form response area'}
        </div>
      )
    case 'date':
      return renderPreviewInputShell('Select date')
    case 'number':
      return renderPreviewInputShell(field.placeholder ?? 'Enter number')
    case 'text':
      return renderPreviewInputShell(field.placeholder ?? 'Enter response')
    case 'section_header':
      return null
    default:
      return renderPreviewInputShell(field.placeholder ?? 'Enter response')
  }
}

function renderPreviewInputShell(placeholder: string) {
  return (
    <div className="rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-3 text-sm text-[color:var(--color-gray-500)]">
      {placeholder}
    </div>
  )
}

function PreviewFieldShell({ children, fieldType }: PreviewFieldShellProps) {
  return (
    <div className="space-y-2">
      <Badge variant="muted">{FIELD_TYPE_LABELS[fieldType]}</Badge>
      {children}
    </div>
  )
}

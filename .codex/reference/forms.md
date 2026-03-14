# Forms & Validation — Reference

## Stack

- **React Hook Form** — form state, registration, submission
- **Zod** — schema definition and validation (single source of truth)
- **@hookform/resolvers/zod** — bridge between the two
- **shadcn/ui Form components** — accessible, styled wrappers

## The Canonical Form Pattern

```typescript
// app/(dashboard)/studies/new/_components/create-study-form.tsx
'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { z } from 'zod'

import { createStudy } from '@/lib/actions/studies'
import { CreateStudySchema } from '@/lib/validations/study.schema'
import {
  Form, FormControl, FormDescription, FormField,
  FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'

type FormValues = z.infer<typeof CreateStudySchema>

export function CreateStudyForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateStudySchema),
    defaultValues: {
      title: '',
      protocolNumber: '',
      phase: undefined,
      description: '',
    },
  })

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await createStudy(values)

      if (!result.success) {
        // Map server field errors back to form fields
        if (typeof result.error === 'object') {
          Object.entries(result.error).forEach(([field, messages]) => {
            form.setError(field as keyof FormValues, {
              message: Array.isArray(messages) ? messages[0] : messages,
            })
          })
        } else {
          toast.error(result.error ?? 'An unexpected error occurred')
        }
        return
      }

      toast.success('Study created successfully')
      router.push(`/studies/${result.data.id}`)
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Study Title <span aria-hidden>*</span></FormLabel>
              <FormControl>
                <Input placeholder="e.g. A Phase II Study of..." {...field} />
              </FormControl>
              <FormDescription>The full official title of the clinical study.</FormDescription>
              <FormMessage />           {/* Renders Zod error automatically */}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phase"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phase <span aria-hidden>*</span></FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select phase" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {['Phase I', 'Phase II', 'Phase III', 'Phase IV'].map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Creating...' : 'Create Study'}
          </Button>
        </div>

      </form>
    </Form>
  )
}
```

## Zod Schema Patterns

```typescript
// lib/validations/study.schema.ts
import { z } from 'zod'

export const CreateStudySchema = z
  .object({
    title: z
      .string({ required_error: 'Title is required' })
      .min(3, 'Title must be at least 3 characters')
      .max(200, 'Title must be under 200 characters')
      .trim(),

    protocolNumber: z
      .string()
      .regex(/^[A-Z]{2,5}-\d{3,6}$/, 'Format must be XX-123456 (e.g. CDH-001)'),

    phase: z.enum(['Phase I', 'Phase II', 'Phase III', 'Phase IV'], {
      required_error: 'Please select a phase',
    }),

    description: z.string().max(2000).optional(),

    targetEnrollment: z
      .number({ invalid_type_error: 'Must be a number' })
      .int()
      .positive()
      .max(100_000)
      .optional(),

    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .refine((data) => !data.startDate || !data.endDate || data.endDate > data.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  })

// Derived types — never duplicate
export type CreateStudyInput = z.infer<typeof CreateStudySchema>
export type CreateStudyOutput = z.output<typeof CreateStudySchema>

// Partial schema for update operations
export const UpdateStudySchema = CreateStudySchema.partial()
export type UpdateStudyInput = z.infer<typeof UpdateStudySchema>
```

## Multi-Step Form (Wizard) Pattern

```typescript
// Use a stepper with URL-based step state
// /studies/new?step=1, /studies/new?step=2, /studies/new?step=3

// lib/hooks/use-multi-step-form.ts
import { useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'

export function useMultiStepForm<T extends Record<string, unknown>>(
  steps: string[],
  form: UseFormReturn<T>,
  fieldsPerStep: Array<Array<keyof T>>,
) {
  const [currentStep, setCurrentStep] = useState(0)

  async function next() {
    const fields = fieldsPerStep[currentStep] as string[]
    const isValid = await form.trigger(fields as any)
    if (isValid) setCurrentStep((s) => Math.min(s + 1, steps.length - 1))
  }

  function prev() {
    setCurrentStep((s) => Math.max(s - 1, 0))
  }

  return {
    currentStep,
    stepName: steps[currentStep],
    isFirst: currentStep === 0,
    isLast: currentStep === steps.length - 1,
    next,
    prev,
    goTo: setCurrentStep,
  }
}
```

## Dynamic Form Renderer (CRF Engine)

For the CRF form builder, render forms from JSON schema:

```typescript
// components/forms/crf-renderer.tsx
'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { buildZodSchema } from '@/lib/utils/build-zod-schema'
import type { FormField, FormSchema } from '@/types'

type Props = {
  schema: FormSchema
  defaultValues?: Record<string, unknown>
  onSubmit: (data: Record<string, unknown>) => Promise<void>
  readOnly?: boolean
}

export function CrfRenderer({ schema, defaultValues, onSubmit, readOnly }: Props) {
  const zodSchema = buildZodSchema(schema.fields)   // generates Zod from JSON

  const form = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues,
  })

  const watchedValues = form.watch()

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {schema.fields.map((field) => {
        const isVisible = evaluateCondition(field.condition, watchedValues)
        if (!isVisible) return null

        return (
          <Controller
            key={field.id}
            name={field.id}
            control={form.control}
            render={({ field: rhfField, fieldState }) => (
              <CrfField
                definition={field}
                rhfField={rhfField}
                error={fieldState.error?.message}
                readOnly={readOnly}
              />
            )}
          />
        )
      })}
    </form>
  )
}

// Pure function — no side effects
function evaluateCondition(
  condition: FormField['condition'],
  values: Record<string, unknown>,
): boolean {
  if (!condition) return true
  const { fieldId, operator, value } = condition
  const current = values[fieldId]

  switch (operator) {
    case 'equals': return current === value
    case 'not_equals': return current !== value
    case 'greater_than': return Number(current) > Number(value)
    case 'less_than': return Number(current) < Number(value)
    default: return true
  }
}
```

## Validation Anti-Patterns

```typescript
// ❌ Duplicate schema — server and client diverge
// client: min 3 chars
// server: min 5 chars
// → always share the same Zod schema

// ❌ Manual error state
const [errors, setErrors] = useState({})
if (!title) setErrors({ title: 'Required' })

// ✅ Let React Hook Form + Zod manage errors

// ❌ onBlur-only validation — user doesn't see errors until leaving field
// ✅ mode: 'onTouched' — validates onBlur first, then onChange once dirty
const form = useForm({ mode: 'onTouched' })
```

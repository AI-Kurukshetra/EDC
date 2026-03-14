import { z } from 'zod'

import { evaluateCrfCondition } from '@/lib/utils/crf-builder'
import type { CrfEntryRecord, CrfField, DataEntryStatus } from '@/types'

const DATE_VALUE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function getOptionalTextValue(rawValue: unknown) {
  if (typeof rawValue !== 'string') {
    return undefined
  }

  return rawValue.trim().length > 0 ? rawValue : undefined
}

function getOptionalNumberValue(rawValue: unknown) {
  if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
    return rawValue
  }

  if (typeof rawValue === 'string' && rawValue.trim().length > 0) {
    const parsedValue = Number(rawValue)
    return Number.isFinite(parsedValue) ? parsedValue : undefined
  }

  return undefined
}

function getOptionalArrayValue(rawValue: unknown) {
  if (!Array.isArray(rawValue)) {
    return undefined
  }

  return rawValue.filter((item): item is string => typeof item === 'string')
}

function normalizeFieldValue(field: CrfField, rawValue: unknown) {
  switch (field.type) {
    case 'number':
      return getOptionalNumberValue(rawValue)
    case 'multiselect':
    case 'checkbox':
      return getOptionalArrayValue(rawValue) ?? []
    case 'text':
    case 'textarea':
    case 'date':
    case 'select':
    case 'radio':
      return getOptionalTextValue(rawValue)
    case 'section_header':
      return undefined
    default:
      return undefined
  }
}

function isBlankString(value: string | undefined) {
  return value === undefined || value.trim().length === 0
}

function isReadOnlyDataEntryStatus(status: DataEntryStatus) {
  return status === 'locked' || status === 'sdv_complete'
}

export function createCrfEntryDefaultValues(
  fields: CrfField[],
  sourceData: Record<string, unknown> | undefined,
): CrfEntryRecord {
  return fields.reduce<CrfEntryRecord>((defaults, field) => {
    if (field.type === 'section_header') {
      return defaults
    }

    const normalizedValue = normalizeFieldValue(field, sourceData?.[field.id])

    if (field.type === 'multiselect' || field.type === 'checkbox') {
      defaults[field.id] = Array.isArray(normalizedValue) ? normalizedValue : []
      return defaults
    }

    if (field.type === 'number') {
      defaults[field.id] = typeof normalizedValue === 'number' ? normalizedValue : undefined
      return defaults
    }

    defaults[field.id] = typeof normalizedValue === 'string' ? normalizedValue : ''
    return defaults
  }, {})
}

export function normalizeCrfEntryRecord(
  fields: CrfField[],
  rawValues: Record<string, unknown> | undefined,
): CrfEntryRecord {
  const normalizedValues: CrfEntryRecord = {}

  for (const field of fields) {
    if (field.type === 'section_header') {
      continue
    }

    const isVisible = evaluateCrfCondition(field.condition, normalizedValues)

    if (!isVisible) {
      continue
    }

    normalizedValues[field.id] = normalizeFieldValue(field, rawValues?.[field.id])
  }

  return normalizedValues
}

export function getVisibleCrfFields(fields: CrfField[], values: Record<string, unknown>) {
  const normalizedValues = normalizeCrfEntryRecord(fields, values)

  return fields.filter((field) => evaluateCrfCondition(field.condition, normalizedValues))
}

export function buildCrfEntrySchema(fields: CrfField[]) {
  return z
    .record(z.string(), z.unknown())
    .superRefine((rawValues, context) => {
      const normalizedValues = normalizeCrfEntryRecord(fields, rawValues)

      for (const field of fields) {
        if (field.type === 'section_header') {
          continue
        }

        const isVisible = evaluateCrfCondition(field.condition, normalizedValues)

        if (!isVisible) {
          continue
        }

        const rawValue = rawValues[field.id]

        switch (field.type) {
          case 'text':
          case 'textarea': {
            const value = getOptionalTextValue(rawValue)

            if (field.required && isBlankString(value)) {
              context.addIssue({
                code: 'custom',
                path: [field.id],
                message: 'This field is required.',
              })
              continue
            }

            if (value === undefined || value.length === 0) {
              continue
            }

            if (
              field.validation?.minLength !== undefined &&
              value.length < field.validation.minLength
            ) {
              context.addIssue({
                code: 'custom',
                path: [field.id],
                message: `Enter at least ${String(field.validation.minLength)} characters.`,
              })
            }

            if (
              field.validation?.maxLength !== undefined &&
              value.length > field.validation.maxLength
            ) {
              context.addIssue({
                code: 'custom',
                path: [field.id],
                message: `Enter no more than ${String(field.validation.maxLength)} characters.`,
              })
            }

            if (field.validation?.pattern) {
              const pattern = new RegExp(field.validation.pattern)

              if (!pattern.test(value)) {
                context.addIssue({
                  code: 'custom',
                  path: [field.id],
                  message: 'This response does not match the required format.',
                })
              }
            }

            continue
          }
          case 'date': {
            const value = getOptionalTextValue(rawValue)

            if (field.required && isBlankString(value)) {
              context.addIssue({
                code: 'custom',
                path: [field.id],
                message: 'This field is required.',
              })
              continue
            }

            if (value === undefined || value.length === 0) {
              continue
            }

            if (!DATE_VALUE_PATTERN.test(value)) {
              context.addIssue({
                code: 'custom',
                path: [field.id],
                message: 'Use the YYYY-MM-DD format.',
              })
            }

            continue
          }
          case 'select':
          case 'radio': {
            const value = getOptionalTextValue(rawValue)

            if (field.required && isBlankString(value)) {
              context.addIssue({
                code: 'custom',
                path: [field.id],
                message: 'Choose an option.',
              })
              continue
            }

            if (value === undefined || value.length === 0) {
              continue
            }

            if (field.options && !field.options.includes(value)) {
              context.addIssue({
                code: 'custom',
                path: [field.id],
                message: 'Choose one of the configured options.',
              })
            }

            continue
          }
          case 'multiselect':
          case 'checkbox': {
            const value = getOptionalArrayValue(rawValue)

            if (field.required && (!value || value.length === 0)) {
              context.addIssue({
                code: 'custom',
                path: [field.id],
                message: 'Select at least one option.',
              })
              continue
            }

            if (!value || value.length === 0) {
              continue
            }

            if (field.options && value.some((item) => !field.options?.includes(item))) {
              context.addIssue({
                code: 'custom',
                path: [field.id],
                message: 'Choose only the configured options.',
              })
            }

            continue
          }
          case 'number': {
            const value = getOptionalNumberValue(rawValue)

            if (field.required && value === undefined) {
              context.addIssue({
                code: 'custom',
                path: [field.id],
                message: 'Enter a numeric value.',
              })
              continue
            }

            if (value === undefined) {
              continue
            }

            if (field.validation?.min !== undefined && value < field.validation.min) {
              context.addIssue({
                code: 'custom',
                path: [field.id],
                message: `Enter a value greater than or equal to ${String(field.validation.min)}.`,
              })
            }

            if (field.validation?.max !== undefined && value > field.validation.max) {
              context.addIssue({
                code: 'custom',
                path: [field.id],
                message: `Enter a value less than or equal to ${String(field.validation.max)}.`,
              })
            }
          }
        }
      }
    })
    .transform((rawValues) => normalizeCrfEntryRecord(fields, rawValues))
}

export { isReadOnlyDataEntryStatus }

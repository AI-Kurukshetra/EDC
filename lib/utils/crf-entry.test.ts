import { describe, expect, it } from 'vitest'

import {
  buildCrfEntrySchema,
  createCrfEntryDefaultValues,
  isReadOnlyDataEntryStatus,
  normalizeCrfEntryRecord,
} from '@/lib/utils/crf-entry'
import type { CrfField } from '@/types'

const SAMPLE_FIELDS: CrfField[] = [
  {
    id: 'status',
    label: 'Status',
    type: 'select',
    required: true,
    options: ['yes', 'no'],
    validation: {},
  },
  {
    id: 'details',
    label: 'Details',
    type: 'textarea',
    required: true,
    validation: {},
    condition: {
      fieldId: 'status',
      operator: 'equals',
      value: 'yes',
    },
  },
  {
    id: 'weight',
    label: 'Weight',
    type: 'number',
    required: false,
    validation: {
      min: 10,
      max: 50,
    },
  },
  {
    id: 'symptoms',
    label: 'Symptoms',
    type: 'checkbox',
    required: false,
    options: ['fever', 'cough'],
    validation: {},
  },
]

describe('createCrfEntryDefaultValues', () => {
  it('hydrates defaults for text, numbers, and checkbox fields', () => {
    expect(
      createCrfEntryDefaultValues(SAMPLE_FIELDS, {
        status: 'yes',
        weight: 22,
        symptoms: ['fever'],
      }),
    ).toEqual({
      status: 'yes',
      details: '',
      weight: 22,
      symptoms: ['fever'],
    })
  })
})

describe('normalizeCrfEntryRecord', () => {
  it('omits hidden conditional fields from the saved payload', () => {
    expect(
      normalizeCrfEntryRecord(SAMPLE_FIELDS, {
        status: 'no',
        details: 'Should be removed',
        weight: '18',
      }),
    ).toEqual({
      status: 'no',
      weight: 18,
      symptoms: [],
    })
  })
})

describe('buildCrfEntrySchema', () => {
  it('requires visible conditional fields and normalizes numeric strings', () => {
    const schema = buildCrfEntrySchema(SAMPLE_FIELDS)

    expect(() => schema.parse({ status: 'yes', weight: '12' })).toThrow()

    expect(
      schema.parse({
        status: 'yes',
        details: 'Confirmed',
        weight: '12',
        symptoms: ['fever'],
      }),
    ).toEqual({
      status: 'yes',
      details: 'Confirmed',
      weight: 12,
      symptoms: ['fever'],
    })
  })

  it('rejects out-of-range numeric values', () => {
    const schema = buildCrfEntrySchema(SAMPLE_FIELDS)

    expect(() =>
      schema.parse({
        status: 'no',
        weight: 99,
      }),
    ).toThrow()
  })
})

describe('isReadOnlyDataEntryStatus', () => {
  it('flags locked and SDV-complete entries as read-only', () => {
    expect(isReadOnlyDataEntryStatus('locked')).toBe(true)
    expect(isReadOnlyDataEntryStatus('sdv_complete')).toBe(true)
    expect(isReadOnlyDataEntryStatus('submitted')).toBe(false)
  })
})

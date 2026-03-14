import { describe, expect, it } from 'vitest'

import {
  createDefaultCrfField,
  createEmptyStudyFormTemplate,
  createNextFormTemplateVersion,
  createUniqueFieldId,
  evaluateCrfCondition,
  getPreviewSeedValues,
  moveListItem,
  parseOptionList,
  serializeOptionList,
} from '@/lib/utils/crf-builder'
import type { StudyFormTemplate } from '@/types'

describe('createUniqueFieldId', () => {
  it('slugifies the seed and appends a suffix when needed', () => {
    expect(createUniqueFieldId('Date of Birth', [])).toBe('date_of_birth')
    expect(createUniqueFieldId('Date of Birth', ['date_of_birth'])).toBe('date_of_birth_2')
  })
})

describe('createDefaultCrfField', () => {
  it('creates option-based fields with starter options', () => {
    const field = createDefaultCrfField('select', [])

    expect(field.type).toBe('select')
    expect(field.options).toEqual(['Option A', 'Option B'])
  })
})

describe('moveListItem', () => {
  it('moves an item to the target index without mutating the source array', () => {
    const source = ['a', 'b', 'c']

    const result = moveListItem(source, 0, 2)

    expect(result).toEqual(['b', 'c', 'a'])
    expect(source).toEqual(['a', 'b', 'c'])
  })
})

describe('option list helpers', () => {
  it('parses and serializes newline-delimited options', () => {
    const parsed = parseOptionList('  One\nTwo \n\nThree')

    expect(parsed).toEqual(['One', 'Two', 'Three'])
    expect(serializeOptionList(parsed)).toBe('One\nTwo\nThree')
  })
})

describe('evaluateCrfCondition', () => {
  it('evaluates equality, range, and contains operators', () => {
    expect(
      evaluateCrfCondition(
        { fieldId: 'status', operator: 'equals', value: 'done' },
        { status: 'done' },
      ),
    ).toBe(true)

    expect(
      evaluateCrfCondition(
        { fieldId: 'weight', operator: 'greater_than', value: '10' },
        { weight: 14 },
      ),
    ).toBe(true)

    expect(
      evaluateCrfCondition(
        { fieldId: 'flags', operator: 'contains', value: 'critical' },
        { flags: ['critical', 'review'] },
      ),
    ).toBe(true)
  })
})

describe('template builders', () => {
  it('creates an empty draft for a study and clones a next version without reusing ids', () => {
    const draft = createEmptyStudyFormTemplate('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')

    expect(draft.studyId).toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
    expect(draft.schema.fields).toHaveLength(2)

    const publishedTemplate: StudyFormTemplate = {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      studyId: draft.studyId,
      name: draft.name,
      formType: draft.formType,
      version: 1,
      isPublished: true,
      schema: draft.schema,
      visitSchedule: draft.visitSchedule,
      createdAt: '2026-03-14T00:00:00.000Z',
      updatedAt: '2026-03-14T00:00:00.000Z',
    }

    const nextVersion = createNextFormTemplateVersion(publishedTemplate)

    expect(nextVersion.version).toBe(2)
    expect(nextVersion.isPublished).toBe(false)
    expect(nextVersion.schema).toEqual(publishedTemplate.schema)
    expect(nextVersion.schema).not.toBe(publishedTemplate.schema)
  })

  it('creates stable preview seed values from the field types', () => {
    const draft = createEmptyStudyFormTemplate('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')

    const previewValues = getPreviewSeedValues(draft.schema)

    expect(previewValues[draft.schema.fields[0]?.id ?? 'missing']).toBeUndefined()
    expect(previewValues[draft.schema.fields[1]?.id ?? 'missing']).toBeUndefined()
  })
})

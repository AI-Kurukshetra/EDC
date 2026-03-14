import { describe, expect, it } from 'vitest'

import { formatDate, formatPercentage, formatSubjectId } from '@/lib/utils/format'

describe('formatDate', () => {
  it('returns a dash when no date is provided', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
  })

  it('formats an ISO date string into a readable clinical date', () => {
    expect(formatDate('2026-03-14T00:00:00.000Z')).toBe('14 Mar 2026')
  })
})

describe('formatSubjectId', () => {
  it('pads the sequential portion to three digits', () => {
    expect(formatSubjectId('SITE-001', 7)).toBe('SITE-001-007')
  })
})

describe('formatPercentage', () => {
  it('rounds and appends a percent sign', () => {
    expect(formatPercentage(66.4)).toBe('66%')
  })
})

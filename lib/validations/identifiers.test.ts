import { describe, expect, it } from 'vitest'

import { PostgresUuidSchema } from '@/lib/validations/identifiers'

describe('PostgresUuidSchema', () => {
  it('accepts deterministic fixture ids used by the demo seed', () => {
    expect(PostgresUuidSchema.parse('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')).toBe(
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    )
    expect(PostgresUuidSchema.parse('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1')).toBe(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    )
  })

  it('rejects malformed uuid strings', () => {
    expect(() => PostgresUuidSchema.parse('not-a-uuid')).toThrow()
    expect(() => PostgresUuidSchema.parse('aaaaaaaa-aaaa-aaaa-aaaa')).toThrow()
  })
})

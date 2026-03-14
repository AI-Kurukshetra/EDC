# Testing — Reference

## Testing Stack

| Layer             | Tool                           | Purpose                          |
| ----------------- | ------------------------------ | -------------------------------- |
| Unit tests        | Vitest                         | Pure functions, hooks, utilities |
| Component tests   | Vitest + React Testing Library | Component behaviour              |
| Integration tests | Vitest + MSW                   | Server Actions, API routes       |
| E2E tests         | Playwright                     | Critical user flows              |

## Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['node_modules/', '.next/', 'tests/'],
    },
  },
})
```

```typescript
// tests/setup.ts
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => cleanup())

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))
```

## Testing Hierarchy (AAA Pattern)

Every test must follow **Arrange → Act → Assert**:

```typescript
// lib/utils/__tests__/format.test.ts
import { describe, it, expect } from 'vitest'
import { formatDate, formatSubjectId } from '../format'

describe('formatDate', () => {
  it('formats ISO date string as dd MMM yyyy', () => {
    // Arrange
    const isoDate = '2024-03-15T00:00:00Z'

    // Act
    const result = formatDate(isoDate)

    // Assert
    expect(result).toBe('15 Mar 2024')
  })

  it('returns "—" for null/undefined input', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
  })
})

describe('formatSubjectId', () => {
  it('pads sequential number to 3 digits', () => {
    expect(formatSubjectId('SITE01', 7)).toBe('SITE01-007')
    expect(formatSubjectId('SITE01', 42)).toBe('SITE01-042')
    expect(formatSubjectId('SITE01', 100)).toBe('SITE01-100')
  })
})
```

## Component Testing

```typescript
// components/data-display/__tests__/study-card.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { StudyCard } from '../study-card'
import { mockStudy } from '@/tests/factories/study'

describe('StudyCard', () => {
  it('renders study title and protocol number', () => {
    render(<StudyCard study={mockStudy()} />)

    expect(screen.getByText(mockStudy().title)).toBeInTheDocument()
    expect(screen.getByText(mockStudy().protocolNumber)).toBeInTheDocument()
  })

  it('calls onSelect with study id when clicked', () => {
    const onSelect = vi.fn()
    const study = mockStudy({ id: 'abc-123' })

    render(<StudyCard study={study} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button'))

    expect(onSelect).toHaveBeenCalledOnce()
    expect(onSelect).toHaveBeenCalledWith('abc-123')
  })

  it('does not render as interactive when onSelect is not provided', () => {
    render(<StudyCard study={mockStudy()} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows active ring when isSelected is true', () => {
    const { container } = render(
      <StudyCard study={mockStudy()} isSelected={true} onSelect={vi.fn()} />
    )

    expect(container.firstChild).toHaveClass('ring-2')
  })
})
```

## Test Factories

Always use factories instead of raw mock objects:

```typescript
// tests/factories/study.ts
import { faker } from '@faker-js/faker'
import type { Study } from '@/types'

export function mockStudy(overrides?: Partial<Study>): Study {
  return {
    id: faker.string.uuid(),
    title: faker.lorem.sentence(),
    protocolNumber: `CDH-${faker.number.int({ min: 100, max: 999 })}`,
    phase: 'Phase II',
    status: 'active',
    startDate: faker.date.past().toISOString(),
    endDate: null,
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    ...overrides,
  }
}
```

## Server Action Testing with MSW

```typescript
// tests/actions/studies.test.ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { createStudy } from '@/lib/actions/studies'

const server = setupServer()
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('createStudy Server Action', () => {
  it('returns success with valid input', async () => {
    server.use(
      http.post('*/rest/v1/studies', () =>
        HttpResponse.json([{ id: 'new-study-id' }], { status: 201 }),
      ),
    )

    const result = await createStudy({
      title: 'A Phase II Oncology Study',
      protocolNumber: 'CDH-001',
      phase: 'Phase II',
    })

    expect(result.success).toBe(true)
    expect(result.data?.id).toBe('new-study-id')
  })

  it('returns validation error for invalid protocol number', async () => {
    const result = await createStudy({
      title: 'Valid Title',
      protocolNumber: 'invalid', // fails regex
      phase: 'Phase II',
    })

    expect(result.success).toBe(false)
    expect(result.error).toHaveProperty('protocolNumber')
  })
})
```

## Playwright E2E

```typescript
// e2e/studies/create-study.spec.ts
import { test, expect } from '@playwright/test'
import { loginAs } from '../helpers/auth'

test.describe('Create Study', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'data_manager')
  })

  test('successfully creates a study via wizard', async ({ page }) => {
    await page.goto('/studies/new')

    // Step 1: Basic Info
    await page.getByLabel('Study Title').fill('Pilot Phase II Oncology Study')
    await page.getByLabel('Protocol Number').fill('CDH-001')
    await page.getByRole('combobox', { name: 'Phase' }).click()
    await page.getByRole('option', { name: 'Phase II' }).click()
    await page.getByRole('button', { name: 'Next' }).click()

    // Step 3: Submit
    await page.getByRole('button', { name: 'Create Study' }).click()

    // Assert redirect and success
    await expect(page).toHaveURL(/\/studies\/[a-z0-9-]+/)
    await expect(page.getByText('Pilot Phase II Oncology Study')).toBeVisible()
  })
})
```

## Coverage Requirements

Minimum thresholds to enforce in CI:

```json
{
  "coverage": {
    "branches": 80,
    "functions": 85,
    "lines": 85,
    "statements": 85
  }
}
```

Always test:

- All pure utility functions (100% coverage expected)
- All Zod schema valid + invalid cases
- All component interaction states
- Critical user flows in E2E

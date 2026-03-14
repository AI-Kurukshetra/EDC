# Code Quality Gate

# Clinical Data Hub — Automated Standards Enforcement

# ─────────────────────────────────────────────────────────────────

# This file is the LAW. Every generated file must pass every gate

# before it is considered accepted. No exceptions. Not for "small"

# files. Not for "just a quick fix." Not for test files.

# Every file. Every time.

#

# Agents: read this file fully before writing any code.

# ─────────────────────────────────────────────────────────────────

---

## When Gates Run

```
TRIGGER                              GATES TO RUN
───────────────────────────────────────────────────
After every .ts / .tsx file generated  → All 7 gates
Before every pnpm add [package]        → Gate 6 Part B only
After every pnpm add [package]         → Gate 6 Part A (audit)
```

---

## Gate Execution Order

```
[1] TypeScript Gate      tsc --noEmit
[2] ESLint Gate          eslint --max-warnings 0
[3] Prettier Gate        prettier --check
[4] Import Gate          import/order + madge --circular
[5] Architecture Gate    manual self-check by agent
[6] Dependency Gate      depcheck + pnpm audit + scoring
[7] Security Gate        manual self-check by agent

Run in order. Gate 1 fails → fix Gate 1 before running Gate 2.
A fix in one gate can break a previous gate — always re-run
from the failed gate after applying fixes.
```

---

## Gate Failure Response — Strict Protocol

When ANY gate fails the agent must follow this exact sequence.
There is no deviation.

```
STEP 1 — Stop immediately
  Do not generate more files.
  Do not proceed to the next feature.
  Do not "note it and continue."

STEP 2 — Report clearly
  ┌──────────────────────────────────────────────────┐
  │  GATE FAILURE: [Gate Name & Number]              │
  │  File: [filepath]                                │
  │  Total violations: [count]                       │
  ├──────────────────────────────────────────────────┤
  │  [line number] — [rule] — [description]          │
  │  [line number] — [rule] — [description]          │
  └──────────────────────────────────────────────────┘

STEP 3 — Fix every violation
  Apply the fix patterns documented in this file.
  Never suppress with disable comments unless the
  suppression is registered in the Suppressions Registry
  at the bottom of this file.

STEP 4 — Re-run the failed gate
  Exit code must be 0 before proceeding.

STEP 5 — Re-run all subsequent gates
  A fix may introduce a new violation in a later gate.

STEP 6 — Continue only when ALL 7 gates are GREEN
```

---

## Gate 1 — TypeScript

### Command

```bash
pnpm tsc --noEmit
```

Exit code must be `0`. Zero errors. Zero warnings treated as errors.

### Required tsconfig.json

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "forceConsistentCasingInFileNames": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
  },
}
```

These flags are non-negotiable. Never comment them out or set them
to `false` to make code "compile faster" or "unblock development."

### What Each Flag Catches

| Flag                         | What it prevents                                                       |
| ---------------------------- | ---------------------------------------------------------------------- |
| `strict`                     | `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, and 6 more |
| `noUncheckedIndexedAccess`   | `arr[0].name` when `arr[0]` could be `undefined`                       |
| `exactOptionalPropertyTypes` | `{a?: string}` accepting `{a: undefined}`                              |
| `noImplicitReturns`          | Functions that return on some paths but not others                     |
| `noUnusedLocals`             | Variables declared but never read                                      |
| `noUnusedParameters`         | Function params declared but never used                                |

### Common Failures and Required Fixes

```typescript
// ── Failure: implicit any ────────────────────────────────────
// ❌ tsc error: Parameter 'data' implicitly has an 'any' type
const handler = (data) => { ... }

// ✅ Fix: explicit type or unknown + Zod
const handler = (data: unknown) => {
  const parsed = MySchema.parse(data)
  ...
}

// ── Failure: possibly undefined ─────────────────────────────
// ❌ tsc error: Object is possibly 'undefined'
const name = users[0].name

// ✅ Fix: guard or optional chain
const name = users[0]?.name ?? 'Unknown'

// ── Failure: missing return on code path ─────────────────────
// ❌ tsc error: Not all code paths return a value
function getLabel(status: string) {
  if (status === 'active') return 'Active'
  // missing: what about other statuses?
}

// ✅ Fix: cover all paths
function getLabel(status: StudyStatus): string {
  switch (status) {
    case 'active':     return 'Active'
    case 'draft':      return 'Draft'
    case 'completed':  return 'Completed'
    case 'terminated': return 'Terminated'
    case 'on_hold':    return 'On Hold'
    default: {
      const _never: never = status
      throw new Error(`Unhandled status: ${_never}`)
    }
  }
}

// ── Failure: unused variable ─────────────────────────────────
// ❌ tsc error: 'result' is declared but its value is never read
const result = await createStudy(data)
router.push('/studies')

// ✅ Fix: use it or prefix with underscore to explicitly mark unused
const _result = await createStudy(data)  // intentionally unused
router.push('/studies')

// ── Failure: non-null assertion ──────────────────────────────
// ❌ Dangerous — if value is null this throws at runtime
const id = session.user!.id

// ✅ Fix: explicit guard
if (!session.user) redirect('/login')
const id = session.user.id
```

### The Only Acceptable Suppression Pattern

```typescript
// ❌ Bare suppression — gate violation
// @ts-ignore
const value = data.field

// ✅ Only acceptable — must include WHY and a ticket reference
// @ts-expect-error — Supabase returns this column as `unknown` because
// it uses a dynamic JSONB type. Proper typed accessor tracked in CDH-412.
const value = (data as DataEntryRow).field
```

Every suppression must also be registered in the **Suppressions Registry**
at the bottom of this file. Unregistered suppressions are themselves a
Gate 1 violation.

---

## Gate 2 — ESLint

### Command

```bash
pnpm eslint . --ext .ts,.tsx --max-warnings 0
```

`--max-warnings 0` means warnings are errors. Exit code must be `0`.

### Required .eslintrc.json

```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/strict-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked",
    "plugin:import/recommended",
    "plugin:import/typescript"
  ],
  "plugins": ["@typescript-eslint", "react-hooks", "import"],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "./tsconfig.json",
    "tsconfigRootDir": "."
  },
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unsafe-assignment": "error",
    "@typescript-eslint/no-unsafe-member-access": "error",
    "@typescript-eslint/no-unsafe-call": "error",
    "@typescript-eslint/no-unsafe-return": "error",
    "@typescript-eslint/no-unsafe-argument": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error",
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/require-await": "error",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }
    ],
    "@typescript-eslint/no-non-null-assertion": "error",
    "@typescript-eslint/no-unnecessary-condition": "error",
    "@typescript-eslint/no-unnecessary-type-assertion": "error",
    "@typescript-eslint/switch-exhaustiveness-check": "error",
    "@typescript-eslint/prefer-nullish-coalescing": "error",
    "@typescript-eslint/prefer-optional-chain": "error",
    "@typescript-eslint/consistent-type-imports": [
      "error",
      { "prefer": "type-imports", "fixStyle": "separate-type-imports" }
    ],
    "@typescript-eslint/consistent-type-definitions": ["error", "type"],
    "@typescript-eslint/no-import-type-side-effects": "error",
    "@typescript-eslint/prefer-readonly": "error",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "error",
    "import/order": [
      "error",
      {
        "groups": ["builtin", "external", "internal", ["parent", "sibling"], "index", "type"],
        "pathGroups": [
          { "pattern": "react", "group": "external", "position": "before" },
          { "pattern": "next/**", "group": "external", "position": "before" },
          { "pattern": "@/types/**", "group": "type", "position": "after" },
          { "pattern": "@/**", "group": "internal" }
        ],
        "pathGroupsExcludedImportTypes": ["react", "next"],
        "newlines-between": "always",
        "alphabetize": { "order": "asc", "caseInsensitive": true }
      }
    ],
    "import/no-cycle": "error",
    "import/no-duplicates": "error",
    "import/first": "error",
    "import/no-self-import": "error",
    "import/no-useless-path-segments": "error",
    "no-console": ["warn", { "allow": ["error", "warn"] }],
    "no-debugger": "error",
    "no-alert": "error",
    "prefer-const": "error",
    "no-var": "error",
    "eqeqeq": ["error", "always", { "null": "ignore" }],
    "no-throw-literal": "error",
    "object-shorthand": "error",
    "prefer-template": "error",
    "no-nested-ternary": "error",
    "@next/next/no-img-element": "error",
    "@next/next/no-html-link-for-pages": "error"
  },
  "settings": {
    "import/resolver": {
      "typescript": { "alwaysTryTypes": true, "project": "./tsconfig.json" }
    }
  },
  "ignorePatterns": ["node_modules/", ".next/", "dist/", "coverage/", "src/types/database.types.ts"]
}
```

### Rules That Must Never Be Violated

#### no-explicit-any

```typescript
// ❌ GATE FAIL
const handler = (data: any) => { ... }
function parse(input: any): any { ... }

// ✅ GATE PASS
const handler = (data: unknown) => {
  const parsed = MySchema.parse(data)
  ...
}
```

#### no-floating-promises

```typescript
// ❌ GATE FAIL — unawaited promise silently swallows errors
router.push('/dashboard')
supabase.from('studies').insert(data)

// ✅ GATE PASS — intentional fire-and-forget
void router.push('/dashboard')

// ✅ GATE PASS — awaited
await supabase.from('studies').insert(data)
```

#### react-hooks/exhaustive-deps

```typescript
// ❌ GATE FAIL — studyId used inside but missing from deps
useEffect(() => {
  void fetchStudy(studyId)
}, [])

// ✅ GATE PASS
useEffect(() => {
  void fetchStudy(studyId)
}, [studyId])
```

#### consistent-type-imports

```typescript
// ❌ GATE FAIL — mixing value and type imports
import { Study, createStudy } from '@/lib/actions/studies'

// ✅ GATE PASS — type imports separated
import { createStudy } from '@/lib/actions/studies'
import type { Study } from '@/types'
```

#### switch-exhaustiveness-check

```typescript
// ❌ GATE FAIL — StudyStatus has 5 values, only 3 handled
function getColor(status: StudyStatus): string {
  switch (status) {
    case 'draft':
      return 'gray'
    case 'active':
      return 'green'
    case 'completed':
      return 'blue'
    // missing: on_hold, terminated → TypeScript error
  }
}

// ✅ GATE PASS — all cases + exhaustive default
function getColor(status: StudyStatus): string {
  switch (status) {
    case 'draft':
      return 'gray'
    case 'active':
      return 'green'
    case 'completed':
      return 'blue'
    case 'on_hold':
      return 'amber'
    case 'terminated':
      return 'red'
    default: {
      const _exhaustive: never = status
      throw new Error(`Unhandled StudyStatus: ${_exhaustive}`)
    }
  }
}
```

#### no-nested-ternary

```typescript
// ❌ GATE FAIL
const label = isLoading ? 'Loading...' : isError ? 'Error' : 'Ready'

// ✅ GATE PASS — early returns or a map
if (isLoading) return 'Loading...'
if (isError) return 'Error'
return 'Ready'
```

---

## Gate 3 — Prettier

### Command

```bash
pnpm prettier --check "src/**/*.{ts,tsx}"
```

Exit code must be `0`. If it fails, auto-fix and re-check:

```bash
pnpm prettier --write "src/**/*.{ts,tsx}" && pnpm prettier --check "src/**/*.{ts,tsx}"
```

### Required .prettierrc

```json
{
  "singleQuote": true,
  "semi": false,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "trailingComma": "all",
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### Rules at a Glance

| Rule            | Value      | Why                                                          |
| --------------- | ---------- | ------------------------------------------------------------ |
| Single quotes   | `true`     | Consistent across project                                    |
| Semicolons      | `false`    | ASI handles it; less noise                                   |
| Print width     | `100`      | Wider than 80, narrower than 120                             |
| Trailing commas | `"all"`    | Cleaner diffs — adding a param doesn't change the line above |
| Arrow parens    | `"always"` | `(x) => x` not `x => x` — consistent                         |
| Line endings    | `lf`       | Unix — no CRLF in the repo                                   |

### Agent Pre-Format Checklist

Before running Prettier, the agent should already have:

- [ ] Single quotes for all strings
- [ ] No trailing whitespace on any line
- [ ] One blank line between top-level declarations
- [ ] No consecutive blank lines (max 1)
- [ ] Consistent indentation (2 spaces, no tabs)

---

## Gate 4 — Import Order & Circular Dependencies

### Commands

```bash
# Import order is enforced by ESLint Gate 2 (import/order rule)
# Circular dependency check runs separately:
pnpm madge --circular --extensions ts,tsx src/
```

Install: `pnpm add -D madge`

Both must exit with code `0`. Any circular dependency is a
**hard fail** that must be resolved before continuing.

### Required Import Order

Every file must follow this grouping with a blank line between each group:

```typescript
// Group 1 — React (always first)
import { useState } from 'react'

// Group 2 — Next.js
import { useRouter } from 'next/navigation'
import Image from 'next/image'

// Group 3 — External packages (alphabetical within group)
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

// Group 4 — Internal lib (alphabetical)
import { createStudy } from '@/lib/actions/studies'
import { useStudies } from '@/lib/hooks/use-studies'
import { cn } from '@/lib/utils/cn'

// Group 5 — Internal components (alphabetical)
import { Button } from '@/components/ui/button'
import { StudyCard } from '@/components/studies/study-card'

// Group 6 — Type imports (always last, always `import type`)
import type { CreateStudyInput } from '@/lib/validations/study.schema'
import type { Study } from '@/types'
```

### One-Way Dependency Flow — Never Reverse

```
app/  →  components/  →  lib/  →  types/

✅ app/ imports from components/, lib/, types/
✅ components/ imports from lib/, types/
✅ lib/ imports from types/

❌ lib/ imports from components/    (circular)
❌ components/ imports from app/    (circular)
❌ types/ imports from anywhere     (types are leaf nodes)
```

### Resolving a Circular Dependency

When `madge` reports a cycle:

```
Step 1 — Identify the circular chain
  e.g. lib/hooks/use-studies.ts → lib/actions/studies.ts → lib/hooks/use-studies.ts

Step 2 — Extract the shared logic
  Move shared types to types/index.ts
  Move shared pure utilities to lib/utils/[name].ts

Step 3 — Use dependency injection
  Pass a function as a parameter instead of importing directly

Step 4 — Verify
  pnpm madge --circular --extensions ts,tsx src/
  Must return: "No circular dependency found!"
```

---

## Gate 5 — Architecture (Agent Self-Check)

No CLI command. The agent checks these rules manually
against every generated file before moving on.

### 5.1 Server vs Client Boundary

```
EVERY .tsx file: check the first line.

Has 'use client' directive:
  ✅ CAN use:   useState, useEffect, useReducer, event handlers
  ✅ CAN use:   Browser APIs (window, document, localStorage)
  ✅ CAN use:   getBrowserSupabase()
  ❌ CANNOT use: cookies(), headers() from next/headers
  ❌ CANNOT use: getServerSupabase()
  ❌ CANNOT use: Server Action files (import from lib/actions/)
                 — Server Actions CAN be called from client,
                   but the ACTION FILE itself must be 'use server'
  ❌ CANNOT BE: layout.tsx or page.tsx that also fetches data

No directive (Server Component):
  ✅ CAN use:   async/await directly in the component
  ✅ CAN use:   getServerSupabase(), cookies(), headers()
  ✅ CAN use:   direct DB queries via lib/queries/
  ❌ CANNOT use: useState, useEffect, useReducer
  ❌ CANNOT use: onClick, onChange, or any event handler prop
  ❌ CANNOT use: Zustand stores (lib/stores/)
  ❌ CANNOT use: TanStack Query hooks
  ❌ CANNOT use: getBrowserSupabase()
```

### 5.2 Server Action Rules

Every file in `lib/actions/` must satisfy all of these:

```typescript
// ✅ 'use server' must be the FIRST line — no comments before it
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getServerSupabase } from '@/lib/supabase/server'
import { CreateStudySchema } from '@/lib/validations/study.schema'
import type { ActionResult } from '@/types/actions'

// ✅ Input is always `unknown` — never accept a typed object without parsing
export async function createStudy(raw: unknown): Promise<ActionResult<{ id: string }>> {
  // ✅ Step 1: Validate — BEFORE touching the database
  const parsed = CreateStudySchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors }
  }

  // ✅ Step 2: Auth check — BEFORE any data operation
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ✅ Step 3: Execute
  const { data, error } = await supabase.from('studies').insert(parsed.data).select('id').single()

  if (error) return { success: false, error: error.message }

  // ✅ Step 4: Revalidate
  revalidatePath('/studies')

  // ✅ Step 5: Return typed ActionResult — NEVER throw to client
  return { success: true, data }
}
```

Violations — each is a hard gate failure:

```
❌ Accepting typed input without Zod .safeParse()
❌ DB call before auth.getUser() check
❌ Using getBrowserSupabase() in a Server Action
❌ Throwing an error to the client (always return ActionResult)
❌ Missing revalidatePath() or revalidateTag() after a mutation
❌ Not calling the audit-log Edge Function for state changes
```

### 5.3 Data Fetching Rules

```
RSC page.tsx (no 'use client'):
  ✅ Use getServerSupabase() + await directly
  ✅ Use Promise.all() for parallel fetches — never sequential awaits
  ✅ Wrap in <Suspense> with a loading.tsx fallback
  ✅ Let thrown errors surface to the nearest error.tsx

Client components:
  ✅ Use TanStack Query useQuery() for reads
  ✅ Call Server Actions for all writes
  ❌ NEVER useEffect(() => { fetch(...) }) for data fetching
  ❌ NEVER call Supabase .from() directly for mutations
  ❌ NEVER manage loading/error state manually for server data
```

### 5.4 Component Rules

```
Every exported component must:
  ✅ Have an explicit Props type above the component definition
  ✅ Have a JSDoc comment on the export line
  ✅ Accept a className prop if it renders a root DOM element
  ✅ Use cn() for all conditional class merging
  ✅ Use semantic HTML: <button> not <div onClick>, <a> not <span onClick>
  ✅ Have all states designed: default, loading, error, empty, populated

Components must NOT:
  ❌ Contain business logic — extract to hooks in lib/hooks/ or utilities in lib/utils/
  ❌ Have more than one level of nested ternary rendering — use guard clauses
  ❌ Use array index as React list key — use stable item IDs
  ❌ Use inline styles — use Tailwind utilities or CSS variables
  ❌ Import anything from the app/ directory
  ❌ Call Supabase directly
```

### 5.5 Zod Schema Rules

```
Every Zod schema must:
  ✅ Live in lib/validations/[domain].schema.ts
  ✅ Export the schema AND the inferred type:
       export const CreateStudySchema = z.object({ ... })
       export type CreateStudyInput = z.infer<typeof CreateStudySchema>
  ✅ Use .trim() on every string field
  ✅ Use .min(n, 'Human-readable message') — never silent minimums
  ✅ Use z.enum([...]) for status/category fields — not z.string()

Schemas must NOT:
  ❌ Be defined inline inside a component, page, or action
  ❌ Use z.any() anywhere
  ❌ Use z.object({}).passthrough() without a comment explaining why
  ❌ Accept different shapes on client vs server — single shared schema
```

---

## Gate 6 — Dependency Quality

This gate has two parts. Both must pass.

- **Part A** — Automated scan: runs after file generation
- **Part B** — Agent pre-check: runs before every `pnpm add`

---

### Part A — Automated Scan

#### Commands

```bash
# Unused + missing dependencies
pnpm depcheck

# Known CVE audit — fails on high or critical
pnpm audit --audit-level=high
```

Install depcheck once: `pnpm add -D depcheck`

#### .depcheckrc (project root)

```json
{
  "ignores": [
    "typescript",
    "@types/*",
    "eslint",
    "eslint-*",
    "@typescript-eslint/*",
    "eslint-config-next",
    "eslint-plugin-import",
    "prettier",
    "husky",
    "lint-staged",
    "postcss",
    "autoprefixer",
    "depcheck",
    "madge"
  ],
  "ignore-patterns": ["dist", ".next", "node_modules", "coverage"]
}
```

#### Pass Conditions

```
pnpm depcheck:
  Unused dependencies:    none
  Unused devDependencies: none
  Missing dependencies:   none

pnpm audit:
  0 critical vulnerabilities
  0 high vulnerabilities
```

If a package is listed as unused:

1. Confirm it is not a peer dependency or config-only dependency
2. If truly unused → `pnpm remove [package]` immediately
3. Never keep unused packages "just in case"

If audit finds a CVE:

1. Check if a patched version exists → `pnpm update [package]`
2. If no patch exists → `pnpm remove [package]` + find alternative
3. Never merge code with unresolved high or critical CVEs

---

### Part B — Agent Package Selection

Before every `pnpm add [package]` the agent must run this
decision script. Non-compliance is a gate violation.

#### Decision Script

```
Step 1 → Is it in the APPROVED LIST below?
         YES → install it, log it, done
         NO  → go to Step 2

Step 2 → Is there an APPROVED package that already solves this?
         YES → use the approved package, do NOT install the new one
         NO  → go to Step 3

Step 3 → Is it in the BANNED LIST below?
         YES → hard reject
               explain to developer which approved alternative to use
         NO  → go to Step 4

Step 4 → Run ALL Hard Criteria
         Any single fail → hard reject
                           explain which criterion failed
         All pass → go to Step 5

Step 5 → Score ALL Soft Criteria
         Score < 6  → reject, explain score breakdown
         Score ≥ 6  → go to Step 6

Step 6 → pnpm add [package]
         Immediately run: pnpm audit --audit-level=high
         Any CVE → pnpm remove [package] + hard reject

Step 7 → Record in Dependency Decision Log at bottom of this file
```

#### Hard Criteria — Any Single Fail = Reject

```
[ ] Deprecated on npm?
    Check: npm show [package] deprecated
    Any output present → REJECT

[ ] Last publish older than 24 months?
    Check: npm show [package] time.modified
    > 24 months → REJECT
    Exception only for intentionally-complete stable utilities
    (e.g. clsx, date-fns) with > 5k stars and zero open CVEs.

[ ] Weekly downloads below 10,000?
    Check: npmjs.com package page
    < 10k/week → REJECT unless zero mainstream alternative exists

[ ] Known critical or high CVE?
    Check: pnpm audit after install
    Any critical or high → pnpm remove + REJECT

[ ] GitHub stars below 50 with no reputable org behind it?
    Reputable orgs: Vercel, Meta, Google, Microsoft,
                   Radix, Pmndrs, TanStack, Supabase
    < 50 stars + no reputable org → REJECT
```

#### Soft Criteria — Score Each, Minimum 6 to Accept

```
Weekly downloads > 500k?                        +2
Weekly downloads 100k–500k?                     +1
GitHub stars > 5,000?                           +2
Last commit within 3 months?                    +2
TypeScript types bundled (not via @types/)?     +2
Bundle size < 10kb gzipped?                     +1
Zero peer dependency conflicts on install?      +1
Maintained by Vercel / Next.js ecosystem?       +2  ← highest trust
In the approved list?                           +3  ← auto-pass

Maximum possible: 16    Minimum to accept: 6
```

---

### Approved Package List

Pre-approved — no scoring needed. Always prefer these.

#### Framework

```
next                    Vercel-maintained, always latest stable
react                   Meta-maintained
react-dom               Meta-maintained
typescript              Microsoft-maintained
```

#### Styling

```
tailwindcss             Vercel-recommended, 8M+ DL/week
tailwind-merge          Class conflict resolution, 5M+ DL/week
clsx                    Conditional classes, 20M+ DL/week
@tailwindcss/forms      Form base styles
```

#### UI Components

```
@radix-ui/*             Headless accessible primitives (shadcn base)
lucide-react            Icon set — tree-shakeable, actively maintained
```

#### Forms & Validation

```
react-hook-form         10M+ DL/week — industry standard
@hookform/resolvers     Official RHF ↔ Zod bridge
zod                     Schema validation, 7M+ DL/week
```

#### State

```
zustand                 40k+ stars, Pmndrs-maintained
immer                   Immutable updates, 9M+ DL/week
@tanstack/react-query   40k+ stars, TanStack-maintained (v5 only)
nuqs                    Type-safe URL state, Next.js-endorsed
```

#### Backend / Data

```
@supabase/supabase-js   Official Supabase JS client
@supabase/ssr           Official Supabase SSR for Next.js
```

#### Utilities

```
date-fns                Date manipulation, 20M+ DL/week, no Moment
lodash-es               ES module build only — tree-shakeable
```

#### Animation

```
motion                  Formerly Framer Motion — rebranded, same team
```

#### Charts

```
recharts                React-native chart library, built on D3
```

#### Drag & Drop

```
@dnd-kit/core           Accessibility-first DnD
@dnd-kit/sortable       Sortable list extension
@dnd-kit/utilities      DnD helper functions
```

#### Testing

```
vitest                  Vite-native test runner — replaces Jest
@testing-library/react  Component testing standard
@testing-library/jest-dom Custom DOM matchers
@faker-js/faker         Test data generation, 3M+ DL/week
msw                     API mocking via service workers
playwright              E2E testing — Microsoft-maintained
```

---

### Banned Package List

Installing any of these is a **hard gate violation**.
The agent must refuse and propose the approved alternative.

```
BANNED                   REASON                         USE INSTEAD
──────────────────────────────────────────────────────────────────────
moment                   Deprecated, 300kb bundle        date-fns
moment-timezone          Deprecated                      date-fns/tz
request                  Deprecated since 2020           native fetch
node-fetch               Superseded by native fetch      native fetch
axios                    Unnecessary in Next.js 15       fetch + zod
lodash                   CommonJS only, no tree-shaking  lodash-es
underscore               Abandoned, superseded           lodash-es
react-query v3           Superseded by v5                @tanstack/react-query v5
swr                      Inferior feature set            @tanstack/react-query
styled-components        Runtime CSS, 12kb overhead      tailwindcss
emotion / @emotion/*     Runtime CSS injection           tailwindcss
@mui/material            Heavy runtime, style conflicts  shadcn/ui + tailwind
antd                     Heavy bundle, opinionated       shadcn/ui + tailwind
semantic-ui-react        Abandoned                       shadcn/ui + tailwind
enzyme                   Abandoned, React 18 incompatible @testing-library/react
jest                     Slower, poor ESM support        vitest
mocha                    Outdated                        vitest
react-router-dom         Conflicts with App Router       next/navigation
next-auth v4             Deprecated                      next-auth v5 (Auth.js)
framer-motion            Rebranded — wrong package name  motion
classnames               Superseded                      clsx + tailwind-merge
react-icons              Large bundle, mixed quality     lucide-react
font-awesome             Large bundle, complex licensing lucide-react
jquery                   No place in React apps          React + DOM APIs
```

---

## Gate 7 — Security (Agent Self-Check)

No CLI command. The agent scans every generated file manually.

### 7.1 Secret & PII Scanning

Scan every file for these patterns. Any match is a gate failure.

```
❌ Any string literal matching /^eyJ/      — JWT token hardcoded
❌ Any string literal matching /^sbp_/     — Supabase service key
❌ process.env.SUPABASE_SERVICE_ROLE_KEY   — in any src/ file
   (only allowed in supabase/functions/ Edge Functions)
❌ localStorage.setItem('token', ...)      — auth token in localStorage
❌ localStorage.setItem('session', ...)    — session in localStorage
❌ console.log(user)                       — may log PII to browser
❌ console.log(data)                       — may log sensitive data
❌ Any hardcoded API key as a string literal

✅ Allowed: process.env.NEXT_PUBLIC_* in client files
✅ Allowed: process.env.* in Server Actions and lib/queries/ only
✅ Allowed: process.env.* in supabase/functions/ Edge Functions
```

### 7.2 Input Handling

Scan every Server Action (`lib/actions/`) for:

```
✅ Zod .safeParse(raw) called BEFORE the first DB operation
✅ auth.getUser() called BEFORE the first data operation
✅ Input parameter typed as `unknown`, not a typed object

❌ Direct .insert() or .update() without prior Zod validation
❌ String interpolation used to build query-like strings
❌ dangerouslySetInnerHTML used without DOMPurify sanitisation
❌ User-controlled values used in Supabase .filter() without escaping
```

### 7.3 RLS Bypass Detection

Scan all files in src/ for these Supabase call patterns:

```
❌ supabase.auth.admin.*
   Only allowed in supabase/functions/ with service_role key.
   In src/ this bypasses RLS entirely.

❌ .from('audit_logs').update(...)     immutable table
❌ .from('audit_logs').delete(...)     immutable table
❌ .from('signatures').update(...)     immutable table
❌ .from('signatures').delete(...)     immutable table

Any of these in src/ = CRITICAL security violation.
Remove immediately. These operations are only permitted in
Edge Functions using the service_role key.
```

### 7.4 Client-Side Auth

```
❌ Storing session tokens in localStorage
❌ Storing session tokens in sessionStorage
❌ Storing session tokens in a cookie set by client-side JS

✅ Sessions handled exclusively by @supabase/ssr
✅ Cookies are HttpOnly and set server-side only
✅ Auth state read via supabase.auth.getUser() on the server
```

---

## Pre-Commit Hook

Runs Gates 1–3 + Gate 6A automatically on every `git commit`.
If any gate fails, the commit is blocked.

### Setup

```bash
pnpm add -D husky lint-staged
pnpm exec husky init
```

File: `.husky/pre-commit`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
pnpm lint-staged
```

File: `package.json` — add `lint-staged` section

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["prettier --write", "eslint --max-warnings 0", "bash -c 'pnpm tsc --noEmit'"],
    "*.{ts,tsx,json,md}": ["prettier --write"],
    "package.json": ["bash -c 'pnpm depcheck'", "bash -c 'pnpm audit --audit-level=high'"]
  }
}
```

---

## CI Pipeline (GitHub Actions)

File: `.github/workflows/quality-gate.yml`

```yaml
name: Quality Gate

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality-gate:
    name: All Gates
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Gate 1 — TypeScript
        run: pnpm tsc --noEmit

      - name: Gate 2 — ESLint
        run: pnpm eslint . --ext .ts,.tsx --max-warnings 0

      - name: Gate 3 — Prettier
        run: pnpm prettier --check "src/**/*.{ts,tsx}"

      - name: Gate 4 — Circular deps
        run: pnpm madge --circular --extensions ts,tsx src/

      - name: Gate 6A — Unused deps
        run: pnpm depcheck

      - name: Gate 6B — CVE audit
        run: pnpm audit --audit-level=high
```

Gates 5 and 7 are enforced by Gates 1 and 2 (TypeScript strict +
ESLint rules) — no separate CI steps needed.

---

## Required package.json Scripts

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx --max-warnings 0",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,json}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,json}\"",
    "circular": "madge --circular --extensions ts,tsx src/",
    "deps:check": "depcheck",
    "deps:audit": "pnpm audit --audit-level=high",
    "gate": "pnpm typecheck && pnpm lint && pnpm format:check && pnpm circular && pnpm deps:check && pnpm deps:audit",
    "gate:fix": "pnpm format && pnpm lint:fix"
  }
}
```

---

## Agent Quick Reference Card

```
AFTER GENERATING ANY .ts / .tsx FILE:
──────────────────────────────────────────────────────
1. pnpm typecheck       → 0 errors
2. pnpm lint            → 0 errors, 0 warnings
3. pnpm format:check    → 0 unformatted files
4. pnpm circular        → 0 circular deps
5. Self-check Gate 5    → server/client boundary correct?
                          Server Actions follow the pattern?
                          Components follow the rules?
6. pnpm deps:check      → 0 unused / 0 missing packages
   pnpm deps:audit      → 0 critical / 0 high CVEs
7. Self-check Gate 7    → no hardcoded secrets?
                          no RLS bypasses in src/?
                          no auth tokens in localStorage?

ALL GREEN → continue to next file
ANY RED   → STOP. Fix. Re-run from the failed gate.
──────────────────────────────────────────────────────

BEFORE pnpm add [package]:
  Run the 7-step decision script in Gate 6 Part B.
  If not in approved list → score it.
  If score < 6 or any hard criterion fails → reject.
  Log every non-approved install in the Decision Log.
```

---

## Suppressions Registry

Every `// eslint-disable`, `// @ts-ignore`, or
`// @ts-expect-error` in the codebase must be registered here.
An unregistered suppression is itself a Gate 1 or Gate 2 violation.

| File         | Line | Rule | Reason | Ticket |
| ------------ | ---- | ---- | ------ | ------ |
| _(none yet)_ | —    | —    | —      | —      |

---

## Dependency Decision Log

Every package installed that is NOT in the approved list
must be logged here before being committed to git.

| Package | Version | Score | Weekly DL | Stars | Reason                                                                             | Date       |
| ------- | ------- | ----- | --------- | ----- | ---------------------------------------------------------------------------------- | ---------- |
| madge   | 8.0.0   | 4     | 316k      | 7.7k  | Required for the current Gate 4 circular import check flow in this reference file. | 2026-03-14 |
| knip    | 5.86.0  | 8     | 3.28M     | 10.5k | Maintained replacement for `depcheck` to satisfy Gate 6A dependency scanning.      | 2026-03-14 |

---

_Place this file at: `~/.codex/references/code-quality-gate.md`_
_Reference it from `~/.codex/AGENTS.md` so Codex loads it globally._
_The pre-commit hook and CI pipeline enforce it independently._

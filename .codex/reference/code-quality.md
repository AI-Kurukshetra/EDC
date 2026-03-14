# Code Quality & Performance — Reference

## Code Review Checklist

Run through this before submitting any code:

### TypeScript

- [ ] No `any` types — use `unknown` + narrowing
- [ ] All async functions have proper return types
- [ ] All Props types are explicitly defined
- [ ] Discriminated unions used for complex state
- [ ] `satisfies` used where shape needs validation without widening

### React

- [ ] No `useEffect` for data fetching or derived state
- [ ] `useCallback`/`useMemo` only where measured, not speculative
- [ ] No anonymous functions as stable references in deps arrays
- [ ] Keys in list renders are stable IDs — never array index
- [ ] No prop drilling > 2 levels — use Zustand or Context

### Async / Error Handling

- [ ] Every `async` function has a try/catch or error return value
- [ ] No unhandled Promise rejections
- [ ] Loading, error, and empty states handled in every data-dependent UI
- [ ] Server Actions return `{ success, data, error }` shape consistently

### Security

- [ ] User input validated with Zod on server before DB write
- [ ] No sensitive data in client state or URL params
- [ ] No `dangerouslySetInnerHTML` without sanitization
- [ ] Auth check at the start of every Server Action

---

## Performance Patterns

### Bundle Size

```typescript
// ✅ Dynamic import for heavy components
const RichTextEditor = dynamic(() => import('@/components/ui/rich-text-editor'), {
  loading: () => <Skeleton className="h-32 w-full" />,
  ssr: false,               // client-only libraries
})

// ✅ Barrel file avoidance — import from specific file
import { Button } from '@/components/ui/button'     // ✅ tree-shakes well
import { Button } from '@/components/ui'             // ❌ may pull in everything

// ✅ Analyse bundle with
// ANALYZE=true next build
```

### Memoization Rules

```typescript
// ✅ useMemo — expensive pure computation with stable deps
const sortedSubjects = useMemo(
  () => subjects.sort((a, b) => a.subjectId.localeCompare(b.subjectId)),
  [subjects], // only when subjects reference changes
)

// ✅ useCallback — stable function reference passed to memoized child
const handleSelect = useCallback(
  (id: string) => setSelectedId(id),
  [], // stable — no deps
)

// ❌ Premature useMemo — don't memoize cheap operations
const uppercaseName = useMemo(() => name.toUpperCase(), [name]) // not worth it

// Rule: only add useMemo/useCallback after profiling shows a problem
```

### Images and Fonts

```typescript
// ✅ Always use next/image
import Image from 'next/image'

<Image
  src="/logo.svg"
  alt="Clinical Data Hub logo"
  width={120}
  height={40}
  priority               // for above-the-fold images
/>

// ✅ Always use next/font — zero layout shift
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})
```

### Tailwind Performance

```typescript
// ✅ cn() utility — merges classes correctly, removes conflicts
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Usage
<div className={cn(
  'base-class',
  isActive && 'active-class',
  className,          // consumer override always wins
)} />
```

---

## Refactoring Patterns

### Extract Custom Hook

When a component has >2 `useState` + related logic:

```typescript
// ❌ Before — fat component
function SubjectList({ studyId }: { studyId: string }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string | null>(null)
  const debouncedSearch = useDebounce(search, 300)
  const { data, isLoading } = useSubjects({ studyId, search: debouncedSearch, page, status })
  // ... 80 lines of JSX
}

// ✅ After — thin component + hook
function useSubjectFilters(studyId: string) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string | null>(null)
  const debouncedSearch = useDebounce(search, 300)
  const query = useSubjects({ studyId, search: debouncedSearch, page, status })
  return { search, setSearch, page, setPage, status, setStatus, ...query }
}

function SubjectList({ studyId }: { studyId: string }) {
  const { data, isLoading, search, setSearch, ...filters } = useSubjectFilters(studyId)
  // ... clean JSX only
}
```

### Replace Conditional Rendering with Strategy

```typescript
// ❌ Growing switch in JSX
function FormField({ type, ...props }) {
  if (type === 'text') return <TextInput {...props} />
  if (type === 'date') return <DatePicker {...props} />
  if (type === 'select') return <SelectInput {...props} />
  // grows forever...
}

// ✅ Strategy map — open/closed for extension
const FIELD_COMPONENTS: Record<FieldType, React.ComponentType<FieldProps>> = {
  text: TextInput,
  date: DatePicker,
  select: SelectInput,
  number: NumberInput,
  textarea: TextareaInput,
}

function FormField({ type, ...props }: FieldProps & { type: FieldType }) {
  const Component = FIELD_COMPONENTS[type]
  if (!Component) throw new Error(`Unknown field type: ${type}`)
  return <Component {...props} />
}
```

### Action Result Type

Shared shape for all Server Actions:

```typescript
// types/actions.ts
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string | Record<string, string[]> }

// Usage
export async function createStudy(raw: unknown): Promise<ActionResult<{ id: string }>> {
  // ...
}

// Client side — handle both cases cleanly
const result = await createStudy(values)
if (!result.success) {
  toast.error(typeof result.error === 'string' ? result.error : 'Validation failed')
  return
}
router.push(`/studies/${result.data.id}`)
```

---

## Linting Rules That Must Not Be Disabled

```json
// .eslintrc.json — non-negotiable rules
{
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "import/no-cycle": "error",
    "no-console": ["warn", { "allow": ["error", "warn"] }]
  }
}
```

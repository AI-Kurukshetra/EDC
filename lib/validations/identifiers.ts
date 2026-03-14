import { z } from 'zod'

const POSTGRES_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Postgres accepts UUID literals without enforcing RFC version/variant bits, and the demo seed
// data uses deterministic fixture ids that still satisfy the database type.
export const PostgresUuidSchema = z.string().regex(POSTGRES_UUID_PATTERN, 'Provide a valid UUID')

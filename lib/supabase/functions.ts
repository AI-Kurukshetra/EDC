import { getSupabaseServerEnv } from '@/lib/env'

type EdgeFunctionName = 'audit-log' | 'export-data' | 'generate-queries' | 'send-notification'

export async function invokeEdgeFunction(name: EdgeFunctionName, body: Record<string, unknown>) {
  const env = getSupabaseServerEnv()

  const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Failed to invoke ${name}: ${String(response.status)} ${response.statusText}`)
  }

  return response
}

import { format, parseISO } from 'date-fns'

export function formatDate(value: string | null | undefined) {
  if (!value) return '—'

  return format(parseISO(value), 'dd MMM yyyy')
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '—'

  return format(parseISO(value), 'dd MMM yyyy, HH:mm')
}

export function formatSubjectId(siteCode: string, sequence: number) {
  return `${siteCode}-${String(sequence).padStart(3, '0')}`
}

export function formatPercentage(value: number) {
  return `${String(Math.round(value))}%`
}

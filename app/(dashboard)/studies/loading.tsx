import { SkeletonTable } from '@/components/feedback/SkeletonTable'

type StudiesLoadingProps = Record<string, never>

/** Shows the study table skeleton while the portfolio route is streaming. */
export default function StudiesLoading(_props: StudiesLoadingProps) {
  return <SkeletonTable />
}

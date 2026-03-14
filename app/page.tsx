import { redirect } from 'next/navigation'

type HomePageProps = Record<string, never>

/** Redirects the root route to the primary studies workspace. */
export default function HomePage(_props: HomePageProps): never {
  redirect('/studies')
}

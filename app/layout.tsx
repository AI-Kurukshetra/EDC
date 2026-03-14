import type { ReactNode } from 'react'

import { Providers } from '@/app/providers'

import type { Metadata } from 'next'

import './globals.css'

export const metadata: Metadata = {
  title: 'Clinical Data Hub',
  description: 'Regulatory-grade clinical trial data capture and oversight platform.',
}

type RootLayoutProps = Readonly<{
  children: ReactNode
}>

/** Defines the global HTML shell, fonts, and provider composition for the app. */
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

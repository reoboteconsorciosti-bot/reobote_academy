import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { SessionProvider } from '@/components/session-provider'
import { getSession } from '@/lib/central'
import './globals.css'

export const metadata: Metadata = {
  title: 'Reobote Academy | Formação de Consultores',
  description: 'A jornada de formação dos consultores Reobote.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getSession()
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <SessionProvider session={session}>{children}</SessionProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

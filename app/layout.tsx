import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { FinanceProvider } from '@/components/monee/finance-provider'
import { RouteScrollManager } from '@/components/monee/route-scroll-manager'
import { PageTransition } from '@/components/monee/motion'
import { DemoSessionProvider } from '@/components/monee/demo-session'
import './globals.css'

export const metadata: Metadata = {
  title: 'Monee — See your money in a different light',
  description:
    'Monee is an AI-powered cross-border finance simulator for international students. Test exchange-rate changes, delayed family transfers and big purchases before they happen.',
  generator: 'v0.app',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#17191C',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans">
        <FinanceProvider>
          <DemoSessionProvider>
            <RouteScrollManager />
            <PageTransition>{children}</PageTransition>
          </DemoSessionProvider>
        </FinanceProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

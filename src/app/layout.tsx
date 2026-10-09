import './globals.css'
import { Nunito } from 'next/font/google'
import AppShell from '@/src/components/layout/AppShell'
import { LanguageProvider } from '@/src/context/LanguageContext'
import { ThemeProvider } from '@/src/context/ThemeContext'
import { UserProvider } from '@/src/context/UserContext'
import { AuthProvider } from '@/src/context/AuthContext'
import Script from 'next/script'

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  display: 'swap',
})

export const metadata = {
  title: 'Questly',
  description: 'Learn with daily quests, streaks, and challenges.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {`document.documentElement.classList.add('theme-initializing'); const savedTheme = localStorage.getItem('questly_theme'); const darkTheme = savedTheme === 'dark' || (savedTheme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.classList.toggle('dark', darkTheme); document.documentElement.style.colorScheme = darkTheme ? 'dark' : 'light';`}
        </Script>
      </head>
      <body className={`${nunito.className} bg-slate-50 text-slate-700 min-h-screen antialiased`}>
        <LanguageProvider>
          <ThemeProvider>
            <AuthProvider>
              <UserProvider>
                <AppShell>{children}</AppShell>
              </UserProvider>
            </AuthProvider>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
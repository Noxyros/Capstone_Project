import './globals.css'
import { Nunito } from 'next/font/google'
import Sidebar from '@/src/components/layout/Sidebar'
import StatsPanel from '@/src/components/shared/StatsPanel'
import RightRail from '@/src/components/layout/RightRail'
import { LanguageProvider } from '@/src/context/LanguageContext'
import { ThemeProvider } from '@/src/context/ThemeContext'
import { UserProvider } from '@/src/context/UserContext' // <-- 1. Imported here

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
    <html lang="en">
      <body className={`${nunito.className} bg-slate-50 text-slate-700 min-h-screen antialiased`}>
        <LanguageProvider>
          <ThemeProvider>
            <UserProvider> {/* <-- 2. Wrapped the app here */}
            
            <div className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b-2 border-slate-200 px-4 py-3 shadow-sm">
              <StatsPanel />
            </div>

            <div className="w-full flex">
              <div className="hidden lg:block w-80 shrink-0 border-r-2 border-slate-200 min-h-screen bg-slate-50 relative z-30">
                <div className="sticky top-0 h-screen p-6">
                  <Sidebar />
                </div>
              </div>

              <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
                {children}
              </main>

              <div className="hidden lg:block w-80 shrink-0 border-l-2 border-slate-200 min-h-screen p-6 bg-slate-50 relative z-20">
                <div className="sticky top-6 space-y-6">
                  <StatsPanel />
                  <RightRail />
                </div>
              </div>
            </div>

            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-slate-200">
              <Sidebar mobile={true} />
            </div>

            </UserProvider>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
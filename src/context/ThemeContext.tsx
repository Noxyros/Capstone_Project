'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

export type Theme = 'system' | 'light' | 'dark'
type ResolvedTheme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light')
  const hasInitializedTheme = useRef(false)

  useEffect(() => {
    const systemPreference = window.matchMedia('(prefers-color-scheme: dark)')
    let activeTheme = theme
    if (!hasInitializedTheme.current) {
      const saved = localStorage.getItem('questly_theme')
      activeTheme = saved === 'dark' || saved === 'light' || saved === 'system' ? saved : 'system'
      hasInitializedTheme.current = true
      setThemeState(activeTheme)
    }
    const applyTheme = () => {
      const nextResolvedTheme = activeTheme === 'system'
        ? systemPreference.matches ? 'dark' : 'light'
        : activeTheme
      setResolvedTheme(nextResolvedTheme)
      document.documentElement.classList.toggle('dark', nextResolvedTheme === 'dark')
      document.documentElement.style.colorScheme = nextResolvedTheme
      requestAnimationFrame(() => document.documentElement.classList.remove('theme-initializing'))
    }

    applyTheme()
    if (activeTheme === 'system') {
      systemPreference.addEventListener('change', applyTheme)
      return () => systemPreference.removeEventListener('change', applyTheme)
    }
  }, [theme])

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme)
    localStorage.setItem('questly_theme', nextTheme)
    const nextResolvedTheme = nextTheme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      : nextTheme
    setResolvedTheme(nextResolvedTheme)
    document.documentElement.classList.toggle('dark', nextResolvedTheme === 'dark')
    document.documentElement.style.colorScheme = nextResolvedTheme
  }

  return <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)

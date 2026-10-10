'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/src/context/AuthContext'

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { role } = useAuth()
  const hasTeacherAccess = role === 'TEACHER' || role === 'ADMIN'

  useEffect(() => {
    if (!hasTeacherAccess) router.replace('/')
  }, [hasTeacherAccess, router])

  return hasTeacherAccess ? children : null
}

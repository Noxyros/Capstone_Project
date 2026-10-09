import { redirect } from 'next/navigation'
import { authenticateAppUser } from '@/src/lib/auth/server'

export const dynamic = 'force-dynamic'

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const authentication = await authenticateAppUser()
  if (
    !authentication.appUser
    || (authentication.appUser.role !== 'TEACHER' && authentication.appUser.role !== 'ADMIN')
  ) {
    redirect('/')
  }
  return children
}

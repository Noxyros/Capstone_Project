import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/src/lib/supabase/server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const requestedPath = request.nextUrl.searchParams.get('next') ?? '/'
  const nextPath = requestedPath.startsWith('/') && !requestedPath.startsWith('//') ? requestedPath : '/'

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=confirmation', request.url))
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('Supabase email confirmation code exchange failed.', error)
      return NextResponse.redirect(new URL('/login?error=confirmation', request.url))
    }
    return NextResponse.redirect(new URL(nextPath, request.url))
  } catch (error) {
    console.error('Unable to complete the Supabase auth callback.', error)
    return NextResponse.redirect(new URL('/login?error=configuration', request.url))
  }
}

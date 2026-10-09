import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isAuthRoute = pathname === '/login' || pathname.startsWith('/auth/')
  const isApiRoute = pathname.startsWith('/api/')
  const isPublicAuthApi = pathname === '/api/auth/username-login'
    || pathname === '/api/auth/username-availability'
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) {
    if (isAuthRoute) return NextResponse.next({ request })
    if (isApiRoute) {
      return NextResponse.json({ error: 'Authentication is not configured.' }, { status: 503 })
    }
    const loginUrl = new URL('/login?error=configuration', request.url)
    return NextResponse.redirect(loginUrl)
  }

  let response = NextResponse.next({ request })
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  const { data, error } = await supabase.auth.getClaims()
  const isAuthenticated = !error && Boolean(data?.claims)

  if (pathname === '/login' && isAuthenticated) {
    const requestedPath = request.nextUrl.searchParams.get('next') ?? '/'
    const nextPath = requestedPath.startsWith('/') && !requestedPath.startsWith('//') ? requestedPath : '/'
    const destination = new URL(nextPath, request.url)
    const redirect = NextResponse.redirect(destination)
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    return redirect
  }

  if (isAuthRoute) return response
  if (isPublicAuthApi) return response

  if (!isAuthenticated) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`)
    const redirect = NextResponse.redirect(loginUrl)
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    return redirect
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

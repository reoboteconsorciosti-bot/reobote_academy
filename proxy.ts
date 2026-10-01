import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, cookieBase, needsRefresh, openSession, refreshSession, sealSession, sessionCookieOptions } from '@/lib/auth'

// Toda página e rota /api passa por aqui:
// - sem sessão válida → página: /auth/start (login no CRM) | API: 401;
// - access token perto de vencer → renova no backend e regrava o cookie cifrado;
// - /admin só para role "admin".
export async function proxy(request: NextRequest) {
  const isApi = request.nextUrl.pathname.startsWith('/api/')
  let session = await openSession(request.cookies.get(SESSION_COOKIE)?.value)
  let renewedCookie: string | null = null

  if (session && needsRefresh(session)) {
    session = await refreshSession(session)
    if (session) renewedCookie = await sealSession(session)
  }

  if (!session) {
    const res = isApi
      ? NextResponse.json({ error: 'Sessão expirada' }, { status: 401 })
      : NextResponse.redirect(new URL('/auth/start', request.url))
    res.cookies.set(SESSION_COOKIE, '', { ...cookieBase, path: '/', maxAge: 0 })
    res.headers.set('Cache-Control', 'no-store')
    return res
  }

  if (request.nextUrl.pathname.startsWith('/admin') && session.role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Se renovou, a própria requisição já segue com o cookie novo para as páginas/rotas.
  const headers = new Headers(request.headers)
  if (renewedCookie) headers.set('cookie', withCookie(request.headers.get('cookie') ?? '', SESSION_COOKIE, renewedCookie))

  const res = NextResponse.next({ request: { headers } })
  if (renewedCookie) res.cookies.set(SESSION_COOKIE, renewedCookie, sessionCookieOptions(session))
  res.headers.set('Cache-Control', 'private, no-store')
  return res
}

function withCookie(header: string, name: string, value: string) {
  const others = header.split(';').map(c => c.trim()).filter(c => c && !c.startsWith(`${name}=`))
  return [...others, `${name}=${value}`].join('; ')
}

export const config = {
  // Fora: login (/auth/*), /entrar e arquivos estáticos. /api entra para renovar a sessão e responder 401 sem sessão.
  matcher: ['/((?!auth|entrar|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)'],
}

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { AUTH_COOKIE, authConfigured, cookieBase, createPendingAuth, redirectTo } from '@/lib/auth'
import { clientIp, rateLimit } from '@/lib/rate-limit'

// Início do login: gera state + PKCE, guarda em cookie cifrado de curta duração e manda o navegador ao CRM.
export async function GET(request: NextRequest) {
  if (!rateLimit(`auth-start:${clientIp(request)}`, 30, 60_000).ok) return redirectTo(request, '/entrar?erro=tentativas')
  if (!authConfigured()) return redirectTo(request, '/entrar?erro=indisponivel')

  const { url, cookie, maxAge } = await createPendingAuth()
  const res = NextResponse.redirect(url, 303)
  res.cookies.set(AUTH_COOKIE, cookie, { ...cookieBase, path: '/auth', maxAge })
  res.headers.set('Cache-Control', 'no-store')
  res.headers.set('Referrer-Policy', 'no-referrer')
  return res
}

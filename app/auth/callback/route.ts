import type { NextRequest } from 'next/server'
import { AUTH_COOKIE, SESSION_COOKIE, authConfigured, cookieBase, exchangeCode, readPendingAuth, redirectTo, sealSession, sessionCookieOptions } from '@/lib/auth'
import { safeEqual } from '@/lib/crypto'
import { clientIp, rateLimit } from '@/lib/rate-limit'

// Retorno do CRM: /auth/callback?code=<code>&state=<state>.
// Valida o state, troca o code no backend e cria a sessão. Nunca registrar code/state/tokens.
// Qualquer falha leva a /entrar com uma mensagem genérica (sem detalhes internos).
export async function GET(request: NextRequest) {
  const finish = (path: string) => {
    const res = redirectTo(request, path)
    res.cookies.set(AUTH_COOKIE, '', { ...cookieBase, path: '/auth', maxAge: 0 }) // o state é de uso único
    return res
  }

  if (!rateLimit(`auth-callback:${clientIp(request)}`, 20, 60_000).ok) return finish('/entrar?erro=tentativas')
  if (!authConfigured()) return finish('/entrar?erro=indisponivel')

  const params = request.nextUrl.searchParams
  const state = params.get('state')
  const code = params.get('code')
  const pending = await readPendingAuth(request.cookies.get(AUTH_COOKIE)?.value)

  if (!pending || !state || !safeEqual(state, pending.state)) return finish('/entrar?erro=acesso')
  if (params.has('error') || !code || code.length > 512) return finish('/entrar?erro=acesso')

  const session = await exchangeCode(code, pending.verifier)
  if (!session) return finish('/entrar?erro=acesso')

  const res = finish('/')
  res.cookies.set(SESSION_COOKIE, await sealSession(session), sessionCookieOptions(session))
  return res
}

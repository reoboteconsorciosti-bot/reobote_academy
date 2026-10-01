import type { NextRequest } from 'next/server'
import { SESSION_COOKIE, cookieBase, redirectTo } from '@/lib/auth'

// Chamado quando o CRM recusa o token (401/403): apaga a sessão local e leva à tela de login.
// Não redireciona direto para /auth/start para não entrar em loop se o CRM recusar o usuário de novo.
export async function GET(request: NextRequest) {
  const res = redirectTo(request, '/entrar?expirou=1')
  res.cookies.set(SESSION_COOKIE, '', { ...cookieBase, path: '/', maxAge: 0 })
  return res
}

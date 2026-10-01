import type { NextRequest } from 'next/server'
import { SESSION_COOKIE, cookieBase, redirectTo } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const res = redirectTo(request, '/entrar?saiu=1')
  res.cookies.set(SESSION_COOKIE, '', { ...cookieBase, path: '/', maxAge: 0 })
  return res
}

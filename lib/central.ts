// Chamadas à API do CRM. Roda SOMENTE no servidor da Academy: o access token fica na sessão cifrada
// (cookie HttpOnly) e nunca chega ao navegador. Nunca registrar o token em log.
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE, cookieBase, crmUrl, openSession, type AcademySession } from './auth'
import type { CentralUser, ConsultantProgress, Session } from './user'

export type { CentralUser, ConsultantProgress, Session } from './user'

const endpoints = {
  currentUser: '/api/academy/me',               // GET  → CentralUser
  myProgress: '/api/academy/progresso/me',      // GET  → { completedLessonIds: string[] }
  registerProgress: '/api/academy/progresso',   // POST { aulaId } → 201 (nova) | 200 (já existia)
  allProgress: '/api/academy/progresso',        // GET  → ConsultantProgress[] (só admin; senão 403)
}

const emptySession: Session = { user: null, completedLessonIds: [] }
const rejected = (res: Response | null) => res?.status === 401 || res?.status === 403

async function currentSession() {
  return openSession((await cookies()).get(SESSION_COOKIE)?.value)
}

async function crmFetch(session: AcademySession, path: string, init: RequestInit = {}) {
  if (!crmUrl()) return null
  try {
    return await fetch(`${crmUrl()}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${session.accessToken}`, ...init.headers },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    return null
  }
}

// CRM recusou o token: apaga a sessão local e leva a um novo login.
function endSession(): never {
  redirect('/auth/sessao-expirada')
}

// GET: usuário logado + aulas concluídas. `cache` evita repetir as chamadas na mesma requisição (layout + página).
export const getSession = cache(async (): Promise<Session> => {
  const session = await currentSession()
  if (!session) return emptySession

  const [userRes, progressRes] = await Promise.all([
    crmFetch(session, endpoints.currentUser, { method: 'GET' }),
    crmFetch(session, endpoints.myProgress, { method: 'GET' }),
  ])
  if (rejected(userRes) || rejected(progressRes)) endSession()

  // CRM fora do ar ou limitando (429): segue com o mínimo que a sessão sabe.
  const user: CentralUser = userRes?.ok ? await userRes.json() : { id: session.sub, name: 'Usuário', email: '', role: session.role }
  const progress: { completedLessonIds?: string[] } | null = progressRes?.ok ? await progressRes.json() : null
  return { user, completedLessonIds: progress?.completedLessonIds ?? [] }
})

// POST: registra aula concluída. Chamado pela rota /api/progresso (Route Handler, onde dá para apagar o cookie).
export async function registerLessonCompleted(aulaId: string) {
  const session = await currentSession()
  if (!session) return { ok: false, status: 401, retryAfter: null }

  const res = await crmFetch(session, endpoints.registerProgress, { method: 'POST', body: JSON.stringify({ aulaId }) })
  if (!res) return { ok: false, status: 502, retryAfter: null }
  if (rejected(res)) {
    (await cookies()).set(SESSION_COOKIE, '', { ...cookieBase, path: '/', maxAge: 0 })
    return { ok: false, status: 401, retryAfter: null }
  }
  return { ok: res.ok, status: res.status, retryAfter: res.headers.get('Retry-After') }
}

// GET: progresso de todos os consultores (só admin).
export async function getConsultantsProgress(): Promise<ConsultantProgress[]> {
  const session = await currentSession()
  if (!session) return []
  const res = await crmFetch(session, endpoints.allProgress, { method: 'GET' })
  if (rejected(res)) endSession()
  if (!res?.ok) return []
  return res.json()
}

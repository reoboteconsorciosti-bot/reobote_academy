// SSO com o CRM: Authorization Code + PKCE (S256), troca servidor-servidor.
// Usado pelo proxy e pelas rotas /auth/*. Nunca registrar code, state, verifier ou tokens em log.
import { NextResponse, type NextRequest } from 'next/server'
import { randomToken, seal, sha256Base64Url, unseal } from './crypto'

export const SESSION_COOKIE = 'academy_session'
export const AUTH_COOKIE = 'academy_auth'

const AUTH_TTL_SECONDS = 10 * 60          // tempo máximo entre /auth/start e /auth/callback
const REFRESH_MARGIN_SECONDS = 60         // renova o access token quando faltar menos que isso
const MAX_SESSION_SECONDS = 8 * 60 * 60   // teto absoluto da sessão, mesmo com renovações
const CRM_TIMEOUT_MS = 10_000

export type Role = 'admin' | 'consultor'

// Conteúdo da sessão, guardado CIFRADO no cookie HttpOnly. O navegador não consegue ler nem alterar.
export type AcademySession = {
  sub: string
  role: Role
  accessToken: string
  accessExpiresAt: number
  refreshToken: string | null
  expiresAt: number
}

type PendingAuth = { state: string; verifier: string; expiresAt: number }

type TokenResponse = {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  refresh_expires_in?: number
  user: { id: string; role: Role }
}

const now = () => Math.floor(Date.now() / 1000)

export const crmUrl = () => (process.env.CRM_URL ?? '').replace(/\/+$/, '')

export const cookieBase = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const }

export function authConfigured() {
  const missing = missingAuthConfig()
  if (missing.length) logAuth('login indisponível: configuração ausente', missing.join(', '))
  return missing.length === 0
}

// Endereço PÚBLICO da Academy. Atrás de proxy/container (Easypanel, Docker) o request.url é o endereço
// interno (ex.: https://0.0.0.0:3000), inacessível pelo navegador. Em produção, ACADEMY_URL é obrigatória;
// em dev, sem ela, usa o próprio endereço da requisição (localhost).
export function publicUrl(path: string, request: NextRequest) {
  const base = (process.env.ACADEMY_URL ?? '').trim().replace(/\/+$/, '')
  return new URL(path, base || request.url)
}

// Log de diagnóstico do login: só o MOTIVO, nunca code, state, verifier, tokens ou segredos.
export function logAuth(event: string, detail?: string) {
  console.warn(`[auth] ${event}${detail ? ` (${detail.replace(/[^\p{L}\p{N} _.:/()-]/gu, '').slice(0, 160)})` : ''}`)
}

// Nomes (nunca valores) das variáveis que faltam para o login funcionar.
export function missingAuthConfig() {
  return [
    !crmUrl() && 'CRM_URL',
    !process.env.ACADEMY_CLIENT_ID && 'ACADEMY_CLIENT_ID',
    !process.env.ACADEMY_CLIENT_SECRET && 'ACADEMY_CLIENT_SECRET',
    (process.env.ACADEMY_SESSION_SECRET ?? '').length < 32 && 'ACADEMY_SESSION_SECRET (mín. 32 caracteres)',
    process.env.NODE_ENV === 'production' && !process.env.ACADEMY_URL && 'ACADEMY_URL',
  ].filter(Boolean) as string[]
}

// Resposta de redirecionamento para um caminho FIXO da Academy (nunca vindo do navegador), sem cache e sem referrer.
export function redirectTo(request: NextRequest, path: string) {
  const res = NextResponse.redirect(publicUrl(path, request), 303)
  res.headers.set('Cache-Control', 'no-store')
  res.headers.set('Referrer-Policy', 'no-referrer')
  return res
}

// ---------- Passo 1: /auth/start ----------

export async function createPendingAuth() {
  const state = randomToken(32)
  const verifier = randomToken(48) // 64 caracteres (PKCE exige 43 a 128)
  const challenge = await sha256Base64Url(verifier)

  const url = new URL(`${crmUrl()}/api/academy/authorize`)
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.ACADEMY_CLIENT_ID ?? '',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  }).toString()

  const cookie = await seal({ state, verifier, expiresAt: now() + AUTH_TTL_SECONDS } satisfies PendingAuth, AUTH_COOKIE)
  return { url, cookie, maxAge: AUTH_TTL_SECONDS }
}

export async function readPendingAuth(value: string | undefined) {
  const pending = await unseal<PendingAuth>(value, AUTH_COOKIE)
  if (!pending || typeof pending.state !== 'string' || typeof pending.verifier !== 'string' || pending.expiresAt < now()) return null
  return pending
}

// ---------- Passo 2: troca do code (backend → CRM) ----------

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse | null> {
  const clientId = process.env.ACADEMY_CLIENT_ID ?? ''
  const clientSecret = process.env.ACADEMY_CLIENT_SECRET ?? ''
  const basic = btoa(`${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`)
  try {
    const res = await fetch(`${crmUrl()}/api/academy/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', Authorization: `Basic ${basic}` },
      body: new URLSearchParams({ ...params, client_id: clientId }),
      cache: 'no-store',
      signal: AbortSignal.timeout(CRM_TIMEOUT_MS),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      logAuth(`/token (${params.grant_type}) recusado pelo CRM`, `HTTP ${res.status} ${typeof data?.error === 'string' ? data.error : ''}`)
      return null
    }
    const problems = [
      !(typeof data?.access_token === 'string' && data.access_token.length > 0) && 'access_token',
      !(typeof data?.token_type === 'string' && data.token_type.toLowerCase() === 'bearer') && 'token_type',
      !(typeof data?.expires_in === 'number' && data.expires_in > 0) && 'expires_in',
      !(typeof data?.user?.id === 'string' && data.user.id.length > 0) && 'user.id',
      !(data?.user?.role === 'admin' || data?.user?.role === 'consultor') && 'user.role',
    ].filter(Boolean)
    if (problems.length) {
      logAuth(`/token (${params.grant_type}) com resposta fora do contrato`, `campos: ${problems.join(', ')}`)
      return null
    }
    return data
  } catch (error) {
    const cause = (error as { cause?: { code?: string } })?.cause?.code ?? (error as Error)?.name
    logAuth(`/token (${params.grant_type}) sem resposta do CRM`, cause)
    return null
  }
}

function toSession(token: TokenResponse, previous?: AcademySession): AcademySession {
  const t = now()
  const refreshLifetime = token.refresh_token ? (token.refresh_expires_in ?? MAX_SESSION_SECONDS) : token.expires_in
  return {
    sub: token.user.id,
    role: token.user.role,
    accessToken: token.access_token,
    accessExpiresAt: t + token.expires_in,
    refreshToken: token.refresh_token ?? previous?.refreshToken ?? null,
    expiresAt: previous?.expiresAt ?? t + Math.min(refreshLifetime, MAX_SESSION_SECONDS),
  }
}

export async function exchangeCode(code: string, verifier: string) {
  const token = await tokenRequest({ grant_type: 'authorization_code', code, code_verifier: verifier })
  return token ? toSession(token) : null
}

// ---------- Renovação (somente no backend) ----------

const pendingRefreshes = new Map<string, Promise<AcademySession | null>>()

export function needsRefresh(session: AcademySession) {
  return session.accessExpiresAt - REFRESH_MARGIN_SECONDS <= now()
}

// Várias requisições simultâneas da mesma sessão compartilham a mesma renovação.
export function refreshSession(session: AcademySession): Promise<AcademySession | null> {
  if (!session.refreshToken || session.expiresAt <= now()) return Promise.resolve(null)
  const key = session.refreshToken
  const inFlight = pendingRefreshes.get(key)
  if (inFlight) return inFlight

  const promise = tokenRequest({ grant_type: 'refresh_token', refresh_token: session.refreshToken })
    .then(token => (token && token.user.id === session.sub ? toSession(token, session) : null))
    .finally(() => setTimeout(() => pendingRefreshes.delete(key), 5_000))
  pendingRefreshes.set(key, promise)
  return promise
}

// ---------- Sessão cifrada ----------

export function sealSession(session: AcademySession) {
  return seal(session, SESSION_COOKIE)
}

export async function openSession(value: string | undefined | null) {
  const s = await unseal<AcademySession>(value, SESSION_COOKIE)
  if (!s || typeof s.sub !== 'string' || typeof s.accessToken !== 'string' || (s.role !== 'admin' && s.role !== 'consultor')) return null
  if (s.expiresAt <= now()) return null
  if (s.accessExpiresAt <= now() && !s.refreshToken) return null
  return s
}

export function sessionCookieOptions(session: AcademySession) {
  return { ...cookieBase, path: '/', maxAge: Math.max(0, session.expiresAt - now()) }
}

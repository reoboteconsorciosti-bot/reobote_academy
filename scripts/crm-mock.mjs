// CRM SIMULADO para desenvolvimento e testes do SSO (Authorization Code + PKCE).
// Segue o contrato de docs/CONTRATO-SSO-CRM.md. NÃO usar em produção.
//
// Uso manual:  pnpm crm:mock   (porta 3005)
//   Na Academy (.env.local): CRM_URL=http://localhost:3005 e as mesmas ACADEMY_CLIENT_ID / ACADEMY_CLIENT_SECRET.
//   Abra http://localhost:3005 e clique em "Ver treinamento".
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'

const random = (bytes = 32) => randomBytes(bytes).toString('base64url')
const s256 = value => createHash('sha256').update(value).digest('base64url')
const sameText = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y) }

const USERS = {
  u1: { id: 'u1', name: 'João Silva', email: 'joao@exemplo.com', role: 'consultor', active: true },
  u2: { id: 'u2', name: 'Maria Costa', email: 'maria@exemplo.com', role: 'admin', active: true },
  u3: { id: 'u3', name: 'Pedro Almeida', email: 'pedro@exemplo.com', role: 'consultor', active: true },
}

export function startMockCrm({ port = 3005, academyUrl = 'http://localhost:3001', clientId, clientSecret, accessTtl = 900, refreshTtl = 8 * 3600, codeTtl = 60, testHooks = false } = {}) {
  const s = { users: structuredClone(USERS), codes: new Map(), access: new Map(), refresh: new Map(), progress: new Map(), issued: [], counters: { exchange: 0, refresh: 0 }, accessTtl, codeTtl, revokeOldOnRefresh: false }

  const send = (res, status, body, headers = {}) => {
    const isJson = typeof body !== 'string'
    res.writeHead(status, { 'Content-Type': isJson ? 'application/json' : 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...headers })
    res.end(isJson ? JSON.stringify(body) : body)
  }
  const redirect = (res, location) => { res.writeHead(302, { Location: location, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }); res.end() }
  const cookie = (req, name) => (req.headers.cookie ?? '').split(';').map(c => c.trim()).find(c => c.startsWith(`${name}=`))?.slice(name.length + 1)

  function issueTokens(user, keepRefresh) {
    const now = Date.now()
    const accessToken = random()
    s.access.set(accessToken, { userId: user.id, expiresAt: now + s.accessTtl * 1000 })
    let refreshToken = keepRefresh
    if (!refreshToken) {
      refreshToken = random()
      s.refresh.set(refreshToken, { userId: user.id, expiresAt: now + refreshTtl * 1000 })
    }
    s.issued.push(accessToken, refreshToken)
    const refreshLeft = Math.floor((s.refresh.get(refreshToken).expiresAt - now) / 1000)
    return { access_token: accessToken, token_type: 'Bearer', expires_in: s.accessTtl, refresh_token: refreshToken, refresh_expires_in: refreshLeft, user: { id: user.id, name: user.name, email: user.email, role: user.role } }
  }

  function bearerUser(req) {
    const auth = req.headers.authorization ?? ''
    if (!auth.startsWith('Bearer ')) return null
    const rec = s.access.get(auth.slice(7))
    const user = rec && rec.expiresAt > Date.now() ? s.users[rec.userId] : null
    return user?.active ? user : null
  }

  function clientAuthenticated(req, bodyClientId) {
    const auth = req.headers.authorization ?? ''
    if (!auth.startsWith('Basic ')) return false
    const decoded = Buffer.from(auth.slice(6), 'base64').toString()
    const i = decoded.indexOf(':')
    if (i < 0) return false
    const id = decodeURIComponent(decoded.slice(0, i)), secret = decodeURIComponent(decoded.slice(i + 1))
    return sameText(id, clientId) && sameText(secret, clientSecret) && (!bodyClientId || bodyClientId === clientId)
  }

  async function handler(req, res) {
    const url = new URL(req.url, `http://localhost:${port}`)
    let raw = ''
    for await (const chunk of req) raw += chunk

    // Página inicial do "CRM": o botão leva à Academy, que inicia o login.
    if (req.method === 'GET' && url.pathname === '/') {
      return send(res, 200, `<!doctype html><meta charset="utf-8"><title>CRM simulado</title><body style="font-family:sans-serif;padding:40px"><h1>CRM simulado</h1><p><a href="${academyUrl}/auth/start">Ver treinamento</a></p></body>`)
    }

    // Simula o login no CRM (escolha do usuário).
    if (req.method === 'GET' && url.pathname === '/login') {
      const user = s.users[url.searchParams.get('user')]
      const next = url.searchParams.get('next') ?? '/'
      if (!user || !next.startsWith('/api/academy/authorize?')) return send(res, 400, 'Requisição inválida')
      res.setHeader('Set-Cookie', `crm_mock_user=${user.id}; Path=/; HttpOnly; SameSite=Lax`)
      return redirect(res, next)
    }

    // ---------- GET /api/academy/authorize ----------
    if (req.method === 'GET' && url.pathname === '/api/academy/authorize') {
      const q = url.searchParams
      const state = q.get('state') ?? ''
      const challenge = q.get('code_challenge') ?? ''
      const valid = q.get('response_type') === 'code' && q.get('client_id') === clientId && q.get('code_challenge_method') === 'S256' && /^[A-Za-z0-9_-]{43}$/.test(challenge) && state.length > 0 && state.length <= 512
      if (!valid) return send(res, 400, 'Requisição de autorização inválida')

      const user = s.users[cookie(req, 'crm_mock_user')]
      if (!user) {
        const next = encodeURIComponent(url.pathname + url.search)
        const list = Object.values(s.users).map(u => `<li><a href="/login?user=${u.id}&next=${next}">${u.name} (${u.role}${u.active ? '' : ', desativado'})</a></li>`).join('')
        return send(res, 200, `<!doctype html><meta charset="utf-8"><title>Login CRM simulado</title><body style="font-family:sans-serif;padding:40px"><h1>Login no CRM (simulado)</h1><p>Entrar como:</p><ul>${list}</ul></body>`)
      }
      const callback = new URL(`${academyUrl}/auth/callback`)
      if (!user.active) {
        callback.search = new URLSearchParams({ error: 'access_denied', state }).toString()
        return redirect(res, callback.toString())
      }
      const code = random()
      s.codes.set(code, { challenge, userId: user.id, expiresAt: Date.now() + s.codeTtl * 1000, used: false })
      callback.search = new URLSearchParams({ code, state }).toString()
      return redirect(res, callback.toString())
    }

    // ---------- POST /api/academy/token ----------
    if (req.method === 'POST' && url.pathname === '/api/academy/token') {
      const form = new URLSearchParams(raw)
      if (!clientAuthenticated(req, form.get('client_id'))) return send(res, 401, { error: 'invalid_client' }, { 'WWW-Authenticate': 'Basic realm="academy"' })
      const invalidGrant = () => send(res, 400, { error: 'invalid_grant' })

      if (form.get('grant_type') === 'authorization_code') {
        s.counters.exchange++
        const rec = s.codes.get(form.get('code') ?? '')
        if (!rec) return invalidGrant()
        if (rec.used) return invalidGrant()
        rec.used = true // uso único: marca antes de qualquer outra validação
        if (rec.expiresAt <= Date.now()) return invalidGrant()
        const verifier = form.get('code_verifier') ?? ''
        if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier) || !sameText(s256(verifier), rec.challenge)) return invalidGrant()
        const user = s.users[rec.userId]
        if (!user?.active) return invalidGrant()
        return send(res, 200, issueTokens(user), { Pragma: 'no-cache' })
      }

      if (form.get('grant_type') === 'refresh_token') {
        s.counters.refresh++
        const token = form.get('refresh_token') ?? ''
        const rec = s.refresh.get(token)
        const user = rec && rec.expiresAt > Date.now() ? s.users[rec.userId] : null
        if (!user?.active) return invalidGrant()
        if (s.revokeOldOnRefresh) for (const [at, a] of s.access) if (a.userId === user.id) s.access.delete(at)
        return send(res, 200, issueTokens(user, token), { Pragma: 'no-cache' })
      }
      return send(res, 400, { error: 'unsupported_grant_type' })
    }

    // ---------- API de dados (Bearer) ----------
    if (url.pathname.startsWith('/api/academy/')) {
      const user = bearerUser(req)
      if (!user) return send(res, 401, { error: 'Token inválido ou expirado' })
      const list = s.progress.get(user.id) ?? []
      if (req.method === 'GET' && url.pathname === '/api/academy/me') return send(res, 200, { id: user.id, name: user.name, email: user.email, role: user.role })
      if (req.method === 'GET' && url.pathname === '/api/academy/progresso/me') return send(res, 200, { completedLessonIds: list.map(p => p.aulaId) })
      if (req.method === 'POST' && url.pathname === '/api/academy/progresso') {
        const aulaId = JSON.parse(raw || '{}').aulaId
        if (typeof aulaId !== 'string' || !/^[a-z0-9-]{1,100}$/.test(aulaId)) return send(res, 400, { error: 'aulaId inválido' })
        const existing = list.find(p => p.aulaId === aulaId)
        if (existing) return send(res, 200, existing)
        const created = { aulaId, concluidaEm: new Date().toISOString() }
        s.progress.set(user.id, [...list, created])
        return send(res, 201, created)
      }
      if (req.method === 'GET' && url.pathname === '/api/academy/progresso') {
        if (user.role !== 'admin') return send(res, 403, { error: 'Acesso restrito' })
        return send(res, 200, Object.values(s.users).filter(u => u.role === 'consultor' && u.active).map(u => {
          const p = s.progress.get(u.id) ?? []
          return { id: u.id, name: u.name, email: u.email, completedLessonIds: p.map(x => x.aulaId), lastActivity: p.at(-1)?.concluidaEm ?? null }
        }))
      }
    }

    // ---------- Ganchos de teste ----------
    if (testHooks && url.pathname.startsWith('/__test/')) {
      const q = url.searchParams
      if (url.pathname === '/__test/expire-codes') { for (const c of s.codes.values()) c.expiresAt = 0; return send(res, 200, { ok: true }) }
      if (url.pathname === '/__test/access-ttl') { s.accessTtl = Number(q.get('seconds')); s.revokeOldOnRefresh = q.get('revoke') === '1'; return send(res, 200, { ok: true }) }
      if (url.pathname === '/__test/active') { s.users[q.get('user')].active = q.get('value') === '1'; return send(res, 200, { ok: true }) }
      if (url.pathname === '/__test/state') return send(res, 200, { issued: s.issued, codes: [...s.codes.keys()], counters: s.counters, progress: Object.fromEntries(s.progress) })
    }

    send(res, 404, { error: 'not found' })
  }

  const server = createServer((req, res) => handler(req, res).catch(() => send(res, 500, { error: 'erro interno' })))
  return new Promise(resolve => server.listen(port, () => resolve({ state: s, close: () => new Promise(r => server.close(r)) })))
}

function readEnvFiles() {
  const env = {}
  for (const file of ['.env', '.env.local']) {
    try {
      for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/)
        if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
      }
    } catch {}
  }
  return { ...env, ...process.env }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const env = readEnvFiles()
  if (!env.ACADEMY_CLIENT_ID || !env.ACADEMY_CLIENT_SECRET) {
    console.error('Defina ACADEMY_CLIENT_ID e ACADEMY_CLIENT_SECRET no .env.local.')
    process.exit(1)
  }
  const port = Number(env.CRM_MOCK_PORT ?? 3005)
  await startMockCrm({ port, academyUrl: env.ACADEMY_URL ?? 'http://localhost:3001', clientId: env.ACADEMY_CLIENT_ID, clientSecret: env.ACADEMY_CLIENT_SECRET })
  console.log(`CRM simulado em http://localhost:${port} (Academy: ${env.ACADEMY_URL ?? 'http://localhost:3001'}).`)
  console.log(`Na Academy use CRM_URL=http://localhost:${port}.`)
}

export { readEnvFiles }

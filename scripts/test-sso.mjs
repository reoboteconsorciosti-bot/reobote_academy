// Testes de ponta a ponta do SSO (Academy + CRM simulado).
// Pré-requisito: Academy rodando com CRM_URL=http://localhost:3005 e as mesmas credenciais do .env.local.
// Uso: pnpm test:sso        (ACADEMY_URL padrão: http://localhost:3001)
import { existsSync, readFileSync } from 'node:fs'
import { readEnvFiles, startMockCrm } from './crm-mock.mjs'

const env = readEnvFiles()
const ACADEMY = (env.ACADEMY_URL ?? 'http://localhost:3001').replace(/\/+$/, '')
const CRM_PORT = Number(env.CRM_MOCK_PORT ?? 3005)
const CRM = `http://localhost:${CRM_PORT}`

let failures = 0
const check = (name, ok, info = '') => { console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${!ok && info ? ` — ${info}` : ''}`); if (!ok) failures++ }
const section = title => console.log(`\n# ${title}`)

// Pote de cookies mínimo, com respeito a Path (o cookie do state usa Path=/auth).
class Jar {
  constructor() { this.cookies = new Map() }
  store(res) {
    for (const raw of res.headers.getSetCookie()) {
      const [pair, ...attrs] = raw.split(';')
      const i = pair.indexOf('=')
      const name = pair.slice(0, i).trim(), value = pair.slice(i + 1).trim()
      const a = Object.fromEntries(attrs.map(x => { const [k, ...v] = x.trim().split('='); return [k.toLowerCase(), v.join('=')] }))
      const path = a.path || '/'
      const expired = value === '' || a['max-age'] === '0' || (a.expires && new Date(a.expires) < new Date())
      const key = `${name}|${path}`
      if (expired) this.cookies.delete(key); else this.cookies.set(key, { name, value, path, raw })
    }
  }
  header(pathname) { return [...this.cookies.values()].filter(c => pathname.startsWith(c.path)).map(c => `${c.name}=${c.value}`).join('; ') }
  find(name) { return [...this.cookies.values()].find(c => c.name === name) }
}

const responses = [] // tudo que a Academy devolveu ao "navegador", para procurar vazamentos

async function academy(jar, path, init = {}) {
  const url = new URL(path, ACADEMY)
  const res = await fetch(url, { ...init, redirect: 'manual', headers: { ...(init.headers ?? {}), cookie: jar.header(url.pathname) } })
  const body = await res.text()
  jar.store(res)
  responses.push({ path: url.pathname, text: `${res.status}\n${[...res.headers].map(([k, v]) => `${k}: ${v}`).join('\n')}\n${res.headers.getSetCookie().join('\n')}\n${body}` })
  return { status: res.status, location: res.headers.get('location'), body, res }
}
const hook = async path => (await fetch(`${CRM}/__test/${path}`, { method: 'POST' })).json()
const crmState = async () => (await fetch(`${CRM}/__test/state`, { method: 'POST' })).json()

async function start(jar) {
  const r = await academy(jar, '/auth/start')
  return { r, url: new URL(r.location) }
}
async function authorize(url, userId) {
  const res = await fetch(url, { redirect: 'manual', headers: { cookie: `crm_mock_user=${userId}` } })
  const loc = new URL(res.headers.get('location'))
  return { code: loc.searchParams.get('code'), state: loc.searchParams.get('state'), error: loc.searchParams.get('error'), path: loc.pathname + loc.search }
}
async function login(userId) {
  const jar = new Jar()
  const { url } = await start(jar)
  const a = await authorize(url, userId)
  const cb = await academy(jar, a.path)
  return { jar, cb, code: a.code }
}
const failedToEntrar = (r, erro = 'acesso') => r.status === 303 && r.location?.endsWith(`/entrar?erro=${erro}`)

const mock = await startMockCrm({ port: CRM_PORT, academyUrl: ACADEMY, clientId: env.ACADEMY_CLIENT_ID, clientSecret: env.ACADEMY_CLIENT_SECRET, testHooks: true })

try {
  section('Pré-requisitos')
  const pre = await academy(new Jar(), '/auth/start')
  if (!pre.location?.startsWith(`${CRM}/api/academy/authorize`)) {
    console.log(`A Academy em ${ACADEMY} não está apontando para ${CRM}. Configure CRM_URL=${CRM} e as credenciais no .env.local.`)
    process.exitCode = 1
    throw new Error('stop')
  }
  check('Academy aponta para o CRM simulado', true)

  section('Sem sessão')
  let r = await academy(new Jar(), '/')
  check('página sem sessão → /auth/start', r.status === 307 && r.location?.endsWith('/auth/start'), `${r.status} ${r.location}`)
  r = await academy(new Jar(), '/api/progresso', { method: 'POST', body: '{"aulaId":"introducao"}', headers: { 'Content-Type': 'application/json' } })
  check('API sem sessão → 401', r.status === 401, `${r.status}`)

  section('Início do login (/auth/start) e PKCE')
  const jarStart = new Jar()
  const s1 = await start(jarStart)
  const q = s1.url.searchParams
  check('usa code_challenge_method=S256', q.get('code_challenge_method') === 'S256')
  check('code_challenge tem 43 caracteres base64url', /^[A-Za-z0-9_-]{43}$/.test(q.get('code_challenge') ?? ''))
  check('state aleatório (≥ 43 caracteres)', (q.get('state') ?? '').length >= 43)
  check('response_type=code e client_id presentes', q.get('response_type') === 'code' && q.get('client_id') === env.ACADEMY_CLIENT_ID)
  check('sem redirect_uri/token/e-mail na URL do CRM', !['redirect_uri', 'token', 'email', 'name', 'organizationId'].some(k => q.has(k)))
  const authCookie = jarStart.find('academy_auth')?.raw ?? ''
  check('cookie do state: HttpOnly, SameSite=Lax, Path=/auth, curta duração', /httponly/i.test(authCookie) && /samesite=lax/i.test(authCookie) && /path=\/auth/i.test(authCookie) && Number(authCookie.match(/max-age=(\d+)/i)?.[1]) <= 600, authCookie)
  const s2 = await start(new Jar())
  check('state e challenge mudam a cada login', s2.url.searchParams.get('state') !== q.get('state') && s2.url.searchParams.get('code_challenge') !== q.get('code_challenge'))
  const evil = await academy(new Jar(), '/auth/start?redirect_uri=https://evil.example&next=https://evil.example')
  check('ignora redirect enviado pelo navegador', !evil.location?.includes('evil.example'))

  section('Callback: casos que devem falhar')
  {
    const jar = new Jar(); const { url } = await start(jar); const a = await authorize(url, 'u1')
    const before = (await crmState()).counters.exchange
    r = await academy(new Jar(), a.path)
    check('callback sem cookie de state → nega', failedToEntrar(r), `${r.status} ${r.location}`)
    check('  …e nem tenta trocar o code', (await crmState()).counters.exchange === before)
  }
  {
    const jar = new Jar(); const { url } = await start(jar); const a = await authorize(url, 'u1')
    const wrong = a.state.slice(0, -1) + (a.state.endsWith('A') ? 'B' : 'A')
    const before = (await crmState()).counters.exchange
    r = await academy(jar, `/auth/callback?code=${encodeURIComponent(a.code)}&state=${encodeURIComponent(wrong)}`)
    check('state divergente → nega', failedToEntrar(r), `${r.status} ${r.location}`)
    check('  …e nem tenta trocar o code', (await crmState()).counters.exchange === before)
    check('  …e o cookie de state é descartado', !jar.find('academy_auth'))
  }
  {
    const jar = new Jar(); const { url } = await start(jar); const a = await authorize(url, 'u1')
    await hook('expire-codes')
    r = await academy(jar, a.path)
    check('code expirado → nega', failedToEntrar(r) && !jar.find('academy_session'), `${r.status} ${r.location}`)
  }
  {
    const first = await login('u1')
    check('primeiro uso do code funciona', first.cb.location?.endsWith('/') && !!first.jar.find('academy_session'), `${first.cb.status} ${first.cb.location}`)
    const jar = new Jar(); const { url } = await start(jar)
    r = await academy(jar, `/auth/callback?code=${encodeURIComponent(first.code)}&state=${encodeURIComponent(url.searchParams.get('state'))}`)
    check('code reutilizado → nega', failedToEntrar(r) && !jar.find('academy_session'), `${r.status} ${r.location}`)
  }
  {
    const jarA = new Jar(); const { url: urlA } = await start(jarA); const a = await authorize(urlA, 'u1')
    const jarB = new Jar(); const { url: urlB } = await start(jarB)
    r = await academy(jarB, `/auth/callback?code=${encodeURIComponent(a.code)}&state=${encodeURIComponent(urlB.searchParams.get('state'))}`)
    check('code_verifier que não corresponde ao challenge → nega', failedToEntrar(r) && !jarB.find('academy_session'), `${r.status} ${r.location}`)
  }
  {
    const jar = new Jar(); const { url } = await start(jar)
    r = await academy(jar, `/auth/callback?error=access_denied&state=${encodeURIComponent(url.searchParams.get('state'))}`)
    check('CRM nega acesso (error=access_denied) → nega', failedToEntrar(r), `${r.status} ${r.location}`)
  }

  section('Login com sucesso e navegação')
  const joao = await login('u1')
  const sessionCookie = joao.jar.find('academy_session')?.raw ?? ''
  check('callback redireciona para URL limpa (/)', joao.cb.status === 303 && new URL(joao.cb.location).pathname === '/' && !new URL(joao.cb.location).search, joao.cb.location)
  check('cookie de sessão: HttpOnly, SameSite=Lax, Path=/', /httponly/i.test(sessionCookie) && /samesite=lax/i.test(sessionCookie) && /path=\//i.test(sessionCookie), sessionCookie.slice(0, 60))
  r = await academy(joao.jar, '/')
  check('Início abre com o nome vindo do CRM', r.status === 200 && r.body.includes('João Silva'), `${r.status}`)
  check('resposta autenticada não é cacheável publicamente', /no-store/.test(r.res.headers.get('cache-control') ?? '') && !/public/.test(r.res.headers.get('cache-control') ?? ''), r.res.headers.get('cache-control'))
  r = await academy(joao.jar, '/treinamentos/formacao-consultores')
  check('página do curso abre', r.status === 200, `${r.status}`)
  r = await academy(joao.jar, '/admin')
  check('consultor em /admin → volta para /', r.status === 307 && new URL(r.location, ACADEMY).pathname === '/', `${r.status} ${r.location}`)
  r = await academy(joao.jar, '/api/progresso', { method: 'POST', body: '{"aulaId":"introducao"}', headers: { 'Content-Type': 'application/json' } })
  check('POST de progresso chega ao CRM (201)', r.status === 201 && (await crmState()).progress.u1?.some(p => p.aulaId === 'introducao'), `${r.status}`)
  const maria = await login('u2')
  r = await academy(maria.jar, '/admin')
  check('admin abre /admin com a lista vinda do CRM', r.status === 200 && r.body.includes('João Silva'), `${r.status}`)

  section('Renovação do access token (somente backend)')
  await fetch(`${CRM}/__test/access-ttl?seconds=30&revoke=1`, { method: 'POST' })
  const renew = await login('u1')
  const before = (await crmState()).counters.refresh
  const oldCookie = renew.jar.find('academy_session')?.value
  r = await academy(renew.jar, '/')
  check('token perto de vencer é renovado no backend', (await crmState()).counters.refresh > before, 'sem refresh')
  check('página usa o token novo na mesma requisição (o antigo foi revogado)', r.status === 200 && r.body.includes('João Silva'), `${r.status} ${r.location}`)
  check('cookie de sessão regravado', renew.jar.find('academy_session')?.value !== oldCookie)
  await fetch(`${CRM}/__test/access-ttl?seconds=900`, { method: 'POST' })

  section('CRM recusa o token (401/403)')
  const pedro = await login('u3')
  await fetch(`${CRM}/__test/active?user=u3&value=0`, { method: 'POST' })
  r = await academy(pedro.jar, '/')
  check('página → /auth/sessao-expirada', [303, 307].includes(r.status) && r.location?.includes('/auth/sessao-expirada'), `${r.status} ${r.location}`)
  r = await academy(pedro.jar, '/auth/sessao-expirada')
  check('sessão local removida e usuário levado a novo login', r.location?.endsWith('/entrar?expirou=1') && !pedro.jar.find('academy_session'), `${r.status} ${r.location}`)
  const pedro2 = await login('u3')
  check('usuário desativado não consegue novo login', failedToEntrar(pedro2.cb), `${pedro2.cb.status} ${pedro2.cb.location}`)
  await fetch(`${CRM}/__test/active?user=u3&value=1`, { method: 'POST' })
  const ana = await login('u3')
  await fetch(`${CRM}/__test/active?user=u3&value=0`, { method: 'POST' })
  r = await academy(ana.jar, '/api/progresso', { method: 'POST', body: '{"aulaId":"introducao"}', headers: { 'Content-Type': 'application/json' } })
  check('API → 401 e cookie de sessão removido', r.status === 401 && !ana.jar.find('academy_session'), `${r.status}`)
  await fetch(`${CRM}/__test/active?user=u3&value=1`, { method: 'POST' })

  section('Sessão adulterada')
  const tampered = await login('u1')
  const c = tampered.jar.find('academy_session')
  c.value = c.value.slice(0, -2) + (c.value.endsWith('AA') ? 'BB' : 'AA')
  r = await academy(tampered.jar, '/')
  check('cookie de sessão alterado → novo login', r.status === 307 && r.location?.endsWith('/auth/start'), `${r.status} ${r.location}`)

  section('Vazamento de credenciais')
  const { issued, codes } = await crmState()
  const secrets = [...issued, ...codes]
  const leaked = responses.filter(x => secrets.some(t => x.text.includes(t)))
  check(`nenhum access/refresh token nem code em ${responses.length} respostas da Academy (URL, HTML, headers, cookies)`, leaked.length === 0, leaked.map(x => x.path).join(', '))
  const logFile = '.next/dev/logs/next-development.log'
  if (existsSync(logFile)) {
    const log = readFileSync(logFile, 'utf8')
    check('nenhum token/code no log do servidor Next', !secrets.some(t => log.includes(t)))
    check('nenhuma URL de callback no log do servidor Next', !log.includes('/auth/callback?'))
  }

  section('Rate limit do callback')
  let limited = false
  for (let i = 0; i < 25 && !limited; i++) limited = failedToEntrar(await academy(new Jar(), '/auth/callback?code=x&state=y'), 'tentativas')
  check('excesso de chamadas ao callback → bloqueado', limited)
} catch (e) {
  if (e.message !== 'stop') { console.error(e); failures++ }
} finally {
  await mock.close()
}

console.log(failures ? `\n${failures} FALHA(S)` : '\nTODOS OS TESTES PASSARAM')
process.exitCode = failures ? 1 : process.exitCode

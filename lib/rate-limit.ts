// Limite simples por chave em memória (janela fixa). Vale por instância do servidor:
// em hospedagem com várias instâncias/serverless, trocar por um store compartilhado (ex.: Redis/Upstash).

const buckets = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  if (buckets.size > 10_000) for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfter: 0 }
  }
  bucket.count++
  return { ok: bucket.count <= limit, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) }
}

export function clientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local'
}

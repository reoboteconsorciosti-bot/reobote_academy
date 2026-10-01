// Criptografia com Web Crypto nativa (funciona no proxy e nas rotas). Nada aqui registra valores em log.

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export function toBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromBase64Url(input: string) {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=')
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0))
}

// Valor aleatório criptograficamente seguro, em base64url.
export function randomToken(bytes = 32) {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)))
}

// PKCE S256: BASE64URL(SHA-256(code_verifier)).
export async function sha256Base64Url(value: string) {
  return toBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))))
}

// Comparação em tempo constante (para o state).
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

let cachedKey: { secret: string; key: Promise<CryptoKey> } | null = null

function sessionKey() {
  const secret = process.env.ACADEMY_SESSION_SECRET ?? ''
  if (secret.length < 32) throw new Error('ACADEMY_SESSION_SECRET ausente ou com menos de 32 caracteres')
  if (cachedKey?.secret !== secret) {
    const key = crypto.subtle.digest('SHA-256', encoder.encode(secret)).then(raw => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']))
    cachedKey = { secret, key }
  }
  return cachedKey.key
}

// Cifra e autentica (AES-256-GCM). `purpose` impede usar o cookie de um tipo no lugar de outro.
export async function seal(data: unknown, purpose: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(purpose) }, await sessionKey(), encoder.encode(JSON.stringify(data)))
  return `${toBase64Url(iv)}.${toBase64Url(new Uint8Array(cipher))}`
}

// Retorna null se o valor faltar, tiver sido alterado ou for de outro `purpose`.
export async function unseal<T>(value: string | null | undefined, purpose: string): Promise<T | null> {
  if (!value) return null
  const [ivPart, cipherPart] = value.split('.')
  if (!ivPart || !cipherPart) return null
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64Url(ivPart), additionalData: encoder.encode(purpose) }, await sessionKey(), fromBase64Url(cipherPart))
    return JSON.parse(decoder.decode(plain)) as T
  } catch {
    return null
  }
}

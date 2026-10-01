import { lessons } from '@/data/platform'
import { registerLessonCompleted } from '@/lib/central'

const noStore = { 'Cache-Control': 'no-store' }

// Recebe o POST do front (tela da aula) e repassa ao CRM pelo backend.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const aulaId = body?.aulaId
  if (typeof aulaId !== 'string' || !lessons.some(l => l.id === aulaId)) {
    return Response.json({ error: 'Aula inválida' }, { status: 400, headers: noStore })
  }

  const result = await registerLessonCompleted(aulaId)
  if (!result.ok) {
    const headers = result.retryAfter ? { ...noStore, 'Retry-After': result.retryAfter } : noStore
    return Response.json({ error: 'Não foi possível registrar o progresso' }, { status: result.status, headers })
  }
  return Response.json({ aulaId }, { status: 201, headers: noStore })
}

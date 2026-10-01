// Tipos e helpers de usuário/progresso. Pode ser importado tanto no servidor quanto no navegador.

export type CentralUser = { id: string; name: string; email: string; role: 'admin' | 'consultor' }

export type Session = { user: CentralUser | null; completedLessonIds: string[] }

// Formato esperado do GET de progresso de todos os consultores (somente admin).
export type ConsultantProgress = { id: string; name: string; email: string; completedLessonIds: string[]; lastActivity: string | null }

export function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export const roleLabel: Record<CentralUser['role'], string> = { admin: 'Administrador', consultor: 'Consultor' }

'use client'

import { createContext, useContext } from 'react'
import type { Session } from '@/lib/user'

const SessionContext = createContext<Session>({ user: null, completedLessonIds: [] })

export function SessionProvider({ session, children }: { session: Session; children: React.ReactNode }) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
}

export const useSession = () => useContext(SessionContext)

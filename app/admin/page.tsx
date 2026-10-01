import { redirect } from 'next/navigation'
import { AdminDashboard } from '@/components/admin-dashboard'
import { getConsultantsProgress, getSession } from '@/lib/central'

// O proxy.ts já barra quem não é admin; esta checagem repete no servidor por segurança. O CRM também responde 403.
export default async function AdminPage() {
  const { user } = await getSession()
  if (user?.role !== 'admin') redirect('/')
  const consultants = await getConsultantsProgress()
  return <AdminDashboard consultants={consultants} />
}

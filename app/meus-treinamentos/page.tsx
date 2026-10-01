import { AcademyShell } from '@/components/academy-shell'
import { CourseCard } from '@/components/course-card'
import { courseProgress } from '@/data/platform'
import { getSession } from '@/lib/central'
export default async function MyCoursesPage(){const {completedLessonIds}=await getSession();return <AcademyShell><div className="flex flex-col gap-8"><div><p className="mb-2 text-sm font-medium text-[#0098d8]">Sua biblioteca</p><h1 className="text-3xl font-semibold tracking-tight">Meus treinamentos</h1><p className="mt-2 text-[#718096]">Tudo que você precisa para continuar sua formação.</p></div><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"><CourseCard percent={courseProgress(completedLessonIds).percent}/></div></div></AcademyShell>}

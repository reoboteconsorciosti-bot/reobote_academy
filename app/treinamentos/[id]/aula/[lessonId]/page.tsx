'use client'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, Check, ChevronLeft, ChevronRight, ListVideo, LockKeyhole, PlayCircle } from 'lucide-react'
import { AcademyShell } from '@/components/academy-shell'
import { useSession } from '@/components/session-provider'
import { course, courseProgress, getYoutubeId, isVideoFile, lessons, lessonStates, sectionOf, sections } from '@/data/platform'

// POST para o servidor da Academy (app/api/progresso), que repassa ao CRM. Retorna null se deu certo, ou a mensagem de erro.
async function registerProgress(aulaId: string) {
  try {
    const res = await fetch('/api/progresso', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aulaId }) })
    if (res.ok) return null
    if (res.status === 401) return 'Sua sessão terminou. Recarregue a página para entrar novamente.'
    if (res.status === 429) return `Muitas tentativas seguidas. Aguarde ${res.headers.get('Retry-After') ?? 'alguns'} segundos e tente de novo.`
  } catch {}
  return 'Não foi possível salvar seu progresso. Tente novamente.'
}

// Área do vídeo: YouTube → <iframe>; arquivo direto (.mp4/.webm/.ogg) → <video>; vazio → "Vídeo em breve".
function VideoPlayer({ src, title }: { src: string; title: string }) {
  const youtubeId = getYoutubeId(src)
  return <div className="relative aspect-video overflow-hidden rounded-2xl bg-[#07101f] shadow-[0_14px_40px_rgba(12,20,40,.15)]">
    {youtubeId
      ? <iframe className="absolute inset-0 size-full" src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1`} title={title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
      : isVideoFile(src)
      ? <video className="absolute inset-0 size-full bg-black" src={src} title={title} controls playsInline preload="metadata" controlsList="nodownload" onContextMenu={e => e.preventDefault()} />
      : <><div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_35%,rgba(29,177,231,.25),transparent_36%)]" /><div className="absolute inset-0 flex flex-col items-center justify-center"><div className="grid size-16 place-items-center rounded-full bg-[#0098d8]/40 text-white shadow-[0_0_0_10px_rgba(0,152,216,.15)]"><PlayCircle className="size-7" /></div><p className="mt-5 text-xs font-medium uppercase tracking-[.18em] text-white/50">Vídeo em breve</p></div></>}
  </div>
}

export default function LessonPage() {
  const { lessonId } = useParams<{ id: string; lessonId: string }>()
  const index = Math.max(0, lessons.findIndex(l => l.id === lessonId))
  const lesson = lessons[index]
  const prev = lessons[index - 1]
  const next = lessons[index + 1]
  const router = useRouter()
  // A sessão é lida sempre ao vivo (atualiza após router.refresh/navegação). O estado guarda só a
  // marcação otimista enquanto o POST não confirma — nunca uma cópia da sessão, que ficaria desatualizada.
  const { completedLessonIds } = useSession()
  const [pendingIds, setPendingIds] = useState<string[]>([])
  const doneIds = [...new Set([...completedLessonIds, ...pendingIds])]
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const states = lessonStates(doneIds)
  const progress = courseProgress(doneIds)
  const done = doneIds.includes(lesson.id)
  const section = sectionOf(lesson.id)
  const indexInSection = section.lessons.findIndex(l => l.id === lesson.id)

  // Marca na tela na hora e envia o POST; se o central recusar, desfaz e avisa.
  const markDone = async () => {
    if (done || saving) return
    setSaving(true)
    setError('')
    setPendingIds(ids => [...ids, lesson.id])
    const failure = await registerProgress(lesson.id)
    if (failure) {
      setPendingIds(ids => ids.filter(i => i !== lesson.id))
      setError(failure)
    } else {
      router.refresh() // traz a sessão atualizada do CRM; a marcação otimista vira dado real
    }
    setSaving(false)
  }
  const lessonHref = (lessonSlug: string) => `/treinamentos/${course.id}/aula/${lessonSlug}`
  const navButton = 'flex h-10 items-center gap-2 rounded-xl border border-[#e1e9f0] px-4 text-sm font-medium text-[#52647a]'

  return <AcademyShell><div className="flex flex-col gap-6">
    <Link href={`/treinamentos/${course.id}`} className="flex w-fit items-center gap-2 text-sm text-[#718096] hover:text-[#0098d8]"><ArrowLeft className="size-4" /> {course.title}</Link>
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div>
        <VideoPlayer key={lesson.id} src={lesson.video} title={lesson.title} />
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#0098d8]">{section.title} · Aula {String(indexInSection + 1).padStart(2, '0')} de {section.lessons.length}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{lesson.title}</h1>
          {lesson.description && <p className="mt-3 max-w-3xl leading-relaxed text-[#718096]">{lesson.description}</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            {prev ? <Link href={lessonHref(prev.id)} className={`${navButton} hover:bg-[#f7fafc]`}><ChevronLeft className="size-4" /> Aula anterior</Link> : <span className={`${navButton} cursor-not-allowed opacity-50`}><ChevronLeft className="size-4" /> Aula anterior</span>}
            <button onClick={markDone} disabled={done || saving} className={`flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold ${done ? 'bg-[#e6f7f1] text-[#16846b]' : 'bg-[#0098d8] text-white hover:bg-[#0087c0]'}`}><Check className="size-4" />{saving ? 'Salvando...' : done ? 'Aula concluída' : 'Marcar como concluída'}</button>
            {next && states[next.id] !== 'locked' ? <Link href={lessonHref(next.id)} className={`${navButton} hover:bg-[#f7fafc]`}>Próxima aula <ChevronRight className="size-4" /></Link> : <span className={`${navButton} cursor-not-allowed opacity-50`}>Próxima aula <ChevronRight className="size-4" /></span>}
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-[#c53030]">{error}</p>}
        </div>
      </div>
      <aside className="h-fit overflow-hidden rounded-2xl border border-[#e4ebf1] bg-white">
        <div className="flex items-center justify-between border-b border-[#e8eef3] p-5"><div><h2 className="font-semibold">{course.title}</h2><p className="mt-1 text-xs text-[#8290a3]">{lessons.length} aulas · {progress.percent}% concluído</p></div><ListVideo className="size-5 text-[#0098d8]" /></div>
        <div className="max-h-[500px] overflow-y-auto p-3">{sections.map(group => {
          const groupDone = group.lessons.filter(l => doneIds.includes(l.id)).length
          return <section key={group.id} aria-label={group.title} className="mb-2 last:mb-0">
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-lg bg-white/95 px-3 py-2 backdrop-blur"><h3 className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#0098d8]">{group.title}</h3><span className="text-[11px] text-[#9aa7b5]">{groupDone}/{group.lessons.length}</span></div>
            {group.lessons.map((item, i) => {
              const active = item.id === lesson.id
              const locked = states[item.id] === 'locked'
              const content = <>
                <div className="grid size-7 shrink-0 place-items-center rounded-full bg-[#f0f3f6] text-[#8290a3]">{doneIds.includes(item.id) ? <Check className="size-3 text-[#16846b]" /> : locked ? <LockKeyhole className="size-3" /> : <span className="text-[10px] font-semibold">{String(i + 1).padStart(2, '0')}</span>}</div>
                <div className="min-w-0 flex-1"><p className={`truncate text-sm ${active ? 'font-semibold text-[#007eae]' : 'text-[#52647a]'}`}>{item.title}</p><p className="mt-1 text-[11px] text-[#9aa7b5]">{item.duration}</p></div>
              </>
              const rowClass = `flex items-center gap-3 rounded-xl p-3 ${active ? 'bg-[#eaf8fb]' : ''}`
              return locked
                ? <div key={item.id} aria-disabled className={`${rowClass} cursor-not-allowed opacity-60`}>{content}</div>
                : <Link key={item.id} href={lessonHref(item.id)} aria-current={active ? 'page' : undefined} className={`${rowClass} ${active ? '' : 'hover:bg-[#f7fafc]'}`}>{content}</Link>
            })}
          </section>
        })}</div>
      </aside>
    </div>
  </div></AcademyShell>
}

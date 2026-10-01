'use client'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Check, ChevronDown, CircleDashed, RefreshCw, Search, TrendingUp, UsersRound, Trophy } from 'lucide-react'
import { AcademyShell, ProgressBar } from '@/components/academy-shell'
import { lessons } from '@/data/platform'
import { initials, type ConsultantProgress } from '@/lib/user'

type Status = 'Concluído' | 'Em andamento' | 'Não iniciado'
const filters: ('Todos' | Status)[] = ['Todos', 'Em andamento', 'Concluído', 'Não iniciado']
const INACTIVE_DAYS = 7

const statusStyle: Record<Status, string> = {
  'Concluído': 'bg-[#e6f7f1] text-[#16846b]',
  'Em andamento': 'bg-[#e8f8fc] text-[#007eae]',
  'Não iniciado': 'bg-[#f0f3f6] text-[#718096]',
}

function daysSince(iso: string) {
  const start = new Date(iso); start.setHours(0, 0, 0, 0)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.round((today.getTime() - start.getTime()) / 86400000)
}

function lastActivityLabel(iso: string | null) {
  if (!iso) return 'Nunca acessou'
  const days = daysSince(iso)
  if (days <= 0) return 'Hoje'
  if (days === 1) return 'Ontem'
  return `Há ${days} dias`
}

function summarize(c: ConsultantProgress) {
  const completed = lessons.filter(l => c.completedLessonIds.includes(l.id)).length
  const percent = Math.round((completed / lessons.length) * 100)
  const status: Status = completed === lessons.length ? 'Concluído' : completed === 0 ? 'Não iniciado' : 'Em andamento'
  const nextLesson = lessons.find(l => !c.completedLessonIds.includes(l.id))
  const inactive = status === 'Em andamento' && !!c.lastActivity && daysSince(c.lastActivity) >= INACTIVE_DAYS
  return { ...c, completed, percent, status, nextLesson, inactive }
}

export function AdminDashboard({ consultants }: { consultants: ConsultantProgress[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof filters)[number]>('Todos')
  const [sort, setSort] = useState('menor')
  const [openId, setOpenId] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  // Recarrega a página no servidor, que busca de novo os dados no sistema central.
  useEffect(() => setUpdatedAt(new Date()), [consultants])
  const refresh = () => router.refresh()

  const rows = useMemo(() => consultants.map(summarize), [consultants])
  const stats = {
    total: rows.length,
    done: rows.filter(r => r.status === 'Concluído').length,
    progress: rows.filter(r => r.status === 'Em andamento').length,
    notStarted: rows.filter(r => r.status === 'Não iniciado').length,
    average: rows.length ? Math.round(rows.reduce((sum, r) => sum + r.percent, 0) / rows.length) : 0,
    inactive: rows.filter(r => r.inactive).length,
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = rows.filter(r => (filter === 'Todos' || r.status === filter) && (r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)))
    const time = (iso: string | null) => (iso ? new Date(iso).getTime() : 0)
    return list.sort((a, b) => sort === 'maior' ? b.percent - a.percent : sort === 'nome' ? a.name.localeCompare(b.name) : sort === 'recente' ? time(b.lastActivity) - time(a.lastActivity) : a.percent - b.percent)
  }, [rows, query, filter, sort])

  const cards = [
    { icon: UsersRound, value: stats.total, label: 'Consultores' },
    { icon: Trophy, value: stats.done, label: 'Concluíram o curso' },
    { icon: TrendingUp, value: stats.progress, label: 'Em andamento' },
    { icon: CircleDashed, value: stats.notStarted, label: 'Não iniciaram' },
  ]

  return <AcademyShell><div className="flex flex-col gap-8">
    <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div><p className="mb-2 text-sm font-medium text-[#0098d8]">Administração</p><h1 className="text-3xl font-semibold tracking-tight">Acompanhamento da formação</h1><p className="mt-2 text-[#718096]">Veja o andamento de cada consultor no curso.</p></div>
      <div className="flex items-center gap-3">{updatedAt && <span className="text-xs text-[#8290a3]">Atualizado às {updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>}<button onClick={refresh} className="flex h-10 items-center gap-2 rounded-xl border border-[#e1e9f0] bg-white px-4 text-sm font-medium text-[#52647a] hover:bg-[#f7fafc]"><RefreshCw className="size-4" /> Atualizar</button></div>
    </section>

    <section className="grid gap-5 xl:grid-cols-[1fr_1.1fr]">
      <div className="relative overflow-hidden rounded-2xl bg-[#0c1428] p-6 text-white md:p-8">
        <div className="absolute right-[-70px] top-[-100px] size-72 rounded-full border-[34px] border-[#0098d8]/20" />
        <div className="relative flex items-center gap-6">
          <div className="relative size-24 shrink-0 rounded-full" style={{ background: `conic-gradient(#1db1e7 ${stats.average * 3.6}deg, rgba(255,255,255,.12) 0deg)` }}><div className="absolute inset-2 grid place-items-center rounded-full bg-[#0c1428] text-xl font-semibold">{stats.average}%</div></div>
          <div><p className="text-xs font-semibold uppercase tracking-[.17em] text-[#80d8f2]">Média da turma</p><h2 className="mt-2 text-xl font-semibold">Conclusão média do curso</h2><p className="mt-1 text-sm text-white/60">{lessons.length} aulas no curso</p></div>
        </div>
        {stats.inactive > 0 && <p className="relative mt-6 flex items-center gap-2 rounded-xl bg-white/5 px-4 py-3 text-sm text-[#ffd48a]"><AlertTriangle className="size-4 shrink-0" />{stats.inactive} {stats.inactive === 1 ? 'consultor está parado' : 'consultores estão parados'} há {INACTIVE_DAYS}+ dias</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">{cards.map(({ icon: Icon, value, label }) => <div key={label} className="rounded-2xl border border-[#e4ebf1] bg-white p-5"><div className="grid size-10 place-items-center rounded-xl bg-[#e8f8fc] text-[#0098d8]"><Icon className="size-5" /></div><p className="mt-4 text-2xl font-semibold">{value}</p><p className="mt-1 text-sm text-[#8290a3]">{label}</p></div>)}</div>
    </section>

    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-[#e4ebf1] bg-white p-4 md:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8290a3]" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar consultor por nome ou e-mail..." className="h-11 w-full rounded-xl border border-[#e4ebf1] bg-[#f8fafc] pl-10 pr-4 text-sm outline-none focus:border-[#0098d8]" /></div>
        <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Ordenar" className="h-11 rounded-xl border border-[#e4ebf1] bg-white px-4 text-sm text-[#52647a] outline-none"><option value="menor">Menor progresso</option><option value="maior">Maior progresso</option><option value="recente">Atividade mais recente</option><option value="nome">Nome (A-Z)</option></select>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">{filters.map(f => { const count = f === 'Todos' ? stats.total : f === 'Concluído' ? stats.done : f === 'Em andamento' ? stats.progress : stats.notStarted; return <button key={f} onClick={() => setFilter(f)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${filter === f ? 'bg-[#0c1428] text-white' : 'border border-[#e4ebf1] bg-white text-[#718096] hover:border-[#a8ddeb]'}`}>{f} <span className={filter === f ? 'text-white/60' : 'text-[#a0adbb]'}>{count}</span></button> })}</div>

      <div className="overflow-hidden rounded-2xl border border-[#e4ebf1] bg-white">
        <div className="hidden grid-cols-[2fr_1.6fr_1.5fr_1fr_130px] gap-4 border-b border-[#e8eef3] px-5 py-3 text-[11px] font-semibold uppercase tracking-[.12em] text-[#8290a3] lg:grid"><span>Consultor</span><span>Progresso</span><span>Aula atual</span><span>Última atividade</span><span>Status</span></div>
        {visible.length ? visible.map(r => { const open = openId === r.id; return <Fragment key={r.id}>
          <button onClick={() => setOpenId(open ? null : r.id)} aria-expanded={open} className={`grid w-full grid-cols-1 gap-3 border-b border-[#eef2f6] px-5 py-4 text-left transition-colors last:border-b-0 lg:grid-cols-[2fr_1.6fr_1.5fr_1fr_130px] lg:items-center lg:gap-4 ${open ? 'bg-[#f7fbfd]' : 'hover:bg-[#f9fbfc]'}`}>
            <div className="flex min-w-0 items-center gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#d5f4fb] text-xs font-bold text-[#0c5c83]">{initials(r.name)}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{r.name}</p><p className="truncate text-xs text-[#8290a3]">{r.email}</p></div><ChevronDown className={`size-4 shrink-0 text-[#a0adbb] transition-transform lg:hidden ${open ? 'rotate-180' : ''}`} /></div>
            <div><div className="mb-1.5 flex justify-between text-xs"><span className="text-[#8290a3]">{r.completed} de {lessons.length} aulas</span><span className="font-semibold text-[#0c5c83]">{r.percent}%</span></div><ProgressBar value={r.percent} /></div>
            <p className="truncate text-sm text-[#52647a]"><span className="text-xs text-[#8290a3] lg:hidden">Aula atual: </span>{r.nextLesson ? r.nextLesson.title : '—'}</p>
            <p className={`flex items-center gap-1.5 text-sm ${r.inactive ? 'font-medium text-[#b7791f]' : 'text-[#52647a]'}`}>{r.inactive && <AlertTriangle className="size-3.5" />}{lastActivityLabel(r.lastActivity)}</p>
            <div className="flex items-center justify-between"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyle[r.status]}`}>{r.status}</span><ChevronDown className={`hidden size-4 text-[#a0adbb] transition-transform lg:block ${open ? 'rotate-180' : ''}`} /></div>
          </button>
          {open && <div className="border-b border-[#eef2f6] bg-[#f7fbfd] px-5 pb-5 last:border-b-0">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[.12em] text-[#8290a3]">Aulas do curso</p>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{lessons.map((l, i) => { const done = r.completedLessonIds.includes(l.id); return <div key={l.id} className="flex items-center gap-3 rounded-xl border border-[#e4ebf1] bg-white p-3"><div className={`grid size-7 shrink-0 place-items-center rounded-full ${done ? 'bg-[#e6f7f1] text-[#16846b]' : 'bg-[#f0f3f6] text-[#8290a3]'}`}>{done ? <Check className="size-3.5" /> : <span className="text-[10px] font-semibold">{String(i + 1).padStart(2, '0')}</span>}</div><div className="min-w-0"><p className={`truncate text-sm ${done ? 'text-[#17243a]' : 'text-[#8290a3]'}`}>{l.title}</p><p className="text-[11px] text-[#9aa7b5]">{done ? 'Concluída' : 'Pendente'} · {l.duration}</p></div></div> })}</div>
          </div>}
        </Fragment> }) : <div className="py-16 text-center">{rows.length ? <><p className="font-semibold">Nenhum consultor encontrado</p><p className="mt-2 text-sm text-[#8290a3]">Tente buscar por outro nome ou filtro.</p></> : <><p className="font-semibold">Nenhum dado de progresso recebido</p><p className="mx-auto mt-2 max-w-sm text-sm text-[#8290a3]">O andamento dos consultores aparece aqui assim que a integração com o sistema central estiver ativa.</p></>}</div>}
      </div>
    </section>
  </div></AcademyShell>
}

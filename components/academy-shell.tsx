'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { BookOpen, ChevronLeft, ChevronRight, GraduationCap, Home, LogOut, Menu, PlayCircle, Settings, ShieldCheck, UserRound, X } from 'lucide-react'
import { useSession } from '@/components/session-provider'
import { initials, roleLabel } from '@/lib/user'

const primary = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/meus-treinamentos', label: 'Meus treinamentos', icon: PlayCircle },
]

export function AcademyShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user } = useSession()
  const avatar = user ? initials(user.name) : <UserRound className="size-4" />
  const name = user?.name ?? 'Não conectado'
  const role = user ? roleLabel[user.role] : 'Aguardando sistema central'
  return <div className="min-h-screen bg-[#f6f8fb] text-[#0c1428]">
    <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-[#0c1428] text-white transition-all duration-300 ${collapsed ? 'w-[76px]' : 'w-[250px]'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
      <div className="flex h-[86px] items-center gap-3 border-b border-white/10 px-5">
        {collapsed
          ? <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#0098d8] shadow-[0_0_0_5px_rgba(0,152,216,.12)]"><GraduationCap className="size-5" /></div>
          : <div className="flex min-w-0 flex-col gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/imagens/logo-reobote/LOGO-BRANCA.png" alt="Reobote" className="h-14 w-auto max-w-[200px] object-contain object-left" />
            <p className="text-[10px] font-medium uppercase tracking-[.22em] text-[#80d8f2]">Academy</p>
          </div>}
        <button onClick={() => setMobileOpen(false)} aria-label="Fechar menu" className="ml-auto rounded-lg p-2 text-white/60 hover:bg-white/10 lg:hidden"><X /></button>
      </div>
      <nav className="flex-1 px-3 py-7">
        <p className={`mb-3 px-3 text-[10px] font-semibold uppercase tracking-[.16em] text-white/35 ${collapsed ? 'sr-only' : ''}`}>Navegação</p>
        <div className="flex flex-col gap-1">{primary.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors ${pathname === href || (href !== '/' && pathname.startsWith(href)) ? 'bg-[#0098d8] font-medium text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}><Icon className="size-[18px] shrink-0" />{!collapsed && <span>{label}</span>}</Link>)}</div>
        {user?.role === 'admin' && <><div className="my-7 border-t border-white/10" />
          <p className={`mb-3 px-3 text-[10px] font-semibold uppercase tracking-[.16em] text-white/35 ${collapsed ? 'sr-only' : ''}`}>Administração</p>
          <Link href="/admin" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors ${pathname.startsWith('/admin') ? 'bg-[#0098d8] font-medium text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}><ShieldCheck className="size-[18px] shrink-0" />{!collapsed && <span>Acompanhamento</span>}</Link></>}
        <div className="my-7 border-t border-white/10" />
        <p className={`mb-3 px-3 text-[10px] font-semibold uppercase tracking-[.16em] text-white/35 ${collapsed ? 'sr-only' : ''}`}>Minha conta</p>
        <div className="flex flex-col gap-1"><Link href="/perfil" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white"><UserRound className="size-[18px]" />{!collapsed && 'Perfil'}</Link><Link href="/configuracoes" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white"><Settings className="size-[18px]" />{!collapsed && 'Configurações'}</Link></div>
      </nav>
      <div className="border-t border-white/10 p-3"><div className={`flex items-center gap-3 rounded-xl bg-white/5 p-2 ${collapsed ? 'justify-center' : ''}`}><div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#d5f4fb] text-xs font-bold text-[#0c5c83]">{avatar}</div>{!collapsed && <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{name}</p><p className="truncate text-[11px] text-white/45">{role}</p></div>} {!collapsed && user && <form action="/auth/logout" method="post"><button type="submit" aria-label="Sair" title="Sair" className="grid rounded-lg p-1.5 text-white/35 transition-colors hover:bg-white/10 hover:text-white"><LogOut className="size-4" /></button></form>}</div></div>
      <button onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'} className="absolute -right-3 top-20 hidden size-7 place-items-center rounded-full border border-[#dce4ec] bg-white text-[#607086] shadow-sm lg:grid">{collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}</button>
    </aside>
    {mobileOpen && <button className="fixed inset-0 z-30 bg-[#0c1428]/40 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Fechar menu" />}
    {/* Seta da Reobote ao fundo, ocupando toda a área de conteúdo (atrás do header e das páginas). */}
    <div aria-hidden className={`pointer-events-none fixed inset-0 top-[86px] bg-contain bg-center bg-no-repeat opacity-[.18] transition-all duration-300 ${collapsed ? 'lg:left-[76px]' : 'lg:left-[250px]'}`} style={{ backgroundImage: "url('/imagens/seta/seta%20reobote.svg')" }} />
    <div className={`relative transition-all duration-300 ${collapsed ? 'lg:pl-[76px]' : 'lg:pl-[250px]'}`}>
      <header className="sticky top-0 z-20 flex h-[86px] items-center justify-between border-b border-[#e5ebf1] bg-white/95 px-5 backdrop-blur md:px-9"><div className="flex items-center gap-3"><button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-[#52647a] hover:bg-[#f0f4f8] lg:hidden" aria-label="Abrir menu"><Menu /></button><div className="hidden items-center gap-2 text-sm text-[#8290a3] md:flex"><BookOpen className="size-4" /> Academia interna</div></div><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-semibold">{name}</p><p className="text-xs text-[#8290a3]">{role}</p></div><div className="grid size-10 place-items-center rounded-full border-4 border-[#e8f8fc] bg-[#d5f4fb] text-xs font-bold text-[#0c5c83]">{avatar}</div></div></header>
      <main className="mx-auto max-w-[1440px] px-5 py-8 md:px-9 md:py-10">{children}</main>
    </div>
  </div>
}

export function ProgressBar({ value, className = '' }: { value: number; className?: string }) { return <div className={`h-2 overflow-hidden rounded-full bg-[#e7edf3] ${className}`}><div className="h-full rounded-full bg-[#0098d8] transition-all duration-500" style={{ width: `${value}%` }} /></div> }

// Capa: foto opcional (caminho a partir de /public, ex.: "/imagens/capa-curso.jpg"). Sem foto, ou se o arquivo
// não existir, mostra o gradiente com os círculos decorativos.
export function CourseArtwork({ tone, accent, title, image, imageAlt = '', compact = false, className = '' }: { tone: string; accent: string; title: string; image?: string; imageAlt?: string; compact?: boolean; className?: string }) {
  const [failedImage, setFailedImage] = useState<string | null>(null)
  const showImage = !!image && failedImage !== image
  return <div className={`relative overflow-hidden bg-gradient-to-br ${tone} ${compact ? 'h-28' : 'h-44'} ${className}`}>
    {showImage
      ? <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={imageAlt} loading="lazy" decoding="async" onError={() => setFailedImage(image)} className="absolute inset-0 size-full object-cover" />
        {title && <div className="absolute inset-0 bg-gradient-to-t from-[#0c1428]/80 via-[#0c1428]/20 to-transparent" />}
      </>
      : <><div className="absolute -right-8 -top-10 size-40 rounded-full border-[18px] border-white/10" /><div className="absolute -bottom-12 -left-6 size-40 rounded-full border-[24px] border-white/10" /></>}
    <div className="absolute inset-0 flex items-end p-5"><div className="max-w-[80%] text-white"><div className="mb-2 h-1 w-8 rounded-full" style={{ background: accent }} /><p className="text-sm font-medium leading-snug">{title}</p></div></div></div>
}

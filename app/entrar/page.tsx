import { ArrowUpRight, GraduationCap, LogIn } from 'lucide-react'

const errorMessages: Record<string, string> = {
  acesso: 'Não foi possível confirmar seu acesso. Tente entrar novamente.',
  tentativas: 'Muitas tentativas em pouco tempo. Aguarde um minuto e tente de novo.',
  indisponivel: 'O login está temporariamente indisponível. Tente novamente mais tarde.',
}

// Tela para quem chega sem sessão, cuja sessão terminou ou em que o login falhou (sem detalhes internos).
export default async function EnterPage({ searchParams }: { searchParams: Promise<{ erro?: string; saiu?: string; expirou?: string }> }) {
  const { erro, saiu, expirou } = await searchParams
  const crmUrl = process.env.CRM_URL
  const error = erro ? errorMessages[erro] ?? errorMessages.acesso : null
  const message = error ?? (expirou ? 'Sua sessão terminou. Entre novamente para continuar.' : saiu ? 'Você saiu da Reobote Academy.' : 'Para assistir às aulas, entre com a sua conta do CRM da Reobote.')

  return <main className="grid min-h-screen place-items-center bg-[#f6f8fb] px-5">
    <div className="w-full max-w-md rounded-2xl border border-[#e4ebf1] bg-white p-8 text-center shadow-[0_14px_35px_rgba(12,20,40,.06)]">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#0c1428] text-white"><GraduationCap className="size-7" /></div>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[.22em] text-[#0098d8]">Reobote Academy</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#0c1428]">Acesso pelo CRM</h1>
      <p role={error ? 'alert' : undefined} className={`mt-3 text-sm leading-relaxed ${error ? 'text-[#c53030]' : 'text-[#718096]'}`}>{message}</p>
      <div className="mt-7 flex flex-col items-center gap-3">
        <a href="/auth/start" className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#0098d8] px-5 text-sm font-semibold text-white hover:bg-[#0087c0]"><LogIn className="size-4" /> Entrar com o CRM</a>
        {crmUrl && <a href={crmUrl} className="inline-flex items-center gap-1 text-sm font-medium text-[#52647a] hover:text-[#0098d8]">Ir para o CRM <ArrowUpRight className="size-4" /></a>}
      </div>
    </div>
  </main>
}

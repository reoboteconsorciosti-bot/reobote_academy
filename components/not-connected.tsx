import { PlugZap } from 'lucide-react'

export function NotConnected({ title = 'Nenhum usuário conectado', text = 'Os dados do usuário são carregados pelo sistema central após o login.' }: { title?: string; text?: string }) { return <div className="rounded-2xl border border-dashed border-[#ccd8e2] bg-white py-16 text-center"><div className="mx-auto grid size-14 place-items-center rounded-full bg-[#e8f8fc] text-[#0098d8]"><PlugZap className="size-6" /></div><h2 className="mt-5 font-semibold">{title}</h2><p className="mx-auto mt-2 max-w-sm text-sm text-[#8290a3]">{text}</p></div> }

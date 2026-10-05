// Conteúdo do curso (não são dados de usuário). Dados de pessoas e progresso vêm do sistema central: ver lib/central.ts.

// video: link do YouTube (watch, youtu.be, shorts, embed ou só o ID) ou arquivo direto (.mp4, .webm, .ogg). Vazio = "vídeo em breve".
// image (opcional): foto da aula, caminho a partir de /public (ex.: '/imagens/aulas/boas-vindas.jpg'). Sem ela, usa a do curso.
export type Lesson = { id: string; title: string; duration: string; video: string; description?: string; image?: string }
export type LessonState = 'done' | 'current' | 'locked'

export const course = {
  id: 'formacao-consultores',
  title: 'Formação de Consultores Reobote',
  description: 'Os fundamentos para iniciar sua jornada como consultor Reobote.',
  // Foto da capa: coloque o arquivo em public/imagens/ e ajuste o nome aqui. Se o arquivo não existir, aparece o gradiente.
  image: '/imagens/logo-reobote/curso-reobote.png',
  tone: 'from-[#0c1428] to-[#153f65]',
  accent: '#1db1e7',
}

// id: só letras minúsculas, números e hífen (ex.: 'pos-lance-2'). É o que o CRM grava no progresso: não renomear depois de no ar.
// O id precisa ser único entre TODAS as seções.

// Seção 1 — Formação
export const formacaoLessons: Lesson[] = [
  { id: 'introducao', title: 'Boas Vindas', duration: '00:55', video: 'https://www.youtube.com/watch?v=cp-ctvzP1iE&list=PLjDhcajmMQKTUKmcOby--fKzTKoab8l7R&index=1' },
  { id: 'como-funciona', title: 'Oque é Consórcio e suas taxas', duration: '03:51', video: 'https://www.youtube.com/watch?v=R4r5fBgds-k&list=PLjDhcajmMQKTUKmcOby--fKzTKoab8l7R&index=2' },
  { id: 'legislacao', title: 'Legislação e regras', duration: '04:16', video: 'https://www.youtube.com/watch?v=DnCHlttweXM&list=PLjDhcajmMQKTUKmcOby--fKzTKoab8l7R&index=3', description: 'Neste módulo, você vai entender as principais formas de contemplação e como explicar esse processo de forma simples e segura para o seu cliente.' },
  { id: 'parcelas', title: 'Calculo de Parcelas', duration: '02:59', video: 'https://www.youtube.com/watch?v=mz9ks4V7sCM&list=PLjDhcajmMQKTUKmcOby--fKzTKoab8l7R&index=4' },
  { id: 'seguro', title: 'Como é cobrado o seguro', duration: '03:49', video: 'https://www.youtube.com/watch?v=b-IKO4U5CqQ&list=PLjDhcajmMQKTUKmcOby--fKzTKoab8l7R&index=5' },
  { id: 'lance', title: 'Calculo de Lance', duration: '02:31', video: 'https://www.youtube.com/watch?v=w_5C7QQLJhc&list=PLjDhcajmMQKTUKmcOby--fKzTKoab8l7R&index=6' },
  { id: 'embutido', title: 'Calculo de Lance com embutido', duration: '03:15', video: 'https://www.youtube.com/watch?v=25F36hgINak&list=PLjDhcajmMQKTUKmcOby--fKzTKoab8l7R&index=7' },
  { id: 'embutido-2', title: 'Calculo de Lance com embutido II', duration: '01:39', video: 'https://www.youtube.com/watch?v=uZHtPWtqFSw&list=PLjDhcajmMQKTUKmcOby--fKzTKoab8l7R&index=8' },
  { id: 'pos-lance', title: 'Calculo de lance e parcela pós Lance', duration: '04:39', video: 'https://www.youtube.com/watch?v=nx_6OFeFex8&list=PLjDhcajmMQKTUKmcOby--fKzTKoab8l7R&index=9' },
  { id: 'pos-lance-2', title: 'Calculo de lance e parcela pós Lance II', duration: '02:39', video: 'https://www.youtube.com/watch?v=jnSBriOdQY4&list=PLjDhcajmMQKTUKmcOby--fKzTKoab8l7R&index=10' },
  { id: 'pos-lance-3', title: 'Calculo de lance e parcela pós Lance III', duration: '00:00', video: 'https://www.youtube.com/watch?v=bUoI5CJqIAQ&list=PLjDhcajmMQKTUKmcOby--fKzTKoab8l7R&index=11' },
  { id: 'servopa', title: 'Servopa- regras, formas de contemplação', duration: '04:46', video: 'https://www.youtube.com/watch?v=1hhJXGHEmoU&list=PLjDhcajmMQKTUKmcOby--fKzTKoab8l7R&index=12' },
  { id: 'servopa-calculo', title: 'Servopa- calculo de lance', duration: '03:59', video: 'https://www.youtube.com/watch?v=eoQMxszDLUU&list=PLjDhcajmMQKTUKmcOby--fKzTKoab8l7R&index=13' },
  { id: 'rodobens', title: 'Rodobens- como é o pontual', duration: '04:28', video: 'https://www.youtube.com/watch?v=TX1vtL44Zkc&list=PLjDhcajmMQKTUKmcOby--fKzTKoab8l7R&index=14' },
  { id: 'rodobens-regras', title: 'Rodobens- regras pontual', duration: '01:06', video: 'https://www.youtube.com/watch?v=KloQHOqRu3U&list=PLjDhcajmMQKTUKmcOby--fKzTKoab8l7R&index=15' },
  { id: 'rodobens-calculo', title: 'Rodobens- Calculo de parcela', duration: '02:58', video: 'https://www.youtube.com/watch?v=6F9bBUBkOFQ&list=PLjDhcajmMQKTUKmcOby--fKzTKoab8l7R&index=16' },
  { id: 'yamaha', title: 'Yamaha- regras e formas de contemplação', duration: '03:04', video: 'https://www.youtube.com/watch?v=i8VaqY_asXE&list=PLjDhcajmMQKTUKmcOby--fKzTKoab8l7R&index=17' },
  { id: 'yamaha-calculo', title: 'Yamaha- calculo de parcelas', duration: '03:53', video: 'https://www.youtube.com/watch?v=l7rO6UW-kKI&list=PLjDhcajmMQKTUKmcOby--fKzTKoab8l7R&index=18' },
  { id: 'meia-parcela', title: 'Meia parcela', duration: '04:38', video: 'https://www.youtube.com/watch?v=VEowLKDikAg&list=PLjDhcajmMQKTUKmcOby--fKzTKoab8l7R&index=19' },
  { id: 'substituicao-de-garantia', title: 'Substituição de garantia', duration: '02:42', video: 'https://www.youtube.com/watch?v=fVGUjZ-_c2s&list=PLjDhcajmMQKTUKmcOby--fKzTKoab8l7R&index=20' },
  { id: 'porque-varias-administradoras', title: 'Porque temos varias administradoras', duration: '03:12', video: 'https://www.youtube.com/watch?v=hI46AVEMySA&list=PLjDhcajmMQKTUKmcOby--fKzTKoab8l7R&index=21' },
  { id: 'correcao', title: 'Correções e reajustes', duration: '03:54', video: 'https://www.youtube.com/watch?v=7mB2z-_4gHs&list=PLjDhcajmMQKTUKmcOby--fKzTKoab8l7R&index=22' },
  { id: 'lance-fipe', title: 'Lance e Fipe', duration: '05:57', video: 'https://www.youtube.com/watch?v=ciuzeTL6fTI&list=PLjDhcajmMQKTUKmcOby--fKzTKoab8l7R&index=23' },
  { id: 'loteria-federal', title: 'Loteria Federal', duration: '05:01', video: 'https://www.youtube.com/watch?v=JAZ2HAUy_0g&list=PLjDhcajmMQKTUKmcOby--fKzTKoab8l7R&index=24' },
  { id: 'faturamento', title: 'Faturamente do bem', duration: '06:44', video: 'https://www.youtube.com/watch?v=p6WdZ89rq_8&list=PLjDhcajmMQKTUKmcOby--fKzTKoab8l7R&index=25' },
  { id: 'imovel-planta', title: 'Imóvel na planta', duration: '01:40', video: 'https://www.youtube.com/watch?v=oMEG0V7HC74&list=PLjDhcajmMQKTUKmcOby--fKzTKoab8l7R&index=27' },
  { id: 'incc-pratica', title: 'INCC na prática', duration: '03:49', video: 'https://www.youtube.com/watch?v=gCOWzghk-nI&list=PLjDhcajmMQKTUKmcOby--fKzTKoab8l7R&index=28' },
  { id: 'taxa', title: 'Taxa de transferência', duration: '02:41', video: 'https://www.youtube.com/watch?v=gCOWzghk-nI&list=PLjDhcajmMQKTUKmcOby--fKzTKoab8l7R&index=28' },
  { id: 'consorcio-investimento', title: 'Consorcio como investimento', duration: '04:07', video: 'https://www.youtube.com/watch?v=ckT6lce-Hqg&list=PLjDhcajmMQKTUKmcOby--fKzTKoab8l7R&index=29' },
  { id: 'consorcio-investimento-2', title: 'Consórcio como investimento', duration: '06:08', video: 'https://www.youtube.com/watch?v=bBMfwtbxp-M&list=PLjDhcajmMQKTUKmcOby--fKzTKoab8l7R&index=30' },
]

// Seção 2 — EDRAS. Mesmo formato das aulas acima; use ids com o prefixo "edras-" para não repetir ids da Formação.
export const edrasLessons: Lesson[] = [
  { id: 'edras-aula-1', title: 'INTRODUÇÃO', duration: '00:43', video: 'https://www.youtube.com/watch?v=ieZox_5fCis&list=PLjDhcajmMQKRupdkbrYt1_dVUmN-bdBJY&index=1' },
  { id: 'edras-aula-2', title: 'INTRODUÇÃO AO EDRAS', duration: '04:47', video: 'https://www.youtube.com/watch?v=d_ikju4UAko&list=PLjDhcajmMQKRupdkbrYt1_dVUmN-bdBJY&index=2' },
  { id: 'edras-aula-3', title: 'ENGAJAR', duration: '11:45', video: 'https://www.youtube.com/watch?v=u5Xw8vWnLTA&list=PLjDhcajmMQKRupdkbrYt1_dVUmN-bdBJY&index=3' },
  { id: 'edras-aula-4', title: 'COMO ENGAJAMOS - REOBOTE', duration: '03:32', video: 'https://www.youtube.com/watch?v=4UV3C_Pw25U&list=PLjDhcajmMQKRupdkbrYt1_dVUmN-bdBJY&index=4' },
  { id: 'edras-aula-5', title: 'COMO ENGAJAMOS - AUTOBOTE', duration: '03:23', video: 'https://www.youtube.com/watch?v=mSEYgPdjlNY&list=PLjDhcajmMQKRupdkbrYt1_dVUmN-bdBJY&index=5' },
  { id: 'edras-aula-6', title: 'SCRIPT DE LIGAÇÃO', duration: '01:58', video: 'https://www.youtube.com/watch?v=xUJyK2zn7VU&list=PLjDhcajmMQKRupdkbrYt1_dVUmN-bdBJY&index=6' },
  { id: 'edras-aula-7', title: 'PORTA EM PORTA', duration: '01:57', video: 'https://www.youtube.com/watch?v=zCOgWNMg64A&list=PLjDhcajmMQKRupdkbrYt1_dVUmN-bdBJY&index=7' },
  { id: 'edras-aula-8', title: 'DESCOBRIR', duration: '05:35', video: 'https://www.youtube.com/watch?v=X1whsgtP72M&list=PLjDhcajmMQKRupdkbrYt1_dVUmN-bdBJY&index=8' },
  { id: 'edras-aula-9', title: 'RECOMENDAR', duration: '17:15', video: 'https://www.youtube.com/watch?v=MMIrX7e_hpI&list=PLjDhcajmMQKRupdkbrYt1_dVUmN-bdBJY&index=9' },
  { id: 'edras-aula-10', title: 'ATUAR', duration: '07:09', video: 'https://www.youtube.com/watch?v=Q8C4uqdgpLA&list=PLjDhcajmMQKRupdkbrYt1_dVUmN-bdBJY&index=10' },
  { id: 'edras-aula-11', title: 'CRM', duration: '12:00', video: 'https://www.youtube.com/watch?v=YXpYcC5zCrQ&list=PLjDhcajmMQKRupdkbrYt1_dVUmN-bdBJY&index=11' },
]

export type LessonSection = { id: string; title: string; lessons: Lesson[] }

// Ordem das seções no curso. Para criar outra seção: exporte um array de aulas e adicione aqui.
export const sections: LessonSection[] = [
  { id: 'formacao', title: 'Formação', lessons: formacaoLessons },
  { id: 'edras', title: 'EDRAS', lessons: edrasLessons },
]

// Todas as aulas, na ordem do curso (Formação → EDRAS). Usado no progresso, no bloqueio sequencial e na validação.
export const lessons: Lesson[] = sections.flatMap(s => s.lessons)

export function sectionOf(lessonId: string) {
  return sections.find(s => s.lessons.some(l => l.id === lessonId)) ?? sections[0]
}

export function getYoutubeId(value: string) {
  if (!value) return null
  if (/^[\w-]{11}$/.test(value)) return value
  const match = value.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/)
  return match ? match[1] : null
}

export function isVideoFile(value: string) {
  return /^https?:\/\/.+\.(mp4|webm|ogg)(\?.*)?$/i.test(value)
}

export function totalDuration() {
  const minutes = Math.round(lessons.reduce((sum, l) => { const [m, s] = l.duration.split(':').map(Number); return sum + m + s / 60 }, 0))
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}min` : `${minutes}min`
}

// Aulas concluídas = done; a primeira pendente = current; as seguintes ficam bloqueadas.
export function lessonStates(completedIds: string[]): Record<string, LessonState> {
  let foundCurrent = false
  return Object.fromEntries(lessons.map(l => {
    if (completedIds.includes(l.id)) return [l.id, 'done']
    if (!foundCurrent) { foundCurrent = true; return [l.id, 'current'] }
    return [l.id, 'locked']
  }))
}

export function courseProgress(completedIds: string[]) {
  const completed = lessons.filter(l => completedIds.includes(l.id)).length
  return { completed, remaining: lessons.length - completed, total: lessons.length, percent: Math.round((completed / lessons.length) * 100), next: lessons.find(l => !completedIds.includes(l.id)) }
}

# Reobote Academy — Frontend

Plataforma interna com **um único curso de formação** em vídeo para os consultores da Reobote Consórcios. O consultor assiste às aulas (YouTube) e acompanha o próprio progresso; o admin acompanha o andamento de todos os consultores.

> **Estado atual:** o frontend não tem dados fictícios de usuários. Usuários, perfis de acesso e progresso vêm do **sistema central** (que gera o token de acesso). A integração ainda não foi implementada: por enquanto as telas aparecem no estado "não conectado" / "sem dados".

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + TypeScript 5.7 |
| Estilo | Tailwind CSS 4 (via `@tailwindcss/postcss`) + `tw-animate-css` |
| Componentes base | shadcn (estilo `base-nova`) sobre `@base-ui/react` |
| Ícones | `lucide-react` |
| Utilitários | `clsx` + `tailwind-merge` (função `cn`), `class-variance-authority` |
| Métricas | `@vercel/analytics` (só em produção) |

## Como rodar

```bash
pnpm install          # o projeto declara pnpm como gerenciador
pnpm dev              # http://localhost:3001 (a 3000 é do CRM em dev)
pnpm build            # build de produção
pnpm start            # servir o build
pnpm crm:mock         # CRM simulado (porta 3005) para testar o login sem o CRM real
pnpm test:sso         # testes de ponta a ponta do SSO (precisa da Academy apontando para o CRM simulado)
```

Antes de rodar, copie `.env.example` para `.env.local` e preencha `CRM_URL`, `ACADEMY_CLIENT_ID`, `ACADEMY_CLIENT_SECRET` e `ACADEMY_SESSION_SECRET`. Sem sessão, as páginas levam ao login no CRM (`/auth/start`).

Para testar sem o CRM real: no `.env.local`, use `CRM_URL=http://localhost:3005`; rode `pnpm crm:mock` e `pnpm dev`; abra `http://localhost:3005` e clique em "Ver treinamento" (o CRM simulado deixa escolher o usuário).

### Deploy com Docker

O [Dockerfile](Dockerfile) gera uma imagem de produção com o modo `standalone` do Next (`output: 'standalone'` em `next.config.mjs`), Node 24 Alpine, usuário sem privilégios e healthcheck em `/entrar`.

```bash
docker build -t reobote-academy .
docker run -p 3000:3000 \
  -e CRM_URL=https://crm.reoboteconsorcios.com.br \
  -e ACADEMY_CLIENT_ID=reobote-academy \
  -e ACADEMY_CLIENT_SECRET=... \
  -e ACADEMY_SESSION_SECRET=... \
  reobote-academy
```

- As variáveis são lidas **na execução**, não no build: nenhum segredo entra na imagem (o [.dockerignore](.dockerignore) exclui `.env*`).
- Produção precisa de **HTTPS** na frente do container: o cookie de sessão usa `Secure`.
- O rate limit é em memória: rode **uma instância** ou troque por um store compartilhado.

> Existem `pnpm-lock.yaml` **e** `package-lock.json` no repositório. Escolha um gerenciador e remova o outro lockfile para evitar versões divergentes.

## Estrutura de pastas

```
app/
├── layout.tsx                 # Layout raiz: busca a sessão (getSession) e envolve tudo no SessionProvider
├── globals.css                # Tailwind, tokens de cor (CSS vars) e estilos base
├── page.tsx                   # Início: progresso no curso e próxima aula
├── meus-treinamentos/         # Card do curso
├── treinamentos/
│   └── [id]/                  # Detalhe do curso + lista de aulas
│       └── aula/[lessonId]/   # Tela da aula (player YouTube + playlist lateral)
├── perfil/                    # Dados do usuário e resumo da jornada
├── configuracoes/             # Configurações da conta
├── admin/                     # Acompanhamento de todos os consultores (admin)
├── entrar/                    # Tela de login / sessão encerrada / erro de acesso
├── auth/start/                # Início do SSO: gera state + PKCE e redireciona ao CRM
├── auth/callback/             # Valida state, troca o code no backend e cria a sessão
├── auth/sessao-expirada/      # CRM recusou o token: apaga a sessão e leva ao login
├── auth/logout/               # Apaga a sessão (POST)
└── api/progresso/             # POST de aula concluída → repassa ao CRM
proxy.ts                       # Protege páginas e /api, renova o access token e restringe /admin
scripts/crm-mock.mjs           # CRM simulado que segue o contrato (pnpm crm:mock)
scripts/test-sso.mjs           # Testes de ponta a ponta do SSO (pnpm test:sso)
docs/CONTRATO-SSO-CRM.md       # Contrato HTTP que o CRM implementa
components/
├── academy-shell.tsx          # Shell da aplicação + ProgressBar + CourseArtwork
├── session-provider.tsx       # Contexto com a sessão (usuário + aulas concluídas) para componentes client
├── course-card.tsx            # Card do curso
├── admin-dashboard.tsx        # Parte interativa da tela de admin
├── not-connected.tsx          # Estado vazio "nenhum usuário conectado"
└── ui/button.tsx              # Button do shadcn (ainda não utilizado nas telas)
data/
└── platform.ts                # Conteúdo do curso: dados do curso, aulas e helpers de progresso
lib/
├── auth.ts                    # SSO: PKCE, troca/renovação de tokens, sessão cifrada
├── crypto.ts                  # AES-256-GCM, SHA-256, aleatórios (Web Crypto)
├── rate-limit.ts              # Limite de requisições em memória
├── central.ts                 # Chamadas à API do CRM (somente servidor)
├── user.ts                    # Tipos e helpers de usuário (servidor e navegador)
└── utils.ts                   # cn() — merge de classes Tailwind
public/                        # Ícones e placeholders
```

Alias de import: `@/` aponta para a raiz do projeto (ex.: `@/components/academy-shell`).

## Rotas

| Rota | Arquivo | Tipo | O que mostra |
|---|---|---|---|
| `/` | [app/page.tsx](app/page.tsx) | Server | Saudação, progresso no curso (gráfico circular), contadores de aulas, próxima aula e card do curso |
| `/meus-treinamentos` | [app/meus-treinamentos/page.tsx](app/meus-treinamentos/page.tsx) | Server | Card do curso com o progresso |
| `/treinamentos/[id]` | [app/treinamentos/[id]/page.tsx](app/treinamentos/[id]/page.tsx) | Server | Hero do curso, progresso e lista de aulas (concluída / atual / bloqueada). `id` diferente de `course.id` → 404 |
| `/treinamentos/[id]/aula/[lessonId]` | [app/treinamentos/[id]/aula/[lessonId]/page.tsx](app/treinamentos/[id]/aula/[lessonId]/page.tsx) | Client | Vídeo do YouTube, descrição, anterior/próxima, "Marcar como concluída" e playlist |
| `/perfil` | [app/perfil/page.tsx](app/perfil/page.tsx) | Server | Nome, e-mail, perfil de acesso e progresso. Sem usuário → estado "não conectado" |
| `/configuracoes` | [app/configuracoes/page.tsx](app/configuracoes/page.tsx) | Server | Dados pessoais (do sistema central), notificações e segurança |
| `/admin` | [app/admin/page.tsx](app/admin/page.tsx) | Server + Client | Média da turma, contadores, alerta de consultores parados, busca, filtro por status, ordenação e tabela expansível com as aulas de cada consultor |

Todas as páginas envolvem o conteúdo em `<AcademyShell>`.

## Integração com o sistema central — [lib/central.ts](lib/central.ts)

Todo dado de pessoa passa por este arquivo, que roda **só no servidor**: lê o access token de dentro da sessão cifrada (cookie `academy_session`) e o envia como `Authorization: Bearer`. Tipos e helpers usados no navegador ficam em [lib/user.ts](lib/user.ts).

| Função | Método | Endpoint no CRM | Retorno |
|---|---|---|---|
| `getSession()` | GET | `/api/academy/me` + `/api/academy/progresso/me` | `{ id, name, email, role }` e `{ completedLessonIds }` |
| `registerLessonCompleted(aulaId)` | POST `{ aulaId }` | `/api/academy/progresso` | `201` (nova) ou `200` (já existia) |
| `getConsultantsProgress()` | GET | `/api/academy/progresso` | `ConsultantProgress[]` (só admin; senão `403`) |

`getSession()` usa `cache()` do React: layout e página compartilham as mesmas chamadas na requisição, o que poupa o rate limit do CRM. Se o CRM responder `401`/`403`, a sessão local é apagada e o usuário vai para novo login (`/auth/sessao-expirada` → `/entrar`); se o CRM estiver fora do ar ou devolver `429`, a tela segue com o mínimo que a sessão sabe.

### Login (SSO) — Authorization Code + PKCE

Contrato completo com o CRM: [docs/CONTRATO-SSO-CRM.md](docs/CONTRATO-SSO-CRM.md). Nenhum token, e-mail ou nome passa pela URL, e o navegador nunca recebe o access token.

1. **`/auth/start`** ([route.ts](app/auth/start/route.ts)): gera `state` e `code_verifier` aleatórios, calcula o `code_challenge` (S256), guarda `state` + `verifier` num cookie **cifrado** `academy_auth` (HttpOnly, `Path=/auth`, 10 min) e redireciona para `${CRM_URL}/api/academy/authorize`.
2. O CRM exige sessão e devolve para `/auth/callback?code=…&state=…` (`code` de uso único, 60 s).
3. **`/auth/callback`** ([route.ts](app/auth/callback/route.ts)): confere o `state` com o cookie (tempo constante), descarta o cookie, troca `code` + `code_verifier` no **backend** (`POST /api/academy/token`, autenticado com `ACADEMY_CLIENT_ID`/`ACADEMY_CLIENT_SECRET` via Basic), grava a sessão e redireciona para `/`. Qualquer falha → `/entrar?erro=acesso` (sem detalhes). Rate limit: 20/min por IP (`/auth/start`: 30/min).
4. **Sessão:** cookie `academy_session` com o conteúdo **cifrado em AES-256-GCM** (`ACADEMY_SESSION_SECRET`): id, papel, access token, refresh token e validade. HttpOnly, `SameSite=Lax`, `Secure` em produção, teto de 8 h.
5. **Proteção e renovação** ([proxy.ts](proxy.ts)): toda página e rota `/api` passa pelo proxy. Sem sessão: página → `/auth/start`, API → `401`. Access token a menos de 60 s de vencer → renovado no backend (`grant_type=refresh_token`), e a própria requisição já segue com o cookie novo. `/admin` só para `role === 'admin'` (checado também na página e pelo `403` do CRM).

Papéis no CRM: Dono e Gerente → `admin`; Supervisor e Membro → `consultor`.

### Demais fluxos

1. **Aula concluída:** o botão "Marcar como concluída" faz `POST /api/progresso { aulaId }` ([route.ts](app/api/progresso/route.ts)) → a rota valida a aula e chama `registerLessonCompleted` → POST no CRM com `Authorization: Bearer`. A tela marca na hora e desfaz com mensagem se falhar. Respostas: `201` ok, `400` aula inválida, `401` sessão expirada, `429` limite do CRM (repassa `Retry-After`), `502` CRM indisponível.
2. **Admin:** `/admin` chama `getConsultantsProgress()` no servidor ao abrir; o botão "Atualizar" faz `router.refresh()`, que repete o GET.
3. **Logout:** botão no rodapé do menu → `POST /auth/logout` apaga o cookie e leva para `/entrar`.

Todas as chamadas ao CRM saem do **servidor** da Academy (o navegador nunca chama o CRM; o CRM não tem CORS nessas rotas).

Como a sessão chega às telas:
- **Componentes server** chamam `await getSession()` diretamente.
- **Componentes client** usam `useSession()` ([components/session-provider.tsx](components/session-provider.tsx)); o `layout.tsx` busca a sessão uma vez e a entrega pelo `SessionProvider`.

O menu **Administração** só aparece quando `user.role === 'admin'`.

## Conteúdo do curso — [data/platform.ts](data/platform.ts)

Não contém dados de usuário, apenas o curso:

- `course`: id (usado na URL), título, descrição e cores da capa.
- `lessons`: lista de aulas `{ id, title, duration: 'mm:ss', video, description? }`. O campo `video` aceita:
  - link do YouTube (watch, youtu.be, shorts, embed) ou só o ID → exibido com `<iframe>` (o vídeo precisa ser **Não listado** ou público e com "Permitir incorporação" ativo);
  - link direto de arquivo `.mp4`, `.webm` ou `.ogg` → exibido com `<video controls>`;
  - vazio → "Vídeo em breve".
- Helpers: `courseProgress(completedIds)` (concluídas, restantes, %, próxima aula), `lessonStates(completedIds)` (concluída / atual / bloqueada, em sequência), `totalDuration()`, `getYoutubeId()` e `isVideoFile()`.

> **Regra do `id` da aula:** só letras minúsculas, números e hífen (`^[a-z0-9-]+$`, até 100 caracteres), sem acento e sem maiúsculas — é o formato que o CRM aceita e grava no progresso. Depois que houver progresso salvo, **não renomeie** ids: o progresso antigo deixaria de ser reconhecido.

## Componentes

### `AcademyShell` — [components/academy-shell.tsx](components/academy-shell.tsx)
Layout de todas as telas (componente client):
- **Sidebar** fixa escura (`#0c1428`): "Navegação" (Início, Meus treinamentos), "Administração" (só admin) e "Minha conta" (Perfil, Configurações), com o cartão do usuário no rodapé.
- **Recolhível** no desktop (250px ↔ 76px); no **mobile** (< `lg`) vira drawer com overlay.
- **Header** fixo com nome, perfil e avatar (iniciais). Sem sessão mostra "Não conectado".

### `AdminDashboard` — [components/admin-dashboard.tsx](components/admin-dashboard.tsx)
Recebe `consultants: ConsultantProgress[]` e calcula tudo no cliente: % e status de cada consultor, aula atual, "última atividade" relativa e alerta para quem está em andamento e sem atividade há 7+ dias (`INACTIVE_DAYS`).

### Outros
- `ProgressBar` — `<ProgressBar value={0-100} className? />`.
- `CourseArtwork` — capa gerada por CSS (gradiente + círculos).
- `CourseCard` — `<CourseCard percent={n} />`, card do curso com status e link.
- `NotConnected` — estado vazio para telas que dependem do usuário.

## Design system

Os estilos estão escritos direto nas classes Tailwind, com valores hex arbitrários. Paleta usada:

| Uso | Cor |
|---|---|
| Azul marinho (sidebar, heros, texto principal) | `#0c1428` |
| Azul primário (botões, links ativos, barras) | `#0098d8` — hover `#0087c0` |
| Azul claro / destaque | `#1db1e7`, `#4ce2fa`, `#80d8f2` |
| Azul escuro de texto de destaque | `#007eae`, `#0c5c83` |
| Fundo da página | `#f6f8fb` |
| Bordas | `#e4ebf1` |
| Texto secundário | `#718096`, `#8290a3` |
| Sucesso | `#16846b` sobre `#e6f7f1` |
| Alerta | `#b7791f` / `#ffd48a` |
| Chip / realce suave | `#e8f8fc`, `#d5f4fb` |

Padrões recorrentes:
- Cards: `rounded-2xl border border-[#e4ebf1] bg-white`.
- Botões: `h-10 rounded-xl px-4 text-sm font-semibold` (primário azul; secundário com borda).
- Cabeçalho de página: sobretítulo azul pequeno → `h1 text-3xl font-semibold tracking-tight` → subtítulo cinza.
- Fonte: Arial/Helvetica (definida em `globals.css`). Tema só claro.

**Sugestão:** mover as cores repetidas para tokens no `@theme` de `globals.css` (ex.: `--color-brand`, `--color-navy`). Isso também faz o `Button` do shadcn funcionar, pois ele depende de `bg-primary`, `bg-muted` etc., que hoje não estão definidos.

## Pendências

1. **CRM implementar o contrato** de [docs/CONTRATO-SSO-CRM.md](docs/CONTRATO-SSO-CRM.md), trocar `ACADEMY_CLIENT_SECRET` por canal seguro e fazer o teste de ponta a ponta com o CRM real.
2. **Rate limit em memória:** vale por instância. Se a hospedagem tiver várias instâncias (serverless), trocar por um store compartilhado.
3. **Botão "Novidades"** ainda não tem ação.
4. **Aula bloqueada por URL direta:** a lista impede o clique, mas quem digitar o endereço abre a aula.
5. **`next.config.mjs` usa `typescript.ignoreBuildErrors: true`** — erros de tipo não quebram o build.
6. **Estilo de código compacto:** várias páginas estão em uma única linha; um formatador (Prettier) ajudaria.

# Contrato SSO — CRM Reobote ⇄ Reobote Academy

Padrão: **OAuth 2.0 Authorization Code + PKCE (S256)**, com a troca do `code` feita **servidor a servidor**.
Substitui o fluxo anterior (`/auth/callback?token=<jwt>`), que **deixa de existir**: a Academy não aceita mais token na URL.

Nenhum token, JWT, e-mail, nome ou `organizationId` trafega na URL. O navegador só vê `state`, `code_challenge` e um `code` opaco, de uso único, com validade de 60 s, que sem o `code_verifier` e o `client_secret` não serve para nada.

## Visão geral

```
Navegador            Academy (backend)                              CRM
   │  GET /auth/start      │                                         │
   │──────────────────────▶│ gera state + code_verifier              │
   │                       │ grava cookie cifrado (10 min, /auth)    │
   │◀── 303 → CRM /api/academy/authorize?state&code_challenge&… ─────│
   │─────────────────────────────────────────────────────────────────▶│ exige sessão CRM
   │                                                                  │ cria code (60 s, uso único)
   │◀── 302 → ACADEMY /auth/callback?code&state ──────────────────────│
   │  GET /auth/callback   │                                         │
   │──────────────────────▶│ valida state (cookie)                   │
   │                       │── POST /api/academy/token ─────────────▶│ valida client + code + PKCE
   │                       │◀── access_token, refresh_token, user ───│
   │                       │ grava sessão cifrada (HttpOnly)         │
   │◀── 303 → / ───────────│                                         │
   │                       │── Bearer access_token → /api/academy/* ▶│ (dados, sempre pelo backend)
```

## Configuração

| Onde | Variável | Valor |
|---|---|---|
| Academy | `CRM_URL` | URL base do CRM (dev `http://localhost:3000`, produção: domínio HTTPS do CRM) |
| Academy | `ACADEMY_CLIENT_ID` | Identificador do cliente, ex.: `reobote-academy` |
| Academy | `ACADEMY_CLIENT_SECRET` | Segredo do cliente (≥ 32 caracteres aleatórios) |
| Academy | `ACADEMY_SESSION_SECRET` | Chave de cifra da sessão da Academy (só a Academy conhece) |
| CRM | cliente registrado | `client_id`, hash do `client_secret` e **uma** `redirect_uri` fixa: `${ACADEMY_URL}/auth/callback` |

- A `redirect_uri` é **fixa e registrada no CRM**. A Academy **não envia** `redirect_uri` e o CRM **não deve aceitar** destino vindo da requisição.
- O `client_secret` é trocado por canal seguro e guardado só em variável de ambiente, nos dois lados. No CRM, guarde apenas o hash.
- `ACADEMY_JWT_SECRET` (fluxo antigo) **não é mais usado**.

---

## 1. `GET /api/academy/authorize` (CRM)

Aberto pelo **navegador**, redirecionado pela Academy.

**Query string (todos obrigatórios):**

| Parâmetro | Valor |
|---|---|
| `response_type` | `code` |
| `client_id` | igual a `ACADEMY_CLIENT_ID` |
| `state` | string opaca base64url (43 caracteres hoje; aceitar até 512) |
| `code_challenge` | `BASE64URL(SHA-256(code_verifier))`, sem padding: exatamente 43 caracteres `[A-Za-z0-9_-]` |
| `code_challenge_method` | `S256` (**rejeitar** `plain` ou ausente) |

**Comportamento:**
1. Validar os parâmetros. Se `client_id` for desconhecido ou algum parâmetro for inválido: responder **400** com página de erro própria do CRM. **Não redirecionar** para a Academy nesse caso.
2. Exigir **sessão CRM ativa**. Sem sessão: levar ao login do CRM e, depois do login, **retomar esta mesma requisição** (mesma query).
3. Usuário ativo: criar um `code`
   - opaco e aleatório (≥ 128 bits, ex.: 32 bytes em base64url);
   - **uso único** e com validade **máxima de 60 s**;
   - associado a: `userId`, `client_id`, `code_challenge`, criado em.

   Guardar **só o hash** do `code` no banco.
4. Redirecionar (**302 ou 303**) para a `redirect_uri` registrada:
   ```
   ${ACADEMY_URL}/auth/callback?code=<code>&state=<state>
   ```
   devolvendo o `state` **exatamente** como recebido. Cabeçalhos: `Cache-Control: no-store`, `Referrer-Policy: no-referrer`.
5. Usuário desativado ou sem permissão: redirecionar para `${ACADEMY_URL}/auth/callback?error=access_denied&state=<state>` (sem `code`).

**Não fazer:** colocar e-mail, nome, `userId`, `organizationId` ou tokens na URL; registrar a URL de redirecionamento (contém `code`) em log.

## 2. `POST /api/academy/token` (CRM)

Chamado **somente pelo backend da Academy**. Não precisa de CORS e não deve ter.

**Autenticação do cliente:** HTTP Basic (RFC 6749 §2.3.1)
```
Authorization: Basic base64( urlencode(client_id) + ":" + urlencode(client_secret) )
```
Comparar o segredo em tempo constante (contra o hash). O corpo também traz `client_id`, que precisa coincidir com o do Basic.

**Content-Type:** `application/x-www-form-urlencoded`

### 2a. Troca do code

```
grant_type=authorization_code
code=<code>
code_verifier=<code_verifier>
client_id=<client_id>
```

Validar **nesta ordem**:
1. Cliente autenticado. Se não: **401** `{"error":"invalid_client"}` com `WWW-Authenticate: Basic`.
2. `code` existe e pertence a este `client_id`.
3. `code` **não foi usado**. Marcar como usado **imediatamente, antes das demais validações** (uso único mesmo se a troca falhar). Se chegar um `code` já usado: recusar **e revogar os tokens emitidos a partir dele** (RFC 6749 §4.1.2).
4. `code` não expirou (≤ 60 s).
5. `code_verifier` tem 43 a 128 caracteres `[A-Za-z0-9._~-]` e `BASE64URL(SHA-256(code_verifier)) === code_challenge` (comparação em tempo constante).
6. Usuário ainda ativo.

Qualquer falha nos itens 2 a 6: **400** `{"error":"invalid_grant"}`, sem detalhes.

**Sucesso: 200**, com `Cache-Control: no-store` e `Pragma: no-cache`:
```json
{
  "access_token": "<opaco>",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "<opaco>",
  "refresh_expires_in": 28800,
  "user": { "id": "<cuid>", "role": "admin" | "consultor" }
}
```
- `access_token`: opaco (ou JWT; a Academy não inspeciona), **curto**: recomendado 15 min (`expires_in` em segundos).
- `refresh_token`: opaco, validade **máxima de 8 h** (`refresh_expires_in` em segundos). Guardar só o hash.
- `user.id`: string (cuid). `user.role`: mesmo mapeamento atual (Dono/Gerente → `admin`; Supervisor/Membro → `consultor`). Campos extras em `user` são ignorados.

### 2b. Renovação

```
grant_type=refresh_token
refresh_token=<refresh_token>
client_id=<client_id>
```
- Mesma autenticação de cliente.
- Válido, não expirado e usuário ativo: **200** no mesmo formato de 2a, com o **mesmo `user.id`**.
  - `refresh_token` na resposta é opcional. Se vier, a Academy passa a usar o novo.
  - **Se houver rotação**, manter o `refresh_token` anterior válido por uma **janela de pelo menos 60 s**, porque requisições paralelas da mesma sessão podem renová-lo ao mesmo tempo. Como o cliente é confidencial (autenticado com `client_secret`), a rotação é opcional.
  - A renovação **não estende** a sessão: a Academy impõe teto absoluto de 8 h desde o login.
- Inválido, expirado ou usuário desativado: **400** `{"error":"invalid_grant"}`.

**Rate limit:** aplicar por `client_id` e por IP. Em excesso: **429** com `Retry-After`.

## 3. API de dados `/api/academy/*` (CRM)

Mesmo contrato já implementado, mudando só o que autentica:

- `Authorization: Bearer <access_token>` emitido pelo `/api/academy/token` (não mais o JWT do fluxo antigo).
- Token ausente, inválido, expirado ou usuário desativado: **401** `{"error":"Token inválido ou expirado"}`.
- Sem permissão: **403** `{"error":"Acesso restrito"}`.
- Respostas com `Cache-Control: no-store`.

| Rota | Resposta |
|---|---|
| `GET /api/academy/me` | `{ "id", "name", "email", "role" }` |
| `GET /api/academy/progresso/me` | `{ "completedLessonIds": string[] }` |
| `POST /api/academy/progresso` `{ "aulaId" }` | 201 (nova) / 200 (já existia): `{ "aulaId", "concluidaEm" }`; 400 se `aulaId` fora de `^[a-z0-9-]{1,100}$` |
| `GET /api/academy/progresso` (admin) | `[{ "id", "name", "email", "completedLessonIds", "lastActivity" }]`, incluindo consultores sem progresso; 403 para não-admin |

**Como a Academy reage:** ao receber **401 ou 403** em `/me`, `/progresso/me` ou `/progresso` (admin), ela **apaga a sessão local** e leva o usuário a um novo login.

## 4. Botões no CRM

"Ver treinamento" e "Acessar" (modal de primeiro acesso) passam a ser **links simples** para:
```
${ACADEMY_URL}/auth/start
```
A Academy inicia o fluxo. O CRM **não gera mais token nesse clique**. A rota antiga `GET /api/academy/acesso` deve ser **removida**.

## 5. Segurança (CRM)

- Não registrar em log: `code`, `code_verifier`, `client_secret`, `access_token`, `refresh_token`, o header `Authorization` nem a URL de redirecionamento com `code`.
- Guardar só hashes de `code`, `access_token` (se opaco) e `refresh_token`.
- HTTPS obrigatório em produção.
- Logout/desativação: revogar os `refresh_token` do usuário (a Academy é derrubada no próximo refresh ou na próxima chamada à API, em até `expires_in`).

## 6. Critérios de aceite (CRM)

1. `authorize` sem sessão leva ao login do CRM e depois continua o fluxo.
2. `authorize` com `code_challenge_method=plain`, sem challenge ou com `client_id` errado → 400, sem redirecionar.
3. O mesmo `code` trocado duas vezes: a segunda retorna `invalid_grant` e revoga os tokens da primeira.
4. `code` com mais de 60 s → `invalid_grant`.
5. `code_verifier` errado → `invalid_grant`.
6. `client_secret` errado → 401 `invalid_client`.
7. `refresh_token` de usuário desativado → `invalid_grant`.
8. Nenhum log contém `code`, tokens ou `client_secret`.

A Academy tem um CRM simulado que segue este contrato (`scripts/crm-mock.mjs`) e uma bateria de testes (`pnpm test:sso`) que podem servir de referência.

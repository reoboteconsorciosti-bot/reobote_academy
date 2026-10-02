# syntax=docker/dockerfile:1
# Reobote Academy — imagem de produção (Next.js standalone).
#
# Build:  docker build -t reobote-academy .
# Rodar:  docker run -p 3000:3000 --env-file .env.production reobote-academy
#
# As variáveis (CRM_URL, ACADEMY_CLIENT_ID, ACADEMY_CLIENT_SECRET, ACADEMY_SESSION_SECRET)
# são lidas em TEMPO DE EXECUÇÃO: não vão para dentro da imagem. Passe-as no `docker run`
# ou no painel da hospedagem.

ARG NODE_VERSION=24-alpine

# ---------- Base ----------
FROM node:${NODE_VERSION} AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---------- Dependências ----------
FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- Build ----------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- Execução ----------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Usuário sem privilégios
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# Usa a mesma porta do servidor (PORT), mesmo que a hospedagem a altere.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/entrar').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]

ARG NODE_IMAGE=mirror.gcr.io/library/node:24-alpine
FROM ${NODE_IMAGE} AS builder

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
RUN (while sleep 20; do echo "[docker] npm ci still running"; done) & keepalive=$!; npm ci --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000; status=$?; kill $keepalive || true; exit $status

COPY . .
RUN npm run db:generate
RUN npm run build

FROM ${NODE_IMAGE} AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN apk add --no-cache openssl
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nextjs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nextjs /app/src/server/password.ts ./src/server/password.ts
COPY --from=builder --chown=nextjs:nextjs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nextjs /app/node_modules ./node_modules

USER nextjs

EXPOSE 3000

CMD ["node", "scripts/start-production.mjs"]

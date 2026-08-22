ARG SOURCE_DATE_EPOCH

FROM node:22.18.0-bookworm-slim@sha256:752ea8a2f758c34002a0461bd9f1cee4f9a3c36d48494586f60ffce1fc708e0e AS dependencies

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
COPY prisma/schema.prisma prisma/schema.prisma
RUN npm ci

FROM dependencies AS production-dependencies

RUN npm prune --omit=dev

FROM node:22.18.0-bookworm-slim@sha256:752ea8a2f758c34002a0461bd9f1cee4f9a3c36d48494586f60ffce1fc708e0e AS builder

WORKDIR /app
ARG SIGNALDESK_RELEASE_COMMIT
ARG SOURCE_DATE_EPOCH
ENV NEXT_TELEMETRY_DISABLED=1 \
    SIGNALDESK_RELEASE_COMMIT=${SIGNALDESK_RELEASE_COMMIT} \
    SOURCE_DATE_EPOCH=${SOURCE_DATE_EPOCH}
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:22.18.0-bookworm-slim@sha256:752ea8a2f758c34002a0461bd9f1cee4f9a3c36d48494586f60ffce1fc708e0e AS runtime

WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/scripts/bootstrap-database-roles.mjs ./scripts/bootstrap-database-roles.mjs

USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/v1/health/live').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1));"]
CMD ["node", "server.js"]

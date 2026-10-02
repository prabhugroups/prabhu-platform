# syntax=docker/dockerfile:1

FROM node:26-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:26-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# lib/api.ts refuses to load without INTERNAL_API_URL, and `next build`
# imports it while collecting page data. The value is only a build-time
# placeholder — the runtime value comes from the container environment
# (infra/docker-compose.yml) and is read per request, never inlined.
ARG INTERNAL_API_URL=http://backend:8000
ENV INTERNAL_API_URL=${INTERNAL_API_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:26-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    # Docker sets HOSTNAME to the container id, which would make Next's
    # standalone server bind only to the container's own IP.
    HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

FROM node:20-alpine AS deps
WORKDIR /app/apps/public
COPY apps/public/package.json apps/public/package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS builder
WORKDIR /app/apps/public
COPY apps/public/package.json apps/public/package-lock.json ./
RUN npm ci
COPY apps/public/ ./
WORKDIR /app
COPY packages/script-engine/ ./packages/script-engine/
ARG NEXT_PUBLIC_BASE_URL=https://open-scripts.shawnup.com
ENV NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL}
WORKDIR /app/apps/public
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/public/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/public/.next/standalone/apps/public/ ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/public/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

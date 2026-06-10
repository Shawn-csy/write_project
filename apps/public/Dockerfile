FROM node:20-alpine AS builder
WORKDIR /app

# Copy only workspace manifests first so dependency install stays cacheable when
# application or package source changes.
COPY package.json package-lock.json ./
COPY packages/browser-download/package.json ./packages/browser-download/package.json
COPY packages/media-crop/package.json ./packages/media-crop/package.json
COPY packages/script-engine/package.json ./packages/script-engine/package.json
COPY packages/script-reader-renderer/package.json ./packages/script-reader-renderer/package.json
COPY packages/script-reader-ui/package.json ./packages/script-reader-ui/package.json
COPY packages/script-theme/package.json ./packages/script-theme/package.json
COPY apps/public/package.json ./apps/public/package.json

# Single root install hoists peer deps (Radix, React, etc.) to /app/node_modules,
# where packages/* source can resolve them by walking up from package roots.
RUN npm ci

COPY packages/ ./packages/
COPY apps/public/ ./apps/public/

ARG NEXT_PUBLIC_BASE_URL=https://open-scripts.shawnup.com
ENV NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL}

# Build the Next.js public app via workspace script
RUN npm run build:public

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

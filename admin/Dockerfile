# Croe Admin — Multi-stage Docker build
# Node 22 is required: pnpm 11 depends on the node:sqlite builtin (task.md T2.1).
# Keep the pnpm version pinned; never use pnpm@latest.
FROM node:22-alpine AS builder

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@11.1.2 --activate

WORKDIR /app

# Copy root workspace and admin workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY admin/package.json ./admin/
RUN pnpm install --frozen-lockfile --filter @croe/admin...

COPY admin/ ./admin/

WORKDIR /app/admin

# Next.js telemetry disable
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build

# Stage 2: Production image
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Standalone output is traced from the monorepo root (next.config.js), so the
# server lives at admin/server.js with the pnpm store under node_modules/.pnpm.
COPY --from=builder --chown=nextjs:nodejs /app/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/admin/public ./admin/public
COPY --from=builder --chown=nextjs:nodejs /app/admin/.next/static ./admin/.next/static

USER nextjs

EXPOSE 3001
ENV PORT=3001
# Docker sets HOSTNAME to the container ID; bind on all interfaces instead.
ENV HOSTNAME=0.0.0.0

CMD ["node", "admin/server.js"]

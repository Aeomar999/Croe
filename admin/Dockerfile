# Croe Admin — Multi-stage Docker build
FROM node:20-alpine AS builder

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy root workspace and admin workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY admin/package.json ./admin/
RUN pnpm install --frozen-lockfile --filter @croe/admin...

COPY admin/ ./admin/

WORKDIR /app/admin

# Next.js telemetry disable
ENV NEXT_TELEMETRY_DISABLED 1

RUN pnpm build

# Stage 2: Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set correct permissions
COPY --from=builder /app/admin/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/admin/.next/static ./.next/static

USER nextjs

EXPOSE 3001
ENV PORT 3001

CMD ["node", "admin/server.js"]

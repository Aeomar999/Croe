# Croe Backend — Multi-stage Docker build
# Node 22 is required: pnpm 11 depends on the node:sqlite builtin (task.md T2.1).
# Keep the pnpm version pinned; never use pnpm@latest.

# Stage 1: Build
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@11.1.2 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

COPY tsconfig.json ./
COPY src/ ./src/
COPY migrations/ ./migrations/

RUN pnpm build

# Stage 2: Production
FROM node:22-alpine AS runner

RUN corepack enable && corepack prepare pnpm@11.1.2 --activate

WORKDIR /app

ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/migrations ./migrations

RUN addgroup -g 1001 -S croe && \
    adduser -S croe -u 1001 -G croe

USER croe

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["node", "dist/index.js"]

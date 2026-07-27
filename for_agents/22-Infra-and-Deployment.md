# Croe — Infrastructure & Deployment (`22-Infra-and-Deployment.md`)

> Absorbs the backend/infra parts of the legacy `Techstack.md`. Student-cheap first, scale later. Cost realities in [`03-Business-Model-and-Costs.md`](03-Business-Model-and-Costs.md). Custody phase drives which env is "live".

## 1. Environments

| Env | Purpose | Custody phase | Payments |
| :--- | :--- | :--- | :--- |
| **dev (local)** | build & test | P0 | aggregator **sandbox** |
| **staging** | pre-release | P0/P1 | sandbox / limited live |
| **prod** | real users | P1 → P2 | aggregator live / partner |

## 2. Local Stack (free, `docker-compose`)

```yaml
# docker-compose.yml (illustrative)
services:
  db:
    image: postgres:16
    environment: { POSTGRES_DB: croe, POSTGRES_USER: croe, POSTGRES_PASSWORD: dev }
    ports: ["5432:5432"]
  redis:
    image: redis:7.2
    ports: ["6379:6379"]
  api:
    build: ./api
    env_file: .env            # never committed
    depends_on: [db, redis]
    ports: ["8080:8080"]
  llm:
    image: ollama/ollama       # local open-weights inference
    ports: ["11434:11434"]
    # pull the pinned model on first run (see §4)
```

Everything above runs free on a laptop → the P0 "build for ~0 GHS" path.

## 3. Backend Runtime

- **Node.js 20 LTS + TypeScript 5.4** (strict: `noImplicitAny`, `strictNullChecks`).
- Express/Fastify with raw-body capture for webhook HMAC ([`24`](12-Webhooks-and-Idempotency.md)).
- `pg.Pool` (`max: 20`, `idleTimeoutMillis: 30000`) or pgBouncer transaction pooling.
- **Migrations:** pin **`node-pg-migrate`** (or Prisma Migrate); one migration per change; never edit shipped migrations ([`11`](05-Data-Model.md) §8).

## 4. LLM Hosting

- **Local open-weights model** via **Ollama** (dev) / **vLLM** (prod) behind a small internal HTTP API.
- Pin the exact model id (a current open-weights instruct model that runs on modest hardware) in this doc at implementation time and mirror it into `dispute_cases.ai_model_version`. (The legacy "Gemma 4" name was a placeholder.)
- Resource note: text-only + pre-captioned images keeps a small model within the `< 5s` inference NFR ([`01`](01-PRD.md)).

## 5. Hosting Path (cheap → scale)

| Stage | Hosting | Note |
| :--- | :--- | :--- |
| Pilot (P1) | Railway / Render / Fly free-or-cheap tier; managed Postgres + Redis add-ons | lowest cost; enough for low volume |
| Growth | Dedicated managed Postgres, Redis, container host; separate LLM box (CPU/GPU) | scale when volume warrants (cross-ref break-even, [`03`](03-Business-Model-and-Costs.md)) |

Object storage: S3 / Cloudflare R2 (usage-based) for hashed evidence media.

## 6. CI/CD

- On PR: typecheck, lint, unit/integration tests ([`43`](24-Testing-Strategy.md)), migration dry-run.
- On merge to main: build image, run migrations, deploy to staging; promote to prod on approval.
- Secrets injected from the platform store (never in CI logs).

## 7. Secrets & Config

- `.env` (git-ignored) locally; platform secret store in prod.
- Required: `DATABASE_URL`, `REDIS_URL`, `MOMO_WEBHOOK_SECRET`, aggregator keys, `JWT_SECRET`, `OTP_PEPPER`, `CUSTODY_PHASE`, `LLM_URL`, `LLM_MODEL`.

## 8. Backups & DR

- Automated daily Postgres backups + PITR where available; test restores.
- Object storage versioning for evidence.
- Ledger is the financial source of truth — back it up with the highest guarantees.

## 9. Acceptance Criteria

- A developer can bring up the entire stack locally for free with `docker-compose up`.
- `CUSTODY_PHASE` config switches sandbox↔live without code changes.
- Migrations are reproducible and forward-only.
- No secrets in the repo or CI logs.

# Croe — Production Readiness Task List

> **Living document.** Engineering tasks and launch gates that stand between the current codebase and a supervised P1 pilot with real money.
>
> - **Audit basis:** code on `fix/admin-resolve-dispute` @ `953bd69`, and CI run `36207266482` on `main` @ `d17ec01`. Audited 2026-09-26.
> - **Scope:** this file owns **engineering work and launch gates**. Business, legal, and operations tasks stay in [`PRODUCTION_TASKS.md`](PRODUCTION_TASKS.md) (IDs `A1`–`G13`, `OC*`, `OG*`) and [`GO-TO-MARKET.md`](GO-TO-MARKET.md). They are referenced here by ID and not duplicated.
> - **Rule PROC-03:** when a task here changes production readiness, update [`Production_manual.md`](Production_manual.md) in the same commit.

---

## How to use this file

Each task is a checkbox with four fields:

- **Where:** the file and line the problem lives in.
- **Problem:** what goes wrong, concretely.
- **Fix:** the intended change.
- **Done when:** the acceptance check. A task is only ticked when this is true and evidence (a test, CI run, or screenshot) exists.

**Severity**

| Label | Meaning |
|-------|---------|
| `Blocker` | Money is lost or stuck, a security boundary is open, or the system cannot deploy. Must be fixed before the milestone it is tagged with. |
| `High` | A serious gap that will cause incidents or failed reviews. Required for the tagged milestone. |
| `Medium` | Should be done for the milestone. It can slip only with a written reason in the task. |
| `Low` | Hygiene. Do it when you are nearby. |

**Milestones.** These are deliberately **not** called P0–P3, which are custody phases (TERM-01).

| Milestone | Definition |
|-----------|-----------|
| `M1` **Sandbox staging** | Backend and admin deployed to a staging URL with `CUSTODY_PHASE=P0`. No real money. The full escrow lifecycle works end to end. CI is green. |
| `M2` **Real-money code-ready** | Every `M1` and `M2` task is done. Staging runs on **Paystack test keys** and passes the deposit → release → refund end-to-end run (T16.1). |
| `M3` **Supervised P1 pilot live** | `M2`, plus infra, security, store and business gates. `CUSTODY_PHASE=P1` in production with low transaction caps. |

**Size:** `S` is half a day or less, `M` is 1–2 days, `L` is 3 or more days.

Items marked **(verify)** are likely but were not confirmed during the audit. Confirm them first, then fix or close.

---

## Readiness snapshot (2026-09-26)

| Area | State today | Key blockers |
|------|-------------|--------------|
| CI | Red on every push to `main` since at least 2026-09-24. Backend tests: 327/336 passing. Backend Docker image does not build. Deploy jobs never run. | T2.1, T2.2 |
| Deploy config | `render.yaml` as written would not produce a working API or admin console. | T3.2, T3.4, T7.3 |
| Money movement (Paystack) | Payouts are sent to the phone number `"unknown"`, for the full amount (commission not kept), and always to MTN. | T4.1–T4.3, T4.5, T4.9 |
| Authorization & lifecycle | Any logged-in user can trigger a refund or take over a funded escrow. No deposit-expiry or auto-release timers exist. | T5.1, T5.3, T5.6 |
| Webhooks | A webhook that fails during processing is lost permanently. Sandbox deposits never secure. | T6.1–T6.3 |
| Security | Public repo with hard-coded admin credentials. Every client appears to share one IP. The ledger is not append-only in production. | T1.1, T7.1, T7.2 |
| Compliance in code | KYC tier limits are never enforced. Uploaded ID images are discarded. | T8.1, T8.2 |
| Mobile | Buyer's MoMo number is hard-coded. Pay links cannot be resolved. Evidence upload and KYC submission are not wired. | T10.1–T10.4 |
| Infrastructure | 0 of 12 items provisioned. | §14 |
| Business / legal | 108 of 114 tasks not started. Phase A (aggregator approval) is blocking everything. | §18 |

**What is already solid:**

- Money arithmetic uses integer minor units (FIN-01).
- `SELECT … FOR UPDATE` plus the 23505 duplicate trap are in place on core paths.
- Webhook HMAC is checked over the raw body with `timingSafeEqual`.
- The ledger is append-only by design.
- If the LLM fails, the dispute escalates safely to `UNDER_HUMAN_REVIEW`.
- Logging is structured (Pino).
- All three apps typecheck under strict TypeScript.
- A CI/CD pipeline exists (it just is not green).

---

## Critical path

```
TODAY
  │
  ├─► §1 Security hygiene ─► §2 CI green ─► §3 Deploy config ─► M1  Sandbox staging live
  │                                                                  │
  │   Paystack written answers (PRODUCTION_TASKS A1–A3, T4.9) ──┐    │
  │                                                             ▼    ▼
  ├─► §4 Money · §5 Lifecycle/authz · §6 Webhooks · §7 Security · §8 KYC · §10 Mobile
  │                                          │
  │                                          ▼
  │                         T16.1 Paystack test-mode end-to-end ─► M2  Real-money code-ready
  │                                                                  │
  └─► Company · lawyer · ToS/Privacy · store accounts · pen test ────┴─► M3  Supervised P1 pilot
      · ops roles & SOPs  (PRODUCTION_TASKS A–F, §14–§16 here)
```

The engineering path to M2 is on the order of **2–4 weeks** of focused work. The business path to M3 is **10–14 weeks from starting Phase A**, per [`PRODUCTION_READINESS_PLAN.md`](PRODUCTION_READINESS_PLAN.md). Phase A has not started, so it is the real long pole: start it in parallel today.

---

## 1. Immediate security hygiene (do first)

- [ ] **T1.1 · Remove hard-coded admin credentials and rotate them** — `Blocker` `M1` `S`
  - **Where:** [`backend/src/db/seed.ts#L41`](backend/src/db/seed.ts#L41) (lines 41–42)
  - **Problem:** The GitHub repo `Aeomar999/Croe` is **public**. The seed script contains a literal admin email and password, and the pair is also in git history. If the seed ever runs against a shared or production database, an admin account with a publicly known password exists.
  - **Fix:**
    - Read `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` from the environment instead.
    - Make the seed exit non-zero when `NODE_ENV=production`.
    - Create production staff accounts with a dedicated script instead (T7.4).
    - Change that password anywhere it has been reused.
  - **Done when:** grep finds no literal credentials in the repo, and `NODE_ENV=production pnpm db:seed` refuses to run.

- [ ] **T1.2 · Delete the admin mock-login fallback** — `Blocker` `M1` `S`
  - **Where:** [`admin/src/context/AuthContext.tsx#L40`](admin/src/context/AuthContext.tsx#L40) (lines 40–50)
  - **Problem:** When the login API call fails and the email matches a hard-coded address, the UI stores `mock-access-token` and routes to `/dashboard`. The backend still rejects the fake token, but this hides real login failures and ships a hard-coded identity.
  - **Fix:** Remove the fallback and show a calm error message instead.
  - **Done when:** A failed login always stays on `/login` with an error, and no hard-coded email remains in `admin/src`.

- [ ] **T1.3 · Decide repository visibility** — `High` `M1` `S` — *Owner: Founder*
  - **Problem:** The public repo exposes `pitch/` (financial model, vendor pilot agreement, banking brief), the security threat model, fee strategy, and every future finding in this file.
  - **Fix:** Recommended: make the repo private before M2. If it stays public, move `pitch/` and security docs out of it.
  - **Done when:** The decision is recorded here and `gh repo view --json visibility` matches it.

- [ ] **T1.4 · OTP request endpoint swallows all errors** — `Blocker` `M1` `S`
  - **Where:** [`backend/src/routes/auth.ts#L30`](backend/src/routes/auth.ts#L30) (lines 30–34)
  - **Problem:** The `requestOTP` catch block uses `console.error` (violates SEC-01) and swallows **all** errors including DB failures, SMS provider failures, and rate limit errors. Returns 202 "OTP sent" even when nothing was sent, enabling user enumeration via timing.
  - **Fix:** Return 202 only after successful `requestOTP` call. On failure, log structured error and return 500/503. The "prevent user enumeration" goal is achieved by always returning 202 *after* successful enqueue, not by swallowing errors.
  - **Done when:** A failed OTP request (DB down, SMS down) returns 500/503, not 202. No `console.error` in production code.

- [ ] **T1.5 · Paystack webhook uses wrong HMAC secret** — `High` `M1` `S`
  - **Where:** [`backend/src/middleware/webhook-hmac.ts#L38`](backend/src/middleware/webhook-hmac.ts#L38)
  - **Problem:** Paystack webhooks use `MOMO_WEBHOOK_SECRET` instead of a dedicated `PAYSTACK_WEBHOOK_SECRET`. If keys are shared across providers, compromise of one compromises the other.
  - **Fix:** Add `PAYSTACK_WEBHOOK_SECRET` to env and use it here. Document in `.env.example`.
  - **Done when:** Paystack webhook verification uses its own secret; unit test confirms different secrets produce different signatures.

---

## 2. CI green and build integrity

- [ ] **T2.1 · Fix the Docker builds: Node 22 and pinned pnpm** — `Blocker` `M1` `S`
  - **Where:** [`backend/Dockerfile#L3`](backend/Dockerfile#L3) (lines 3, 5, 19, 21) and [`admin/Dockerfile#L2`](admin/Dockerfile#L2) (lines 2, 6, 25)
  - **Problem:** The images use `node:20-alpine` with `corepack prepare pnpm@latest`. pnpm 11 needs the `node:sqlite` module from Node 22, so CI fails with `ERR_UNKNOWN_BUILTIN_MODULE: node:sqlite`. CI itself runs on Node 22, so local and CI environments differ.
  - **Fix:**
    - Use `node:22-alpine` and `corepack prepare pnpm@11.1.2 --activate` (never `latest`).
    - Set `engines.node` to `>=22` in every `package.json`.
    - Update the stack table in AGENTS.md (it says Node 20 LTS).
  - **Done when:** The CI job "Verify Docker Builds" is green, and the backend image starts and serves `/health` against a local Postgres.

- [ ] **T2.2 · Fix the 9 failing backend tests** — `Blocker` `M1` `M`
  - **Problem:** 5 of these failures are **real bugs**, not test drift. See Appendix A for the full breakdown.
  - **Fix:**
    - kyc.integration ×2: real bug, fixed by T8.1.
    - api.e2e ×2: real bug, fixed by T6.3. The dispute test's 409 is a knock-on effect.
    - ai-triage.integration ×1: CI sets `LLM_MODEL=test`, so the mock path is skipped and the test tries a real fetch. Stub `callLLM` inside the test, or unset `LLM_MODEL` for it.
    - money.test ×2 (drift): the code now correctly rejects amounts that overflow NUMERIC(15,2) once the buyer fee is added. Assert `RangeError`, and add a test at the largest valid amount.
    - reconciliation.test ×2 (drift): the result moved to `perCurrency[]` and the anomaly text changed. Update the assertions.
  - **Done when:** CI "Tests (backend)" shows 336/336 (or more) passing.

- [ ] **T2.3 · Require green CI before merging to `main`** — `High` `M1` `S` — *Owner: repo admin*
  - **Problem:** PRs were merged while every CI run was red, and nothing stopped them.
  - **Fix:** Add branch protection on `main`: required checks (Typecheck, Lint, Tests backend/admin/mobile, Build, Verify Docker Builds), an up-to-date branch, and no force pushes.
  - **Done when:** A PR with a red check cannot be merged.

- [ ] **T2.4 · Land unmerged work** — `Medium` `M1` `S`
  - **Problem:** Commit `953bd69` ("resolveDispute calls releaseFunds/refundFunds") exists only on local `fix/admin-resolve-dispute`. It is not on `origin` or `main`.
  - **Fix:** Push it and open a PR, which merges after T2.2.
  - **Done when:** `git branch -r --contains 953bd69` includes `origin/main`.

- [ ] **T2.5 · Set the GitHub default branch to `main`** — `Low` `M1` `S`
  - **Problem:** `origin/HEAD` points at `phase/1-data-ledger`, so new PRs target the wrong base.
  - **Done when:** `git remote show origin` reports `HEAD branch: main`.

- [ ] **T2.6 · Reduce lint warnings to zero and enforce it** — `Low` `M2` `S`
  - **Problem:** The backend has 42 warnings. Production_manual §1.1 #5 requires zero.
  - **Fix:** Clear the warnings, then add `--max-warnings 0` to the lint scripts.
  - **Done when:** CI lint fails on any new warning.

- [ ] **T2.7 · Add dependency vulnerability scanning** — `Medium` `M2` `S`
  - **Fix:** Add `pnpm audit --prod --audit-level high` to CI, and enable Dependabot or Renovate.
  - **Done when:** The audit step runs on every PR, and no high or critical advisories are open.

- [ ] **T2.8 · Make mobile E2E (Detox) runnable** — `Low` `M3` `M`
  - **Problem:** `mobile/e2e/*` exists, but it never runs in CI and there is no documented manual procedure.
  - **Done when:** It runs in a CI job, or a documented manual run against staging is recorded before each store build.

---

## 3. Deployment configuration (Render / Docker / env)

- [ ] **T3.1 · Choose the deploy runtime** — `High` `M1` `S`
  - **Fix:** Recommended: use Render's **Docker runtime** with the fixed Dockerfiles from T2.1, so staging and production run exactly what CI built. Otherwise, fix the native build (T3.2).
  - **Done when:** The decision is recorded here and `render.yaml` reflects it.

- [ ] **T3.2 · Install dev dependencies at build time** — `Blocker` `M1` `S` **(verify on first deploy)**
  - **Where:** [`render.yaml#L5`](render.yaml#L5)
  - **Problem:** `NODE_ENV=production` is set for the service, so `pnpm install` will likely skip devDependencies. That means `typescript` (needed by `pnpm build`) and `dotenv-cli` (needed by `pnpm db:migrate`) will be missing.
  - **Fix:** Use the Docker runtime (T3.1), or run `pnpm install --prod=false` in the build command.
  - **Done when:** A Render build log shows `tsc` completing.

- [ ] **T3.3 · Run migrations as a pre-deploy step, not in the build** — `High` `M1` `S`
  - **Where:** [`render.yaml#L5`](render.yaml#L5)
  - **Problem:** `pnpm db:migrate` runs inside `buildCommand`. That makes the build depend on the database. Also, `db:migrate` wraps itself in `dotenv --`, which is a dev dependency.
  - **Fix:** Move migrations to Render's pre-deploy command, or to a one-off job that must succeed before traffic shifts. Add a `db:migrate:prod` script that uses plain environment variables.
  - **Done when:** A failed migration blocks the deploy, and the previous version keeps serving.

- [ ] **T3.4 · Fix the doubled `/v1` in the admin API URL** — `Blocker` `M1` `S`
  - **Where:** [`render.yaml#L43`](render.yaml#L43), [`admin/src/lib/api.ts#L23`](admin/src/lib/api.ts#L23), [`admin/next.config.js`](admin/next.config.js)
  - **Problem:** `NEXT_PUBLIC_API_URL=https://api.croe.co/v1`, and the admin code appends `/v1` again, so every admin request goes to `/v1/v1/...` and gets a 404.
  - **Fix:**
    - Set `NEXT_PUBLIC_API_URL=https://api.croe.co` (host only).
    - Fix [`admin/.env.example`](admin/.env.example), which points at port 3001; the backend runs on 8080.
    - `NEXT_PUBLIC_*` values are baked in at build time, so rebuild after changing them.
  - **Done when:** Admin login on staging succeeds against the real backend.

- [ ] **T3.5 · Admin start command for standalone output** — `Medium` `M1` `S` **(verify)**
  - **Where:** [`admin/next.config.js`](admin/next.config.js) (`output: 'standalone'`), [`render.yaml#L39`](render.yaml#L39) (`pnpm start`, i.e. `next start`)
  - **Fix:** Start with `node .next/standalone/server.js` (copying `.next/static` and `public` into it), or drop `standalone` for the native runtime.
  - **Done when:** Admin serves correctly on staging with no startup warnings.

- [ ] **T3.6 · Complete the production environment definition** — `High` `M1` `S`
  - **Where:** [`render.yaml`](render.yaml). See Appendix B for the full matrix.
  - **Problem:** Several variables are missing: `ARKESEL_SMS_API_KEY`, `S3_REGION`, `ALERT_WEBHOOK_URL`, and explicit `COMMISSION_BPS` / `BUYER_PROTECTION_FEE_BPS` (defaults of 250/150 apply silently). Also, `CUSTODY_PHASE=P1` is hard-coded, so the first deploy would run on the Paystack path with no keys.
  - **Fix:**
    - Declare every variable, with `sync: false` for secrets.
    - Keep `CUSTODY_PHASE=P0` until M2.
    - Set `AGGREGATOR_BASE_URL=https://api.paystack.co`.
    - `CORS_ORIGIN` must include the admin origin.
  - **Done when:** Every variable in Appendix B is declared.

- [ ] **T3.7 · Fail fast on missing or invalid production config** — `High` `M1` `S`
  - **Where:** [`backend/src/config/env.ts`](backend/src/config/env.ts)
  - **Problem:**
    - `AGGREGATOR_API_KEY`, `AGGREGATOR_BASE_URL`, `S3_*` and `ARKESEL_SMS_API_KEY` default to `""`.
    - `CUSTODY_PHASE` is cast without validation, so a typo such as `p0` silently selects the Paystack provider ([`providers/index.ts`](backend/src/providers/index.ts)).
  - **Fix:** Validate `CUSTODY_PHASE ∈ {P0,P1,P2,P3}`. When `CUSTODY_PHASE ≠ P0` or `NODE_ENV=production`, require the aggregator, S3 and SMS variables.
  - **Done when:** Booting with a missing required variable exits with a clear message. Unit tests cover this.

- [ ] **T3.8 · Stand up a staging environment** — `High` `M1` `M`
  - **Problem:** CI expects `RENDER_DEPLOY_HOOK_URL_STAGING`, and the mobile `development`/`preview` profiles point at `api-staging.croe.co`. Neither exists yet.
  - **Fix:** Create `croe-api-staging`, `croe-admin-staging`, and a staging Postgres and Redis. Start with `CUSTODY_PHASE=P0`, then switch to Paystack **test** keys for M2.
  - **Done when:** A merge to `main` auto-deploys staging, and `https://api-staging.<domain>/health` returns 200.

- [ ] **T3.9 · Wire deploy hooks and production approval** — `Medium` `M1` `S`
  - **Fix:**
    - Add the GitHub secrets `RENDER_DEPLOY_HOOK_URL_STAGING` and `RENDER_DEPLOY_HOOK_URL_PROD`.
    - Require reviewer approval on the `production` environment.
    - Turn off Render auto-deploy for services driven by hooks, to avoid double deploys.
  - **Done when:** Production deploys only after the manual approval step.

- [ ] **T3.10 · Real health and readiness checks** — `Medium` `M1` `S`
  - **Where:** [`backend/src/routes/health.ts`](backend/src/routes/health.ts)
  - **Problem:** Only the database is checked. Production_manual §3.1 references `/health/db` and `/health/redis`, which do not exist.
  - **Fix:** Add a Redis ping plus a readiness endpoint, and set Render's `healthCheckPath`. Align the manual with what exists.
  - **Done when:** A Redis outage makes the readiness check fail.

- [ ] **T3.11 · Pick one domain and use it everywhere** — `Medium` `M1` `S` — *Owner: Founder*
  - **Problem:** The code uses three domains:
    - `croe.co`: API and admin (`render.yaml`, `eas.json`).
    - `croe.app`: pay links and the admin seed email.
    - `croe.io`: Paystack customer emails ([`paystack.ts#L139`](backend/src/providers/paystack.ts#L139)).
  - **Fix:** Register one domain and replace the others.
  - **Done when:** Grep for the unused domains returns nothing.

- [ ] **T3.12 · Make `.env.example` and the rate-limit config honest** — `Low` `M1` `S`
  - **Problem:** `.env.example` is missing `S3_ENDPOINT`, `ALERT_WEBHOOK_URL`, the fee variables and the retention variables. Separately, the `RATE_LIMIT_*` variables are read in `env.ts` but never used: [`rate-limiter.ts#L120`](backend/src/middleware/rate-limiter.ts#L120) hard-codes the limits.
  - **Done when:** Every variable in `env.ts` is documented and actually takes effect.

- [ ] **T3.13 · Run scheduled jobs on a single instance** — `Medium` `M3` `S`
  - **Where:** [`backend/src/jobs/scheduler.ts`](backend/src/jobs/scheduler.ts)
  - **Problem:** Jobs run in-process in every web instance. As soon as the service scales past one instance, reconciliation, retention and the new workers from §5 and §6 run concurrently.
  - **Fix:** Wrap each job in a `pg_try_advisory_lock`, or move the jobs into a dedicated worker service.
  - **Done when:** A test with two instances shows each job running once per interval.

---

## 4. Money movement correctness (Paystack, P1)

> MONEY-01 (pay, then write the ledger), MONEY-03 (go through the provider interfaces only) and FIN-01/02 apply to every task in this section. Each fix needs an integration test that asserts the **exact provider payload**.

- [ ] **T4.1 · Pay vendors and refund buyers to real wallets** — `Blocker` `M2` `M`
  - **Where:** [`escrow.ts#L500`](backend/src/services/escrow.ts#L500), [`#L523`](backend/src/services/escrow.ts#L523), [`#L632`](backend/src/services/escrow.ts#L632), [`#L653`](backend/src/services/escrow.ts#L653)
  - **Problem:** `releaseTo`, `refundTo` and `payouts.recipient_msisdn` all receive the literal string `"unknown"` (the comment says "placeholder until user auth", but auth exists). Every P1 payout and refund would fail at Paystack.
  - **Fix:** Release goes to the vendor's verified payout wallet (T4.3). Refund goes to the wallet that paid (T4.4). Record the real recipient in `payouts`.
  - **Done when:** No `"unknown"` literal remains, and the integration tests assert the correct MSISDN for release and refund.

- [ ] **T4.2 · Pay the vendor the net amount and keep the commission** — `Blocker` `M2` `S`
  - **Where:** [`paystack.ts#L52`](backend/src/providers/paystack.ts#L52) (lines 52–58), [`escrow.ts#L490`](backend/src/services/escrow.ts#L490)
  - **Problem:** `PaystackCustodyProvider.releaseTo` transfers `p.amount` (the full escrow amount). `vendorNet` is calculated in escrow.ts but only written to the `payouts` row. Croe keeps no commission, and reconciliation will flag every release.
  - **Fix:** Change the interface to take an explicit `payout: Money` (the net), so the provider cannot get it wrong. Update the sandbox provider to match.
  - **Done when:** A test shows that for 100.00 GHS at 250 bps, the transfer payload is `9750` pesewas.

- [ ] **T4.3 · Capture and verify the vendor's payout wallet and network** — `Blocker` `M2` `M`
  - **Where:** [`paystack.ts#L238`](backend/src/providers/paystack.ts#L238) (lines 238–259)
  - **Problem:** The Paystack recipient uses `bank_code: "MTN"` for everyone and the name `User <msisdn>`, and a new recipient is created on every payout. Vendors on Telecel or AirtelTigo will fail or be misrouted.
  - **Fix:**
    - Add a migration for `payout_msisdn`, `payout_network` and `paystack_recipient_code` on the vendor.
    - Load the MoMo provider codes from Paystack's bank list (`currency=GHS`, `type=mobile_money`) instead of hard-coding them.
    - Before the first payout, resolve and show the account name to the vendor for confirmation.
    - Create the recipient once and cache it.
  - **Done when:** Test-mode transfers succeed for all three networks.

- [ ] **T4.4 · Store the paying wallet at deposit and refund to that source** — `High` `M2` `S`
  - **Where:** [`escrow.ts#L292`](backend/src/services/escrow.ts#L292)
  - **Problem:** `initiateDeposit` receives `msisdn` and `carrier` but never saves them, so a refund has nowhere to go.
  - **Fix:** Add a migration for `buyer_msisdn` and `buyer_carrier` on `escrow_transactions`, set them at deposit, and refund to them. Refunding to the source of funds is also standard AML practice.
  - **Done when:** A refund test uses the deposit wallet, not the user's profile phone number.

- [ ] **T4.5 · Charge the buyer-protection fee, or set it to zero** — `Blocker` `M2` `S` — *Owner: Founder decision + Eng*
  - **Where:** [`money.ts#L103`](backend/src/services/money.ts#L103), [`routes/escrow.ts#L69`](backend/src/routes/escrow.ts#L69), [`escrow.ts#L335`](backend/src/services/escrow.ts#L335), [`reconciliation.ts#L78`](backend/src/jobs/reconciliation.ts#L78)
  - **Problem:** The API shows the buyer `amountCollected = amount + fee`, but the deposit charges only `tx.amount`. Reconciliation assumes the fee was collected, so the books will never balance.
  - **Fix:** Either charge `amountCollected` and record the fee per transaction, or set `BUYER_PROTECTION_FEE_BPS=0` for the pilot (the vendor-only 4% fallback in [`fees.ts`](backend/src/config/fees.ts)). The fee preview must match what is actually charged.
  - **Done when:** For one transaction, the charged amount equals the preview equals the ledger entry.

- [ ] **T4.6 · Verify the paid amount on the deposit webhook** — `High` `M2` `S`
  - **Where:** [`escrow.ts#L374`](backend/src/services/escrow.ts#L374)
  - **Problem:** `processDepositWebhook` receives only `transactionId`. It never compares the amount and currency in the webhook against what was expected.
  - **Fix:** Pass `parsed.amount` through. On a mismatch, do not set `FUNDS_SECURED`: write `FRAUD_FLAGGED`, alert, and hold the transaction for ops. Optionally confirm with Paystack's verify-transaction endpoint before securing funds.
  - **Done when:** A test shows an underpaid webhook leaves the escrow in `AWAITING_DEPOSIT` and raises an alert.

- [ ] **T4.7 · Never invent provider references** — `Medium` `M2` `S`
  - **Where:** [`paystack.ts#L198`](backend/src/providers/paystack.ts#L198), [`#L221`](backend/src/providers/paystack.ts#L221)
  - **Problem:** When a reference is missing, the code falls back to `String(Date.now())`. Every retry then looks like a new event, which defeats deduplication.
  - **Fix:** Reject the webhook (return `null` and log it) when the reference is missing.
  - **Done when:** A unit test shows a payload without a reference is not processed.

- [ ] **T4.8 · Handle every Paystack MoMo charge state** — `High` `M2` `M` **(verify per network)**
  - **Where:** [`paystack.ts#L130`](backend/src/providers/paystack.ts#L130), [`mobile/src/screens/PayDepositScreen.tsx`](mobile/src/screens/PayDepositScreen.tsx)
  - **Problem:** The code reads `data.reference` and assumes a USSD push happened. A mobile-money charge can also come back asking for an OTP, asking the user to approve offline, or failed.
  - **Fix:** Map each state to a clear API response, and add the matching buyer UX (for example, an OTP entry step) in the app.
  - **Done when:** A test-mode charge completes on MTN, Telecel and AirtelTigo.

- [ ] **T4.9 · Configure the Paystack account for escrow** — `Blocker` `M2` `S` — *Owner: Founder* (ties to PRODUCTION_TASKS `A1`)
  - **Problem:** Several account settings decide whether escrow can work at all, and none are confirmed.
  - **Fix:** Get written answers, then configure:
    - **Settlement:** Paystack settles the balance to your bank automatically by default. Escrow funds must stay in the Paystack balance, or on a subaccount or schedule that keeps them there.
    - **Transfers:** GHS mobile-money transfers from the balance are enabled.
    - **Transfer OTP:** it is disabled for API-initiated transfers (it is on by default; verify).
    - **Signing key:** confirm webhooks are signed with the secret key (see T7.8).
    - **Limits and fees:** confirm per-network limits and the fee schedule.
  - **Done when:** The answers are recorded in GO-TO-MARKET.md §1, and the account settings match.

- [ ] **T4.10 · Record provider fees so reconciliation can balance** — `High` `M2` `M`
  - **Problem:** Paystack deducts its fees from incoming charges and charges for each transfer. That means the Paystack balance ≠ deposits − payouts + Croe revenue, so reconciliation will mismatch permanently.
  - **Fix:** Store the provider fee for each charge (from the webhook fee data) and each transfer, as ledger or payout data. Include them in the expected balance.
  - **Done when:** A staging run on test keys reconciles to exactly 0.00.

- [ ] **T4.11 · Store actual fees per transaction and remove the approximations** — `High` `M2` `M`
  - **Where:** [`reconciliation.ts#L71`](backend/src/jobs/reconciliation.ts#L71) (lines 71 and 78 hard-code 250/150 bps as an "approximation"), [`paystack.ts#L117`](backend/src/providers/paystack.ts#L117)
  - **Problem:** Reconciliation ignores `FEE_SCHEDULE` and estimates Croe's revenue. `PaystackCustodyProvider.reconcile()` always returns `matched: true` with zeros. It is currently never called, but it is a trap waiting for someone to call it.
  - **Fix:** Add `commission` and `buyer_protection_fee` columns on `escrow_transactions`, set when the escrow is created. Reconciliation sums the actual values. Delete or properly implement `reconcile()`.
  - **Done when:** Changing `COMMISSION_BPS` does not break reconciliation.

- [ ] **T4.12 · Lock the escrow row and record the true previous state on transfer webhooks** — `Medium` `M2` `S`
  - **Where:** [`escrow.ts#L787`](backend/src/services/escrow.ts#L787) (lines 787–802)
  - **Problem:** The escrow row is updated without `SELECT … FOR UPDATE` (DB-22). For refunds, the previous state is hard-coded to `RESOLVED_AUTO`, even when it was `UNDER_HUMAN_REVIEW`. The ledger then records a false history.
  - **Fix:** Lock the escrow row, read the actual `current_status`, and call `validateTransition`.
  - **Done when:** A test covers a refund out of `UNDER_HUMAN_REVIEW`.

- [ ] **T4.13 · Handle payout failures** — `Medium` `M2` `S`
  - **Problem:** `PAYOUT_FAILED` is written but nothing alerts anyone. An admin can retry ([`admin.ts#L533`](backend/src/services/admin.ts#L533)), but there is no policy for when.
  - **Fix:** Alert on every `PAYOUT_FAILED` and on `transfer.reversed`. Define an automatic retry policy (with backoff and a maximum) or a manual-only policy. Write the ops runbook.
  - **Done when:** A simulated failure triggers an alert, and the runbook is in Production_manual §7.

- [ ] **T4.14 · Freeze payouts on a reconciliation mismatch** — `High` `M2` `M`
  - **Problem:** Production_manual §4.2 says the reconciliation job freezes new payouts automatically. The job only alerts, and no freeze exists anywhere.
  - **Fix:** Add a persistent `payouts_frozen` flag (in the DB, not memory). `releaseFunds` and `refundFunds` refuse to run while it is set. Only an admin can clear it, with a reason, and clearing it is audited.
  - **Done when:** A forced mismatch blocks the next release, and clearing the flag re-enables payouts.

- [ ] **T4.15 · Enforce pilot transaction caps** — `High` `M3` `S` (PRODUCTION_TASKS `G3`)
  - **Fix:** Add a config-driven cap per transaction (and per vendor per day), enforced in `createEscrow`, with an empathetic message when it is hit (UI-04).
  - **Done when:** Creating an escrow over the cap is rejected. The cap value is recorded in Production_manual.

- [ ] **T4.16 · Transfer webhook handler assumes hardcoded previous state** — `Medium` `M2` `S`
  - **Where:** [`escrow.ts#L787`](backend/src/services/escrow.ts#L787) (lines 787–802)
  - **Problem:** For refunds, the previous state is hard-coded to `RESOLVED_AUTO`, even when it was `UNDER_HUMAN_REVIEW`. The ledger then records a false history.
  - **Fix:** Lock the escrow row, read the actual `current_status`, and call `validateTransition` before writing ledger.
  - **Done when:** A test covers a refund out of `UNDER_HUMAN_REVIEW` showing correct previous state in ledger.

- [ ] **T4.17 · Escrow release/refund uses hardcoded "unknown" MSISDN** — `Blocker` `M2` `S`
  - **Where:** [`escrow.ts#L523`](backend/src/services/escrow.ts#L523), [`#L653`](backend/src/services/escrow.ts#L653)
  - **Problem:** Custody provider receives "unknown" for recipient MSISDN. In P1+, this must be the actual verified MSISDN.
  - **Fix:** Fetch actual MSISDN from user profile before calling provider; fail if not verified.
  - **Done when:** No "unknown" literal remains in custody provider calls; integration test passes with real MSISDN.

---

## 5. Escrow lifecycle and authorization

- [ ] **T5.1 · Any logged-in user can trigger a refund** — `Blocker` `M2` `S`
  - **Where:** [`routes/escrow.ts#L212`](backend/src/routes/escrow.ts#L212)
  - **Problem:** `POST /escrow/:id/refund` only requires `authenticate`. The state machine allows `UNDER_HUMAN_REVIEW → FUNDS_REFUNDED`, so a buyer whose dispute is waiting for a human reviewer can refund themselves and bypass L3 entirely. So can any other user who knows the ID.
  - **Fix:** Remove the public route, or restrict it to reviewer/ops/admin roles with a mandatory reason. Refunds should only come from dispute resolution (the admin `resolveDispute`) or from system flows.
  - **Done when:** A test shows the buyer, the vendor, and an unrelated user all get 403 on refund.

- [ ] **T5.2 · Anyone can trigger a release** — `High` `M2` `S`
  - **Where:** [`routes/escrow.ts#L195`](backend/src/routes/escrow.ts#L195)
  - **Problem:** `POST /escrow/:id/release` has no actor check.
  - **Fix:** Decide who releases funds. Recommended: the system releases automatically after `DELIVERED_CONFIRMED` and after the dispute window (T5.6), with no public route. If a route stays, restrict it to the buyer or admin.
  - **Done when:** A test shows an unrelated user gets 403 on release.

- [ ] **T5.3 · Guard the deposit endpoint against takeover** — `Blocker` `M2` `S`
  - **Where:** [`escrow.ts#L314`](backend/src/services/escrow.ts#L314) (lines 314–320), [`routes/escrow.ts#L109`](backend/src/routes/escrow.ts#L109)
  - **Problem:** `initiateDeposit` never calls `validateTransition`, even though the route comment says it is guarded. Any logged-in user can post a deposit on a `FUNDS_SECURED` escrow, reset it to `AWAITING_DEPOSIT`, and overwrite `buyer_id`.
  - **Fix:**
    - Allow `LINK_CREATED → AWAITING_DEPOSIT` only.
    - Allow a retry only when the status is `AWAITING_DEPOSIT` and the caller is the same buyer (re-triggering the USSD push).
    - Reject a vendor trying to pay their own link.
  - **Done when:** Regression tests cover the funded-escrow takeover, a vendor paying their own link, and a retry by the same buyer.

- [ ] **T5.4 · Audit authorization on every state-changing route** — `High` `M2` `M`
  - **Fix:** Go through ship, confirm-delivery, cancel, dispute open, evidence upload, and every admin route. For each, check:
    - The state guard (`validateTransition`).
    - The actor (vendor-only ship, buyer-only confirm, party-only evidence).
    - That the resource belongs to the caller (the IDOR check).
  - **Done when:** A table of route × guard × actor × test exists in this task, and every row has a test.

- [ ] **T5.5 · Deposit-window expiry worker** — `High` `M2` `M`
  - **Where:** spec [`07-Escrow-Lifecycle.md`](for_agents/07-Escrow-Lifecycle.md) §2–§3. Jobs are defined in [`scheduler.ts`](backend/src/jobs/scheduler.ts).
  - **Problem:** `AWAITING_DEPOSIT → EXPIRED` when `now > deposit_expires_at` is not implemented. Abandoned links stay open forever.
  - **Fix:** Add an idempotent scheduled scan with `FOR UPDATE`, a ledger entry and a notification. Decide whether a `LINK_CREATED` link also expires.
  - **Done when:** An integration test with a clock override shows the escrow moving to `EXPIRED`.

- [ ] **T5.6 · Auto-release worker after the dispute window** — `Blocker` `M2` `M`
  - **Where:** spec 07 §2 (the `SHIPPED` timer row). `dispute_closes_at` is set at [`escrow.ts#L109`](backend/src/services/escrow.ts#L109).
  - **Problem:** If the buyer never confirms delivery, **the vendor is never paid**. Nothing reads `dispute_closes_at`.
  - **Fix:** Add a scheduled release using the same pay-then-ledger path and `idx_single_success_payout` protection. Skip any transaction with an open dispute.
  - **Done when:** A test shows `SHIPPED` with an elapsed window and no dispute goes to `FUNDS_RELEASED` exactly once.

- [ ] **T5.7 · Handle money that arrives for an expired or cancelled escrow** — `High` `M2` `M`
  - **Problem:** A `charge.success` for an `EXPIRED` or `CANCELLED` escrow throws `InvalidTransition` inside the async handler. The webhook is dropped (see T6.1), but the buyer has been charged.
  - **Fix:** Record the orphan deposit, alert ops, and refund it automatically (or queue it for manual refund).
  - **Done when:** A test shows a late deposit produces a refund or a queued refund, plus an alert.

---

## 6. Webhook reliability

- [ ] **T6.1 · Don't mark a webhook as seen until it is processed** — `Blocker` `M2` `S`
  - **Where:** [`routes/webhooks.ts#L38`](backend/src/routes/webhooks.ts#L38)
  - **Problem:**
    - The Redis `SETNX` key is set before processing. If processing throws, the key stays for 24 hours.
    - The route returns `200` before processing (WH-04), so Paystack never retries.
    - Any processing error is therefore **permanent**: the buyer is charged and the escrow stays in `AWAITING_DEPOSIT`.
  - **Fix:** On failure, delete the Redis key. Treat `webhook_inbox` as the durable record and let the sweeper (T6.2) recover.
  - **Done when:** A test injects a failure, and the webhook is processed on the next sweep.

- [ ] **T6.2 · Implement and schedule the inbox sweeper** — `Blocker` `M2` `M`
  - **Where:** [`webhook-inbox.ts#L56`](backend/src/services/webhook-inbox.ts#L56) (lines 56–77)
  - **Problem:** `getUnprocessedWebhooks` selects `inbox_id` and `transaction_id`, but the table has `webhook_id` and no `transaction_id` ([`001_initial_schema.ts#L492`](backend/migrations/001_initial_schema.ts#L492)). Nothing calls it anyway.
  - **Fix:**
    - Fix the columns.
    - Pull the handler body out of the route into a service that both the route and the sweeper call.
    - Run the sweeper every minute under an advisory lock.
    - Add an `attempts` column with backoff.
    - Alert when a row is older than 15 minutes.
  - **Done when:** A crash-recovery test passes (Production_manual §1.1 #9 then holds for real).

- [ ] **T6.3 · Dispatch on a normalized event type (fixes sandbox deposits)** — `Blocker` `M1` `S`
  - **Where:** [`routes/webhooks.ts#L60`](backend/src/routes/webhooks.ts#L60), [`sandbox.ts#L142`](backend/src/providers/sandbox.ts#L142)
  - **Problem:** The route branches on the raw `event === "charge.success"`. Sandbox payloads have no `event` field, so P0 deposits never reach `FUNDS_SECURED`. This is the failing `api.e2e` test, and it blocks the "7 clean days on sandbox" gate.
  - **Fix:** `parseWebhook` returns `kind: "DEPOSIT" | "PAYOUT"` plus the outcome, and the route switches on `kind`. PaymentRail stays rail-agnostic (MONEY-03).
  - **Done when:** The api.e2e lifecycle test passes under P0.

- [ ] **T6.4 · Exempt the webhook route from the per-IP payment limit** — `High` `M2` `S`
  - **Where:** [`routes/webhooks.ts#L21`](backend/src/routes/webhooks.ts#L21), [`rate-limiter.ts#L122`](backend/src/middleware/rate-limiter.ts#L122)
  - **Problem:** The route uses the payment limiter (10 per minute per IP). Once T7.1 lands, all Paystack webhooks come from a handful of IPs, so a burst gets `429`.
  - **Fix:** Use a dedicated, high limit (or none) behind signature verification, optionally with an IP allowlist (T6.6).
  - **Done when:** A test with 100 signed webhooks per minute from one IP gets no 429s.

- [ ] **T6.5 · Correct forensic attribution on webhook ledger rows** — `Low` `M3` `S`
  - **Problem:** Deposit ledger rows store the forensic context (IP, device) of Paystack's server, not the buyer's.
  - **Fix:** Attribute them to System, and copy the buyer's device and IP from the deposit request (AUD-02).

- [ ] **T6.6 · Allowlist Paystack webhook source IPs** — `Low` `M3` `S`
  - **Fix:** Add this as defense in depth on top of HMAC, keeping the list in config.

- [ ] **T6.7 · Webhook inbox has no dead letter / retry limit** — `Medium` `M2` `S`
  - **Where:** [`backend/src/services/webhook-inbox.ts`](backend/src/services/webhook-inbox.ts)
  - **Problem:** Failed webhooks leave `processed_at = NULL` indefinitely. Sweeper retries forever. No max retry count, no dead-letter queue, no alerting.
  - **Fix:** Add `retry_count` column; after N failures, mark `dead_letter = true` and alert.
  - **Done when:** A webhook that fails N times is marked dead-letter and triggers an alert.

---

## 7. Security hardening

- [ ] **T7.1 · Trust the proxy so `req.ip` is the real client** — `Blocker` `M1` `S`
  - **Where:** [`backend/src/app.ts#L20`](backend/src/app.ts#L20). There is no `trust proxy` setting.
  - **Problem:** Behind Render (and Cloudflare), every request appears to come from the proxy's IP. As a result:
    - The OTP limit (3 per 5 minutes, keyed by IP for anonymous users at [`rate-limiter.ts#L63`](backend/src/middleware/rate-limiter.ts#L63)) becomes **global**, so login breaks under light load.
    - The Sybil check ([`heuristics.ts#L6`](backend/src/services/heuristics.ts#L6), [`#L37`](backend/src/services/heuristics.ts#L37): 2 accounts or 3 disputes per IP per 24 hours) puts **ordinary users into `FRAUD_LOCKOUT`**, with trust −50.
    - The forensic IP data (AUD-02) is worthless.
  - **Fix:** Set `app.set("trust proxy", <exact hop count>)`: 1 for Render alone, 2 with Cloudflare in front. Never `true`, which lets clients spoof `X-Forwarded-For`.
  - **Done when:** Supertest confirms `req.ip` resolves correctly and a spoofed extra `X-Forwarded-For` hop is ignored.

- [ ] **T7.2 · Enforce the append-only ledger in production** — `Blocker` `M2` `M`
  - **Where:** [`002_indexes_and_triggers.ts#L91`](backend/migrations/002_indexes_and_triggers.ts#L91) (lines 91–103)
  - **Problem:** The `REVOKE UPDATE, DELETE` only runs if the role `app_user` exists **when the migration runs**. On a fresh production database it is a no-op. The app also connects as the table owner, which ignores grants anyway. **AUD-01 is not enforced.**
  - **Fix:**
    - Add a new migration with a `BEFORE UPDATE OR DELETE` trigger on `transaction_ledger` that raises an error. Triggers apply to the owner too.
    - Separately, create a least-privilege runtime role distinct from the migration owner.
    - Update the Production_manual §2.1 step 7 check (it looks for grants on `croe`).
  - **Done when:** An integration test shows `UPDATE transaction_ledger …` fails when run as the app's database user.

- [ ] **T7.3 · Create the `password_hash` column in a migration** — `Blocker` `M1` `S`
  - **Where:** [`seed.ts#L20`](backend/src/db/seed.ts#L20) (lines 20–24), [`auth.ts#L328`](backend/src/services/auth.ts#L328)
  - **Problem:** Only the seed script creates `password_hash`. Production runs migrations only, so `adminLogin` fails and **no reviewer can log in**.
  - **Fix:** Add migration `007_users_password_hash`, and remove the `ALTER TABLE` from the seed.
  - **Done when:** A clean `db:migrate` followed by the staff account script (T7.4) produces a working admin login.

- [ ] **T7.4 · Staff account provisioning, 2FA and lockout** — `High` `M2` `M`
  - **Problem:** Reviewer, ops and admin roles move money (`resolveDispute`, `retryPayout`, KYC approval), but there is no way to create these accounts except the seed.
  - **Fix:**
    - Add a script like `pnpm admin:create --role reviewer` that prompts for the password or reads it from env, with a strength policy.
    - Require TOTP 2FA for staff roles.
    - Lock staff accounts after repeated failed logins.
  - **Done when:** Staff login requires a second factor, and the lockout is tested.

- [ ] **T7.5 · Move admin tokens out of JavaScript-readable storage** — `Medium` `M2` `M`
  - **Where:** [`admin/src/lib/api.ts#L69`](admin/src/lib/api.ts#L69) (lines 69–76)
  - **Problem:** Tokens live in `localStorage` plus cookies set from JavaScript. Any XSS on the admin console steals a money-moving session.
  - **Fix:** Have the backend set `HttpOnly`, `Secure`, `SameSite=Strict` cookies. If that has to wait, at minimum add a strict CSP on the admin console.
  - **Done when:** `document.cookie` and `localStorage` contain no tokens.

- [ ] **T7.6 · Decide how rate limits behave when Redis is down** — `High` `M2` `S`
  - **Where:** [`rate-limiter.ts#L80`](backend/src/middleware/rate-limiter.ts#L80)
  - **Problem:** Every limiter fails open. During a Redis outage, OTP requests are unlimited, which means SMS cost exposure and brute-force risk.
  - **Fix:** Fail closed for the OTP and auth limiters, and fail open for read endpoints.
  - **Done when:** A test simulating a Redis outage shows OTP requests are refused.

- [ ] **T7.7 · Rate-limit escalation doesn't do what the docs claim** — `Low` `M3` `S`
  - **Where:** [`rate-limiter.ts#L96`](backend/src/middleware/rate-limiter.ts#L96)
  - **Problem:** `recordRateLimitHit` only logs, keeps its counts in memory per instance, and the docs claim it writes `FRAUD_FLAGGED`.
  - **Fix:** Implement it with Redis and a ledger entry, or correct 21-Security-Threat-Model.md.

- [ ] **T7.8 · Move secrets into the platform store and rotate them** — `High` `M2` `S` (PRODUCTION_TASKS `D1`–`D2`, Production_manual §1.3)
  - **Fix:**
    - Generate `JWT_SECRET` and `OTP_PEPPER` from at least 32 random bytes each.
    - Paystack signs webhooks with the account **secret key**, so `MOMO_WEBHOOK_SECRET` must equal `AGGREGATOR_API_KEY`. Document this so they are rotated together.
    - Use different secrets for staging and production.
  - **Done when:** All rows in Production_manual §1.3 are ticked.

- [ ] **T7.9 · Keep OTP codes out of logs outside local development** — `Low` `M1` `S`
  - **Where:** [`auth.ts#L17`](backend/src/services/auth.ts#L17), [`mock-provider.ts#L6`](backend/src/providers/sms/mock-provider.ts#L6)
  - **Problem:** The mock SMS provider logs the OTP code in plain text, and it is selected whenever `CUSTODY_PHASE=P0`, including on staging.
  - **Fix:** Allow the mock only when `NODE_ENV` is `development` or `test`. On staging, use Arkesel or a redacting mock.

- [ ] **T7.10 · External penetration test** — `High` `M3` `L` — *Owner: Founder* (PRODUCTION_TASKS `D3`–`D4`)
  - **Fix:** Scope it per `21-Security-Threat-Model.md` §7, and run it **after** §5 and §7 are fixed.
  - **Done when:** The report is filed, and every critical or high finding is closed (Production_manual §1.4 #11–12).

- [ ] **T7.11 · Forensic headers are client-controlled, no server validation** — `High` `M2` `M`
  - **Where:** [`backend/src/middleware/forensic.ts#L24`](backend/src/middleware/forensic.ts#L24) (lines 24–26)
  - **Problem:** Headers `X-Device-Fingerprint` and `X-Network-Type` are fully client-controlled. A malicious client can spoof these to evade fraud detection (heuristics Rule 2: Sybil velocity). The threat model §1 "Repudiation" row assumes these are trustworthy.
  - **Fix:** Treat forensic headers as *untrusted signals* — use for correlation only. Derive device fingerprint server-side from TLS JA3 fingerprint + User-Agent + IP subnet. Store both client-reported and server-derived values; flag discrepancies.
  - **Done when:** Server derives its own device fingerprint; mismatches between client-reported and server-derived are logged and flagged in heuristics.

- [ ] **T7.12 · Admin actions lack audit logging** — `High` `M2` `M`
  - **Where:** [`backend/src/routes/admin.ts`](backend/src/routes/admin.ts) (all admin endpoints)
  - **Problem:** Admin actions (dispute resolution, user freeze, trust score adjustment, KYC review, payout retry) have no audit trail beyond the existing ledger. No record of *which admin*, *what decision*, *why*, or *what evidence was reviewed*.
  - **Fix:** Add `admin_audit_log` table with: `admin_id`, `action`, `target_type`, `target_id`, `decision`, `reason`, `evidence_snapshot`, `timestamp`, `ip`, `device_id`. Write in same transaction as the action.
  - **Done when:** Every admin endpoint writes an audit log entry; queries return full audit trail for any dispute/payout/user action.

- [ ] **T7.13 · Evidence upload lacks MIME sniffing / content validation** — `High` `M2` `S`
  - **Where:** [`backend/src/services/evidence.ts#L137`](backend/src/services/evidence.ts#L137) (lines 137–139)
  - **Problem:** Only checks `file.mimetype` from multipart header (client-controlled). No magic-byte validation. An attacker can upload a `.php` or `.exe` renamed to `.jpg` with `image/jpeg` MIME type.
  - **Fix:** Use `file-type` or `mmmagic` to validate actual content. Reject if extension ≠ detected type.
  - **Done when:** Unit test shows a file with fake MIME type is rejected based on magic bytes.

- [ ] **T7.14 · Dispute heuristics run outside transaction — race window** — `High` `M2` `M`
  - **Where:** [`backend/src/services/disputes.ts#L164`](backend/src/services/disputes.ts#L164) (lines 164–198)
  - **Problem:** Between commit and heuristic execution, another dispute could be opened for the same user/device, bypassing velocity checks (Rule 2: Sybil velocity). The heuristics read stale data.
  - **Fix:** Run heuristics *inside* the transaction (they're read-only SELECTs). Or use advisory locks on `(user_id, device_id)` during the check.
  - **Done when:** Concurrent dispute test shows second dispute correctly blocked by velocity heuristic.

- [ ] **T7.15 · JWT access token lacks rotation / revocation** — `High` `M2` `M`
  - **Where:** [`backend/src/services/auth.ts#L14`](backend/src/services/auth.ts#L14), [`#L217`](backend/src/services/auth.ts#L217) (lines 217–221)
  - **Problem:** 15min TTL is reasonable, but no token rotation on refresh. Refresh token is single-use (rotated), but access token can be replayed for 15min after logout/revocation. No `jti` (JWT ID) for per-token revocation.
  - **Fix:** Add `jti` claim; maintain revocation list in Redis with TTL matching access token. Check on each authenticated request (or use short TTL + mandatory refresh).
  - **Done when:** Logout/revocation invalidates access token within 1 second; test confirms replayed token rejected.

- [ ] **T7.16 · Admin login vulnerable to email enumeration via timing** — `Medium` `M2` `S`
  - **Where:** [`backend/src/services/auth.ts#L328`](backend/src/services/auth.ts#L328) (lines 328–340)
  - **Problem:** Returns immediately if user not found vs. after password verification. Allows email enumeration via timing attack.
  - **Fix:** Always run `verifyPassword` with a dummy hash when user not found (constant-time).
  - **Done when:** Timing test shows < 5ms difference between valid and invalid email.

- [ ] **T7.17 · PIN hash uses unsalted SHA-256** — `Medium` `M2` `S`
  - **Where:** [`backend/src/routes/auth.ts#L178`](backend/src/routes/auth.ts#L178) (lines 178–179)
  - **Problem:** PINs are 4-6 digits (10,000–1,000,000 combinations). SHA-256 unsalted is trivially rainbow-tableable. OTP uses pepper (`OTP_PEPPER`), PIN does not.
  - **Fix:** Use `scrypt` or `argon2` like password hashing, or at minimum add `PIN_PEPPER` env var.
  - **Done when:** PIN hash uses scrypt/argon2 or pepper; test shows rainbow table attack fails.

- [ ] **T7.18 · Error handler returns internal codes to clients** — `Medium` `M2` `S`
  - **Where:** [`backend/src/middleware/error-handler.ts#L25`](backend/src/middleware/error-handler.ts#L25) (lines 25–34)
  - **Problem:** Returns internal error codes (e.g., `OTP_EXPIRED`, `INVALID_STATE_TRANSITION`) directly to clients. Mobile client maps these to friendly messages, but web/third-party clients see raw codes. Violates `UI-04` (no backend enums shown to users).
  - **Fix:** Map internal codes to user-facing codes in error handler; log internal code server-side only.
  - **Done when:** External client receives generic error codes; internal codes only in server logs.

- [ ] **T7.19 · Idempotency key user ID check can be bypassed** — `Medium` `M2` `S`
  - **Where:** [`backend/src/services/idempotency.ts#L61`](backend/src/services/idempotency.ts#L61) (lines 61–63)
  - **Problem:** If `userId` is null (unauthenticated request), the check passes (`null !== null` is false). Two unauthenticated requests with same key but different bodies conflict correctly, but an authenticated then unauthenticated request with same key would not conflict.
  - **Fix:** Include auth state in key scope: `key:${userId ?? 'anon'}:${method}:${path}`.
  - **Done when:** Test shows authenticated + unauthenticated requests with same key correctly conflict.

- [ ] **T7.20 · S3 client init uses process.env directly, fails silently** — `Medium` `M2` `S`
  - **Where:** [`backend/src/services/evidence.ts#L35`](backend/src/services/evidence.ts#L35) (lines 35–50)
  - **Problem:** Credentials read from `process.env` at runtime (not from `env` config object). If S3 not configured, `s3Client` is null → upload silently skipped. No validation at startup.
  - **Fix:** Initialize S3 client at startup via `env` config; fail fast if misconfigured. Use IAM roles in production (no static keys).
  - **Done when:** Boot fails fast without S3 config; test shows silent skip removed.

- [ ] **T7.21 · CORS wildcard logic could allow subdomain takeover** — `Low` `M1` `S`
  - **Where:** [`backend/src/app.ts#L26`](backend/src/app.ts#L26) (lines 26–35)
  - **Problem:** If `CORS_ORIGIN` includes wildcard syntax (e.g., `https://*.croe.app`), string match would fail but developers might mistakenly use it.
  - **Fix:** Validate CORS origins at startup; reject wildcards. Use exact match only.
  - **Done when:** Startup validation rejects wildcard CORS origins; test confirms.

---

## 8. Compliance controls in code (KYC and AML)

- [ ] **T8.1 · Enforce KYC tier limits** — `Blocker` `M2` `S`
  - **Where:** [`kyc.ts#L21`](backend/src/services/kyc.ts#L21), [`#L58`](backend/src/services/kyc.ts#L58)
  - **Problem:** `checkTierLimit` is never called outside tests, so the limits in 09-KYC-and-AML.md are not enforced. It also crashes for any vendor with no transactions today: `COALESCE(...,'0')` returns `"0"`, which is not a valid NUMERIC(15,2) string. This is one of the failing CI tests.
  - **Fix:** Return `'0.00'`. Call the check in `createEscrow` (vendor), and in `initiateDeposit` if the buyer limits in 09 apply. Use empathetic copy when the limit is hit (UI-04).
  - **Done when:** The kyc.integration tests are green, and an over-limit escrow is rejected with friendly copy.

- [ ] **T8.2 · Store the KYC ID image** — `Blocker` `M2` `M`
  - **Where:** [`routes/kyc.ts#L38`](backend/src/routes/kyc.ts#L38) (lines 38–54)
  - **Problem:** The uploaded `id_image` is read into memory and **discarded**. The code comment says the reviewer extracts the number from the image, but the image is never saved. Also, every submission hashes the same placeholder, `P0_MANUAL_REVIEW`. **(verify)** Any duplicate-ID check based on `id_number_hash` would then match every user.
  - **Fix:**
    - Store the image encrypted in a private bucket separate from evidence (T14.3), keyed by SHA-256 (AUD-03).
    - Show it to the reviewer through short-lived signed URLs.
    - Have the reviewer record the real ID number on approval, which then gets hashed.
  - **Done when:** A reviewer can see the image on staging, and the duplicate-ID check works.

- [ ] **T8.3 · KYC status reports "VERIFIED" for users who never submitted** — `High` `M2` `S`
  - **Where:** [`routes/kyc.ts#L69`](backend/src/routes/kyc.ts#L69) (the `/kyc/status` handler)
  - **Problem:** `status` is `pendingSubmission ? "PENDING" : "VERIFIED"`, so a tier-0 user with no submission is shown as verified.
  - **Fix:** Derive the status from the tier and the latest submission, with values `NONE`, `PENDING`, `VERIFIED` and `REJECTED`.
  - **Done when:** Tests cover every state.

- [ ] **T8.4 · Record consent to the Terms and Privacy Policy** — `Medium` `M3` `S`
  - **Fix:** At onboarding, store the accepted document versions and a timestamp per user. Ask again when the documents change.

- [ ] **T8.5 · Export for suspicious-activity reports** — `Medium` `M3` `M` (PRODUCTION_TASKS `B8`)
  - **Fix:** Add an admin export of flagged cases (`FRAUD_FLAGGED`, `FRAUD_LOCKOUT`, structuring patterns) in the format the Financial Intelligence Centre (FIC) process needs.

- [ ] **T8.6 · Confirm and configure retention periods** — `Medium` `M3` `S` (PRODUCTION_TASKS `B7`)
  - **Fix:** Set the `RETENTION_*` values from legal advice. Confirm the retention job never touches `transaction_ledger`, evidence under dispute, or KYC data inside its legal retention period.

- [ ] **T8.7 · Account deletion and data-access requests** — `Medium` `M3` `M`
  - **Fix:** Add in-app account deletion (App Store requirement) and a data-export request flow (Data Protection Act, Act 843). Ledger rows stay, with personal data minimized.

---

## 9. Notifications

- [ ] **T9.1 · Actually send notifications** — `High` `M2` `M`
  - **Where:** [`notification.ts#L217`](backend/src/services/notification.ts#L217)
  - **Problem:** `notify()` has **no callers** outside tests. No SMS or push goes out when funds are secured, the item is shipped, a dispute opens, or funds are released or refunded, despite the matrix in 15-Notifications.md.
  - **Fix:** Emit notifications **after COMMIT** through an outbox table, so a notification failure can never roll back a money transaction. Cover every row of `NOTIFICATION_MATRIX`.
  - **Done when:** An integration test shows each lifecycle transition enqueues the right template for the right party.

- [ ] **T9.2 · Schedule notification retries** — `Medium` `M2` `S`
  - **Where:** [`notification.ts#L288`](backend/src/services/notification.ts#L288)
  - **Problem:** `retryFailedNotifications` is never scheduled.
  - **Fix:** Add it to the scheduler with the lock from T3.13.

- [ ] **T9.3 · Register push tokens** — `Medium` `M3` `S` **(verify)**
  - **Problem:** `users.push_token` exists (migration 004).
  - **Fix:** Confirm the mobile app registers and refreshes its Expo push token, and that the backend sends through Expo's push service.

- [ ] **T9.4 · Production SMS setup** — `High` `M3` `S` — *Owner: Founder* (PRODUCTION_TASKS `E3`)
  - **Fix:** Set up an Arkesel production account and a registered sender ID. Add a daily spend cap and an alert.

---

## 10. Mobile app

- [ ] **T10.1 · Let the buyer enter their own MoMo number** — `Blocker` `M2` `S`
  - **Where:** [`PayDepositScreen.tsx#L160`](mobile/src/screens/PayDepositScreen.tsx#L160)
  - **Problem:** `msisdn: '+233241234567'` is hard-coded. **Every buyer's payment prompt would go to that number.**
  - **Fix:** Add a phone input, prefilled from the profile, with E.164 validation. Detect the network from the number prefix, and let the buyer override it.
  - **Done when:** A test-mode charge reaches the number the buyer typed.

- [ ] **T10.2 · Make pay links work end to end** — `Blocker` `M2` `L`
  - **Where:** [`CreateEscrowScreen.tsx#L166`](mobile/src/screens/CreateEscrowScreen.tsx#L166), [`LinkCreatedScreen.tsx#L30`](mobile/src/screens/LinkCreatedScreen.tsx#L30), [`mobile/app.json`](mobile/app.json)
  - **Problem:**
    - The link is `croe.app/pay/<last 6 characters of the UUID>`, which the backend cannot resolve.
    - The screen falls back to a hard-coded sample link.
    - `app.json` has no `scheme` and no linking or universal-link config.
    - There is no web pay page.
    - A buyer who taps the link on WhatsApp gets nowhere, which breaks the core product loop.
  - **Fix:**
    - **Decision (Founder):** a lightweight **web checkout** at `/pay/:code` (no install; best for the under-30% payment drop-off target in `G11`), or universal/app links plus an install prompt.
    - **Backend:** add a unique short `pay_code` column and a public `GET /v1/pay/:code` preview that exposes no PII.
  - **Done when:** A link shared on WhatsApp opens the pay flow on a phone that has never seen Croe.

- [ ] **T10.3 · Wire dispute evidence upload** — `High` `M2` `M`
  - **Where:** [`DisputeOpenScreen.tsx#L126`](mobile/src/screens/DisputeOpenScreen.tsx#L126), [`#L152`](mobile/src/screens/DisputeOpenScreen.tsx#L152)
  - **Problem:** The file shown is a mock, and `evidence_artifact_ids: []` is always sent.
  - **Fix:** Use the image picker and camera (with the plugin and permission strings in `app.json`), upload through `POST /v1/evidence/upload`, and attach the returned IDs.
  - **Done when:** A dispute opened on a device shows its evidence in the admin console.

- [ ] **T10.4 · Wire KYC submission** — `High` `M2` `M`
  - **Where:** [`KycScreen.tsx#L61`](mobile/src/screens/KycScreen.tsx#L61)
  - **Problem:** The primary button has no `onPress`.
  - **Fix:** Add ID type selection, image capture, upload through `POST /v1/kyc/submit`, and a pending state. This depends on T8.2 and T8.3.

- [ ] **T10.5 · Error UX and console cleanup** — `Medium` `M2` `S`
  - **Where:** [`CreateEscrowScreen.tsx#L171`](mobile/src/screens/CreateEscrowScreen.tsx#L171), [`DisputeOpenScreen.tsx#L160`](mobile/src/screens/DisputeOpenScreen.tsx#L160), [`PayDepositScreen.tsx#L169`](mobile/src/screens/PayDepositScreen.tsx#L169), [`AnimatedSplashScreen.tsx#L42`](mobile/src/components/AnimatedSplashScreen.tsx#L42) (lines 42, 113, 120)
  - **Problem:** Errors are only sent to `console.error`, so users get no feedback. `console.log` also ships in production code.
  - **Fix:** Show calm, empathetic messages (UI-03/04) and remove the console calls.

- [ ] **T10.6 · Audit every screen for placeholder data** — `Medium` `M2` `S`
  - **Fix:** Confirm Home, Wallet, Statement, Links, Search, Notifications and TransactionStatus render only API data, and that loading, empty and error states exist.
  - **Done when:** Grep for sample IDs, amounts and phone numbers in `mobile/src` returns nothing.

- [ ] **T10.7 · EAS project setup** — `High` `M3` `S`
  - **Fix:**
    - Run `eas init` to add `extra.eas.projectId` to `app.json`.
    - Confirm you own the bundle IDs (`com.croe.app`).
    - Turn on `autoIncrement` for the production profile and configure the EAS Update channel.
    - Set up submit profiles once the store accounts exist (PRODUCTION_TASKS `E1`–`E2`).

- [ ] **T10.8 · Store compliance** — `High` `M3` `M` (PRODUCTION_TASKS `E4`–`E5`)
  - **Fix:** Prepare the privacy policy URL, the Play Data Safety form, the App Store privacy labels, the iOS privacy manifest, the financial-services declaration, in-app account deletion (T8.7), screenshots, and a review demo account that works against staging.

- [ ] **T10.9 · Crash and error reporting** — `Medium` `M3` `S`
  - **Fix:** Add Sentry (free tier) or EAS Insights. Scrub personal data from reports.

- [ ] **T10.10 · Interim custody disclosure** — `High` `M3` `S` (PRODUCTION_TASKS `G4`)
  - **Fix:** Add calm, clear copy on the pay screen and in the Help Centre explaining who holds the funds during P1. Wording to be approved by the lawyer.

- [ ] **T10.11 · Release-build smoke test on real devices** — `Medium` `M3` `M`
  - **Fix:** Test on a low-end Android phone on a 3G network, and on an iPhone, against staging, covering the vendor create-and-share flow, the buyer pay flow, the dispute flow, and KYC.

- [ ] **T10.12 · Mobile client lacks certificate pinning** — `High` `M2` `M`
  - **Where:** [`mobile/src/api/client.ts#L38`](mobile/src/api/client.ts#L38) (lines 38–49)
  - **Problem:** On public Wi-Fi or compromised networks, TLS can be MITM'd. No pinning means the app trusts any valid cert for the domain.
  - **Fix:** Implement certificate pinning via `expo-netinfo` or native module. Pin SHA-256 of production cert's SPKI.
  - **Done when:** MITM proxy test fails on pinned build; test confirms pinning works.

- [ ] **T10.13 · Device ID fallback persists across reinstalls** — `Low` `M2` `S`
  - **Where:** [`mobile/src/api/client.ts#L62`](mobile/src/api/client.ts#L62) (lines 62–71)
  - **Problem:** Fallback device ID persists across app reinstalls if SecureStore isn't cleared. Could link pre- and post-reinstall activity.
  - **Fix:** Rotate fallback ID on first launch after reinstall (detect via missing keychain item) or bind to app install ID.
  - **Done when:** Reinstall test shows new device ID generated.

- [ ] **T10.14 · LLM call has no request/response size limits** — `Low` `M2` `S`
  - **Where:** [`backend/src/config/llm.ts#L50`](backend/src/config/llm.ts#L50) (lines 50–62)
  - **Problem:** No limit on `userMessage` size or `response` size. A malicious dispute claim could cause OOM or excessive token costs.
  - **Fix:** Enforce max input tokens (truncate claim); set `num_predict` cap; enforce response size limit.
  - **Done when:** Test shows oversized claim is truncated; response capped.

---

## 11. Admin console

- [ ] **T11.1 · Remove the random "odds" from the dispute queue** — `High` `M2` `S`
  - **Where:** [`admin/src/app/disputes/queue/page.tsx#L158`](admin/src/app/disputes/queue/page.tsx#L158)
  - **Problem:** `Math.random()` generates the displayed odds. Reviewers could act on made-up signals.
  - **Fix:** Show the real `ai_confidence_score` (or nothing when the AI is off).

- [ ] **T11.2 · Audit admin pages for static data** — `Medium` `M2` `S`
  - **Fix:** Check every widget on the dashboard, disputes, fraud, KYC, ledger, metrics and reconciliation pages. Each must be backed by an API call, with loading and error states.

- [ ] **T11.3 · Require a reason for every staff action** — `Medium` `M2` `S` **(verify)**
  - **Fix:** `resolveDispute`, `retryPayout`, KYC approve/reject, and any unfreeze (T4.14) must require a reason and write an audited record with the staff member's `actor_id`.

- [ ] **T11.4 · Put the admin console behind network access control** — `Medium` `M2` `S`
  - **Fix:** Add Cloudflare Access (free for small teams) or an IP allowlist in front of the admin origin. This is defense in depth on top of T7.4.

- [ ] **T11.5 · Admin console tokens in localStorage (XSS risk)** — `Medium` `M2` `M`
  - **Where:** [`admin/src/lib/api.ts#L69`](admin/src/lib/api.ts#L69) (lines 69–76)
  - **Problem:** Tokens live in `localStorage` plus cookies set from JavaScript. Any XSS on the admin console steals a money-moving session.
  - **Fix:** Have the backend set `HttpOnly`, `Secure`, `SameSite=Strict` cookies. If that has to wait, at minimum add a strict CSP on the admin console.
  - **Done when:** `document.cookie` and `localStorage` contain no tokens.

- [ ] *(T3.4 API URL, T1.2 mock login, T7.4 2FA, T7.5 token storage also apply to the admin console.)*

---

## 12. Reconciliation and finance operations

- [ ] **T12.1 · Match line by line against Paystack statements** — `High` `M2` `L`
  - **Problem:** Comparing balances alone hides offsetting errors.
  - **Fix:** Pull Paystack transactions and transfers for the reconciliation window, and match each to a ledger entry by reference. Report unmatched items on both sides.
  - **Done when:** A staging report on test keys lists 0 unmatched items.

- [ ] **T12.2 · Commission sweep: ledger entries and procedure** — `Medium` `M3` `M`
  - **Fix:** Define how Croe's revenue moves from the pool to the operating account, recorded with ledger entries so reconciliation's "unswept revenue" figure stays correct. Assign a bookkeeping owner (PRODUCTION_TASKS `F7`).

- [ ] **T12.3 · Daily manual reconciliation review during the pilot** — `High` `M3` `S` — *Owner: Ops* (PRODUCTION_TASKS `G5`)
  - **Fix:** Every day for 30 days, a named person reviews the report and signs it off in Production_manual §10.

---

## 13. Observability and alerting

- [ ] **T13.1 · Ship logs off-box** — `High` `M2` `S` (PRODUCTION_TASKS `C7`)
  - **Fix:** Send Pino JSON to Better Stack or Grafana Loki (free tier, COST-01), searchable by correlation ID. Confirm no personal data or secrets are logged ([`log-sanitizer.ts`](backend/src/utils/log-sanitizer.ts)).

- [ ] **T13.2 · Connect and test the alert channel** — `High` `M2` `S`
  - **Fix:** Point `ALERT_WEBHOOK_URL` ([`alerting.ts`](backend/src/services/alerting.ts)) at the on-call channel, then fire a test alert from staging.

- [ ] **T13.3 · External uptime monitor** — `High` `M2` `S`
  - **Fix:** Monitor `/health` every minute from outside Render (free tier), and alert after 2 minutes down.

- [ ] **T13.4 · Alert rules** — `Medium` `M2` `M`
  - **Fix:** Add alerts for:
    - Reconciliation anomalies.
    - `PAYOUT_FAILED`.
    - Unprocessed webhook inbox rows older than 5 minutes.
    - A 5xx rate above 1% over 5 minutes.
    - `FUNDS_SECURED` more than 10 minutes after `charge.success`.
    - Ledger integrity failures.
    - Scheduled job failures.
    - The payout freeze being set.
  - Map each to the severities in Production_manual §3.4.

- [ ] **T13.5 · Backend error tracking** — `Medium` `M2` `S`
  - **Fix:** Add Sentry (free tier) with personal-data scrubbing, tagged with the correlation ID.

- [ ] **T13.6 · Metrics scraping** — `Low` `M3` `S`
  - **Problem:** `/admin/metrics` requires an admin JWT.
  - **Fix:** Add a scrape token or push metrics instead.

---

## 14. Infrastructure provisioning

> This maps to Production_manual §1.2 and PRODUCTION_TASKS `C1`–`C8`. Staging (T3.8) comes first, then production.

- [ ] **T14.1 · Managed Postgres 16 with PITR** — `High` `M2` `S` (`C1`)
  - **Problem:** [`render.yaml#L55`](render.yaml#L55) uses the free plan, which has no point-in-time recovery or backups.
  - **Fix:** Use a paid plan with PITR and 30-day retention.

- [ ] **T14.2 · Managed Redis 7.2 with persistence** — `High` `M2` `S` (`C2`)
  - **Problem:** [`render.yaml#L48`](render.yaml#L48) uses the free plan, which has no persistence.

- [ ] **T14.3 · Object storage, failing closed** — `High` `M2` `S` (`C3`)
  - **Where:** [`evidence.ts#L171`](backend/src/services/evidence.ts#L171), [`#L165`](backend/src/services/evidence.ts#L165)
  - **Problem:** Without S3 credentials, the evidence upload is **silently skipped** and a key is still recorded. The default bucket name is hard-coded.
  - **Fix:**
    - Set up R2 buckets: evidence (private, versioned) and KYC (private, stricter access, encrypted).
    - In production, a missing storage config must throw.
    - Remove the hard-coded bucket default.

- [ ] **T14.4 · Run the pilot without the LLM, and document it** — `Low` `M2` `S` (`C4`)
  - **Fix:** Leave `LLM_MODEL` unset, so every dispute goes to `ESCALATE_HUMAN` ([`llm.ts#L33`](backend/src/config/llm.ts#L33)). Before enabling AI later, replace the placeholder evidence text at [`ai-triage.ts#L157`](backend/src/services/ai-triage.ts#L157) with real evidence captions (AI-01/AI-04).

- [ ] **T14.5 · DNS, TLS and CDN** — `High` `M2` `S` (`C5`)
  - **Fix:** Put Cloudflare in front of the API and admin, with auto-renewing certificates. Update the `trust proxy` hop count (T7.1).

- [ ] **T14.6 · Choose the hosting region** — `Low` `M2` `S`
  - **Fix:** Pick the Render region with the lowest latency to Ghana and to Paystack, and record the choice.

---

## 15. Backups and disaster recovery

- [ ] **T15.1 · Rehearse a PITR restore** — `High` `M3` `M` (`C8`)
  - **Fix:** Restore production-like data into a scratch database, time it, and record the actual RTO and RPO in Production_manual §5.2. Then repeat monthly.

- [ ] **T15.2 · Evidence bucket versioning and lifecycle rules** — `Medium` `M3` `S`

- [ ] **T15.3 · Rehearse a rollback** — `Medium` `M3` `S`
  - **Fix:** On staging, deploy → roll back to the previous image. Follow Production_manual §2.5, and never roll back a ledger-writing migration.

- [ ] **T15.4 · Tabletop the incident runbooks** — `Medium` `M3` `S` (PRODUCTION_TASKS `F15`)
  - **Fix:** Walk through money loss, reconciliation mismatch and breach (Production_manual §4) with the named role owners.

---

## 16. Verification and testing

- [ ] **T16.1 · Paystack test-mode end-to-end run** — `Blocker` `M2` `M`
  - **Fix:** On staging with test keys and real webhooks, run these three scenarios and record the evidence in Production_manual §1.4 #1:
    - **Release:** create → deposit (real charge flow) → `FUNDS_SECURED` → ship → confirm → release → `transfer.success` → `FUNDS_RELEASED`, with reconciliation at 0.00.
    - **Refund:** dispute → reviewer refund → `FUNDS_REFUNDED`.
    - **Auto-release:** an elapsed dispute window.
  - **Done when:** All three are documented with ledger extracts and Paystack dashboard screenshots.

- [ ] **T16.2 · Regression test for every Blocker** — `Blocker` `M2` `M`
  - **Fix:** Every `Blocker` above gets a test that fails on today's code and passes after the fix: deposit takeover, self-refund, `X-Forwarded-For` spoofing, a ledger UPDATE being blocked, admin login on migrations only, webhook failure recovery, net payout amount, and so on.

- [ ] **T16.3 · Seven clean days of reconciliation on staging** — `High` `M2` `S` (Production_manual §6.1)
  - **Fix:** This needs T6.3 and T4.10–T4.11 first. Run and log daily results.

- [ ] **T16.4 · Run the 50-webhook race test on staging infrastructure** — `Medium` `M2` `S`
  - **Fix:** The same race test that runs in CI, but against the managed Postgres and Redis.

- [ ] **T16.5 · k6 load test** — `Medium` `M3` `M`
  - **Fix:** Test at 10× the expected pilot peak. Confirm the webhook ACK p99 stays under 500 ms (WH-04) and the API p99 under 1 s.

- [ ] **T16.6 · User acceptance test with friendly vendors** — `High` `M3` `M`
  - **Fix:** 3–5 pilot vendors (from PRODUCTION_TASKS `B9`) run real flows in test mode. Collect friction notes and fix the top issues.

- [ ] *(Penetration test: see T7.10.)*

---

## 17. Documentation corrections (PROC-03)

- [ ] **T17.1 · Correct Production_manual.md** — `High` `M1` `S`
  - **Fix:**
    - §1.1: items 1, 2 and 6 claim no stubs and 285 passing tests. Untick them and link here.
    - §1.4 #1 is ticked but still says it needs a live sandbox test.
    - §2.1 step 7: the grant check versus the actual migration (T7.2).
    - §2.1 step 10: "275 tests".
    - §3.1: health endpoints that don't exist (T3.10).
    - §4.2: the automated freeze that doesn't exist (T4.14).

- [ ] **T17.2 · Correct PRODUCTION_READINESS_PLAN.md and PRODUCTION_TASKS.md** — `Medium` `M1` `S`
  - **Fix:** "Code ✅ Complete … zero mocks", `CQ1`/`CQ5` ("already passing"), and `C6` ticked as "Running" are all inaccurate today.

- [ ] **T17.3 · Correct AGENTS.md** — `Medium` `M1` `S`
  - **Fix:** In §13, fix the test counts, "Remote: None configured", and the stale "next step is to begin Phase 1". In §2, change Node 20 to Node 22 (T2.1). Add a pointer to this file.

- [ ] **T17.4 · Update Progress.md** — `Low` `M1` `S`
  - **Fix:** Record this audit and link to this file.

---

## 18. Business, legal and operations gates (tracked in PRODUCTION_TASKS.md)

These are **not** engineering tasks, but M3 cannot happen without them. Status lives in [`PRODUCTION_TASKS.md`](PRODUCTION_TASKS.md) and is **not duplicated here**.

| Gate | IDs in PRODUCTION_TASKS.md | Why engineering cares |
|------|-----------------------------|-----------------------|
| Aggregator permits the escrow model in writing | `A1`–`A3`, `A6` | Decides whether §4 targets Paystack at all. Add the T4.9 questions to the emails. |
| Lawyer engaged, company registered | `A4`, `A5`, `B1` | Needed for Paystack live keys, store accounts and the sender ID. |
| Data Protection Commission registration, ToS, Privacy Policy | `B2`–`B4` | Store listings (T10.8), consent capture (T8.4). |
| KYC thresholds, retention, FIC process | `B5`–`B8` | T8.1, T8.5, T8.6 need these values. |
| Pilot vendors recruited | `B9` | T16.6. |
| Apple, Google and sender ID accounts | `E1`–`E3` | T10.7–T10.8, T9.4. |
| Landing page and company email domain | `E6` | T3.11. |
| Named role owners and SOPs | `F1`–`F16` | T12.3, T15.4. Somebody has to act on every alert in §13. |
| Pilot gates and metrics | `G1`–`G13` | Final go/no-go. |

**Questions to add to the Paystack email (A1):**

1. Can funds stay in our balance for up to N days? How do we turn off automatic settlement?
2. Can API transfers run without the transfer OTP?
3. Which Ghana mobile-money networks are supported for charges and for transfers?
4. What are the fees per charge and per transfer, and are they deducted from the balance?
5. What are your published webhook IPs?
6. What are the per-transaction and daily limits?

---

## 19. Launch gates

### M1 · Sandbox staging live

- [ ] §1: T1.1, T1.2, T1.3, T1.4, T1.5
- [ ] §2: T2.1, T2.2, T2.3, T2.4, T2.5
- [ ] §3: T3.1–T3.12
- [ ] T6.3 (sandbox webhooks), T6.7 (webhook dead letter), T7.1 (trust proxy), T7.3 (password_hash migration), T7.9, T7.21 (CORS validation)
- [ ] §17: T17.1–T17.4
- [ ] **Evidence:** CI green on `main`; staging `/health` returns 200; staff login works on staging; one full P0 lifecycle completed by hand on staging.

### M2 · Real-money code-ready

- [ ] Every task tagged `M2` in §2 and §4–§16 is done
- [ ] Every `Blocker` has a regression test (T16.2)
- [ ] Paystack test-mode end-to-end run documented (T16.1)
- [ ] 7 clean reconciliation days on staging (T16.3)
- [ ] Paystack account configuration confirmed in writing (T4.9)
- [ ] **New security tasks:** T4.16, T4.17, T5.1, T5.2, T5.3, T6.1, T6.2, T6.4, T6.7, T7.2, T7.6, T7.8, T7.11, T7.12, T7.13, T7.14, T7.15, T7.16, T7.17, T7.18, T7.19, T7.20, T8.1, T8.2, T8.3, T10.1, T10.2, T10.3, T10.4, T10.12, T11.5
- [ ] **Evidence:** links recorded in Production_manual §1.1 and §1.4.

### M3 · Supervised P1 pilot live

- [ ] Every task tagged `M3` in this file is done
- [ ] PRODUCTION_TASKS.md Phases A–F complete; G1–G4 satisfied
- [ ] Production_manual §6.1 (P0 → P1) fully ticked
- [ ] Penetration test closed (T7.10)
- [ ] `CUSTODY_PHASE=P1` set in production **only after** everything above is ticked
- [ ] **New security tasks:** T7.7, T10.9, T10.10, T10.11, T10.13, T10.14
- [ ] **Evidence:** a go/no-go note, dated and signed off, in Production_manual §10.

---

## Appendix A · CI failure breakdown (run `36207266482`, `main` @ `d17ec01`)

| # | Test | Error | Diagnosis | Task |
|---|------|-------|-----------|------|
| 1 | `api.e2e` › Escrow & Webhook Full Lifecycle | expected `AWAITING_DEPOSIT` to be `FUNDS_SECURED` | **Real bug:** sandbox webhooks have no `event` field, so the route ignores them | T6.3 |
| 2 | `api.e2e` › Disputes API › open + fetch | expected 201, got 409 | Knock-on from #1 (the escrow never gets funded) | T6.3 |
| 3 | `kyc.integration` › allows transaction within tier 0 cap | `MoneyFormatError: "0"` | **Real bug:** `COALESCE(...,'0')` | T8.1 |
| 4 | `kyc.integration` › allows tier 1 up to 5000 | `MoneyFormatError: "0"` | **Real bug:** same as #3 | T8.1 |
| 5 | `ai-triage.integration` › mock LLM → UNDER_HUMAN_REVIEW | expected `null` to be `mock-p0` | CI sets `LLM_MODEL=test`, so a real fetch is attempted | T2.2 |
| 6 | `money.test` › calculateFees large amount | `RangeError` | Test drift: the correct overflow guard now fires | T2.2 |
| 7 | `money.test` › sumAmounts large numbers | `RangeError` | Test drift: same as #6 | T2.2 |
| 8 | `reconciliation.test` › ledger summary | `undefined.totalDeposited` | Test drift: the result moved to `perCurrency[]` | T2.2 |
| 9 | `reconciliation.test` › discrepancy | message text mismatch | Test drift: the anomaly wording changed | T2.2 |

Separately: **Verify Docker Builds** fails with `ERR_UNKNOWN_BUILTIN_MODULE: node:sqlite` (T2.1).

---

## Appendix B · Environment variable matrix (production API)

| Variable | Required in prod | In `render.yaml` today | Notes |
|----------|------------------|------------------------|-------|
| `NODE_ENV` | yes | ✅ `production` | |
| `PORT` | yes | ✅ `8080` | |
| `DATABASE_URL` | yes | ✅ from database | Use the least-privilege runtime role (T7.2) |
| `REDIS_URL` | yes | ✅ from service | Needs a persistent plan (T14.2) |
| `CUSTODY_PHASE` | yes | ⚠️ hard-coded `P1` | Keep `P0` until M2; validate the value (T3.7) |
| `JWT_SECRET` | yes | manual | At least 32 random bytes; different per environment |
| `OTP_PEPPER` | yes | manual | At least 32 random bytes |
| `MOMO_WEBHOOK_SECRET` | yes | manual | **Must equal the Paystack secret key** (T7.8) |
| `AGGREGATOR_API_KEY` | yes (P1+) | manual | Paystack secret key; test key on staging |
| `AGGREGATOR_BASE_URL` | yes (P1+) | manual | `https://api.paystack.co` |
| `ARKESEL_SMS_API_KEY` | yes (P1+) | ❌ missing | T3.6 |
| `S3_BUCKET` / `S3_ENDPOINT` / `S3_ACCESS_KEY` / `S3_SECRET_KEY` | yes | manual | Uploads must fail closed without them (T14.3) |
| `S3_REGION` | yes | ❌ missing | `auto` for R2 |
| `CORS_ORIGIN` | yes | manual | Must include the admin origin |
| `ALERT_WEBHOOK_URL` | yes | ❌ missing | T13.2 |
| `COMMISSION_BPS` / `BUYER_PROTECTION_FEE_BPS` | yes (explicit) | ❌ missing | Defaults of 250/150 apply silently. Decision in T4.5 |
| `LLM_URL` / `LLM_MODEL` | no (pilot) | ❌ missing | Leave unset for the pilot, so disputes go to human review (T14.4) |
| `RATE_LIMIT_*` | no | ❌ | Currently ignored by the code (T3.12) |
| `RETENTION_*` | yes (explicit) | ❌ | Values from legal (T8.6) |
| **Admin:** `NEXT_PUBLIC_API_URL` | yes | ⚠️ wrong value | Host only, no `/v1` (T3.4). Baked in at build time |
| **Mobile:** `EXPO_PUBLIC_API_URL` | yes | ✅ `eas.json` | Domain must match T3.11 |

---

## Appendix C · Task summary

| Severity | M1 | M2 | M3 | Total |
|----------|----|----|----|-------|
| Blocker | 11 | 21 | 0 | 32 |
| High | 9 | 38 | 9 | 56 |
| Medium | 7 | 22 | 14 | 43 |
| Low | 5 | 4 | 6 | 15 |
| **Total** | **32** | **85** | **29** | **146** |

*Counts exclude the business gates in §18, which are tracked in PRODUCTION_TASKS.md.*

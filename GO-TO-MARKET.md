# Croe — Go-To-Market & Business Operations

> **Living document.** This is the single source of truth for everything required to take Croe from a finished codebase to a **trading business in Ghana**. It is the business-side companion to [`Production_manual.md`](Production_manual.md): that manual answers *"is the system ready to run?"*, this one answers *"is the company ready to sell?"*. Both must be green before real money moves.
>
> **This is not legal, tax, or financial advice.** Every figure and requirement marked **[verify]** must be confirmed with a Ghanaian fintech lawyer, the relevant regulator, or the counterparty in writing before it is relied upon. Same discipline as [`02-Market-and-Regulatory.md`](for_agents/02-Market-and-Regulatory.md).
>
> **Update rule (mirrors PROC-03):** when a business fact changes — an aggregator quotes a real fee, a lawyer confirms a `[verify]`, a vendor churns, a policy is written — update this file in the same commit as any related change. Never "later".

---

## How to Use This Document

1. **Section 1 is a hard gate.** Do not spend money or time on anything else until it is answered.
2. **Sections 2 and 3 run in parallel** — external (market-facing) and internal (company-facing). Both are required; internal is the one founders underestimate.
3. **Section 4 is the sequence.** Work it in order; the slow items are started first deliberately.
4. **Section 5 defines pilot success.** Do not scale, market, or raise on anything less.
5. **Section 8 is the log.** Date-stamp every business decision, the way §10 of the production manual logs incidents.
6. **Section 10 is the budget.** Every figure in it is an **estimate awaiting a real quote** — replace each one as quotes arrive, and recompute break-even when you do.
7. **Section 11 is the funding pipeline.** Deadline-driven. Check it monthly — several sources run a single annual cycle, and missing one costs a year.

**Current position (as of 2026-08-01):** code complete at custody phase **P0** (sandbox), 275 backend + 79 frontend tests passing. Infrastructure §1.2 and Compliance §1.5 of the production manual are **0/11 and 0/9**. Nothing on this document is done.

---

## 1. The Gating Question — Answer This First

> **Everything downstream depends on one unanswered question: will an aggregator let us run this model at all?**

Croe's P1 plan ([`02-Market-and-Regulatory.md`](for_agents/02-Market-and-Regulatory.md) §3) assumes funds settle into a Croe-controlled account and are disbursed later. **Escrow and holding third-party funds sit on the restricted- or prohibited-business list for most payment aggregators**, or trigger enhanced due diligence at minimum **[verify per aggregator]**. If the answer is no, **P1 does not exist** and the path jumps straight to hunting a licensed P2 partner — a 3–9 month process **[verify]**, not a 3-week one.

Ask **all three** aggregators, in writing, before anything else:

| # | Question to the aggregator | Paystack GH | Hubtel | Flutterwave |
|---|---|---|---|---|
| 1 | Can a merchant account be used for a delayed-settlement / escrow model? Is escrow a restricted business? | [ ] | [ ] | [ ] |
| 2 | Do you offer split payments, sub-accounts, or a native hold-and-release product? | [ ] | [ ] | [ ] |
| 3 | What is the settlement cycle to our bank account (T+0/T+1/T+2)? Does it change for this model? | [ ] | [ ] | [ ] |
| 4 | Live **collection** fee — %, cap, and per-transaction minimum | [ ] | [ ] | [ ] |
| 5 | Live **payout / disbursement** fee — flat or %, and any minimum | [ ] | [ ] | [ ] |
| 6 | Monthly minimums, volume commitments, or setup fees | [ ] | [ ] | [ ] |
| 7 | KYB documents required to approve a live account | [ ] | [ ] | [ ] |
| 8 | Payout API availability for MoMo B2C (MTN / Telecel / AirtelTigo) | [ ] | [ ] | [ ] |
| 9 | Sandbox → live promotion timeline once documents are submitted | [ ] | [ ] | [ ] |

**Why this is first:** answers to Q4 and Q5 also decide whether the unit economics in [`03-Business-Model-and-Costs.md`](for_agents/03-Business-Model-and-Costs.md) §3 survive. Published pricing (Sep 2026) is **1.95% MoMo collection** and **GHS 1.00 per MoMo payout** (Paystack; Hubtel 1.95%, min GHS 0.30). At those rates a 2% commission loses GHS 4–7 per order, so the model now prices at **4% all-in** (2.5% vendor + 1.5% buyer): GHS 10.33 net on a GHS 800 order ([`pitch/FINANCIAL-MODEL.md`](pitch/FINANCIAL-MODEL.md) §2–3). Q4 and Q5 still need written confirmation, including any volume discount. A flat payout minimum can still invert small transactions.

**Outcome to record here:**

| Field | Value |
|---|---|
| Date asked | _—_ |
| Aggregator selected | _—_ |
| Escrow model permitted? | _—_ |
| Confirmed collection fee | _—_ |
| Confirmed payout fee | _—_ |
| Settlement cycle | _—_ |
| Resulting net margin per 450.00 GHS transaction | _—_ |
| **P1 viable?** | _—_ |

---

## 2. External Track — Market-Facing

### 2.1 Legal Entity & Regulatory Foundation

> **Blocking.** No aggregator, bank, or app store onboards an individual for a payments product. Start the slow items immediately — they run in the background while other work proceeds.

| # | Item | Why required | Status | Notes |
|---|------|--------------|--------|-------|
| 1 | **Limited company registered** at the Office of the Registrar of Companies | Aggregator KYB, bank account, app store publishing all require a legal entity. A sole proprietorship will not clear payments compliance. Cost: low hundreds of GHS **[verify]** | [ ] | |
| 2 | **GRA Tax Identification Number (TIN)** | Prerequisite for company registration and aggregator KYB | [ ] | |
| 3 | **Corporate bank account opened** | Settlement destination for the float at P1. Banks are the slowest item — 2–4 weeks typical **[verify]** | [ ] | |
| 4 | **Data Protection Commission registration** (Act 843) | Croe captures IP, device IDs, government-ID images, and evidence media — it is a data controller. Registration is a legal obligation and is routinely skipped. See [`02-Market-and-Regulatory.md`](for_agents/02-Market-and-Regulatory.md) §5 | [ ] | |
| 5 | **Ghanaian fintech lawyer engaged** | Confirm BoG category (likely **PFTSP** per §3 of doc 02 **[verify]**), resolve every `[verify]` in docs 02/03/09, structure the P2 partner agreement | [ ] | Highest-value spend on this list |
| 6 | **BoG registration category confirmed** and, if required, application filed | Determines whether P1 is defensible and what P2 requires | [ ] | Depends on #5 |
| 7 | **Terms of Service published** | Blocks app store review and aggregator onboarding; is the legal shield when a dispute goes bad | [ ] | See warning below |
| 8 | **Privacy Policy published** | Act 843 requirement + app store requirement | [ ] | |
| 9 | **KYC thresholds confirmed** against BoG/partner rules | All tier caps in [`09-KYC-and-AML.md`](for_agents/09-KYC-and-AML.md) §2 are `[verify]` placeholders | [ ] | |
| 10 | **Record-retention duration confirmed** | Drives ledger and evidence retention policy | [ ] | |
| 11 | **FIC suspicious-activity reporting process confirmed** | v1 is manual via L3; the filing process itself is `[verify]` | [ ] | |

> **The Terms of Service is not boilerplate.** It must explicitly define: **who bears the loss when the AI arbitrator adjudicates wrongly**; what "delivery confirmed" means as a legal act; the auto-release timer as a contractual term; Croe's liability cap; and the disclosure that at P1 funds are held under an interim arrangement, not a BoG licence. This document decides whether a bad dispute becomes a lawsuit. It cannot be a template.

### 2.2 Money Rails & Treasury

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Aggregator live account approved and funded | [ ] | Mirrors `Production_manual.md` §1.5.3 |
| 2 | Live API keys provisioned and stored in the secret store (not sandbox) | [ ] | `Production_manual.md` §1.3 |
| 3 | MoMo payout (B2C) tested end-to-end on all three networks with real cedis | [ ] | Small amounts, own numbers |
| 4 | **Working capital float sized and reserved** | [ ] | See below — missing from doc 03 |
| 5 | **Loss reserve established** (wrong adjudications, eaten fraud, goodwill refunds) | [ ] | Start at 1–2% of GMV **[verify against actuals]** |
| 6 | **Commission sweep process defined and scheduled** | [ ] | Doc 06 §2 says commission "stays in the pool and is swept separately" — a human must run, book, and reconcile that sweep |
| 7 | Reconciliation operator assigned and daily schedule active | [ ] | Cross-ref §3.1 below |

> **Working capital is an unmodelled cost.** [`03-Business-Model-and-Costs.md`](for_agents/03-Business-Model-and-Costs.md) does not account for settlement lag. If the aggregator settles to Croe at T+2 but Croe releases to a vendor on delivery confirmation at T+0, **Croe fronts the difference**. At 100 transactions/week averaging 450.00 GHS, the float requirement is five figures in GHS. Two options: (a) delay vendor payout to match the settlement cycle — worse product, weaker pitch; or (b) hold real working capital. **Decide this explicitly and record it in §7.**

### 2.3 Distribution & Channel

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | **Apple Developer Program account** under the registered company | [ ] | Apple scrutinises financial apps; the publishing entity is generally expected to be the legal entity providing the service **[verify]**. An individual account risks rejection |
| 2 | **Google Play Developer account** under the registered company | [ ] | Play has a financial-services declaration flow **[verify]** |
| 3 | First app store submissions passed review | [ ] | Budget 2–6 weeks with back-and-forth for a first financial app **[verify]** |
| 4 | **SMS sender ID registered** | [ ] | Hard launch dependency — every money event in [`15-Notifications.md`](for_agents/15-Notifications.md) §3 sends SMS. Registration via the SMS aggregator / NCA takes days to weeks **[verify]** |
| 5 | FCM (Android) + APNs (iOS) push configured against production bundle IDs | [ ] | |
| 6 | Production domain + landing page live | [ ] | Aggregator and app store reviewers both check this |
| 7 | Company email domain (not Gmail) | [ ] | Aggregator and bank compliance will notice |
| 8 | **Buyer web-payment fallback decision** | [ ] | See below — highest-leverage open question |

> **The buyer install barrier is the largest conversion risk in the product.** Croe's shape is: a vendor shares a link in WhatsApp, a stranger clicks it. If that stranger must install a React Native app before they can pay, most of them will not. Confirm whether the current [`19-Frontend-React-Native.md`](for_agents/19-Frontend-React-Native.md) architecture supports a browser-based buyer payment flow, and if not, decide whether that is a pre-launch requirement. **Measure buyer drop-off at the payment step during the pilot regardless** (§5).

### 2.4 Commercial & Go-To-Market

**The shape is forced by the product: escrow has zero value with one side only.** Buyers will not seek Croe out. Acquisition is **B2B2C** — recruit vendors, vendors impose Croe on their buyers.

#### Target segment

Categories where scam fear already kills sales, and order values are high enough for 2% to be worth collecting:

| Segment | Why it fits | Priority |
|---|---|---|
| Phone / electronics resellers | High ticket, high scam rate, buyers routinely ghost at "send the MoMo first" | 1 |
| Sneakers & streetwear resellers | High ticket, Instagram-native, counterfeiting disputes | 1 |
| Thrift / okrika sellers | Volume, strong trust deficit, rider delivery | 2 |
| Hair, wigs, beauty | High ticket, condition disputes, repeat vendors | 2 |
| Low-ticket repeat local sellers | **Anti-target** — customers already trust them, 2% not worth it | — |

#### Positioning

**Pitch conversion, not safety.** The vendor's alternative is free and instant (direct MoMo). Croe asks them to pay a commission *and* wait for settlement. The only argument that wins is: **"you will close the sales you are currently losing."** One vendor proving that with real numbers becomes the entire sales deck.

#### Commercial decisions to make

| # | Decision | Current default | Status |
|---|---|---|---|
| 1 | Fee level | **4.0% all-in modelled** (3.5% floor, 5% halves break-even) — [`pitch/FINANCIAL-MODEL.md`](pitch/FINANCIAL-MODEL.md) §2 | [ ] |
| 2 | **Who pays** | **Split modelled:** 2.5% vendor + 1.5% buyer protection fee | [ ] — **test in pilot; see below** |
| 3 | Minimum transaction size | Undefined | [ ] — needed if payout fees are flat |
| 4 | Floor fee on small transactions | Undefined | [ ] |
| 5 | Vendor payout timing (T+0 vs. match settlement) | Undefined | [ ] — ties to working capital, §2.2 |

> **Revisit vendor-pays.** [`03-Business-Model-and-Costs.md`](for_agents/03-Business-Model-and-Costs.md) §1 defaults to vendor-pays on the logic that the vendor gains guaranteed settlement. But the **buyer** carries the fear, and the **vendor** is the party being recruited. Making Croe free to the vendor and charging the buyer removes the acquisition friction entirely. Doc 03 already states this is configurable per market. The model now uses a split (2.5% vendor + 1.5% buyer), because 2% vendor-only loses money. **Test buyer acceptance of the 1.5% fee during the pilot** (fallback: 4% vendor-only) and record the outcome here.

#### Vendor acquisition checklist

| # | Item | Status |
|---|------|--------|
| 1 | 10–20 pilot vendors hand-recruited **before** go-live | [ ] |
| 2 | WhatsApp group with all pilot vendors, founder present daily | [ ] |
| 3 | Vendor onboarding one-pager (what Croe is, what it costs, how they get paid) | [ ] |
| 4 | Vendor acceptance criteria written (§3.2) — categories refused | [ ] |
| 5 | Referral mechanic defined (vendors recruit vendors) | [ ] |

---

## 3. Internal Track — The Company Behind the App

> **The moment real money flows, Croe stops being a software project and becomes a money-operations business.** This section is the part most commonly underestimated.

### 3.1 Operational Roles

The architecture has humans in the loop **by design**. Until there is a hire, every seat below is the founder.

| Function | What it actually is | Frequency / trigger | Owner |
|---|---|---|---|
| **L3 dispute reviewer** | Adjudicating money disputes the LLM confidence gate does not clear ([`13-Disputes-and-AI-Triage.md`](for_agents/13-Disputes-and-AI-Triage.md)). Real decisions, real money, angry people | Per dispute — assume 3–8% of transactions **[verify against pilot]** | _[fill in]_ |
| **KYC approver** | Manual review of Ghana Card / passport images via the admin console — [`09-KYC-and-AML.md`](for_agents/09-KYC-and-AML.md) §3 states v1 is manual | Per tier upgrade; SLA-sensitive (blocks the user's money) | _[fill in]_ |
| **Reconciliation operator** | Reads the daily report and acts. `Production_manual.md` §4.2 makes a mismatch a **P1 incident that freezes disbursements** | Daily, 7 days/week | _[fill in]_ |
| **Payout failure handler** | Failed MoMo disbursements need manual retry plus a customer conversation | Ad hoc, urgent | _[fill in]_ |
| **Support** | "Where is my money" — the highest-anxiety support category that exists | Continuous | _[fill in]_ |
| **On-call engineer** | Money-loss incidents do not wait for business hours (`Production_manual.md` §4.1) | 24/7 in principle | _[fill in]_ |
| **Commission sweep / bookkeeping** | Weekly sweep, booking, and reconciliation of Croe revenue out of the pool | Weekly | _[fill in]_ |

**Staffing trigger — decide the number before hitting it:**

| Monthly released transactions | Realistic ops load | Staffing |
|---|---|---|
| ~250 (stage 1 pilot, month 6) | A few hours a day | Founder + part-time ops (budgeted in §10.2) |
| ~300 | ~10–25 disputes + KYC + daily recon + support | Founder is saturated |
| ~1,000 | ~30–80 disputes/month + everything else | **Full-time role. Hire before this, not after** |

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Hiring trigger volume decided and written down | [ ] | |
| 2 | Second trusted person with admin console access + RBAC role | [ ] | So reconciliation and disputes do not stop when the founder sleeps or is ill |
| 3 | At least one person trained on every runbook | [ ] | `Production_manual.md` §11.12 |
| 4 | `Production_manual.md` §9 Operational Contacts filled in | [ ] | Currently all `[fill in]` |

### 3.2 Operating Documents To Author

`Production_manual.md` §7 covers **technical** runbooks. These **business** SOPs do not exist yet and are required before real money moves:

| # | Document | Why it matters | Status |
|---|---|---|---|
| 1 | **Dispute adjudication policy** | The written rules an L3 reviewer applies, so decisions are consistent, defensible, and not vibes. Doubles as ground truth for the LLM prompt and as ToS backing | [ ] |
| 2 | **KYC review SOP** | What makes an ID acceptable, grounds for rejection, how to spot duplicate/multi-account IDs (doc 09 §5) | [ ] |
| 3 | **Refund & goodwill policy** | When Croe eats a loss to save a relationship, and who may authorise it | [ ] |
| 4 | **Vendor onboarding & acceptance criteria** | Which vendors are accepted; which categories are refused outright | [ ] |
| 5 | **Fraud response playbook** | Response to vendor/buyer collusion rings, structuring near tier caps (doc 09 §4), and `FRAUD_LOCKOUT` handling | [ ] |
| 6 | **Escalation ladder & contact tree** | Who is called, in what order, for a money-loss or reconciliation incident | [ ] |
| 7 | **Support macros / response templates** | Consistent, calm copy for the top 10 support questions — tone per [`20-Design-System.md`](for_agents/20-Design-System.md) | [ ] |

### 3.3 Financial Operations

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Bookkeeping in place from transaction one | [ ] | |
| 2 | **Float and revenue accounted separately** | [ ] | **Critical.** Money in the pooled account is not Croe's; only swept commission is. Commingling them is how escrow businesses fail |
| 3 | VAT / GRA obligations assessed and registered as required | [ ] | **[verify thresholds]** |
| 4 | Monthly P&L against the break-even model in doc 03 §5 | [ ] | |
| 5 | `Production_manual.md` §8 Cost Tracking populated with real figures | [ ] | Currently an empty template |
| 6 | Runway and burn tracked | [ ] | |

### 3.4 Infrastructure & Security

> Owned by [`Production_manual.md`](Production_manual.md) — not duplicated here. Status as of writing: **§1.2 Infrastructure 0/11, §1.3 Secrets 0/12.**

Two items on that list are business-critical, not merely technical:

| # | Item | Why it is a business risk | Status |
|---|------|---------------------------|--------|
| 1 | **Automated Postgres backups with PITR** (`Production_manual.md` §1.2.9, §5) | The append-only `transaction_ledger` **is** the accounting record of who owns what inside the pool (doc 06 §1, manual §5.3). Losing it is unrecoverable and unwinnable in a dispute | [ ] |
| 2 | **External penetration test** (`Production_manual.md` §1.4.11–12) | Croe handles other people's money. This is also the evidence a P2 partner will ask for | [ ] |

### 3.5 Corporate Governance

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Shareholding and vesting agreed **before** anyone else joins | [ ] | |
| 2 | IP assignment to the company | [ ] | Repository currently sits under a personal GitHub account |
| 3 | Founder/employee agreements | [ ] | |
| 4 | Company bank mandate and signatories | [ ] | |
| 5 | Board/advisor arrangements, if any | [ ] | |

---

## 4. Launch Sequence

> Slow items are started first deliberately. Weeks are relative to the start of execution, not calendar dates.

### Weeks 1–2 — Resolve the existential question

| # | Action | Status |
|---|--------|--------|
| 1 | Aggregator conversations — all three, §1 questionnaire, answers in writing | [ ] |
| 2 | Book fintech lawyer consultation | [ ] |
| 3 | Start ORC company registration + TIN (slow, cheap, run in background) | [ ] |
| 4 | Record the §1 outcome table — **is P1 viable?** | [ ] |

### Weeks 3–8 — Build the entity while paperwork moves

| # | Action | Status |
|---|--------|--------|
| 1 | Corporate bank account application | [ ] |
| 2 | Data Protection Commission registration | [ ] |
| 3 | Lawyer-drafted ToS + Privacy Policy | [ ] |
| 4 | Provision production infrastructure — `Production_manual.md` §1.2 to green | [ ] |
| 5 | All secrets into the platform secret store — §1.3 to green | [ ] |
| 6 | Write the dispute adjudication policy and KYC review SOP (§3.2) | [ ] |
| 7 | **Hand-recruit 10–20 pilot vendors now**, before go-live, so launch day has demand | [ ] |

### Weeks 6–10 — Distribution plumbing

| # | Action | Status |
|---|--------|--------|
| 1 | App Store + Play submissions under the company | [ ] |
| 2 | SMS sender ID registration | [ ] |
| 3 | Sandbox → live aggregator credentials | [ ] |
| 4 | External penetration test executed, findings closed | [ ] |
| 5 | Landing page + company email live | [ ] |

### Weeks 10–14 — Supervised P1 pilot

| # | Action | Status |
|---|--------|--------|
| 1 | `CUSTODY_PHASE=P1`; all P0→P1 gates in `Production_manual.md` §6.1 satisfied | [ ] |
| 2 | Transaction-size caps set low; volumes deliberately supervised (doc 02 §3) | [ ] |
| 3 | Interim custody arrangement disclosed to users in-app | [ ] |
| 4 | Reconciliation reviewed **manually, daily** for the first 30 days | [ ] |
| 5 | Every dispute personally adjudicated and the reasoning logged | [ ] |

### Month 4+ — P2, or stop

| # | Action | Status |
|---|--------|--------|
| 1 | Take real pilot numbers to a licensed bank / EPSP / DEMI partner | [ ] |
| 2 | Negotiate and sign the trust-account agreement | [ ] |
| 3 | Swap `CustodyProvider` via `CUSTODY_PHASE` config (no code change — doc 06 §3) | [ ] |
| 4 | 30 consecutive clean reconciliation days — `Production_manual.md` §6.2 | [ ] |

> **P1 is a stopwatch, not a resting state.** [`02-Market-and-Regulatory.md`](for_agents/02-Market-and-Regulatory.md) §3 calls it "interim/thin at scale". Keep volumes genuinely low, disclose the arrangement, and be moving toward P2 continuously. Pilot data is what makes a partner say yes.

---

## 5. Pilot Design & Success Metrics

**Design:** 10–20 hand-picked vendors. One WhatsApp group, founder present daily. Capped transaction sizes. 60 days minimum. **No paid marketing until this passes.**

**Primary bar:** buyers accept the 1.5% protection fee, and each order makes money after every variable cost. Company break-even (~62,000 orders/month, §10.5) is a stage 3 target, not a pilot target.

| Metric | Why it matters | Target | Actual |
|---|---|---|---|
| Released transactions / month | Demand signal on capped live rails | ≥ 250 by month 6 | _—_ |
| **Net margin per transaction (actual)** | Validates or kills [`pitch/FINANCIAL-MODEL.md`](pitch/FINANCIAL-MODEL.md) §3 | ≥ 10.00 GHS at measured order value | _—_ |
| Dispute rate (% of transactions) | Drives ops staffing and loss reserve | < 8% **[verify]** | _—_ |
| **Adjudication accuracy** (decisions not reversed on appeal) | The product's entire reputation | > 95% **[verify]** | _—_ |
| **Buyer drop-off at payment step** | Tests the install-barrier risk (§2.3) | < 30% **[verify]** | _—_ |
| Vendor retention (still trading at day 60) | Is the value real or novelty? | > 60% **[verify]** | _—_ |
| Transactions per active vendor / month | Determines how many vendors are needed to scale | ≥ 5 **[verify]** | _—_ |
| Reconciliation mismatches | Any non-zero is a P1 incident | 0 | _—_ |
| **Buyer drop-off with the 1.5% protection fee shown** (§2.4) | Settles the pricing decision with data | < 30% | _—_ |

---

## 6. Business Risk Register

| # | Risk | Impact | Mitigation | Owner |
|---|------|--------|------------|-------|
| 1 | **Aggregator refuses the escrow model** | Existential — P1 does not exist | §1, answered in week 1, before any spend | _[fill in]_ |
| 2 | **P1 is legally thin** — doc 02 §3 says so explicitly | Regulatory action; forced shutdown | Low supervised volumes, user disclosure, continuous movement toward P2 | _[fill in]_ |
| 3 | **Margin inverts** — real payout fees exceed the assumed ~1.00 GHS, or carry a flat minimum | Business is unviable at small ticket sizes | Price at 4% all-in (§10.7); confirm fees in writing (§1 Q4–5); set minimum transaction size / floor fee | _[fill in]_ |
| 4 | **Buyer install barrier** kills conversion | Vendors churn; product looks broken | Measure drop-off in pilot; decide on web fallback (§2.3) | _[fill in]_ |
| 5 | **Working capital gap** from settlement lag | Cash crunch; failed payouts; trust damage | Size the float (§2.2); or match payout timing to settlement | _[fill in]_ |
| 6 | **Ops load outruns the founder** | Slow disputes → the one thing that destroys an escrow brand | Hiring trigger set in advance (§3.1); second admin from day one | _[fill in]_ |
| 7 | **Wrong adjudication at scale** | Legal exposure; reputational collapse | Written adjudication policy (§3.2); loss reserve; ToS liability cap | _[fill in]_ |
| 8 | **Incumbent ships escrow as a feature** (Hubtel, Paystack) | Commoditised | Defensibility is the **vendor network and fairness reputation**, not the code — that is what the pilot is actually building | _[fill in]_ |
| 9 | Fraud ring exploits the pilot's low scrutiny | Direct money loss | Fraud playbook (§3.2); trust score ([`17-Trust-Score-and-Anti-Fraud.md`](for_agents/17-Trust-Score-and-Anti-Fraud.md)); caps | _[fill in]_ |
| 10 | Ledger loss or corruption | Unrecoverable; indefensible in dispute | PITR backups (§3.4) | _[fill in]_ |

---

## 7. Open Decisions

> Every row is a decision that must be made and recorded. Undecided items block the pilot.

| # | Decision | Options | Decided | Rationale |
|---|---|---|---|---|
| 1 | Which aggregator | Paystack GH / Hubtel / Flutterwave | [ ] | |
| 2 | Fee level | 3.5% – 5% all-in | [ ] | 4% modelled; 2% loses money (§10.7) |
| 3 | Who pays | Vendor / Buyer / Split | [ ] | Split modelled: 2.5% vendor + 1.5% buyer |
| 4 | Vendor payout timing | T+0 (float required) / match settlement | [ ] | |
| 5 | Minimum transaction size | — | [ ] | |
| 6 | Buyer web payment fallback | Required pre-launch / post-pilot | [ ] | |
| 7 | SMS provider | Hubtel / Twilio / other | [ ] | |
| 8 | Loss reserve % of GMV | — | [ ] | |
| 9 | Hiring trigger volume | — | [ ] | |
| 10 | Launch segment (first vertical) | Electronics / sneakers / thrift / beauty | [ ] | |
| 11 | Legal entity structure & shareholding | — | [ ] | |
| 12 | LLM hosting location (co-located vs. dedicated GPU box) | — | [ ] | Cost item, doc 03 §2 |

---

## 8. Business Decision Log

> Date-stamp every material business decision, quote received, regulatory answer, and pilot learning. Mirrors `Production_manual.md` §10 for the business side.

| Date | Type | Summary | Outcome | Source |
|------|------|---------|---------|--------|
| _—_ | _—_ | _No entries yet_ | | |

---

## 9. Definition of "Ready to Trade"

Croe is ready to take real money from real Ghanaian users when **all** of the following are true:

1. **Aggregator:** live account approved, escrow model explicitly permitted in writing, real fees confirmed (§1)
2. **Entity:** company registered, TIN issued, corporate bank account open (§2.1)
3. **Legal:** lawyer sign-off on the P1 custody arrangement; ToS + Privacy Policy published; DPC registration filed (§2.1)
4. **Regulatory:** BoG category confirmed; every `[verify]` in docs 02/03/09 resolved (§2.1)
5. **Treasury:** working capital float and loss reserve sized and reserved; commission sweep scheduled (§2.2)
6. **Distribution:** apps live in both stores under the company; SMS sender ID registered; push configured (§2.3)
7. **Demand:** 10–20 pilot vendors recruited and briefed **before** go-live (§2.4)
8. **Ops:** every role in §3.1 has a named owner; a second person holds admin access
9. **Policy:** all seven operating documents in §3.2 authored
10. **Finance:** books open, float and revenue separated, VAT position assessed (§3.3)
11. **System:** `Production_manual.md` §11 "100% Production Ready" fully satisfied — including §1.2, §1.3, and the pen test
12. **Custody:** all P0→P1 gates in `Production_manual.md` §6.1 checked

---

## 10. Budget & Cost Model

> **Rebuilt 25 Sep 2026 from published 2026 prices.** The full model is in [`pitch/FINANCIAL-MODEL.md`](pitch/FINANCIAL-MODEL.md), with line items, sources and sensitivity. An interactive version is at [Croe Capital Plan](https://claude.ai/artifact/9qnYtftuyXg6zwgfj1DtwR) (private until shared). This section is the operational view: what to spend, when, and where to record the real quote. Replace estimates with written quotes in the **Actual** columns and recompute. Recurring lines feed [`Production_manual.md`](Production_manual.md) §8.
>
> **FX: US$1 = GHS 11.60** (Sep 2026). Update when it moves materially; several lines are US$-priced.
>
> **What changed from the earlier budget:** it assumed fixed costs under GHS 500/month, no salaries, and a 2% commission netting GHS 8–23 per order. Published fees (1.95% MoMo collection, GHS 1.00 per payout) make 2% loss-making, and the BoG licensing pack requires a staffed management team. The pilot is still cheap; getting licensed is not.

### 10.1 One-Time Costs

| # | Item | Stage | Low (GHS) | Base (GHS) | High (GHS) | **Actual quote** | Notes |
|---|------|-------|-----------|------------|------------|------------------|-------|
| 1 | Company registration, stamp duty, company secretary | 1 | 1,100 | 3,000 | 5,000 | _—_ | ORC GHS 585 + 1% stamp duty on stated capital (fees effective 2 Feb 2026). Keep stated capital low |
| 2 | GRA TIN | 1 | 0 | 0 | 0 | _—_ | |
| 3 | Data Protection Commission registration | 1 | 1,000 | 2,000 | 4,000 | _—_ | Fee tiers by entity size **[verify]** |
| 4 | Trademark "Croe" | 1 | 0 | 3,000 | 6,000 | _—_ | BRAND-01 asset protection |
| 5 | Apple Developer (US$99/yr) + Google Play (US$25 once) | 1 | 1,440 | 1,440 | 1,440 | _—_ | |
| 6 | **Fintech lawyer:** custody opinion, ToS, privacy, vendor terms, sandbox/aggregator filings | 1 | 35,000 | 60,000 | 120,000 | _—_ | Highest-value spend in stage 1 |
| 7 | Pre-pilot security review (automated scan + light external test) | 1 | 0 | 12,000 | 35,000 | _—_ | Full pentest moves to stage 2 (#11) |
| 8 | Test devices (3 Android tiers + 1 iPhone) | 1 | 8,000 | 15,000 | 25,000 | _—_ | |
| 9 | BoG PFTSP licence fees | 2 | 30,000 | 30,000 | 30,000 | _—_ | GHS 10k processing + GHS 20k licence (BoG licensing pack; confirm current) |
| 10 | **Legal:** licence application, partner trust-account agreement, employment contracts, ESOP | 2 | 80,000 | 130,000 | 250,000 | _—_ | |
| 11 | **Penetration test:** web + API + iOS + Android, with retest | 2 | 70,000 | 140,000 | 300,000 | _—_ | US$6k–26k. BoG pack requires VA/pentest for every licence category. `Production_manual.md` §1.4.11 |
| 12 | ISO 27001 | 2 | 40,000 | 230,000 | 520,000 | _—_ | Low = gap assessment only. Listed for PFTSP "where applicable" **[verify]** |
| 13 | BoG-required policy set (ICT, BCP/DR, AML/CFT, risk) | 2 | 20,000 | 45,000 | 90,000 | _—_ | |
| 14 | Custody partner onboarding & integration | 2 | 10,000 | 40,000 | 100,000 | _—_ | |
| 15 | Laptops & equipment for stage 2 hires | 2 | 60,000 | 100,000 | 150,000 | _—_ | |
| 16 | Recruitment (compliance lead, senior engineers) | 2 | 20,000 | 60,000 | 120,000 | _—_ | |
| | **Stage 1 one-time total** | | **46,540** | **96,440** | **196,440** | _—_ | |
| | **Stage 2 one-time total** | | **330,000** | **775,000** | **1,560,000** | _—_ | |

Stage 3 one-time costs (ISO 27001 surveillance, annual pentests, equipment, recruitment: GHS 640k base) are itemised in [`pitch/FINANCIAL-MODEL.md`](pitch/FINANCIAL-MODEL.md) §6.

### 10.2 Monthly Recurring Cost

| # | Item | Stage 1 (GHS/mo) | Stage 2 (GHS/mo) | Stage 3 (GHS/mo) | **Actual** | Notes |
|---|------|------------------|------------------|------------------|-----------|-------|
| 1 | People, fully loaded | 14,500 | 136,000 | 290,000 avg (370,000 by month 36) | _—_ | Stage 1: founder stipends 10,000 + part-time ops 3,000 + bookkeeping 1,500. Stage 2: the five BoG key management roles, ~12 staff. SSNIT 13% employer + benefits ≈ 18% loaded |
| 2 | Infrastructure & software | 2,500 | 20,000 | 58,000 | _—_ | Stage 1: Render, AI triage on CPU or off. Stage 2: HA database + 1 GPU node (Hetzner GEX44, €184–234/mo). Stage 3: DR region + 2nd GPU node |
| 3 | Office / coworking | 1,500 | 15,000 | 35,000 | _—_ | |
| 4 | Vendor acquisition & marketing | 4,000 | 40,000 | 120,000 | _—_ | No paid marketing until the §5 pilot passes |
| 5 | Legal & compliance retainer | — | 10,000 | 15,000 | _—_ | |
| 6 | Insurance (professional indemnity, cyber, fidelity) | — | 5,000 | 10,000 | _—_ | Get quotes |
| 7 | External audit & tax filing | — | 3,500 | 6,000 | _—_ | BoG application requires named external auditors |
| 8 | Directors' fees | — | 3,000 | 8,000 | _—_ | Minimum 3 directors (Act 987) |
| 9 | Travel, data, admin, misc. | 2,000 | 6,000 | 15,000 | _—_ | |
| | **Monthly total (`F`)** | **24,500** | **238,500** | **557,000 avg · 637,000 at month 36** | _—_ | |

> Aggregator fees are **not** listed here. They are a per-order cost of goods and belong in the unit economics (§10.7 and [`pitch/FINANCIAL-MODEL.md`](pitch/FINANCIAL-MODEL.md) §3).

### 10.3 Working Capital & Reserves

Aggregators settle to Croe the next day (T+1). Most escrow orders are held longer than that while delivery happens. The float covers the exception: **same-day deliveries confirmed before settlement arrives**. The loss reserve covers wrong adjudications and fraud, and a custody partner may require one.

| At the end of | Basis | Low (GHS) | Base (GHS) | High (GHS) |
|---|---|---|---|---|
| Stage 1 · pilot | Loss reserve + small float | 10,000 | 30,000 | 60,000 |
| Stage 2 · ~5,000 orders/month | One day of order value (GHS 133k) + partner reserve | 50,000 | 233,000 | 467,000 |
| Stage 3 · ~30,000 orders/month | One day of order value (GHS 800k) + reserve | 300,000 | 1,100,000 | 1,900,000 |

The per-order fraud and loss reserve (0.3% of order value) is a running cost inside the unit economics. The amounts above are the ring-fenced balance.

| # | Decision | Status |
|---|----------|--------|
| 1 | Float sized for target pilot volume and reserved | [ ] |
| 2 | **Or** vendor payout timing matched to settlement cycle (removes the float, weakens the pitch). Ties to §7 decision 4 | [ ] |
| 3 | Loss reserve percentage set and funded | [ ] |

### 10.4 Capital Required by Stage

Net need = spend + 15% contingency + working capital − order income. The high case pairs top-of-range costs with half the base-case volume.

| Stage | Months | Low | Base | High |
|---|---|---|---|---|
| **1 · Legal pilot** | 1–6 | GHS 126k (US$11k) | **GHS 305k (US$26k)** | GHS 597k (US$51k) |
| **2 · Compliant launch** | 7–18 | GHS 2.07M (US$178k) | **GHS 4.18M (US$360k)** | GHS 7.68M (US$662k) |
| **3 · Scale** | 19–36 | GHS 5.13M (US$442k) | **GHS 10.63M (US$916k)** | GHS 20.93M (US$1.80M) |
| **Total** | 36 | GHS 7.32M (US$631k) | **GHS 15.11M (US$1.30M)** | GHS 29.21M (US$2.52M) |

**Pre-seed = stages 1–2: US$387k base** (US$189k–713k). **Seed ≈ US$916k** around month 15, on stage 2 data.

### 10.5 Break-Even Sensitivity

Released orders/month needed to cover the month-36 fixed cost of GHS 637,000/month. All-in fee = 1.5% buyer + the rest from the vendor.

| Average order | 3.0% fee | 3.5% fee | 4.0% fee | 4.5% fee | 5.0% fee |
|---|---|---|---|---|---|
| GHS 450 | not viable | not viable | 136,300 | 92,000 | 69,500 |
| GHS 800 | not viable | 100,600 | **61,700** | 44,500 | 34,800 |
| GHS 1,200 | 132,800 | 59,000 | 37,900 | 27,900 | 22,100 |
| GHS 2,000 | 65,500 | 32,300 | 21,400 | 16,000 | 12,800 |

**Break-even depends on price and ticket size far more than on infrastructure.** A GPU node is under 1% of the month-36 cost base. This reverses the earlier budget's conclusion, which only held while salaries were left out.

### 10.6 Cost Discipline Decisions

| # | Decision | Rationale | Status |
|---|----------|-----------|--------|
| 1 | **Run the pilot with AI triage off or CPU-only** | At 250 orders/month and a ~5% dispute rate, that's **≈12 disputes a month**. [`Production_manual.md`](Production_manual.md) §7.2 already routes disputes to `UNDER_HUMAN_REVIEW` when the LLM is unavailable. Adjudicate them personally; add the GPU node in stage 2, when disputes reach the hundreds | [ ] |
| 2 | Free/low tiers for hosting, storage and monitoring throughout P0/P1 | COST-01 in [`25-Engineering-Rules.md`](for_agents/25-Engineering-Rules.md). Apply for cloud credits (§11.2) | [ ] |
| 3 | Stage 1 gets a light security review; the full pentest happens in stage 2, before partner go-live | A P2 partner will ask for the pentest report. Defer it, don't cancel it | [ ] |
| 4 | Keep stated capital at registration low | Stamp duty is 1% of stated capital | [ ] |
| 5 | **No stage 2 hires before the stage 1 gate passes** | PROC-01 applies to spending too. Stage 2 payroll is ~45% of stage 2 spend (GHS 1.63M of 3.64M) | [ ] |

### 10.7 The Ticket-Size and Pricing Levers

Net per released order at 4% all-in (2.5% vendor + 1.5% buyer), after collection (1.95% of the amount collected), payout, fraud reserve, ID checks, refunds, SMS and hosting:

| Segment | Avg ticket (GHS) **[verify]** | Net per order (GHS) | Orders/mo to break-even | At a 5% fee |
|---|---|---|---|---|
| General social commerce | 450 | 4.67 | ~136,300 | ~69,500 |
| Base case (blended) | 800 | 10.33 | ~61,700 | ~34,800 |
| **Electronics / sneakers** | 1,200 | 16.80 | **~37,900** | ~22,100 |

Same product, same cost base: the lead segment needs **~40% less volume** than the blended base, and **~72% less** than general commerce. This is the quantitative case for the segment ranking in §2.4. Confirm real average ticket per segment during the pilot and update this table.

At the old 2% vendor-only price, **every row is negative** (GHS −4.19 to −6.83 per order).

### 10.8 What the Budget Actually Says

1. **The pilot is cheap; the licence is not.** Stage 1 costs about US$26k (GHS 305k), including founder stipends. Stages 1–2 together need about US$387k, mostly for people the Bank of Ghana requires.
2. **Price is the first decision, not the last.** At 2% every order loses money. 4% all-in is the working minimum. Whether buyers accept the 1.5% protection fee is the first thing the pilot tests.
3. **Spend in gates.** Nothing in stage 2 is committed until §1 returns a written yes and the stage 1 gate (§5) passes.
4. **Break-even needs scale:** about 62,000 orders/month at a GHS 800 average. The levers are price, ticket size and direct telco rails, not infrastructure.

---

## 11. Funding & Capital Strategy

> **Program names, amounts, eligibility, and deadlines change every cycle.** Every entry below is marked **[verify]** until confirmed on the source's own site. **Check deadlines first** — several run one annual cycle, and missing it costs a year.
>
> Capital requirements come from §10. This section is about where that capital comes from and in what order.

### 11.1 The Sequencing Principle

**Do not raise equity now.** At present: finished product, no entity, no users, no transactions, unanswered regulatory question. Raising in that position as a student founder in Ghana fintech means bad terms and slow conversations.

After the §10.4 validation sprint the position is: registered company, written aggregator answer, lawyer's read on custody, and 10–20 vendors with signed commitments and real ticket data. **That is a materially different conversation, and almost none of it costs money.**

| Rule | |
|---|---|
| **Now** | Apply to everything free and non-dilutive. Cost: time only |
| **After §1 returns yes + 10 vendor commitments** | Accelerators, thematic funds, partnership capital |
| **After 60-day pilot data (§5)** | Angels and pre-seed, on real numbers |
| **Never** | Equity raised to answer questions that cost GHS 0 to answer |

### 11.2 Immediate — Cloud Credits (do this week)

> **Highest return-on-effort item in this document.** Rolling applications, no deadline, largely self-serve.

| # | Program | Status | Credit awarded | Notes |
|---|---------|--------|----------------|-------|
| 1 | Microsoft for Startups Founders Hub | [ ] | _—_ | Self-serve, minimal gating **[verify]** |
| 2 | AWS Activate | [ ] | _—_ | Self-service tier available without accelerator referral **[verify]** |
| 3 | Google Cloud for Startups | [ ] | _—_ | |
| 4 | DigitalOcean Hatch | [ ] | _—_ | |

**Why it matters:** credits could cover most of the §10.2 infrastructure line (GHS 2,500/month in stage 1, GHS 20,000/month in stage 2), **including the GPU node for the LLM**. That's real cash, but it doesn't move break-even much; people and price do (§10.5). Record any award in §10.2 `Actual` and recompute `F`.

### 11.3 Non-Dilutive Pipeline — Grants & Competitions

| # | Source | Type | Indicative amount | Cycle / deadline | Status | Fit |
|---|--------|------|-------------------|------------------|--------|-----|
| 1 | **Hult Prize** | Student competition | Tiered; large grand prize | On-campus rounds **[verify]** | [ ] | ⭐ Student-specific. Most entrants have slides; Croe has a working product |
| 2 | **Tony Elumelu Foundation** | Grant + training | ~USD 5,000 non-dilutive **[verify]** | Typically opens early in the year **[verify]** | [ ] | ⭐ Pan-African, large cohort, genuinely accessible, no equity |
| 3 | **MEST Africa** (Accra) | Training + seed | Seed investment for selected teams **[verify]** | Annual cohort **[verify]** | [ ] | ⭐ Flagship Ghana option for this exact stage and geography |
| 4 | **University incubator / innovation centre** | Grant + intros | Small | Rolling **[verify]** | [ ] | ⭐ Cheapest capital available — **and eligibility expires at graduation** |
| 5 | **Catalyst Fund** (BFA Global) | Grant + technical assistance | Meaningful **[verify]** | **[verify]** | [ ] | ⭐ Thesis is *inclusive fintech in emerging markets* — Croe is on-thesis |
| 6 | **NEIP** | Gov. seed + incubation | **[verify]** | **[verify]** | [ ] | Explicitly youth-targeted |
| 7 | **Ghana Tech Lab** | Incubation / accelerator | **[verify]** | **[verify]** | [ ] | Accra-based |
| 8 | **Ghana Enterprises Agency** | SME/youth support | **[verify]** | **[verify]** | [ ] | |
| 9 | **Google for Startups Black Founders Fund / Africa** | Equity-free | **[verify]** | **[verify]** | [ ] | Has funded Ghanaian startups |

### 11.4 Accelerators — After Validation

| # | Program | Status | Notes |
|---|---------|--------|-------|
| 1 | Y Combinator | [ ] | Funds African fintech regularly; free to apply, good asymmetry. Long shot without traction |
| 2 | Startupbootcamp AfriTech | [ ] | Fintech-focused |
| 3 | Antler | [ ] | Pre-seed, Africa programs |
| 4 | Norrsken | [ ] | Africa focus |
| 5 | Techstars | [ ] | Has run African programs **[verify current]** |

> Apply once vendor commitments exist (§2.4), not before.

### 11.5 Equity — Angels & Pre-Seed (after pilot data)

| # | Investor | Geography | Status | Notes |
|---|----------|-----------|--------|-------|
| 1 | Ghana Angel Investor Network (GAIN) | Ghana | [ ] | |
| 2 | Injaro Investments | Ghana | [ ] | |
| 3 | Ingressive Capital | West Africa pre-seed | [ ] | |
| 4 | Ventures Platform | Nigeria / West Africa | [ ] | |
| 5 | LoftyInc Capital | Pan-African | [ ] | |
| 6 | Oui Capital | West Africa | [ ] | |
| 7 | Future Africa | Nigeria | [ ] | |

> **Warm intros outperform cold outreach by a wide margin.** The realistic routes in are the university alumni network and whichever accelerator accepts you.

### 11.6 Strategic & Partnership Capital

| # | Counterparty | Why it is worth more than cash | Status |
|---|---|---|---|
| 1 | **Bank / EPSP / DEMI pilot sponsor** | Simultaneously solves the **P2 custody problem** (§4, doc 02 §3). A bank hunting fintech deal flow gets a compliant product; Croe gets the trust account it needs to be legal at scale | [ ] |
| 2 | **Aggregator builder/developer programme** | Raise this *inside* the §1 conversations — same meeting, two outcomes | [ ] |
| 3 | **MTN Ghana innovation programme** | Owns the rail Croe depends on **[verify current programmes]** | [ ] |

### 11.7 Non-Dilutive Alternative — Contract Revenue

Production TypeScript, PostgreSQL, payments, and infrastructure skills are directly sellable. **Roughly two months of contract work covers the entire recommended tier in §10.4 with zero dilution.** Evaluate this against any early equity offer before accepting the equity.

| # | Item | Status |
|---|------|--------|
| 1 | Contract-vs-dilution comparison made explicitly before accepting any equity money | [ ] |

### 11.8 Pitch Assets To Prepare

| # | Asset | Status | Notes |
|---|-------|--------|-------|
| 1 | One-page summary | [x] | [`pitch/ONE-PAGER.md`](pitch/ONE-PAGER.md) — 4% all-in pricing (2.5% vendor + 1.5% buyer), GHS 800 base / GHS 1,200 lead ticket, US$387k pre-seed ask |
| 2 | Deck (12 slides + appendix) | [x] | [`pitch/PITCH-DECK.md`](pitch/PITCH-DECK.md) — slide copy + speaker notes; slides 9 and 12 carry the rebuilt unit economics and staged ask |
| 3 | **Live demo on sandbox** | [ ] | The strongest asset — a working app, not a mockup |
| 4 | Due-diligence pack | [x] | **Already exists** — the `for_agents/` package, `Production_manual.md`, and this document |
| 5 | Vendor commitment letters | [x] template · [ ] collected | Template + WhatsApp version + portfolio tracker: [`pitch/VENDOR-COMMITMENT-LETTER.md`](pitch/VENDOR-COMMITMENT-LETTER.md). Records 2.5% commission acceptance and whether buyers would accept the 1.5% fee. |
| 6 | Unit economics reference | [x] | [`pitch/FINANCIAL-MODEL.md`](pitch/FINANCIAL-MODEL.md) — per-order economics, staged capital plan (low/base/high), break-even sensitivity, sources |
| 7 | Regulatory & custody brief | [x] | [`pitch/BANK-AND-PARTNER-BRIEF.md`](pitch/BANK-AND-PARTNER-BRIEF.md) — P0→P3 custody chain, trust account, compliance controls |
| 8 | Vendor onboarding flyer | [x] | [`pitch/VENDOR-ONE-PAGER.md`](pitch/VENDOR-ONE-PAGER.md) — High-conversion sales flyer for pilot merchants |

### 11.9 The Two Things That Decide the Outcome

**1. The asset almost no student applicant has.** Croe is not an idea — it is 354 passing tests, an append-only financial ledger, a 28-document specification package, and a written phased-compliance plan. **The `for_agents/` package is effectively a due-diligence pack.** Lead with the fact that it is built and tested.

**2. The failure mode that ends conversations instantly.** Anyone serious about African fintech knows Act 987. Saying "we hold funds in escrow" without an immediate licensing answer ends the meeting. **Croe already has the sophisticated answer — lead with the P0→P3 custody chain, not the tech stack.** It signals an understanding of the business that student founders are assumed to lack.

**3. Answer the commitment question before it is asked.** Every investor will wonder what a final-year student does after graduation. Have a direct, prepared answer.

### 11.10 Twelve-Month Capital Timeline

| When | Action | Expected outcome |
|---|---|---|
| **This week** | Cloud credits — all four (§11.2) | Infra + LLM line potentially zeroed |
| **Weeks 1–8** | Run the §10.4 sprint. Apply: Hult Prize, TEF, university incubator, MEST | Non-dilutive; entity + vendor commitments |
| **Weeks 8–16** | With §1 answered: Catalyst Fund, accelerators, bank partnership talks | Mostly non-dilutive |
| **Months 4–6** | 60-day pilot; collect §5 metrics | The only input that makes a real pre-seed conversation work |
| **Months 6–12** | Angels / pre-seed on actual GMV, dispute rate, vendor retention | Priced round on defensible terms |

### 11.11 Funding Application Log

> One row per application. Date-stamp everything.

| Date applied | Source | Amount sought | Outcome | Date resolved | Notes |
|---|---|---|---|---|---|
| _—_ | _—_ | _No entries yet_ | | | |

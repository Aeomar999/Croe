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

**Why this is first:** answers to Q4 and Q5 also decide whether the unit economics in [`03-Business-Model-and-Costs.md`](for_agents/03-Business-Model-and-Costs.md) §3 survive. The current ≈8.00 GHS net per transaction rests entirely on `[verify]` assumptions (1.5% collection, ~1.00 GHS payout). A higher payout fee or a flat payout minimum can invert the model on small transactions.

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
| 1 | Commission rate | 1.5–2.5% **[verify/decide]** — doc 03 §1 | [ ] |
| 2 | **Who pays the commission** | Vendor-pays | [ ] — **revisit; see below** |
| 3 | Minimum transaction size | Undefined | [ ] — needed if payout fees are flat |
| 4 | Floor fee on small transactions | Undefined | [ ] |
| 5 | Vendor payout timing (T+0 vs. match settlement) | Undefined | [ ] — ties to working capital, §2.2 |

> **Revisit vendor-pays.** [`03-Business-Model-and-Costs.md`](for_agents/03-Business-Model-and-Costs.md) §1 defaults to vendor-pays on the logic that the vendor gains guaranteed settlement. But the **buyer** carries the fear, and the **vendor** is the party being recruited. Making Croe free to the vendor and charging the buyer removes the acquisition friction entirely. Doc 03 already states this is configurable per market — **test both arms during the pilot** and record the outcome here.

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
| ~63 (break-even, doc 03 §5) | A few hours/week | Founder alone is fine |
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

**Primary bar:** clear the break-even of **≈63 released transactions/month** (doc 03 §5, recomputed once real fees are confirmed).

| Metric | Why it matters | Target | Actual |
|---|---|---|---|
| Released transactions / month | Break-even and demand signal | ≥ 63 **[recompute]** | _—_ |
| **Net margin per transaction (actual)** | Validates or kills doc 03 §3 | ≥ 8.00 GHS **[verify]** | _—_ |
| Dispute rate (% of transactions) | Drives ops staffing and loss reserve | < 8% **[verify]** | _—_ |
| **Adjudication accuracy** (decisions not reversed on appeal) | The product's entire reputation | > 95% **[verify]** | _—_ |
| **Buyer drop-off at payment step** | Tests the install-barrier risk (§2.3) | < 30% **[verify]** | _—_ |
| Vendor retention (still trading at day 60) | Is the value real or novelty? | > 60% **[verify]** | _—_ |
| Transactions per active vendor / month | Determines how many vendors are needed to scale | ≥ 5 **[verify]** | _—_ |
| Reconciliation mismatches | Any non-zero is a P1 incident | 0 | _—_ |
| Vendor-pays vs. buyer-pays conversion (§2.4) | Settles the pricing decision with data | — | _—_ |

---

## 6. Business Risk Register

| # | Risk | Impact | Mitigation | Owner |
|---|------|--------|------------|-------|
| 1 | **Aggregator refuses the escrow model** | Existential — P1 does not exist | §1, answered in week 1, before any spend | _[fill in]_ |
| 2 | **P1 is legally thin** — doc 02 §3 says so explicitly | Regulatory action; forced shutdown | Low supervised volumes, user disclosure, continuous movement toward P2 | _[fill in]_ |
| 3 | **Margin inverts** — real payout fees exceed the assumed ~1.00 GHS, or carry a flat minimum | Business is unviable at small ticket sizes | Confirm fees in writing (§1 Q4–5); set minimum transaction size / floor fee | _[fill in]_ |
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
| 2 | Commission rate | 1.5% – 2.5% | [ ] | |
| 3 | Who pays commission | Vendor / Buyer / Split | [ ] | |
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

> **Every figure in this section is an order-of-magnitude estimate, not a quote.** Treat all of them as `[verify]` until replaced with a written quote in the **Actual** column. Recurring lines feed [`Production_manual.md`](Production_manual.md) §8; unit economics feed [`03-Business-Model-and-Costs.md`](for_agents/03-Business-Model-and-Costs.md) §3 and §5.
>
> **Working FX assumption: ≈ GHS 12 = USD 1 [verify].** Update when it moves materially — several lines below are USD-denominated and will drift with it.

### 10.1 One-Time Setup Cost

| # | Item | Bootstrap (GHS) | Recommended (GHS) | **Actual quote** | Notes |
|---|------|-----------------|-------------------|------------------|-------|
| 1 | Company registration (ORC) | 300–800 (self-filed) | 2,000–4,000 (agent/lawyer) | _—_ | Keep **stated capital low** — stamp duty scales with it **[verify]** |
| 2 | GRA TIN | 0 | 0 | _—_ | |
| 3 | Data Protection Commission registration | 300–1,000 | 300–1,000 | _—_ | Fee tiers by entity size **[verify]** |
| 4 | **Fintech lawyer** | 5,000–15,000 (consult + review) | 25,000–70,000 (custody opinion + ToS + Privacy + partner structuring) | _—_ | Largest controllable line |
| 5 | **Penetration test** | defer as documented accepted risk | 20,000–90,000 | _—_ | USD 1.5k–7k; regional firms cheaper than global. `Production_manual.md` §1.4.11 |
| 6 | Apple Developer Program (USD 99/yr) | ~1,200 | ~1,200 | _—_ | |
| 7 | Google Play Developer (USD 25 once) | ~300 | ~300 | _—_ | |
| 8 | Trademark "Croe" | defer | 1,500–4,000 | _—_ | BRAND-01 asset protection |
| 9 | Bank account opening / minimum balance | 500–2,000 | 500–2,000 | _—_ | |
| 10 | Domain + TLS | ~200 | ~200 | _—_ | |
| | **Total** | **≈ 8,000–21,000** | **≈ 51,000–173,000** | _—_ | Items 4 + 5 are ~80% of the recommended figure |

### 10.2 Monthly Recurring Cost (Pilot Scale)

| # | Item | Lean (GHS/mo) | Realistic (GHS/mo) | **Actual** | Notes |
|---|------|---------------|--------------------|-----------|-------|
| 1 | App hosting | 150 | 400 | _—_ | |
| 2 | Managed Postgres | 0–200 | 300–600 | _—_ | |
| 3 | Managed Redis | 0–100 | 150–300 | _—_ | |
| 4 | Object storage (S3/R2) | 30 | 100 | _—_ | Evidence media; usage-based |
| 5 | **LLM hosting** | **0** (CPU/Ollama on app host) | **1,200–4,000** (GPU instance) | _—_ | **See §10.6 — largest recurring line** |
| 6 | SMS (OTP + notification matrix) | 30–150 | 150–600 | _—_ | ~6–10 SMS per completed transaction **[verify per-SMS rate]** |
| 7 | Monitoring / log aggregation | 0 (free tier) | 200–500 | _—_ | |
| 8 | Push, domain, misc | 50 | 100 | _—_ | Push is free |
| | **Monthly total (`F`)** | **≈ 260–680** | **≈ 2,600–6,600** | _—_ | Doc 03 §5 targets `F < 500` |

> Aggregator fees are **not** listed here — they are a per-transaction cost of goods, not fixed overhead (doc 03 §3). They belong in the unit economics, §10.4.

### 10.3 Working Capital & Reserves

> **Not modelled in doc 03.** If the aggregator settles at T+2 but Croe releases to the vendor at T+0, Croe fronts the difference. Assumes 450.00 GHS average ticket — recompute for the segment actually launched (§2.4).

| Monthly released transactions | Monthly GMV (GHS) | Float required (T+2, GHS) | Loss reserve @1–2% GMV (GHS/mo) |
|---|---|---|---|
| 63 (break-even) | 28,350 | ≈ 2,000–2,800 | 285–570 |
| 300 | 135,000 | ≈ 9,000–13,500 | 1,350–2,700 |
| 1,000 | 450,000 | ≈ 30,000–45,000 | 4,500–9,000 |

| # | Decision | Status |
|---|----------|--------|
| 1 | Float sized for target pilot volume and reserved | [ ] |
| 2 | **Or** vendor payout timing matched to settlement cycle (removes the float, weakens the pitch) — ties to §7.4 | [ ] |
| 3 | Loss reserve percentage set and funded | [ ] |

### 10.4 Cash Required To Reach a Supervised Pilot

| Tier | Setup + 3 months running + float | USD equiv. |
|---|---|---|
| **Bootstrap** — self-filed, lean infra, LLM off, pen test deferred | **≈ GHS 15,000–30,000** | ≈ $1,200–2,500 |
| **Recommended** — proper legal, pen test, real infra | **≈ GHS 60,000–185,000** | ≈ $5,000–15,000 |

### 10.5 Break-Even Sensitivity

Doc 03 §5: `break-even monthly transactions ≈ F / C`, where `C` ≈ 8.00 GHS net per transaction **[verify]**.

| Fixed monthly cost `F` (GHS) | Break-even transactions/month |
|---|---|
| 500 (doc 03 target) | 63 |
| 1,500 | 188 |
| 3,000 | 375 |
| 6,000 | 750 |

**Break-even is far more sensitive to infrastructure choices than to pricing.** Provisioning a GPU before it is needed multiplies the break-even by 6–12×.

### 10.6 Cost Discipline Decisions

| # | Decision | Rationale | Status |
|---|----------|-----------|--------|
| 1 | **Run the pilot with AI triage off or CPU-only** | At 63 txn/mo and a ~5% dispute rate that is **≈3 inferences per month**. A 24/7 GPU box for 3 inferences is indefensible. [`Production_manual.md`](Production_manual.md) §7.2 already specifies graceful degradation — disputes route to `UNDER_HUMAN_REVIEW`. Adjudicate them personally; enable the GPU when volume justifies it | [ ] |
| 2 | Free/low tiers for hosting, storage, and monitoring throughout P0/P1 | COST-01 in [`25-Engineering-Rules.md`](for_agents/25-Engineering-Rules.md) — never provision paid infra "to be safe" | [ ] |
| 3 | Defer trademark and pen test only if documented as accepted risk | Pen test is also evidence a P2 partner will ask for — defer, do not cancel | [ ] |
| 4 | Keep stated capital at registration low | Stamp duty scales with it **[verify]** | [ ] |

### 10.7 Payback — and the Ticket-Size Lever

At `C` ≈ 8.00 GHS net per transaction:

| Setup spend (GHS) | Transactions to repay | At 300 txn/mo |
|---|---|---|
| 20,000 (bootstrap) | 2,500 | ~8 months |
| 100,000 (recommended) | 12,500 | ~42 months |

**42 months is not a business.** Setup cost dwarfs per-transaction margin, which makes **average ticket size the most powerful lever available — more than the commission rate.**

| Segment | Avg ticket (GHS) **[verify]** | `C` net/txn (GHS) | Txn to repay 100,000 |
|---|---|---|---|
| General social commerce | 450 | ≈ 8 | 12,500 |
| Beauty / thrift | ~700 | ≈ 13 | ~7,700 |
| **Electronics / sneakers** | ~1,200 | ≈ 23 | **~4,350** |

Same product, same cost base, **~3× faster to profitability** — which is the quantitative case for the segment ranking in §2.4. Confirm real average ticket per segment during the pilot and update this table.

### 10.8 What the Budget Actually Says

1. **The money is not the hard part.** ≈ GHS 15,000–30,000 gets Croe legally trading. The binding constraints are the aggregator's answer (§1) and whether pilot vendors close sales they were previously losing (§5).
2. **Spend the minimum until both are answered.** Every line in §10.1 marked "defer" stays deferred until §1 returns a yes.
3. **Then the expensive items become mandatory, not optional** — lawyer and pen test are the price of handling other people's money at any scale worth having.

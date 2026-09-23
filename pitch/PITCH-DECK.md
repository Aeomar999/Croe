# Croe - Pitch Deck

> **Source content for the visual deck.** One `---` block per slide: headline, on-slide copy (keep it sparse), and speaker notes. Paste into Slides/Pitch/Canva and apply the brand below.
>
> **Every `[FILL: …]` is a number or fact you must supply before presenting.** Do not present a slide with a placeholder still on it, and never estimate a traction number - for a fintech, one invented figure destroys the whole conversation at diligence.
>
> **Brand** (from [`20-Design-System.md`](../for_agents/20-Design-System.md)): "calm over confrontation". Primary `#2563EB`, headline text `#1E293B`, body `#64748B`, surface `#F4F6F9`, card `#FFFFFF`, border `#E2E8F0`. Warm amber `#FEF3C7`/`#92400E` for caution states - **never red**. Font Inter or Outfit. 8pt spacing grid, 16px card radius. Generous whitespace; a crowded slide is off-brand.
>
> **Deck length:** slides 1–12 are the deck. The appendix is for questions, not for presenting.

---

## Slide 1 - Title

# Croe
### Escrow for social commerce, on Mobile Money.

**Founding Team** · **founders@croe.app** · **Accra, Ghana**

> **Speaker notes:** One sentence, then move. "Croe makes it safe to buy and sell on WhatsApp and Instagram in Ghana, by holding the buyer's Mobile Money until the goods actually arrive."

---

## Slide 2 - The Problem

# Every social commerce sale starts with a standoff.

> **"Send the money first."**
> **"No - send the goods first."**

Both are being rational. The sale dies in between.

> **Speaker notes:** This is the whole pitch in one image. Make it a chat screenshot mockup, not a bullet list - everyone in the room has been on one side of this exact conversation.
>
> Buyers get scammed with no recourse: no meaningful receipt, no arbiter, no route to a refund. Vendors lose orders they should have closed, and eat cash-on-delivery rejections and fake payment screenshots. Land the point that this is a *structural* failure, not bad luck - there is simply no trust layer on top of MoMo.

---

## Slide 3 - Why This Persists

# The rail works. The trust layer doesn't exist.

- **MoMo is universal** - MTN, Telecel, AirtelTigo. Everyone already has a wallet.
- **MoMo is final.** Once sent, it's gone. No chargeback, no dispute, no reversal.
- **Social commerce grew on top of it anyway** - and absorbed the fraud as a cost of doing business.

> **Speaker notes:** The insight: MoMo's finality is a *feature* for peer-to-peer transfers and a *catastrophe* for commerce between strangers. Card networks solved this decades ago with chargebacks. Mobile money never got that layer. That gap is the company.

---

## Slide 4 - The Solution

# Croe holds the money until the goods arrive.

| | |
|---|---|
| **1 · Link** | Vendor generates a payment link, shares it in the chat where the sale already is |
| **2 · Pay** | Buyer pays via the familiar MoMo USSD prompt. Funds lock in escrow |
| **3 · Ship** | Vendor ships against confirmed money, not a promise |
| **4 · Release** | Buyer confirms delivery → vendor paid automatically, less commission |

> **Speaker notes:** Emphasise zero behaviour change. No new app for the buyer to learn how to pay with, no new payment method, no moving the conversation off WhatsApp. The vendor sends a link instead of a MoMo number. That's the entire ask.
>
> Then the key line: **the vendor can see the money is secured but cannot touch it.** That's what makes them willing to ship, and it's what the buyer is paying for.

---

## Slide 5 - Product

# It's built. Not a prototype.

- Complete backend + React Native mobile app
- 14-state escrow machine · append-only financial ledger
- HMAC-verified webhooks · idempotency · tiered KYC
- Forensic evidence capture · AI dispute triage · admin console · daily reconciliation
- **354 automated tests passing** - including concurrent-webhook race, money-precision, and fraud tests
- Running end-to-end on aggregator sandbox

> **Speaker notes:** **Demo live if you have three minutes - it is the strongest thing in the room.** Most people pitching at this stage have a Figma file.
>
> If asked how a student built this: the answer is a 28-document written specification before any code, and a phase-gate rule that nothing advances until it's production-grade and tested. Offer the spec package as the diligence pack.

---

## Slide 6 - The Hard Part Nobody Solves

# Escrow is a regulated activity, not a feature.

Holding third-party funds falls under the **Bank of Ghana**, Payment Systems and Services Act 2019 (Act 987).

Most attempts do one of two things:
- **Ignore it** → shut down
- **Wait for a licence** → millions of GHS in capital, years of approval

**Croe never holds funds on its own account.** A licensed entity always holds the float.

> **Speaker notes:** ⚠️ **This slide decides the meeting.** Anyone serious about African fintech is already thinking "these people are running unlicensed custody." Answer it before they ask.
>
> Do not skip it to save time. The regulatory answer is the most differentiating thing about this company - far more than the app.

---

## Slide 7 - Phased Custody

# Compliance designed in, not retrofitted.

| Phase | Who holds the float |
|---|---|
| **P0** Build | Nobody - sandbox |
| **P1** Pilot | Aggregator settlement, low supervised volume |
| **P2** Partner-held | **Licensed bank / EPSP trust account** ← the real launch |
| **P3** Own licence | Croe, if volume ever justifies it |

**The code already abstracts this.** P1 → P2 is a configuration change, not a rewrite.

> **Speaker notes:** The `CustodyProvider` interface means escrow logic never changes when custody moves. That's an architecture decision made *because* of the regulatory reality, at spec time.
>
> This is also where you can note: a bank partner is both the compliance solution and a potential distribution partner. If you're pitching a bank or a fintech-adjacent fund, this slide is the ask.

---

## Slide 8 - Disputes

# Escrow only works if disputes resolve fairly and cheaply.

**Three tiers, in order:**

1. **Forensic evidence** - SHA-256 media hashing catches recycled scam photos; immutable audit trail
2. **Deterministic heuristics** - sub-second SQL tripwires for velocity fraud and Sybil attacks
3. **Self-hosted AI arbitrator** - structured decisions; escalates only genuinely ambiguous cases to a human

**Customer data never leaves our infrastructure.** Open-weights model, self-hosted.

> **Speaker notes:** The economic point: a support-heavy escrow product doesn't scale in a market with GHS 450 average orders - the margin can't carry a human reviewing every case. Automating tier 1 and 2 is what makes the unit economics work at all.
>
> The self-hosting point matters to anyone who asks about data protection under Act 843: no customer dispute evidence is sent to a third-party API.

---

## Slide 9 - Business Model & Unit Economics

# We earn only when a trade completes happily.

**2.0% commission** on each successfully released transaction.

- **No commission on refunds.** Buyer made whole → we earn GHS 0.
- Vendor-pays by default (deducted from settlement payout); buyer-pays/split testable in pilot.

| Segment | Avg Order Value (AOV) | Gross Commission (2%) | Net Margin / Txn | Monthly Txns to Break Even |
|---|---|---|---|---|
| **Lead Vertical: Electronics & Streetwear** | **GHS 1,200** | **GHS 24.00** | **≈ GHS 22.50 – 23.00** | **~22 txns/mo** |
| General Social Commerce | GHS 450 | GHS 9.00 | ≈ GHS 7.50 – 8.00 | ~63 txns/mo |

*Break-even volume modeled against target lean pilot fixed costs (< GHS 500/mo).*

> **Speaker notes:** The key insight here is average ticket size. At GHS 450 general retail, net margin is ~GHS 8.00, requiring 63 transactions to clear fixed costs. By leading with smartphones, laptops, and streetwear (~GHS 1,200 avg), our net margin triples to ~GHS 23.00 and break-even drops to just 22 transactions per month. That is why our go-to-market is laser-focused on high-ticket resellers.

---

## Slide 10 - Go To Market

# Vendors bring their own buyers.

**Escrow has no value with one side only** - so we recruit vendors, and vendors impose Croe on their buyers.

**Launch segment: High-ticket, high-fear categories**
1. **Phone & Electronics resellers** (GHS 1,000–3,500 tickets): buyers routinely ghost at "send the MoMo first".
2. **Sneakers & Streetwear resellers** (GHS 600–1,800 tickets): Instagram-native, counterfeiting fears, high return rates.
3. **Curated Thrift & Okrika boutiques** (GHS 400–900 tickets): high volume, intercity dispatch via dispatch riders.

**The pitch to a vendor is conversion, not security:**
> *"You will close the 25% of qualified buyers who ghost your MoMo details."*

> **Speaker notes:** Vendor-led B2B2C is the only acquisition model that works here - buyers will never search an app store for an escrow app.
>
> The segment choice is deliberate and quantified: a vendor selling low-ticket goods to repeat local customers already has trust and does not need us. A vendor closing GHS 1,200 phone sales to strangers loses deals every single week to the trust standoff.

---

## Slide 11 - Traction & Validation Plan

# Pre-launch. Here is what we are proving, and when.

**Current Status:** Product complete & tested (354 automated tests) · Cohort of 10–20 pilot vendors in recruitment · Entity formation & licensed-custody arrangement in progress.

**60-Day Supervised Pilot Targets:**

| Metric | Target | Why It Matters |
|---|---|---|
| **Released Transactions / Mo** | **≥ 63 txns** | Clears the base break-even hurdle on real volume |
| **Dispute Rate** | **< 8%** (ideal 3–5%) | Validates low operational load and fraud resistance |
| **Adjudication Accuracy** | **> 95%** | Proves the 3-tier dispute triage resolves conflicts fairly |
| **Buyer Checkout Drop-off** | **< 30%** | Proves mobile web/USSD payment flow removes friction |
| **60-Day Vendor Retention** | **> 60%** | Demonstrates sustainable business utility, not novelty |
| **Reconciliation Mismatches** | **0** | Strict 3-way match across ledger, provider, and bank |

> **Speaker notes:** ⚠️ **Be straightforwardly honest here - we are pre-revenue.** In fintech, a single invented traction number ends the conversation at diligence.
>
> The strength of this slide is that we know exactly what we are testing and why. We are validating that high-ticket vendors recover lost sales, dispute rates stay below 8%, and unit economics deliver net profitability from transaction one.

---

## Slide 12 - The Ask: Dual-Track Pilot Funding

# Funding a 60-day supervised pilot on licensed rails.

We have structured two distinct funding tracks based on partner & capital stage:

| Category | Track A: Lean Bootstrap | Track B: Institutional / Accelerated |
|---|---|---|
| **Total Funding Needed** | **GHS 30,000 (~$2,500 USD)** | **GHS 150,000 (~$12,500 USD)** |
| **Entity & Regulatory** | ORC company registration, TIN, DPC filing | Track A + formal fintech legal counsel (BoG PFTSP opinion & custody structuring) |
| **Security Audit** | Internal audit & automated test suite | External professional penetration test |
| **Working Float & Reserves** | T+2 settlement float (GHS 3k) | Float (GHS 10k) + funded 2% GMV loss reserve |
| **Infrastructure & Run** | Lean CPU infra & SMS for 3 months | High-availability cloud infra + 6 months runway |
| **Milestone Achieved** | First 100+ live transactions, measured conversion & dispute rate | Full de-risking for P2 partner bank onboarding & accelerator entry (MEST, YC) |

**Founding Team** · **founders@croe.app** · **Accra, Ghana**

> **Speaker notes:** Tie the number to the milestone, never to a runway period. Track A gets us to first live transactions on compliant rails with verified unit economics for under $2,500. Track B fully de-risks our regulatory and institutional bank-partner requirements for institutional pre-seed funds.
>
> An itemized, granular budget breakdown exists in `FINANCIAL-MODEL.md` and `GO-TO-MARKET.md` §10.

---
---

# Appendix - for questions, not for presenting

---

## A1 - Why a student built this

28 written specification documents before any code. A phase-gate rule: no phase advances until it is production-grade, complete, and tested. Eight phases, each on its own branch, each merged only after its gate passed.

**The specification package is the due-diligence pack** - architecture, data model, threat model, testing strategy, and regulatory analysis, all written down. Offer it.

---

## A2 - Technical depth

- **Money:** `NUMERIC(15,2)` throughout; no floats anywhere near a balance. Explicit currency on every amount
- **Ledger:** append-only, `UPDATE`/`DELETE` revoked at the database role level. It is the authoritative sub-ledger of who owns what inside the pooled float
- **Concurrency:** `SELECT … FOR UPDATE` before every money mutation; partial unique indexes make double-deposit and double-payout structurally impossible
- **Webhooks:** raw-body HMAC verification, 300-second replay window, Redis fast-gate plus durable inbox for idempotency
- **Ordering rule:** pay first, then ledger. The negative ledger entry is written only after the provider confirms success - a failed payout leaves the balance intact and retriable
- **Reconciliation:** daily three-way match (provider balance / sub-ledger sum / statement). Any mismatch freezes disbursements and pages

---

## A3 - Risks, stated plainly

| Risk | Response |
|---|---|
| **Aggregator restricts escrow models** | Being confirmed in writing before spend. If restricted, we go directly to a licensed partner |
| **P1 is legally thin at scale** | Deliberately so - low supervised volumes, disclosed to users, with P2 as the fast follow. It is a stopwatch, not a resting state |
| **Thin margin per transaction** | Segment choice targets 3× average ticket. Minimum transaction size under consideration |
| **Incumbent ships escrow as a feature** | Defensibility is the vendor network and a reputation for fair adjudication - not the code |
| **Ops load as volume grows** | Automated tiers 1–2 handle the bulk; staffing trigger volume defined in advance |
| **Wrong adjudication** | Written adjudication policy, loss reserve, and appeal path |

> **Speaker notes:** Volunteering risks with responses reads as competence, not weakness - especially from a young founder, where the unspoken question is always "do they know what they don't know."

---

## A4 - Expansion

Payment rails and currency sit behind abstractions from day one. **Kenya (M-Pesa) and Nigeria are additional `PaymentRail` implementations, not rebuilds.** Each new market repeats the custody-phase evaluation; the escrow logic never changes.

---

## A5 - Likely questions

| Question | Short answer |
|---|---|
| *"Isn't this unlicensed money transmission?"* | Slides 6–7. We never hold funds on our own account; a licensed entity always holds the float |
| *"What stops the buyer confirming delivery and then lying?"* | Dispute window, forensic evidence, hashed media, trust scoring, and an auto-release timer so funds never sit forever |
| *"Why would a vendor pay 2% and wait?"* | Because they currently lose the sale entirely. We're testing buyer-pays in the pilot too |
| *"Why won't MTN/Paystack/Hubtel just build this?"* | They might. The moat is the vendor network and adjudication reputation - and a partnership is a good outcome, not a bad one |
| *"You're a final-year student - is this full time?"* | **[FILL: your genuine answer. Prepare it. You will be asked every single time]** |
| *"What happens if you get a dispute wrong?"* | Written policy, appeal path, loss reserve, and a liability cap in the terms of service |

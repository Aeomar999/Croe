# Croe — Business Model & Cost Realities (`03-Business-Model-and-Costs.md`)

> All money is `NUMERIC(15,2)`. Fees below are **published 2026 prices** (Paystack, Hubtel) unless marked **[verify]**. Confirm each in writing before go-live. Custody phases per [`26-Glossary.md`](26-Glossary.md). The full investor model, with line items, low/base/high ranges and sources, is [`pitch/FINANCIAL-MODEL.md`](../pitch/FINANCIAL-MODEL.md) (rebuilt 25 Sep 2026; FX US$1 = GHS 11.60). This doc is the engineering-facing summary.

## 1. Revenue Model

Croe charges a **fee of 4.0% all-in** on each successfully released transaction, split across both parties:

- **Commission: 2.5%** of the escrow amount, paid by the vendor and deducted at `FUNDS_RELEASED`.
- **Buyer protection fee: 1.5%** of the escrow amount, paid by the buyer and added to the amount collected at deposit.
- **No fees on refunds.** A `FUNDS_REFUNDED` transaction earns Croe nothing, and the buyer protection fee is returned with the refund. Croe absorbs the collection and payout fees (modelled as refund leakage, §3).
- **Why not 2%:** MoMo collection costs **1.95% of the amount collected** and each MoMo payout **GHS 1.00**. At a 2% vendor-only commission the collection fee alone uses up 98% of the fee, and every order loses GHS 4–7 (§3).
- **Configurable per market.** Rate and split are config, not constants. If the pilot shows buyers reject the 1.5% fee, the fallback is a **4% vendor-only commission**. Record the decision in [`11-Payouts-Refunds.md`](11-Payouts-Refunds.md). **[decide after pilot]**
- **Future revenue lines (not v1):** premium vendor tiers, faster-payout fees, insurance/guarantee add-ons.

> **Implementation gap (must close before P1).** The backend currently hard-codes a **2% vendor-only** commission (`COMMISSION_RATE = 0.02` in `backend/src/services/escrow.ts`) and computes it with JS `number` arithmetic, which breaks FIN-01. There is no buyer protection fee yet. Before the pilot:
> - Make the rate and split config.
> - Compute both fees in decimal-string / `NUMERIC(15,2)` arithmetic.
> - Add the buyer protection fee to `collect()`, the ledger and receipts.
> - Update [`05-Data-Model.md`](05-Data-Model.md), [`06-Money-Custody-and-Settlement.md`](06-Money-Custody-and-Settlement.md) and [`11-Payouts-Refunds.md`](11-Payouts-Refunds.md) to match.

## 2. Cost Realities Per Custody Phase

The critical insight: **building cost almost nothing, and it's done. The real cost is becoming a regulated business that holds other people's money.** The Bank of Ghana licensing pack names five key management roles (CEO, Technology & Systems Manager, Compliance & Risk Manager, Finance Manager, AML Reporting Officer) and requires at least three directors. People are the largest cost from P2 onward.

Net capital needed per phase, including 15% contingency and working capital, less order income:

| Phase | What it costs | Net capital needed (base) | Range |
| :--- | :--- | :--- | :--- |
| **P0 — Build** | Sandbox keys, local Postgres/Redis, local LLM via Ollama | **≈ 0 GHS** (complete) | — |
| **P1 — Pilot** (stage 1, 6 months) | Company registration: GHS 585 + 1% stamp duty on stated capital. Fintech lawyer's custody opinion: GHS 35k–120k. DPC registration. Aggregator fees per order (§3). Founder stipends + part-time ops. Lean hosting with AI on CPU or off | **GHS 305k (≈ US$26k)** | GHS 126k – 597k |
| **P2 — Partner-held** (stage 2, 12 months) | BoG PFTSP licence: GHS 10k processing + GHS 20k licence **[verify current]**. Partner onboarding. Pentest (US$6k–26k). ISO 27001 (US$15k–45k; required for PFTSP? **[verify]**). The BoG management team (~12 staff). One day of order value as float | **GHS 4.18M (≈ US$360k)** | GHS 2.07M – 7.68M |
| **Scale** (stage 3, 18 months, still P2) | ~25 staff, DR region, 2 GPU nodes, vendor acquisition, annual pentests | **GHS 10.63M (≈ US$916k)** | GHS 5.13M – 20.93M |
| **P3 — Own licence** | Integrity capital: PSP Medium GHS 0.8M, Enhanced GHS 2M, DEMI GHS 20M, plus processing and licence fees. Capital is locked, not spent | Separate raise, volume-justified | — |

**Monthly fixed cost (base):** GHS 24,500 in stage 1 · GHS 238,500 in stage 2 · GHS 557,000 average in stage 3, reaching **GHS 637,000 at month 36**.

**Largest infrastructure lines:**
- **App hosting:** Render (web service US$25; Postgres from US$6; Key Value from US$10).
- **Dedicated GPU for the LLM:** Hetzner GEX44, €184–234/month per node, from stage 2.
- **Object storage:** evidence media (usage-based, small).
- **SMS:** GHS 0.025–0.08 per message by volume.

**Infrastructure is only about a tenth of fixed cost at every stage (8–10%).** Break-even isn't won there.

## 3. Unit Economics — Worked Example

Two orders at the new pricing: **GHS 800** (base-case blended average) and **GHS 1,200** (lead vertical: phones, electronics, sneakers). The vendor pays 2.5% and the buyer pays 1.5% on top.

| Line (GHS per released order) | GHS 800 order | GHS 1,200 order |
| :--- | ---: | ---: |
| Buyer pays into escrow (amount + 1.5%) | 812.00 | 1,218.00 |
| Croe gross fee (2.5% + 1.5%) | +32.00 | +48.00 |
| Aggregator collection fee (1.95% of the amount collected) | −15.83 | −23.75 |
| Fraud & loss reserve (0.3% of amount) | −2.40 | −3.60 |
| MoMo payout to vendor (flat) | −1.00 | −1.00 |
| ID verification, amortised **[verify]** | −1.00 | −1.00 |
| Refund leakage (5% of orders refunded) | −0.89 | −1.30 |
| SMS (~8 × GHS 0.04) | −0.35 | −0.35 |
| Hosting & AI, variable share | −0.20 | −0.20 |
| **Croe net per released order (`C`)** | **≈ 10.33** (1.29%) | **≈ 16.80** (1.40%) |
| **Vendor receives** (amount − 2.5%) | **780.00** | **1,170.00** |
| *At the old 2% vendor-only price* | *−5.42* | *−6.83* |

> The aggregator's collection fee is a **cost of goods**, not Croe revenue. Croe's true margin is `fee − collection − payout − reserve − ID checks − refund leakage − messaging − variable infra`.
>
> **The biggest assumption is ID checks at GHS 1.00 per order.** It holds only if buyers rely on the telco KYC already on their MoMo wallet and only vendors get a paid check (US$0.50–2.00 each). If every new buyer needs a paid check, `C` falls to ≈ GHS 3.60 on a GHS 800 order. **[verify with lawyer and partner]**

## 4. The Staged Path

1. **Build (P0):** done. Full working product on sandbox and local LLM.
2. **Legal pilot (P1, stage 1, ~US$26k):**
   - Register the company and get a written custody opinion.
   - Get the escrow model approved by an aggregator in writing, and apply to the BoG sandbox or sign a partner LOI.
   - Run ~500 capped, disclosed live orders.
   - **Gate:** buyers accept the 1.5% fee (< 30% drop-off), measured net ≥ GHS 10/order, disputes < 8%, zero reconciliation variance.
3. **Compliant launch (P2, stage 2, ~US$360k):** PFTSP licence, partner-bank trust account, BoG management team, pentest, ISO 27001; ~5,000 orders/month by month 18. This is when Croe becomes fully compliant and can scale.
4. **Scale (stage 3, ~US$916k):** ~30,000 orders/month by month 36.
5. **Own licence (P3):** only when volume justifies the integrity capital. Its payoff is direct telco collection at ~1% instead of 1.95% **[verify rate]**, which nearly doubles `C` (≈ GHS 18.45 on a GHS 800 order).

**Architectural payoff:** the `CustodyProvider` abstraction ([`06-Money-Custody-and-Settlement.md`](06-Money-Custody-and-Settlement.md)) means moving from P1 → P2 → P3 swaps one implementation without rewriting escrow logic.

## 5. Break-Even

Let `C` = Croe net per released order and `F` = monthly fixed cost. `Break-even monthly orders ≈ F / C`.

- **Company break-even:** at `F` = GHS 637,000 (month 36, fully staffed) and `C` = GHS 10.33, that's **≈ 61,700 released orders/month** (≈ GHS 49M order value/month).
- **Stage 1:** even at `F` = GHS 24,500, break-even is ≈ 2,400 orders/month, well above pilot volume. **Stages 1–3 are funded by capital, not by order income.** That's normal for a regulated payments business, but it must be said plainly.

| Average order | 3.5% fee | 4.0% fee | 5.0% fee |
| :--- | ---: | ---: | ---: |
| GHS 450 | not viable | 136,300 | 69,500 |
| GHS 800 | 100,600 | **61,700** | 34,800 |
| GHS 1,200 | 59,000 | 37,900 | 22,100 |

**Levers, in order of power:**
1. **Price:** 5% nearly halves break-even.
2. **Direct telco rails via P3:** ≈ 34,500 orders/month.
3. **Ticket size:** high-ticket vendors first.
4. **Not infrastructure:** a GPU node is under 1% of the month-36 cost base.

The earlier figure in this doc (`F` < 500 GHS, `C` ≈ 8.00, break-even ≈ 63 orders/month) left out every salary and the 1.95% collection fee. It is withdrawn.

## 6. Cost Discipline Rules (referenced by `25-Engineering-Rules.md`)

- Prefer free/local tooling in P0/P1 (local LLM, free-tier hosting). Never provision paid infra "to be safe." Run the pilot with AI triage on CPU or off; disputes route to `UNDER_HUMAN_REVIEW`.
- Every real-money feature states its custody phase, so cost is never incurred before it's needed.
- Don't hire stage 2 roles before the stage 1 gate passes (PROC-01 applies to spending too).
- Aggregator and partner fees are published prices until confirmed **in writing** for Croe's account. Fee rates are **config, never hard-coded constants** in revenue logic, and are computed in `NUMERIC(15,2)` (FIN-01).

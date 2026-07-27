# Croe — Business Model & Cost Realities (`03-Business-Model-and-Costs.md`)

> All money is `NUMERIC(15,2)`. Percentages and fees marked **[verify]** must be confirmed against live aggregator/partner pricing. Custody phases per [`26-Glossary.md`](26-Glossary.md).

## 1. Revenue Model

Croe earns a **commission** on each successfully released transaction.

- **Commission:** a percentage of the escrow amount, deducted at `FUNDS_RELEASED`. Target **1.5%–2.5% [verify / decide]** per transaction.
- **Who pays:** default is **vendor-pays** (deducted from payout), because the vendor is the party gaining guaranteed settlement. A buyer-pays or split model is configurable per market. Decision recorded in [`11-Payouts-Refunds.md`](11-Payouts-Refunds.md).
- **No commission on refunds.** A `FUNDS_REFUNDED` transaction earns Croe nothing (buyer made whole).
- **Future revenue lines (not v1):** premium vendor tiers, faster-payout fees, insurance/guarantee add-ons.

## 2. Cost Realities Per Custody Phase

The critical insight for a student founder: **building costs almost nothing; real cost appears only when real money flows at scale.**

| Phase | What it costs | Order of magnitude |
| :--- | :--- | :--- |
| **P0 — Build** | Aggregator **sandbox** keys (free), local Postgres/Redis (free), local LLM via Ollama on your own laptop (free), free-tier hosting for demos | **≈ 0 GHS** |
| **P1 — Pilot** | Aggregator **live** transaction fees (pay-as-you-go, **~1.5–2% per transaction [verify]**); company registration at the Office of the Registrar of Companies (**one-time, a few hundred GHS [verify]**); a phone/SMS sender + push are low/free-tier | **Low; scales with volume** |
| **P2 — Partner-held** | Partner (bank/EPSP/DEMI) onboarding, due-diligence paperwork, possible minimum-volume commitment or revenue share; requires a registered company; legal/compliance setup | **Moderate cash, high access friction** |
| **P3 — Own licence** | BoG minimum paid-up capital in the **millions of GHS [verify tier & amount]**, long approval, ongoing compliance staff | **Very high — later only** |

**Non-phase running costs (all phases once live):** app hosting (start on a free/cheap tier — see [`22-Infra-and-Deployment.md`](22-Infra-and-Deployment.md)), object storage for evidence media (usage-based, cheap), SMS (per-message), push (free/low), a machine for the LLM if not co-located (can start on the app host or a cheap GPU/CPU box).

## 3. Unit Economics — Worked Example

Assume a `450.00 GHS` order, vendor-pays commission at **2.0% [verify]**, aggregator fee **1.5% [verify]** on collection.

| Line | Amount (GHS) |
| :--- | :--- |
| Buyer pays into escrow | 450.00 |
| Aggregator collection fee (1.5%) | −6.75 |
| Croe gross commission (2.0% of 450.00) | +9.00 |
| Aggregator payout/disbursement fee (per payout) **[verify]** | −e.g. 1.00 |
| **Croe net per transaction** | **≈ 9.00 − aggregator payout fee** (≈ 8.00) |
| **Vendor receives** | 450.00 − 9.00 commission − any pass-through fees ≈ **441.00** |

> The aggregator's collection fee is a **cost of goods**, not Croe revenue. Croe's true margin is `commission − payout fee − allocated infra/SMS cost per transaction`. Model this precisely once real aggregator pricing is confirmed **[verify]**.

## 4. The Student-Budget Path

1. **Build everything now, free** (P0): full working product on sandbox + local LLM. No cedi spent.
2. **Pilot small** (P1): register a company, go live on the aggregator, keep volumes low and supervised. Pay only the per-transaction %. This validates demand cheaply.
3. **Migrate to partner-held** (P2) once there's traction and a registered entity — this is when Croe becomes fully compliant and can scale.
4. **Own licence** (P3) only if volume ever justifies the millions-of-GHS capital.

**Architectural payoff:** the `CustodyProvider` abstraction ([`06-Money-Custody-and-Settlement.md`](06-Money-Custody-and-Settlement.md)) means moving from P1 → P2 swaps one implementation without rewriting escrow logic.

## 5. Break-Even Sketch

Let `C` = Croe net margin per transaction (≈ 8.00 GHS in the example) and `F` = monthly fixed costs (hosting + SMS base + LLM host, target **< 500 GHS/month [verify]** at pilot scale).

`Break-even monthly transactions ≈ F / C`. At `F = 500`, `C = 8` → **≈ 63 released transactions/month** to cover fixed costs. This is the number to design early growth around; refine once fees are confirmed.

## 6. Cost Discipline Rules (referenced by `25-Engineering-Rules.md`)

- Prefer free/local tooling in P0/P1 (local LLM, free-tier hosting) — never provision paid infra "to be safe."
- Every real-money feature states its custody phase so cost is never incurred before it's needed.
- Aggregator/partner fees are documented as **[verify]** until confirmed in writing — never hard-code assumed pricing into revenue projections.

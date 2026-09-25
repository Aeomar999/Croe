# Croe - Financial Model & Unit Economics Reference

> **Stakeholder Reference Document.** This document provides the mathematical foundation, unit economics, sensitivity models, and itemized capital requirements for Croe.
> All monetary calculations conform to rule **FIN-01** (exact 2-decimal precision, no floating-point distortion) and rule **FIN-02** (explicit currency codes: GHS, USD).
>
> **Rebuilt 25 Sep 2026** from published 2026 prices. FX: **US$1 = GHS 11.60**. Horizon: 36 months (Oct 2026 – Sep 2029). All capital figures include **15% contingency**.
> Interactive version with charts: [Croe Capital Plan](https://claude.ai/artifact/9qnYtftuyXg6zwgfj1DtwR) (private; share it from the page before sending).
>
> **This supersedes the earlier model.** The earlier model assumed a 2.0% vendor commission netting GHS 22.50 per order, fixed costs under GHS 500/month and break-even at 22–63 orders/month. Those figures left out the 1.95% MoMo collection fee and every salary. Section 2 shows why 2% loses money.

---

## 1. Executive Summary of Numbers

| Metric | Value (base case) | Range |
| :--- | :--- | :--- |
| **Pricing** | **4.0% all-in** = 2.5% vendor commission + 1.5% buyer protection fee | 3.5% is the floor; 5% halves break-even |
| **Net per released order** (GHS 800 average order) | **GHS 10.33** (1.29% of order value) | GHS 4.67 at a GHS 450 order · GHS 16.80 at GHS 1,200 |
| **Capital to a licensed, compliant launch** (stages 1–2, 18 months) | **US$387k** (GHS 4.48M) | US$189k – US$713k |
| **Capital to scale** (stage 3, months 19–36) | **US$916k** (GHS 10.63M) | US$442k – US$1.80M |
| **Total over 36 months** | **US$1.30M** (GHS 15.11M) | US$631k – US$2.52M |
| **Fixed cost at month 36** | **GHS 637,000/month** (US$54,900) | Team of ~25 |
| **Company break-even** | **~62,000 released orders/month** (≈ GHS 49M order value/month) | ~34,800 at a 5% fee · ~34,500 with direct telco rails |
| **Orders at month 36 (plan)** | 30,000/month (≈ GHS 24M order value) | Still ~GHS 327k/month short of break-even (see §9) |

The **range** column pairs costs at the bottom of every range with base-case order volume (low), and costs at the top of every range with **half** the base-case volume (high).

---

## 2. Pricing: Why 2% Cannot Work

Two published fees set the floor:

- **MoMo collection: 1.95%** of the amount collected ([Paystack](https://support.paystack.com/hc/en-us/articles/360012174020-Pay-with-Mobile-Money); Hubtel 1.95%, minimum GHS 0.30, April 2026).
- **MoMo payout: GHS 1.00 per transfer** ([Paystack transfers pricing](https://support.paystack.com/en/articles/2130370); GHS 8.00 to bank accounts).

The earlier model called the collection fee a "pass-through". It isn't: whoever is the aggregator's merchant pays it. At a **2.0% vendor-only commission**, the collection fee alone uses up 98% of the fee. **Croe loses GHS 4.19–6.83 on every order** once payout, ID checks, fraud reserve, refunds and SMS are counted.

**Pricing used in this model:**

| Party | Fee | On a GHS 1,200 order |
| :--- | :--- | :--- |
| Buyer | 1.5% protection fee, shown at checkout | Pays GHS 1,218.00 |
| Vendor | 2.5% commission, deducted from payout | Receives GHS 1,170.00 |
| Croe | 4.0% gross | Earns GHS 48.00 gross → **GHS 16.80 net** |
| Refunded order | No fee to either party | Croe earns GHS 0.00 and absorbs the collection and payout fees |

Because the buyer fee is added at checkout, the aggregator collects GHS 1,218.00 and charges 1.95% on that (GHS 23.75). **Buyer acceptance of the 1.5% fee is the single most important thing the pilot must prove.** Hubtel lets merchants pass fees to customers; the alternative is a 4% vendor-only commission.

---

## 3. Unit Economics per Released Order

| GHS per released order | GHS 450 order | GHS 800 order | GHS 1,200 order |
| :--- | ---: | ---: | ---: |
| Croe fee: 2.5% vendor + 1.5% buyer | +18.00 | +32.00 | +48.00 |
| MoMo collection fee (1.95% of amount collected) | −8.91 | −15.83 | −23.75 |
| Fraud & loss reserve (0.3% of order) | −1.35 | −2.40 | −3.60 |
| MoMo payout to vendor (flat) | −1.00 | −1.00 | −1.00 |
| ID verification (amortised) | −1.00 | −1.00 | −1.00 |
| Refund leakage (5% of orders refunded) | −0.52 | −0.89 | −1.30 |
| SMS notifications (~8 per order) | −0.35 | −0.35 | −0.35 |
| Hosting & AI (variable share) | −0.20 | −0.20 | −0.20 |
| **Net per order at 4%** | **4.67** | **10.33** | **16.80** |
| Net margin (% of order) | 1.04% | 1.29% | 1.40% |
| *Net per order at 2% vendor-only (old pitch)* | *−4.19* | *−5.42* | *−6.83* |

**Assumptions:**
- **Base average order is GHS 800,** a blend of the lead vertical (phones, electronics, sneakers at GHS 1,000–3,500) and lower-ticket thrift and beauty. The earlier GHS 1,200 figure has not been measured; the pilot must measure it.
- **Refund leakage:** 5% of orders are refunded, each costing the collection fee and a payout with no revenue.
- **ID verification at GHS 1.00 per order** assumes vendors are fully verified (US$0.50–2.00 each, Smile ID, sales-quoted). Buyers rely on the telco KYC already on their MoMo wallet. **If every new buyer needs a paid ID check, net per order falls from GHS 10.33 to GHS 3.60.** A lawyer must confirm the BoG and the custody partner accept wallet KYC.
- **SMS** at GHS 0.04 each ([GHS 0.025–0.08 by volume](https://arkesel.com/bulk-sms-pricing-ghana/)).
- **No E-Levy.** The Electronic Transfer Levy was repealed on 2 April 2025.

---

## 4. Fixed Operating Costs by Stage

| Monthly fixed cost (base) | Stage 1 · Legal pilot | Stage 2 · Compliant launch | Stage 3 · Scale |
| :--- | ---: | ---: | ---: |
| People (fully loaded: SSNIT 13% + benefits ≈ 18%) | GHS 14,500 | GHS 136,000 (ramping to 12) | GHS 290,000 avg (ramping to ~25) |
| Infrastructure & software | GHS 2,500 | GHS 20,000 | GHS 58,000 |
| Office / coworking | GHS 1,500 | GHS 15,000 | GHS 35,000 |
| Vendor acquisition & marketing | GHS 4,000 | GHS 40,000 | GHS 120,000 |
| Legal, compliance, insurance, audit, directors | — | GHS 21,500 | GHS 39,000 |
| Travel, admin, misc. | GHS 2,000 | GHS 6,000 | GHS 15,000 |
| **Total** | **GHS 24,500** (US$2,100) | **GHS 238,500** (US$20,600) | **GHS 557,000** avg (US$48,000) |

At month 36, with payroll fully ramped (~GHS 370,000), fixed cost is **GHS 637,000/month (US$54,900)**.

**Why the team is not optional.** The Bank of Ghana licensing pack requires named **key management personnel**: a CEO, a Technology & Systems Manager, a Compliance & Risk Manager, a Finance Manager and an AML Reporting Officer, plus **at least three directors**. At 30,000 orders/month, operations need about 6 people: ~1,500 disputes/month at a 5% dispute rate, KYC reviews, daily reconciliation and "where is my money" support.

**Infrastructure notes:**
- **Stage 1** runs on Render: web service US$25, Postgres from US$6, Key Value from US$10, workspace US$25. AI triage runs on CPU or is off, and disputes go to human review.
- **Stage 2** adds an HA database, a staging environment and one dedicated GPU node ([Hetzner GEX44](https://www.hetzner.com/pressroom/new-gpu-server/), RTX 4000 Ada 20 GB, €184–234/month).
- **Stage 3** adds a disaster-recovery region, a second GPU node, multi-year log retention and a WAF.
- **Cloud credits** (AWS Activate, Google, Microsoft) could cover most of the stage 1–2 infrastructure line. They are not assumed.

---

## 5. Capital Required by Stage

| Stage | Months | What it buys | Net need (base) | Range |
| :--- | :--- | :--- | ---: | :--- |
| **1 · Legal pilot** | 1–6 (Oct 2026 – Mar 2027) | Company, DPC registration, lawyer's written custody opinion, aggregator approval in writing, BoG sandbox application or partner LOI, 10–50 vendors, ~500 capped and disclosed live orders | **US$26k** (GHS 305k) | US$11k – US$51k |
| **2 · Compliant launch** | 7–18 (Apr 2027 – Mar 2028) | BoG PFTSP licence, partner-bank trust account (custody P2), BoG management team (~12 staff), pentest, ISO 27001, Accra + Kumasi launch, ~5,000 orders/month | **US$360k** (GHS 4.18M) | US$178k – US$662k |
| **3 · Scale** | 19–36 (Apr 2028 – Sep 2029) | ~25 staff, DR region, GPU inference, paid + referral vendor acquisition, ~30,000 orders/month | **US$916k** (GHS 10.63M) | US$442k – US$1.80M |
| **Total** | 36 | | **US$1.30M** (GHS 15.11M) | US$631k – US$2.52M |

Net need = spend + 15% contingency + working capital − order income.

**Suggested raise structure:**

| Round | When | Base need | Range | What it proves |
| :--- | :--- | ---: | :--- | :--- |
| **Pre-seed** | Now (stages 1–2) | **US$387k** | US$189k – US$713k | Legal model, licence, partner-held funds, 5,000 orders/month, real dispute and fraud rates |
| **Seed** | Around month 15, on stage 2 data | **US$916k** | US$442k – US$1.80M | A repeatable vendor-acquisition engine, 30,000 orders/month, a credible path to break-even |

**Stage gates (PROC-01 applies to the business too):**
- **Stage 1 → 2:** a written yes from an aggregator or custody partner, plus measured buyer drop-off, average order value and dispute rate.
- **Stage 2 → 3:** clean daily three-way reconciliation, dispute rate under 8%, vendor retention, and a partner willing to renew.

---

## 6. Itemized Costs (GHS, whole stage)

### Stage 1 · Legal pilot (6 months)
| Item | Basis (base) | Low | Base | High |
| :--- | :--- | ---: | ---: | ---: |
| Company registration, stamp duty, company secretary | one-time | 1,100 | 3,000 | 5,000 |
| Data Protection Commission registration | one-time | 1,000 | 2,000 | 4,000 |
| Trademark "Croe" (Ghana) | one-time | 0 | 3,000 | 6,000 |
| Apple ($99/yr) + Google Play ($25) developer accounts | one-time | 1,440 | 1,440 | 1,440 |
| Fintech lawyer: custody opinion, ToS, privacy, vendor terms, sandbox/aggregator filings | one-time | 35,000 | 60,000 | 120,000 |
| Pre-pilot security review (automated scan + light external test) | one-time | 0 | 12,000 | 35,000 |
| Test devices (3 Android tiers + 1 iPhone) | one-time | 8,000 | 15,000 | 25,000 |
| Founder stipends (1-2 founders) | GHS 10,000/mo × 6 | 30,000 | 60,000 | 120,000 |
| Part-time ops: support, L3 disputes, KYC, daily reconciliation | GHS 3,000/mo × 6 | 0 | 18,000 | 30,000 |
| Bookkeeping + company secretary | GHS 1,500/mo × 6 | 4,800 | 9,000 | 15,000 |
| Hosting, SMS base, monitoring, tools | GHS 2,500/mo × 6 | 6,000 | 15,000 | 24,000 |
| Vendor onboarding and pilot marketing | GHS 4,000/mo × 6 | 9,000 | 24,000 | 48,000 |
| Coworking / registered address | GHS 1,500/mo × 6 | 3,000 | 9,000 | 18,000 |
| Transport, data, phones, misc. | GHS 2,000/mo × 6 | 6,000 | 12,000 | 18,000 |
| **Subtotal** | | **105,340** | **243,440** | **469,440** |
| Contingency 15% | | 15,801 | 36,516 | 70,416 |
| Working capital (float + reserve) | | 10,000 | 30,000 | 60,000 |
| Less: order income (high case at half volume) | | −5,268 | −5,268 | −2,634 |
| **Net capital need (GHS)** | | **125,873** | **304,688** | **597,222** |
| **Net capital need (US$)** | | **$10,851** | **$26,266** | **$51,485** |

### Stage 2 · Compliant launch (12 months)
| Item | Basis (base) | Low | Base | High |
| :--- | :--- | ---: | ---: | ---: |
| BoG PFTSP licence: processing GHS 10k + licence GHS 20k | one-time | 30,000 | 30,000 | 30,000 |
| Legal: licence application, partner trust-account agreement, employment, ESOP | one-time | 80,000 | 130,000 | 250,000 |
| Penetration test: web + API + iOS + Android, with retest | one-time | 70,000 | 140,000 | 300,000 |
| ISO 27001 (gap assessment only in Low) | one-time | 40,000 | 230,000 | 520,000 |
| ICT, BCP/DR, AML/CFT and risk policies required by BoG | one-time | 20,000 | 45,000 | 90,000 |
| Custody partner onboarding and integration | one-time | 10,000 | 40,000 | 100,000 |
| Laptops and equipment for new hires | one-time | 60,000 | 100,000 | 150,000 |
| Recruitment (compliance lead, senior engineers) | one-time | 20,000 | 60,000 | 120,000 |
| Payroll, fully loaded, ramping to 12 people | GHS 136,000/mo × 12 | 1,020,000 | 1,632,000 | 2,520,000 |
| Infrastructure and software (HA database, GPU box, monitoring, workspace) | GHS 20,000/mo × 12 | 144,000 | 240,000 | 384,000 |
| Office / coworking in Accra | GHS 15,000/mo × 12 | 72,000 | 180,000 | 300,000 |
| Vendor acquisition and marketing | GHS 40,000/mo × 12 | 240,000 | 480,000 | 960,000 |
| Legal and compliance retainer | GHS 10,000/mo × 12 | 60,000 | 120,000 | 240,000 |
| Insurance: professional indemnity, cyber, fidelity | GHS 5,000/mo × 12 | 36,000 | 60,000 | 120,000 |
| External audit and tax filing | GHS 3,500/mo × 12 | 24,000 | 42,000 | 72,000 |
| Directors fees | GHS 3,000/mo × 12 | 0 | 36,000 | 96,000 |
| Travel, admin, misc. | GHS 6,000/mo × 12 | 36,000 | 72,000 | 120,000 |
| **Subtotal** | | **1,962,000** | **3,637,000** | **6,372,000** |
| Contingency 15% | | 294,300 | 545,550 | 955,800 |
| Working capital (float + reserve) | | 50,000 | 233,000 | 467,000 |
| Less: order income (high case at half volume) | | −235,749 | −235,749 | −117,874 |
| **Net capital need (GHS)** | | **2,070,551** | **4,179,801** | **7,676,926** |
| **Net capital need (US$)** | | **$178,496** | **$360,328** | **$661,804** |

### Stage 3 · Scale (18 months)
| Item | Basis (base) | Low | Base | High |
| :--- | :--- | ---: | ---: | ---: |
| ISO 27001 surveillance audits | one-time | 60,000 | 100,000 | 180,000 |
| Annual penetration tests (x2) | one-time | 120,000 | 250,000 | 500,000 |
| Equipment for new hires | one-time | 120,000 | 170,000 | 250,000 |
| Recruitment | one-time | 50,000 | 120,000 | 250,000 |
| Payroll, fully loaded, ramping to about 25 people | GHS 290,000/mo × 18 | 3,600,000 | 5,220,000 | 7,560,000 |
| Infrastructure and software (DR region, 2 GPU nodes, log retention, WAF) | GHS 58,000/mo × 18 | 630,000 | 1,044,000 | 1,620,000 |
| Office | GHS 35,000/mo × 18 | 360,000 | 630,000 | 1,080,000 |
| Vendor acquisition and marketing | GHS 120,000/mo × 18 | 1,080,000 | 2,160,000 | 4,500,000 |
| Legal and compliance retainer | GHS 15,000/mo × 18 | 180,000 | 270,000 | 540,000 |
| Insurance | GHS 10,000/mo × 18 | 108,000 | 180,000 | 360,000 |
| External audit and tax | GHS 6,000/mo × 18 | 72,000 | 108,000 | 180,000 |
| Directors fees (incl. independent) | GHS 8,000/mo × 18 | 54,000 | 144,000 | 270,000 |
| Travel, admin, misc. | GHS 15,000/mo × 18 | 144,000 | 270,000 | 450,000 |
| **Subtotal** | | **6,578,000** | **10,666,000** | **17,740,000** |
| Contingency 15% | | 986,700 | 1,599,900 | 2,661,000 |
| Working capital (float + reserve) | | 300,000 | 1,100,000 | 1,900,000 |
| Less: order income (high case at half volume) | | −2,738,858 | −2,738,858 | −1,369,429 |
| **Net capital need (GHS)** | | **5,125,842** | **10,627,042** | **20,931,571** |
| **Net capital need (US$)** | | **$441,883** | **$916,124** | **$1,804,446** |

---

## 7. Working Capital, Settlement Lag & Float

Aggregators settle to Croe the next day (T+1). In escrow, most releases happen days after deposit, because delivery takes time. So settlement usually lands before Croe has to pay the vendor. The exception is a **same-day rider delivery in Accra** confirmed before settlement: Croe then pays the vendor from its own float. Separately, a **ring-fenced loss reserve** covers wrong adjudications and fraud, and a custody partner may require one.

| At the end of | Basis | Low (GHS) | Base (GHS) | High (GHS) |
| :--- | :--- | ---: | ---: | ---: |
| Stage 1 · pilot | Loss reserve + small float | 10,000 | 30,000 | 60,000 |
| Stage 2 · ~5,000 orders/month | One day of order value (GHS 133k) + partner reserve | 50,000 | 233,000 | 467,000 |
| Stage 3 · ~30,000 orders/month | One day of order value (GHS 800k) + reserve | 300,000 | 1,100,000 | 1,900,000 |
| **Total** | | **360,000** | **1,363,000** | **2,427,000** |

Working capital is **raised, recycled and not burned**. Stage 3's float could be funded with debt. *Policy option:* paying vendors on the settlement cycle removes the float, but T+0 payout is a stronger vendor pitch.

---

## 8. Break-Even Sensitivity

Released orders per month needed to cover the **month-36 fixed cost of GHS 637,000/month**. All-in fee = 1.5% buyer fee + the rest from the vendor.

| Average order | 3.0% fee | 3.5% fee | 4.0% fee | 4.5% fee | 5.0% fee |
| :--- | ---: | ---: | ---: | ---: | ---: |
| GHS 450 | not viable | not viable | 136,300 | 92,000 | 69,500 |
| GHS 800 | not viable | 100,600 | **61,700** | 44,500 | 34,800 |
| GHS 1,200 | 132,800 | 59,000 | 37,900 | 27,900 | 22,100 |
| GHS 2,000 | 65,500 | 32,300 | 21,400 | 16,000 | 12,800 |

"Not viable" means more than 200,000 orders/month would be needed. **Ticket size and price matter far more than infrastructure choices.** A GPU node is under 1% of the month-36 cost base.

---

## 9. Levers and Risks

Each figure is computed on a GHS 800 order against the month-36 cost base. Base: GHS 10.33 net per order, ~61,700 orders/month to break even.

| | Change | Effect |
| :--- | :--- | :--- |
| **Lever · pricing** | 5% fee (3.5% vendor + 1.5% buyer) | Net GHS 18.33 → break-even **~34,800/month** |
| **Lever · own the rails** | Collect directly from telcos at ~1% instead of 1.95% | Net GHS 18.45 → **~34,500/month**. Needs a PSP licence (Medium: GHS 0.8M integrity capital; Enhanced: GHS 2M). The 1% rate is an estimate and needs a telco quote |
| **Lever · ticket size** | GHS 1,200 average order | Net GHS 16.80 → **~37,900/month** |
| **Risk · buyer ID checks** | Every new buyer needs a paid ID check | Net falls to **GHS 3.60** per order |
| **Risk · partner fee** | Custody bank takes 0.25% of volume | Net GHS 8.33 → **~76,500/month** |
| **Risk · regulatory delay** | Licence or sandbox cohort slips 3–6 months | **GHS 0.72M – 1.43M** extra stage 2 burn (US$62k – US$123k) |

**The month-36 gap, stated plainly:** on a straight-line plan, contribution at month 36 is GHS 310k/month against GHS 637k of fixed cost, a gap of **~GHS 327k/month (US$28k)**. Closing it takes the pricing or rails lever, or another 6–12 months of runway.

---

## 10. Pilot Success Validation Thresholds (Stage 1 gate)

During the supervised pilot, capital deployment is governed by these gates:

1. **Buyer fee acceptance:** checkout drop-off below 30% with the 1.5% buyer protection fee shown.
2. **Volume:** at least 250 released orders in month 6 (plan ramp: 30 → 80 → 150 → 250).
3. **Measured unit economics:** at least GHS 10.00 net per order at the measured average order value.
4. **Dispute rate:** below 8% of released orders.
5. **Adjudication accuracy:** over 95% of claims resolved without a successful appeal.
6. **Reconciliation variance:** GHS 0.00 across daily three-way balance checks.

---

## 11. Not in These Numbers

- **Own-licence capital.** PSP Enhanced: GHS 2M integrity capital + GHS 52k in fees. DEMI: GHS 20M + GHS 125k. This capital is locked, not spent; raise for it only when volume justifies it.
- **A second country** (Kenya/Nigeria). Each needs its own licence, payment integration and counsel.
- **Founders' market salaries.** Stage 1 pays stipends only; market rates would add about GHS 30–60k/month.
- **Fundraising costs, corporate income tax** (25% once profitable), and any VAT ruling on escrow fees.
- **Cloud credits.**
- **The software already built** (275 backend + 79 frontend tests passing). It's an asset, not a cost here.

---

## 12. Sources & Confidence

| Input | Value used | Status | Source |
| :--- | :--- | :--- | :--- |
| Exchange rate | US$1 = GHS 11.60 | Published | Market data, 21–25 Sep 2026 (11.51–11.62) |
| MoMo collection fee | 1.95% | Published | Paystack; Hubtel (min GHS 0.30, Apr 2026) |
| MoMo payout fee | GHS 1 per transfer | Published | Paystack transfers pricing |
| Escrow on an aggregator account | Allowed only as a "registered business" with documents | **Confirm** | Paystack supported-businesses list |
| BoG licence fees & capital | PFTSP: no capital, GHS 10k + 20k. Medium: GHS 0.8M. Enhanced: GHS 2M. DEMI: GHS 20M | **Confirm** | [BoG licensing pack](https://www.bog.gov.gh/wp-content/uploads/2020/07/Licensing-Requirements-for-EMI-and-PSP-latest.pdf) (table not updated since 2020) |
| Key management roles | CEO, Tech & Systems, Compliance & Risk, Finance, AMLRO; 3+ directors | Published | Same BoG pack |
| BoG regulatory sandbox | 6-month testing, periodic cohorts (6 firms admitted Jan 2026) | Published | BoG / GBC |
| E-Levy | Repealed 2 Apr 2025 | Published | Electronic Transfer Levy (Repeal) Act, 2025 |
| Company registration | GHS 585 + 1% stamp duty on stated capital | Published | ORC fees, effective 2 Feb 2026 |
| Salaries | Senior SWE, Accra: GHS 139k–504k/year; role figures are estimates within market | Estimate | levels.fyi, May 2026 |
| Payroll on-costs | SSNIT 13% employer + benefits ≈ 18% | Published | SSNIT 2026 |
| SMS | GHS 0.04 each, ~8 per order | Published | Ghana bulk SMS, GHS 0.025–0.08 |
| ID verification | US$0.50–2.00 per onboarding | **Confirm** | Smile ID (sales-quoted) |
| GPU inference | €184–234/month per node | Published | Hetzner GEX44 |
| Penetration test | US$6k–26k with retest | Published | 2026 pentest pricing guides |
| ISO 27001 (first year) | US$15k–45k; is it required for PFTSP? | **Confirm** | 2026 ISO 27001 cost guides; BoG pack lists it "where applicable" |
| Legal, insurance, office, directors, partner fees, DPC fee | See §6 | Estimate | No public price; replace with written quotes |
| Average order, refund rate, loss reserve, volume ramp | GHS 800; 5%; 0.3%; 5k orders/month at month 18, 30k at month 36 | **Confirm** | The pilot must measure these |

*This is not legal, tax or investment advice. Items marked **Confirm** must be checked with a Ghanaian fintech lawyer, the Bank of Ghana or the counterparty before anyone relies on them.*

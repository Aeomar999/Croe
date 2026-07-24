# Croe — Disputes & AI Triage (`13-Disputes-and-AI-Triage.md`)

> Table: `dispute_cases` ([`05-Data-Model.md`](05-Data-Model.md)). States/actions per [`26-Glossary.md`](26-Glossary.md). Custody phase: all (money moves only via [`23`](11-Payouts-Refunds.md)).

## 1. Purpose & Boundaries

Resolve disputes cheaply and fairly: a deterministic SQL firewall first, then a local LLM arbitrator, escalating to L3 only when genuinely ambiguous. **Does not** move money directly — it decides an action; disbursement is [`23`](11-Payouts-Refunds.md).

## 2. Dispute Lifecycle

`DISPUTE_OPENED` → (Step 1 SQL heuristics) → `FRAUD_LOCKOUT` **or** `AI_PROCESSING` → (Step 2 LLM) → `RESOLVED_AUTO` (≥0.900) **or** `UNDER_HUMAN_REVIEW` (<0.900) → terminal (`FUNDS_RELEASED`/`FUNDS_REFUNDED`).

```mermaid
sequenceDiagram
    actor P as Buyer/Vendor
    participant API as Croe API
    participant PG as PostgreSQL
    participant AI as Local LLM
    P->>API: POST /v1/disputes {transaction_id, reason_code, claim, evidence_ids}
    par heuristics (<50ms)
        API->>PG: Query A recycled hash
        API->>PG: Query B Sybil velocity
        API->>PG: Query C trust/age
    end
    alt tripwire
        API->>PG: FRAUD_FLAGGED; trust −50; FRAUD_LOCKOUT
        API-->>P: 403 (calm copy)
    else pass
        API->>PG: dispute_cases (AI_PROCESSING)
        API-->>P: 202 Accepted
        API->>AI: infer(system prompt + JSON payload)
        AI-->>API: {reasoning_steps, confidence_score, recommended_action, summary_for_users}
        API->>PG: store payload
        alt confidence >= 0.900
            API->>PG: execute action via 23; RESOLVED_AUTO
        else
            API->>PG: UNDER_HUMAN_REVIEW
        end
    end
```

## 3. Step 1 — Deterministic SQL Heuristics (< 50 ms)

**Query A — recycled evidence** (`$1`=uploaded hash, `$2`=this txn):
```sql
SELECT EXISTS (SELECT 1 FROM evidence_artifacts WHERE sha256_hash=$1 AND transaction_id!=$2);
```
**Query B — Sybil velocity** (`$1`=IP, `$2`=device):
```sql
SELECT COUNT(DISTINCT actor_id) AS accts, COUNT(DISTINCT transaction_id) AS disputes
FROM transaction_ledger
WHERE (ip_address=$1 OR device_id=$2) AND event_type='DISPUTE_OPENED'
  AND created_at >= NOW() - INTERVAL '24 hours';
```
**Query C — trust/age** (`$1`=user):
```sql
SELECT trust_score, is_frozen, EXTRACT(EPOCH FROM (NOW()-created_at))/3600 AS age_hours
FROM users WHERE user_id=$1;
```

### Cascading rule engine
| Rule | Condition | Action |
| :--- | :--- | :--- |
| 1 Recycled media | A = TRUE | `FRAUD_FLAGGED`; trust −50; freeze device; auto-resolve against uploader; `FRAUD_LOCKOUT`. AI bypassed. |
| 2 Sybil velocity | `accts > 2` OR `disputes > 3` **[verify thresholds]** | freeze linked accounts; `FRAUD_LOCKOUT`. AI bypassed. |
| 3 Burner account | `age_hours < 48` AND `trust_score < 50` | route `UNDER_HUMAN_REVIEW`. |
| 4 Pass | none of the above | proceed to AI (Step 2). |

## 4. Step 2 — Local LLM Arbitrator

- **Model:** a **self-hosted open-weights LLM** served via Ollama/vLLM (pin exact model in [`22-Infra-and-Deployment.md`](22-Infra-and-Deployment.md); the earlier "Gemma 4" label was a placeholder — no such release exists). Store the resolved id in `ai_model_version`.
- **Text-only:** images are pre-captioned by a lightweight captioner, so the arbitrator reads verified text descriptions (keeps inference < 5 s).

### System prompt (verbatim)
```
You are an impartial Dispute Resolution Arbitrator for the Croe escrow platform.
Evaluate a dispute between a Buyer and a Vendor and output STRICT JSON only.

Input JSON contains: original item description & price, the Buyer's claim, the
Vendor's defense (if any), and text descriptions of verified image artifacts.

RULES:
- BE OBJECTIVE: decide only from the provided evidence.
- STRICT MATCHING: if the received item deviates materially from the description
  (wrong color, broken, different model), favor the Buyer.
- BUYER'S REMORSE: if the item matches but the Buyer changed their mind, favor the Vendor.
- INCONCLUSIVE: if there is no evidence to decide, escalate to human.
- NO CODE BLOCKS: output raw JSON, never wrapped in markdown fences.

Output a single valid JSON object:
{
  "reasoning_steps": ["...", "...", "..."],
  "confidence_score": 0.000,
  "recommended_action": "REFUND_BUYER" | "RELEASE_VENDOR" | "ESCALATE_HUMAN",
  "summary_for_users": "A calm, 2-sentence explanation."
}
confidence_score MUST be a float between 0.000 and 1.000.
```

### Output schema validation
Reject and re-request (or escalate) if the response is not valid JSON, `confidence_score ∉ [0,1]`, or `recommended_action` not in the enum. Validated payload → `dispute_cases.ai_reasoning_payload` (GIN-indexed).

## 5. Confidence Gate

- `confidence_score ≥ 0.900` **and** action ∈ {`REFUND_BUYER`,`RELEASE_VENDOR`} → execute via [`23`](11-Payouts-Refunds.md); `RESOLVED_AUTO`.
- Otherwise (or `ESCALATE_HUMAN`) → `UNDER_HUMAN_REVIEW` ([`28`](16-Admin-Console.md)).

## 6. Prompt-Injection Hardening

1. Never concatenate raw user text into instructions — user claims go inside a JSON `"buyer_claim"` field only.
2. Deterministic pre-filter (Step 1) removes obvious bad actors before the LLM.
3. Strict schema output; discard/re-request non-conforming responses.
4. The LLM's decision is a *recommendation*; execution is gated by confidence + code, not by the model's free text.

## 7. Error & Edge Cases

| Case | Handling |
| :--- | :--- |
| LLM unreachable/timeout | Retry once; else `UNDER_HUMAN_REVIEW`. |
| Malformed JSON | Re-request once with a repair instruction; else escalate. |
| Both parties upload recycled hashes | Rule 1 applies to the uploader whose hash matched a *different* transaction. |
| Dispute after auto-release | Reject if terminal; L3 handles exceptional post-release claims manually. |

## 8. Acceptance Criteria

- No dispute reaches the LLM before passing all three heuristics.
- Autonomous money movement only at `confidence ≥ 0.900`.
- Every LLM output stored is schema-valid JSON.
- ≥ 80% of disputes resolve without L3 (KPI, [`01`](01-PRD.md)).

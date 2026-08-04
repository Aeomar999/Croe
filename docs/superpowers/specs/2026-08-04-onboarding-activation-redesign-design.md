# Onboarding & Activation Redesign — Design

**Date:** 2026-08-04
**Supersedes:** `2026-07-27-onboarding-screens-design.md` (extends rather than replaces — the
four cards it shipped remain, with a new visual treatment and a new tail)
**Design source:** `design/cards/screens/onboarding{,-hold,-payout,-role}.html`, `design/src/SPEC.md`

---

## Problem

Onboarding ends too early and looks like a template.

It ends at `PhoneInput`. A seller who finishes the carousel, picks a role, and verifies their
number lands on Home with no name, no confirmed payout destination, no idea a Tier 0 account is
capped per transaction (`09-KYC-and-AML.md` sets the figure, marked **[verify]**), and no first
link. The role answer — four screens of friction — does exactly
one thing: it seeds which tab opens first.

It also reads as a generic swipe-through. The composition is sound, but nothing moves, the hero
title sits two steps below the display size the system defines, and the art is boxed inside the
gutter.

## Goal

Keep the composition. Make it feel like Croe, and carry the seller from "verified number" to
"first link shared" without adding meaningful friction.

---

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Composition | **A — centred stack** (unchanged) | The arrangement works; the lift comes from treatment, not layout |
| Activation scope | payout confirm, display name, first link, KYC | All four, per product direction |
| Gating | **Hybrid** | Inline only what is cheap and universally required; nudge the rest; KYC just-in-time |

"Inline" means Setup appears in the first-run sequence rather than being deferred to a checklist —
it is not a modal the seller cannot leave. It carries a Skip, and everything it collects reappears
in the Home checklist. Nothing in onboarding traps a seller who wants to look around first.
| Role question | **Keep, and branch on it** | Makes the answer consequential instead of cosmetic |
| Name | **Display name separate from legal name** | A good storefront name is a bad legal name |
| Payout destination | **Confirm-only, no edit** | An editable payout number is a second identity and a second verification path |

---

## Flow

### First run — seller

| # | Screen | Status |
|---|---|---|
| 1–3 | Value panels | exists — new visual treatment |
| 4 | Role select → seller | exists — now branches |
| 5–6 | PhoneInput → OtpEntry | unchanged |
| 7 | **Setup** — display name + payout confirm | **new** |
| 8 | Home + "Finish setup" card | **new card** |

### First run — buyer

Screens 1–6 identical. Role select routes past Setup directly to Home, opening on Links. No
seller activation is shown, because none of it applies to someone whose job is to track a
delivery.

### Just-in-time

KYC opens as a sheet when a link would exceed the Tier 0 cap, or on a `403 KYC_LIMIT_EXCEEDED`
response. It is never a first-run screen.

### Exits

All exits use `replace`, so no onboarding screen sits under the auth stack in the back stack.

| From | Action | Effect |
|---|---|---|
| any panel | Skip | `complete(null)` → `PhoneInput` |
| panel 1 | I already have an account | `complete(null)` → `PhoneInput` |
| panels 1–2 | Get started / Continue | scroll to next page |
| panel 3 | Continue | → `RoleSelect` |
| RoleSelect | Continue (seller) | `complete('seller')` → `PhoneInput` → OTP → **Setup** |
| RoleSelect | Continue (buyer) | `complete('buyer')` → `PhoneInput` → OTP → Home |
| Setup | Continue | persist display name → Home |
| Setup | Skip | Home, with the checklist card showing both items outstanding |

A skipped Setup is recoverable: every item it collects also appears in the Home checklist.

---

## Two screens, one decision each

### Setup — display name + payout confirm

One screen, not two. Each half takes about ten seconds and both answer "who are you to a buyer."
Split, the seller reaches nine screens before their first link; combined, the first run costs
exactly one screen more than today.

- **Display name** — a single input, placeholder "e.g. Ama's Closet". Writes
  `users.display_name`. This is what a stranger sees on a payment link, and it is the only thing
  standing between a buyer and a bare phone number.
- **Payout confirm** — reads back the number just verified: "Your money lands on 024 ••• ••••
  (MTN)." A confirm control, not a field. `users.phone_number` is documented as the primary MoMo
  identifier, so there is exactly one number and it is already verified.

**Confirm-only is deliberate.** An editable payout number means a new column, a second OTP
verification path, and a divergence between the number that authenticates and the number that
receives money — a fraud surface, for a case better served by support.

### KYC — Tier 1 upgrade

Reached just-in-time, never on first run. Collects `id_type` (`NATIONAL_ID` / `PASSPORT` /
`VOTER_ID`) and one document image, posts multipart to the existing `POST /kyc/submit`, and shows
the pending state from `GET /kyc/status`.

The image must be downscaled client-side before upload. The backend accepts up to 10 MB and does
no resizing; a raw phone photo on prepaid Ghanaian data is the same product failure the art
budget in SPEC.md exists to prevent.

---

## Visual treatment

Composition A is retained. The lift comes from three moves.

### Motion

There is no animation anywhere in the mobile app — a search for `Animated` and `useNativeDriver`
across `mobile/src` returns only a comment. `tokens.ts` already defines `motion.state` (160ms) and
`motion.layer` (240ms) and nothing consumes them.

- Art parallax driven by the carousel's `scrollX`, art translating at ~0.4× page speed
- Dot width interpolated across the transition rather than snapped
- Press states on `Button`

All on the native driver, all gated behind `AccessibilityInfo.isReduceMotionEnabled()`. This is
the largest available gain in perceived quality and it costs no bytes.

### Type

Panel 1's title moves from `t-title` (24/30/700) to `t-display` (36/40/800). The system defines
`t-display` and no onboarding screen uses it. Panels 2–3 stay at `t-title` so the hero keeps its
rank.

### Art width

The art currently sits inside the 20px gutter. Letting it bleed full-width returns ~40px on a
390pt screen and stops it reading as a boxed thumbnail. `ArtFrame`'s `--sunken` plate is retained
— behind art rendered on the matching #F5F5F3 its only visible effect is rounding the corners,
which is worth keeping.

---

## Data

`users.full_name` is currently a **dead column**: nothing in the backend reads or writes it. This
design gives it an owner and adds its counterpart.

| Column | Meaning | Written by |
|---|---|---|
| `display_name` | what a buyer sees on a link | Setup screen, via `PATCH /users/me` |
| `full_name` | legal name from the ID document | KYC approval (admin), at Tier 1 |

New migration `006_user_display_name.ts` adds `display_name VARCHAR(50)`. Per AGENTS.md, one
migration per change; shipped migrations are never edited.

---

## Modules

```
mobile/src/screens/onboarding/
  OnboardingScreen.tsx      motion + display type + art bleed
  RoleSelectScreen.tsx      branches on the answer
  content.ts                + setup and checklist copy
mobile/src/screens/setup/
  SetupScreen.tsx           NEW  display name + payout confirm
mobile/src/screens/kyc/
  KycScreen.tsx             NEW  id type + image → POST /kyc/submit
mobile/src/components/
  SetupChecklist.tsx        NEW  Home card, dismissible
mobile/src/api/
  users.ts, kyc.ts          NEW
mobile/src/stores/onboarding.ts    + setup progress
mobile/src/navigation/AuthStack.tsx + Setup route, role branch

backend/src/routes/users.ts        NEW  PATCH /users/me { display_name }
backend/migrations/006_user_display_name.ts   NEW
```

KYC needs no new backend: `POST /kyc/submit` and `GET /kyc/status` already exist.

---

## Blocking dependency

`releaseTo()` and `refundTo()` pass a hardcoded placeholder instead of a wallet:

- `backend/src/services/escrow.ts:533` — `vendorMsisdn: "unknown", // placeholder until user auth`
- `backend/src/services/escrow.ts:655` — `buyerMsisdn: "unknown", // placeholder until user auth`

Auth has since shipped; the placeholders were never filled in. Against a real rail, every RELEASE
and REFUND pays a wallet named "unknown" and fails.

**The payout-confirm step makes a promise this code cannot keep.** It is tracked separately, and
this design does not claim the payout step works until it lands. Both call sites must resolve
`users.phone_number` (vendor via `vendor_id`, buyer via `buyer_id`), preserving MONEY-01 ordering.
`buyer_id` is NULL until `BUYER_CLAIMED`, so the refund path must fail in the way
`11-Payouts-Refunds.md` documents rather than paying out to a placeholder.

---

## Tests

The two-project jest split (`node` + `components`) already exists; new component tests slot in.

| Area | Assertions |
|---|---|
| carousel | panel copy matches `content.ts`; dots track the active index; reduced-motion on disables parallax |
| role branch | seller routes through Setup; buyer routes past it to Home on Links |
| setup | display name persists via `PATCH /users/me`; payout confirm advances; Skip leaves both checklist items outstanding |
| checklist | reflects store state; dismissal persists; completing an item clears it |
| kyc | 202 shows pending; `413 FILE_TOO_LARGE` surfaces a real message; images downscale before upload |
| backend | `PATCH /users/me` validates length and rejects unauthenticated calls; migration up/down is reversible |

Detox extends `e2e/onboarding-flow.test.ts` with the seller activation journey and a second launch
going straight to sign-in.

---

## Risks

**KYC image capture is the heaviest new surface.** Camera permissions, a 10 MB ceiling, and
prepaid data. Client-side downscaling is not optional.

**Skip leaves an unactivated seller.** They reach Home with no display name and an unconfirmed
payout number, and can create a link. The checklist is the recovery path, but nothing downstream
may assume Setup was completed.

**Vertical fit on small devices.** Panel 1 gains a 36px display title over a full-bleed art
region. On an SE-class 667pt screen this is tighter than the layout it replaces. The art region
absorbs the slack, as it does today — this must be verified at that height, not assumed.

**`display_name` is user-controlled text shown to strangers.** It needs length limits and the same
handling as any other untrusted display string; a storefront name is an impersonation surface.

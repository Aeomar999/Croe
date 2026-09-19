# Onboarding Screens — Design

**Date:** 2026-07-27
**Phase:** 7 — Frontend
**Branch:** `phase/7-frontend`
**Design source:** `design/cards/screens/onboarding{,-hold,-payout,-role}.html`, `design/src/SPEC.md`

---

## Problem

Four onboarding cards exist in the design system and none of them are on the
frontend. The mobile app ships an `OnboardingScreen.tsx` that predates them: it
has three steps instead of four, invented copy ("Your money, your pace",
"Disputes handled fairly") that appears in no card, and Feather icons in circles
where the cards call for the commissioned clay illustrations.

It is also unreachable. `AuthStack` registers `Onboarding` but starts at
`PhoneInput`, so no user has ever seen it.

## Goal

Ship the four cards as designed, reachable on first launch, with the role answer
doing something real.

---

## Screens

Four cards, two components. The three value panels are pages of one carousel;
the role picker is its own screen because it has no dots, no Skip, and a
different art aspect.

### `OnboardingScreen` — the carousel

Chrome shared by all three panels:

- **Top bar** — `croe` wordmark, 22px/800, tracking −.04em, with a `--secure`
  full stop. `Skip` on the right at 13.5px/600 in `--ink-3`.
- **Body** — art frame, dots, copy, spacer, footer. `--gutter` 20px sides,
  `--gap-section` 24px between blocks.
- **Art** — 1:1 frame, `--sunken` fill, `--r-4` radius, image clipped to inherit.
- **Dots** — 6px `--line-2` circles, 6px gap; active is 20px wide and `--ink`.
- **Copy** — centred. Title at `.t-title` (24/30/700/−.022em), lede at 15/22/500
  in `--ink-2`, 12px below the title.

| Panel | Art | Title | Lede | Footer |
|---|---|---|---|---|
| 1 | `onboarding-01-locked-chat` | Sell to strangers.\nGet paid safely. | Croe holds your buyer's money until they confirm delivery. Nobody has to go first. | **Get started** (ink) · *I already have an account* (quiet) |
| 2 | `onboarding-02-escrow-vault` | The money is held,\nnot sent. | Your buyer pays into escrow, not into your inbox. You ship knowing the cash is already there — and it's released the moment they confirm. | **Continue** (ink) |
| 3 | `onboarding-03-momo-payout` | Paid out\nin minutes. | When the buyer confirms, your money moves straight to your mobile wallet. No waiting on a bank, no chasing anyone. | **Continue** (ink) |

Panel 3 adds a carrier row above the spacer: three entries of an 8px brand dot
plus a 12px/600 `--ink-2` label — MTN MoMo, Telecel, AT Money. This is the
8px-dot form the SPEC permits, not the 40px monogram tile, because the network
is a detail here rather than the decision.

**Footers live inside each page, not fixed below the carousel.** Panel 1's
footer is two buttons deep and panels 2–3 are one, so a shared footer would
change height mid-swipe. Each card draws its own footer; the implementation
follows.

### `RoleSelectScreen`

- **Top bar** — wordmark only. No Skip: the card omits it, and the question has
  a safe default, so there is nothing to escape from.
- **Art** — 3:1 band, same `--sunken` frame and `--r-4` radius.
- **Copy** — left-aligned, not centred. "What brings you here?" at `.t-title`,
  lede "You can do both later — this just decides what we show you first."
- **Role cards** — `--r-3`, white, 1px `--line`; selected takes `--ink`. Each is
  a 44px `--r-2` icon well (`--sunken` fill; when selected, `--secure` fill with
  ink glyph), a 16px/700 title over 13/19 `--ink-2` copy, and a 20px radio
  marker.

  | | Icon | Title | Copy |
  |---|---|---|---|
  | 1 | shopping bag | I'm selling | Create payment links, get paid before you ship, withdraw to MoMo. |
  | 2 | shield | I'm buying | Pay into escrow, track delivery, get your money back if it never arrives. |

  "I'm selling" is selected on mount, as the card shows.

- **Wash banner** — `--secure`, info glyph. "Buying? You may not need this" /
  "If a seller sent you a Croe link, just tap it — you can pay without an
  account."
- **Footer** — **Continue** (ink) with a 12/18 `--ink-3` centred caption beneath:
  "Next: verify your number. It takes about a minute."

---

## Modules

```
src/stores/onboarding.ts            first-run flag + role, SecureStore-backed
src/screens/onboarding/
  OnboardingScreen.tsx              3-panel paging FlatList
  RoleSelectScreen.tsx              role picker
  content.ts                        panel copy + art requires
src/theme/components/ArtFrame.tsx   sunken frame + expo-image
assets/images/onboarding-0{1..4}.webp
assets/images/README.md             how the WebP files were produced
```

`content.ts` holds the panel data as plain exports so the copy can be asserted
without mounting a component, and so both screens stay presentational.

### `src/stores/onboarding.ts`

Zustand, mirroring the shape of the existing `stores/auth.ts`:

```ts
type OnboardingRole = 'seller' | 'buyer';

interface OnboardingState {
  seen: boolean;
  role: OnboardingRole | null;
  hydrated: boolean;
  hydrate(): Promise<void>;      // read both keys from SecureStore
  complete(role: OnboardingRole | null): Promise<void>;  // persist + set seen
}
```

Keys: `croe.onboarding.seen`, `croe.onboarding.role`.

`complete(null)` is the Skip path — it marks onboarding seen without recording a
role, so the app falls back to the seller default.

### `ArtFrame`

```ts
interface ArtFrameProps { source: ImageSource; aspect: 1 | 3 }
```

A `--sunken` view at `--r-4` with the image filling it at `contentFit="cover"`.
Exists so the two screens do not each restate the frame rules, and so the 1:1 /
3:1 split is a prop rather than a copied style block.

---

## Wiring

**Gate.** `RootNavigator` calls `hydrate()` alongside the existing auth load and
holds its loading state until both resolve. `AuthStack` then sets
`initialRouteName={seen ? 'PhoneInput' : 'Onboarding'}`. `RoleSelect` is added
to `AuthStackParamList`.

**Exits.** All four exits use `replace`, so onboarding never sits under the auth
screens in the back stack:

| From | Action | Effect |
|---|---|---|
| any panel | Skip | `complete(null)` → `PhoneInput` |
| panel 1 | I already have an account | `complete(null)` → `PhoneInput` |
| panel 1–2 | Get started / Continue | scroll to next page |
| panel 3 | Continue | → `RoleSelect` |
| RoleSelect | Continue | `complete(role)` → `PhoneInput` |

**Role payoff.** `MainTabs` holds its active tab in local `useState('home')`. It
seeds from the store instead: `buyer → 'links'`, seller or unset → `'home'`. A
buyer's first need is tracking a delivery, which is the Links list; a seller's
is the balance and the deals, which is Home.

No backend change. `users` has no role column and the frontend phase is not the
place to add one — the choice is a local presentation preference, which is
exactly what the card claims it is ("this just decides what we show you first").

---

## Art pipeline

The four source PNGs in `design/assets/` run 1.2–5.1 MB. SPEC.md sets a hard
budget of **80 KB per image and 320 KB for the set**, at roughly 1050px on the
long edge, in WebP — on the grounds that onboarding art which costs a prepaid
Ghanaian user money before they have seen a screen is a product failure.

One-time conversion with `sharp`, run through `npx` so nothing permanent is
added to the app's dependencies. Each image is resized to its exact frame ratio
(1050×1050 for the panels, 1050×350 for the role band) because the frame does
not letterbox. Quality steps down from 86 until the image fits its budget. The
`.webp` outputs are committed; `assets/images/README.md` records the command so
the step is reproducible.

`expo-image` is added as a dependency. React Native's built-in `Image` does not
decode WebP on iOS without extra native configuration; `expo-image` does on both
platforms and is the Expo-sanctioned component.

Icons follow the existing `theme/components/icons.tsx` convention of thin Feather
shims: a new `ShoppingBag` shim for selling, the existing `Shield` for buying.
Feather has no shield-with-check glyph, and inventing a one-off SVG for a single
use would fork the icon system for no gain.

---

## Tests

The current jest config is `testEnvironment: 'node'` with `testMatch:
**/__tests__/**/*.test.ts` — it cannot render a component. Rather than convert
the existing suite, jest gains a **second project** so the node tests keep
running exactly as they do now:

- **project `node`** — existing config, unchanged, `src/__tests__/*.test.ts`.
- **project `components`** — `jest-expo` preset, `@testing-library/react-native`,
  `src/**/*.test.tsx`.

Coverage:

| Area | Assertions |
|---|---|
| store | empty SecureStore hydrates to `seen: false`; `complete('buyer')` persists both keys and flips `seen`; `complete(null)` sets seen with a null role |
| carousel | each panel's title and lede match `content.ts`; dots reflect the active index; Skip and *I already have an account* call `complete` then `replace('PhoneInput')`; panel 3 Continue routes to `RoleSelect` |
| role | selling is selected on mount; tapping buying moves the selection; Continue persists the chosen role and replaces to `PhoneInput` |
| tabs | `MainTabs` opens on Links for a buyer and Home for a seller or an unset role |

`e2e/onboarding-flow.test.ts` (Detox) covers the two journeys that unit tests
cannot: a fresh install walking all four screens into phone input, and a second
launch going straight to phone input.

---

## Risks

**`jest-expo` transform collision.** `jest-expo` brings its own Babel transform,
which can fight the bare `ts-jest` setup currently in place. The two-project
split is the containment: if the component project needs its own transform
chain, the node project is unaffected. This is the most likely place to need
iteration.

**Vertical fit on small devices.** Panel 1 is a 1:1 art frame plus a title, a
lede, and two stacked buttons. On an SE-class 667pt screen that is tight. The
art frame will be verified at that height rather than assumed — if it overflows,
the frame takes a `maxHeight` and shrinks, since it is the only block on the
screen that can lose pixels without losing meaning.

**Skip leaves no role.** A user who skips reaches the app with `role: null` and
lands on Home. That is the correct fallback — Home is the fuller screen — but it
means the role picker is not a guaranteed signal, and nothing downstream may
assume it was answered.

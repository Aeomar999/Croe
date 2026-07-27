# Croe brand mark — "Aperture"

**Date:** 2026-07-27
**Status:** Approved, ready for implementation planning
**Scope:** The Croe symbol, its lockup with the existing wordmark, the app icon set, and
the design-system card that documents them.

---

## Problem

Croe has no logo. `mobile/assets/icon.png` is still the stock Expo blue chevron, and the
other four assets in `mobile/assets/` are the matching placeholders. The only brand asset
that exists is typographic: the wordmark `croe` set in Plus Jakarta Sans 800 at −.04em
with a `--secure` full stop, used once, on the onboarding screen
([`design/cards/screens/onboarding.html:512`](../../../design/cards/screens/onboarding.html)).

The mark is needed for a specific moment, and that moment sets the whole brief. A buyer in
Ghana receives a payment link inside a WhatsApp conversation with a vendor they have never
met. The link preview renders the icon at roughly **20 px**. That icon is the only thing on
screen that is not the vendor's own words — it is the entire trust signal at the moment of
maximum exposure. The mark is therefore designed at the small end and allowed to grow, not
designed large and shrunk.

## Decisions taken

| Question | Decision |
|---|---|
| What idea does the mark carry? | **Held between** — an enclosure with the money resting inside it |
| Lock or shield? | **Neither.** Both announce a threat; every screen behind the icon is written to reassure |
| Which geometry? | **Aperture** — an open C, the enclosure drawn so it also carries the name |
| Icon ground? | **Ink** `#17181B`. The system's own law: the primary action is black |
| Does Croe gain a brand hue? | **No.** Green stays semantic; the mark's single green dot *is* money-held |
| One drawing or two? | **Two.** A micro variant for ≤ 24 px, standard everywhere else |
| Green dot vs green full stop? | **Exactly one green dot per lockup** (see below) |

### Why not the alternatives

Four other geometries were drawn and tested at 112 / 44 / 28 / 20 px, in monochrome, and
inverted on light ground. The sheet is
[`design/explore/brand-mark-concepts.html`](../../../design/explore/brand-mark-concepts.html).

- **Cradle** (open bowl, dot resting in it) — warmest and most human of the five, but an
  upward bowl is a well-worn gesture (wallets, "receive", deposit) and it surrenders the
  name entirely.
- **Shelter** — Cradle inverted. Reads as a roof, which is insurance, not escrow.
- **Between** (split ring, dot suspended) — conceptually the truest and the most
  distinctive, and it survived 20 px better than predicted. Rejected only because it is
  three shapes rather than two and tells nobody the brand's name, which matters for a
  product no one has heard of.
- **Release** (near-closed ring, dot at the opening) — the best story, and the one outright
  failure: below ~44 px the detached dot fuses with the ring terminal and the mark
  collapses into a loading spinner. It also breaks its own bounding box.

**The acknowledged tension.** "Held between" was chosen over "monogram C", and Aperture
walks part of the way back — it is the held-between idea drawn as a letter. That is
deliberate, and it is the reason the mouth angle is tightly specified below: too open and
it becomes a bare letterform, which is the outcome the concept choice was meant to avoid.

---

## The mark

Two shapes. There is never a third.

### Standard drawing

On a `0 0 100 100` viewBox:

```svg
<circle cx="51.5" cy="50" r="25"
        fill="none" stroke="#FFFFFF" stroke-width="11.5" stroke-linecap="round"
        stroke-dasharray="101.95 55.13" transform="rotate(63.2 51.5 50)"/>
<circle cx="50" cy="50" r="9" fill="#1FC16B"/>
```

| Property | Value | Note |
|---|---|---|
| Mark span | **61.5** of 100 | 61.5% of the icon tile |
| Base circle | r **25**, centre **(51.5, 50)** | |
| Optical nudge | arc **+1.5** on x | a C is left-heavy; its geometric centre reads off |
| Stroke | **11.5**, round cap | 2.3 px inside a 20 px icon |
| Mouth | **100.0°**, bisector horizontal, opening right | |
| Dot | r **9** at **(50, 50)** | the exact centre of the tile |
| Aperture gap | **8.75** at the closest point | 76% of the stroke |

Two facts are load-bearing:

1. **The dot sits at the exact centre of the tile and the C is nudged around it.** The
   money is what the icon is centred on; the enclosure moves to suit it.
2. **The aperture gap renders at 1.75 px inside a 20 px icon**, above the ~1.5 px point at
   which a gap silts up on a mid-range Android screen. This is the constraint that governs
   every proportion above.

> An earlier draft of the exploration sheet specified a 9.75 gap and a rule that the gap
> must never be narrower than the stroke. Both were wrong, and were corrected after
> measurement: a gap as wide as the stroke is unreachable without either a 69-unit mark or
> a dot small enough to disappear. The pixel floor is the real rule.

The `stroke-dasharray` values depend on `stroke-linecap: round` — the caps extend each
dash by `stroke-width / 2` at both ends, so the **dash array gap is the visible gap plus
one stroke width**. Changing the cap style silently changes the mouth angle.

### Micro variant — for ≤ 24 px only

```svg
<circle cx="50" cy="50" r="26"
        fill="none" stroke="#FFFFFF" stroke-width="13" stroke-linecap="round"
        stroke-dasharray="107.25 56.11" transform="rotate(61.8 50 50)"/>
<circle cx="50" cy="50" r="10" fill="#1FC16B"/>
```

Mouth **95.0°**, span **65**, aperture gap **9.5** (1.52 px at 16 px). The optical nudge is
dropped — at these sizes 1.5 units is a third of a pixel, and concentric geometry buys back
the clearance that matters more.

Shipping a separate optical size for small rendering is standard practice, not a hedge.
**Used for the favicon and the notification icon only** — the two places the mark is ever
asked to render below 24 px. Everything else uses the standard drawing.

### Colour

| Element | Value | Token |
|---|---|---|
| Icon ground | `#17181B` | `--ink` |
| Stroke, on ink | `#FFFFFF` | `--on-ink` |
| Stroke, on light | `#17181B` | `--ink` |
| Dot | `#1FC16B` | `--secure` |

The mark introduces **no new colour**. `--secure` already means *money is held safely*, and
that is precisely what the dot depicts, so the mark spends the system's existing vocabulary
rather than adding to it. There is still no decorative brand hue.

---

## The lockup

### The rule: exactly one green dot in any Croe lockup

The mark holds a green dot and the wordmark ends in a green full stop. Side by side the
brand states its one idea twice, centimetres apart, which reads as indecision rather than
emphasis. The resolution:

- **With the mark present**, the wordmark is `croe` — no period. The mark *is* the period.
- **Standing alone with no mark**, the wordmark is `croe.` with the green full stop,
  exactly as it renders today.

No existing screen changes. Onboarding already uses the standalone form.

### Configurations

| Lockup | Composition |
|---|---|
| **Horizontal** (default) | mark, then `croe`, gap = **one dot diameter** |
| **Stacked** (splash, share cards) | mark above `croe`, same gap |
| **Wordmark alone** | `croe.` — green full stop retained |

Alignment: the mark's vertical centre aligns to the **x-height centre** of `croe`, not the
cap line — the word has no ascenders, so cap-line alignment reads high.

The lockups are **not shipped as SVG files.** The wordmark is live text in Plus Jakarta
Sans 800 at −.042em everywhere it appears (React Native, the design cards, the payment-link
web page), and outlining it into a path would create a second copy to keep in sync for no
benefit. The lockup is a layout rule, documented on the card.

---

## Clear space and minimum sizes

The measuring unit is **one dot diameter** (18 units; 29% of the mark's width). Using the
mark's own feature as the unit means clear space scales automatically and can be checked by
eye without a ruler.

| Rule | Value |
|---|---|
| Clear space | **1 unit** on all four sides, minimum |
| Minimum size, mark | **16 px** (micro variant below 24 px) |
| Minimum size, horizontal lockup | **72 px** wide |
| Mark within an icon tile | **61.5%** — iOS and web |
| Mark within the Android adaptive canvas | **56%** of 108 dp, so the mask cannot clip it |

## Misuse — all automatic failures

- **No green ground.** Green means *held*, not *Croe*.
- **Never rotate.** Rotated, it stops being a C.
- **The dot is never another state colour** — not caution amber, not danger red.
- **Never fill the tile.** 61.5% is the size.
- **No gradients, no shadows, no outlines, no glows.** The system has none, anywhere.
- **Never add a lock, shield, tick or padlock.** The concept is holding, not defending.
- **Never stretch.** The mark is drawn on a square; it stays square.

---

## Asset set

`mobile/assets/` currently holds **six** stock Expo placeholders. Five are regenerated, one
is deleted, and one new file is added.

| File | Size | Content |
|---|---|---|
| `icon.png` | 1024² | Opaque `#17181B` square, **no corner radius** (iOS applies its own mask), standard mark at 61.5% |
| `android-icon-foreground.png` | 432² | Transparent, standard mark at **56%**, white stroke, green dot |
| `android-icon-monochrome.png` | 432² | Transparent, standard mark at 56%, **solid black** — Android applies its own tint |
| `splash-icon.png` | 512² | Transparent, **ink** stroke, green dot — sits on a `--canvas` ground |
| `favicon.png` | 48² | **Micro variant**, ink ground, rounded corners baked in |
| `notification-icon.png` | 96² | *New.* Transparent, **micro variant**, solid white silhouette |

`android-icon-background.png` is **deleted**, not regenerated — a flat ink field is better
expressed as `adaptiveIcon.backgroundColor` than as a PNG, and it removes a file that can
drift.

`notification-icon.png` has **no consumer yet**: `expo-notifications` is not in the plugin
list, so nothing references it. It is generated now because the micro master exists and
[`for_agents/15-Notifications.md`](../../../for_agents/15-Notifications.md) puts push
notifications on the roadmap — but it stays unwired until that plugin lands. If you would
rather not carry an orphan asset, cut this row; nothing depends on it.

### `app.json` changes

```diff
   "android": {
     "adaptiveIcon": {
-      "backgroundColor": "#E6E6E3",
+      "backgroundColor": "#17181B",
       "foregroundImage": "./assets/android-icon-foreground.png",
-      "backgroundImage": "./assets/android-icon-background.png",
       "monochromeImage": "./assets/android-icon-monochrome.png"
     },
```

The current `#E6E6E3` is the `--page` token — the grey *behind* a phone artboard in the
design cards. It was never intended as an icon ground and would frame the mark in light
grey on any device that ignores the background image.

### Splash screen — in scope, separable

`splash-icon.png` exists in `mobile/assets/` but **no `expo-splash-screen` config
references it**, so it is currently dead weight. Wiring it is the natural completion of
shipping a logo:

```json
["expo-splash-screen", { "image": "./assets/splash-icon.png",
                         "imageWidth": 160,
                         "backgroundColor": "#F1F1EF" }]
```

`#F1F1EF` is `--canvas`, so the app opens into its own ground rather than flashing white.
If this is judged out of scope for a logo task, cut this item — nothing else depends on it.

### Generator

`mobile/scripts/gen-icons.mjs`, with `sharp` added as a **devDependency** in `mobile/`.

- Reads two SVG masters: `design/brand/mark.svg` and `design/brand/mark-micro.svg`.
- Emits all six PNGs at the sizes and grounds in the table above.
- Idempotent — running it twice produces byte-identical output.
- Wired as `npm run icons` in `mobile/package.json`.

The point of the script is that the icons cannot drift from the design: every asset derives
from one master, and regenerating after a tweak is a single command rather than a manual
export ritual.

---

## Design-system card

`design/cards/foundations/brand.html`, authored to the contract in
[`design/src/SPEC.md`](../../../design/src/SPEC.md):

- First line exactly:
  `<!-- @dsCard group="Foundations" name="Brand" subtitle="The mark, the wordmark, and the one-green-dot rule" -->`
- `<title>Croe — Brand</title>`, the Plus Jakarta Sans font link, and the **entire**
  `design/src/tokens.css` copied verbatim into a `<style>` block.
- `body.specimen`, `.spec` at 760px, `.srow` / `.slabel` rows. No JavaScript, no external
  images, no raw hex outside the tokens.

Sections: the mark at size · construction grid with the measurement table · the micro
variant and when it applies · colour · the one-green-dot rule with the three lockups ·
clear space and minimums · the asset set · the misuse row.

This makes **Foundations** five cards (Colour, Typography, Spacing & Radius, Shape & Depth,
Voice → plus Brand) and the project 26 cards total.

### Publishing

The Claude Design project recorded for Croe (`26e5977c-…`, owner *Nicholas*) returns 404
from the current login and cannot be written to. A **new design-system project** will be
created, owned by the user, and the brand card pushed to it. The other 25 cards stay where
they are for now; migrating them is separate work and is not part of this spec.

`design/cards/**/*.html` remains the source of truth on disk regardless of publish target.

---

## Out of scope

- Redrawing or re-kerning the `croe` wordmark. It stays Plus Jakarta Sans 800 at −.042em.
  Custom letterform work is a separate exercise with its own brief.
- Migrating the existing 25 cards to a new Claude Design project.
- Motion. The mark's dot is an obvious animation target (travelling the aperture as an
  escrow progresses) and is deliberately left for later — a logo that only works animated
  is not a logo.
- Any change to the five semantic state colours, the type scale, or the depth rules.

## Success criteria

1. The mark is legible and unambiguous at **20 px** on an ink ground, and at **16 px** as
   the favicon in its micro form.
2. It survives Android monochrome themed-icon rendering with the dot flattened to one tone.
3. It survives inversion to ink-on-`--canvas` without a second drawing.
4. `npm run icons` regenerates every asset from the masters, idempotently.
5. No new colour, no gradient, no shadow, and no raw hex enters the design system.
6. The card renders standalone, passes the `SPEC.md` hard rules, and carries a working
   `@dsCard` marker.

# Croe UI v3 — "Soft Light" — Card Authoring Contract

Croe is a mobile escrow app for social commerce in Ghana. The v3 language is extracted
wholesale from one reference screenshot: **a light neutral ground, white sheets with big
radii, near-black actions, one type family, and colour used only to mean something.**

Three sentences hold the whole system together:

1. **The ground is grey, the surfaces are white.** Depth comes from that contrast — not
   from borders, not from shadows.
2. **The primary action is black.** There is no decorative brand hue. The only chroma in
   the interface is semantic: green means held, amber means attention, red means failure.
3. **One family, five weights, sentence case.** No serif, no mono, no uppercase headings.

Calm is still the law. Croe's job is to make someone who just sent GH₵ 450 to a stranger
feel safe, so reassurance comes before explanation, and explanation before instruction.

---

## Hard rules (verify before returning a card)

1. **First line exactly**:
   `<!-- @dsCard group="<Group>" name="<Card Name>" subtitle="<one-liner>" -->`
   Groups: `Foundations`, `Components`, `Screens`, `Flows`.
2. Standalone HTML opening `<html lang="en">`, with `<title>Croe — <Card Name></title>`,
   and this font link in `<head>`:
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
   <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
   ```
3. Copy the ENTIRE `design/src/tokens.css` verbatim into a `<style>` block; card-specific
   CSS goes after it. No raw hex in card CSS — use the tokens. (Sole exceptions: the three
   carrier dots, already tokenised as `--mtn` / `--telecel` / `--at`.)
4. No JavaScript. No icon fonts. No emoji. **No external images — with one
   carve-out, below.**

   ### The onboarding art carve-out
   Raster artwork is permitted in **onboarding art frames only** — the `.art` element on
   `onboarding`, `onboarding-hold`, `onboarding-payout` and `onboarding-role`. Nowhere
   else. It is never permitted in UI chrome: no raster icons, no image buttons, no
   photographic backgrounds, no textures behind content. Everything that is part of the
   interface is still drawn in CSS or inline SVG.

   Rules for art that goes in a frame:
   - Lives in `design/assets/`, named `onboarding-NN-slug.png`.
   - Rendered on `#F5F5F3` so it matches `--sunken` and its ambient occlusion grounds.
   - Soft 3D clay, matte, light from top-left, off-white and warm grey only, with
     `--secure #1FC16B` as the single accent. No second hue, no gradient background.
   - `alt=""` — the heading beside it already says what it says, so it is decorative.
   - **Aspect must match the frame exactly**: 1:1 for the three panels, 3:1 for the role
     band. The frame does not letterbox or crop to rescue a mismatch.

   **Weight budget: 80 KB per image, 320 KB for the set.** This is a hard number, not
   advice. Croe's users are on Ghanaian mobile data, often prepaid — onboarding art that
   costs someone money before they have seen a single screen is a product failure, not a
   design detail. Ship WebP at ~1050px on the long edge (3× the 350px frame); that is
   plenty for the densest phone and lands comfortably inside the budget.
5. **Money is always GH₵**, tabular figures: `GH₵ 450.00`. Big amounts use
   `<span class="cur">GH₵</span>1,635.00` inside `.amount`. The currency mark is set at the
   **same size, weight and colour as the numerals** — the reference sets `$12,573.00`
   uniformly, so never raise, shrink or grey the `GH₵`. Phones: `+233 24 123 4567`.
   References: `NO. CR-89201` — set in the same family at `.t-micro`, never in a mono face.

---

## The BANNED list — any of these is an automatic failure

**Type**
- Fraunces, Schibsted Grotesk, IBM Plex Mono, Inter, Outfit, Roboto, Open Sans, Georgia.
- Any serif face. Any monospace face, for any purpose — including reference numbers,
  timestamps, and specimen annotations. v2 leaned on mono for "data"; v3 uses tabular
  figures in the one family instead.
- Uppercase as a heading style. Section headings are sentence case, 17px/700. Uppercase
  is allowed **only** at `.t-micro` (11px), and only for data prefixes (`VOL:`, `NO.`)
  and specimen row labels.
- Letter-spacing above `.06em` on anything, or any text below 11px.

**Colour**
- The entire v1 blue family: `#2563EB`, `#3B82F6`, `#EFF6FF`, `#1E40AF`, and the v2 cobalt
  `#2547F4`. There is no blue in Croe.
- The v2 warm paper/bone palette: `#F7F6F3`, `#191714`, `#787268`, `#A8A196`, `#E8E5DF`,
  kente gold `#D9A441`.
- Any hue used decoratively. If a colour is not carrying a state, it is not allowed.

**Effects**
- `linear-gradient` / `radial-gradient` / `conic-gradient` — any gradient at all. The
  reference is entirely flat fills.
- `backdrop-filter`, `filter: blur()`, glassmorphism, glows, inner shadows.
- `box-shadow` on anything that is not floating above the page. See the depth rule below.
- Borders on a white sheet that sits on `--canvas` — that double-encodes depth.
- Border widths other than 1px, except the two documented cases: the 1.5px dashed upload
  tile and the 1.5px choice marker ring.
- Radii below 12px on any container, and sharp corners anywhere.

**v2 "Ledger" signatures — all retired**
- Dotted leaders, perforation lines, rubber-stamp seals, ghost numerals, kente strips,
  diamond ticks, 2px left-rule asides, text-only tab bars.

**One rule that reverses v2**
- v2 banned red outright. v3 permits it, because the reference uses red as a first-class
  semantic — but only for value-negative figures and genuine failure. A dispute being
  opened is **caution (amber)**, never danger. Money is never shown in red.

---

## Tokens

### Surfaces
| Token | Value | Use |
|---|---|---|
| `--page` | `#E6E6E3` | behind the artboard, so the phone reads as a device |
| `--canvas` | `#F1F1EF` | the app ground — everything sits on this |
| `--surface` | `#FFFFFF` | sheets, tiles, pills, tab bar. The only white |
| `--sunken` | `#F5F5F3` | a well inside a white sheet (rare) |

### Ink
`--ink #17181B` headings, amounts, primary fill · `--ink-2 #4A4D52` body and secondary
labels · `--ink-3 #8E9297` meta, captions, placeholders, inactive icons ·
`--on-ink #FFFFFF` text on any solid fill.

### Line
`--line #E7E7E4` the hairline, 1px, only where white meets white ·
`--line-2 #D9D9D5` dense-list dividers, disabled outlines, dashed tiles.

### Semantic states
Two idioms, both taken from the reference: **solid** (fill + on-fill text — the `+5.2%`
pill) and **quiet/wash** (tinted fill + deep text — for larger reassurance surfaces).

| State | Means | Solid | Wash | Deep text |
|---|---|---|---|---|
| pending | waiting on someone | `--pending #EFEFEC` / `#5B5E63` | `--pending-wash` | `--ink-2` |
| secure | money is held safely | `--secure #1FC16B` / **ink** | `--secure-wash #E8F8F0` | `--secure-deep #127A45` |
| done | settled, complete | `--done #17181B` / white | `--done-wash` | `--ink` |
| caution | needs attention, being sorted | `--caution #F5B02E` / `#2A1F05` | `--caution-wash #FDF3E1` | `--caution-deep #8A5A00` |
| danger | failed, refused, at risk | `--danger #EF4444` / white | `--danger-wash #FDECEC` | `--danger-deep #A62020` |

Carrier colours — `--mtn #FFCC00`, `--telecel #E60000`, `--at #004F9F` — appear in exactly
two forms, and nothing else:

- **8px dot**, beside the carrier's name, in a dense list or a row where the network is a
  detail rather than the decision.
- **40px monogram tile** (`--r-1`, brand fill, monogram in ink or white per the on-fill
  rule) **only where choosing the network IS the task** — the payment screens.

The dot alone used to be the whole rule, and it was wrong. On Pay Into Escrow the network
is the most recognisable thing on the screen and the single choice being asked for;
reducing MTN to an 8px dot beside a radio button made the most important control on the
screen look like a placeholder. Scale should follow what the element is *for*.

What stays banned: carrier colour as a page or sheet fill, as a button background, as a
status colour, or anywhere above 40px. It marks a network. It never carries meaning.

**Text on a solid fill is ink when the fill is bright, white when the fill is dark.** The
reference sets white on its green pill, but that pair measures 2.36:1 — unusable for the
signal Croe leans on hardest, on a mid-range phone in daylight. Ink on `--secure` is 7.52:1,
ink on `--danger` is 4.74:1 where white was 3.76:1, and both match how `--caution-on`
already sits on amber. This is the one place v3 knowingly overrides the reference; it
applies to `--secure-on`, `--danger-on` and `.tick.now` alike. `--done` is the only dark
fill, so it keeps white.

**The bright fills are a Signal privilege.** As *graphical objects* on `--canvas` the bright
tones fail the 3:1 floor (secure 2.09, caution 1.67, pending 1.02), so a Trace mark is
structurally forced onto the `--*-deep` family, which passes (deep green 4.77, deep amber
5.24). The restraint is not a style preference — it is the only correct answer.

### Type — Plus Jakarta Sans, one family
| Step | Size / line | Weight | Tracking | Use |
|---|---|---|---|---|
| `.t-display` | 36 / 40 | 800 | −.03em | the balance, the one big number |
| `.t-title` | 24 / 30 | 700 | −.022em | screen titles |
| `.t-heading` | 17 / 22 | 700 | −.012em | section headings, nav titles |
| `.t-subhead` | 15 / 20 | 600 | −.006em | row titles |
| `.t-body` | 15 / 22 | 500 | 0 | paragraphs (`--ink-2`) |
| `.t-label` | 14 / 18 | 600 | 0 | buttons, chips, field labels |
| `.t-caption` | 13 / 18 | 500 | 0 | helper text, quiet actions (`--ink-3`) |
| `.t-micro` | 11 / 14 | 700 | +.05em, upper | pill text, data prefixes, specimen labels |

Add `.n` for tabular figures on any number the user might compare or verify.

### Shape
`--r-1 12` thumbs and glyph wells · `--r-2 16` inputs and compact sheets · `--r-3 20`
tiles · `--r-4 24` primary sheets (the default) · `--r-full 999` every pill and every
circle · `--r-phone 44` the artboard.

### Space — 4pt grid
`4 · 8 · 12 · 16 · 20 · 24 · 28 · 32 · 40 · 48`. Fixed values: `--gutter 20px` (screen
side padding, never varies), `--pad-sheet 20px`, `--gap-section 24px`, `--gap-row 12px`.

### Depth — state this as a rule, because it is one
> **Fill first, hairline second, shadow only for what floats.**
> A white sheet on `--canvas` gets no border and no shadow — the contrast is the depth.
> A white control sitting *on white* gets a 1px `--line` border, because contrast is not
> available to it. Only genuinely floating layers — the tab bar, the FAB, toasts, modal
> sheets — get `--elev`. Nothing ever gets both a border and a shadow.

### Motion & density
`--t-state 160ms` for press/toggle/colour, `--t-layer 240ms` for anything floating in,
both on `--ease` `cubic-bezier(.2,.8,.25,1)` — soft settle, no bounce, no spring.
Density is generous: 20px gutters, 12px between sibling rows, 24px between sections,
every tap target ≥44px, primary buttons 52px.

---

## Component idioms observed in the reference

1. **Sheet** — white, `--r-4`, 20px padding, sitting on the grey canvas. The default
   container, and usually the only one on a screen.
2. **Balance block** — quiet label, one very large tabular amount, a state pill to its
   right, then a row of pill actions along the bottom. This is Croe's hero component and
   replaces v2's Escrow Note.
3. **Pill button** — full radius, 52px, one ink button per screen. Optional leading
   **glyph well**: a 26px circle behind the icon, translucent-white on ink fills and
   `--pending` on light fills.
4. **Icon button** — 44px white circle with a hairline. Used for nav and utilities.
5. **Chip rail** — horizontally scrolling filters that deliberately **bleed off the right
   edge** (use `.chiprail`, which negates the gutter). Active chip is solid ink; inactive
   is white with a hairline. A leading icon-only chip is allowed.
6. **Tile grid** — a 4-up row of white `--r-3` tiles, icon above a 13px label, centred.
7. **The table — the global style for every list of records.** Escrows, wallet history,
   evidence, KYC tiers, payouts: if it is a list of things that each carry a state, it is
   a `.table` of `.trow`, and it looks the same everywhere. **Do not invent a second row
   treatment** — a product with two table styles has none.

   A `.trow` is a white card on `--canvas`, so it takes no border and no shadow. It is
   built from up to three tiers, **the last two optional**:

   | Tier | When | Contents |
   |---|---|---|
   | `.trow-main` | **always** | `.tmark` · `.tlead` (title over `.tsub`) · `.tvals` (value over meta) |
   | `.trow-rail` | only if the record has a lifecycle | four steps: link live · paid · shipped · delivered |
   | `.trow-foot` | only if context is worth pairing with a status | `.tnote` (+`.urgent`) and the status Trace |

   A settled payout needs no rail. A KYC tier needs neither rail nor foot. Dropping a tier
   is how one component serves a dense list and a rich one without a second set of rules —
   it is not licence to restyle the row.

   **Not a table:** key-value receipts, a single identity header, one settings row. Those
   are `.row-inset` or plain rows. The table is for *records*.
8. **Status pill — TWO idioms, and choosing between them is the system.**
   - **Trace** (`.pill`, the default): a 10px state mark plus words, **no capsule**.
     Use it in any list, any repeated row, and anywhere a pill sits beside an amount.
     `.pill-mine` swaps the disc for a ring, meaning *this one is your move* — scan a
     column, count the rings, that is the vendor's to-do list. `.pill-end` puts the mark
     last, which is **required** in a right-aligned column so the marks stack into a clean
     column instead of ragging. `.pill-cased` adds a white capsule, and is legal **only**
     on `--surface`.
   - **Signal** (`.pill-signal`): the solid capsule. **One per scroll view**, on the thing
     the screen is actually about. `.pill-hero` is the 34px size for sitting beside an
     amount. `.hz` appends a horizon — time to the next event, and nothing else. Never a
     fee, a reference number or a trust score; two horizons on one screen rebuild the noise.

   Why two: measured against `--canvas`, the five solid fills run from **1.02:1** (pending)
   to **15.70:1** (done). Three stacked solid pills are therefore not three colours, they
   are three wildly different optical weights — one a black slab, one invisible. That is
   what reads as noise. The Trace lands all five states at one weight; the Signal is what
   earns the saturation. Quiet comes from removing **fill and area**, never from greying
   the text — `--ink-3` on canvas is 2.77:1 and fails, so a Trace label stays `--ink-2`.
9. **Selector pill** — white, hairline, `--r-full`, with a 28px ink mark on the left and a
   chevron on the right. Used for account/wallet switching.
10. **Floating dock** — a white full-radius bar with `--elev`, holding an active tab
    rendered as an ink pill with icon **and** label, inactive tabs as icons alone, plus a
    detached circular FAB beside it.
11. **Section header** — sentence-case 17/700 heading with a quiet 13px `--ink-3` action
    on the right (`More`, `Edit`, `See all`).

### Icons — designed by extension
The reference uses 3D clay renders, which we cannot ship. The system equivalent is inline
SVG on a `0 0 24 24` viewBox, round caps and joins, `currentColor` so they inherit ink /
`--ink-3` / `--on-ink`. Line only — never filled, never two-tone.

**The constant is rendered stroke weight, not the raw attribute.** Every icon should land
at ≈1.5px on screen, so `stroke-width` scales with the box: 21–23px box → 1.75, 19px → 1.9,
15px in a glyph well → 2.4, 12px in a pill → 2.6. Reading the bare attribute will make
correctly-tuned icons look inconsistent and vice versa — check `box ÷ 24 × stroke`.

Sizes by role: 21px in chrome and tab bars, 23px in a tile, 15px in a `.btn .well`, 12px
inside a pill, 40px for a `.row .mark`. There is no per-screen icon budget — the reference
is genuinely icon-rich and a dashboard following these briefs draws about a dozen. The
restraint lives in the rule above, not in a count.

---

## Voice

Calm, reassure-first, plain English, sentence case. No backend enums are ever shown to a
user — the mapping table below is for designers, and the enum text may appear **only** on
the `stamps` and `status-pills` specimen pages as documentation.

| State | User-facing words | Pill |
|---|---|---|
| LINK_CREATED | Link live | pending |
| AWAITING_DEPOSIT | Awaiting payment | caution |
| FUNDS_SECURED | Funds secured | secure |
| SHIPPED | On its way | secure |
| DELIVERED_CONFIRMED | Delivered | done |
| FUNDS_RELEASED | Paid out | done |
| DISPUTE_OPENED / AI_PROCESSING | In review | caution |
| UNDER_HUMAN_REVIEW | Specialist review | caution |
| FUNDS_REFUNDED | Refunded | done |
| EXPIRED | Expired | pending |
| CANCELLED | Cancelled | pending |
| FRAUD_LOCKOUT | Account paused | caution |

### Copy bank (use verbatim where it fits)
- "Your money is held safely by Croe — the seller is only paid after you confirm delivery."
- "Funds safely locked. The amount is frozen in escrow. Neither party can access it until
  this review is resolved."
- "We've safely paused this transaction. Our automated review is checking the delivery
  details to sort it out fairly."
- "Photo verified and secured. Your evidence is timestamped and protected against tampering."
- "Good news — the buyer's payment for order CR-89201 is safely secured in Croe. You're
  cleared to ship."
- "Croe never sees your MoMo PIN. Payments are approved on your phone, by you."
- "Your account is temporarily paused while we review recent activity. Money already in
  escrow stays protected and will resolve normally."

### Sample data (keep consistent across every card)
Vendor **Akosua's Closet** (Akosua Mensah, trust 98, 214 deliveries) · Buyer **Kwame O.**
Item "Nike Air Max 270 — size 43, white/volt" · `GH₵ 450.00` · ref `CR-89201`
History: iPhone 13 case `GH₵ 85.00` · Ankara dress `GH₵ 320.00` · JBL Flip 6 `GH₵ 780.00`
Carriers: MTN MoMo · Telecel · AT Money.

---

## Layout contracts

**Screens** — one `.phone` artboard, 390×844, `--r-phone` corners, on the `--page` ground:
```
.statusbar (9:41 left; signal / wifi / battery SVGs right)
  → optional .screen-head (44px icon button + title + optional right slot)
  → .screen-body  [.has-tabs adds 112px bottom padding]
  → optional .tabdock (.tabbar + .tabfab, absolutely positioned)
  → .home-indicator
```
Tabs are Home · Escrows · Wallet · Profile, with the active one as an ink pill carrying
icon **and** label. The FAB is **search** — finding one deal among many is the vendor's
real recurring need, and it is what the reference puts in that slot. Creating an escrow is
the ink button on the balance block, so the dock must never duplicate it.

**Foundations & Components** — `body.specimen`, content in `.spec` (max-width 760px),
each specimen in an `.srow` with a `.slabel` on the left and a hairline above. No boxed
card around every specimen. Where a component only makes sense on the app ground, put it
inside a `.stage` (a `--canvas` panel) rather than inventing a border.

---

# CARD BRIEFS

## Foundations

**foundations/colors.html — "Color"** — Specimen. Rows: GROUND & SURFACE (page, canvas,
surface, sunken as `.swatch` blocks with name/hex/use); INK (four tiers, each a line of
real copy set in that tier); LINE (the two hairlines, shown as actual 1px rules); STATES
(the five states, each showing solid pill + wash sheet + deep text together); CARRIERS
(three 8px dots). Closing note: "There is no decorative colour in Croe. If a hue is not
carrying a state, it is not allowed — which is why the primary button is black."

**foundations/typography.html — "Typography"** — Specimen. One family, stated plainly.
A `GH₵ 1,635.00` amount specimen at 56px showing the raised currency mark. Then the eight
scale steps as rows, each with a real product sentence on the left and size/line/weight/
tracking on the right at `.t-micro`. A tabular-figures row proving alignment on a column
of amounts. Closing note on why there is no mono: "Reference numbers are data, not code."

**foundations/spacing-radius.html — "Spacing & Radius"** — Specimen. The 4pt grid as ink
bars (4→48) with values; the fixed layout constants (gutter 20, sheet padding 20, section
gap 24, row gap 12) shown as an annotated mini-layout; the radius scale as five outlined
shapes (12/16/20/24/full); density rules (44px min target, 52px primary button).

**foundations/spacing-shape.html — "Shape & Depth"** — Specimen. The depth rule as the
headline, then proof: a white sheet on `.stage` with no border and no shadow, beside a
white control on white *with* a hairline, beside a floating dock *with* `--elev` — each
captioned with why. A "never do this" row showing the two failures (border + shadow
together; a border on a canvas-sitting sheet) marked as wrong. Pill geometry: why
`--r-full` on controls and `--r-4` on containers.

**foundations/voice.html — "Voice & Copy"** — Specimen. "Reassure first, explain second,
act third." Four do/don't pairs (dispute opened, photo uploaded, recycled photo, AI
processing): ✗ version in a `.wash-danger` sheet, ✓ version in a `.wash-secure` sheet.
Then the enum→words table rendered as rows with live pills.

## Components

**components/buttons.html — "Buttons"** — Ink (default / pressed / disabled), Line, Quiet,
Wash, Danger; the small 44px pair; a full-width primary; and the glyph-well variants on
both ink and light fills. Note: "One ink button per screen."

**components/inputs.html — "Inputs"** — Text field with label + helper; phone field
(`+233` prefix, focused, ink caret); amount field (GH₵ prefix + 22px/800 numerals);
textarea; the 6-cell `.otp-row` (4 filled, 5th active); carrier `.choice` rows with 8px
brand dots (MTN selected); error state.

**components/cards.html — "Cards"** — The surface family: `.sheet`, `.sheet-2`, the 4-up
`.tile` grid, `.row-inset`, and the four `.wash` sheets. Each captioned with when to reach
for it. Closing note restating the depth rule.

**components/note.html — "The Balance Block"** — The hero component at full width: quiet
label, `GH₵ 1,635.00` at 34px, a `.pill-secure` beside it, an eye affordance, and the
`.btn` action row. Then two siblings: the buyer-facing variant (amount + "Held until you
confirm delivery") and the WhatsApp link preview as a white `--r-4` sheet with the item,
price, and `croe.app/pay/CR-89201`.

**components/status-pills.html — "Status Pills"** — Trace and Signal side by side, the five
states in both, the disc/ring distinction with its meaning spelled out, `.pill-end` shown in
a right-aligned column next to the ragged version it replaces, `.pill-cased` on white only,
and the Signal at both 28px and `.pill-hero` 34px with a `.hz` horizon. Lead with the
before/after that motivates the split: the same three-row list rendered all-solid (noise)
and as Traces (calm). Print the measured fill-contrast spread (1.02:1 → 15.70:1) as the
argument. Keep the two ring-ish glyphs vertically separated — they read as near-duplicates
side by side.

**components/stamps.html — "Lifecycle States"** — All twelve states from the mapping
table grouped IN MOTION / HELD / COMPLETE / CLOSED, each as user-facing words + live pill
+ the backend enum at `.t-micro` in `--ink-3` (documentation, permitted here only).
Footer: "Amber means 'being sorted out', never 'you're in trouble'."

**components/banners-nav.html — "Banners & Navigation"** — The four `.wash` banners with
icons and real copy; the `.screen-head` in three configurations (back + title, title +
action, close + ref + pill); the `.toast`.

**components/chrome.html — "Chrome"** — The statusbar SVG set; the floating `.tabdock`
in all four active states plus the FAB; the `.home-indicator`; the `.chiprail` showing the
deliberate right-edge bleed; the `.selector` pill. All staged on `.stage`.

**components/ledger.html — "Ledger Timeline"** — The vertical `.track`: dispute opened
(done, 14:32) → automated review (now, secure tick) → resolution (next, "usually within
10 seconds"). Plus a four-entry wallet history variant with signed amounts.

**components/tracker.html — "Progress Tracker"** — The horizontal `.hrail` four-step
escrow rail (Paid · Secured · On its way · Delivered) in three progress states, with the
label treatment for done / current / upcoming.

## Screens (all `.phone` 390×844)

**screens/onboarding.html — "Onboarding"** — No head. Wordmark `croe` 30px/800 with a
`--secure` full stop. Display line "Sell to strangers. Get paid safely." + body. Three
numbered rows on white sheets (Money held safely / Instant MoMo payout / Fair review in
minutes). Bottom: `.btn-ink.btn-full` "Get started", `.btn-quiet` "I already have an
account".

**screens/auth-phone.html — "Sign in — Phone"** — Back button. Title "What's your
number?" + "We'll text you a code. No passwords, ever." Focused phone field. A
`.wash-secure` reassurance sheet with the MoMo PIN copy. Bottom: "Send my code" + legal
caption.

**screens/auth-otp.html — "Sign in — OTP"** — Back. "Enter the code" + "Sent to
+233 24 123 4567 · Wrong number?". Six-cell OTP. Centred `Resend in 00:42`. "Verify".

**screens/kyc.html — "Verification (KYC)"** — Back + "Verification". Three tier rows as
sheets: 00 Phone verified (done pill, up to GH₵ 500), 01 Ghana Card (secure pill, ACTIVE,
up to GH₵ 5,000), 02 Enhanced (pending, up to GH₵ 50,000, `.btn-line.btn-sm` Upgrade).
Two dashed upload tiles (Front / Back). `.wash-secure` privacy note: "…only a fingerprint
of the number, not the number itself." Bottom: "Submit for review".

**screens/home.html — "Home"** — Two blocks only, and that restraint is the point: the
screen is the money and the deals, nothing else.

Header row: avatar, "Good afternoon" + "Akosua's Closet", two icon buttons (scan, bell with
an amber unread dot).

**The balance block.** Label and the `.pill-signal.pill-secure` "Protected" share the top
line so the amount owns its own — `GH₵ 1,635.00` with an eye affordance. Beneath it the
**allocation bar**: a 6px flat bar splitting the held total by where the money actually
sits, with a legend naming both parts (`Secured GH₵ 1,315.00` · `Awaiting GH₵ 320.00`).
The segments' `flex-grow` values ARE the amounts, so the bar cannot drift from the figures
beside it, and a 2px gap of card-white separates them — no gradient, no empty track, since
the total is fully allocated. Then exactly two actions: New link (ink) and Withdraw (line).

**Escrows.** `.sechead` + `.chiprail` (All active · Awaiting · Shipped · Done, bleeding
off-edge) + three escrow cards. Each card is white on `--canvas` (so no border, no shadow)
with a two-part anatomy: a main row — 40px `--sunken` thumb carrying buyer initials, item
over buyer, amount over date — then a hairline, then a **footer strip** pairing the
time-sensitive note (`Ship within 48h`) with the status Trace. Traces use `.pill-end` so
their marks stack into a column; `.pill-mine` marks the one escrow that is the vendor's
own move.

`.tabdock` with Home active + search FAB.

There is deliberately **no quick-actions tile grid**. Every destination it offered — payouts,
verification, trust, support — is reachable from the Wallet and Profile tabs, so it bought
nothing and cost 108px that the escrow cards need. Do not reinstate it.

**screens/create-escrow.html — "Create Escrow Link"** — Back + "New escrow link". Item
field (filled), amount field with fee helper, delivery `.choice` pair (Meet-up / Courier
selected), protection-window row, `.wash-caution` "Links above GH₵ 5,000 need Tier 2
verification". Bottom: "Create secure link" + "Share it in WhatsApp, Instagram, anywhere."

**screens/link-created.html — "Link Created"** — Close button. Centred `.pill-secure`
"Link live", title "Your link is live", body. The chat-preview sheet on a `--canvas` well.
Link row: `croe.app/pay/CR-89201` + Copy. Buttons: "Share to WhatsApp" / "More options".
Caption "Holds this price for 24 hours."

**screens/pay-deposit.html — "Buyer — Pay Into Escrow"** — Head: "Secure payment" + lock
glyph. Seller row (avatar, name, "Trust 98 · 214 deliveries", done pill "Verified").
Balance block, buyer-facing: `GH₵ 450.00`, "Held until you confirm delivery", item and
seller rows. `.wash-secure` explainer. "Pay with MoMo" + three carrier `.choice` rows
(MTN selected) + phone field. Bottom: "Send payment prompt" + PIN caption.

**screens/deposit-pending.html — "Buyer — Approve on Phone"** — Back + "Almost there".
Centred: `GH₵ 450.00` at display size with a `.pill-caution` "Waiting for your PIN" above.
A `.track` of three steps (Prompt sent 13:58 done / Waiting for your approval now /
Locked & seller notified next). `.btn-quiet` "Didn't get the prompt? Resend". Caption:
"Your money never moves without your PIN."

**screens/transaction-status.html — "Transaction Status"** — Head: back + `NO. CR-89201`
+ `.pill-secure` "Funds secured". Balance block: `GH₵ 450.00`, Buyer / Paid rows. The
horizontal `.hrail` (Paid · Secured done, On its way current, Delivered next).
`.wash-secure` with the vendor cleared-to-ship copy. Buttons: "Mark as shipped" /
"Message buyer". Hairline, then quiet caution line: "Something wrong? Open a dispute ·
Free · resolved in minutes". `.tabdock`, Escrows active.

**screens/dispute-open.html — "Open a Dispute"** — Back + "Open a dispute". `.wash-secure`
FIRST: "Funds safely locked — GH₵ 450.00 stays frozen…". "What went wrong" + four
`.choice` rows (Item never arrived selected). "Tell us what happened" + filled textarea +
helper. "Evidence" + dashed tile + one uploaded row (`IMG_2041.JPG · 14:31`, done pill
"Verified"). Bottom: "Submit for review" + "Median resolution: under 10 seconds."

**screens/dispute-status.html — "Dispute Status"** — Head: back + ref + `.pill-caution`
"In review". Balance block variant: "Frozen in trust", `GH₵ 450.00`, the neither-party
copy. "The review" + `.track` (Opened 14:32 done / Automated review now / Resolution
next). "Evidence secured" + two rows with done pills. Bottom: `.btn-line` "Message
support".

**screens/dispute-resolved.html — "Dispute Resolved"** — Close + ref + `.pill-done`
"Refunded". Centred secure tick mark, title "It's sorted — you're refunded", body
"GH₵ 450.00 is on its way back to your MTN MoMo wallet…". A sheet "What our review found"
with the finding + `Automated review · confidence 0.96 · ref AR-1182` at `.t-micro`.
Receipt rows (Refund / To / Fee). Buttons: "Back to home" + quiet "Request a human review".

**screens/wallet.html — "Wallet & History"** — Title "Wallet" + `.selector` pill. Balance
block: "Available to withdraw" `GH₵ 2,340.00`, rows for In escrow / Lifetime, actions
Withdraw / Statement. Section "This week" + `.chiprail` + four rows with signed amounts
(+GH₵ 438.75 done "Paid out" / GH₵ 780.00 secure "Held" / −GH₵ 85.00 done "Refunded" /
GH₵ 320.00 pending "Expired"). Caption: "Payouts arrive in minutes · 2.5% fee deducted."
`.tabdock`, Wallet active.

## Flows

**flows/journey.html — "End-to-End Journey"** — White landscape page, max-width 1080.
Title "One deal, three protected moments." A horizontal rail of six round ticks with
step titles, captions, and live pills beneath (Create link / Buyer pays / Funds secured —
secure tick / Ship & track / Buyer confirms / Instant payout). Below a hairline, the
dispute branch as an indented `.track` with caution ticks (Dispute opened → Automated
review, under 10s → Fair outcome), and the "humans step in only for the genuinely
ambiguous ~20%" note in a `.wash-caution` sheet.

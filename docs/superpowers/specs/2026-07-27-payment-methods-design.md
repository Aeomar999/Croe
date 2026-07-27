# Payment methods — mobile money, card, bank

**Date:** 2026-07-27
**Status:** Approved, ready for implementation planning
**Scope:** Buyer-side payment method selection on Pay Into Escrow

---

## Problem

`pay-deposit` supports mobile money only. Three carrier tiles and a phone number are
rendered inline, and the screen fits its 390×844 artboard with **zero pixels to spare**.

Buyers need to pay by card and by bank as well. A card form alone is roughly 250px — card
number, expiry, CVV, name — so three methods cannot live inline on that screen. This is a
flow problem, not a styling one.

## Decisions taken

| Question | Decision |
|---|---|
| Do bank payments settle instantly? | **Both.** Direct debit where the bank supports it; manual transfer with a reference otherwise. |
| Who are card and bank for? | **All three methods are equal peers.** No default, no pre-selection, no smart detection. |
| Where do payment details live? | **A bottom sheet.** |

### Why a sheet, and not the alternatives

- **Accordion inline** would need ~250px for the expanded card form, which means cutting
  the seller row or the balance detail. That pays for a payment feature with trust
  signals — the wrong trade on this screen in particular.
- **A separate form screen** hides the amount and the seller at the exact moment the buyer
  is most exposed, and adds a tap to the critical path.
- **The sheet** keeps the escrow context on screen, has unlimited vertical room, and is the
  pattern every payment product already uses.

`--scrim: rgba(20,22,26,.34)` is already defined in `tokens.css` and currently has no
consumer. The sheet is what it was for.

---

## The sheet

A white panel rising from the bottom edge over a scrim.

```
.paysheet   position absolute; left/right 0; bottom 0
            background --surface
            border-radius --r-4 --r-4 0 0
            box-shadow --elev
            padding: var(--s-5) var(--gutter) var(--s-6)
.paysheet::before   grab handle — 36×4, --line-2, --r-full, centred
.payscrim   position absolute; inset 0; background var(--scrim)
```

Motion: `--t-layer` (240ms) on `--ease`, translateY from 100%.

### The rule that makes it correct

**The sheet must never cover the amount.** Max height is capped so the `.balance` block
above stays visible — roughly 60% of the artboard, ~500px.

A buyer typing a card number for a stranger must be able to see
`GH₵ 450.00 · Akosua's Closet · held until you confirm` the entire time. This is the only
reason to prefer a sheet over a form screen, so if the sheet ever grows tall enough to
swallow the balance block, the component is being misused. Long content scrolls **inside**
the sheet; the sheet does not grow.

---

## Method rows

Methods are **rows, not tiles.** Tiles suit the carrier picker — three short peers, mark-led,
no explanation needed. Methods each need a sentence, which is row content.

| Method | Sub-line | Buyer pays |
|---|---|---|
| Mobile money | MTN, Telecel, AT · instant | **GH₵ 450.00** |
| Card | Visa, Mastercard · instant | **GH₵ 456.75** |
| Bank | Instant, or transfer within a day | **GH₵ 450.00** |

### Each row prices itself

Every row shows **the real total the buyer will pay by that method** — never a bare
percentage. `inputs.html` already states this rule for the vendor fee: *"the fee is shown
as a real figure, never a percentage alone."*

The card surcharge is therefore a visible **GH₵ 6.75**, not a `+1.5%` discovered later on a
statement. For a product whose promise is no surprises, burying it would be the most
off-brand decision available.

### Behaviour

Selecting a row expands it in place and reveals that method's controls. The other two
collapse to compact rows but stay reachable — no back-and-forth.

- **Mobile money expanded** — the existing three `.ctile` carrier tiles, then the number field.
- **Card expanded** — card number (full width), expiry + CVV (split row), name on card.
- **Bank expanded** — a list of supported banks. The row and its picker **are built this
  round**, so all three methods are genuine peers. What is deferred is only what happens
  *after* a bank is chosen on the manual-transfer path — see *Deferred* below.

### Styling

```
.mrow        --surface, 1px --line, --r-2, padding 14px var(--s-4)
.mrow.sel    border-color --ink
.mrow .mt    15/700          title
.mrow .ms    12.5/500 --ink-3  sub-line
.mrow .mv    15/700 tabular, right   total for this method
```

---

## Changes to `pay-deposit`

1. The inline carrier block and number field are **replaced by one summary row**:

   ```
   Payment method
   MTN MoMo · +233 24 123 4567                    ›
   ```

   Tapping it opens the sheet. Before a method is chosen it reads *"Choose a method"*.

2. This frees roughly **110px**, which is spent restoring the `wash-secure` banner that
   was deleted to make room for the inline carriers.

3. **Primary CTA becomes `Pay GH₵ 450.00`**, replacing "Send payment prompt". The last
   thing read before authorising is the amount.

### Where payment is confirmed

Refined from the brainstorm to remove a double confirmation:

- The **sheet** chooses the method and captures credentials. Its CTA is
  **"Use this method"** — it closes the sheet and updates the summary row.
- **`pay-deposit`** authorises. Its CTA is **"Pay GH₵ 450.00"**, disabled until a method is set.

One unambiguous payment moment. A first-time buyer taps twice (choose, then pay); a
returning buyer taps once.

---

## Cards to produce

| Card | State |
|---|---|
| `screens/pay-deposit.html` | revised — summary row, restored banner, new CTA |
| `screens/pay-method.html` | **new** — sheet open, three methods, mobile money expanded |
| `screens/pay-card.html` | **new** — sheet open, card method expanded |
| `components/chrome.html` | add the sheet + scrim beside the other floating layers |

### System changes

- `tokens.css` — add `.payscrim` / `.paysheet`. `--scrim` gains its first consumer.
- `SPEC.md` — document the sheet, the never-cover-the-amount rule, and the
  real-figure-per-method pricing rule.

---

## Deferred — specced, not built

These are product changes, not screens, and are deliberately out of this round.

1. **Bank manual transfer screen.** Receiving bank, account number and the reference
   `CR-89201`, with instructions to transfer from the buyer's own banking app. (Ghana uses
   bank name plus account number — there is no sort code.)

2. **A new lifecycle state.** None of the twelve existing states covers "the buyer has
   committed to pay but the money has not arrived." Manual transfer needs something like
   `AWAITING_TRANSFER` → *"Awaiting your transfer"*, caution-toned, distinct from
   `AWAITING_DEPOSIT` (which means nothing has been initiated at all).

3. **Knock-on to the seller.** This is the significant one. Today the seller is *"cleared
   to ship"* the instant the buyer pays. With a pending bank transfer that is no longer
   true — `transaction-status` must distinguish *money secured* from *payment promised*,
   or a seller will ship against a transfer that never lands.

Item 3 changes the escrow state machine and must not be improvised into a screen.

---

## Success criteria

- All three methods reachable, none pre-selected, none visually dominant.
- The amount stays visible behind the sheet at every step.
- Card surcharge shown as a cedi figure before the buyer commits.
- `pay-deposit` still fits 390×844 with zero overflow.
- No gradients, no blur, no raster in UI chrome; contrast ≥4.5:1 on all text.

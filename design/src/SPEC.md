# Croe UI v2 — "The Ledger" — Card Authoring Contract

Croe is a mobile escrow app for social commerce in Ghana. v2 design language: **editorial
minimalism — escrow as a beautifully-set financial document.** Warm bone paper, ink
typography, hairline rules, dotted receipt leaders, rubber-stamp status marks, one electric
cobalt accent used small and seldom. Calm is still the law: caution is warm ochre, NEVER red.

## Hard rules (verify before returning)

1. **First line exactly**: `<!-- @dsCard group="<Group>" name="<Card Name>" subtitle="<one-liner>" -->`
   Groups: `Foundations`, `Components`, `Screens`, `Flows`.
2. Standalone HTML with `<title>Croe — <Card Name></title>` and these fonts in `<head>`:
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..700&family=Schibsted+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
   ```
3. Copy the ENTIRE `design/src/tokens.css` verbatim into a `<style>` block, card CSS after it.
4. **BANNED — automatic failure**: any `gradient(` of any kind; any `box-shadow` (except `none`);
   the fonts Inter / Outfit / Roboto / Open Sans; emojis anywhere; red hues (#DC2626, #EF4444,
   crimson, etc. — the ONLY red-family value permitted is the 8px Telecel brand dot `#E60000`);
   JavaScript; external images; icon fonts.
5. Icons are nearly extinct in v2. Prefer typography: caps labels, mono data, serif arrows (→ ↑ ↓),
   ghost numerals, stamps. When an icon is truly needed (statusbar chrome, a padlock, a camera),
   draw a small inline SVG, stroke-width 2.2, round caps, in ink or the state color — never a
   whole icon system per screen. Max ~3 pictorial icons per screen.
6. **Screens**: one `.phone` artboard (390×844), structure: statusbar (mono `09:41` left; right
   three tiny ink SVGs: signal bars, wifi arcs, battery) → optional navheader → `.screen-body`
   → optional `.tabbar` (text-only: HOME / ESCROWS / WALLET / PROFILE, active gets top rule)
   → `.home-indicator`. Page background stays `#EBE9E4` so the bone artboard reads as a device.
7. **Foundations/Components**: white specimen page (`body{background:#fff;padding:40px}`),
   content `max-width:760px`, rows labeled with `.t-cap` caps labels, separated by `.rule`
   hairlines — no boxed cards around every specimen.
8. Money is set in Fraunces with the cedi sign: `GH₵ 450.00` (`.t-amount` / `.note .amt`;
   `<span class="cur">GH₵</span>` small-raised inside big amounts). Phones: `+233 24 123 4567`.
   Refs in mono: `NO. CR-89201`.
9. Copy voice unchanged from v1 (micro-empathy, reassure-first). No backend enums to users —
   mono enum annotations are allowed ONLY on specimen pages as designer documentation.

## The signatures (use them — this is the creativity)

- **The Escrow Note** (`.note`): white sheet, 1.5px INK border, mono caps header row
  (`HELD IN TRUST · NO. CR-89201`), giant Fraunces amount, dotted `.leader` rows for
  item/buyer/date, a `.perf` perforation line (dashed, with two paper-colored notches) before
  the footer, and where secured — the rotated circular `.seal` reading `● SECURED ● CROE ESCROW`.
- **Dotted leaders** (`.leader`) for every label→value pair. Receipt DNA.
- **Ledger timeline** (`.ledger`/`.entry`): diamond ticks (rotated squares), 1px rails,
  right-aligned mono timestamps. Done = ink, current = cobalt, pending = faint outline.
- **Stamps** (`.stamp`): mono caps, 1px border in state color, washed background.
  secure=blue, hold=ochre, done=green, idle=warm gray. The word does the work.
- **Ghost numerals** (`.ghost-num`): outlined Fraunces `01 02 03` marking steps/sections.
- **Asides** (`.aside`): 2px left rule + text, replacing v1's tinted banner boxes.
- **Kente strip** (`.kente` with inline flat SVG or `<i>` blocks in gold/ink/cobalt/paper):
  ONE thin 4px strip, ONLY on brand moments (onboarding, payout/refund success, wallet note).
- **Serif arrows**: buttons end with `<span class="arr">→</span>`, not chevron icons.

## Status → stamp mapping

| State | Stamp text | Class |
|---|---|---|
| LINK_CREATED | LINK LIVE | stamp-idle |
| AWAITING_DEPOSIT | AWAITING PAYMENT | stamp-hold |
| FUNDS_SECURED | SECURED | stamp-secure |
| SHIPPED | IN TRANSIT | stamp-secure |
| DELIVERED_CONFIRMED | DELIVERED | stamp-done |
| FUNDS_RELEASED | PAID OUT | stamp-done |
| DISPUTE_OPENED / AI_PROCESSING | IN REVIEW | stamp-hold |
| UNDER_HUMAN_REVIEW | SPECIALIST REVIEW | stamp-hold |
| FUNDS_REFUNDED | REFUNDED | stamp-done |
| EXPIRED | EXPIRED | stamp-idle |
| CANCELLED | CANCELLED | stamp-idle |
| FRAUD_LOCKOUT | ACCOUNT PAUSED | stamp-hold |

## Copy bank (verbatim where it fits; no emojis)

- "Funds Safely Locked" / "The amount is frozen in escrow. Neither party can access it until this review is resolved."
- "We've safely paused this transaction. Our automated review is checking the delivery details to sort it out fairly."
- "Photo verified and secured. Your evidence is timestamped and protected against tampering."
- "Our impartial review engine is comparing both claims against the original listing…"
- Vendor secured notice: "Good news — the buyer's payment for order CR-89201 is safely secured in Croe. You're cleared to ship."
- Escrow explainer: "Your money is held safely by Croe — the seller is only paid after you confirm delivery."
- Frozen: "Your account is temporarily paused while we review recent activity. Money already in escrow stays protected and will resolve normally."

## Sample data

Vendor **Akosua's Closet** (Akosua Mensah, trust 98, 214 deliveries) · Buyer **Kwame O.**
Item "Nike Air Max 270 — size 43, white/volt" · `GH₵ 450.00` · ref `CR-89201`
History: iPhone 13 case GH₵ 85.00 · Ankara dress GH₵ 320.00 · JBL Flip 6 GH₵ 780.00
Carriers: MTN MoMo (#FFCC00 dot) · Telecel (#E60000 dot, 8px only) · AT Money (#004F9F dot)

---

# CARD BRIEFS

## Foundations

**foundations/colors.html — "Color"** — Specimen page. Section PAPER & INK: six swatch rows
(paper, card, ink, ink-soft, gray, faint) each a flat block + name + hex + usage, separated by
hairlines. Section THE ACCENT: one full-width cobalt block (56px tall) captioned "Cobalt
#2547F4 — links, seals, the present moment. If everything is blue, nothing is." Section
STATES: 4 stamp specimens (SECURED/AWAITING PAYMENT/PAID OUT/EXPIRED) with bg+text hex
annotations in mono. Closing aside: "There is no red in Croe…" (keep the fight-or-flight line).

**foundations/typography.html — "Typography"** — Fraunces (display, amounts) / Schibsted
Grotesk (UI) / IBM Plex Mono (data). Big "GH₵" glyph moment: an amount specimen
`GH₵ 1,635.00` at 56px. Scale rows w/ right mono annotations: Display 34/40·500, Headline
22/28·500, Title 16/22·600, Body 14/22·400, Caps 11/16·600·+0.09em, Mono 12/18. Sample lines
use real product copy.

**foundations/spacing-shape.html — "Spacing & Shape"** — 8pt bar scale (4→40) in ink bars +
mono labels; radius specimens (tag 4 / control 8 / sheet 12) as outlined shapes; a "depth
without shadows" pair: hairline sheet vs ink-border note, caption "Depth is drawn, not cast —
1px lines, two border weights, zero shadows." Show a `.perf` perforation specimen + a
`.leader` dotted-leader specimen.

**foundations/voice.html — "Voice & Copy"** — Keep v1's four do/don't pairs (dispute opened,
photo uploaded, recycled photo, AI processing). ❌ set in mono on ink block; ✅ set as body
text on paper with a 2px ink left rule. Header aside: "Reassure first, explain second, act
third."

## Components

**components/buttons.html — "Buttons"** — Rows: Ink (default/pressed #33302B/disabled
#DAD6CE+faint text), Line, Quiet, Hold (ochre — "Open a dispute"), Small pair, full-width
"Continue →" with serif arrow. Note: "One ink button per screen. The arrow is a glyph, not
an icon."

**components/inputs.html — "Inputs"** — Text field w/ caps label + helper; phone field
(mono +233 prefix, focus = ink border + cobalt caret); amount field (mono GH₵ prefix + serif
24px numerals); textarea; OTP as one segmented `.otp-row` (472 filled, 4th active w/ caret);
carrier `.choice` list rows (MTN selected) each w/ 8px brand dot + mono network name.

**components/stamps.html — "Stamps"** — All 12 lifecycle stamps from the mapping table,
grouped IN MOTION / HELD / COMPLETE / CLOSED with hairline separators and mono enum
annotations (specimen page, enums allowed here). Plus the circular `.seal` specimen rotated
-8°. Footer: "Ochre means 'being sorted out', never 'you're in trouble'."

**components/note.html — "The Escrow Note"** — The centerpiece specimen at full width (~420px):
mono header `HELD IN TRUST · NO. CR-89201` + SECURED stamp; `GH₵ 450.00` at 52px; three
dotted leaders (Item/Buyer/Secured date); perforation; footer row "Croe fee 2.5% ·
GH₵ 11.25" + rotated seal overlapping the right edge. Below, two sibling specimens: compact
transaction row (thumb-less: serif amount + stamp + leaders) and the WhatsApp link preview
reimagined: white bubble, 2px ink left border, mono CROE ESCROW header, serif item+price,
dotted leader to `croe.app/pay/CR-89201`.

**components/ledger.html — "Ledger Timeline"** — Vertical dispute ledger (Opened done w/ mono
`14:32` · Automated review current-cobalt w/ engine copy · Resolution pending "usually
within 10 seconds") + horizontal 4-step variant (PAID→SECURED→IN TRANSIT→DELIVERED) as
diamond ticks on a 1px rail with mono caps labels.

**components/chrome.html — "Chrome & Asides"** — Navheader specimen (back circle + serif
title + stamp right); text-only tabbar specimen (ESCROWS active); three asides (ink=info,
gold=caution/frozen copy, cobalt=secure explainer); toast: ink bar, white mono text
"LINK COPIED"; kente strip specimen with usage note ("brand moments only — once per screen").

## Screens (all .phone 390×844)

**screens/onboarding.html — "Onboarding"** — No navheader. Top: kente strip (the only one in
the app's chrome), then wordmark `croe` set in Fraunces 30px with a cobalt full stop, mono
tagline `ESCROW FOR THE DMS`. Center: display serif "Sell to strangers. Trust the paper." +
body explainer; then three ghost-numeral rows (01 Money held safely / 02 Instant MoMo payout /
03 Fair review in minutes — title+caption each, hairline-separated). Bottom: btn-ink
"Get started →", btn-quiet "I already have an account".

**screens/auth-phone.html — "Sign in — Phone"** — Back circle. Display "What's your number?" +
body "We'll text you a code. No passwords, ever." Phone field focused (mono +233, cobalt
caret) + helper. Cobalt aside: "Croe never sees your MoMo PIN. Payments are approved on your
phone, by you." Bottom: btn-ink "Send my code →" + mono legal microline.

**screens/auth-otp.html — "Sign in — OTP"** — Back circle. Display "Enter the code" + body
"Sent to +233 24 123 4567 · Wrong number?" (cobalt link). Segmented otp-row (4·7·2 filled,
4th active). Centered mono countdown `RESEND IN 00:42`. btn-ink "Verify →". Quiet hint line
about SMS delays (hairline-topped, not boxed).

**screens/home.html — "Home"** — Greeting row (avatar `AM` ink-outlined, caps `GOOD AFTERNOON`
+ serif "Akosua's Closet", mono bell count `2` in a hairline circle). THE ESCROW NOTE as
hero: `IN TRUST · 3 ESCROWS`, `GH₵ 1,635.00`, leaders (Awaiting action ···· 2 / Protection
···· Active), perforation, footer "Croe holds it until buyers confirm." Button row: btn-ink
sm "New link →" + btn-line sm "Withdraw". Caps section `OPEN ESCROWS` + 3 `.row` items
(serif amounts right, stamps: IN TRANSIT / AWAITING PAYMENT w/ "expires in 21h" caption /
SECURED w/ "ship within 48h" caption). Foot line: mono `TRUST 98 · EXCELLENT` + caption.
Tabbar (HOME active).

**screens/create-escrow.html — "Create Escrow Link"** — Back + serif "New escrow link".
Fields: item (filled), amount (GH₵ serif 450.00) + fee helper; DELIVERY choice pair (Meet-up /
Courier selected); protection-window leader row (Buyer protection ···· 24h after delivery);
gold aside "Links above GH₵ 5,000.00 need Tier 2 verification — Upgrade →". btn-ink "Create
secure link →" + caption "Share it in WhatsApp, Instagram, anywhere."

**screens/link-created.html — "Link Created"** — Close circle. Centered: rotated cobalt seal
(LINK LIVE · CROE), display "Your link is live", body share-explainer. The reimagined chat
preview (ink-left-border bubble on a flat #EFEDE8 chat area). Link line: mono
`croe.app/pay/CR-89201` with dotted underline + COPY mono button. btn-ink "Share to
WhatsApp →", btn-line "More options". Mono footer `HOLDS PRICE FOR 24H`.

**screens/pay-deposit.html — "Buyer — Pay Into Escrow"** — Header: mono `CROE SECURE
PAYMENT` + padlock glyph. Seller row (avatar, serif name, mono `TRUST 98 · 214 DELIVERIES`,
stamp-done VERIFIED). Escrow note (buyer-facing): `YOU'RE PAYING INTO TRUST`, GH₵ 450.00,
leaders (Item / Seller / Protection ···· until you confirm). Cobalt aside w/ explainer copy.
PAY WITH MOMO caps + 3 carrier choices (MTN selected) + phone field. btn-ink "Send payment
prompt →" + mono foot "APPROVED ON YOUR PHONE · CROE NEVER SEES YOUR PIN".

**screens/deposit-pending.html — "Buyer — Approve on Phone"** — Back + serif "Almost there".
Centered: giant Fraunces `GH₵ 450.00` with mono cap `WAITING FOR YOUR PIN` above it and a
cobalt dotted ring around a phone glyph (flat, no pulse fills). Ledger (3 entries): Prompt
sent done-`13:58` / Waiting for your approval current-cobalt / Locked & seller notified
pending. btn-quiet "Didn't get the prompt? Resend". Foot caption re: busy networks + "Your
money never moves without your PIN."

**screens/transaction-status.html — "Transaction Status"** — Back + mono `NO. CR-89201` +
SECURED stamp. Escrow note: `HELD IN TRUST`, GH₵ 450.00, leaders (Buyer ···· Kwame O. /
Paid ···· today 13:58), perf, seal small. Horizontal 4-tick rail (PAID·SECURED done, IN
TRANSIT next, DELIVERED pending). Ink aside w/ vendor secured copy. btn-ink "Mark as
shipped →", btn-line "Message buyer on WhatsApp". Hairline, then quiet dispute line: ochre
text "Something wrong? Open a dispute" + caption "Free · resolved in minutes". Tabbar
(ESCROWS active).

**screens/dispute-open.html — "Open a Dispute"** — Back + serif "Open a dispute". Cobalt
aside FIRST: "Funds Safely Locked — GH₵ 450.00 stays frozen…" caps label WHAT WENT WRONG +
4 `.choice` rows (Item never arrived selected). Caps TELL US WHAT HAPPENED + filled textarea
+ helper "Facts help our review resolve this faster." Caps EVIDENCE + dashed-tile "Add
photos (up to 5)" + one uploaded row: mono `IMG_2041.JPG · 14:31` + stamp-done VERIFIED.
btn-ink "Submit for review →" + caption "Median resolution: under 10 seconds."

**screens/dispute-status.html — "Dispute Status"** — Back + mono `NO. CR-89201` + IN REVIEW
stamp. Zone 1: escrow note variant — `FROZEN IN TRUST`, GH₵ 450.00, "Neither party can access
it until this review is resolved." + small seal. Zone 2 caps `THE REVIEW` + ledger (Opened
done 14:32 w/ "both of you were notified" / Automated review current-cobalt w/ engine copy /
Resolution pending w/ "usually within 10 seconds — a specialist steps in only if it's
genuinely unclear"). Zone 3 caps `EVIDENCE SECURED` + 2 rows (IMG_2041.JPG mono + VERIFIED
stamp; LISTING SNAPSHOT + LOGGED stamp) + padlock microcopy line. Bottom: btn-line "Message
support".

**screens/dispute-resolved.html — "Dispute Resolved"** — Close + mono ref + REFUNDED stamp.
Centered: rotated seal in done-green (REFUNDED · IN FULL), display "It's sorted — you're
refunded", body "GH₵ 450.00 is on its way back to your MTN MoMo wallet…". Sheet `WHAT OUR
REVIEW FOUND` (serif quote-style finding) + mono `AUTOMATED REVIEW · CONFIDENCE 0.96 ·
REF AR-1182`. Receipt leaders: Refund ···· GH₵ 450.00 / To ···· MTN MoMo ···6543 / Fee ····
GH₵ 0.00, then kente strip (success moment). btn-line "Back to home", quiet "Request a human
review" + caption.

**screens/kyc.html — "Verification (KYC)"** — Back + serif "Verification". Three tier rows,
ghost numerals 00/01/02: 00 Phone verified done (mono `UP TO GH₵ 500.00`), 01 Ghana Card
verified — ink-bordered, stamp-secure ACTIVE (`UP TO GH₵ 5,000.00`), 02 Enhanced — faint,
mono `UP TO GH₵ 50,000.00` + btn-line sm "Upgrade". Caps GHANA CARD + two dashed tiles
(FRONT / BACK, camera glyph allowed). Gold aside: ID privacy copy ("…only a fingerprint of
the number, not the number itself."). btn-ink "Submit for review →" + caption "Reviews
complete within 24 hours."

**screens/wallet.html — "Wallet & History"** — Serif "Wallet" header (no back). Escrow note:
`AVAILABLE TO WITHDRAW`, GH₵ 2,340.00, leaders (In escrow ···· GH₵ 1,635.00 / Lifetime ····
GH₵ 18,450.00), perf, kente strip inside note footer. btn-ink sm "Withdraw to MoMo →" +
btn-line sm "Statement". Caps THIS WEEK + 4 ledger-style rows w/ serif signed amounts
(+GH₵ 438.75 done-green PAID OUT / GH₵ 780.00 HELD / −GH₵ 85.00 REFUNDED / GH₵ 320.00 faint
EXPIRED) each w/ mono date-caption. Mono foot `PAYOUTS ARRIVE IN MINUTES · FEE 2.5%
DEDUCTED`. Tabbar (WALLET active).

## Flows

**flows/journey.html — "End-to-End Journey"** — White landscape page (max-width 1080).
Display title "One deal, three protected moments" + sub. A single horizontal 1px rail with
six diamond ticks, ghost numerals 01–06 above, serif step titles + captions below (Create
link / Buyer pays / FUNDS SECURED — cobalt tick + seal mini / Ship & track / Buyer confirms /
Instant payout), stamps under each. Below a hairline: the dispute branch as an indented
ledger (ochre ticks): Dispute opened → Automated review (<10s) → Fair outcome, with the
"humans only for the genuinely ambiguous ~20%" note set as a serif pull-quote with a 2px
gold left rule.

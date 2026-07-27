# Croe — Onboarding Illustration Prompts

Seven standalone image-generation prompts in one shared style: **Retro Halftone Editorial
Line Illustration v1.0** — heavy hand-inked black outlines, coarse visible halftone dot
midtones, three values, no colour.

Each `.json` is **self-contained**. Paste the `prompt` string into any image model and the
`negative_prompt` array into its negative field. Nothing needs to be assembled from a
shared file.

## The set

| File | Slot | Copy it sits under |
|---|---|---|
| `01-welcome.json` | Onboarding hero | Sell to strangers. Get paid safely. |
| `02-held-safely.json` | Value 1 | The buyer pays into escrow, not into your inbox. |
| `03-momo-payout.json` | Value 2 | Confirmed delivery releases your money in minutes. |
| `04-fair-review.json` | Value 3 | If something goes wrong, an impartial review sorts it out. |
| `05-verify-number.json` | Auth — phone / OTP | Croe never sees your MoMo PIN. |
| `06-verify-identity.json` | KYC — Ghana Card | Ghana Card unlocks higher limits. |
| `07-ready.json` | End of carousel / first empty state | Get started |

## Three decisions baked in

**Ground is `#F1F1EF`, not cream.** The reference style sits on `#F7F2E8`, which would read
as a warm patch against Croe's `--canvas`. The ink and halftone relationship is what carries
the style, not the paper — so the ground was swapped and nothing else changed. Cream is kept
in each file's `caption_variant` for marketing exports.

**No text in the image.** Every prompt bans text. Copy is rendered in-app in Plus Jakarta
Sans, sentence case, per the type system. The reference style's lowercase Helvetica caption
lives only in `caption_variant`, for social and store screenshots.

**Monochrome.** `SPEC.md` states there is no decorative colour in Croe, which this style
already satisfies. `03-momo-payout.json` carries an optional `#1FC16B` spot under
`spot_color_option`, defaulted **off** — turn it on only if the green maps to a real
`--secure` state rather than decorating the screen.

## Generation protocol

1. Generate `01-welcome` first. Lock the seed.
2. Reuse that seed across all seven, in one session. This style drifts most visibly on line
   weight and dot size.
3. Paste each `prompt` **verbatim** — paraphrasing the style clauses is what breaks the set.
4. Run each file's `qa_checklist` before accepting an output.
5. If a model renders halftone as smooth grey, append `visible individual dots, dot pattern
   clearly countable` and regenerate — do not fix it in post.
6. Export at 2048px, place at 50% so the dot screen stays crisp at 3x.

`04-fair-review` is the hard one. The subject attracts courtroom, gavel and robot imagery,
all of which read as blame — which the voice spec forbids. Its file carries an extended
negative list and a `regeneration_note`.

## Placement

Sits in `.screen-body` above `.t-display`. Ground matches `--canvas` exactly, so the
illustration dissolves into the screen with no plate, no border, no radius.

On a white sheet instead, switch the ground to `#FFFFFF` (`--surface`), leave ink and dots
untouched, and clip to `var(--r-4)` (24px).

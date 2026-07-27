# Onboarding illustrations

The four `onboarding-*.webp` files are derived from the masters in
`design/assets/*.png`. They are committed rather than generated at build time so
the app has no image-processing dependency.

## Budget

`design/src/SPEC.md` sets a hard budget for this set: **80 KB per image, 320 KB
for the set**, at roughly 1050px on the long edge, in WebP. The reasoning is in
the spec — Croe's users are on prepaid Ghanaian mobile data, and onboarding art
that costs someone money before they have seen a screen is a product failure.

Current set: **65.1 KB total**, largest file 21.8 KB.

## Aspect

Each image is resized to its frame's exact ratio. The frame does not letterbox
and does not crop to rescue a mismatch.

| File | Frame | Output |
|---|---|---|
| `onboarding-01-locked-chat.webp` | 1:1 panel | 1050 × 1050 |
| `onboarding-02-escrow-vault.webp` | 1:1 panel | 1050 × 1050 |
| `onboarding-03-momo-payout.webp` | 1:1 panel | 1050 × 1050 |
| `onboarding-04-two-roles.webp` | 3:1 role band | 1050 × 350 |

## Regenerating

Requires `sharp`, which is not a project dependency — run it through `npx` from
any scratch directory:

```bash
npx --yes --package=sharp node -e "
const sharp = require('sharp');
const jobs = [
  ['onboarding-01-locked-chat', 1050, 1050],
  ['onboarding-02-escrow-vault', 1050, 1050],
  ['onboarding-03-momo-payout',  1050, 1050],
  ['onboarding-04-two-roles',    1050,  350],
];
for (const [name, w, h] of jobs) {
  sharp('design/assets/' + name + '.png')
    .resize(w, h, { fit: 'cover' })
    .webp({ quality: 86, effort: 6 })
    .toFile('mobile/assets/images/' + name + '.webp');
}
"
```

Run from the repo root. All four land under budget at quality 86; if a future
master does not, step quality down in increments of 4 rather than shrinking the
dimensions — 1050px is already only 3× the 350px frame.

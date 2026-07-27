# Croe Brand Mark ("Aperture") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Croe brand mark — a derived-geometry SVG master, six generated app icon assets, a per-pair-kerned logotype component, and the Foundations card that documents them.

**Architecture:** One TypeScript module owns the mark's geometry and *solves* the mouth angle from the dot rather than hard-coding it; unit tests assert that invariant, and a Node script consumes the same module to emit every PNG. The logotype's kerning table lives in a second pure module so it is unit-testable in the existing Node-environment Jest setup, with a thin React Native component rendering it. Nothing in the app renders SVG — the mark reaches the app only as generated PNGs, so no new runtime dependency is added.

**Tech Stack:** TypeScript, React Native / Expo SDK 54, Jest + ts-jest (Node environment), `sharp` (SVG → PNG rasterisation, dev only), `tsx` (running the TS geometry module from a Node script, dev only).

## Global Constraints

Copied verbatim from [the spec](../specs/2026-07-27-croe-brand-mark-design.md). Every task's requirements implicitly include this section.

- **The mouth angle is derived, never chosen.** `M = 2·asin((dotØ + stroke) / 2r)`. If the dot or the stroke changes, the mouth must be re-solved. Never hard-code a mouth angle.
- **The dash arithmetic is only valid with `stroke-linecap: round`.** Round caps extend each dash by `stroke/2` at both ends, so the dash-array gap is the visible gap **plus one stroke width**. Changing the cap style silently changes the mouth.
- **Standard drawing:** `r 25`, `stroke 11.5`, `dot r 9`, arc centre `(51.5, 50)`, dot at `(50, 50)`. Mark span **61.5** of a 100 viewBox.
- **Micro drawing (≤ 24 px only):** `r 26`, `stroke 13`, `dot r 10`, concentric at `(50, 50)`. Mark span **65**.
- **Colours — no new values enter the system.** Ink `#17181B`, on-ink `#FFFFFF`, secure `#1FC16B`, canvas `#F1F1EF`.
- **Exactly one green dot per lockup.** With the mark present the wordmark is `croe` (no full stop). Standing alone it is `croe.` with the green full stop.
- **The final glyph's tracking is 0.** `letterSpacing` applies after every glyph including the last.
- **No gradients, no shadows, no outlines, no glows** anywhere in the mark or its assets.
- **Aperture gap floor:** the gap between dot and stroke must render at **≥ 1.5 px** at the smallest size each drawing is used at (standard 20 px, micro 16 px).

---

## File Structure

| File | Responsibility |
|---|---|
| `mobile/src/brand/markGeometry.ts` | **Create.** The mark's single source of truth: specs, the mouth solve, dash/rotation derivation, SVG string builder. Pure — no I/O, no React, no Node APIs. |
| `mobile/src/__tests__/mark-geometry.test.ts` | **Create.** Asserts the derived invariants rather than the hand-written numbers. |
| `mobile/src/brand/wordmarkKerning.ts` | **Create.** Per-pair tracking table and em→points conversion. Pure. |
| `mobile/src/__tests__/wordmark-kerning.test.ts` | **Create.** Asserts the table and the zero-trailing rule. |
| `mobile/src/theme/components/Wordmark.tsx` | **Create.** Thin RN renderer over `wordmarkKerning`. Replaces duplicated inline styles in two screens. |
| `mobile/src/screens/OnboardingScreen.tsx` | **Modify.** Adopt `<Wordmark/>`; delete local `brandText`/`brandDot`/`brand` styles. |
| `mobile/src/screens/auth/PhoneInputScreen.tsx` | **Modify.** Same. |
| `mobile/scripts/gen-icons.mjs` | **Create.** Asset recipes + `sharp` rasterisation. Knows the asset list; knows nothing about geometry. |
| `mobile/package.json` | **Modify.** Add `sharp` + `tsx` devDeps and the `icons` script. |
| `mobile/app.json` | **Modify.** Adaptive-icon ground → ink, drop `backgroundImage`, add splash config. |
| `mobile/assets/android-icon-background.png` | **Delete.** Replaced by `adaptiveIcon.backgroundColor`. |
| `design/brand/mark.svg`, `mark-micro.svg` | **Generated.** Handoff masters, emitted by the generator — never hand-edited. |
| `design/cards/foundations/brand.html` | **Create.** The design-system card. |

### Two deviations from the spec, and why

1. **The spec says the generator "reads two SVG masters".** It doesn't — it *emits* them from `markGeometry.ts`. Hand-written SVG masters would put the solved dash arrays in a file no test can check, which defeats spec success criterion 7. The `.svg` files remain as designer handoff artifacts; the TypeScript module is the master.
2. **Geometry lives in `mobile/src/`, not `design/`.** Jest's `roots` is `<rootDir>/src`, so this is the only location where the invariants get tested on every `npm test` with zero config changes. It is also forward-compatible: if the mark is ever drawn in-app via `react-native-svg`, the geometry is already there.

---

## Task 1: Mark geometry, with the invariant under test

**Files:**
- Create: `mobile/src/brand/markGeometry.ts`
- Test: `mobile/src/__tests__/mark-geometry.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type MarkSpec = { r: number; stroke: number; dotR: number; arcCx: number }`
  - `const STANDARD: MarkSpec`, `const MICRO: MarkSpec`
  - `const DOT_CX = 50`, `const DOT_CY = 50`, `const VIEWBOX = 100`
  - `markSpan(spec: MarkSpec): number`
  - `solveMouthAngle(spec: MarkSpec): number`
  - `clearOpening(spec: MarkSpec, mouthDeg: number): number`
  - `apertureGap(spec: MarkSpec): number`
  - `type DashSpec = { mouthDeg: number; dash: number; gap: number; rotate: number; circumference: number }`
  - `dashSpec(spec: MarkSpec): DashSpec`
  - `type SvgOptions = { size: number; stroke: string; dot: string; coverage?: number; ground?: string; radius?: number }`
  - `buildMarkSvg(spec: MarkSpec, opts: SvgOptions): string`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/__tests__/mark-geometry.test.ts`:

```ts
import {
  STANDARD,
  MICRO,
  MarkSpec,
  markSpan,
  solveMouthAngle,
  clearOpening,
  apertureGap,
  dashSpec,
  buildMarkSvg,
} from '../brand/markGeometry';

const VARIANTS: Array<[string, MarkSpec]> = [
  ['standard', STANDARD],
  ['micro', MICRO],
];

describe('the mouth is solved from the dot', () => {
  it.each(VARIANTS)(
    '%s: the clear opening is exactly one dot diameter',
    (_name, spec) => {
      const mouth = solveMouthAngle(spec);
      expect(clearOpening(spec, mouth)).toBeCloseTo(spec.dotR * 2, 9);
    },
  );

  it('re-solves when the dot changes, instead of staying put', () => {
    const fatter: MarkSpec = { ...STANDARD, dotR: 10 };
    expect(solveMouthAngle(fatter)).toBeGreaterThan(solveMouthAngle(STANDARD));
    expect(clearOpening(fatter, solveMouthAngle(fatter))).toBeCloseTo(20, 9);
  });

  it('the two drawings agree on the relationship and share no numbers', () => {
    expect(solveMouthAngle(STANDARD)).not.toBeCloseTo(solveMouthAngle(MICRO), 3);
    expect(markSpan(STANDARD)).not.toBeCloseTo(markSpan(MICRO), 3);
  });
});

describe('the dash array', () => {
  it.each(VARIANTS)('%s: dash + gap covers the circle exactly once', (_n, spec) => {
    const d = dashSpec(spec);
    expect(d.dash + d.gap).toBeCloseTo(d.circumference, 9);
  });

  it.each(VARIANTS)('%s: the mouth lands on the horizontal', (_n, spec) => {
    const d = dashSpec(spec);
    const gapCentre = ((d.dash + d.gap / 2) / d.circumference) * 360;
    expect((gapCentre + d.rotate) % 360).toBeCloseTo(0, 6);
  });
});

describe('the aperture gap clears the rasterisation floor', () => {
  it('standard holds at 20px', () => {
    expect((apertureGap(STANDARD) / 100) * 20).toBeGreaterThanOrEqual(1.5);
  });

  it('micro holds at 16px', () => {
    expect((apertureGap(MICRO) / 100) * 16).toBeGreaterThanOrEqual(1.5);
  });

  it('standard would fail the floor if the dot left the centre', () => {
    const shifted: MarkSpec = { ...STANDARD, arcCx: STANDARD.arcCx + 3 };
    expect((apertureGap(shifted) / 100) * 20).toBeLessThan(1.5);
  });
});

describe('buildMarkSvg', () => {
  it('emits round caps, because the dash arithmetic depends on them', () => {
    const svg = buildMarkSvg(STANDARD, { size: 64, stroke: '#FFFFFF', dot: '#1FC16B' });
    expect(svg).toContain('stroke-linecap="round"');
  });

  it('is transparent unless a ground is asked for', () => {
    const bare = buildMarkSvg(STANDARD, { size: 64, stroke: '#FFF', dot: '#1FC16B' });
    expect(bare).not.toContain('<rect');

    const grounded = buildMarkSvg(STANDARD, {
      size: 64,
      stroke: '#FFF',
      dot: '#1FC16B',
      ground: '#17181B',
    });
    expect(grounded).toContain('<rect');
    expect(grounded).toContain('#17181B');
  });

  it('scales to a requested coverage', () => {
    const svg = buildMarkSvg(STANDARD, {
      size: 432,
      stroke: '#FFF',
      dot: '#1FC16B',
      coverage: 56,
    });
    expect(svg).toContain(`scale(${(56 / markSpan(STANDARD)).toFixed(5)})`);
  });

  it('carries no gradient, filter or shadow', () => {
    const svg = buildMarkSvg(MICRO, { size: 96, stroke: '#FFF', dot: '#FFF' });
    expect(svg).not.toMatch(/gradient|filter|shadow/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest src/__tests__/mark-geometry.test.ts`
Expected: FAIL — `Cannot find module '../brand/markGeometry' from 'src/__tests__/mark-geometry.test.ts'`

- [ ] **Step 3: Write the implementation**

Create `mobile/src/brand/markGeometry.ts`:

```ts
/**
 * Croe brand mark — "Aperture".
 *
 * An open C enclosing a single dot: the money, held. The concept is HOLDING,
 * never defending — there is no lock and no shield anywhere in this system.
 *
 * The one rule that governs every number here: THE CLEAR OPENING BETWEEN THE
 * TWO TERMINALS IS EXACTLY ONE DOT DIAMETER. The mouth angle is solved from
 * that, never chosen. It is the sentence the mark says — this is the only way
 * out, and it is the exact size of the thing leaving. A wider mouth means the
 * money could fall out; a narrower one means it can never leave, which is not
 * what escrow does.
 *
 * Spec: docs/superpowers/specs/2026-07-27-croe-brand-mark-design.md
 */

/** Geometry of one optical size of the mark, in viewBox units. */
export type MarkSpec = {
  /** Radius of the arc's centreline. */
  r: number;
  /** Stroke width. Round caps assumed — see dashSpec. */
  stroke: number;
  /** Dot radius. */
  dotR: number;
  /**
   * Arc centre x. The dot always sits at the tile's exact centre and the C is
   * nudged around it: the money is what the icon is centred on, and the
   * enclosure moves to suit it. A C is left-heavy, so its geometric centre
   * reads off by about 1.5 units.
   */
  arcCx: number;
};

export const VIEWBOX = 100;
export const DOT_CX = 50;
export const DOT_CY = 50;

export const STANDARD: MarkSpec = { r: 25, stroke: 11.5, dotR: 9, arcCx: 51.5 };

/**
 * For ≤ 24 px only — the favicon and the notification icon. A separate optical
 * size for small rendering is standard practice, not a hedge. The optical nudge
 * is dropped because at these sizes 1.5 units is a third of a pixel, and
 * concentric geometry buys back the clearance that matters more.
 */
export const MICRO: MarkSpec = { r: 26, stroke: 13, dotR: 10, arcCx: 50 };

/** Outer width of the mark, cap to cap. */
export function markSpan(spec: MarkSpec): number {
  return 2 * (spec.r + spec.stroke / 2);
}

/**
 * Solve the mouth so the clear opening equals one dot diameter.
 *
 * The two terminals sit on the centreline circle, so the straight-line distance
 * between their centres is the chord 2r·sin(M/2). Round caps each eat stroke/2
 * of that, so the clear opening is chord − stroke. Set that equal to the dot
 * diameter and solve for M.
 */
export function solveMouthAngle(spec: MarkSpec): number {
  const ratio = (spec.dotR * 2 + spec.stroke) / (2 * spec.r);
  return (2 * Math.asin(ratio) * 180) / Math.PI;
}

/** The clear gap between the two terminals, in viewBox units. */
export function clearOpening(spec: MarkSpec, mouthDeg: number): number {
  return 2 * spec.r * Math.sin((mouthDeg * Math.PI) / 360) - spec.stroke;
}

/**
 * Shortest distance from the dot's edge to the stroke's inner edge. This is the
 * number that decides whether the mark survives being rasterised small: below
 * about 1.5 px the gap silts up on a mid-range Android screen and the mark
 * becomes a blob.
 */
export function apertureGap(spec: MarkSpec): number {
  const offset = Math.abs(spec.arcCx - DOT_CX);
  return spec.r - spec.stroke / 2 - offset - spec.dotR;
}

export type DashSpec = {
  mouthDeg: number;
  dash: number;
  gap: number;
  rotate: number;
  circumference: number;
};

/**
 * stroke-dasharray + rotation placing the mouth on the horizontal, opening right.
 *
 * ROUND CAPS ARE LOAD-BEARING: they extend each dash by stroke/2 at both ends,
 * so the dash-array gap must be the visible gap PLUS one stroke width. Switch to
 * butt caps and the mouth silently widens by a whole stroke.
 */
export function dashSpec(spec: MarkSpec): DashSpec {
  const mouthDeg = solveMouthAngle(spec);
  const circumference = 2 * Math.PI * spec.r;
  const gap = (circumference * mouthDeg) / 360 + spec.stroke;
  const dash = circumference - gap;
  const gapCentreDeg = ((dash + gap / 2) / circumference) * 360;
  return { mouthDeg, dash, gap, rotate: 360 - gapCentreDeg, circumference };
}

export type SvgOptions = {
  /** Rasterisation size in px. The viewBox is always 100. */
  size: number;
  stroke: string;
  dot: string;
  /** Mark width as a fraction of the tile, in viewBox units. Defaults to natural. */
  coverage?: number;
  /** Solid background fill. Omitted means transparent. */
  ground?: string;
  /** Corner radius in viewBox units. Only meaningful alongside a ground. */
  radius?: number;
};

/** A complete, self-contained SVG document for one asset. */
export function buildMarkSvg(spec: MarkSpec, opts: SvgOptions): string {
  const { dash, gap, rotate } = dashSpec(spec);
  const scale = opts.coverage ? opts.coverage / markSpan(spec) : 1;

  const ground = opts.ground
    ? `<rect width="${VIEWBOX}" height="${VIEWBOX}"` +
      (opts.radius ? ` rx="${opts.radius}"` : '') +
      ` fill="${opts.ground}"/>`
    : '';

  // Scale about the tile centre, which is also the dot's centre.
  const open =
    scale === 1
      ? '<g>'
      : `<g transform="translate(${DOT_CX} ${DOT_CY}) scale(${scale.toFixed(5)}) ` +
        `translate(${-DOT_CX} ${-DOT_CY})">`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${opts.size}" ` +
    `height="${opts.size}" viewBox="0 0 ${VIEWBOX} ${VIEWBOX}">` +
    ground +
    open +
    `<circle cx="${spec.arcCx}" cy="${DOT_CY}" r="${spec.r}" fill="none" ` +
    `stroke="${opts.stroke}" stroke-width="${spec.stroke}" stroke-linecap="round" ` +
    `stroke-dasharray="${dash.toFixed(4)} ${gap.toFixed(4)}" ` +
    `transform="rotate(${rotate.toFixed(4)} ${spec.arcCx} ${DOT_CY})"/>` +
    `<circle cx="${DOT_CX}" cy="${DOT_CY}" r="${spec.dotR}" fill="${opts.dot}"/>` +
    `</g></svg>`
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd mobile && npx jest src/__tests__/mark-geometry.test.ts`
Expected: PASS — 12 tests.

- [ ] **Step 5: Confirm the solved values match the spec**

Run:
```bash
cd mobile && npx tsx -e "import {STANDARD,MICRO,solveMouthAngle,dashSpec,apertureGap,markSpan} from './src/brand/markGeometry'; for (const [n,s] of [['standard',STANDARD],['micro',MICRO]]) { const d=dashSpec(s); console.log(n, 'mouth', solveMouthAngle(s).toFixed(1), 'dash', d.dash.toFixed(2), d.gap.toFixed(2), 'rot', d.rotate.toFixed(2), 'gap', apertureGap(s).toFixed(2), 'span', markSpan(s).toFixed(1)); }"
```
Expected exactly:
```
standard mouth 72.3 dash 114.03 43.05 rot 49.34 gap 8.75 span 61.5
micro mouth 78.8 dash 114.61 48.75 rot 53.72 gap 9.50 span 65.0
```

If `tsx` is not yet installed this step fails — install it here rather than waiting for Task 4: `npm i -D tsx`.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/brand/markGeometry.ts mobile/src/__tests__/mark-geometry.test.ts mobile/package.json mobile/package-lock.json
git commit -m "feat(brand): derive the mark's mouth angle from its dot

The clear opening between the two terminals is solved to be exactly one
dot diameter wide, so the mouth cannot drift from the dot. Tests assert
the relationship rather than the resulting numbers, and prove the
aperture gap clears the 1.5px rasterisation floor at each drawing's
smallest intended size."
```

---

## Task 2: Logotype kerning table

**Files:**
- Create: `mobile/src/brand/wordmarkKerning.ts`
- Test: `mobile/src/__tests__/wordmark-kerning.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `const WORDMARK = 'croe'`
  - `const TRACKING_EM: Readonly<Record<string, number>>`
  - `type KernedGlyph = { char: string; letterSpacing: number }`
  - `kernWordmark(fontSize: number): KernedGlyph[]`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/__tests__/wordmark-kerning.test.ts`:

```ts
import { WORDMARK, TRACKING_EM, kernWordmark } from '../brand/wordmarkKerning';

describe('the logotype is kerned per pair, not per word', () => {
  it('spells croe', () => {
    expect(WORDMARK).toBe('croe');
    expect(kernWordmark(20).map((g) => g.char).join('')).toBe('croe');
  });

  it('gives r|o nearly double c|r, because that pair is the hole', () => {
    expect(TRACKING_EM.r).toBeLessThan(TRACKING_EM.c);
    expect(Math.abs(TRACKING_EM.r)).toBeGreaterThan(Math.abs(TRACKING_EM.c) * 1.5);
  });

  it('is not expressible as one global value', () => {
    const values = ['c', 'r', 'o'].map((ch) => TRACKING_EM[ch]);
    expect(new Set(values).size).toBeGreaterThan(1);
  });

  // Note: -0.042 * 20 is -0.8400000000000001, not -0.84. Compare with
  // toBeCloseTo, never toEqual, or this test fails on arithmetic rather than
  // on anything about the logotype.
  it('converts em to points against the font size', () => {
    const expected = [
      ['c', -0.84],
      ['r', -1.56],
      ['o', -1],
      ['e', 0],
    ] as const;
    const glyphs = kernWordmark(20);
    expect(glyphs).toHaveLength(4);
    glyphs.forEach((glyph, i) => {
      expect(glyph.char).toBe(expected[i][0]);
      expect(glyph.letterSpacing).toBeCloseTo(expected[i][1], 9);
    });
  });

  it('scales linearly with font size', () => {
    const small = kernWordmark(20);
    const large = kernWordmark(40);
    small.forEach((g, i) => {
      expect(large[i].letterSpacing).toBeCloseTo(g.letterSpacing * 2, 9);
    });
  });
});

describe('the final glyph carries no tracking', () => {
  it('because letter-spacing applies after every glyph including the last', () => {
    expect(TRACKING_EM.e).toBe(0);
    const glyphs = kernWordmark(64);
    expect(glyphs[glyphs.length - 1].letterSpacing).toBeCloseTo(0, 12);
  });

  it('at every size', () => {
    for (const size of [12, 20, 30, 52, 76]) {
      const glyphs = kernWordmark(size);
      expect(glyphs[glyphs.length - 1].letterSpacing).toBeCloseTo(0, 12);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest src/__tests__/wordmark-kerning.test.ts`
Expected: FAIL — `Cannot find module '../brand/wordmarkKerning'`

- [ ] **Step 3: Write the implementation**

Create `mobile/src/brand/wordmarkKerning.ts`:

```ts
/**
 * Croe logotype — per-pair kerning.
 *
 * `croe` is Plus Jakarta Sans 800. A single global tracking value is what made
 * it read as a font rather than a logotype: the r|o pair leaves a visible hole
 * that uniform tracking cannot close, BY DEFINITION — uniform tracking moves
 * every pair by the same amount, and these pairs do not have the same problem.
 *
 * Tracking is authored in em, matching design/src/SPEC.md, and converted to
 * points here because React Native's `letterSpacing` is in points.
 *
 * Spec: docs/superpowers/specs/2026-07-27-croe-brand-mark-design.md
 */

export const WORDMARK = 'croe';

/**
 * Tracking applied AFTER each glyph, in em.
 *
 * The final glyph MUST be 0. `letter-spacing` applies after every glyph
 * including the last, so a global value silently pulls the full stop — and, in
 * a lockup, the gap to the mark — tighter than specified.
 */
export const TRACKING_EM: Readonly<Record<string, number>> = {
  c: -0.042, // round to stem; the default fit is close to right
  r: -0.078, // THE HOLE: r's arm ends in mid-air against a full round o
  o: -0.05, // round to round; needs less than the baseline suggests
  e: 0, // last glyph — see above
};

export type KernedGlyph = { char: string; letterSpacing: number };

/** The logotype's glyphs with their trailing tracking, in points. */
export function kernWordmark(fontSize: number): KernedGlyph[] {
  return [...WORDMARK].map((char) => ({
    char,
    letterSpacing: (TRACKING_EM[char] ?? 0) * fontSize,
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd mobile && npx jest src/__tests__/wordmark-kerning.test.ts`
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/brand/wordmarkKerning.ts mobile/src/__tests__/wordmark-kerning.test.ts
git commit -m "feat(brand): kern the croe logotype per pair

r|o needs -.078em against c|r's -.042em because the r's arm ends in
mid-air against a full round. Uniform tracking cannot close that gap by
definition. Also zeroes the trailing letter-space, which was silently
pulling the lockup gap tighter than specified."
```

---

## Task 3: Wordmark component, adopted in both screens

**Files:**
- Create: `mobile/src/theme/components/Wordmark.tsx`
- Modify: `mobile/src/screens/OnboardingScreen.tsx` (render block ~line 107, styles `brand`/`brandText`/`brandDot` ~line 174)
- Modify: `mobile/src/screens/auth/PhoneInputScreen.tsx` (render block ~line 65, styles `brandText`/`brandDot` ~line 169)

**Interfaces:**
- Consumes: `kernWordmark(fontSize: number): KernedGlyph[]` from Task 2; `ink`, `states` from `mobile/src/theme/tokens.ts`.
- Produces: `Wordmark` — a React component taking `{ size?: number; color?: string; showStop?: boolean }`, all optional, defaulting to `20`, `ink.primary`, `true`.

**Note on verification.** Jest here is `testEnvironment: 'node'` with `testMatch: ['**/__tests__/**/*.test.ts']` — no `.tsx`, no React Native preset, no renderer. Component rendering is therefore **not unit-testable without adding `jest-expo` and reconfiguring**, which is out of scope. All the logic that *can* be tested already is, in Task 2. This task's gate is `npm run typecheck` plus the explicit device check in Step 6 — do not skip it and do not fabricate a render test.

- [ ] **Step 1: Create the component**

Create `mobile/src/theme/components/Wordmark.tsx`:

```tsx
/**
 * The Croe logotype.
 *
 * Renders as ONE <Text> with per-glyph <Text> spans, because the kerning is
 * per-pair and cannot be expressed as a single letterSpacing. A single parent
 * Text keeps the glyphs on one baseline — the previous implementation used a
 * <View> with two sibling <Text>s, which laid the full stop out as a flex item
 * rather than as part of the word.
 *
 * `showStop` is the one-green-dot rule: with the mark alongside, pass false —
 * the mark IS the full stop.
 */
import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { kernWordmark } from '../../brand/wordmarkKerning';
import { ink, states } from '../tokens';

type Props = {
  /** Font size in points. Tracking scales with it. */
  size?: number;
  /** Colour of the letters. The full stop is always --secure. */
  color?: string;
  /** Show the green full stop. Pass false whenever the mark is alongside. */
  showStop?: boolean;
};

export function Wordmark({
  size = 20,
  color = ink.primary,
  showStop = true,
}: Props) {
  const glyphs = kernWordmark(size);

  return (
    <Text
      accessibilityRole="header"
      accessibilityLabel="Croe"
      style={[styles.word, { fontSize: size, color }]}
    >
      {glyphs.map((glyph, i) => (
        <Text key={`${glyph.char}-${i}`} style={{ letterSpacing: glyph.letterSpacing }}>
          {glyph.char}
        </Text>
      ))}
      {showStop ? <Text style={styles.stop}>.</Text> : null}
    </Text>
  );
}

const styles = StyleSheet.create({
  word: {
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
  },
  stop: {
    color: states.secure.fill,
    letterSpacing: 0,
  },
});
```

- [ ] **Step 2: Adopt it in OnboardingScreen**

In `mobile/src/screens/OnboardingScreen.tsx`, add the import alongside the existing component imports:

```tsx
import { Wordmark } from '../theme/components/Wordmark';
```

Replace this render block:

```tsx
        <View style={styles.brand}>
          <Text style={styles.brandText}>croe</Text>
          <Text style={styles.brandDot}>.</Text>
        </View>
```

with:

```tsx
        <Wordmark size={20} />
```

Then delete the now-unused `brand`, `brandText` and `brandDot` entries from the `StyleSheet.create` block.

- [ ] **Step 3: Adopt it in PhoneInputScreen**

In `mobile/src/screens/auth/PhoneInputScreen.tsx`, add:

```tsx
import { Wordmark } from '../../theme/components/Wordmark';
```

Replace this render block (inside `<View style={styles.header}>`, around line 64):

```tsx
          <View style={styles.brand}>
            <Text style={styles.brandText}>croe</Text>
            <Text style={styles.brandDot}>.</Text>
          </View>
```

with:

```tsx
          <Wordmark size={20} />
```

Then delete the now-unused `brand`, `brandText` and `brandDot` entries from the `StyleSheet.create` block. Keep `styles.header` — it positions the block and is still referenced.

- [ ] **Step 4: Verify no duplicated wordmark styles survive**

Run: `cd mobile && grep -rn "brandText\|brandDot" src/`
Expected: no output.

- [ ] **Step 5: Typecheck**

Run: `cd mobile && npm run typecheck`
Expected: exits 0, no output.

If it reports `'Text' is declared but its value is never read` in either screen, remove `Text` from that file's `react-native` import list — but only if the file genuinely has no other `<Text>` usage.

- [ ] **Step 6: Verify per-span letterSpacing on a device**

Run: `cd mobile && npm run ios` (and `npm run android`)
Look at the onboarding top bar and the sign-in header.

Expected: `croe.` reads as one tight word with no visible gap between `r` and `o`, and the green full stop sits on the same baseline as the letters.

**Known risk:** React Native's support for `letterSpacing` on *nested* `<Text>` spans is solid on iOS and has been inconsistent on some Android versions. If Android renders all four glyphs with uniform tracking, fall back to a single `<Text>` per glyph inside a `<View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>`, applying `marginRight: glyph.letterSpacing` instead of `letterSpacing`. Do not silently accept the uniform rendering — it is the exact defect this task exists to fix.

- [ ] **Step 7: Commit**

```bash
git add mobile/src/theme/components/Wordmark.tsx mobile/src/screens/OnboardingScreen.tsx mobile/src/screens/auth/PhoneInputScreen.tsx
git commit -m "refactor(brand): extract the kerned Wordmark component

Both screens carried their own brandText/brandDot styles with a -0.4pt
global tracking, which is -.02em at 20px rather than the specified
-.042em. Replaces both with one component that applies the per-pair
table, and renders as a single Text so the full stop shares the word's
baseline instead of being laid out as a flex sibling."
```

---

## Task 4: Icon generator

**Files:**
- Create: `mobile/scripts/gen-icons.mjs`
- Modify: `mobile/package.json` (devDependencies, scripts)
- Generated: `design/brand/mark.svg`, `design/brand/mark-micro.svg`, and six PNGs in `mobile/assets/`

**Interfaces:**
- Consumes: `STANDARD`, `MICRO`, `buildMarkSvg`, `markSpan`, `apertureGap` from Task 1.
- Produces: `npm run icons` — regenerates every brand asset idempotently.

- [ ] **Step 1: Install the two dev dependencies**

Run: `cd mobile && npm i -D sharp tsx`

`sharp` rasterises SVG via libvips/librsvg. `tsx` lets the generator import `markGeometry.ts` directly, so the geometry has exactly one source of truth instead of a hand-copied duplicate in the script.

- [ ] **Step 2: Write the generator**

Create `mobile/scripts/gen-icons.mjs`:

```js
/**
 * Generates every Croe brand asset from mobile/src/brand/markGeometry.ts.
 *
 * Run with `npm run icons`. Idempotent — running twice produces identical
 * output. Never hand-edit anything this script writes; change the geometry
 * module or the recipes below and re-run.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import {
  STANDARD,
  MICRO,
  buildMarkSvg,
  markSpan,
  apertureGap,
  solveMouthAngle,
  clearOpening,
} from '../src/brand/markGeometry.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS = resolve(HERE, '../assets');
const BRAND = resolve(HERE, '../../design/brand');

const INK = '#17181B';
const ON_INK = '#FFFFFF';
const SECURE = '#1FC16B';

/** iOS squircle approximation, in viewBox units. */
const SQUIRCLE = 22.4;

/**
 * Every asset, in one place. `coverage` is the mark's width as a fraction of
 * the tile: 61.5 is its natural size; Android drops to 56 so the adaptive mask
 * cannot clip it.
 */
const ASSET_RECIPES = [
  {
    file: 'icon.png',
    spec: STANDARD,
    size: 1024,
    stroke: ON_INK,
    dot: SECURE,
    ground: INK,
    // No radius: iOS applies its own mask, and baking one in double-rounds it.
  },
  {
    file: 'android-icon-foreground.png',
    spec: STANDARD,
    size: 432,
    stroke: ON_INK,
    dot: SECURE,
    coverage: 56,
  },
  {
    // Android replaces this layer's colour with the system theme tint, so the
    // value is arbitrary at render time — it is INK rather than pure black only
    // because no colour outside the token set may enter this system.
    file: 'android-icon-monochrome.png',
    spec: STANDARD,
    size: 432,
    stroke: INK,
    dot: INK,
    coverage: 56,
  },
  {
    file: 'splash-icon.png',
    spec: STANDARD,
    size: 512,
    stroke: INK,
    dot: SECURE,
  },
  {
    file: 'favicon.png',
    spec: MICRO,
    size: 48,
    stroke: ON_INK,
    dot: SECURE,
    ground: INK,
    radius: SQUIRCLE,
  },
  {
    file: 'notification-icon.png',
    spec: MICRO,
    size: 96,
    stroke: ON_INK,
    dot: ON_INK,
  },
];

/** Handoff masters for designers. Regenerated, never hand-edited. */
const SVG_MASTERS = [
  { file: 'mark.svg', spec: STANDARD },
  { file: 'mark-micro.svg', spec: MICRO },
];

/**
 * Refuse to emit a mark that has drifted from its own rule. The unit tests
 * cover this too, but the generator is what actually writes bytes into the app
 * bundle, so it re-checks rather than trusting that tests were run.
 */
function assertInvariants() {
  for (const [name, spec] of [['standard', STANDARD], ['micro', MICRO]]) {
    const opening = clearOpening(spec, solveMouthAngle(spec));
    if (Math.abs(opening - spec.dotR * 2) > 1e-6) {
      throw new Error(
        `${name}: clear opening is ${opening.toFixed(4)}, expected one dot ` +
          `diameter (${(spec.dotR * 2).toFixed(4)}). The mouth has drifted ` +
          `from the dot — re-solve it, do not hard-code it.`,
      );
    }
  }

  const floors = [
    ['standard', apertureGap(STANDARD), 20],
    ['micro', apertureGap(MICRO), 16],
  ];
  for (const [name, gap, smallest] of floors) {
    const px = (gap / 100) * smallest;
    if (px < 1.5) {
      throw new Error(
        `${name}: aperture gap is ${px.toFixed(2)}px at ${smallest}px, below ` +
          `the 1.5px floor. It will silt up on a mid-range screen.`,
      );
    }
  }
}

async function main() {
  assertInvariants();

  await mkdir(ASSETS, { recursive: true });
  await mkdir(BRAND, { recursive: true });

  for (const { file, spec } of SVG_MASTERS) {
    const svg = buildMarkSvg(spec, { size: 512, stroke: INK, dot: SECURE });
    await writeFile(resolve(BRAND, file), `${svg}\n`, 'utf8');
    console.log(`design/brand/${file}  span ${markSpan(spec).toFixed(1)}`);
  }

  for (const recipe of ASSET_RECIPES) {
    const { file, spec, size, ...opts } = recipe;
    const svg = buildMarkSvg(spec, { size, ...opts });
    const png = await sharp(Buffer.from(svg, 'utf8'))
      .png({ compressionLevel: 9 })
      .toBuffer();
    await writeFile(resolve(ASSETS, file), png);
    console.log(`mobile/assets/${file}  ${size}x${size}  ${png.length} bytes`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
```

- [ ] **Step 3: Add the npm script**

In `mobile/package.json`, add to `"scripts"`, after `"typecheck"`:

```json
    "icons": "tsx scripts/gen-icons.mjs",
```

- [ ] **Step 4: Run the generator**

Run: `cd mobile && npm run icons`

Expected output (byte counts will differ):
```
design/brand/mark.svg  span 61.5
design/brand/mark-micro.svg  span 65.0
mobile/assets/icon.png  1024x1024  ... bytes
mobile/assets/android-icon-foreground.png  432x432  ... bytes
mobile/assets/android-icon-monochrome.png  432x432  ... bytes
mobile/assets/splash-icon.png  512x512  ... bytes
mobile/assets/favicon.png  48x48  ... bytes
mobile/assets/notification-icon.png  96x96  ... bytes
```

- [ ] **Step 5: Verify the invariant guard actually fires**

Temporarily edit `mobile/src/brand/markGeometry.ts` and change `STANDARD`'s `dotR` from `9` to `12`, leaving everything else alone. Then run `npm run icons`.

Expected: the aperture-gap floor throws —
```
standard: aperture gap is 1.15px at 20px, below the 1.5px floor. It will silt up on a mid-range screen.
```

Revert `dotR` to `9` and re-run `npm run icons` to confirm it passes again. **Do not commit the temporary edit.**

- [ ] **Step 6: Verify idempotency**

Run:
```bash
cd mobile && npm run icons && md5sum assets/icon.png > /tmp/a && npm run icons && md5sum assets/icon.png > /tmp/b && diff /tmp/a /tmp/b && echo IDEMPOTENT
```
Expected: `IDEMPOTENT`

- [ ] **Step 7: Look at the generated icon**

Open `mobile/assets/icon.png`. Expected: a near-black square, a white C opening to the right, a green dot at the exact centre, the mark occupying a little over 60% of the tile. No gradient, no shadow, no rounded corners.

Open `mobile/assets/favicon.png`. Expected: the same mark, visibly heavier in stroke, with rounded corners, still legible at 48 px.

- [ ] **Step 8: Run the full test suite and typecheck**

Run: `cd mobile && npm test && npm run typecheck`
Expected: all tests pass, typecheck exits 0.

- [ ] **Step 9: Commit**

```bash
git add mobile/scripts/gen-icons.mjs mobile/package.json mobile/package-lock.json mobile/assets/ design/brand/
git commit -m "feat(brand): generate every icon asset from one geometry module

Replaces the stock Expo placeholders. The generator re-asserts the
opening-equals-dot rule and the 1.5px aperture floor before writing
bytes, so a drifted mark fails the build rather than shipping. Output is
idempotent, and the SVG masters in design/brand are emitted rather than
hand-authored so no solved number lives in a file no test can check."
```

---

## Task 5: Wire the assets into Expo

**Files:**
- Modify: `mobile/app.json`
- Delete: `mobile/assets/android-icon-background.png`

**Interfaces:**
- Consumes: the PNGs from Task 4.
- Produces: nothing importable.

- [ ] **Step 1: Delete the stale background asset**

Run: `cd mobile && git rm assets/android-icon-background.png`

A flat ink field is better expressed as `adaptiveIcon.backgroundColor` than as a PNG, and it removes a file that can drift from the ground colour.

- [ ] **Step 2: Update app.json**

In `mobile/app.json`, replace the `android.adaptiveIcon` block:

```json
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#17181B",
        "foregroundImage": "./assets/android-icon-foreground.png",
        "monochromeImage": "./assets/android-icon-monochrome.png"
      },
      "package": "com.croe.app",
      "predictiveBackGestureEnabled": false
    },
```

The previous `#E6E6E3` was the `--page` token — the grey *behind* a phone artboard in the design cards. It was never intended as an icon ground and would frame the mark in light grey on any device that ignores the background image.

- [ ] **Step 3: Add the splash configuration**

In `mobile/app.json`, replace the `plugins` array:

```json
    "plugins": [
      "expo-font",
      "expo-secure-store",
      [
        "expo-splash-screen",
        {
          "image": "./assets/splash-icon.png",
          "imageWidth": 160,
          "backgroundColor": "#F1F1EF"
        }
      ]
    ]
```

`#F1F1EF` is `--canvas`, so the app opens into its own ground rather than flashing white. `splash-icon.png` existed but nothing referenced it, so it was dead weight until now.

- [ ] **Step 4: Install the splash plugin**

Run: `cd mobile && npx expo install expo-splash-screen`

- [ ] **Step 5: Validate the config**

Run: `cd mobile && npx expo config --type public`
Expected: prints resolved JSON with no errors; `android.adaptiveIcon.backgroundColor` is `#17181B` and there is no `backgroundImage` key.

- [ ] **Step 6: Verify on a device**

Run: `cd mobile && npm run android`

Expected: the launcher icon is a dark tile with the white C and green dot; the splash shows the ink mark on the light canvas ground, not on white. On Android 13+, switch the launcher to themed icons and confirm the mark still reads as a vessel rather than a blob.

- [ ] **Step 7: Commit**

```bash
git add mobile/app.json mobile/package.json mobile/package-lock.json
git commit -m "feat(brand): point Expo at the new icon set

Adaptive-icon ground moves from #E6E6E3 to ink. The old value was the
--page token, the grey behind a phone artboard in the design cards, and
would have framed the mark in light grey wherever the background image
was ignored. Drops the background PNG in favour of the colour, and wires
the splash that was shipping an unreferenced asset."
```

---

## Task 6: The Foundations card

**Files:**
- Create: `design/cards/foundations/brand.html`

**Interfaces:**
- Consumes: the solved numbers printed in Task 1 Step 5.
- Produces: nothing importable.

The authoring contract is [`design/src/SPEC.md`](../../../design/src/SPEC.md). Read its "Hard rules" section before writing a line. Use [`design/cards/foundations/colors.html`](../../../design/cards/foundations/colors.html) as the structural reference — same `body.specimen`, `.spec`, `.srow`/`.slabel` skeleton.

- [ ] **Step 1: Scaffold the card**

Create `design/cards/foundations/brand.html`. The **first line must be exactly**:

```html
<!-- @dsCard group="Foundations" name="Brand" subtitle="The mark, the logotype, and the one-green-dot rule" -->
```

Then `<!DOCTYPE html>`, `<html lang="en">`, `<title>Croe — Brand</title>`, and the font link required by SPEC.md:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Copy the tokens verbatim**

Run: `cd "design/cards/foundations" && wc -l ../../src/tokens.css`
Expected: `495 ../../src/tokens.css`

Copy the **entire** contents of `design/src/tokens.css` into a `<style>` block, unmodified. Card-specific CSS goes after it. This is SPEC.md hard rule 3 and it is not negotiable — no raw hex may appear in card CSS.

- [ ] **Step 3: Build the sections**

Nine `.srow` sections, in this order. Every section uses this skeleton, which is the
structure `colors.html` and the other Foundations cards already use:

```html
  <div class="srow">
    <div class="slabel">The mark</div>
    <div class="sbody">
      <!-- specimens -->
      <div class="snote">Why it is this way.</div>
    </div>
  </div>
```

The page wrapper is `<body class="specimen"><div class="spec">`, opening with:

```html
    <div class="spec-h1">Brand</div>
    <div class="spec-sub">The mark, the logotype, and the one-green-dot rule</div>
```

Icon tiles are `background: var(--ink); color: var(--on-ink); border-radius: 22.4%`, with
the SVG at `width:100%;height:100%` on a `0 0 100 100` viewBox. Draw every mark with inline
SVG using the exact values from Task 1 Step 5.

Standard drawing:
```html
<circle cx="51.5" cy="50" r="25" fill="none" stroke="currentColor" stroke-width="11.5"
        stroke-linecap="round" stroke-dasharray="114.03 43.05"
        transform="rotate(49.34 51.5 50)"/>
<circle cx="50" cy="50" r="9" fill="var(--secure)"/>
```

Micro drawing:
```html
<circle cx="50" cy="50" r="26" fill="none" stroke="currentColor" stroke-width="13"
        stroke-linecap="round" stroke-dasharray="114.61 48.75"
        transform="rotate(53.72 50 50)"/>
<circle cx="50" cy="50" r="10" fill="var(--secure)"/>
```

| # | `.slabel` | Content |
|---|---|---|
| 1 | The mark | The standard mark at 112 px on `--ink`, then at 44 / 28 / 20 px. One paragraph: the concept is holding, not defending; there is no lock and no shield. |
| 2 | Construction | The 100-unit grid with the base circle dashed, beside a table: span 61.5, base circle r 25 at (51.5, 50), optical nudge +1.5, stroke 11.5, mouth **72.3°**, clear opening **18.00**, dot r 9 at (50, 50), aperture gap **8.75**. State that **the mouth is solved, not chosen**, and give the expression. |
| 3 | Micro variant | The micro mark at 112 / 24 / 16 px beside the standard shrunk to the same sizes. Mouth **78.8°**, opening **20.00**, gap **9.5**. State it is for the favicon and notification icon only, and that its mouth is solved from the same rule rather than copied. |
| 4 | Colour | Ink ground, `--on-ink` stroke, `--secure` dot; ink stroke when inverted onto `--canvas`. One line: the mark introduces no new colour — `--secure` already means *money is held safely*, which is what the dot depicts. |
| 5 | The one-green-dot rule | Three panels: mark + `croe` (correct), mark + `croe.` (two green dots, wrong), mono mark + `croe.` (mark loses the money, wrong). Then the rule stated plainly. |
| 5b | Lockups | The three configurations, each rendered: **horizontal** (mark, then `croe`, gap = one dot diameter) — the default; **stacked** (mark above `croe`, same gap) for splash and share cards; **wordmark alone** (`croe.`, green full stop retained). Plus the alignment rule: the mark's vertical centre aligns to the **x-height centre** of `croe`, not the cap line, because the word has no ascenders and cap-line alignment reads high. |
| 6 | Logotype | The kerning table — c −.042em, r −.078em, o −.05em, e **0** — with the before/after set at 76 px. Explain the r\|o hole and why uniform tracking cannot close it, and why the last glyph must be 0. |
| 7 | Clear space & minimums | Unit = one dot diameter (18 units, 29% of the mark's width). Clear space 1 unit all sides; mark min 16 px; lockup min 72 px wide; 61.5% in an icon tile; 56% on the Android adaptive canvas. |
| 8 | Never | Six `.dd` tiles: correct · no green ground · never rotate · dot is never another state colour · never fill the tile · no gradients. |

Close with a note recording the **© resemblance as an accepted trade**, in the spec's words: unfixable while the mark is a C, and the C is why this concept won.

- [ ] **Step 4: Verify the SPEC.md hard rules**

Run:
```bash
cd "design/cards/foundations" && head -1 brand.html && grep -c "linear-gradient\|radial-gradient\|backdrop-filter\|<script" brand.html && grep -oE "#[0-9A-Fa-f]{6}" brand.html | sort -u | head -20
```
Expected: the `@dsCard` line prints exactly as written in Step 1; the gradient/script count is `0`; every hex printed also appears in `design/src/tokens.css` (they are all from the copied token block — none may come from card CSS).

- [ ] **Step 5: Look at it**

Open `design/cards/foundations/brand.html` in a browser. Expected: renders standalone, Plus Jakarta Sans throughout, all eight sections present, no broken SVGs, no horizontal scroll.

- [ ] **Step 6: Commit**

```bash
git add design/cards/foundations/brand.html
git commit -m "docs(brand): add the Brand foundations card

Documents the mark, its construction, the micro variant, the
one-green-dot rule, the kerned logotype and the misuse rules. Foundations
goes to six cards, the project to 26. Records the copyright-symbol
resemblance as an accepted trade so it is not rediscovered later as a
defect."
```

---

## Task 7: Publish to a new Claude Design project

**Files:** none created or modified.

**Interfaces:**
- Consumes: `design/cards/foundations/brand.html` from Task 6.
- Produces: a `projectId` to record.

**Context.** The project recorded in memory for Croe (`26e5977c-6010-4ec9-bd28-155106556ba4`, owner *Nicholas*) returns HTTP 404 from this login and cannot be written to. The user chose to create a fresh project they own. The other 25 cards stay where they are; migrating them is separate work.

- [ ] **Step 1: Confirm nothing writable already exists**

Use the `DesignSync` tool with `method: "list_projects"`.
Expected: `LEARNY Design System` only. If a Croe project now appears, **stop and ask the user** whether to push there instead of creating a second one.

- [ ] **Step 2: Create the project**

Use `DesignSync` with `method: "create_project"`, `name: "Croe — Escrow App UI"`.
Record the returned `projectId`.

- [ ] **Step 3: Confirm it is a design-system project**

Use `DesignSync` with `method: "get_project"` and the new `projectId`.
Expected: `type: PROJECT_TYPE_DESIGN_SYSTEM` and `canEdit: true`. The type is immutable at creation — if it is anything else, the push will not produce a gallery, so stop and report.

- [ ] **Step 4: Finalize the plan**

Use `DesignSync` with `method: "finalize_plan"`, the new `projectId`, `writes: ["cards/foundations/brand.html"]`, and `localDir` set to the absolute path of `design/`.
Record the returned `planId`.

- [ ] **Step 5: Push the card**

Use `DesignSync` with `method: "write_files"`, the `planId`, and one file: `path: "cards/foundations/brand.html"`, `localPath: "cards/foundations/brand.html"`.

Explicit `register_assets` is not needed — the pane builds its card index from the `@dsCard` marker on line 1.

- [ ] **Step 6: Verify**

Use `DesignSync` with `method: "list_files"` and the new `projectId`.
Expected: `cards/foundations/brand.html` present.

- [ ] **Step 7: Update the memory record**

Rewrite `C:\Users\Jerry\.claude\projects\C--Users-Jerry-Desktop-PROJECT-2026-Croe\memory\ref-design-project.md` so the stale `26e5977c-…` id is replaced by the new one, noting that the original is unreachable from this login and that the new project currently holds one card. Keep the `MEMORY.md` pointer line as it is — the title and hook have not changed.

---

## Verification

After every task:

- [ ] `cd mobile && npm test` — all green
- [ ] `cd mobile && npm run typecheck` — exits 0
- [ ] `cd mobile && npm run icons` — regenerates cleanly, output identical to the previous run
- [ ] `git status --short` shows nothing unexpected. **The working tree already carries unrelated changes** to `Progress.md`, seven `mobile/src/screens/*.tsx`, `Button.tsx`, `tsconfig.json`, plus untracked `e2e/`, `__tests__/`, `.detoxrc.js` and two font archives. None of it belongs to this plan — stage paths explicitly, never `git add -A`.

## Out of scope

Per the spec: redrawing the `croe` letterforms (kerning only), migrating the existing 25 cards, motion, and any change to the state colours, type scale or depth rules. Do not add `react-native-svg` — the mark reaches the app as PNGs, and adding a runtime SVG dependency for a logo is not warranted.

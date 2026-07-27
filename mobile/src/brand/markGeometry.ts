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
 * For <= 24 px only — the favicon and the notification icon. A separate optical
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
 * between their centres is the chord 2r*sin(M/2). Round caps each eat stroke/2
 * of that, so the clear opening is chord - stroke. Set that equal to the dot
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

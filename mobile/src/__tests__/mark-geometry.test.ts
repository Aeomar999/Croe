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

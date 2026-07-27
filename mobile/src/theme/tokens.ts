/**
 * Croe Design Tokens v3 — "Soft Light"
 * Source of truth: design/src/tokens.css + design/src/SPEC.md
 *
 * RULE: There is no decorative colour in Croe. If a hue is not carrying
 * a state, it is not allowed — which is why the primary button is black.
 */

// ─── Surfaces ──────────────────────────────────────────────────
export const surfaces = {
  page: '#E6E6E3',
  canvas: '#F1F1EF',
  surface: '#FFFFFF',
  sunken: '#F5F5F3',
  scrim: 'rgba(20,22,26,0.34)',
} as const;

// ─── Ink ────────────────────────────────────────────────────────
export const ink = {
  primary: '#17181B',
  secondary: '#4A4D52',
  tertiary: '#8E9297',
  onInk: '#FFFFFF',
} as const;

// ─── Line ───────────────────────────────────────────────────────
export const line = {
  primary: '#E7E7E4',
  secondary: '#D9D9D5',
} as const;

// ─── Semantic States ────────────────────────────────────────────
// Two idioms: solid (fill + on-fill text) and quiet/wash (tinted fill + deep text)
export const states = {
  pending: {
    fill: '#EFEFEC',
    on: '#5B5E63',
    wash: '#F3F3F0',
    deep: '#5B5E63',
  },
  secure: {
    fill: '#1FC16B',
    on: '#17181B', // Ink, not white — white on #1FC16B is 2.36:1, ink is 7.52:1
    wash: '#E8F8F0',
    deep: '#127A45',
  },
  done: {
    fill: '#17181B',
    on: '#FFFFFF', // Done is the only dark fill, keeps white
    wash: '#EFEFEC',
    deep: '#17181B',
  },
  caution: {
    fill: '#F5B02E',
    on: '#2A1F05',
    wash: '#FDF3E1',
    deep: '#8A5A00',
  },
  danger: {
    fill: '#EF4444',
    on: '#17181B', // Ink — white on #EF4444 is 3.76:1, ink is 4.74:1
    wash: '#FDECEC',
    deep: '#A62020',
  },
} as const;

// ─── Carrier Colours ────────────────────────────────────────────
// 8px dot beside carrier name, or 40px monogram tile on payment screens only
export const carriers = {
  mtn: '#FFCC00',
  telecel: '#E60000',
  at: '#004F9F',
} as const;

// ─── Shape ──────────────────────────────────────────────────────
export const shape = {
  r1: 12,   // thumbs, small chips, glyph wells
  r2: 16,   // inputs, compact sheets
  r3: 20,   // tiles
  r4: 24,   // primary sheets (default card radius)
  full: 999, // every pill and circle
  phone: 44, // the artboard
} as const;

// ─── Space — 4pt grid ──────────────────────────────────────────
export const space = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s7: 28,
  s8: 32,
  s10: 40,
  s12: 48,
} as const;

// ─── Layout Constants ───────────────────────────────────────────
export const layout = {
  gutter: 20,      // screen side padding, everywhere
  padSheet: 20,    // sheet inner padding
  gapSection: 24,  // between titled sections
  gapRow: 12,      // between sibling rows/tiles
  tabBarHeight: 64,
  tabBarOffset: 26, // bottom offset
  screenHeadHeight: 48,
  buttonHeight: 52,
  buttonHeightSm: 44,
  minTapTarget: 44,
  otpCellHeight: 60,
  inputMinHeight: 56,
  avatarSize: 44,
  iconBtnSize: 44,
  markSize: 40,
  tickSize: 20,
  dotSize: 8,
  glyphWellSize: 26,
  carrierTileSize: 40,
  allocBarHeight: 6,
  railHeight: 2,
} as const;

// ─── Depth ──────────────────────────────────────────────────────
// RULE: Fill first, hairline second, shadow only for what floats.
// A white sheet on canvas: no border, no shadow.
// A white control on white: 1px line border, no shadow.
// Only floating layers: tab bar, FAB, toasts, modal sheets get shadow.
// Nothing ever gets both border and shadow.
export const depth = {
  elev: '0 8px 24px rgba(20,22,26,0.08), 0 2px 6px rgba(20,22,26,0.04)',
  elevLift: '0 14px 34px rgba(20,22,26,0.12), 0 3px 8px rgba(20,22,26,0.05)',
} as const;

// RN shadow properties (iOS shadow + Android elevation)
export const shadows = {
  elev: {
    shadowColor: '#14161A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  elevLift: {
    shadowColor: '#14161A',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 34,
    elevation: 14,
  },
} as const;

// ─── Motion ─────────────────────────────────────────────────────
// cubic-bezier(.2,.8,.25,1) — soft settle, no bounce, no spring
// React Native doesn't support cubic-bezier in Animated, use timing with duration
export const motion = {
  state: 160,  // press, toggle, colour
  layer: 240,  // sheets, toasts, anything that floats in
} as const;

// ─── State-to-Pill Mapping ──────────────────────────────────────
// Maps backend escrow_transactions.current_status to user-facing words + pill state
// per SPEC.md §Voice
export const stateToWords = {
  LINK_CREATED: 'Link live',
  AWAITING_DEPOSIT: 'Awaiting payment',
  FUNDS_SECURED: 'Funds secured',
  SHIPPED: 'On its way',
  DELIVERED_CONFIRMED: 'Delivered',
  FUNDS_RELEASED: 'Paid out',
  DISPUTE_OPENED: 'In review',
  AI_PROCESSING: 'In review',
  UNDER_HUMAN_REVIEW: 'Specialist review',
  RESOLVED_AUTO: 'Resolved',
  FUNDS_REFUNDED: 'Refunded',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
  FRAUD_LOCKOUT: 'Account paused',
} as const;

export const stateToPillState = {
  LINK_CREATED: 'pending',
  AWAITING_DEPOSIT: 'caution',
  FUNDS_SECURED: 'secure',
  SHIPPED: 'secure',
  DELIVERED_CONFIRMED: 'done',
  FUNDS_RELEASED: 'done',
  DISPUTE_OPENED: 'caution',
  AI_PROCESSING: 'caution',
  UNDER_HUMAN_REVIEW: 'caution',
  RESOLVED_AUTO: 'done',
  FUNDS_REFUNDED: 'done',
  EXPIRED: 'pending',
  CANCELLED: 'pending',
  FRAUD_LOCKOUT: 'caution',
} as const;

export type PillState = 'pending' | 'secure' | 'done' | 'caution' | 'danger';
export type EscrowStatus = keyof typeof stateToWords;

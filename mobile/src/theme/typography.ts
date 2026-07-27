/**
 * Croe Typography — Plus Jakarta Sans
 * One family, five weights, sentence case.
 * Uppercase only at micro (11px), and only for data prefixes.
 */
import { Platform, type TextStyle } from 'react-native';

const FONTS = {
  regular: 'PlusJakartaSans',
  medium: 'PlusJakartaSans-Medium',
  semiBold: 'PlusJakartaSans-SemiBold',
  bold: 'PlusJakartaSans-Bold',
  extraBold: 'PlusJakartaSans-ExtraBold',
} as const;

// Tabular + lining numerals for all amounts
const tabularNums: TextStyle = {
  fontVariant: ['tabular-nums', 'lining-nums'],
};

export const typography = {
  display: {
    fontFamily: FONTS.extraBold,
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '800' as const,
    letterSpacing: -1.08,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700' as const,
    letterSpacing: -0.528,
  },
  heading: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.204,
  },
  subhead: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.09,
  },
  body: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500' as const,
    letterSpacing: 0,
  },
  label: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  caption: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500' as const,
    letterSpacing: 0,
  },
  micro: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700' as const,
    letterSpacing: 0.55,
    textTransform: 'uppercase' as const,
  },
} as const;

// Amount style — always GH₵, same weight/size/colour as numerals
export const amountStyle: TextStyle = {
  ...typography.display,
  ...tabularNums,
  fontWeight: '800',
  letterSpacing: -1.08,
};

export const amountHeroStyle: TextStyle = {
  ...amountStyle,
  fontSize: 34,
  lineHeight: 40,
};

export const tabularNumsStyle = tabularNums;

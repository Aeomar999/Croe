import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, formatRelativeTime, getPriorityLabel, getReasonCodeLabel, cn } from '../utils';

describe('utils', () => {
  describe('formatCurrency', () => {
    it('formats GHS correctly', () => {
      expect(formatCurrency('450.00', 'GHS')).toBe('GH₵450.00');
      expect(formatCurrency('1234.56', 'GHS')).toBe('GH₵1,234.56');
    });

    it('formats NGN correctly', () => {
      expect(formatCurrency('5000.00', 'NGN')).toBe('₦5,000.00');
    });

    it('formats KES correctly', () => {
      expect(formatCurrency('10000.00', 'KES')).toBe('KSh10,000.00');
    });
  });

  describe('formatDate', () => {
    it('formats ISO date string', () => {
      const result = formatDate('2026-09-22T12:34:56Z');
      expect(result).toContain('Sep');
      expect(result).toContain('22');
      expect(result).toContain('2026');
    });
  });

  describe('formatRelativeTime', () => {
    it('returns "Just now" for very recent', () => {
      const now = new Date().toISOString();
      expect(formatRelativeTime(now)).toBe('Just now');
    });

    it('returns minutes ago', () => {
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      expect(formatRelativeTime(fiveMinsAgo)).toBe('5m ago');
    });

    it('returns hours ago', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(threeHoursAgo)).toBe('3h ago');
    });
  });

  describe('getPriorityLabel', () => {
    it('returns Critical for >1000', () => {
      expect(getPriorityLabel(1500)).toBe('Critical');
    });

    it('returns High for >500', () => {
      expect(getPriorityLabel(750)).toBe('High');
    });

    it('returns Medium for >100', () => {
      expect(getPriorityLabel(250)).toBe('Medium');
    });

    it('returns Standard for <=100', () => {
      expect(getPriorityLabel(50)).toBe('Standard');
    });
  });

  describe('getReasonCodeLabel', () => {
    it('formats known codes', () => {
      expect(getReasonCodeLabel('NOT_RECEIVED')).toBe('Item Not Received');
      expect(getReasonCodeLabel('WRONG_ITEM')).toBe('Wrong Item');
      expect(getReasonCodeLabel('DAMAGED')).toBe('Damaged');
      expect(getReasonCodeLabel('NOT_AS_DESCRIBED')).toBe('Not As Described');
    });

    it('returns code as-is for unknown', () => {
      expect(getReasonCodeLabel('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('cn (classnames utility)', () => {
    it('joins class names', () => {
      expect(cn('a', 'b', 'c')).toBe('a b c');
    });

    it('handles conditional classes', () => {
      expect(cn('base', true && 'conditional')).toBe('base conditional');
      expect(cn('base', false && 'conditional')).toBe('base');
    });

    it('handles object syntax', () => {
      expect(cn({ active: true, disabled: false })).toBe('active');
    });
  });
});
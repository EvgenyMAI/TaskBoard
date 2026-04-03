import { describe, it, expect } from 'vitest';
import { num, formatPeriodLabel, toLocalInputValue } from './analyticsFormat';

describe('analyticsFormat', () => {
  describe('num', () => {
    it('coerces nullish to 0', () => {
      expect(num(null)).toBe(0);
      expect(num(undefined)).toBe(0);
    });
    it('parses numeric strings', () => {
      expect(num('3')).toBe(3);
    });
  });

  describe('formatPeriodLabel', () => {
    it('returns default when args missing', () => {
      expect(formatPeriodLabel('', '')).toBe('Период');
    });
    it('formats two ISO-like instants', () => {
      const s = formatPeriodLabel('2026-01-02T00:00:00.000Z', '2026-01-15T00:00:00.000Z');
      expect(s).toContain('—');
      expect(s.length).toBeGreaterThan(5);
    });
  });

  describe('toLocalInputValue', () => {
    it('pads month and day', () => {
      const d = new Date(2026, 0, 5, 8, 7);
      expect(toLocalInputValue(d)).toMatch(/^2026-01-05T08:07$/);
    });
  });
});

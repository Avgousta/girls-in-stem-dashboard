import { describe, it, expect } from 'vitest';
import { pct, avg, round2, calcGradeBand, calcRiskLevel, calcRiskFlags, padId, truncate } from '../utils/index';

describe('pct', () => {
  it('rounds to nearest integer', () => expect(pct(1, 3)).toBe(33));
  it('returns 0 when denominator is 0', () => expect(pct(5, 0)).toBe(0));
  it('handles 100%', () => expect(pct(50, 50)).toBe(100));
});

describe('avg', () => {
  it('returns 0 for empty array', () => expect(avg([])).toBe(0));
  it('averages correctly', () => expect(avg([10, 20, 30])).toBe(20));
  it('rounds to 2 decimal places', () => expect(avg([1, 2])).toBe(1.5));
});

describe('round2', () => {
  it('rounds to 2 decimal places', () => expect(round2(1.2345)).toBe(1.23));
  it('leaves whole numbers unchanged', () => expect(round2(5)).toBe(5));
});

describe('calcGradeBand', () => {
  it('80+ = Distinction', () => expect(calcGradeBand(80)).toBe('Distinction'));
  it('79 = Merit', () => expect(calcGradeBand(79)).toBe('Merit'));
  it('70 = Merit', () => expect(calcGradeBand(70)).toBe('Merit'));
  it('69 = Pass', () => expect(calcGradeBand(69)).toBe('Pass'));
  it('60 = Pass', () => expect(calcGradeBand(60)).toBe('Pass'));
  it('59 = Needs Support', () => expect(calcGradeBand(59)).toBe('Needs Support'));
  it('0 = Needs Support', () => expect(calcGradeBand(0)).toBe('Needs Support'));
  it('100 = Distinction', () => expect(calcGradeBand(100)).toBe('Distinction'));
});

describe('calcRiskLevel', () => {
  it('high when attendance < 75', () => expect(calcRiskLevel(74, 80)).toBe('high'));
  it('high when avg score < 50', () => expect(calcRiskLevel(90, 49)).toBe('high'));
  it('medium when attendance 75–84', () => expect(calcRiskLevel(80, 65)).toBe('medium'));
  it('medium when score 50–59', () => expect(calcRiskLevel(90, 55)).toBe('medium'));
  it('low when both thresholds met', () => expect(calcRiskLevel(90, 70)).toBe('low'));
  it('boundary: 75% attendance, 60 score = low', () => expect(calcRiskLevel(85, 60)).toBe('low'));
});

describe('calcRiskFlags', () => {
  it('returns empty array when no risk', () => expect(calcRiskFlags(90, 70)).toHaveLength(0));
  it('flags low attendance', () => {
    const flags = calcRiskFlags(70, 70);
    expect(flags.some(f => f.includes('Low attendance'))).toBe(true);
  });
  it('flags low score', () => {
    const flags = calcRiskFlags(90, 40);
    expect(flags.some(f => f.includes('Low avg score'))).toBe(true);
  });
  it('flags at-risk attendance (75–84 range)', () => {
    const flags = calcRiskFlags(80, 70);
    expect(flags.some(f => f.includes('At-risk attendance'))).toBe(true);
  });
  it('flags at-risk score (50–59 range)', () => {
    const flags = calcRiskFlags(90, 55);
    expect(flags.some(f => f.includes('At-risk score'))).toBe(true);
  });
});

describe('padId', () => {
  it('pads with leading zeros', () => expect(padId('LRN', 3)).toBe('LRN003'));
  it('uses custom length', () => expect(padId('S', 7, 4)).toBe('S0007'));
  it('does not truncate when number exceeds pad length', () => expect(padId('X', 1000, 3)).toBe('X1000'));
});

describe('truncate', () => {
  it('truncates and appends ellipsis', () => expect(truncate('hello world', 5)).toBe('hello…'));
  it('leaves short strings unchanged', () => expect(truncate('hi', 10)).toBe('hi'));
  it('truncates exactly at boundary', () => expect(truncate('abcde', 5)).toBe('abcde'));
});

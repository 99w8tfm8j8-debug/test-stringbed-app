import { describe, expect, it } from 'vitest';
import { SEED_STRINGS } from '../src/data/strings';
import { estimateMainLengthMm, SEED_RACQUETS } from '../src/data/racquets';
import { MATERIAL_CLASSES } from '../src/lib/physics';

describe('seed library', () => {
  it('has at least 60 strings and 60 racquets', () => {
    expect(SEED_STRINGS.length).toBeGreaterThanOrEqual(60);
    expect(SEED_RACQUETS.length).toBeGreaterThanOrEqual(60);
  });
  it('has unique ids', () => {
    expect(new Set(SEED_STRINGS.map((s) => s.id)).size).toBe(SEED_STRINGS.length);
    expect(new Set(SEED_RACQUETS.map((r) => r.id)).size).toBe(SEED_RACQUETS.length);
  });
  it('every string has a source, a verified flag, a valid material and plausible gauges', () => {
    for (const s of SEED_STRINGS) {
      expect(s.sourceUrl, s.id).toMatch(/^https?:\/\//);
      expect(typeof s.verified).toBe('boolean');
      expect(MATERIAL_CLASSES).toContain(s.material);
      expect(s.gauges.length, s.id).toBeGreaterThan(0);
      for (const g of s.gauges) {
        expect(g.mm, s.id).toBeGreaterThanOrEqual(1.0);
        expect(g.mm, s.id).toBeLessThanOrEqual(1.45);
        expect(g.label.length).toBeGreaterThan(0);
      }
    }
  });
  it('every racquet has a source, a pattern and a plausible head size', () => {
    for (const r of SEED_RACQUETS) {
      expect(r.sourceUrl, r.id).toMatch(/^https?:\/\//);
      expect(r.pattern, r.id).toMatch(/^\d{2}x\d{2}$/);
      expect(r.headSizeSqIn).toBeGreaterThanOrEqual(85);
      expect(r.headSizeSqIn).toBeLessThanOrEqual(120);
      expect(r.lengthIn).toBeGreaterThanOrEqual(26);
      expect(r.lengthIn).toBeLessThanOrEqual(29);
    }
  });
  it('estimates 320 mm for a 100 sq in head and scales with sqrt(area)', () => {
    expect(estimateMainLengthMm(100)).toBe(320);
    expect(estimateMainLengthMm(98)).toBe(317);
  });
});

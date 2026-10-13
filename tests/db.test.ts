import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { Db } from '../src/lib/db';
import { ImportError, parseBackup, readingsCsv } from '../src/lib/backup';
import type { Reading, Setup } from '../src/lib/types';

const setup: Setup = { id: 's1', name: 'Percept, "match"', mains: { material: 'polyester', gaugeMm: 1.25 }, hitter: 'hard', capWeeks: 6, checkPct: 20, restringPct: 25, hours: [], calib: {}, createdAt: 1, updatedAt: 1 };
const reading = (id: string, setupId = 's1'): Reading => ({ id, setupId, date: '2026-02-01', lb: 44.2, side: 'mains', source: 'estimate', hz: 551.234, note: '=cmd', createdAt: 2 });

describe('IndexedDB store', () => {
  it('saves, deletes a setup with its readings, and round-trips a backup', async () => {
    const db = await Db.open(indexedDB, 'test-' + Math.random());
    await db.put('setups', setup);
    await db.put('readings', reading('r1'));
    await db.put('readings', reading('r2'));
    await db.put('readings', reading('r3', 'other'));
    const backup = await db.exportAll();
    expect(backup.readings).toHaveLength(3);

    await db.deleteSetup('s1');
    expect(await db.all('setups')).toHaveLength(0);
    expect((await db.all<Reading>('readings')).map((r) => r.id)).toEqual(['r3']);

    await db.importAll(parseBackup(JSON.stringify(backup)), 'replace');
    expect(await db.all('setups')).toHaveLength(1);
    expect(await db.all('readings')).toHaveLength(3);
    db.close();
  });

  it('stores settings', async () => {
    const db = await Db.open(indexedDB, 'test-' + Math.random());
    await db.putSettings({ unit: 'kg', theme: 'dark', mainsRange: { fmin: 300, fmax: 900 }, crossesRange: { fmin: 250, fmax: 1100 } });
    expect((await db.getSettings()).unit).toBe('kg');
    db.close();
  });
});

describe('backup parsing', () => {
  it('rejects junk with a readable message', () => {
    expect(() => parseBackup('nope')).toThrow(ImportError);
    expect(() => parseBackup('{"app":"other"}')).toThrow(/not a Stringbed backup/);
    expect(() => parseBackup(JSON.stringify({ app: 'stringbed', version: 1, readings: [{ id: 'x', setupId: 's', date: '1/2/26', lb: 40 }] }))).toThrow(/YYYY-MM-DD/);
  });
});

describe('CSV export', () => {
  it('quotes, guards formulas and converts kg', () => {
    const csv = readingsCsv([setup], [reading('r1')]);
    const [head, row] = csv.trim().split('\r\n');
    expect(head).toBe('setup,date,side,lb,kg,range_lb,hz,spread_hz,hits,mode,source,note');
    expect(row).toBe('"Percept, ""match""",2026-02-01,mains,44.2,20.0,,551.23,,,,estimate,\'=cmd');
  });
});

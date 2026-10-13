// App state: IndexedDB-backed setups, readings, custom library entries and settings.
import { createContext, type ComponentChildren } from 'preact';
import { useCallback, useContext, useEffect, useMemo, useState } from 'preact/hooks';
import { Db, type Backup } from '../lib/db';
import { CAP_WEEKS, DEFAULT_SETTINGS, type Racquet, type Reading, type Settings, type Setup, type StringModel } from '../lib/types';
import { SEED_STRINGS } from '../data/strings';
import { SEED_RACQUETS } from '../data/racquets';
import { todayIso } from '../lib/status';
import type { Library } from './convert';

export interface AppState {
  loaded: boolean;
  error: string | null;
  setups: Setup[];
  readings: Reading[];
  /** Seed merged with user entries (user entries win by id). */
  strings: StringModel[];
  racquets: Racquet[];
  settings: Settings;
  lib: Library;
  active: Setup | null;
}

export interface Actions {
  saveSetup(s: Setup): Promise<void>;
  deleteSetup(id: string): Promise<void>;
  newSetup(name: string): Promise<Setup>;
  restring(from: Setup, startLb: number | undefined, strungOn: string): Promise<Setup>;
  saveReading(r: Reading): Promise<void>;
  deleteReading(id: string): Promise<void>;
  saveString(s: StringModel): Promise<void>;
  deleteString(id: string): Promise<void>;
  saveRacquet(r: Racquet): Promise<void>;
  deleteRacquet(id: string): Promise<void>;
  setSettings(patch: Partial<Settings>): Promise<void>;
  exportAll(): Promise<Backup>;
  importAll(b: Backup, mode: 'merge' | 'replace'): Promise<void>;
  dismissError(): void;
}

const Ctx = createContext<{ state: AppState; actions: Actions } | null>(null);

export function newId(prefix: string): string {
  return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function mergeById<T extends { id: string }>(seed: T[], user: T[]): T[] {
  const m = new Map(seed.map((x) => [x.id, x]));
  for (const u of user) m.set(u.id, u);
  return [...m.values()].sort((a, b) => label(a).localeCompare(label(b)));
}
function label(x: { id: string }): string {
  const o = x as unknown as { brand?: string; model?: string };
  return `${o.brand ?? ''} ${o.model ?? x.id}`;
}

export function defaultSetup(name: string): Setup {
  const now = Date.now();
  return {
    id: newId('setup'), name, mains: { material: 'polyester', gaugeMm: 1.25 },
    hitter: 'hard', capWeeks: CAP_WEEKS.hard, checkPct: 20, restringPct: 25,
    hours: [], calib: {}, strungOn: todayIso(), createdAt: now, updatedAt: now,
  };
}

export function AppProvider({ children }: { children: ComponentChildren }) {
  const [db, setDb] = useState<Db | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setups, setSetups] = useState<Setup[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [userStrings, setUserStrings] = useState<StringModel[]>([]);
  const [userRacquets, setUserRacquets] = useState<Racquet[]>([]);
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);

  const reload = useCallback(async (d: Db) => {
    const [s, r, st, rq, cfg] = await Promise.all([
      d.all<Setup>('setups'), d.all<Reading>('readings'), d.all<StringModel>('strings'), d.all<Racquet>('racquets'), d.getSettings(),
    ]);
    setSetups(s.sort((a, b) => b.updatedAt - a.updatedAt));
    setReadings(r);
    setUserStrings(st);
    setUserRacquets(rq);
    setSettingsState({ ...DEFAULT_SETTINGS, ...cfg });
  }, []);

  useEffect(() => {
    let cancelled = false;
    Db.open()
      .then(async (d) => {
        if (cancelled) return;
        setDb(d);
        await reload(d);
        setLoaded(true);
      })
      .catch(() => {
        setError('Storage is unavailable (private browsing?). Changes will not be saved.');
        setLoaded(true);
      });
    if (navigator.storage?.persist) void navigator.storage.persist().catch(() => undefined);
    return () => { cancelled = true; };
  }, [reload]);

  const fail = (e: unknown) => {
    const name = (e as DOMException)?.name;
    setError(name === 'QuotaExceededError' ? 'Storage is full. Export and delete old readings.' : 'That change did not save. Try again.');
  };

  const strings = useMemo(() => mergeById(SEED_STRINGS, userStrings), [userStrings]);
  const racquets = useMemo(() => mergeById(SEED_RACQUETS, userRacquets), [userRacquets]);
  const lib = useMemo<Library>(() => ({ strings: new Map(strings.map((s) => [s.id, s])), racquets: new Map(racquets.map((r) => [r.id, r])) }), [strings, racquets]);
  const active = setups.find((s) => s.id === settings.activeSetupId) ?? setups[0] ?? null;

  const actions = useMemo<Actions>(() => {
    const put = async <T,>(store: 'setups' | 'readings' | 'strings' | 'racquets', v: T) => { try { await db?.put(store, v); } catch (e) { fail(e); throw e; } };
    const del = async (store: 'readings' | 'strings' | 'racquets', id: string) => { try { await db?.delete(store, id); } catch (e) { fail(e); throw e; } };
    const upsert = <T extends { id: string }>(list: T[], v: T) => { const i = list.findIndex((x) => x.id === v.id); return i < 0 ? [v, ...list] : list.map((x, j) => (j === i ? v : x)); };
    const writeSettings = async (next: Settings) => { setSettingsState(next); try { await db?.putSettings(next); } catch (e) { fail(e); } };
    return {
      async saveSetup(s) { const v = { ...s, updatedAt: Date.now() }; setSetups((l) => upsert(l, v)); await put('setups', v); },
      async deleteSetup(id) {
        setSetups((l) => l.filter((s) => s.id !== id));
        setReadings((l) => l.filter((r) => r.setupId !== id));
        try { await db?.deleteSetup(id); } catch (e) { fail(e); }
      },
      async newSetup(name) {
        const s = defaultSetup(name);
        setSetups((l) => [s, ...l]);
        await put('setups', s);
        await writeSettings({ ...settings, activeSetupId: s.id });
        return s;
      },
      async restring(from, startLb, strungOn) {
        const now = Date.now();
        const factor: Partial<Record<'mains' | 'crosses', number>> = { ...from.carriedFactor };
        if (from.calib.mains?.factor) factor.mains = from.calib.mains.factor;
        if (from.calib.crosses?.factor) factor.crosses = from.calib.crosses.factor;
        const s: Setup = {
          ...from, id: newId('setup'), name: `${from.name.replace(/ \(\d{4}-\d{2}-\d{2}\)$/, '')} (${strungOn})`, startLb, strungOn,
          hours: [], calib: {}, carriedFactor: factor, previousId: from.id, createdAt: now, updatedAt: now,
        };
        if (startLb == null) delete s.startLb;
        setSetups((l) => [s, ...l]);
        await put('setups', s);
        await writeSettings({ ...settings, activeSetupId: s.id });
        return s;
      },
      async saveReading(r) { setReadings((l) => upsert(l, r)); await put('readings', r); },
      async deleteReading(id) { setReadings((l) => l.filter((r) => r.id !== id)); await del('readings', id); },
      async saveString(s) { setUserStrings((l) => upsert(l, s)); await put('strings', s); },
      async deleteString(id) { setUserStrings((l) => l.filter((s) => s.id !== id)); await del('strings', id); },
      async saveRacquet(r) { setUserRacquets((l) => upsert(l, r)); await put('racquets', r); },
      async deleteRacquet(id) { setUserRacquets((l) => l.filter((r) => r.id !== id)); await del('racquets', id); },
      async setSettings(patch) { await writeSettings({ ...settings, ...patch }); },
      async exportAll() {
        if (db) return db.exportAll();
        return { app: 'stringbed', version: 1, exportedAt: new Date().toISOString(), setups, readings, strings: userStrings, racquets: userRacquets };
      },
      async importAll(b, mode) {
        if (!db) throw new Error('Storage is unavailable.');
        await db.importAll(b, mode);
        await reload(db);
      },
      dismissError() { setError(null); },
    };
  }, [db, settings, setups, readings, userStrings, userRacquets, reload]);

  // Apply the theme to the document.
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = settings.theme;
  }, [settings.theme]);

  const state: AppState = { loaded, error, setups, readings, strings, racquets, settings, lib, active };
  return <Ctx.Provider value={{ state, actions }}>{children}</Ctx.Provider>;
}

export function useApp(): { state: AppState; actions: Actions } {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside AppProvider');
  return v;
}

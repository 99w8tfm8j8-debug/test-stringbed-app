import { useApp } from './app/state';
import { useRoute } from './app/router';
import { LogScreen } from './screens/LogScreen';
import { MeasureScreen } from './screens/MeasureScreen';
import { CalibrateScreen } from './screens/CalibrateScreen';
import { ValidateScreen } from './screens/ValidateScreen';
import { SetupScreen } from './screens/SetupScreen';
import { LibraryScreen } from './screens/LibraryScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { AboutScreen } from './screens/AboutScreen';
import { UpdateBanner } from './components/UpdateBanner';

const TABS: Array<{ path: string; label: string; icon: string; match: (p: string) => boolean }> = [
  { path: '/', label: 'Log', icon: 'M4 19h16M6 16l4-5 3 3 5-7', match: (p) => p === '/' },
  { path: '/measure', label: 'Measure', icon: 'M3 12h2l2-6 3 12 3-9 2 5 2-2h4', match: (p) => p.startsWith('/measure') || p.startsWith('/calibrate') || p.startsWith('/validate') },
  { path: '/setup', label: 'Setup', icon: 'M12 3c4 0 6 3 6 7s-2 7-6 7-6-3-6-7 2-7 6-7zM12 17v4M9 7h6M8 10h8M9 13h6', match: (p) => p.startsWith('/setup') },
  { path: '/library', label: 'Library', icon: 'M5 4h4v16H5zM10 4h4v16h-4zM15 5l4 1-3 14-4-1', match: (p) => p.startsWith('/library') },
  { path: '/settings', label: 'More', icon: 'M5 12h.01M12 12h.01M19 12h.01', match: (p) => p.startsWith('/settings') || p.startsWith('/about') },
];

function Screen({ path }: { path: string }) {
  switch (path) {
    case '/measure': return <MeasureScreen />;
    case '/calibrate': return <CalibrateScreen />;
    case '/validate': return <ValidateScreen />;
    case '/setup': return <SetupScreen key="edit" isNew={false} />;
    case '/setup/new': return <SetupScreen key="new" isNew />;
    case '/library': return <LibraryScreen />;
    case '/settings': return <SettingsScreen />;
    case '/about': return <AboutScreen />;
    default: return <LogScreen />;
  }
}

const TITLES: Record<string, string> = {
  '/measure': 'Measure', '/calibrate': 'Calibrate', '/validate': 'Validate', '/setup': 'Setup', '/setup/new': 'New setup',
  '/library': 'Library', '/settings': 'Settings', '/about': 'Accuracy',
};

export function App() {
  const { state, actions } = useApp();
  const path = useRoute();
  document.title = TITLES[path] ? `${TITLES[path]} · Stringbed` : 'Stringbed';
  return (
    <>
      <a class="skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
      <main class="wrap" id="main" tabIndex={-1}>
        <header class="topbar">
          <div class="brand">
            <img src="icons/favicon-32.png" width="28" height="28" alt="" />
            <h1>{TITLES[path] ?? 'Stringbed'}</h1>
          </div>
          <a class="btn quiet" href="#/setup/new" aria-label="New setup">+ Setup</a>
        </header>
        <UpdateBanner />
        {state.error && (
          <p class="note bad" role="alert">{state.error} <button class="quiet" onClick={actions.dismissError}>Dismiss</button></p>
        )}
        <Screen path={path} />
      </main>
      <nav class="tabbar" aria-label="Main">
        <div class="inner">
          {TABS.map((t) => (
            <a key={t.path} href={'#' + t.path} aria-current={t.match(path) ? 'page' : undefined}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={t.icon} /></svg>
              {t.label}
            </a>
          ))}
        </div>
      </nav>
    </>
  );
}

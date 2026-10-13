import { render } from 'preact';
import './styles.css';
import { App } from './App';
import { AppProvider } from './app/state';

render(<AppProvider><App /></AppProvider>, document.getElementById('app')!);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).then((reg) => {
      const announce = (sw: ServiceWorker | null) => { if (sw && navigator.serviceWorker.controller) window.dispatchEvent(new CustomEvent('sw-waiting', { detail: sw })); };
      announce(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        sw?.addEventListener('statechange', () => { if (sw.state === 'installed') announce(sw); });
      });
    }).catch(() => undefined);
    // Reload only when an update replaces an existing worker, not on first install.
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloading) { reloading = true; location.reload(); } });
  });
}

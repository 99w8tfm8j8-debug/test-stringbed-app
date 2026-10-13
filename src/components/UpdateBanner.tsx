import { useEffect, useState } from 'preact/hooks';

/** Shows a reload prompt when a new service worker is waiting. */
export function UpdateBanner() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  useEffect(() => {
    const on = (e: Event) => setWaiting((e as CustomEvent<ServiceWorker>).detail);
    window.addEventListener('sw-waiting', on);
    return () => window.removeEventListener('sw-waiting', on);
  }, []);
  if (!waiting) return null;
  return (
    <p class="note ok" role="status">
      A new version is ready. <button class="quiet" onClick={() => waiting.postMessage('skip-waiting')}>Reload to update</button>
    </p>
  );
}

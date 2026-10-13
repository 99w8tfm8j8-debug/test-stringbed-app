import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

/** Emits sw.js with a precache list of every built file (no Workbox dependency). */
function serviceWorker(): Plugin {
  return {
    name: 'stringbed-sw',
    apply: 'build',
    generateBundle(_opts, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map'));
      const publicFiles = ['index.html', 'manifest.webmanifest', 'recorder-worklet.js', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-192.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'];
      const list = ['./', ...[...new Set([...files, ...publicFiles])].sort().map((f) => './' + f)];
      const hash = createHash('sha256');
      for (const f of [...files].sort()) {
        const item = bundle[f]!;
        hash.update(f);
        hash.update(item.type === 'chunk' ? item.code : typeof item.source === 'string' ? item.source : Buffer.from(item.source));
      }
      for (const f of publicFiles) {
        hash.update(f);
        try { hash.update(readFileSync(new URL('./public/' + f, import.meta.url))); } catch { /* index.html is in the bundle */ }
      }
      const version = hash.digest('hex').slice(0, 12);
      const src = readFileSync(new URL('./src/sw-template.js', import.meta.url), 'utf8')
        .replaceAll('__PRECACHE__', JSON.stringify(list, null, 2))
        .replaceAll('__VERSION__', version);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: src });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [preact(), serviceWorker()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: { target: 'es2020', sourcemap: true },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});

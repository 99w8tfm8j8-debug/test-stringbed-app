# Stringbed

A phone-first Progressive Web App that estimates tennis string tension from the sound of a plucked or tapped string, logs readings per racquet, and tells you when to restring based on your own loss rate.

- Pitch detection runs on the device from the microphone (AudioWorklet) or from an uploaded recording.
- Two conversion modes: **calibrated** (default once a calibration exists) and **physics**.
- Every estimate comes with an honest range: never tighter than ±2 lb, and about ±2 to 3 lb at best.
- Per-setup log with a chart, check and restring lines, a weeks cap, an optional hours cap, and a projected restring date.
- Guided calibration, a five-hit repeatability check, JSON backup and restore, and CSV export.
- Works offline, installs to the home screen, has light and dark themes, switches between lb and kg, and works from the keyboard.
- No backend. All data stays in IndexedDB on the device.

This is an independent app. It was built from the string physics and public manufacturer specifications. It does not use code or data from any other tension app.

## Quick start

```bash
npm ci
npm run dev        # http://localhost:5173 (the microphone works on localhost)
npm test           # Vitest: DSP, physics, status logic, storage, seed data
npm run build      # typecheck + production build into dist/
npm run preview    # serve dist/ at http://localhost:4173, service worker on
```

Node 22 is used in CI.

## Deploy

The app is fully static and uses relative paths (`base: './'`) and hash routing, so it works from a domain root or from a subpath such as `https://user.github.io/repo/`. The microphone and service worker need **HTTPS**. GitHub Pages and Netlify both provide it.

### GitHub Pages (workflow included)

1. Push this repository to GitHub.
2. Go to **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**.
3. Push to `main`, or run **Deploy to GitHub Pages** from the Actions tab. `.github/workflows/pages.yml` runs the tests, builds the app and publishes `dist/`.
4. The site appears at `https://<user>.github.io/<repo>/`.

### Netlify

1. In Netlify, choose **Add new site → Import an existing project** and pick the repository.
2. `netlify.toml` already sets the build command (`npm run build`), the publish directory (`dist`) and Node 22. It also serves `sw.js` with `no-cache` so updates are picked up.
3. Deploy. To deploy by hand instead, run `npm run build` and drag `dist/` onto app.netlify.com/drop.

### Updates

Each build generates `sw.js` with a precache list and a content hash. When you deploy a new version, open installs show "A new version is ready" with a reload button.

## Using it

1. **Setup**: pick the racquet and string (or enter your own), choose a gauge, and enter the strung tension and date. Measure the centre main with a ruler and store it. For a hybrid, tick **Hybrid** and set the crosses.
2. **Calibrate** within an hour of stringing, or against a stringer's meter. Pluck until the result locks, then save. Mains and crosses are calibrated separately.
3. **Measure**: remove the dampener and pluck (or tap) the centre main at least three times. The result locks when the hits agree within about 1 Hz. Save it as a reading.
4. **Log** shows the current tension, loss against the strung-at tension, the status (Playable, Check it or Restring now) and the chart.
5. **Restrung?** (on Setup) starts a new job with the same racquet and string. The old job keeps its history.

## How it works

### Physics

A string rings at f = (1 / 2L) √(T / μ), with μ = ρ π d² / 4. So T = μ (2 L f)² in newtons, and lb = N / 4.4482216.

- Sanity check (a unit test): polyester (1.30 g/cm³), 1.25 mm, 320 mm, 46 lb gives **559.6 Hz**.
- **Calibrated mode**: T = T_ref × (f / f_ref)². Errors in L, ρ and d cancel. A unit test checks that it reproduces a known ratio exactly.
- **Physics mode** uses the measured length (or an estimate from head size), the gauge and the density. If you set a per-string density override, it is used instead of the material default. Calibrating also learns a correction factor, `T_ref / T_physics(f_ref)`. That factor carries over to the next job on the same frame and string, which narrows the physics range until you recalibrate.

### Uncertainty shown

The half range is `T × sqrt((2·sd/f)² + s²)` with a 2 lb floor. Here sd is the standard deviation of the hits and s is the systematic error for the mode:

| Mode | s |
| --- | --- |
| Calibrated | 5% (about 2.3 lb at 46 lb) |
| Physics with a carried-over factor | 8% |
| Physics with a measured length | 15% |
| Physics with a length estimated from head size | 20% |

The About screen explains the error sources: effective vibrating length, coupling with the crosses, string stiffness (inharmonicity), temperature and humidity, and the roughly 10% relaxation in the first 24 hours.

### Detection (`src/lib/dsp.ts`)

Ported from the prototype's `dsp.js`:

1. Find the loudest 10 ms window and skip 30 ms of transient.
2. Take 16384 samples, apply a Hann window and zero-pad to 65536.
3. Run an FFT and score each candidate in the band as `|X(f)| + 0.7·max|X(≈2f)| + 0.5·max|X(≈3f)|`. The windows widen with frequency to allow for stiffness.
4. Refine the peak with parabolic interpolation on log magnitude.

Changes from the prototype:

- **Octave-down check.** A tap can make 2f the strongest peak. If there is a real local peak at f/2, well above the noise floor, it is preferred.
- **Explicit rejection.** Clips shorter than 0.1 s, fewer than 4096 samples after the transient, silence, and a peak-to-median ratio below 5 all return `null` instead of a guess. The prototype's "slide back over the transient" fallback was removed, because it produced answers from 0.1 s clips.
- **Multi-hit.** A streaming `HitDetector` cuts one segment per hit from the live stream, and `findOnsets` does the same for files. `summarizeHits` drops outliers more than max(3·1.4826·MAD, 1.5 Hz) from the median, takes the median, and reports spread and SD. It locks at 3 or more kept hits with a spread under 1 Hz.
- **Tap to choose a peak.** `refineAt` snaps to the strongest bin near the tapped frequency and interpolates. With focus on the spectrum, the arrow keys move between peaks.
- **Quality badge** from the peak-to-median ratio: above 25 is clear, above 10 is usable, anything lower is weak.

### Audio capture (`src/audio/capture.ts`)

- `getUserMedia` with `echoCancellation`, `noiseSuppression` and `autoGainControl` all false, and `channelCount: 1`.
- The `AudioContext` is created and `resume()`d synchronously inside the tap handler, before awaiting permission (iOS requirement).
- Raw Float32 samples come from an AudioWorklet (`public/recorder-worklet.js`), with a `ScriptProcessorNode` fallback.
- A muted gain node keeps the graph running without playing the microphone back.
- Capture stops when the page is hidden.
- The file upload decodes with `decodeAudioData`, mixes down to mono, and runs the same analysis.

### Code map

| Path | What |
| --- | --- |
| `src/lib/dsp.ts` | FFT, detector, onsets, hit summary |
| `src/lib/hitDetector.ts` | Streaming onset detector for the live microphone |
| `src/lib/physics.ts` | Tension and frequency, calibration, densities, uncertainty, units |
| `src/lib/status.ts` | Restring status, weeks and hours caps, loss-rate projection |
| `src/lib/db.ts`, `src/lib/backup.ts` | IndexedDB, JSON import and export, CSV |
| `src/app/convert.ts` | Chooses the mode, length and density for a setup and side |
| `src/data/strings.ts`, `src/data/racquets.ts` | Seed library with sources |
| `src/screens/*` | Log, Measure, Calibrate, Validate, Setup, Library, Settings, About |
| `vite.config.ts` | Includes the small plugin that writes `sw.js` (no Workbox) |

## Decisions

| Decision | Why |
| --- | --- |
| **Preact** + Vite + strict TypeScript (`noUncheckedIndexedAccess`) | Small bundle (about 39 kB gzipped JS), React-like ergonomics. |
| **No runtime dependencies besides Preact** | Raw IndexedDB wrapper, a hand-written service worker plugin and hand-drawn SVG charts keep the offline cache tiny and the code auditable. |
| **Hash routing and `base: './'`** | Works on GitHub Pages subpaths with no 404 rewrites. |
| **System fonts** | The prototype's Google Fonts would break offline and leak requests. Font names stay first in the stack in case they are installed. |
| **Readings stored in lb**, converted for display | One canonical unit; switching units never rewrites data. |
| **Status uses mains readings only** | Matches how restring decisions and meters work. Crosses readings are logged and charted as squares. |
| **Weeks cap**: "Check it" at the cap, "Restring now" at 1.5× | Kept from the prototype. The hours cap uses the same rule. |
| **Hitter style sets the default cap**: 6 weeks hard, 12 light | Per the brief. All values stay editable per setup. |
| **Calibration factor carried to the next job** ("Restrung?") | The new job starts in physics mode with a sharper 8% systematic until it is recalibrated. |
| **Crosses length**: if not measured, 80% of the mains estimate; wider crosses band (250 to 1100 Hz) | Rough geometric default; the UI asks for a measurement. |
| **Main-length estimate** = 320 mm × √(head / 100) | Anchored to the brief's 320 mm sanity case. Labelled as an estimate everywhere. |
| **Polyester density 1.30 g/cm³** | Bulk PET is about 1.38. 1.30 is the low end of the 1.3 to 1.4 range in the brief and matches the 559.6 Hz sanity case. Nylon and multifilament 1.14 (nylon 6,6), natural gut 1.30 (collagen), aramid 1.44 (Kevlar 49). Sources are linked in `src/lib/physics.ts` and labelled as estimates in the UI. |
| **Seed verification method** | Direct requests to manufacturer sites were blocked by the build environment's network policy. Each record was confirmed through a web search restricted to the manufacturer's own domain (for example `allowed_domains: ["yonex.com"]`), and only figures the manufacturer page stated were used. If a gauge's millimetre value was not stated, that gauge was omitted. If head size or pattern was not stated, the racquet was dropped. |
| **Seed edits** are saved as user records with the same id | "Reset" restores the seed. User records are marked "yours" and unverified. |
| **`navigator.storage.persist()`** is requested | Lowers the chance of the browser evicting the log. Export remains the real backup. |

## Seed data

There are **61 strings** and **65 racquets**. Every record has `sourceUrl`, `verified` and a `verification` note. The library screen shows them with a "verified" badge and a source link. You can add your own and edit any record.

Coverage of the brief's must-have list:

- **Strings included**:
  - Luxilon ALU Power and Big Banger Original
  - Solinco Hyper-G, Hyper-G Soft, Confidential, Tour Bite and Tour Bite Soft
  - Head Hawk
  - Yonex Poly Tour Pro and Poly Tour Strike
  - Tecnifibre Razor Code, Black Code and X-One Biphase
  - Wilson Revolve, NXT and Natural Gut
  - Kirschbaum Max Power
  - Babolat Touch VS (VS Touch)
  - Aramid hybrids from Ashaway
- **Racquets included**:
  - Yonex Percept 97/100 (and D/H/L), EZONE 98 and 100 (and L/+/Tour), VCORE 95/98/100 (and L/Tour)
  - Babolat Pure Drive and Pure Aero families, and Pure Strike
  - Wilson Clash 100 (v3, Pro, L), Blade 98 16x19 and 18x20 (v9), Pro Staff 97 / 97L / 97UL / X (v14), Ultra 100 v5
  - Head Speed MP 2026, Radical MP 2025, Gravity MP / MP L / Pro / Team 2025, Boom Pro and MP Alternate
  - Dunlop CX 200, CX 200 Tour 18x20, CX 400 Tour, FX 500 and FX 500 Tour, SX 300 Tour
  - Tecnifibre TF40 (305/315/290), TF-X1 and T-Fight

### Dropped: could not be confirmed on a manufacturer page

These are also listed in the app under **More → Library records left out**.

- **Babolat RPM Blast, RPM Team, RPM Rough/Soft/Power, Xcel.** babolat.com renders gauges in a dropdown that could not be read, so no millimetre values were confirmed.
- **Head Lynx (all versions), Velocity MLT, Hawk Touch, Sonic Pro, RIP Control.** The gauge field on head.com is empty in the indexed pages. Head Hawk was confirmed through head.com's Romanian page.
- **Prince Synthetic Gut, Gamma Synthetic Gut / Live Wire / Moto, Yonex Rexis, Solinco Revolution / Barb Wire, Signum Pro.** No gauge in millimetres on the manufacturer page, or no page at all.
- **Prince Phantom family (100X, 97P, 107G).** No Prince specification page was found on princetennis.com.
- **Yonex EZONE 102.** Only an ambiguous series table was found.
- **Wilson Blade 100 / 104 v9, Clash 98 / 108, Shift 99, Pro Staff RF97.** No head size or pattern was found on a Wilson page.
- **Head Speed Pro / MP L / Team 2026, Radical Pro, Extreme MP, Prestige MP.** Head size or pattern was missing or ambiguous on head.com.
- **Dunlop CX 400, CX 200 LS, CX 200 Tour 16x19.** No head size or pattern was found for that exact model.

Add any of these yourself in **Library → Add**. It takes about 20 seconds.

## Tests

`npm test` runs 66 Vitest tests. The CI workflow `.github/workflows/ci.yml` runs typecheck, tests and build on every push.

- **DSP**: synthetic plucks at 44.1 and 48 kHz are detected within **0.05 Hz**. The plucks decay, carry harmonics and noise, and include stiff-string partials. The set includes cases where the 2nd harmonic is louder than the fundamental, one where 2f is inside the search band, and the crosses range.
- **Rejection**: silence, near-silence, white noise and clips shorter than 0.1 s all return `null`.
- **Multi-hit and streaming**: the live-stream detector emits three hits and locks. Outlier rejection and the lock rule are covered.
- **Physics**: the 559.6 Hz sanity check, scaling laws, calibrated mode reproducing a known ratio exactly, the learned factor, the uncertainty floor and lb/kg conversion.
- **Status**: the check and restring lines, weeks and hours caps, the light-hitter cap, and the loss-rate projection.
- **Storage**: IndexedDB through `fake-indexeddb`, backup round trip, cascade delete, import validation, and CSV quoting with formula-injection guarding.
- **Seed data**: at least 60 of each, unique ids, a source on every record, and plausible gauges and head sizes.

An end-to-end run was also done in headless Chromium (Playwright, not committed) with a fake microphone fed a WAV of four synthetic plucks:

- The live AudioWorklet path detected 559.40, 559.70, 559.60 and 559.50 Hz, which exactly matches the synthesized values, and locked.
- File upload gave the same result.
- Physics mode showed 46.0 lb.
- The app reloaded offline from the service worker.

## Manual checklist: iPhone Safari and Android Chrome

Run this against the deployed HTTPS URL. These steps have **not** been run on physical devices yet.

**Both platforms**

- [ ] The first tap on **Start listening** shows the microphone permission prompt. Denying it shows a clear message. Allowing it shows "Listening via AudioWorklet" (or the ScriptProcessor fallback) and a moving level meter.
- [ ] Three firm plucks on a centre main (dampener off, phone 2 to 10 cm away) produce three hits with "Clear peak" badges, and the panel shows **Locked** with a spread under 1 Hz.
- [ ] Tap mode with a pen: hits land on the fundamental. If one lands on 2f, tapping the lower peak on the spectrum moves the marker.
- [ ] Tapping the hit spectrum moves the marker, and "Use automatic peak" restores it.
- [ ] The level meter turns red and says "Too loud" when you clip right next to the mic.
- [ ] **Analyse a recording** with a voice-memo file (.m4a) gives the same result as live.
- [ ] Calibrate, then measure again: calibrated mode with a range of about ±2 to 3 lb.
- [ ] Validate shows five hits and a standard deviation.
- [ ] The lb/kg toggle and the light/dark theme update every screen.
- [ ] Export JSON and CSV, clear site data, import the JSON, and the data is back.
- [ ] Switching to another app while listening stops the microphone (no recording indicator left on).

**iPhone Safari (iOS 16 or later)**

- [ ] Share → **Add to Home Screen**. The icon and the name "Stringbed" appear, and it opens full screen with no Safari UI.
- [ ] In the installed app, the microphone works (iOS asks again per installed app).
- [ ] Turn on Airplane mode, then open the installed app: it loads, the log is there, and file analysis works.
- [ ] The bottom tab bar clears the home indicator (safe-area padding).

**Android Chrome**

- [ ] An install prompt appears, or use the menu → **Install app**. The icon is the maskable version (no white box).
- [ ] Airplane mode, then open from the home screen: it loads offline.
- [ ] Deploy a new version: the installed app shows "A new version is ready" and reloads into it.

## Unverified and known limitations

- **Real-device behaviour is untested.** Microphone permission, AudioWorklet on iOS Safari, locking on real plucks, install, and offline use are covered only by the manual checklist above. Real strings may need the detection band or thresholds tuned: the onset threshold is about −50 dBFS and the minimum peak-to-median ratio is 5.
- **Material densities are bulk-polymer estimates**, not measured tennis strings. The 1.30 g/cm³ polyester default comes from the brief's sanity case.
- **Main-length estimates from head size** are approximations (320 mm × √(head/100)). Crosses default to 80% of that.
- **Seed verification** used a search engine's index of manufacturer pages, not a live page fetch, because direct access was blocked here. Specifications can change between generations; each record links to its source.
- Some seed records rely on regional manufacturer pages (for example head.com/en_RO for Hawk, pl.babolat.com for Touch VS) or on Wilson regional stores. Several racquets assume a 27 in length where the page did not state one; their `verification` field says so.
- Uncertainty percentages per mode are engineering judgement, not measured against a reference meter.
- The live spectrum trace uses the browser's AnalyserNode, which is smoothed and for orientation only. Tension always comes from the full-resolution per-hit FFT.

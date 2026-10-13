// Seed string library. Every record was checked against a page on the
// manufacturer's own domain (see sourceUrl). Direct page fetches were blocked in
// the build environment, so checks were made through a search engine restricted
// to the manufacturer's domain; `verification` says what was confirmed.
// Gauge labels are copied as the manufacturer prints them (e.g. Tecnifibre and
// Kirschbaum label by millimetre only; Tecnifibre calls 1.25 mm "17").
import type { Feel, Gauge, StringModel } from '../lib/types';
import type { MaterialClass } from '../lib/physics';

const VERIFIED_HOW = 'Gauges and material confirmed on the manufacturer page (via domain-restricted search, Oct 2026).';

function slug(s: string): string {
  return s.toLowerCase().replace(/\+/g, ' plus').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function g(...pairs: Array<[string, number]>): Gauge[] {
  return pairs.map(([label, mm]) => ({ label, mm }));
}
/** Millimetre-only gauges, as Tecnifibre, Kirschbaum and others sell them. */
function mm(...values: number[]): Gauge[] {
  return values.map((v) => ({ label: v.toFixed(2), mm: v }));
}

function s(brand: string, model: string, material: MaterialClass, construction: string, gauges: Gauge[], sourceUrl: string, extra: { feel?: Feel; verification?: string } = {}): StringModel {
  return {
    id: 'str-' + slug(brand + ' ' + model),
    brand, model, material, construction, gauges, sourceUrl,
    verified: true,
    verification: extra.verification ?? VERIFIED_HOW,
    ...(extra.feel ? { feel: extra.feel } : {}),
  };
}

const POLY = 'polyester' as const;
const MONO = 'Co-polyester monofilament';

export const SEED_STRINGS: StringModel[] = [
  // Luxilon (Wilson group)
  s('Luxilon', 'ALU Power', POLY, MONO, mm(1.25, 1.3), 'https://www.luxilon.com/en-us/product/alu-power-130-set-wr8302200'),
  s('Luxilon', 'ALU Power Rough', POLY, 'Co-polyester monofilament, textured surface', mm(1.25, 1.3), 'https://www.luxilon.com/en-us/product/alu-power-rough-125-set-rz99520'),
  s('Luxilon', 'ALU Power Soft', POLY, MONO, mm(1.25), 'https://www.luxilon.com/en-us/product/alu-power-soft-125-set-rz99102', { feel: 'soft', verification: VERIFIED_HOW + ' Manufacturer describes a soft texture; only 1.25 mm confirmed.' }),
  s('Luxilon', '4G', POLY, MONO, mm(1.25, 1.3), 'https://www.luxilon.com/en-us/product/4g-125-set-rz99710'),
  s('Luxilon', 'Element', POLY, 'Multi-mono polyester', mm(1.25, 1.28, 1.3), 'https://www.luxilon.com/en-us/product/element-125-set-rz99110', { verification: VERIFIED_HOW + ' 1.28 mm is listed for Element Black.' }),
  s('Luxilon', 'Big Banger Original', POLY, MONO, g(['17G', 1.3]), 'https://au.wilson.com/products/luxilon-original-130-string-reel', { verification: VERIFIED_HOW + ' Only the 1.30 mm (labelled 17G by Luxilon) gauge confirmed.' }),
  s('Luxilon', 'Original Rough', POLY, 'Co-polyester monofilament, textured surface', mm(1.3), 'https://www.luxilon.com/en-us/product/original-rough-130-set-rz99622'),

  // Solinco
  s('Solinco', 'Hyper-G', POLY, MONO, g(['15L', 1.35], ['16', 1.3], ['16L', 1.25], ['17', 1.2], ['18', 1.15], ['19', 1.1], ['20', 1.05]), 'https://solincosports.com/equipment/hyper-g/'),
  s('Solinco', 'Hyper-G Soft', POLY, MONO, g(['16', 1.3], ['16L', 1.25], ['17', 1.2], ['18', 1.15]), 'https://solincosports.com/equipment/hyper-g-soft/', { feel: 'soft', verification: VERIFIED_HOW + ' Manufacturer calls it a softer formula of Hyper-G.' }),
  s('Solinco', 'Hyper-G Round', POLY, 'Co-polyester monofilament, round', g(['16', 1.3], ['16L', 1.25], ['17', 1.2], ['18', 1.15]), 'https://solincosports.com/equipment/hyper-g-round/'),
  s('Solinco', 'Tour Bite', POLY, MONO, g(['15L', 1.35], ['16', 1.3], ['16L', 1.25], ['17', 1.2], ['18', 1.15], ['19', 1.1], ['20', 1.05]), 'https://solincosports.com/the-ultimate-gauge-guide/', { verification: VERIFIED_HOW + ' Solinco gauge guide: full range 15L to 20; mm per Solinco gauge table.' }),
  s('Solinco', 'Tour Bite Soft', POLY, MONO, g(['16', 1.3], ['16L', 1.25], ['17', 1.2], ['18', 1.15]), 'https://shop.solincosports.com/products/tour-bite-soft', { feel: 'soft' }),
  s('Solinco', 'Tour Bite Diamond Rough', POLY, 'Co-polyester monofilament, textured', g(['16', 1.3], ['16L', 1.25], ['17', 1.2]), 'https://solincosports.com/equipment/tour-bite-diamond-rough/'),
  s('Solinco', 'Confidential', POLY, MONO, g(['16', 1.3], ['16L', 1.25], ['17', 1.2], ['18', 1.15]), 'https://shop.solincosports.com/products/confidential'),
  s('Solinco', 'Outlast', POLY, MONO, g(['16', 1.3], ['16L', 1.25], ['17', 1.2], ['18', 1.15]), 'https://solincosports.com/outlast'),
  s('Solinco', 'Vanquish', 'multifilament', 'Multifilament', g(['15L', 1.35], ['16', 1.3], ['17', 1.2]), 'https://solincosports.com/vanquish'),
  s('Solinco', 'X-Natural', 'multifilament', 'Multifilament', g(['15L', 1.35], ['16', 1.3], ['17', 1.2]), 'https://solincosports.com/product/x-natural'),

  // Yonex
  s('Yonex', 'Poly Tour Pro', POLY, MONO, g(['1.15', 1.15], ['17', 1.2], ['16L', 1.25], ['16', 1.3]), 'https://us.yonex.com/products/polytour-pro-125-reel', { verification: VERIFIED_HOW + ' 1.15 mm from Yonex item code PTGP115 (no gauge label printed for it).' }),
  s('Yonex', 'Poly Tour Strike', POLY, MONO, g(['17', 1.2], ['16L', 1.25], ['16', 1.3]), 'https://us.yonex.com/products/polytour-strike-125-set'),
  s('Yonex', 'Poly Tour Rev', POLY, 'Co-polyester monofilament, octagonal', g(['17', 1.2], ['16L', 1.25], ['16', 1.3]), 'https://us.yonex.com/products/polytour-rev-125-set'),
  s('Yonex', 'Poly Tour Fire', POLY, MONO, g(['17', 1.2], ['16', 1.3]), 'https://us.yonex.com/products/polytour-fire-120-set'),
  s('Yonex', 'Poly Tour Spin', POLY, 'Co-polyester monofilament, pentagonal', g(['17', 1.2], ['16L', 1.25]), 'https://us.yonex.com/products/polytour-spin-125-set'),
  s('Yonex', 'Poly Tour Air', POLY, MONO, g(['16L', 1.25]), 'https://www.yonex.com/polytour-air-125-ptga125'),

  // Head
  s('Head', 'Hawk', POLY, MONO, mm(1.2, 1.25, 1.3), 'https://www.head.com/en_RO/tennis/strings/hawk-6.html'),

  // Tecnifibre
  s('Tecnifibre', 'Razor Code', POLY, MONO, mm(1.2, 1.25, 1.3), 'https://www.tecnifibre.com/en-ue/products/bobine-razor-code-white'),
  s('Tecnifibre', 'Razor Soft', POLY, MONO, mm(1.2, 1.25), 'https://www.tecnifibre.com/en/p/04RRAS120W.html', { feel: 'soft' }),
  s('Tecnifibre', 'Black Code', POLY, MONO, mm(1.18, 1.24, 1.28, 1.32), 'https://www.tecnifibre.com/en/products/garniture-black-code'),
  s('Tecnifibre', 'Black Code 4S', POLY, 'Co-polyester monofilament, square', g(['18', 1.2], ['17', 1.25], ['16', 1.3]), 'http://produit.tecnifibre.com/en/Product/Strings/Polyester/Black-Code-4S/342'),
  s('Tecnifibre', 'Ice Code', POLY, 'Co-polyester monofilament, round, wax finish', mm(1.2, 1.25, 1.3), 'https://www.tecnifibre.com/en/products/bobine-ice-code-blanc'),
  s('Tecnifibre', 'Red Code', POLY, MONO, mm(1.2, 1.25, 1.3), 'https://www.tecnifibre.com/en/products/garniture-red-code'),
  s('Tecnifibre', 'X-One Biphase', 'multifilament', 'Multifilament, PU', mm(1.18, 1.24, 1.3, 1.34), 'https://www.tecnifibre.com/en/products/garniture-x-one-biphase-naturel', { verification: VERIFIED_HOW + ' 1.34 mm is listed for the natural colour only.' }),
  s('Tecnifibre', 'NRG2', 'multifilament', 'Multifilament (Elastyl microfilaments)', mm(1.18, 1.24, 1.32), 'https://www.tecnifibre.com/en/products/garniture-nrg2-naturel'),
  s('Tecnifibre', 'Multifeel', 'multifilament', 'Multifilament', mm(1.25, 1.3), 'https://www.tecnifibre.com/en/products/garniture-multifeel-black'),
  s('Tecnifibre', 'Triax', 'multifilament', 'Multifilament', mm(1.28, 1.33, 1.38), 'https://www.tecnifibre.com/en/products/garniture-triax-naturel'),

  // Wilson
  s('Wilson', 'NXT', 'multifilament', 'Multifilament', g(['17', 1.24], ['16', 1.3]), 'https://www.wilson.com/en-us/product/nxt-rz94270'),
  s('Wilson', 'NXT Power', 'multifilament', 'Multifilament', g(['18', 1.21]), 'https://www.wilson.com/en-us/products/nxt-power-18-tennis-string-set-rz94160'),
  s('Wilson', 'Sensation', 'multifilament', 'Multifilament', g(['16', 1.3]), 'https://sg.wilson.com/products/wilson-sensation-16-tennis-string-wr830860116-wr830890116'),
  s('Wilson', 'Synthetic Gut Power', 'synthetic', 'Solid-core nylon', g(['16', 1.3]), 'https://au.wilson.com/products/synthetic-gut-power-16-tennis-string-set'),
  s('Wilson', 'Revolve', POLY, 'Polyester monofilament', g(['16', 1.3]), 'https://www.wilson.com/en-us/products/revolve-16-tennis-string-200m-reel-rz90620'),
  s('Wilson', 'Revolve Spin', POLY, 'Polyester monofilament', g(['17', 1.25]), 'https://www.wilson.com/en-us/products/revolve-spin-17-tennis-string-set-wr8303800'),
  s('Wilson', 'Natural Gut', 'natural-gut', 'Natural gut', g(['16', 1.3]), 'https://www.wilson.com/en-us/product/natural-gut-16-set-rz99980', { verification: VERIFIED_HOW + ' A 17 gauge is sold but its millimetre value is not stated, so it is omitted.' }),

  // Babolat
  s('Babolat', 'Touch VS', 'natural-gut', 'Natural gut', g(['16', 1.3], ['15L', 1.35]), 'https://pl.babolat.com/product/tennis/racketstring/vs-touch-201025'),

  // Kirschbaum
  s('Kirschbaum', 'Max Power', POLY, MONO, mm(1.2, 1.25, 1.3), 'https://kirschbaum-strings.com/en/products/max-power-set'),
  s('Kirschbaum', 'Max Power Rough', POLY, 'Co-polyester monofilament, profiled', mm(1.2, 1.25, 1.3), 'https://kirschbaum-strings.com/en/products/max-power-rough-set'),
  s('Kirschbaum', 'Flash', POLY, MONO, mm(1.2, 1.25, 1.3), 'https://kirschbaum-strings.com/en/collections/string-sets/products/flash-set'),
  s('Kirschbaum', 'Black Shark', POLY, MONO, mm(1.25, 1.3), 'https://kirschbaum-strings.com/products/black-shark-set'),
  s('Kirschbaum', 'Super Smash', POLY, MONO, mm(1.23, 1.28), 'https://kirschbaum-strings.com/en/products/super-smash-set'),
  s('Kirschbaum', 'Synthetic Gut', 'synthetic', 'Nylon', mm(1.25, 1.3, 1.35), 'https://kirschbaum-strings.com/en/products/synthetic-gut-reel'),

  // Gamma
  s('Gamma', 'Gamma Gut', 'natural-gut', 'Natural gut', g(['17', 1.27], ['16', 1.32]), 'https://gammasports.com/products/gamma-gut'),
  s('Gamma', 'Live Wire XP', 'multifilament', 'Multifilament', g(['16', 1.3]), 'https://gammasports.com/products/gamma-live-wire-xp'),

  // Ashaway (aramid)
  s('Ashaway', 'Kevlar', 'aramid', 'Braided aramid (Kevlar)', g(['18', 1.1], ['17', 1.25], ['16', 1.3]), 'https://www.ashawayusa.com/kevlar.php'),
  s('Ashaway', 'Crossfire 17', 'aramid', 'Hybrid: aramid mains 1.25 mm, synthetic gut crosses 1.30 mm', g(['17 (mains)', 1.25]), 'https://www.ashawayusa.com/crossfire.php', { verification: VERIFIED_HOW + ' Set the 1.30 mm synthetic crosses as a hybrid.' }),
  s('Ashaway', 'Crossfire II', 'aramid', 'Hybrid: aramid mains 1.30 mm, synthetic gut crosses 1.30 mm', g(['16 (mains)', 1.3]), 'https://www.ashawayusa.com/crossfire.php', { verification: VERIFIED_HOW + ' Set the 1.30 mm synthetic crosses as a hybrid.' }),
  s('Ashaway', 'Crossfire ZX', 'aramid', 'Hybrid: Kevlar +Plus mains 1.25 mm, Zyex monofilament crosses 1.22 mm', g(['17 (mains)', 1.25]), 'https://www.ashawayusa.com/crossfireZX.php', { verification: VERIFIED_HOW + ' Set the 1.22 mm crosses as a hybrid.' }),

  // Diadem
  s('Diadem', 'Solstice Power', POLY, MONO, g(['15L', 1.35], ['16', 1.3], ['16L', 1.25], ['17', 1.2], ['18', 1.15]), 'https://diademsports.com/products/diadem-solstice-power'),
  s('Diadem', 'Evolution', 'multifilament', 'Multifilament', g(['17', 1.25], ['16', 1.3], ['15L', 1.35]), 'https://diademsports.com/products/evolution-tennis-string', { verification: VERIFIED_HOW + ' Construction class taken from Diadem\'s string finder; confirm before relying on the density default.' }),

  // Dunlop
  s('Dunlop', 'Explosive Red', POLY, MONO, g(['17G', 1.25], ['16G', 1.3]), 'https://dunlopsports.com/products/tennis/strings/explosive-red/'),
  s('Dunlop', 'Explosive Tour', POLY, MONO, g(['16G', 1.3]), 'https://dunlopsports.com/products/tennis/strings/explosive-tour/', { verification: VERIFIED_HOW + ' 17G and 18G are sold but their mm values are not stated, so they are omitted.' }),

  // Polyfibre
  s('Polyfibre', 'Black Venom', POLY, MONO, mm(1.15, 1.2, 1.25, 1.3), 'https://shop.polyfibre.com/produkt/black-venom/'),
  s('Polyfibre', 'Hexablade', POLY, 'Co-polyester monofilament, hexagonal', mm(1.18, 1.2, 1.25), 'https://shop.polyfibre.com/produkt/hexablade/'),
  s('Polyfibre', 'TCS', POLY, MONO, mm(1.15, 1.2, 1.25, 1.3), 'https://shop.polyfibre.com/produkt/tcs/'),
];

/** Requested or popular models left out because no manufacturer page confirmed their gauges. */
export const DROPPED_STRINGS: Array<{ name: string; reason: string }> = [
  { name: 'Babolat RPM Blast', reason: 'babolat.com shows gauges only in a dropdown that search could not read; no millimetre values confirmed.' },
  { name: 'Babolat RPM Team', reason: 'Same as RPM Blast: gauge field empty in the indexed manufacturer page.' },
  { name: 'Babolat RPM Rough / RPM Soft / RPM Power', reason: 'Gauge values not readable on babolat.com.' },
  { name: 'Babolat Xcel', reason: 'Gauge values not readable on babolat.com.' },
  { name: 'Head Lynx / Lynx Tour / Lynx Touch / Lynx Power', reason: 'head.com product pages have an empty gauge field in the indexed text.' },
  { name: 'Head Velocity MLT', reason: 'Gauge values not readable on head.com.' },
  { name: 'Head Hawk Touch / Sonic Pro / RIP Control', reason: 'Gauge values not readable on head.com.' },
  { name: 'Prince Synthetic Gut (Duraflex)', reason: 'No Prince product page for strings could be found.' },
  { name: 'Gamma Synthetic Gut, Live Wire, Moto', reason: 'Manufacturer lists 16 and 17 gauge without millimetre values.' },
  { name: 'Yonex Rexis', reason: 'No manufacturer page found.' },
  { name: 'Solinco Revolution, Barb Wire', reason: 'No gauge list found on solincosports.com.' },
  { name: 'Signum Pro Poly Plasma, Hyperion, Firestorm', reason: 'Manufacturer pages give no gauges.' },
  { name: 'Wilson Champion\'s Choice', reason: 'No manufacturer page found.' },
];

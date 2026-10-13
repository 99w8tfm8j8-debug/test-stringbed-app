// Seed racquet library. Head size and string pattern were confirmed on the
// manufacturer's own domain for every record (via domain-restricted search; direct
// fetches were blocked in the build environment). Length is 27 in unless the
// manufacturer page gave another value; `verification` notes where the length
// was not stated.
//
// mainLengthMm is an ESTIMATE of the centre main's vibrating length, scaled from
// head size: 320 mm * sqrt(headSize / 100). It is only a starting point for
// physics mode. Measure the centre main between the inside of the frame
// (grommet to grommet) with a ruler and store it on the setup.
import type { Racquet } from '../lib/types';

export function estimateMainLengthMm(headSizeSqIn: number): number {
  return Math.round(320 * Math.sqrt(headSizeSqIn / 100));
}

const HOW = 'Head size, pattern and length confirmed on the manufacturer page (via domain-restricted search, Oct 2026).';
const HOW_NO_LEN = 'Head size and pattern confirmed on the manufacturer page; length not stated there, 27 in assumed (standard).';

function slug(s: string): string {
  return s.toLowerCase().replace(/\+/g, ' plus').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function r(brand: string, model: string, headSizeSqIn: number, pattern: string, sourceUrl: string, lengthIn: number | null = 27, note?: string): Racquet {
  return {
    id: 'rq-' + slug(brand + ' ' + model),
    brand, model, headSizeSqIn, pattern,
    lengthIn: lengthIn ?? 27,
    mainLengthMm: estimateMainLengthMm(headSizeSqIn),
    sourceUrl,
    verified: true,
    verification: (lengthIn == null ? HOW_NO_LEN : HOW) + (note ? ' ' + note : ''),
  };
}

export const SEED_RACQUETS: Racquet[] = [
  // Yonex
  r('Yonex', 'Percept 97', 97, '16x19', 'https://www.yonex.com/percept-97'),
  r('Yonex', 'Percept 97D', 97, '18x20', 'https://us.yonex.com/products/percept-97d', null),
  r('Yonex', 'Percept 97H', 97, '16x19', 'https://www.yonex.com/tennis/racquets/percept/percept-97h'),
  r('Yonex', 'Percept 97L', 97, '16x19', 'https://us.yonex.com/products/percept-97l', null),
  r('Yonex', 'Percept 100', 100, '16x19', 'https://us.yonex.com/products/percept-100'),
  r('Yonex', 'Percept 100D', 100, '18x19', 'https://www.yonex.com/tennis/racquets/percept-100d', null),
  r('Yonex', 'EZONE 98', 98, '16x19', 'https://us.yonex.com/products/ezone-98'),
  r('Yonex', 'EZONE 98L', 98, '16x19', 'https://us.yonex.com/products/ezone-98-l'),
  r('Yonex', 'EZONE 98+', 98, '16x19', 'https://www.yonex.com/ez98p', 27.5),
  r('Yonex', 'EZONE 98 Tour', 98, '16x19', 'https://us.yonex.com/products/ezone-98-tour', null),
  r('Yonex', 'EZONE 100', 100, '16x19', 'https://www.yonex.com/ez100'),
  r('Yonex', 'EZONE 100L', 100, '16x19', 'https://www.yonex.com/ez100l'),
  r('Yonex', 'VCORE 95', 95, '16x20', 'https://us.yonex.com/products/vcore-95'),
  r('Yonex', 'VCORE 98', 98, '16x19', 'https://us.yonex.com/products/vcore-98'),
  r('Yonex', 'VCORE 98L', 98, '16x19', 'https://www.yonex.com/07vc98l'),
  r('Yonex', 'VCORE 98 Tour', 98, '16x19', 'https://us.yonex.com/products/vcore-98-tour-1', null),
  r('Yonex', 'VCORE 100', 100, '16x19', 'https://us.yonex.com/products/08vcore-100', null),
  r('Yonex', 'VCORE 100L', 100, '16x19', 'https://www.yonex.com/vcore-100l'),

  // Babolat
  r('Babolat', 'Pure Drive (Gen11)', 100, '16x19', 'https://www.babolat.com/us/pure-drive-gen11-unstrung/101553.html'),
  r('Babolat', 'Pure Drive 98 (Gen11)', 98, '16x20', 'https://www.babolat.com/us/pure-drive-98-gen11-unstrung/101551.html'),
  r('Babolat', 'Pure Drive+ (Gen11)', 100, '16x19', 'https://www.babolat.com/gb/pure-drive-2025.html', 27.5),
  r('Babolat', 'Pure Drive Team (Gen11)', 100, '16x19', 'https://www.babolat.com/us/pure-drive-team-gen11-unstrung/101554.html'),
  r('Babolat', 'Pure Drive Lite (Gen11)', 100, '16x19', 'https://www.babolat.com/us/pure-drive-lite-gen11-unstrung/101555.html'),
  r('Babolat', 'Pure Drive 107 (Gen11)', 107, '16x19', 'https://www.babolat.com/us/pure-drive-107-gen11-unstrung/101557.html', 27.2),
  r('Babolat', 'Pure Aero (Gen9)', 100, '16x19', 'https://www.babolat.com/us/pure-aero-gen9-unstrung/101569.html'),
  r('Babolat', 'Pure Aero 98 (Gen9)', 98, '16x20', 'https://www.babolat.com/us/pure-aero-98-gen9-unstrung/101567.html'),
  r('Babolat', 'Pure Aero Team (Gen9)', 100, '16x19', 'https://www.babolat.com/us/pure-aero-team-gen9-unstrung/101571.html'),
  r('Babolat', 'Pure Aero Lite', 100, '16x19', 'https://www.babolat.com/us/pure-aero-lite-unstrung/370-101491.html'),
  r('Babolat', 'Pure Strike 100 (Gen4)', 100, '16x19', 'https://www.babolat.com/gb/pure-strike-100-gen4-unstrung/101579.html'),
  r('Babolat', 'Pure Strike 100 16/20 (Gen4)', 100, '16x20', 'https://www.babolat.com/us/pure-strike-100-16-20-gen4-unstrung/101534.html'),
  r('Babolat', 'Pure Strike 98 16/19 (Gen4)', 98, '16x19', 'https://www.babolat.com/us/tennis/collections/pure-strike.html'),
  r('Babolat', 'Pure Strike 98 18/20 (Gen4)', 98, '18x20', 'https://babolat.com/us/pure-strike-18-20-gen4-unstrung/101526.html'),
  r('Babolat', 'Pure Strike Team (Gen4)', 100, '16x19', 'https://www.babolat.com/us/pure-strike-team-gen4-unstrung/101580.html'),

  // Wilson
  r('Wilson', 'Clash 100 v3', 100, '16x19', 'https://sg.wilson.com/products/wilson-clash-100-v3.0-performance-racket-unstrung-wr172811'),
  r('Wilson', 'Clash 100 Pro v3', 100, '16x19', 'https://ph.wilson.com/products/clash-100-pro-v3-0-professional-tennis-racket'),
  r('Wilson', 'Clash 100L v3', 100, '16x19', 'https://www.wilson.com/en-us/products/clash-100l-v3-tennis-racket-wr17290'),
  r('Wilson', 'Blade 98 16x19 v9', 98, '16x19', 'https://www.wilson.com/sites/default/files/Wilson_Blade_v9_98_16x19_StringingInstructions.pdf'),
  r('Wilson', 'Blade 98 18x20 v9', 98, '18x20', 'https://ph.wilson.com/products/blade-98-v9-professional-tennis-racket-wr149911u', 27, 'One Wilson page lists 97 sq in for the Pro variant.'),
  r('Wilson', 'Pro Staff 97 v14', 97, '16x19', 'https://www.wilson.com/sites/default/files/Wilson_ProStaff_v14_97_StringingInstructions.pdf'),
  r('Wilson', 'Pro Staff 97L v14', 97, '16x19', 'https://id.wilson.com/en/pages/pro-staff', null),
  r('Wilson', 'Pro Staff 97UL v14', 97, '16x19', 'https://id.wilson.com/en/pages/pro-staff', null),
  r('Wilson', 'Pro Staff X v14', 100, '16x19', 'https://id.wilson.com/en/pages/pro-staff', null),
  r('Wilson', 'Ultra 100 v5', 100, '16x19', 'https://www.wilson.com/en-us/products/ultra-100-v5-tennis-racket-wr17880', null),

  // Head
  r('Head', 'Speed MP (2026)', 100, '16x19', 'https://www.head.com/en_US/product/speed-mp-2026-232026', null),
  r('Head', 'Radical MP (2025)', 98, '16x19', 'https://www.head.com/en_US/product/radical-mp-2025-231015', null),
  r('Head', 'Gravity MP (2025)', 100, '16x20', 'https://www.head.com/en_US/product/gravity-mp-2025-231125', null),
  r('Head', 'Gravity MP L (2025)', 100, '16x20', 'https://www.head.com/en_US/product/gravity-mp-l-2025-231135', null),
  r('Head', 'Gravity Pro (2025)', 100, '18x20', 'https://www.head.com/en_US/product/gravity-pro-2025-231105', null),
  r('Head', 'Gravity Team (2025)', 104, '16x20', 'https://head.com/product/gravity-team-2025-231145', null),
  r('Head', 'Boom Pro (2024)', 98, '16x19', 'https://www.head.com/en_US/product/boom-pro-2024-230104', null),
  r('Head', 'Boom MP Alternate (2026)', 100, '16x19', 'https://www.head.com/en_US/product/boom-mp-alternate-2026-232406', null),

  // Dunlop
  r('Dunlop', 'CX 200 (2024)', 98, '16x19', 'https://us.dunlopsports.com/dunlop/tennis/rackets/cx-series/cx-200-tennis-racket/CX200-24.html'),
  r('Dunlop', 'CX 200 Tour 18x20', 95, '18x20', 'https://ca.dunlopsports.com/products/dunlop-cx-200-tour-18x20-tennis-racket'),
  r('Dunlop', 'CX 400 Tour', 100, '16x19', 'https://us.dunlopsports.com/dunlop/tennis/rackets/cx-series/cx-400-tour-tennis-racket/10349682.html'),
  r('Dunlop', 'FX 500', 100, '16x19', 'https://us.dunlopsports.com/dunlop/tennis/rackets/fx-series/fx-500/MFX50026.html'),
  r('Dunlop', 'FX 500 Tour', 98, '16x19', 'https://us.dunlopsports.com/dunlop/tennis/rackets/fx-series/fx-500-tour/10369895.html'),
  r('Dunlop', 'SX 300 Tour', 98, '16x19', 'https://us.dunlopsports.com/dunlop/tennis/rackets/sx-series/sx-300-tour-tennis-racket/SX300T-25.html'),

  // Tecnifibre
  r('Tecnifibre', 'TF40 305 16M V3', 98, '16x19', 'https://www.tecnifibre.com/en/products/tf-40-305-16m-v3'),
  r('Tecnifibre', 'TF40 305 18M V3', 98, '18x20', 'https://www.tecnifibre.com/en/products/tf-40-305-18m-v3'),
  r('Tecnifibre', 'TF40 315 16M V3', 98, '16x19', 'https://www.tecnifibre.com/en-uee/products/tf-40-315-16m-v3'),
  r('Tecnifibre', 'TF40 315 18M', 98, '18x20', 'https://develop.tecnifibre.com/en/p/14TF43158.html'),
  r('Tecnifibre', 'TF40 290 16M V3', 98, '16x19', 'https://www.tecnifibre.com/en/p/14TF44906.html'),
  r('Tecnifibre', 'TF-X1 V2 300', 100, '16x19', 'https://www.tecnifibre.com/en/products/tf-x1-v2-300'),
  r('Tecnifibre', 'TF-X1 V2 285', 100, '16x19', 'https://www.tecnifibre.com/en/products/tf-x1-v2-285'),
  r('Tecnifibre', 'T-Fight 300', 100, '16x19', 'https://www.tecnifibre.com/en/products/t-fight-300', 27, 'Tecnifibre states 645 cm2 heads for T-Fight 255 to 300 from March 2025.'),
];

export const DROPPED_RACQUETS: Array<{ name: string; reason: string }> = [
  { name: 'Prince Phantom family (100X, 97P, 107G)', reason: 'No Prince product page with specifications could be found on princetennis.com.' },
  { name: 'Yonex EZONE 102', reason: 'Only an ambiguous series table was found; head size and pattern could not be tied to the model.' },
  { name: 'Wilson Blade 100 v9, Blade 104 v9', reason: 'Wilson pages found gave no head size or pattern.' },
  { name: 'Wilson Clash 98, Clash 108 v3', reason: 'No current spec page found.' },
  { name: 'Wilson Shift 99, Pro Staff RF97', reason: 'Pattern not found on a Wilson page.' },
  { name: 'Head Speed Pro / MP L / Team (2026)', reason: 'Head size or pattern missing from the indexed manufacturer page.' },
  { name: 'Head Radical Pro (2025)', reason: 'Pattern not stated on the indexed page.' },
  { name: 'Head Extreme MP, Prestige MP', reason: 'Head size missing or attribution ambiguous on head.com.' },
  { name: 'Dunlop CX 400, CX 200 LS, CX 200 Tour 16x19', reason: 'Head size or pattern not confirmed for that exact model.' },
];

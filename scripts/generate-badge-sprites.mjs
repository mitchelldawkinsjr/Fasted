/**
 * Sacred Milestone Badge Generator — v2
 * Produces 39 medalion-style SVG badges.
 * Run: node scripts/generate-badge-sprites.mjs
 *
 * Key fixes over v1:
 *  - No currentColor (doesn't resolve in <img> tags) — all fills are literal hex
 *  - Rich coin-rim frame with tick marks and bevel depth
 *  - Motifs are filled, multi-element, properly sized
 *  - Tier progression visible in both frame complexity and gold use
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '../public/assets/badges');

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  primary:   '#173d00',
  secondary: '#506442',
  surface:   '#f9faf0',
  linen:     '#fbf9f8',
  parchment: '#f0e9d8',
  gold:      '#fed65b',
  goldDark:  '#c8a200',
  goldDeep:  '#8a6800',
  white:     '#ffffff',
  ink:       '#1a2415',
};

const PHASE_ACCENT = {
  1: { base: '#8397b8', dark: '#5a6e8e', light: '#afc2d6', rim: '#3d5378' },
  2: { base: '#735c00', dark: '#4a3a00', light: '#a88a30', rim: '#3d3000' },
  3: { base: '#4b5f7e', dark: '#2e3e58', light: '#7a91b2', rim: '#1e2d48' },
  4: { base: '#ba1a1a', dark: '#821010', light: '#d96060', rim: '#5c0808' },
  5: { base: '#334865', dark: '#1e2e45', light: '#5e7898', rim: '#0e1e32' },
  6: { base: '#c8a200', dark: '#8a6800', light: '#e9c349', rim: '#5a4000' },
  7: { base: '#4a6aa0', dark: '#2a4470', light: '#7a96c8', rim: '#0a2050' },
  8: { base: '#7a6000', dark: '#4a3800', light: '#a88a30', rim: '#2e2000' },
};

const GLOBAL_ACCENT = { base: C.secondary, dark: '#2e3e24', light: '#7a9660', rim: '#1e2e14' };

// ─── Frame helpers ───────────────────────────────────────────────────────────

/** Evenly-spaced radial tick marks around a circle */
function tickMarks(cx, cy, count, rOuter, rInner, color, opacity = 0.65, sw = 1) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 - Math.PI / 2;
    const x1 = (cx + rOuter * Math.cos(a)).toFixed(2);
    const y1 = (cy + rOuter * Math.sin(a)).toFixed(2);
    const x2 = (cx + rInner * Math.cos(a)).toFixed(2);
    const y2 = (cy + rInner * Math.sin(a)).toFixed(2);
    out.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${sw}" opacity="${opacity}"/>`);
  }
  return out.join('');
}

/** Small leaf ellipse at angle (radians) on a circle */
function leafAt(cx, cy, r, angleDeg, color, rx = 4, ry = 8, opacity = 0.75) {
  const a = angleDeg * Math.PI / 180;
  const lx = (cx + r * Math.cos(a)).toFixed(2);
  const ly = (cy + r * Math.sin(a)).toFixed(2);
  const rot = (angleDeg + 90).toFixed(1);
  return `<ellipse cx="${lx}" cy="${ly}" rx="${rx}" ry="${ry}" transform="rotate(${rot},${lx},${ly})" fill="${color}" opacity="${opacity}"/>`;
}

/** Diamond accent at compass point */
function diamond(cx, cy, r, angleDeg, color, size = 4) {
  const a = angleDeg * Math.PI / 180;
  const dx = (cx + r * Math.cos(a)).toFixed(2);
  const dy = (cy + r * Math.sin(a)).toFixed(2);
  return `<polygon points="${dx},${(+dy - size).toFixed(1)} ${(+dx + size * 0.5).toFixed(1)},${dy} ${dx},${(+dy + size).toFixed(1)} ${(+dx - size * 0.5).toFixed(1)},${dy}" fill="${color}" opacity="0.9"/>`;
}

/**
 * Frame tiers — all 128×128, same visual footprint.
 * Progression is through ornamentation density, not size:
 *
 * T1 — plain accent rim · 24 ticks · single inner line
 * T2 — wider rim · 32 ticks · dashed gold halo · 4 corner diamonds · double inner line
 * T3 — widest rim · 40 ticks · solid gold halo · 8 laurel leaves · alternating diamonds · triple inner line
 * Complete — full laurel wreath (24 leaves) · ornate crown at top · quadruple inner rings · radiant gold glow
 */
function buildFrame(id, tier, accent) {
  const { base, dark, light } = accent;
  const cx = 64, cy = 64;
  const gradId    = `pg_${id.replace(/-/g, '_')}`;
  const rimGradId = `rg_${id.replace(/-/g, '_')}`;

  const parchmentGrad = `
    <radialGradient id="${gradId}" cx="38%" cy="32%" r="70%">
      <stop offset="0%"   stop-color="#fffcf5"/>
      <stop offset="55%"  stop-color="${C.parchment}"/>
      <stop offset="100%" stop-color="#ddd0b0"/>
    </radialGradient>
    <radialGradient id="${rimGradId}" cx="35%" cy="28%" r="80%">
      <stop offset="0%"   stop-color="${light}"/>
      <stop offset="100%" stop-color="${dark}"/>
    </radialGradient>`;

  let outerDecor = '';
  let innerDecor = '';

  if (tier === 1) {
    // ── Plain single-ring coin ──────────────────────────────────────────────
    outerDecor = `
      <circle cx="${cx}" cy="${cy}" r="63" fill="${dark}" opacity="0.22"/>
      <circle cx="${cx}" cy="${cy}" r="61" fill="${base}"/>
      <circle cx="${cx}" cy="${cy}" r="57" fill="url(#${rimGradId})"/>
      ${tickMarks(cx, cy, 24, 60, 56, C.white, 0.35, 0.9)}
      ${tickMarks(cx, cy, 24, 61, 60, dark,    0.50, 0.75)}`;
    innerDecor = `
      <circle cx="${cx}" cy="${cy}" r="51" fill="none" stroke="${base}" stroke-width="1" opacity="0.45"/>`;

  } else if (tier === 2) {
    // ── Double rim · dashed gold halo · 4 diamonds ─────────────────────────
    outerDecor = `
      <circle cx="${cx}" cy="${cy}" r="64" fill="${C.goldDark}" opacity="0.28"/>
      <circle cx="${cx}" cy="${cy}" r="62" fill="${base}"/>
      <circle cx="${cx}" cy="${cy}" r="57" fill="url(#${rimGradId})"/>
      ${tickMarks(cx, cy, 32, 61, 56, C.white, 0.40, 0.85)}
      ${tickMarks(cx, cy, 32, 62, 61, dark,    0.55, 0.70)}
      <circle cx="${cx}" cy="${cy}" r="64.5" fill="none" stroke="${C.gold}"     stroke-width="2"   opacity="0.80"/>
      <circle cx="${cx}" cy="${cy}" r="66"   fill="none" stroke="${C.goldDark}" stroke-width="0.7" stroke-dasharray="3,5" opacity="0.60"/>
      ${[90, 180, 270, 0].map(a => diamond(cx, cy, 64.5, a, C.gold, 4.5)).join('')}`;
    innerDecor = `
      <circle cx="${cx}" cy="${cy}" r="51" fill="none" stroke="${base}"   stroke-width="1.2" opacity="0.55"/>
      <circle cx="${cx}" cy="${cy}" r="49" fill="none" stroke="${C.gold}" stroke-width="0.6" opacity="0.40"/>`;

  } else if (tier === 3) {
    // ── Triple rim · solid gold halo · 8 laurel leaves + 8 corner diamonds ─
    const leafAngles = [-90, -45, 0, 45, 90, 135, 180, 225];
    const diagAngles = [-67.5, -22.5, 22.5, 67.5, 112.5, 157.5, 202.5, 247.5];
    outerDecor = `
      <circle cx="${cx}" cy="${cy}" r="65" fill="${C.goldDark}" opacity="0.38"/>
      <circle cx="${cx}" cy="${cy}" r="62" fill="${base}"/>
      <circle cx="${cx}" cy="${cy}" r="56" fill="url(#${rimGradId})"/>
      ${tickMarks(cx, cy, 40, 61, 55, C.white, 0.42, 0.80)}
      ${tickMarks(cx, cy, 40, 62, 61, dark,    0.55, 0.65)}
      <circle cx="${cx}" cy="${cy}" r="65"   fill="none" stroke="${C.gold}"     stroke-width="3"   opacity="0.90"/>
      <circle cx="${cx}" cy="${cy}" r="63"   fill="none" stroke="${C.white}"    stroke-width="0.5" opacity="0.50"/>
      <circle cx="${cx}" cy="${cy}" r="67.5" fill="none" stroke="${C.goldDark}" stroke-width="0.8" opacity="0.55"/>
      ${leafAngles.map(a  => leafAt(cx, cy, 65.5, a, C.gold, 3.5, 8, 0.88)).join('')}
      ${diagAngles.map(a  => diamond(cx, cy, 65.5, a, C.gold, 3)).join('')}`;
    innerDecor = `
      <circle cx="${cx}" cy="${cy}" r="51" fill="none" stroke="${C.gold}"     stroke-width="1.8" opacity="0.62"/>
      <circle cx="${cx}" cy="${cy}" r="49" fill="none" stroke="${C.goldDark}" stroke-width="0.7" opacity="0.45"/>
      <circle cx="${cx}" cy="${cy}" r="47" fill="none" stroke="${C.gold}"     stroke-width="0.4" opacity="0.25"/>`;

  } else {
    // ── Complete — full laurel wreath · crown · radiant glow ────────────────
    const leafCount = 24;
    const fullWreath = Array.from({ length: leafCount }, (_, i) =>
      leafAt(cx, cy, 66.5, -90 + (i / leafCount) * 360, C.gold, 3.5, 7.5, 0.86)
    ).join('');
    const crownSvg = `
      <path d="M49,12 L52,3 L58,10 L64,1 L70,10 L76,3 L79,12 L74,17 L54,17 Z"
            fill="${C.gold}" stroke="${C.goldDark}" stroke-width="0.8" stroke-linejoin="round"/>
      <circle cx="64" cy="4"   r="2.8" fill="${C.white}" opacity="0.95"/>
      <circle cx="52" cy="8"   r="2"   fill="${C.white}" opacity="0.80"/>
      <circle cx="76" cy="8"   r="2"   fill="${C.white}" opacity="0.80"/>
      <rect   x="52"  y="14"  width="24" height="3" rx="1" fill="${C.goldDark}" opacity="0.55"/>`;

    outerDecor = `
      <circle cx="${cx}" cy="${cy}" r="66" fill="${C.goldDark}" opacity="0.42"/>
      <circle cx="${cx}" cy="${cy}" r="62" fill="${base}"/>
      <circle cx="${cx}" cy="${cy}" r="55" fill="url(#${rimGradId})"/>
      ${tickMarks(cx, cy, 48, 61, 54, C.white, 0.40, 0.75)}
      ${tickMarks(cx, cy, 48, 62, 61, dark,    0.50, 0.60)}
      <circle cx="${cx}" cy="${cy}" r="66"   fill="none" stroke="${C.gold}"     stroke-width="3.5" opacity="0.95"/>
      <circle cx="${cx}" cy="${cy}" r="64"   fill="none" stroke="${C.white}"    stroke-width="0.5" opacity="0.55"/>
      <circle cx="${cx}" cy="${cy}" r="69"   fill="none" stroke="${C.gold}"     stroke-width="1.2" opacity="0.65"/>
      <circle cx="${cx}" cy="${cy}" r="71"   fill="none" stroke="${C.goldDark}" stroke-width="0.6" opacity="0.40"/>
      ${fullWreath}
      ${crownSvg}`;
    innerDecor = `
      <circle cx="${cx}" cy="${cy}" r="51"   fill="none" stroke="${C.gold}"     stroke-width="2.2" opacity="0.72"/>
      <circle cx="${cx}" cy="${cy}" r="49"   fill="none" stroke="${C.goldDark}" stroke-width="0.8" opacity="0.52"/>
      <circle cx="${cx}" cy="${cy}" r="47"   fill="none" stroke="${C.gold}"     stroke-width="0.5" opacity="0.30"/>
      <circle cx="${cx}" cy="${cy}" r="45"   fill="none" stroke="${C.goldDark}" stroke-width="0.3" opacity="0.18"/>`;
  }

  return { parchmentGrad, outerDecor, innerDecor };
}

// ─── Motif art ───────────────────────────────────────────────────────────────
// All coordinates are absolute within 128×128 viewBox.
// Inner disk center (64,64), inner ring radius ~50 — keep motifs within r≈46.

function motif(id, accent) {
  const { base, dark, light } = accent;
  const G = C.gold;
  const GD = C.goldDark;
  const W = C.white;
  const P = C.parchment;

  const MOTIFS = {

    // ── Global journey badges ──────────────────────────────────────────────

    sunrise: `
      <!-- ground band -->
      <path d="M22 84 Q64 78 106 84 L106 96 Q64 92 22 96 Z" fill="${base}" opacity="0.28"/>
      <!-- horizon -->
      <line x1="24" y1="84" x2="104" y2="84" stroke="${dark}" stroke-width="2.5" stroke-linecap="round"/>
      <!-- sun disc: filled half circle -->
      <path d="M36 84 A28 28 0 0 1 92 84 Z" fill="${G}"/>
      <path d="M41 84 A23 23 0 0 1 87 84 Z" fill="${G}" opacity="0.55"/>
      <!-- 7 rays fanning upward — using transform -->
      <g stroke="${G}" stroke-linecap="round" opacity="0.9">
        <line x1="64" y1="81" x2="64" y2="36"  stroke-width="3.5"/>
        <line x1="64" y1="81" x2="41" y2="44"  stroke-width="2.5"/>
        <line x1="64" y1="81" x2="87" y2="44"  stroke-width="2.5"/>
        <line x1="64" y1="81" x2="27" y2="60"  stroke-width="2"/>
        <line x1="64" y1="81" x2="101" y2="60" stroke-width="2"/>
        <line x1="64" y1="81" x2="22" y2="78"  stroke-width="1.5"/>
        <line x1="64" y1="81" x2="106" y2="78" stroke-width="1.5"/>
      </g>
      <!-- subtle horizon glow dots -->
      <circle cx="64" cy="84" r="4" fill="${G}" opacity="0.6"/>`,

    'flame-small': `
      <!-- flame outer body -->
      <path d="M64 92 C50 82 44 70 48 57 C51 48 57 43 64 36 C71 43 77 48 80 57 C84 70 78 82 64 92 Z"
            fill="${base}"/>
      <!-- flame mid layer (lighter) -->
      <path d="M64 88 C55 80 51 70 54 59 C57 52 61 47 64 42 C67 47 71 52 74 59 C77 70 73 80 64 88 Z"
            fill="${light}"/>
      <!-- flame inner core -->
      <path d="M64 84 C59 78 57 71 59 64 C61 58 63 55 64 50 C65 55 67 58 69 64 C71 71 69 78 64 84 Z"
            fill="${G}" opacity="0.8"/>
      <!-- small white highlight at tip -->
      <ellipse cx="64" cy="55" rx="2.5" ry="4" fill="${W}" opacity="0.5"/>`,

    'flame-olive': `
      <!-- main flame -->
      <path d="M64 92 C50 82 44 70 48 57 C51 48 57 43 64 36 C71 43 77 48 80 57 C84 70 78 82 64 92 Z"
            fill="${base}"/>
      <path d="M64 86 C55 78 52 68 55 58 C58 51 62 47 64 42 C66 47 70 51 73 58 C76 68 73 78 64 86 Z"
            fill="${light}"/>
      <ellipse cx="64" cy="58" rx="4" ry="6" fill="${G}" opacity="0.65"/>
      <!-- left olive sprig -->
      <path d="M42 92 Q36 84 40 78" stroke="${dark}" stroke-width="2" fill="none" stroke-linecap="round"/>
      <ellipse cx="37" cy="80" rx="5" ry="3" transform="rotate(-40,37,80)" fill="${base}" opacity="0.85"/>
      <ellipse cx="41" cy="88" rx="5" ry="3" transform="rotate(-20,41,88)" fill="${base}" opacity="0.85"/>
      <!-- right olive sprig -->
      <path d="M86 92 Q92 84 88 78" stroke="${dark}" stroke-width="2" fill="none" stroke-linecap="round"/>
      <ellipse cx="91" cy="80" rx="5" ry="3" transform="rotate(40,91,80)" fill="${base}" opacity="0.85"/>
      <ellipse cx="87" cy="88" rx="5" ry="3" transform="rotate(20,87,88)" fill="${base}" opacity="0.85"/>`,

    'flame-beacon': `
      <!-- pedestal -->
      <path d="M50 102 L52 88 L76 88 L78 102 Z" fill="${dark}"/>
      <path d="M47 102 L81 102" stroke="${dark}" stroke-width="3" stroke-linecap="round"/>
      <rect x="55" y="88" width="18" height="4" rx="1" fill="${base}"/>
      <!-- tall flame -->
      <path d="M64 88 C52 76 46 62 50 48 C53 38 58 32 64 24 C70 32 75 38 78 48 C82 62 76 76 64 88 Z"
            fill="${base}"/>
      <path d="M64 84 C55 74 51 62 54 50 C57 41 61 36 64 28 C67 36 71 41 74 50 C77 62 73 74 64 84 Z"
            fill="${light}"/>
      <path d="M64 78 C59 70 57 62 59 53 C61 46 63 42 64 36 C65 42 67 46 69 53 C71 62 69 70 64 78 Z"
            fill="${G}" opacity="0.75"/>
      <ellipse cx="64" cy="42" rx="3" ry="5" fill="${W}" opacity="0.45"/>`,

    'flame-torch': `
      <!-- handle with wrap bands -->
      <rect x="59" y="74" width="10" height="28" rx="3" fill="${dark}"/>
      <rect x="59" y="78" width="10" height="3" rx="1" fill="${base}" opacity="0.7"/>
      <rect x="59" y="85" width="10" height="3" rx="1" fill="${base}" opacity="0.7"/>
      <rect x="59" y="92" width="10" height="3" rx="1" fill="${base}" opacity="0.7"/>
      <!-- torch head -->
      <path d="M54 74 C50 74 50 70 52 68 L64 64 L76 68 C78 70 78 74 74 74 Z"
            fill="${dark}"/>
      <!-- flame cluster -->
      <path d="M64 64 C52 52 46 38 50 26 C53 17 58 11 64 6 C70 11 75 17 78 26 C82 38 76 52 64 64 Z"
            fill="${base}"/>
      <path d="M64 60 C55 50 51 38 54 27 C57 19 61 14 64 8 C67 14 71 19 74 27 C77 38 73 50 64 60 Z"
            fill="${light}"/>
      <path d="M64 54 C58 46 56 37 58 28 C60 22 62 18 64 12 C66 18 68 22 70 28 C72 37 70 46 64 54 Z"
            fill="${G}" opacity="0.8"/>
      <ellipse cx="64" cy="18" rx="3" ry="5" fill="${W}" opacity="0.5"/>
      <!-- side flicker flames -->
      <path d="M52 54 C46 48 46 40 50 36 C50 42 52 48 56 52 Z" fill="${light}" opacity="0.7"/>
      <path d="M76 54 C82 48 82 40 78 36 C78 42 76 48 72 52 Z" fill="${light}" opacity="0.7"/>`,

    'prayer-dove': `
      <!-- dove body -->
      <path d="M64 88 C56 84 50 76 50 68 C50 60 56 56 62 58 C60 62 60 66 64 68 C68 66 68 62 66 58 C72 56 78 60 78 68 C78 76 72 84 64 88 Z"
            fill="${base}"/>
      <!-- wings spread left -->
      <path d="M50 68 C42 64 34 58 32 50 C36 52 40 54 44 54 C42 58 44 62 48 64 Z"
            fill="${light}"/>
      <path d="M50 68 C38 66 30 60 28 52 C32 53 36 55 40 56 C38 60 40 64 46 66 Z"
            fill="${base}" opacity="0.8"/>
      <!-- wings spread right -->
      <path d="M78 68 C86 64 94 58 96 50 C92 52 88 54 84 54 C86 58 84 62 80 64 Z"
            fill="${light}"/>
      <path d="M78 68 C90 66 98 60 100 52 C96 53 92 55 88 56 C90 60 88 64 82 66 Z"
            fill="${base}" opacity="0.8"/>
      <!-- head -->
      <circle cx="64" cy="55" r="8" fill="${light}"/>
      <circle cx="64" cy="55" r="6" fill="${base}"/>
      <!-- eye -->
      <circle cx="67" cy="53" r="1.8" fill="${dark}"/>
      <circle cx="67.8" cy="52.2" r="0.7" fill="${W}" opacity="0.8"/>
      <!-- beak with olive branch -->
      <path d="M70 56 L76 58 L74 60 L70 58 Z" fill="${G}"/>
      <path d="M73 58 Q80 54 84 50" stroke="${base}" stroke-width="1.5" fill="none"/>
      <ellipse cx="80" cy="52" rx="4" ry="2" transform="rotate(-25,80,52)" fill="${base}" opacity="0.85"/>
      <ellipse cx="84" cy="50" rx="4" ry="2" transform="rotate(-20,84,50)" fill="${base}" opacity="0.85"/>`,

    'journal-quill': `
      <!-- open book cover -->
      <path d="M26 88 L26 44 Q26 40 30 40 L64 44 L64 88 Z" fill="${dark}"/>
      <path d="M102 88 L102 44 Q102 40 98 40 L64 44 L64 88 Z" fill="${dark}"/>
      <!-- pages left -->
      <path d="M30 86 L30 46 Q30 43 33 43 L64 46 L64 86 Z" fill="${C.linen}"/>
      <!-- pages right -->
      <path d="M98 86 L98 46 Q98 43 95 43 L64 46 L64 86 Z" fill="#fffdf6"/>
      <!-- spine -->
      <rect x="61" y="40" width="6" height="48" rx="1" fill="${dark}"/>
      <!-- left page lines -->
      <g stroke="${dark}" stroke-width="1.2" opacity="0.5">
        <line x1="36" y1="56" x2="59" y2="56"/>
        <line x1="36" y1="62" x2="59" y2="62"/>
        <line x1="36" y1="68" x2="59" y2="68"/>
        <line x1="36" y1="74" x2="59" y2="74"/>
      </g>
      <!-- right page lines -->
      <g stroke="${dark}" stroke-width="1" opacity="0.35">
        <line x1="69" y1="60" x2="92" y2="58"/>
        <line x1="69" y1="67" x2="92" y2="65"/>
        <line x1="69" y1="74" x2="92" y2="72"/>
      </g>
      <!-- quill overlapping right page -->
      <!-- feather vane -->
      <path d="M98 32 C82 40 74 50 70 72" stroke="${G}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M98 32 C90 48 82 56 74 72" fill="${G}" opacity="0.7"/>
      <path d="M98 32 C88 44 82 52 72 68" fill="${light}" opacity="0.5"/>
      <!-- quill shaft -->
      <line x1="98" y1="32" x2="70" y2="80" stroke="${dark}" stroke-width="1.5"/>
      <!-- nib -->
      <path d="M70 80 L68 86 L73 82 Z" fill="${dark}"/>`,

    'laurel-star': `
      <!-- outer laurel wreath — two arcs of leaves -->
      ${Array.from({ length: 16 }, (_, i) => {
        const a = (-90 + i * (360 / 16)) * Math.PI / 180;
        const r = 44;
        const lx = (64 + r * Math.cos(a)).toFixed(1);
        const ly = (64 + r * Math.sin(a)).toFixed(1);
        const rot = (-90 + i * (360 / 16) + 90).toFixed(0);
        return `<ellipse cx="${lx}" cy="${ly}" rx="4.5" ry="9" transform="rotate(${rot},${lx},${ly})" fill="${base}" opacity="0.8"/>`;
      }).join('')}
      <!-- inner wreath ring fill -->
      <circle cx="64" cy="64" r="32" fill="none" stroke="${base}" stroke-width="1" opacity="0.3"/>
      <!-- 8-pointed star -->
      <path d="M64 28 L68 52 L92 46 L72 64 L92 82 L68 76 L64 100 L60 76 L36 82 L56 64 L36 46 L60 52 Z"
            fill="${G}" opacity="0.95"/>
      <path d="M64 36 L67 54 L84 50 L70 64 L84 78 L67 74 L64 92 L61 74 L44 78 L58 64 L44 50 L61 54 Z"
            fill="${G}"/>
      <!-- centre circle -->
      <circle cx="64" cy="64" r="10" fill="${C.goldDark}"/>
      <circle cx="64" cy="64" r="7" fill="${G}"/>
      <circle cx="64" cy="64" r="4" fill="${W}" opacity="0.7"/>`,

    // ── Phase 1 — Daniel 1 Fast ──────────────────────────────────────────

    'olive-branch': `
      <!-- main curved stem -->
      <path d="M46 96 C52 80 58 66 72 44" stroke="${dark}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <!-- 6 alternating leaves along stem -->
      <ellipse cx="49" cy="88" rx="9" ry="4.5" transform="rotate(-50,49,88)" fill="${base}" opacity="0.9"/>
      <ellipse cx="57" cy="80" rx="9" ry="4.5" transform="rotate(-20,57,80)" fill="${base}" opacity="0.9"/>
      <ellipse cx="55" cy="72" rx="9" ry="4.5" transform="rotate(-55,55,72)" fill="${light}" opacity="0.85"/>
      <ellipse cx="62" cy="64" rx="9" ry="4.5" transform="rotate(-25,62,64)" fill="${base}" opacity="0.9"/>
      <ellipse cx="62" cy="57" rx="9" ry="4.5" transform="rotate(-60,62,57)" fill="${light}" opacity="0.85"/>
      <ellipse cx="67" cy="49" rx="9" ry="4.5" transform="rotate(-30,67,49)" fill="${base}" opacity="0.9"/>
      <!-- small fruit dots -->
      <circle cx="58" cy="76" r="3" fill="${G}" opacity="0.85"/>
      <circle cx="65" cy="61" r="2.5" fill="${G}" opacity="0.7"/>`,

    'olive-shield': `
      <!-- shield outline filled -->
      <path d="M64 36 L86 44 L86 66 Q86 84 64 96 Q42 84 42 66 L42 44 Z"
            fill="${dark}" opacity="0.85"/>
      <!-- shield inner panel -->
      <path d="M64 41 L81 48 L81 67 Q81 80 64 91 Q47 80 47 67 L47 48 Z"
            fill="${base}"/>
      <!-- shield face lighter -->
      <path d="M64 46 L78 52 L78 68 Q78 78 64 87 Q50 78 50 68 L50 52 Z"
            fill="${light}" opacity="0.6"/>
      <!-- olive branch inside shield -->
      <path d="M52 78 C56 68 62 58 68 46" stroke="${dark}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="54" cy="73" rx="7" ry="3.5" transform="rotate(-50,54,73)" fill="${C.primary}" opacity="0.8"/>
      <ellipse cx="59" cy="65" rx="7" ry="3.5" transform="rotate(-20,59,65)" fill="${C.primary}" opacity="0.8"/>
      <ellipse cx="64" cy="57" rx="7" ry="3.5" transform="rotate(-45,64,57)" fill="${C.primary}" opacity="0.8"/>
      <ellipse cx="67" cy="50" rx="7" ry="3.5" transform="rotate(-15,67,50)" fill="${C.primary}" opacity="0.8"/>`,

    'olive-wreath-crown': `
      <!-- full circular olive wreath -->
      ${Array.from({ length: 20 }, (_, i) => {
        const a = (-90 + i * 18) * Math.PI / 180;
        const r = 40;
        const lx = (64 + r * Math.cos(a)).toFixed(1);
        const ly = (64 + r * Math.sin(a)).toFixed(1);
        const rot = (-90 + i * 18 + 90).toFixed(0);
        return `<ellipse cx="${lx}" cy="${ly}" rx="4" ry="8" transform="rotate(${rot},${lx},${ly})" fill="${base}" opacity="0.82"/>`;
      }).join('')}
      <!-- inner olive fill -->
      <circle cx="64" cy="64" r="27" fill="${C.linen}" opacity="0.9"/>
      <circle cx="64" cy="64" r="26" fill="none" stroke="${base}" stroke-width="0.8" opacity="0.4"/>
      <!-- small fruit dots on wreath -->
      ${[0, 60, 120, 180, 240, 300].map(d => {
        const a = (d - 90) * Math.PI / 180;
        const lx = (64 + 40 * Math.cos(a)).toFixed(1);
        const ly = (64 + 40 * Math.sin(a)).toFixed(1);
        return `<circle cx="${lx}" cy="${ly}" r="2.5" fill="${G}" opacity="0.85"/>`;
      }).join('')}
      <!-- crown at top center -->
      <path d="M51 36 L54 28 L59 34 L64 26 L69 34 L74 28 L77 36 L73 40 L55 40 Z"
            fill="${G}" stroke="${GD}" stroke-width="0.8"/>
      <circle cx="64" cy="29" r="2.5" fill="${W}" opacity="0.85"/>`,

    // ── Phase 2 — David's Fast ───────────────────────────────────────────

    harp: `
      <!-- sound board (right pillar) -->
      <path d="M76 34 L76 94 Q76 98 72 98 L68 98 L68 34 Q68 30 72 30 Q76 30 76 34 Z"
            fill="${dark}"/>
      <!-- neck (curved top piece) -->
      <path d="M68 34 Q56 30 44 38 Q36 44 36 52 L42 52 Q42 46 48 42 Q58 36 68 38 Z"
            fill="${dark}"/>
      <!-- pillar (left, curved inward) -->
      <path d="M36 52 Q34 64 38 76 Q40 84 46 90 L50 88 Q44 82 43 74 Q40 62 42 52 Z"
            fill="${dark}"/>
      <!-- strings — 7 strings -->
      <g stroke="${light}" stroke-width="1.3" opacity="0.8">
        <line x1="44" y1="50" x2="68" y2="40"/>
        <line x1="44" y1="58" x2="68" y2="48"/>
        <line x1="44" y1="66" x2="68" y2="58"/>
        <line x1="45" y1="74" x2="68" y2="68"/>
        <line x1="46" y1="82" x2="68" y2="78"/>
        <line x1="48" y1="89" x2="68" y2="88"/>
        <line x1="50" y1="94" x2="68" y2="94"/>
      </g>
      <!-- base foot -->
      <path d="M64 98 L80 98 L80 102 Q80 104 76 104 L68 104 Z"
            fill="${dark}" opacity="0.8"/>`,

    'harp-rays': `
      <!-- harp body identical to harp -->
      <path d="M76 34 L76 94 Q76 98 72 98 L68 98 L68 34 Q68 30 72 30 Q76 30 76 34 Z" fill="${dark}"/>
      <path d="M68 34 Q56 30 44 38 Q36 44 36 52 L42 52 Q42 46 48 42 Q58 36 68 38 Z" fill="${dark}"/>
      <path d="M36 52 Q34 64 38 76 Q40 84 46 90 L50 88 Q44 82 43 74 Q40 62 42 52 Z" fill="${dark}"/>
      <g stroke="${light}" stroke-width="1.2" opacity="0.75">
        <line x1="44" y1="50" x2="68" y2="40"/>
        <line x1="44" y1="58" x2="68" y2="50"/>
        <line x1="44" y1="66" x2="68" y2="60"/>
        <line x1="45" y1="74" x2="68" y2="70"/>
        <line x1="47" y1="82" x2="68" y2="80"/>
        <line x1="49" y1="90" x2="68" y2="90"/>
      </g>
      <path d="M64 98 L80 98 L80 102 Q80 104 76 104 L68 104 Z" fill="${dark}" opacity="0.8"/>
      <!-- rays above harp -->
      <g stroke="${G}" stroke-linecap="round" opacity="0.7">
        <line x1="72" y1="28" x2="72" y2="18" stroke-width="2.5"/>
        <line x1="72" y1="28" x2="60" y2="20" stroke-width="2"/>
        <line x1="72" y1="28" x2="84" y2="20" stroke-width="2"/>
        <line x1="72" y1="28" x2="56" y2="26" stroke-width="1.5"/>
        <line x1="72" y1="28" x2="88" y2="26" stroke-width="1.5"/>
      </g>`,

    'harp-star': `
      <!-- harp body -->
      <path d="M76 38 L76 96 Q76 100 72 100 L68 100 L68 38 Q68 34 72 34 Q76 34 76 38 Z" fill="${dark}"/>
      <path d="M68 38 Q56 34 44 42 Q36 48 36 56 L42 56 Q42 50 48 46 Q58 40 68 42 Z" fill="${dark}"/>
      <path d="M36 56 Q34 68 38 80 Q40 88 46 94 L50 92 Q44 86 43 78 Q40 66 42 56 Z" fill="${dark}"/>
      <g stroke="${light}" stroke-width="1.2" opacity="0.75">
        <line x1="44" y1="54" x2="68" y2="44"/>
        <line x1="44" y1="62" x2="68" y2="54"/>
        <line x1="44" y1="70" x2="68" y2="64"/>
        <line x1="45" y1="78" x2="68" y2="74"/>
        <line x1="47" y1="86" x2="68" y2="84"/>
        <line x1="49" y1="94" x2="68" y2="94"/>
      </g>
      <!-- 6-point star above -->
      <path d="M72 16 L74.5 23 L82 23 L76 27.5 L78.5 34.5 L72 30 L65.5 34.5 L68 27.5 L62 23 L69.5 23 Z"
            fill="${G}"/>
      <circle cx="72" cy="26" r="4" fill="${W}" opacity="0.7"/>`,

    'harp-royal': `
      <!-- royal harp — larger, more ornate -->
      <path d="M80 32 L80 96 Q80 102 75 102 L69 102 L69 32 Q69 26 75 26 Q80 26 80 32 Z" fill="${dark}"/>
      <path d="M69 32 Q54 26 40 36 Q30 44 30 54 L37 54 Q37 46 44 42 Q56 35 69 37 Z" fill="${dark}"/>
      <path d="M30 54 Q28 68 33 82 Q36 92 43 98 L48 95 Q41 89 39 79 Q36 65 38 54 Z" fill="${dark}"/>
      <g stroke="${light}" stroke-width="1.4" opacity="0.8">
        <line x1="40" y1="52" x2="69" y2="39"/>
        <line x1="40" y1="61" x2="69" y2="50"/>
        <line x1="40" y1="70" x2="69" y2="61"/>
        <line x1="41" y1="79" x2="69" y2="72"/>
        <line x1="43" y1="88" x2="69" y2="83"/>
        <line x1="45" y1="96" x2="69" y2="94"/>
      </g>
      <!-- crown at top of harp -->
      <path d="M62 18 L65 10 L70 16 L75 8 L80 16 L85 10 L88 18 L84 22 L66 22 Z"
            fill="${G}" stroke="${GD}" stroke-width="0.8"/>
      <circle cx="75" cy="11" r="2.5" fill="${W}" opacity="0.85"/>
      <circle cx="64" cy="13" r="1.8" fill="${W}" opacity="0.7"/>
      <circle cx="85" cy="13" r="1.8" fill="${W}" opacity="0.7"/>
      <!-- base pedestal -->
      <path d="M65 102 L85 102 L86 106 Q86 108 80 108 L70 108 Z" fill="${dark}"/>`,

    // ── Phase 3 — First Daniel Fast ─────────────────────────────────────

    'path-step': `
      <!-- winding path surface -->
      <path d="M24 100 Q44 96 52 80 Q60 64 64 52 Q68 40 80 32 Q92 24 104 28"
            fill="none" stroke="${base}" stroke-width="12" stroke-linecap="round" opacity="0.3"/>
      <!-- path centre line -->
      <path d="M24 100 Q44 96 52 80 Q60 64 64 52 Q68 40 80 32 Q92 24 104 28"
            fill="none" stroke="${base}" stroke-width="4" stroke-linecap="round" stroke-dasharray="6,5"/>
      <!-- left footprint -->
      <ellipse cx="56" cy="76" rx="5" ry="7" transform="rotate(-20,56,76)" fill="${dark}" opacity="0.85"/>
      <ellipse cx="53" cy="70" rx="3" ry="2" transform="rotate(-20,53,70)" fill="${dark}" opacity="0.6"/>
      <!-- right footprint -->
      <ellipse cx="68" cy="56" rx="5" ry="7" transform="rotate(10,68,56)" fill="${dark}" opacity="0.85"/>
      <ellipse cx="71" cy="50" rx="3" ry="2" transform="rotate(10,71,50)" fill="${dark}" opacity="0.6"/>
      <!-- ground texture dots -->
      <circle cx="42" cy="98" r="2" fill="${base}" opacity="0.4"/>
      <circle cx="96" cy="32" r="2" fill="${base}" opacity="0.4"/>`,

    'path-hills': `
      <!-- sky tint -->
      <path d="M20 64 Q64 20 108 64 L108 30 Q64 18 20 30 Z" fill="${light}" opacity="0.2"/>
      <!-- far hill -->
      <path d="M20 90 Q42 58 64 68 Q86 78 108 60 L108 104 L20 104 Z"
            fill="${base}" opacity="0.45"/>
      <!-- near hill -->
      <path d="M20 104 Q40 72 64 82 Q88 92 108 72 L108 104 Z"
            fill="${base}" opacity="0.75"/>
      <!-- path line over hills -->
      <path d="M28 100 Q44 88 56 84 Q64 82 72 80 Q84 76 96 68"
            fill="none" stroke="${C.linen}" stroke-width="3" stroke-linecap="round" stroke-dasharray="5,4" opacity="0.9"/>
      <!-- sun/star on horizon -->
      <circle cx="88" cy="44" r="8" fill="${G}" opacity="0.85"/>
      <g stroke="${G}" stroke-width="1.5" stroke-linecap="round" opacity="0.6">
        <line x1="88" y1="32" x2="88" y2="28"/>
        <line x1="96" y1="36" x2="99" y2="33"/>
        <line x1="100" y1="44" x2="104" y2="44"/>
        <line x1="80" y1="36" x2="77" y2="33"/>
      </g>`,

    'path-light': `
      <!-- mountain silhouette -->
      <path d="M20 104 L46 52 L64 72 L76 44 L108 104 Z"
            fill="${base}" opacity="0.7"/>
      <!-- mountain snow caps -->
      <path d="M46 52 L40 64 L52 64 Z" fill="${W}" opacity="0.6"/>
      <path d="M76 44 L70 58 L82 58 Z" fill="${W}" opacity="0.6"/>
      <!-- radiant light source at peak -->
      <circle cx="76" cy="40" r="12" fill="${G}" opacity="0.9"/>
      <circle cx="76" cy="40" r="8" fill="${G}"/>
      <circle cx="76" cy="40" r="5" fill="${W}" opacity="0.8"/>
      <!-- light rays -->
      <g stroke="${G}" stroke-linecap="round" opacity="0.7">
        <line x1="76" y1="24" x2="76" y2="18" stroke-width="2.5"/>
        <line x1="88" y1="28" x2="92" y2="24" stroke-width="2"/>
        <line x1="94" y1="40" x2="100" y2="40" stroke-width="2"/>
        <line x1="64" y1="28" x2="60" y2="24" stroke-width="2"/>
        <line x1="58" y1="40" x2="52" y2="40" stroke-width="2"/>
      </g>
      <!-- winding path up mountain -->
      <path d="M30 102 Q38 94 44 88 Q52 80 58 76 Q66 72 72 66 Q76 60 76 52"
            fill="none" stroke="${C.linen}" stroke-width="2.5" stroke-dasharray="4,3" opacity="0.85"/>`,

    'path-summit': `
      <!-- peak mountain -->
      <path d="M20 104 L64 28 L108 104 Z" fill="${base}" opacity="0.8"/>
      <!-- snow cap highlight -->
      <path d="M64 28 L54 50 L74 50 Z" fill="${W}" opacity="0.65"/>
      <!-- second peak behind -->
      <path d="M20 104 L42 56 L60 80 L20 104" fill="${dark}" opacity="0.4"/>
      <path d="M108 104 L86 56 L68 80 L108 104" fill="${dark}" opacity="0.4"/>
      <!-- triumph flag/marker at summit -->
      <line x1="64" y1="28" x2="64" y2="14" stroke="${G}" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M64 14 L80 19 L64 24 Z" fill="${G}"/>
      <!-- radiance from flag -->
      <g stroke="${G}" stroke-linecap="round" opacity="0.5">
        <line x1="82" y1="12" x2="86" y2="9" stroke-width="1.5"/>
        <line x1="82" y1="19" x2="87" y2="19" stroke-width="1.5"/>
        <line x1="64" y1="10" x2="64" y2="6" stroke-width="1.5"/>
      </g>
      <!-- winding path up -->
      <path d="M28 102 Q40 90 48 82 Q56 74 60 66 Q62 58 64 50"
            fill="none" stroke="${C.linen}" stroke-width="2.5" opacity="0.7" stroke-dasharray="4,3"/>`,

    // ── Phase 4 — Joel Repentance Fast ─────────────────────────────────

    'heart-seed': `
      <!-- heart shape -->
      <path d="M64 88 C40 72 28 56 32 42 C36 30 50 26 64 38 C78 26 92 30 96 42 C100 56 88 72 64 88 Z"
            fill="${base}"/>
      <path d="M64 82 C44 68 34 54 37 42 C40 33 52 30 64 40 C76 30 88 33 91 42 C94 54 84 68 64 82 Z"
            fill="${light}" opacity="0.7"/>
      <!-- seed/shoot emerging from top of heart -->
      <line x1="64" y1="38" x2="64" y2="22" stroke="${dark}" stroke-width="3" stroke-linecap="round"/>
      <!-- first leaves -->
      <path d="M64 30 Q54 24 50 18 Q56 18 62 22 Q60 26 64 30 Z" fill="${dark}" opacity="0.85"/>
      <path d="M64 30 Q74 24 78 18 Q72 18 66 22 Q68 26 64 30 Z" fill="${dark}" opacity="0.85"/>`,

    sprout: `
      <!-- soil mound -->
      <path d="M36 98 Q64 88 92 98 Q84 106 44 106 Z" fill="${dark}" opacity="0.6"/>
      <!-- main stem -->
      <line x1="64" y1="96" x2="64" y2="52" stroke="${dark}" stroke-width="3.5" stroke-linecap="round"/>
      <!-- large seed-leaves (cotyledons) -->
      <path d="M64 68 Q48 60 42 50 Q50 44 60 50 Q64 56 64 68 Z" fill="${base}"/>
      <path d="M64 68 Q80 60 86 50 Q78 44 68 50 Q64 56 64 68 Z" fill="${base}"/>
      <!-- first true leaf (smaller, higher) -->
      <path d="M64 58 Q52 50 50 42 Q58 38 64 46 Z" fill="${light}" opacity="0.85"/>
      <path d="M64 58 Q76 50 78 42 Q70 38 64 46 Z" fill="${light}" opacity="0.85"/>
      <!-- bud at tip -->
      <ellipse cx="64" cy="50" rx="5" ry="7" fill="${base}"/>
      <ellipse cx="64" cy="48" rx="3" ry="4" fill="${light}"/>`,

    'growing-tree': `
      <!-- trunk -->
      <path d="M58 102 Q56 88 54 76 Q52 66 60 58 L64 54 L68 58 Q76 66 74 76 Q72 88 70 102 Z"
            fill="${dark}"/>
      <!-- ground roots suggestion -->
      <path d="M50 100 Q58 96 64 100 Q70 96 78 100" fill="none" stroke="${dark}" stroke-width="2.5" opacity="0.6"/>
      <!-- canopy layers — three overlapping circles for depth -->
      <circle cx="64" cy="46" r="26" fill="${dark}" opacity="0.7"/>
      <circle cx="52" cy="52" r="20" fill="${base}" opacity="0.85"/>
      <circle cx="76" cy="52" r="20" fill="${base}" opacity="0.85"/>
      <circle cx="64" cy="38" r="22" fill="${base}"/>
      <circle cx="64" cy="38" r="17" fill="${light}" opacity="0.6"/>
      <!-- leaf highlights -->
      <circle cx="56" cy="34" r="7" fill="${light}" opacity="0.5"/>
      <circle cx="72" cy="36" r="7" fill="${light}" opacity="0.5"/>`,

    'renewal-tree': `
      <!-- trunk wide and strong -->
      <path d="M56 106 Q52 90 50 76 Q48 64 56 54 L64 48 L72 54 Q80 64 78 76 Q76 90 72 106 Z"
            fill="${dark}"/>
      <!-- roots spreading -->
      <path d="M44 104 Q56 96 64 102 Q72 96 84 104"
            fill="none" stroke="${dark}" stroke-width="3" opacity="0.7" stroke-linecap="round"/>
      <path d="M40 108 Q52 100 60 104 Q68 100 80 108"
            fill="none" stroke="${dark}" stroke-width="2" opacity="0.4" stroke-linecap="round"/>
      <!-- full lush canopy -->
      <circle cx="64" cy="40" r="30" fill="${dark}" opacity="0.6"/>
      <circle cx="48" cy="48" r="22" fill="${base}"/>
      <circle cx="80" cy="48" r="22" fill="${base}"/>
      <circle cx="64" cy="32" r="26" fill="${base}"/>
      <circle cx="64" cy="34" r="20" fill="${light}" opacity="0.65"/>
      <circle cx="54" cy="30" r="10" fill="${light}" opacity="0.5"/>
      <circle cx="74" cy="30" r="10" fill="${light}" opacity="0.5"/>
      <!-- gold fruit/blossoms -->
      ${[[-10,44],[10,44],[-16,36],[0,30],[16,36]].map(([ox,oy]) =>
        `<circle cx="${64+ox}" cy="${oy}" r="3.5" fill="${G}" opacity="0.85"/>`
      ).join('')}
      <!-- crown at very top -->
      <path d="M53 16 L56 8 L61 14 L64 6 L67 14 L72 8 L75 16 L71 20 L57 20 Z"
            fill="${G}" stroke="${GD}" stroke-width="0.7"/>`,

    // ── Phase 5 — Isaiah 58 Fast ─────────────────────────────────────────

    'hand-one': `
      <!-- single open hand raised, palm facing viewer -->
      <!-- fingers (5) as rounded rectangles -->
      <path d="M50 72 L50 44 Q50 38 54 38 Q58 38 58 44 L58 68 Z" fill="${base}"/>
      <path d="M58 72 L58 36 Q58 30 62 30 Q66 30 66 36 L66 68 Z" fill="${base}"/>
      <path d="M66 72 L66 36 Q66 30 70 30 Q74 30 74 36 L74 68 Z" fill="${base}"/>
      <path d="M74 72 L74 40 Q74 34 78 34 Q82 34 82 40 L82 68 Z" fill="${base}"/>
      <!-- thumb -->
      <path d="M46 76 Q38 72 38 64 Q38 56 44 54 Q48 52 50 56 L50 72 Z" fill="${base}"/>
      <!-- palm -->
      <path d="M46 76 L46 80 Q46 88 64 90 Q82 88 82 80 L82 72 L50 72 Z"
            fill="${base}"/>
      <!-- palm highlight -->
      <path d="M50 76 L50 80 Q50 86 64 88 Q78 86 78 80 L78 74 L50 74 Z"
            fill="${light}" opacity="0.55"/>
      <!-- small highlight on fingers -->
      <path d="M60 32 Q62 30 64 32" fill="none" stroke="${light}" stroke-width="1.5" opacity="0.6"/>`,

    'hands-together': `
      <!-- two hands cupped facing each other, from side view -->
      <!-- left hand -->
      <path d="M24 80 Q24 64 32 58 Q38 54 44 58 L44 68 L36 68 Q36 74 38 78 Q40 82 44 84 L44 88 Q36 90 28 86 Z"
            fill="${base}"/>
      <path d="M44 58 L44 88 L48 88 L48 58 Z" fill="${base}"/>
      <!-- right hand -->
      <path d="M104 80 Q104 64 96 58 Q90 54 84 58 L84 68 L92 68 Q92 74 90 78 Q88 82 84 84 L84 88 Q92 90 100 86 Z"
            fill="${base}"/>
      <path d="M84 58 L84 88 L80 88 L80 58 Z" fill="${base}"/>
      <!-- hands meeting in center (clasped/cupped) -->
      <path d="M44 58 Q54 52 64 52 Q74 52 84 58 L84 88 Q74 94 64 94 Q54 94 44 88 Z"
            fill="${dark}" opacity="0.8"/>
      <path d="M44 62 Q54 56 64 56 Q74 56 84 62 L84 86 Q74 90 64 90 Q54 90 44 86 Z"
            fill="${base}"/>
      <path d="M48 66 Q56 62 64 62 Q72 62 80 66 L80 84 Q72 88 64 88 Q56 88 48 84 Z"
            fill="${light}" opacity="0.5"/>`,

    'hands-light': `
      <!-- two hands raised with palms up holding/lifting light -->
      <!-- left palm -->
      <path d="M28 84 Q26 76 28 68 Q32 60 40 60 L56 60 L56 84 Q56 90 44 92 Q32 90 28 84 Z"
            fill="${base}"/>
      <path d="M32 80 Q30 74 32 68 Q35 62 42 62 L54 62 L54 80 Q54 86 44 88 Q34 86 32 80 Z"
            fill="${light}" opacity="0.5"/>
      <!-- right palm -->
      <path d="M100 84 Q102 76 100 68 Q96 60 88 60 L72 60 L72 84 Q72 90 84 92 Q96 90 100 84 Z"
            fill="${base}"/>
      <path d="M96 80 Q98 74 96 68 Q93 62 86 62 L74 62 L74 80 Q74 86 84 88 Q94 86 96 80 Z"
            fill="${light}" opacity="0.5"/>
      <!-- radiant light source above -->
      <circle cx="64" cy="36" r="18" fill="${G}" opacity="0.9"/>
      <circle cx="64" cy="36" r="12" fill="${G}"/>
      <circle cx="64" cy="36" r="7" fill="${W}" opacity="0.85"/>
      <!-- rays -->
      <g stroke="${G}" stroke-linecap="round" opacity="0.7">
        <line x1="64" y1="16" x2="64" y2="10" stroke-width="2.5"/>
        <line x1="76" y1="20" x2="80" y2="15" stroke-width="2"/>
        <line x1="82" y1="32" x2="88" y2="30" stroke-width="2"/>
        <line x1="52" y1="20" x2="48" y2="15" stroke-width="2"/>
        <line x1="46" y1="32" x2="40" y2="30" stroke-width="2"/>
      </g>`,

    'servant-crown': `
      <!-- two raised hands holding crown aloft -->
      <!-- left hand raised -->
      <path d="M26 90 L26 70 Q26 62 32 60 L44 60 L44 90 Q38 96 32 94 Z" fill="${base}"/>
      <path d="M44 60 L48 60 L48 88 L44 90 Z" fill="${base}"/>
      <!-- right hand raised -->
      <path d="M102 90 L102 70 Q102 62 96 60 L84 60 L84 90 Q90 96 96 94 Z" fill="${base}"/>
      <path d="M84 60 L80 60 L80 88 L84 90 Z" fill="${base}"/>
      <!-- ornate crown they hold up -->
      <path d="M40 54 L44 38 L52 48 L64 32 L76 48 L84 38 L88 54 L82 60 L46 60 Z"
            fill="${G}" stroke="${GD}" stroke-width="1"/>
      <!-- crown jewels -->
      <circle cx="64" cy="38" r="4" fill="${W}" opacity="0.9"/>
      <circle cx="48" cy="46" r="2.5" fill="${base}" opacity="0.8"/>
      <circle cx="80" cy="46" r="2.5" fill="${base}" opacity="0.8"/>
      <!-- crown band -->
      <rect x="44" y="52" width="40" height="6" rx="1" fill="${GD}" opacity="0.7"/>
      <g fill="${W}" opacity="0.6">
        <circle cx="52" cy="55" r="1.5"/>
        <circle cx="60" cy="55" r="1.5"/>
        <circle cx="68" cy="55" r="1.5"/>
        <circle cx="76" cy="55" r="1.5"/>
      </g>`,

    // ── Phase 6 — Second Daniel Fast ────────────────────────────────────

    lantern: `
      <!-- hanging chain -->
      <line x1="64" y1="18" x2="64" y2="30" stroke="${dark}" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="64" cy="30" r="3" fill="${dark}"/>
      <!-- lantern top cap -->
      <path d="M52 34 L52 30 L76 30 L76 34 Q76 38 72 38 L56 38 Q52 38 52 34 Z"
            fill="${dark}"/>
      <!-- lantern body frame -->
      <path d="M50 38 L50 86 Q50 92 56 92 L72 92 Q78 92 78 86 L78 38 Z"
            fill="${dark}" opacity="0.9"/>
      <!-- glass panels — 4 facets suggested -->
      <rect x="53" y="40" width="10" height="48" rx="1" fill="${light}" opacity="0.5"/>
      <rect x="65" y="40" width="10" height="48" rx="1" fill="${light}" opacity="0.35"/>
      <!-- interior flame glow -->
      <ellipse cx="64" cy="64" rx="10" ry="14" fill="${G}" opacity="0.5"/>
      <!-- flame -->
      <path d="M64 80 C58 72 56 64 60 56 C62 51 64 48 64 44 C64 48 66 51 68 56 C72 64 70 72 64 80 Z"
            fill="${G}"/>
      <path d="M64 76 C60 70 59 63 62 57 C63 53 64 51 64 47 C64 51 65 53 66 57 C69 63 68 70 64 76 Z"
            fill="${W}" opacity="0.7"/>
      <!-- lantern base foot -->
      <path d="M50 92 L46 96 L82 96 L78 92 Z" fill="${dark}"/>
      <rect x="46" y="96" width="36" height="4" rx="1" fill="${dark}" opacity="0.7"/>`,

    'lantern-radiant': `
      <!-- same lantern + rays -->
      <line x1="64" y1="16" x2="64" y2="28" stroke="${dark}" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="64" cy="28" r="3" fill="${dark}"/>
      <path d="M52 32 L52 28 L76 28 L76 32 Q76 36 72 36 L56 36 Q52 36 52 32 Z" fill="${dark}"/>
      <path d="M48 36 L48 86 Q48 94 56 94 L72 94 Q80 94 80 86 L80 36 Z" fill="${dark}" opacity="0.85"/>
      <rect x="51" y="38" width="11" height="50" rx="1" fill="${light}" opacity="0.5"/>
      <rect x="66" y="38" width="11" height="50" rx="1" fill="${light}" opacity="0.35"/>
      <ellipse cx="64" cy="62" rx="11" ry="16" fill="${G}" opacity="0.55"/>
      <path d="M64 78 C57 70 55 62 59 54 C61 49 64 46 64 42 C64 46 67 49 69 54 C73 62 71 70 64 78 Z" fill="${G}"/>
      <path d="M64 74 C60 68 58 61 61 55 C62 51 64 48 64 44 C64 48 66 51 67 55 C70 61 68 68 64 74 Z" fill="${W}" opacity="0.65"/>
      <path d="M48 94 L44 98 L84 98 L80 94 Z" fill="${dark}"/>
      <!-- radiant rays around lantern -->
      <g stroke="${G}" stroke-linecap="round" opacity="0.65">
        <line x1="36" y1="58" x2="28" y2="54" stroke-width="2.5"/>
        <line x1="34" y1="68" x2="26" y2="68" stroke-width="2.5"/>
        <line x1="92" y1="58" x2="100" y2="54" stroke-width="2.5"/>
        <line x1="94" y1="68" x2="102" y2="68" stroke-width="2.5"/>
        <line x1="38" y1="46" x2="32" y2="40" stroke-width="2"/>
        <line x1="90" y1="46" x2="96" y2="40" stroke-width="2"/>
      </g>`,

    'lampstand-gold': `
      <!-- base tripod feet -->
      <path d="M44 108 L54 94 L64 100 L74 94 L84 108 Z" fill="${dark}"/>
      <path d="M54 94 L74 94 L64 100 Z" fill="${dark}" opacity="0.6"/>
      <!-- centre column shaft -->
      <rect x="61" y="54" width="6" height="42" rx="2" fill="${dark}"/>
      <!-- bowl / lamp cup -->
      <path d="M50 54 Q50 44 58 40 L70 40 Q78 44 78 54 Q78 60 70 62 L58 62 Q50 60 50 54 Z"
            fill="${base}"/>
      <ellipse cx="64" cy="54" rx="14" ry="10" fill="${light}"/>
      <ellipse cx="64" cy="54" rx="10" ry="7" fill="${G}" opacity="0.7"/>
      <!-- flame above cup -->
      <path d="M64 40 C58 32 56 24 60 18 C62 13 64 10 64 6 C64 10 66 13 68 18 C72 24 70 32 64 40 Z"
            fill="${G}"/>
      <path d="M64 36 C60 30 59 23 62 18 C63 14 64 11 64 8 C64 11 65 14 66 18 C69 23 68 30 64 36 Z"
            fill="${W}" opacity="0.7"/>
      <!-- side arms / candelabra look -->
      <path d="M52 56 Q40 54 36 46 Q38 40 44 40" fill="none" stroke="${dark}" stroke-width="3" stroke-linecap="round"/>
      <path d="M76 56 Q88 54 92 46 Q90 40 84 40" fill="none" stroke="${dark}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="44" cy="38" r="5" fill="${G}"/>
      <circle cx="84" cy="38" r="5" fill="${G}"/>`,

    // ── Phase 7 — Esther Preparation Fast ───────────────────────────────

    'crown-outline': `
      <!-- crown — outlined / simple -->
      <path d="M28 82 L34 50 L50 66 L64 36 L78 66 L94 50 L100 82 Z"
            fill="none" stroke="${base}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="M24 82 L104 82" stroke="${base}" stroke-width="4" stroke-linecap="round"/>
      <!-- small circles at crown points -->
      <circle cx="64" cy="36" r="5" fill="${base}"/>
      <circle cx="34" cy="50" r="4" fill="${base}"/>
      <circle cx="94" cy="50" r="4" fill="${base}"/>
      <!-- band decoration -->
      <path d="M28 84 L100 84 Q104 84 104 88 L104 90 Q64 96 24 90 L24 88 Q24 84 28 84 Z"
            fill="${base}" opacity="0.6"/>`,

    'crown-jewel': `
      <!-- filled crown with jewel -->
      <path d="M26 80 L32 48 L50 64 L64 34 L78 64 L96 48 L102 80 Z"
            fill="${base}"/>
      <path d="M26 80 L102 80 Q106 80 106 84 L106 90 Q64 98 22 90 L22 84 Q22 80 26 80 Z"
            fill="${dark}"/>
      <!-- crown face lighter highlight -->
      <path d="M34 78 L38 52 L52 66 L64 40 L76 66 L90 52 L94 78 Z"
            fill="${light}" opacity="0.45"/>
      <!-- crown band highlight -->
      <rect x="28" y="80" width="72" height="6" rx="1" fill="${light}" opacity="0.3"/>
      <!-- centre jewel -->
      <path d="M60 58 L64 50 L68 58 L72 52 L68 64 L60 64 L56 52 Z" fill="${G}"/>
      <ellipse cx="64" cy="58" rx="5" ry="7" fill="${G}"/>
      <circle cx="64" cy="56" r="3.5" fill="${W}" opacity="0.85"/>
      <!-- side small gems -->
      <circle cx="44" cy="68" r="3" fill="${G}" opacity="0.8"/>
      <circle cx="84" cy="68" r="3" fill="${G}" opacity="0.8"/>`,

    'crown-radiant': `
      <!-- full radiant crown -->
      <path d="M24 80 L30 46 L48 62 L64 30 L80 62 L98 46 L104 80 Z"
            fill="${base}"/>
      <path d="M24 80 L104 80 L104 88 Q64 98 24 88 Z" fill="${dark}"/>
      <!-- lighter face -->
      <path d="M32 78 L36 50 L52 64 L64 36 L76 64 L92 50 L96 78 Z"
            fill="${light}" opacity="0.4"/>
      <!-- jewels -->
      <circle cx="64" cy="38" r="6" fill="${G}"/>
      <circle cx="64" cy="38" r="4" fill="${W}" opacity="0.85"/>
      <circle cx="42" cy="58" r="3.5" fill="${G}" opacity="0.85"/>
      <circle cx="86" cy="58" r="3.5" fill="${G}" opacity="0.85"/>
      <!-- rays from crown -->
      <g stroke="${G}" stroke-linecap="round" opacity="0.65">
        <line x1="64" y1="22" x2="64" y2="14" stroke-width="3"/>
        <line x1="46" y1="26" x2="40" y2="20" stroke-width="2.5"/>
        <line x1="82" y1="26" x2="88" y2="20" stroke-width="2.5"/>
        <line x1="32" y1="38" x2="24" y2="34" stroke-width="2"/>
        <line x1="96" y1="38" x2="104" y2="34" stroke-width="2"/>
      </g>`,

    'crown-path': `
      <!-- crown above with path leading toward it -->
      <!-- crown -->
      <path d="M36 56 L42 32 L54 46 L64 22 L74 46 L86 32 L92 56 Z"
            fill="${base}"/>
      <path d="M36 56 L92 56 L94 62 Q64 70 34 62 Z" fill="${dark}"/>
      <path d="M42 54 L46 34 L56 46 L64 28 L72 46 L82 34 L86 54 Z"
            fill="${light}" opacity="0.4"/>
      <!-- jewel at crown top -->
      <circle cx="64" cy="26" r="5" fill="${G}"/>
      <circle cx="64" cy="26" r="3" fill="${W}" opacity="0.85"/>
      <!-- winding path from bottom leading up to crown -->
      <path d="M22 108 Q36 100 44 92 Q52 84 56 76 Q60 68 64 64"
            fill="none" stroke="${base}" stroke-width="4" stroke-linecap="round" opacity="0.7"/>
      <path d="M106 108 Q92 100 84 92 Q76 84 72 76 Q68 68 64 64"
            fill="none" stroke="${base}" stroke-width="4" stroke-linecap="round" opacity="0.7"/>
      <!-- path dashes -->
      <path d="M22 108 Q36 100 44 92 Q52 84 56 76 Q60 68 64 64"
            fill="none" stroke="${C.linen}" stroke-width="2" stroke-dasharray="4,4" stroke-linecap="round" opacity="0.8"/>
      <path d="M106 108 Q92 100 84 92 Q76 84 72 76 Q68 68 64 64"
            fill="none" stroke="${C.linen}" stroke-width="2" stroke-dasharray="4,4" stroke-linecap="round" opacity="0.8"/>`,

    // ── Phase 8 — Year-End Consecration ─────────────────────────────────

    'oil-lamp': `
      <!-- classic oil lamp (genie lamp / Aladdin style) -->
      <!-- body -->
      <path d="M30 72 Q30 58 42 54 Q50 50 64 50 Q80 50 86 56 Q94 64 90 74 Q86 84 78 86 Q70 90 64 88 Q42 88 34 84 Q26 80 30 72 Z"
            fill="${base}"/>
      <path d="M34 72 Q34 60 44 58 Q52 54 64 54 Q78 54 84 60 Q90 66 87 74 Q84 82 76 84 Q68 88 64 86 Q44 86 38 82 Q30 78 34 72 Z"
            fill="${light}" opacity="0.6"/>
      <!-- handle on right -->
      <path d="M88 66 Q100 62 102 70 Q104 78 96 82 Q90 84 88 80"
            fill="none" stroke="${base}" stroke-width="6" stroke-linecap="round"/>
      <path d="M88 66 Q100 62 102 70 Q104 78 96 82 Q90 84 88 80"
            fill="none" stroke="${light}" stroke-width="3" stroke-linecap="round" opacity="0.5"/>
      <!-- spout on left -->
      <path d="M34 68 Q22 62 18 54 Q20 48 28 52 Q36 56 36 62"
            fill="${dark}"/>
      <!-- wick flame -->
      <path d="M34 54 C28 46 26 38 30 30 C32 25 34 22 36 18 C36 22 38 25 40 30 C44 38 42 46 36 54 Z"
            fill="${G}"/>
      <path d="M36 50 C32 44 31 37 34 31 C35 27 36 24 36 20 C36 24 37 27 38 31 C41 37 40 44 36 50 Z"
            fill="${W}" opacity="0.7"/>`,

    'oil-lamp-bright': `
      <!-- same lamp, larger and with rays -->
      <path d="M28 74 Q28 58 42 52 Q52 48 64 48 Q80 48 88 56 Q96 64 92 76 Q88 86 78 88 Q68 92 64 90 Q40 90 32 84 Q24 78 28 74 Z"
            fill="${base}"/>
      <path d="M32 74 Q32 60 44 56 Q54 52 64 52 Q78 52 86 60 Q92 68 89 76 Q86 84 76 86 Q66 90 64 88 Q42 88 36 82 Q28 76 32 74 Z"
            fill="${light}" opacity="0.55"/>
      <path d="M90 68 Q104 62 106 72 Q108 82 98 86 Q90 88 90 82"
            fill="none" stroke="${base}" stroke-width="7" stroke-linecap="round"/>
      <path d="M32 68 Q18 60 14 50 Q16 42 26 48 Q36 54 36 62"
            fill="${dark}"/>
      <!-- large glowing flame with rays -->
      <circle cx="28" cy="36" r="16" fill="${G}" opacity="0.4"/>
      <path d="M28 52 C20 42 18 32 22 22 C24 16 28 12 28 6 C28 12 32 16 34 22 C38 32 36 42 28 52 Z"
            fill="${G}"/>
      <path d="M28 46 C23 38 22 30 25 22 C27 17 28 14 28 8 C28 14 29 17 31 22 C34 30 33 38 28 46 Z"
            fill="${W}" opacity="0.7"/>
      <!-- rays -->
      <g stroke="${G}" stroke-linecap="round" opacity="0.6">
        <line x1="28" y1="4" x2="28" y2="0" stroke-width="3"/>
        <line x1="14" y1="20" x2="10" y2="16" stroke-width="2.5"/>
        <line x1="8" y1="36" x2="4" y2="36" stroke-width="2.5"/>
        <line x1="42" y1="20" x2="46" y2="16" stroke-width="2.5"/>
      </g>`,

    'lampstand-radiant': `
      <!-- tall ornate lampstand (single menorah-like) -->
      <!-- base -->
      <path d="M40 108 L50 98 L64 104 L78 98 L88 108 Z" fill="${dark}"/>
      <path d="M50 98 L78 98" stroke="${dark}" stroke-width="4" stroke-linecap="round"/>
      <!-- shaft -->
      <rect x="61" y="56" width="6" height="44" rx="2" fill="${dark}"/>
      <!-- upper shaft decoration -->
      <ellipse cx="64" cy="68" rx="8" ry="4" fill="${base}"/>
      <ellipse cx="64" cy="80" rx="6" ry="3" fill="${base}"/>
      <!-- lamp cup -->
      <path d="M50 56 Q50 46 58 42 L70 42 Q78 46 78 56 Q78 62 70 64 L58 64 Q50 62 50 56 Z"
            fill="${base}"/>
      <ellipse cx="64" cy="56" rx="14" ry="10" fill="${light}" opacity="0.7"/>
      <ellipse cx="64" cy="55" rx="9" ry="7" fill="${G}" opacity="0.7"/>
      <!-- large flame -->
      <path d="M64 42 C54 30 50 18 56 8 C58 4 64 0 64 0 C64 0 70 4 72 8 C78 18 74 30 64 42 Z"
            fill="${G}"/>
      <path d="M64 38 C57 28 54 17 59 8 C61 4 64 1 64 1 C64 1 67 4 69 8 C74 17 71 28 64 38 Z"
            fill="${W}" opacity="0.7"/>
      <!-- side arms with mini flames -->
      <path d="M50 56 Q36 52 32 42 Q34 34 42 36" fill="none" stroke="${dark}" stroke-width="3.5"/>
      <path d="M78 56 Q92 52 96 42 Q94 34 86 36" fill="none" stroke="${dark}" stroke-width="3.5"/>
      <path d="M42 36 C38 28 38 22 42 18 C42 22 44 26 46 30 Z" fill="${G}" opacity="0.85"/>
      <path d="M86 36 C90 28 90 22 86 18 C86 22 84 26 82 30 Z" fill="${G}" opacity="0.85"/>
      <!-- rays from main flame -->
      <g stroke="${G}" stroke-linecap="round" opacity="0.55">
        <line x1="64" y1="0" x2="64" y2="-6" stroke-width="3"/>
        <line x1="46" y1="8" x2="40" y2="4" stroke-width="2.5"/>
        <line x1="82" y1="8" x2="88" y2="4" stroke-width="2.5"/>
        <line x1="38" y1="20" x2="32" y2="18" stroke-width="2"/>
        <line x1="90" y1="20" x2="96" y2="18" stroke-width="2"/>
      </g>`,

    'altar-flame': `
      <!-- stone altar steps -->
      <path d="M22 108 L30 94 L98 94 L106 108 Z" fill="${dark}" opacity="0.8"/>
      <path d="M32 94 L40 80 L88 80 L96 94 Z" fill="${dark}"/>
      <path d="M42 80 L50 68 L78 68 L86 80 Z" fill="${dark}" opacity="0.9"/>
      <!-- altar top surface -->
      <path d="M46 68 L82 68 L82 64 L46 64 Z" fill="${base}"/>
      <path d="M48 64 L80 64 L82 60 L46 60 Z" fill="${light}" opacity="0.5"/>
      <!-- stone texture lines -->
      <g stroke="${C.linen}" stroke-width="0.8" opacity="0.3">
        <line x1="36" y1="90" x2="92" y2="90"/>
        <line x1="44" y1="78" x2="84" y2="78"/>
        <line x1="64" y1="94" x2="64" y2="82"/>
        <line x1="64" y1="82" x2="64" y2="70"/>
      </g>
      <!-- large flame on altar -->
      <path d="M64 60 C52 48 46 34 50 20 C52 12 58 6 64 0 C70 6 76 12 78 20 C82 34 76 48 64 60 Z"
            fill="${G}"/>
      <path d="M64 54 C56 44 52 31 55 19 C57 12 61 7 64 2 C67 7 71 12 73 19 C76 31 72 44 64 54 Z"
            fill="${W}" opacity="0.65"/>
      <!-- side wisps -->
      <path d="M50 50 C42 40 42 30 46 24 C46 30 48 36 52 42 Z" fill="${G}" opacity="0.7"/>
      <path d="M78 50 C86 40 86 30 82 24 C82 30 80 36 76 42 Z" fill="${G}" opacity="0.7"/>
      <!-- glow behind flame -->
      <ellipse cx="64" cy="40" rx="20" ry="28" fill="${G}" opacity="0.2"/>`,
  };

  return MOTIFS[id] ?? MOTIFS['flame-small'];
}

// ─── Build SVG ────────────────────────────────────────────────────────────────
function buildSvg(id, accent, tier) {
  const { parchmentGrad, outerDecor, innerDecor } = buildFrame(id, tier, accent);
  const clipId = `clip_${id.replace(/-/g, '_')}`;
  const artwork = motif(id.split('-').slice(0, id.includes('phase') ? undefined : undefined).join('-'), accent);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -10 148 148" width="128" height="128" role="img" aria-label="${id}">
  <defs>
    ${parchmentGrad}
    <clipPath id="${clipId}">
      <circle cx="64" cy="64" r="50"/>
    </clipPath>
  </defs>
  ${outerDecor}
  <circle cx="64" cy="64" r="52" fill="url(#pg_${id.replace(/-/g, '_')})"/>
  ${innerDecor}
  <g clip-path="url(#${clipId})">
    ${artwork.trim()}
  </g>
</svg>`;
}

// ─── Badge registry ──────────────────────────────────────────────────────────
const BADGES = [
  // Global journey badges
  { id: 'first-check-in',  accent: GLOBAL_ACCENT, tier: 1,        motif: 'sunrise' },
  { id: 'streak-3',        accent: GLOBAL_ACCENT, tier: 1,        motif: 'flame-small' },
  { id: 'streak-7',        accent: GLOBAL_ACCENT, tier: 1,        motif: 'flame-olive' },
  { id: 'streak-14',       accent: GLOBAL_ACCENT, tier: 2,        motif: 'flame-beacon' },
  { id: 'streak-21',       accent: GLOBAL_ACCENT, tier: 3,        motif: 'flame-torch' },
  { id: 'prayer-warrior',  accent: GLOBAL_ACCENT, tier: 2,        motif: 'prayer-dove' },
  { id: 'journal-keeper',  accent: GLOBAL_ACCENT, tier: 2,        motif: 'journal-quill' },
  { id: 'finished-plan',   accent: GLOBAL_ACCENT, tier: 'complete', motif: 'laurel-star' },
  // Phase 1
  { id: 'phase-1-milestone-7',  accent: PHASE_ACCENT[1], tier: 1,        motif: 'olive-branch' },
  { id: 'phase-1-milestone-14', accent: PHASE_ACCENT[1], tier: 2,        motif: 'olive-shield' },
  { id: 'phase-1-complete',     accent: PHASE_ACCENT[1], tier: 'complete', motif: 'olive-wreath-crown' },
  // Phase 2
  { id: 'phase-2-milestone-7',  accent: PHASE_ACCENT[2], tier: 1,        motif: 'harp' },
  { id: 'phase-2-milestone-14', accent: PHASE_ACCENT[2], tier: 2,        motif: 'harp-rays' },
  { id: 'phase-2-milestone-21', accent: PHASE_ACCENT[2], tier: 3,        motif: 'harp-star' },
  { id: 'phase-2-complete',     accent: PHASE_ACCENT[2], tier: 'complete', motif: 'harp-royal' },
  // Phase 3
  { id: 'phase-3-milestone-3',  accent: PHASE_ACCENT[3], tier: 1, motif: 'path-step' },
  { id: 'phase-3-milestone-7',  accent: PHASE_ACCENT[3], tier: 1, motif: 'path-hills' },
  { id: 'phase-3-milestone-14', accent: PHASE_ACCENT[3], tier: 2, motif: 'path-light' },
  { id: 'phase-3-milestone-21', accent: PHASE_ACCENT[3], tier: 3, motif: 'path-summit' },
  // Phase 4
  { id: 'phase-4-milestone-3',  accent: PHASE_ACCENT[4], tier: 1, motif: 'heart-seed' },
  { id: 'phase-4-milestone-5',  accent: PHASE_ACCENT[4], tier: 1, motif: 'sprout' },
  { id: 'phase-4-milestone-7',  accent: PHASE_ACCENT[4], tier: 1, motif: 'growing-tree' },
  { id: 'phase-4-complete',     accent: PHASE_ACCENT[4], tier: 'complete', motif: 'renewal-tree' },
  // Phase 5
  { id: 'phase-5-milestone-3',  accent: PHASE_ACCENT[5], tier: 1, motif: 'hand-one' },
  { id: 'phase-5-milestone-7',  accent: PHASE_ACCENT[5], tier: 1, motif: 'hands-together' },
  { id: 'phase-5-milestone-14', accent: PHASE_ACCENT[5], tier: 2, motif: 'hands-light' },
  { id: 'phase-5-milestone-21', accent: PHASE_ACCENT[5], tier: 3, motif: 'servant-crown' },
  // Phase 6
  { id: 'phase-6-milestone-3',  accent: PHASE_ACCENT[6], tier: 1, motif: 'flame-small' },
  { id: 'phase-6-milestone-7',  accent: PHASE_ACCENT[6], tier: 1, motif: 'lantern' },
  { id: 'phase-6-milestone-14', accent: PHASE_ACCENT[6], tier: 2, motif: 'lantern-radiant' },
  { id: 'phase-6-milestone-21', accent: PHASE_ACCENT[6], tier: 3, motif: 'lampstand-gold' },
  // Phase 7
  { id: 'phase-7-milestone-3',  accent: PHASE_ACCENT[7], tier: 1, motif: 'crown-outline' },
  { id: 'phase-7-milestone-7',  accent: PHASE_ACCENT[7], tier: 1, motif: 'crown-jewel' },
  { id: 'phase-7-milestone-14', accent: PHASE_ACCENT[7], tier: 2, motif: 'crown-radiant' },
  { id: 'phase-7-milestone-21', accent: PHASE_ACCENT[7], tier: 3, motif: 'crown-path' },
  // Phase 8
  { id: 'phase-8-milestone-7',  accent: PHASE_ACCENT[8], tier: 1, motif: 'oil-lamp' },
  { id: 'phase-8-milestone-14', accent: PHASE_ACCENT[8], tier: 2, motif: 'oil-lamp-bright' },
  { id: 'phase-8-milestone-21', accent: PHASE_ACCENT[8], tier: 3, motif: 'lampstand-radiant' },
  { id: 'phase-8-complete',     accent: PHASE_ACCENT[8], tier: 'complete', motif: 'altar-flame' },
];

if (BADGES.length !== 39) {
  console.error(`Expected 39 badges, got ${BADGES.length}`);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

for (const badge of BADGES) {
  const svg = buildSvg(badge.id, badge.accent, badge.tier);
  writeFileSync(join(OUT_DIR, `${badge.id}.svg`), svg, 'utf8');
}

console.log(`✓ Generated ${BADGES.length} badge SVGs → ${OUT_DIR}`);

#!/usr/bin/env node
/**
 * One-time codemod: converts the old light-only Tailwind classes into theme-aware design tokens.
 *
 *   node scripts/retheme.mjs --dry     show what would change (no files written)
 *   node scripts/retheme.mjs           apply the changes
 *
 * Safe to run twice: it only matches OLD classes (slate-*, emerald-50, ...), never the new tokens.
 */
import fs from 'node:fs';
import path from 'node:path';

const DRY = process.argv.includes('--dry');
const ROOT = process.cwd();
const TARGET_DIRS = ['app', 'components', 'lib'];
const EXTENSIONS = new Set(['.ts', '.tsx']);

// Old colour families -> semantic tone token
const TONES = {
  emerald: 'success', green: 'success', teal: 'success',
  amber: 'warning', yellow: 'warning',
  orange: 'caution',
  rose: 'danger', red: 'danger', pink: 'danger',
  blue: 'info', sky: 'info', cyan: 'info',
  indigo: 'plum', purple: 'plum', violet: 'plum',
};
const NEUTRALS = new Set(['slate', 'gray', 'zinc', 'neutral', 'stone']);

const TOKEN = new RegExp(
  '(?<![\\w\\-/])' +                                     // token must start cleanly
    '((?:[a-z0-9-]+:)*)' +                                // variants: hover: md: group-hover: ...
    '(bg|text|border|ring|divide|placeholder|from|via|to)-' +
    '(white|slate|gray|zinc|neutral|stone|emerald|green|teal|amber|yellow|orange|rose|red|pink|blue|sky|cyan|indigo|purple|violet|brand)' +
    '(?:-(\\d{2,3}))?' +                                  // shade
    '(?:/(\\d{1,3}))?' +                                  // opacity
    '(?![\\w\\-])',
  'g'
);

function mapToken(prefix, prop, color, shadeStr, alpha) {
  // Gradients keep their colours (the existing blue gradient buttons stay as they are)
  if (prop === 'from' || prop === 'via' || prop === 'to') return null;

  const shade = shadeStr ? Number(shadeStr) : null;
  const make = (name, defaultOpacity) => {
    const op = alpha ?? defaultOpacity;
    return `${prefix}${prop}-${name}${op !== undefined ? `/${op}` : ''}`;
  };

  // ---- white ----
  if (color === 'white') {
    if (shade !== null) return null;
    if (prop === 'bg') {
      // bg-white/10 is "frosted glass" on a dark gradient banner: keep it. bg-white/80 is a surface: convert it.
      if (alpha !== undefined && Number(alpha) <= 30) return null;
      return make('surface');
    }
    return null; // text-white stays white (used on blue buttons)
  }

  // ---- neutrals ----
  if (NEUTRALS.has(color)) {
    if (shade === null) return null;
    switch (prop) {
      case 'bg':
        if (shade <= 100) return make('surface-2');
        if (shade === 200) return make('line');
        if (shade === 300) return make('line-strong');
        if (shade <= 500) return make('fg-subtle');
        if (shade >= 900 && alpha !== undefined) return `${prefix}bg-black/${alpha === '40' ? '60' : alpha}`; // modal overlays
        return null;
      case 'text':
        if (shade >= 800) return make('fg');
        if (shade >= 500) return make('fg-muted');
        if (shade >= 300) return make('fg-subtle');
        return null;
      case 'border':
        return make(shade <= 200 ? 'line' : 'line-strong');
      case 'divide':
      case 'ring':
        return make('line');
      case 'placeholder':
        return make('fg-subtle');
      default:
        return null;
    }
  }

  // ---- brand blue ----
  if (color === 'brand') {
    if (shade === null) return null;
    switch (prop) {
      case 'bg':
        if (shade === 50) return make('accent', '10');
        if (shade === 100) return make('accent', '15');
        return null; // solid brand buttons keep their colour
      case 'text':
        return shade >= 500 ? make('accent') : null;
      case 'border':
        if (shade <= 200) return make('accent', '25');
        if (shade === 300) return make('accent', '40');
        return make('accent', '60');
      case 'ring':
        return make('accent', '30');
      default:
        return null;
    }
  }

  // ---- status colours -> tone tokens ----
  const tone = TONES[color];
  if (!tone || shade === null) return null;
  switch (prop) {
    case 'bg':
      if (shade === 50) return make(tone, '10');
      if (shade === 100) return make(tone, '15');
      if (shade === 200) return make(tone, '20');
      if (shade <= 400) return make(tone, '40');
      return make(tone);
    case 'text':
      return shade >= 300 ? make(tone) : null;
    case 'border':
      return make(tone, shade <= 300 ? '25' : '50');
    case 'ring':
      return make(tone, '30');
    default:
      return null;
  }
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (EXTENSIONS.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

let filesChanged = 0;
let totalReplacements = 0;
const summary = [];

for (const dir of TARGET_DIRS) {
  for (const file of walk(path.join(ROOT, dir))) {
    const before = fs.readFileSync(file, 'utf8');
    let count = 0;
    const after = before.replace(TOKEN, (match, prefix, prop, color, shade, alpha) => {
      const next = mapToken(prefix, prop, color, shade, alpha);
      if (next && next !== match) {
        count++;
        return next;
      }
      return match;
    });
    if (count > 0) {
      filesChanged++;
      totalReplacements += count;
      summary.push(`${String(count).padStart(4)}  ${path.relative(ROOT, file)}`);
      if (!DRY) fs.writeFileSync(file, after);
    }
  }
}

console.log(summary.join('\n'));
console.log(`\n${DRY ? '[dry run] ' : ''}${totalReplacements} replacements in ${filesChanged} files`);

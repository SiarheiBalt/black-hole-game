/**
 * Brand identity for the playable. Switched at build time via `VITE_BRAND`:
 *   VITE_BRAND=hole_stars   (default) → Hole Stars brand
 *   VITE_BRAND=attack_hole            → Attack Hole brand (Homa Games variant)
 *
 * The condition below is evaluated against a Vite-replaced constant, so only
 * one dynamic import survives dead-code elimination. That keeps each build
 * carrying just its own logo PNG — the unused brand is fully tree-shaken out
 * (important because the playable is inlined into a single HTML file).
 */
const VITE_BRAND = import.meta.env.VITE_BRAND;
const isAttackHole = VITE_BRAND === 'attack_hole';

let _logoModule;
if (isAttackHole) {
  _logoModule = await import('./attack-hole-logo.png');
} else {
  _logoModule = await import('./hole-stars-logo.png');
}

export const brandId = isAttackHole ? 'attack_hole' : 'hole_stars';
export const brandName = isAttackHole ? 'Attack Hole' : 'Hole Stars';
export const brandLogoUrl = _logoModule.default;

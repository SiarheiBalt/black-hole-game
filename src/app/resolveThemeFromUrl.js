import { getThemeConfig } from '../themes.js';

const PATH_THEME_RE = /^\/(?:t|theme)\/([\w-]+)\/?$/;

/**
 * Map `/t/<id>` (or `/theme/<id>`) to `/?theme=<id>` without reload so bundled
 * asset URLs (relative to `/`) resolve correctly after vite-plugin-singlefile.
 */
export function installPathThemeRedirect() {
  if (typeof location === 'undefined') return;
  const m = location.pathname.match(PATH_THEME_RE);
  if (!m) return;
  const id = m[1];
  const u = new URL(location.href);
  u.pathname = '/';
  if (!u.searchParams.get('theme')) u.searchParams.set('theme', id);
  history.replaceState(history.state, '', u.toString());
}

/**
 * Prefer `?theme=`, then build-time `VITE_THEME`, then `default`.
 * Call once at startup after `installPathThemeRedirect()`.
 *
 * @returns {string}
 */
export function resolveThemeIdFromUrl() {
  installPathThemeRedirect();
  const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
  const fromQuery = q.get('theme')?.trim();
  if (fromQuery) return getThemeConfig(fromQuery).id;

  const env = import.meta.env.VITE_THEME;
  if (typeof env === 'string' && env.trim()) return getThemeConfig(env.trim()).id;

  return 'default';
}

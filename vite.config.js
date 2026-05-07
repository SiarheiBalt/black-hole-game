import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/** Serve the same SPA for `/t/<theme>` (and `/theme/...`) in dev + preview. */
function themePathSpaFallback() {
  const rewrite = (req, _res, next) => {
    if (!req.url) return next();
    const pathname = new URL(req.url, 'http://local').pathname;
    if (PATH_THEME_RE.test(pathname)) req.url = '/index.html';
    next();
  };
  return {
    name: 'theme-path-spa-fallback',
    configureServer(server) {
      server.middlewares.use(rewrite);
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewrite);
    },
  };
}

const PATH_THEME_RE = /^\/(?:t|theme)\/[\w-]+\/?$/;

export default defineConfig({
  plugins: [viteSingleFile(), themePathSpaFallback()],
  build: {
    target: 'es2022',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
  },
});

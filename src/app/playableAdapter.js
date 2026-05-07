/**
 * Универсальный слой для HTML5 playable: clickout, MRAID, Mintegral, lifecycle.
 * См. PLAYABLE_AD_REQUIREMENTS_CLAUDE_OPTIMIZED.md
 */

export const APP_STORE_URL = 'https://apps.apple.com/app/id6747028173';

window.clickTag = window.clickTag || APP_STORE_URL;
window.clickTag1 = window.clickTag1 || window.clickTag;

window.gameStart = window.gameStart || function () {};
window.gameClose = window.gameClose || function () {};
window.gameReady = window.gameReady || function () {};
window.gameEnd = window.gameEnd || function () {};

let gameStarted = false;
let gameClosed = false;
let gamePaused = false;
let mraidViewableListenerAttached = false;

/** @type {import('pixi.js').Application | null} */
let appRef = null;
let lifecycleInstalled = false;
let disposed = false;

/** @type {(() => void) | null} */
let removeErrorHandlers = null;

/** @type {(() => boolean) | null} */
let shouldResumeTicker = null;

export function markGameStarted() {
  if (gameStarted) return;
  gameStarted = true;
  window.gameStart();
}

export function markGameClosed() {
  if (gameClosed) return;
  gameClosed = true;
  window.gameClose();
}

export function fireGameReady() {
  try {
    window.gameReady();
  } catch {
    /* ignore host errors */
  }
}

export function fireGameEnd() {
  try {
    window.gameEnd();
  } catch {
    /* ignore host errors */
  }
}

/**
 * @param {string} [url]
 */
export function openClickout(url) {
  const hasExplicitUrl = typeof url === 'string' && url.trim().length > 0;
  const targetUrl = String(hasExplicitUrl ? url : window.clickTag1 || window.clickTag || '');
  markGameClosed();

  if (window.mraid && typeof mraid.open === 'function') {
    mraid.open(targetUrl);
    return;
  }

  if (!hasExplicitUrl && typeof window.install === 'function') {
    window.install(targetUrl);
    return;
  }

  const w = window.open(targetUrl, '_blank');
  if (!w || w.closed) {
    window.location.href = targetUrl;
  }
}

/**
 * @param {import('pixi.js').Application} app
 */
export function attachPlayableApp(app) {
  appRef = app;
}

function pauseGameLoop() {
  if (disposed || gamePaused) return;
  gamePaused = true;
  appRef?.ticker?.stop();
}

function resumeGameLoop() {
  if (disposed || !gamePaused) return;
  gamePaused = false;
  if (shouldResumeTicker && !shouldResumeTicker()) return;
  appRef?.ticker?.start();
}

function onVisibilityChange() {
  if (document.hidden) {
    pauseGameLoop();
  } else {
    resumeGameLoop();
  }
}

function onWindowBlur() {
  pauseGameLoop();
}

function onWindowFocus() {
  resumeGameLoop();
}

function initMraidViewable() {
  if (mraidViewableListenerAttached) return;
  if (!window.mraid || typeof mraid.addEventListener !== 'function') return;
  mraidViewableListenerAttached = true;
  mraid.addEventListener('viewableChange', (viewable) => {
    if (viewable) {
      resumeGameLoop();
    } else {
      pauseGameLoop();
    }
  });
}

function onFirstPointer() {
  markGameStarted();
  document.removeEventListener('pointerdown', onFirstPointer);
}

/**
 * @param {object} [opts]
 * @param {() => void} [opts.onFatalError]
 * @param {() => boolean} [opts.shouldResumeTicker] — вернуть false, если цикл игры остановлен навсегда (конец раунда)
 */
export function installPlayableLifecycle(opts = {}) {
  if (lifecycleInstalled) return;
  lifecycleInstalled = true;
  shouldResumeTicker = opts.shouldResumeTicker || null;

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('blur', onWindowBlur);
  window.addEventListener('focus', onWindowFocus);
  window.addEventListener('pagehide', markGameClosed);
  document.addEventListener('pointerdown', onFirstPointer);

  initMraidViewable();

  const safeFatal = () => {
    try {
      opts.onFatalError?.();
    } catch (e) {
      console.error(e);
    }
    markGameClosed();
  };

  window.onerror = function () {
    safeFatal();
    return true;
  };
  const onRejection = (event) => {
    console.error(event.reason);
    safeFatal();
  };
  window.addEventListener('unhandledrejection', onRejection);

  removeErrorHandlers = () => {
    window.removeEventListener('unhandledrejection', onRejection);
    window.onerror = null;
  };
}

export function disposePlayableLifecycle() {
  disposed = true;
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('blur', onWindowBlur);
  window.removeEventListener('focus', onWindowFocus);
  window.removeEventListener('pagehide', markGameClosed);
  document.removeEventListener('pointerdown', onFirstPointer);
  removeErrorHandlers?.();
  removeErrorHandlers = null;
  shouldResumeTicker = null;
  appRef = null;
  lifecycleInstalled = false;
  mraidViewableListenerAttached = false;
}

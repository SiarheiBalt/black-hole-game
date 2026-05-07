import { Howl, Howler } from 'howler';
import suctionUrl from '../assets/sounds/suction.mp3';
import holeZoomUrl from '../assets/sounds/hole-zoom.mp3';
import backUrl from '../assets/sounds/back.mp3';

/**
 * Идентификаторы звуков. Новые треки: добавить ключ сюда и запись в {@link DEFAULT_SOUND_MANIFEST}.
 * @readonly
 */
export const SOUND_IDS = Object.freeze({
  suction: 'suction',
  holeZoom: 'holeZoom',
  background: 'background',
});

/**
 * @typedef {Object} SoundSpec
 * @property {readonly string[]} src
 * @property {number} [volume]
 * @property {boolean} [loop]
 * @property {boolean} [html5] — длинный фон на iOS стабильнее через HTML5 Audio
 */

/** @type {Readonly<Record<string, SoundSpec>>} */
const DEFAULT_SOUND_MANIFEST = Object.freeze({
  [SOUND_IDS.suction]: { src: [suctionUrl], volume: 0.75 },
  [SOUND_IDS.holeZoom]: { src: [holeZoomUrl], volume: 0.7 },
  [SOUND_IDS.background]: {
    src: [backUrl],
    volume: 0.8,
    loop: true,
    html5: true,
  },
});

function resumeAudioContext() {
  const ctx = Howler.ctx;
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

/**
 * @param {{
 *   backgroundMusicUrl?: string,
 *   backgroundMusicVolume?: number,
 * }} [options]
 *
 * @returns {{
 *   initPlayableAudioLifecycle: () => void,
 *   play: (id: string) => void,
 *   unlock: () => void,
 *   dispose: () => void,
 * }}
 */
export function createGameAudio(options = {}) {
  /** @type {Record<string, SoundSpec>} */
  const SOUND_MANIFEST = { ...DEFAULT_SOUND_MANIFEST };
  const { backgroundMusicUrl, backgroundMusicVolume } = options;
  if (typeof backgroundMusicUrl === 'string' && backgroundMusicUrl) {
    SOUND_MANIFEST[SOUND_IDS.background] = {
      ...SOUND_MANIFEST[SOUND_IDS.background],
      src: [backgroundMusicUrl],
      volume:
        typeof backgroundMusicVolume === 'number'
          ? backgroundMusicVolume
          : SOUND_MANIFEST[SOUND_IDS.background].volume,
      // Per-theme tracks are short loopables — Web Audio gives gapless looping.
      // Keep HTML5 only for the legacy default `back.mp3`.
      html5: false,
    };
  }
  /** @type {Record<string, import('howler').Howl>} */
  const howls = {};
  let audioUnlocked = false;
  let backgroundMusicStarted = false;
  let disposed = false;
  let lifecycleStarted = false;
  /** @type {(() => void)[]} */
  const detachFns = [];

  function pauseAll() {
    for (const h of Object.values(howls)) {
      h.pause();
    }
  }

  function tryResumeBackground() {
    if (disposed || !audioUnlocked || !backgroundMusicStarted) return;
    const h = howls[SOUND_IDS.background];
    if (h && !h.playing()) {
      h.play();
    }
  }

  function onVisibilityOrFocusReturn() {
    if (disposed || document.hidden) return;
    resumeAudioContext();
    tryResumeBackground();
  }

  /**
   * @param {string} id
   * @returns {import('howler').Howl | null}
   */
  function getHowl(id) {
    const spec = SOUND_MANIFEST[id];
    if (!spec) return null;
    let h = howls[id];
    if (!h) {
      h = new Howl({
        src: [...spec.src],
        volume: spec.volume ?? 1,
        loop: spec.loop ?? false,
        html5: spec.html5 ?? false,
        preload: true,
      });
      howls[id] = h;
    }
    return h;
  }

  function startBackgroundAfterUnlock() {
    if (disposed || !audioUnlocked || backgroundMusicStarted) return;
    backgroundMusicStarted = true;
    const h = getHowl(SOUND_IDS.background);
    if (h && !h.playing()) {
      h.play();
    }
  }

  function markUnlockedFromUserGesture() {
    if (disposed || audioUnlocked) return;
    audioUnlocked = true;
    resumeAudioContext();
    startBackgroundAfterUnlock();
  }

  return {
    initPlayableAudioLifecycle() {
      if (lifecycleStarted || disposed) return;
      lifecycleStarted = true;

      const once = { once: true, passive: true };
      for (const type of ['pointerdown', 'touchstart', 'click']) {
        const fn = () => markUnlockedFromUserGesture();
        document.addEventListener(type, fn, once);
        detachFns.push(() => document.removeEventListener(type, fn, once));
      }

      const onVis = () => {
        if (document.hidden) pauseAll();
        else onVisibilityOrFocusReturn();
      };
      document.addEventListener('visibilitychange', onVis, { passive: true });
      detachFns.push(() =>
        document.removeEventListener('visibilitychange', onVis),
      );

      const onBlur = () => pauseAll();
      const onFocus = () => onVisibilityOrFocusReturn();
      window.addEventListener('blur', onBlur, { passive: true });
      window.addEventListener('focus', onFocus, { passive: true });
      detachFns.push(() => window.removeEventListener('blur', onBlur));
      detachFns.push(() => window.removeEventListener('focus', onFocus));

      const onPageHide = () => pauseAll();
      window.addEventListener('pagehide', onPageHide, { passive: true });
      detachFns.push(() => window.removeEventListener('pagehide', onPageHide));
    },

    play(id) {
      if (disposed || !audioUnlocked) return;
      resumeAudioContext();
      const h = getHowl(id);
      if (h) h.play();
    },

    unlock: resumeAudioContext,

    dispose() {
      if (disposed) return;
      disposed = true;
      for (const d of detachFns) d();
      detachFns.length = 0;
      pauseAll();
      for (const id of Object.keys(howls)) {
        howls[id].unload();
        delete howls[id];
      }
    },
  };
}

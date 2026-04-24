import { Howl, Howler } from 'howler';
import suctionUrl from '../assets/sounds/suction.mp3';
import holeZoomUrl from '../assets/sounds/hole-zoom.mp3';

/**
 * Идентификаторы звуков. Новые треки: добавить ключ сюда и запись в {@link SOUND_MANIFEST}.
 * @readonly
 */
export const SOUND_IDS = Object.freeze({
  suction: 'suction',
  holeZoom: 'holeZoom',
});

/**
 * @typedef {Object} SoundSpec
 * @property {readonly string[]} src
 * @property {number} [volume]
 */

/** @type {Readonly<Record<string, SoundSpec>>} */
const SOUND_MANIFEST = Object.freeze({
  [SOUND_IDS.suction]: { src: [suctionUrl], volume: 0.75 },
  [SOUND_IDS.holeZoom]: { src: [holeZoomUrl], volume: 0.7 },
});

/**
 * @returns {{ play: (id: string) => void, unlock: () => void, dispose: () => void }}
 */
export function createGameAudio() {
  /** @type {Record<string, import('howler').Howl>} */
  const howls = {};

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
        preload: true,
      });
      howls[id] = h;
    }
    return h;
  }

  return {
    play(id) {
      const h = getHowl(id);
      if (h) h.play();
    },

    unlock() {
      const ctx = Howler.ctx;
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    },

    dispose() {
      for (const id of Object.keys(howls)) {
        howls[id].unload();
        delete howls[id];
      }
    },
  };
}

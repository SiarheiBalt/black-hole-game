// Per-theme MusicGen prompt specs. Consumed by `tools/music-gen/cli.mjs` →
// `tools/music-gen/musicgen.py` (Meta MusicGen-small via transformers).
// Goal: short, easy-listening, instrumental loop that matches each theme's
// cultural brief in `tools/theme-gen/briefs/<id>.json`.
//
// MusicGen-small caps stable generation at ~30s. We generate 24s and let the
// ffmpeg post-process trim + acrossfade into a gapless loop.

/**
 * @typedef {Object} MusicSpec
 * @property {string} prompt          short English description of the music
 * @property {number} [duration]      seconds (default 24, max 30)
 * @property {number} [seed]          deterministic seed (default per-theme below)
 * @property {string} [model]         HF model id (default facebook/musicgen-small)
 * @property {string} [_hint]         human-readable note (not sent to MusicGen)
 */

const DEFAULT_DURATION = 24;

/** @type {Record<string, MusicSpec>} */
export const MUSIC_SPECS = {
  default: {
    _hint: 'Calm chillout pad, easy listening',
    prompt:
      'calm chillout, soft warm synth pad, gentle melody, easy listening, minimal, instrumental, no vocals, 84 bpm',
    duration: DEFAULT_DURATION,
    seed: 1001,
  },

  space: {
    _hint: 'Slow ambient cosmic drone',
    prompt:
      'slow ambient cosmic drone, sci-fi, deep space pad, ethereal shimmering textures, gentle pulse, instrumental, no vocals, 70 bpm',
    duration: DEFAULT_DURATION,
    seed: 1002,
  },

  city: {
    _hint: 'Lo-fi hip hop, mellow jazzy keys',
    prompt:
      'lo-fi hip hop beat, mellow jazzy electric piano, warm vinyl crackle, urban chill, easy listening, instrumental, no vocals, 86 bpm',
    duration: DEFAULT_DURATION,
    seed: 1003,
  },

  fr_chic: {
    _hint: 'Parisian café musette',
    prompt:
      'french café musette, soft accordion, light jazz guitar, romantic Parisian, mellow swing, instrumental, no vocals, 96 bpm',
    duration: DEFAULT_DURATION,
    seed: 1004,
  },

  global_fiesta: {
    _hint: 'Upbeat tropical world pop',
    prompt:
      'upbeat tropical world pop, bright marimba, soft latin percussion, festive, easy listening, instrumental, no vocals, 104 bpm',
    duration: DEFAULT_DURATION,
    seed: 1005,
  },

  jp_kawaii: {
    _hint: 'Kawaii J-pop pastel',
    prompt:
      'kawaii Japanese pop, cute glockenspiel, twinkly bells, soft pastel anime, light easy listening, instrumental, no vocals, 100 bpm',
    duration: DEFAULT_DURATION,
    seed: 1006,
  },

  kr_sea_pop: {
    _hint: 'Dreamy K-pop city pop',
    prompt:
      'dreamy korean k-pop city pop, smooth synthwave, soft neon dance, mellow hooks, easy listening, instrumental, no vocals, 92 bpm',
    duration: DEFAULT_DURATION,
    seed: 1007,
  },

  uk_pub: {
    _hint: 'Warm British folk pub',
    prompt:
      'warm british folk pub music, gentle acoustic guitar, soft fiddle, mellow celtic jig, easy listening, instrumental, no vocals, 88 bpm',
    duration: DEFAULT_DURATION,
    seed: 1008,
  },

  zh_urban: {
    _hint: 'Chinese urban chill, pentatonic',
    prompt:
      'chinese urban chill, modern guzheng and pipa with soft city pop synth, ambient pentatonic melody, easy listening, instrumental, no vocals, 90 bpm',
    duration: DEFAULT_DURATION,
    seed: 1009,
  },
};

/** Reference aspect (optional tooling); playfield size follows the viewport. */
export const REFERENCE_WIDTH = 390;
export const REFERENCE_HEIGHT = 844;

export const BG_COLOR = 0x88d659;
/** Lighter green splotches on the field. */
export const DECOR_COLOR = 0xa8e879;

export const HOLE_RING_COLOR = 0x55ddff;
export const HOLE_CORE_COLOR = 0x0a0a12;
export const HOLE_INNER_RIM = 0x1a2a4a;

/** Procedural decor: count and style. */
export const DECOR_COUNT = 90;
export const DECOR_SEED = 42;

/**
 * World size = viewport size × this (each axis). Logical hole moves on this map; the Pixi
 * playfield scrolls so the hole stays visually centered (Three.js layer).
 */
export const WORLD_MAP_VIEW_MULTIPLIER = 2;

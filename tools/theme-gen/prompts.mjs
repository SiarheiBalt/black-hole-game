/**
 * Промпты собирает один файл — так легче править стилистику централизованно.
 * Промпты намеренно «тяжёлые», дописывают негативные ограничения и подсказки
 * по качеству, поэтому даже скудный `concept` в брифе даёт пригодный результат.
 */

const ICON_NEGATIVE = [
  'transparent background',
  'no shadow on the background',
  'no platform or pedestal',
  'no text',
  'no logos',
  'no watermark',
  'no people',
  'no hands',
  'no UI elements',
];

const ICON_POSITIVE = [
  '3D rendered hero icon for a mobile casual game',
  'glossy materials',
  'soft studio lighting',
  'gentle rim light',
  'square 1:1 framing',
  'subject occupies ~85% of canvas',
  'subject fills the frame edge to edge with only a thin transparent margin for outline/shadow',
  'centered',
  'fully isolated on transparent background',
  'crisp edges with clean alpha cutout',
  'premium polish',
  'ad-grade quality',
];

const BG_NEGATIVE = [
  'no characters',
  'no people',
  'no text',
  'no UI',
  'no watermark',
  'low visual noise',
  'no harsh contrast spikes',
];

const BG_POSITIVE = [
  'top-down (bird\'s eye) painterly illustration',
  'suitable as a 2.4x scrolling playfield for a casual game',
  'even diffuse lighting',
  'consistent color story',
  'gentle vignette ok',
  'high quality, ad-grade',
];

/**
 * @param {{ assetKind: 'sphere' | 'trump' | 'money' | 'poop', brief: object, attempt?: number, issues?: string[] }} args
 */
export function buildIconPrompt({ assetKind, brief, attempt = 0, issues = [] }) {
  const spec = brief?.icons?.[assetKind] ?? {};
  const concept = spec.concept || `themed collectible icon (${assetKind})`;
  const styleNotes = spec.styleNotes || '3D rendered, glossy';
  const audience = brief?.audience ? `Target audience: ${brief.audience}.` : '';

  const lines = [
    `Subject: ${concept}.`,
    `Style: ${styleNotes}.`,
    audience,
    ICON_POSITIVE.map((s) => `- ${s}`).join('\n'),
    `Forbidden: ${ICON_NEGATIVE.join(', ')}.`,
  ];

  if (attempt > 0 && issues.length) {
    lines.push(
      'IMPORTANT — previous attempt failed QA:',
      ...issues.map((i) => `- ${i}`),
      'Please correct these issues while keeping the subject and style intact.',
    );
  }

  return lines.filter(Boolean).join('\n');
}

/**
 * @param {{ decorKind: 'cube' | 'triangle', brief: object, attempt?: number, issues?: string[] }} args
 */
export function buildDecorPrompt({ decorKind, brief, attempt = 0, issues = [] }) {
  const spec = brief?.decor?.[decorKind] ?? {};
  const concept = spec.concept || `themed field decor element (${decorKind})`;
  const styleNotes = spec.styleNotes || '3D rendered, glossy';
  const audience = brief?.audience ? `Target audience: ${brief.audience}.` : '';

  const lines = [
    `Subject: ${concept}.`,
    `Style: ${styleNotes}.`,
    audience,
    ICON_POSITIVE.map((s) => `- ${s}`).join('\n'),
    `Forbidden: ${ICON_NEGATIVE.join(', ')}.`,
    'Note: this asset is a small field decoration that floats on the playfield. Keep it visually simple, recognizable at small size, ad-grade.',
  ];

  if (attempt > 0 && issues.length) {
    lines.push(
      'IMPORTANT — previous attempt failed QA:',
      ...issues.map((i) => `- ${i}`),
      'Please correct these issues while keeping the subject and style intact.',
    );
  }

  return lines.filter(Boolean).join('\n');
}

/**
 * @param {{ brief: object, attempt?: number, issues?: string[] }} args
 */
export function buildBackgroundPrompt({ brief, attempt = 0, issues = [] }) {
  const spec = brief?.background ?? {};
  const concept = spec.concept || 'themed top-down playfield background';
  const styleNotes = spec.styleNotes || 'painterly, soft daylight';
  const audience = brief?.audience ? `Target audience: ${brief.audience}.` : '';
  const palette = spec.paletteHint ? `Color hint: ${spec.paletteHint}.` : '';

  const lines = [
    `${concept}.`,
    `Style: ${styleNotes}.`,
    audience,
    palette,
    BG_POSITIVE.map((s) => `- ${s}`).join('\n'),
    `Forbidden: ${BG_NEGATIVE.join(', ')}.`,
  ];

  if (attempt > 0 && issues.length) {
    lines.push(
      'IMPORTANT — previous attempt failed QA:',
      ...issues.map((i) => `- ${i}`),
      'Adjust composition or palette to fix while keeping the same theme.',
    );
  }

  return lines.filter(Boolean).join('\n');
}

/**
 * Vision QA prompt. Returns strict JSON.
 */
export function buildVisionRubricPrompt(brief) {
  const concepts = ['trump', 'money', 'poop']
    .map((k) => `- ${k}: ${brief?.icons?.[k]?.concept ?? '(unspecified)'}`)
    .join('\n');
  const bgConcept = brief?.background?.concept ?? '(unspecified)';
  return [
    'You are a QA reviewer for a mobile playable ad screenshot.',
    `Theme id: ${brief.id}.`,
    `Audience: ${brief.audience ?? 'general'}.`,
    'Expected collectible concepts (3 different items, multiple copies of each):',
    concepts,
    `Expected background concept: ${bgConcept}.`,
    'Evaluate the screenshot. Reply with STRICT JSON only, no prose, schema:',
    '{ "pass": boolean, "issues": [{ "asset": "trump"|"money"|"poop"|"background"|"general", "note": string }] }',
    'Pass = true ONLY if: background visibly matches the theme, and at least two of the three icon types are recognizable as the briefed concepts. Otherwise pass = false and list specific issues with which asset is at fault.',
  ].join('\n');
}

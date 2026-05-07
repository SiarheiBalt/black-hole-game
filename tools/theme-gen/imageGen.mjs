import OpenAI from 'openai';
import { log } from './lib.mjs';

/**
 * Бэкенд генерации изображений. По умолчанию — OpenAI gpt-image-1
 * (нативная прозрачная PNG, единый API). Бэкенд `agent` оставлен заглушкой —
 * он работает только когда CLI запускается изнутри агента, который умеет
 * перехватывать вызовы и подкладывать собственно сгенерированные картинки.
 */

const DEFAULT_MODEL = process.env.THEME_GEN_IMAGE_MODEL || 'gpt-image-1';
const DEFAULT_BACKEND = (process.env.THEME_GEN_BACKEND || '').toLowerCase();

let cachedClient = null;
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      'OPENAI_API_KEY is not set. Set it in your shell or .env.local before running theme:gen.',
    );
  }
  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return cachedClient;
}

/**
 * @param {{ prompt: string, size?: '1024x1024' | '1024x1536' | '1536x1024', transparent?: boolean }} args
 * @returns {Promise<Buffer>} PNG bytes (transparent if requested)
 */
export async function generateImage({ prompt, size = '1024x1024', transparent = false }) {
  const backend = pickBackend();
  if (backend === 'openai') {
    return generateWithOpenAI({ prompt, size, transparent });
  }
  if (backend === 'agent') {
    throw new Error(
      'The "agent" image-gen backend can only be driven from within an agent harness; ' +
        'set OPENAI_API_KEY to use the openai backend instead.',
    );
  }
  throw new Error(`Unknown THEME_GEN_BACKEND="${backend}". Use "openai" or "agent".`);
}

function pickBackend() {
  if (DEFAULT_BACKEND) return DEFAULT_BACKEND;
  if (process.env.OPENAI_API_KEY) return 'openai';
  return 'agent';
}

async function generateWithOpenAI({ prompt, size, transparent }) {
  const client = getOpenAI();
  /** @type {Record<string, any>} */
  const params = {
    model: DEFAULT_MODEL,
    prompt,
    size,
    n: 1,
    output_format: 'png',
  };
  if (transparent) {
    params.background = 'transparent';
  }
  log('dim', `gpt-image-1 (${size}${transparent ? ', alpha' : ''})`);
  const response = await client.images.generate(params);
  const b64 = response?.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error('OpenAI image response missing b64_json data.');
  }
  return Buffer.from(b64, 'base64');
}

/**
 * @param {{ prompt: string, size?: string }} args
 * @returns {Promise<Buffer>}
 */
export async function generateIcon(args) {
  return generateImage({ ...args, size: args.size ?? '1024x1024', transparent: true });
}

/**
 * @param {{ prompt: string, size?: string }} args
 * @returns {Promise<Buffer>}
 */
export async function generateBackground(args) {
  return generateImage({ ...args, size: args.size ?? '1536x1024', transparent: false });
}

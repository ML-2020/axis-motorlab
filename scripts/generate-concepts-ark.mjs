/**
 * Generate paddy pump concept images with Volcengine Ark / Seedream.
 *
 * Required:
 *   ARK_API_KEY
 *
 * Optional:
 *   ARK_IMAGE_MODEL  (default: doubao-seedream-5-0-lite-260128)
 *   ARK_BASE_URL     (default: https://ark.cn-beijing.volces.com/api/v3)
 *
 * Usage:
 *   node scripts/generate-concepts-ark.mjs --mode wide
 *   node scripts/generate-concepts-ark.mjs --mode close --ref docs/concepts/generated/wide-01.png
 *   node scripts/generate-concepts-ark.mjs --mode wide --dry-run
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'docs', 'concepts', 'generated');

// Load a local .env without adding a dependency. Never commit .env.
try {
  const envText = await fs.readFile(path.join(root, '.env'), 'utf8');
  for (const line of envText.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const value = match[2].replace(/^['"]|['"]$/g, '');
    if (process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
} catch {
  // .env is optional; environment variables still work.
}

const apiKey = process.env.ARK_API_KEY;
const model = process.env.ARK_IMAGE_MODEL || 'doubao-seedream-5-0-lite-260128';
const baseUrl = (process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/, '');
const mode = argValue('--mode') || 'wide';
const refPath = argValue('--ref');
const dryRun = process.argv.includes('--dry-run');
const count = Number(argValue('--count') || 1);

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const prompts = {
  wide: `Photorealistic industrial documentary photograph of a small rice paddy irrigation pump station in southern China at overcast dawn. Horizontal end-suction centrifugal pump with green casing and black 5.5 kW motor on a wet concrete pad, yellow coupling guard, galvanized suction pipe with cylindrical strainer in an irrigation canal, discharge pipe with blue gate valve and pressure gauge, flooded rice paddies, wet muddy bunds, small corrugated shelter with electrical cabinet on the right, distant tree line and low mountains, warm low sun breaking through thin clouds, 35 mm lens, eye level, three-quarter view, realistic industrial materials, no text, no watermark, no people, no aerial view, 16:9.`,
  close: `Same pump station, same overcast dawn light and wet paddy environment. Close three-quarter front view of the pump set: green end-suction pump casing, black finned 5.5 kW motor, yellow coupling guard, green common baseplate, bolted suction flange, blue gate valve, pressure gauge, galvanized discharge pipe, wet concrete pad with mud and water stains, realistic industrial materials, 50 mm lens, eye level, no text, no watermark, no people, 16:9.`,
};

function dataUrl(filePath) {
  const ext = path.extname(filePath).toLowerCase().replace('.', '') || 'png';
  const mime = ext === 'jpg' ? 'jpeg' : ext;
  const data = fs.readFile(filePath).then((buf) => `data:image/${mime};base64,${buf.toString('base64')}`);
  return data;
}

async function requestOne(prompt, index, reference) {
  const body = {
    model,
    prompt,
    size: '2K',
    response_format: 'url',
    output_format: 'png',
    watermark: false,
  };
  if (reference) body.image = await dataUrl(reference);

  if (dryRun) {
    console.log(JSON.stringify({ url: `${baseUrl}/images/generations`, body: { ...body, image: reference ? '<base64 reference>' : undefined } }, null, 2));
    return null;
  }
  if (!apiKey) throw new Error('ARK_API_KEY is not set. Set it in the environment, not in git.');

  const res = await fetch(`${baseUrl}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) {
    throw new Error(`Ark ${res.status}: ${json?.error?.message || json?.message || text.slice(0, 500)}`);
  }
  const item = json?.data?.[0];
  if (!item) throw new Error(`No image in response: ${text.slice(0, 500)}`);

  await fs.mkdir(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = `${mode}-${stamp}-${String(index + 1).padStart(2, '0')}`;
  let file;
  if (item.b64_json) {
    file = path.join(outDir, `${base}.png`);
    await fs.writeFile(file, Buffer.from(item.b64_json, 'base64'));
  } else if (item.url) {
    const img = await fetch(item.url);
    if (!img.ok) throw new Error(`Image download failed: ${img.status}`);
    file = path.join(outDir, `${base}.png`);
    await fs.writeFile(file, Buffer.from(await img.arrayBuffer()));
  } else {
    throw new Error('Response has neither url nor b64_json');
  }
  const meta = {
    mode,
    model,
    prompt,
    reference: reference ? path.relative(root, reference) : null,
    request: { size: body.size, response_format: body.response_format, watermark: body.watermark },
    returned: { url: item.url || null, size: item.size || null },
    file: path.relative(root, file),
  };
  await fs.writeFile(path.join(outDir, `${base}.json`), JSON.stringify(meta, null, 2));
  console.log(`saved ${path.relative(root, file)}`);
  return file;
}

const prompt = prompts[mode];
if (!prompt) throw new Error(`Unknown mode "${mode}". Use wide or close.`);
if (mode === 'close' && !refPath) {
  console.warn('No --ref supplied; close view will be generated without a reference image.');
}

const results = [];
for (let i = 0; i < count; i++) {
  results.push(await requestOne(prompt, i, refPath));
}
console.log(JSON.stringify({ model, mode, count, files: results }, null, 2));

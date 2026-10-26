/**
 * Tencent Cloud TokenHub — Hunyuan 3D image-to-3D.
 *
 * Env:
 *   TOKENHUB_API_KEY    required
 *   TOKENHUB_3D_MODEL   default: hy-3d-3.1
 *   TOKENHUB_BASE_URL   default: https://tokenhub.tencentmaas.com
 *
 * Usage:
 *   node scripts/generate-3d-tokenhub.mjs --image docs/concepts/tokenhub/pump-crop.jpg
 *   node scripts/generate-3d-tokenhub.mjs --image ... --dry-run
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'docs', 'concepts', 'tokenhub', 'generated');
const apiKey = process.env.TOKENHUB_API_KEY;
const model = process.env.TOKENHUB_3D_MODEL || 'hy-3d-3.1';
const baseUrl = (process.env.TOKENHUB_BASE_URL || 'https://tokenhub.tencentmaas.com').replace(/\/$/, '');
const dryRun = process.argv.includes('--dry-run');

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const imagePath = arg('--image');
if (!imagePath) throw new Error('Missing --image path');

const buffer = await fs.readFile(imagePath);
const ext = path.extname(imagePath).toLowerCase().replace('.', '') || 'jpg';
const mime = ext === 'jpg' ? 'jpeg' : ext;
const imageBase64 = buffer.toString('base64');
if (imageBase64.length > 6 * 1024 * 1024) {
  throw new Error('Image base64 exceeds 6 MB. Crop/resize first.');
}
const body = {
  model,
  image_base64: imageBase64,
  generate_type: 'Normal',
  enable_pbr: true,
  face_count: 150000,
};
if (dryRun) {
  console.log(JSON.stringify({
    submit: `${baseUrl}/v1/api/3d/submit`,
    query: `${baseUrl}/v1/api/3d/query`,
    model,
    image: path.relative(root, imagePath),
    imageBase64Bytes: imageBase64.length,
    request: { ...body, image_base64: '<redacted base64>' },
  }, null, 2));
  process.exit(0);
}
if (!apiKey) throw new Error('TOKENHUB_API_KEY is not set');

const submit = await fetch(`${baseUrl}/v1/api/3d/submit`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const submitText = await submit.text();
let submitJson;
try { submitJson = JSON.parse(submitText); } catch { submitJson = { raw: submitText }; }
if (!submit.ok) throw new Error(`TokenHub submit ${submit.status}: ${submitJson?.error?.message || submitText.slice(0, 500)}`);
const id = submitJson.id;
if (!id) throw new Error(`No task id: ${submitText.slice(0, 500)}`);
console.log(`queued task ${id}`);

await fs.mkdir(outDir, { recursive: true });
const deadline = Date.now() + 15 * 60 * 1000;
let result = null;
while (Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, 10000));
  const query = await fetch(`${baseUrl}/v1/api/3d/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, id }),
  });
  const queryText = await query.text();
  let queryJson;
  try { queryJson = JSON.parse(queryText); } catch { queryJson = { raw: queryText }; }
  if (!query.ok) throw new Error(`TokenHub query ${query.status}: ${queryJson?.error?.message || queryText.slice(0, 500)}`);
  console.log(`status: ${queryJson.status || 'unknown'}`);
  if (queryJson.status === 'completed') {
    result = queryJson;
    break;
  }
  if (queryJson.status === 'failed') {
    throw new Error(`3D task failed: ${queryText.slice(0, 500)}`);
  }
}

if (!result) throw new Error('3D task timed out');
const items = result.data || [];
const glb = items.find((item) => item.type === 'glb') || items.find((item) => item.type === 'obj');
if (!glb?.url) throw new Error(`No GLB/OBJ in result: ${JSON.stringify(items).slice(0, 500)}`);

async function download(url, file) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status}`);
  await fs.writeFile(file, Buffer.from(await res.arrayBuffer()));
}
const glbPath = path.join(outDir, `${id}.${glb.type === 'glb' ? 'glb' : 'obj.zip'}`);
await download(glb.url, glbPath);
let previewPath = null;
if (glb.preview_image_url) {
  previewPath = path.join(outDir, `${id}-preview.png`);
  await download(glb.preview_image_url, previewPath);
}
await fs.writeFile(path.join(outDir, `${id}.json`), JSON.stringify({
  model,
  taskId: id,
  status: result.status,
  result: items.map((item) => ({ type: item.type, preview_image_url: item.preview_image_url || null, url: '<redacted signed URL; downloaded>' })),
  files: { model: path.relative(root, glbPath), preview: previewPath ? path.relative(root, previewPath) : null },
}, null, 2));
console.log(`saved ${path.relative(root, glbPath)}`);

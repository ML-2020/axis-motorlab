/**
 * Submit a flattened MiniMax H3 image-to-video workflow to local ComfyUI.
 *
 * Prerequisites:
 *   - ComfyUI backend on http://127.0.0.1:8188
 *   - image copied to ComfyUI/input/paddy-close.png
 *   - MiniMax H3 custom node and models installed
 */
import fs from 'node:fs/promises';

const base = 'http://127.0.0.1:8188';
const image = process.argv[2] || 'paddy-close.png';
const prompt = process.argv[3] || 'Cinematic subtle motion, keep the industrial pump station structure exactly unchanged. Very slow camera push-in toward the green pump and black motor. Gentle ripples on the muddy canal water, soft morning haze drifting, wet concrete reflections shimmering, faint pump vibration. Realistic documentary style, no text, no people, no structural changes, no camera shake.';
const width = Number(process.env.I2V_WIDTH || 864);
const height = Number(process.env.I2V_HEIGHT || 480);
const duration = Number(process.env.I2V_DURATION || 5);
// MiniMax H3 frame count: max(5, round(seconds*24)) rounded up to the model's 17-frame grid.
const frames = Math.max(5, Math.round(duration * 24));
const length = frames + ((5 - (frames % 17)) % 17);

const workflow = {
  '114': { class_type: 'LoadImage', inputs: { image, upload: 'image' } },
  '6': {
    class_type: 'UNETLoader',
    inputs: {
      unet_name: 'minimax_h3_fl2va_pruned_int8_convrot.safetensors',
      weight_dtype: 'default',
    },
  },
  '13': {
    class_type: 'CLIPLoader',
    inputs: {
      clip_name: 'qwen3vl_32b_h3_ultra_uncensored_heretic_int8_convrot.safetensors',
      type: 'minimax',
      device: 'default',
    },
  },
  '11': {
    class_type: 'VAELoader',
    inputs: { vae_name: 'minimax_h3_video_vae_fp16.safetensors' },
  },
  '24': {
    class_type: 'VAELoader',
    inputs: { vae_name: 'minimax_h3_audio_vae_fp32.safetensors' },
  },
  '104': {
    class_type: 'MiniMaxH3ImageToVideo',
    inputs: {
      clip: ['13', 0],
      vae: ['11', 0],
      first_frame: ['114', 0],
      prompt,
      width,
      height,
      length,
    },
  },
  '9': {
    class_type: 'BasicScheduler',
    inputs: { model: ['6', 0], scheduler: 'simple', steps: 20, denoise: 1 },
  },
  '17': { class_type: 'KSamplerSelect', inputs: { sampler_name: 'res_multistep' } },
  '15': { class_type: 'RandomNoise', inputs: { noise_seed: 386698826523434 } },
  '16': {
    class_type: 'BasicGuider',
    inputs: { model: ['6', 0], conditioning: ['104', 0] },
  },
  '14': {
    class_type: 'SamplerCustomAdvanced',
    inputs: {
      noise: ['15', 0],
      guider: ['16', 0],
      sampler: ['17', 0],
      sigmas: ['9', 0],
      latent_image: ['104', 1],
    },
  },
  '10': { class_type: 'VAEDecode', inputs: { samples: ['14', 0], vae: ['11', 0] } },
  '23': { class_type: 'VAEDecodeAudio', inputs: { samples: ['14', 0], vae: ['24', 0] } },
  '91': {
    class_type: 'CreateVideo',
    inputs: { images: ['10', 0], audio: ['23', 0], fps: 24, bit_depth: 8 },
  },
  '92': {
    class_type: 'SaveVideo',
    inputs: {
      video: ['91', 0],
      filename_prefix: 'video/paddy-i2v',
      format: 'auto',
      codec: 'auto',
    },
  },
};

const body = { prompt: workflow, client_id: 'dsh-comfy-i2v' };
const res = await fetch(`${base}/prompt`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const text = await res.text();
if (!res.ok) throw new Error(`ComfyUI submit ${res.status}: ${text.slice(0, 1500)}`);
const data = JSON.parse(text);
if (!data.prompt_id) throw new Error(`No prompt_id: ${text.slice(0, 500)}`);
await fs.writeFile('comfy-i2v-prompt.json', JSON.stringify({ prompt_id: data.prompt_id, workflow }, null, 2));
console.log(`queued prompt ${data.prompt_id}`);
console.log(`length=${length} frames, ${width}x${height}, ${duration}s`);

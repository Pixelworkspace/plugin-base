// Generate: text → sprite (endpoint generate-image-v2). Also the low-level
// generateImage() used by Repaint, and insertPreview() shared with the menu
// command.

import { SIZES, generateCost } from '../config';
import { getSettings, nextSeq } from '../storage';
import { submit, jobIdOf, poll } from '../api';
import { addJob, updateJob } from '../job-store';
import { needsKeyBanner } from '../widgets';
import { ui } from '../state';
import { WidgetType, Action, type GenerationResult, type JobKind } from '../types';

/** Persist a generation to the plugin file store WITH request/response metadata. */
async function saveGeneration(g: GenerationResult, label: string): Promise<string> {
  const seq = nextSeq();
  const key = 'gen/sprite_' + seq + '.png';
  await px.files.put(key, {
    data: g.base64,
    mimeType: 'image/png',
    name: (label || 'sprite').slice(0, 60),
    meta: {
      request: g.request,
      response: { generations: g.generations, jobId: g.jobId },
      width: g.width,
      height: g.height,
      seq,
    },
  });
  return key;
}

/**
 * Generate one image, track it as a job, save it with metadata, and return the
 * result. Used by the Generate tab and (with kind='repaint') by Repaint.
 */
export async function generateImage(
  description: string,
  width: number,
  height: number,
  kind: JobKind = 'generate'
): Promise<GenerationResult> {
  const s = getSettings();
  if (!s.apiKey) throw new Error('No API key yet — open the Settings tab and paste your Pixellab token.');
  if (!description) throw new Error('Enter a description first.');

  const req = { description, image_size: { width, height }, no_background: s.noBg };
  px.ui.progress(null, 'Submitting…');
  const body = await submit('/generate-image-v2', req);
  const jobId = jobIdOf(body);
  const job = addJob({
    kind,
    jobId,
    label: description.slice(0, 60),
    width,
    height,
    request: req,
    enhancedPrompt: body.enhanced_prompt || null,
    enhanceGens: (body.enhance_usage || {}).generations,
  });

  try {
    const done = await poll(jobId, kind === 'repaint' ? 'Repainting' : 'Generating sprite');
    const lr = done.last_response || done;
    const images = lr.images || [];
    if (!images.length) throw new Error('No images returned.');
    const generations = (lr.billing_usage || {}).generations;
    const g: GenerationResult = { base64: images[0].base64, width, height, generations, request: req, jobId };
    g.key = await saveGeneration(g, description);
    updateJob(job.seq, {
      status: 'completed',
      fileKey: g.key,
      generations,
      costIfPaid: (lr.usage || {}).cost_if_paid,
      seed: lr.seed,
      createdAt: done.created_at,
    });
    g.jobSeq = job.seq;
    return g;
  } catch (e) {
    updateJob(job.seq, { status: 'failed', error: message(e) });
    throw e;
  }
}

/** Write the current preview into the active cel (size match) or a new asset. */
export async function insertPreview(asAsset: boolean): Promise<string> {
  if (!ui.preview) throw new Error('Nothing to insert.');
  const img = await px.image.decode(ui.preview.base64);
  const ctx = px.assets.current();
  if (asAsset || !ctx || img.width !== ctx.width || img.height !== ctx.height) {
    const ref = await px.assets.create({
      name: 'Pixellab ' + (ui.preview.key || 'sprite'),
      type: 'character',
      width: img.width,
      height: img.height,
      pixels: img.pixels,
    });
    px.assets.open(ref.id);
    return 'Created asset ' + ref.name;
  }
  px.editor.commit(img.pixels);
  return 'Inserted into canvas';
}

/** The Generate tab UI. */
export function generateTab(): Widget[] {
  const s = getSettings();
  const kids: Widget[] = [];
  if (!s.apiKey) kids.push(...needsKeyBanner());
  kids.push(
    { type: WidgetType.TextArea, label: 'Description', value: s.description, rows: 3, action: Action.Desc, placeholder: 'a knight in golden armor holding a sword' },
    {
      type: WidgetType.HStack,
      gap: 8,
      children: [
        { type: WidgetType.Select, label: 'Size', value: s.size, action: Action.Size, options: SIZES.map((n) => ({ label: n + 'px', value: n })) },
        { type: WidgetType.Checkbox, label: 'No background', value: s.noBg, action: Action.NoBg },
      ],
    },
    { type: WidgetType.Label, muted: true, text: 'Cost: ~' + generateCost() + ' generations' },
    { type: WidgetType.Button, variant: 'primary', text: 'Generate', action: Action.Generate }
  );
  if (ui.preview) {
    const p = ui.preview;
    kids.push({ type: WidgetType.Separator });
    kids.push({
      type: WidgetType.Image,
      label: 'Result (' + p.width + '×' + p.height + (p.generations != null ? ', ' + p.generations + ' generations' : '') + ')',
      src: p.base64,
    });
    kids.push({
      type: WidgetType.HStack,
      gap: 6,
      children: [
        { type: WidgetType.Button, variant: 'primary', text: 'Insert into canvas', action: Action.Insert },
        { type: WidgetType.Button, text: 'Save as asset', action: Action.SaveAsset },
      ],
    });
  }
  return kids;
}

/** Normalise an unknown error to a short string. */
export function message(e: unknown): string {
  return ((e as Error)?.message || String(e)).slice(0, 140);
}

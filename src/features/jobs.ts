// The Jobs tab: a list of every tracked generation (survives reload), a detail
// view, and the actions to resume in-flight jobs or open finished results.

import { nextSeq } from '../storage';
import { poll } from '../api';
import { getJobs, findJob, updateJob, jobThumb } from '../job-store';
import { statusIcon } from '../widgets';
import { WidgetType, Action } from '../types';

/** The Jobs list (newest first). */
export function jobsTab(): Widget[] {
  const jobs = getJobs().slice().reverse();
  if (!jobs.length) return [{ type: WidgetType.Label, muted: true, text: 'No jobs yet — generations show up here (survives reload).' }];

  const kids: Widget[] = [{ type: WidgetType.Label, muted: true, text: jobs.length + ' cached jobs' }];
  for (const j of jobs) {
    const size = j.width ? j.width + '×' + j.height : '';

    const actions: Widget[] = [];
    if (j.status === 'completed' && j.fileKey) {
      actions.push({ type: WidgetType.Button, text: j.kind === 'animate' ? 'Open →timeline' : 'Insert', action: Action.JobInsert, value: String(j.seq) });
      if (j.kind !== 'animate') actions.push({ type: WidgetType.Button, text: 'Asset', action: Action.JobAsset, value: String(j.seq) });
    } else if (j.status === 'processing') {
      actions.push({ type: WidgetType.Button, variant: 'primary', text: 'Resume', action: Action.JobResume, value: String(j.seq) });
    }
    actions.push({ type: WidgetType.Button, text: 'Details', action: Action.JobDetail, value: String(j.seq) });
    actions.push({ type: WidgetType.Button, text: '✕', action: Action.JobDelete, value: String(j.seq) });

    // Row: the actual generated sprite (if we have a thumbnail) + name/type.
    const row: Widget[] = [];
    const thumb = jobThumb(j.fileKey);
    if (thumb) row.push({ type: WidgetType.Image, src: thumb, width: 48 });
    row.push({
      type: WidgetType.VStack,
      gap: 1,
      children: [
        { type: WidgetType.Label, text: statusIcon(j.status) + ' ' + (j.label || j.kind) },
        { type: WidgetType.Label, muted: true, text: j.kind + (size ? ' · ' + size : '') },
      ],
    });

    kids.push({
      type: WidgetType.VStack,
      gap: 4,
      children: [
        { type: WidgetType.HStack, gap: 8, children: row },
        j.status === 'failed'
          ? { type: WidgetType.Label, muted: true, text: '⚠ ' + (j.error || 'failed') }
          : { type: WidgetType.HStack, gap: 6, children: actions },
      ],
    });
    kids.push({ type: WidgetType.Separator });
  }
  return kids;
}

/** Full detail view for one job (id, enhanced prompt, cost, seed, params). */
export function jobDetailView(seq: number): Widget[] {
  const j = findJob(seq);
  if (!j) return [{ type: WidgetType.Label, text: 'Job not found.' }, { type: WidgetType.Button, text: '← Back', action: Action.JobBack }];

  const req = (j.request || {}) as Record<string, unknown>;
  const kids: Widget[] = [
    { type: WidgetType.HStack, gap: 8, children: [
      { type: WidgetType.Button, text: '← Back', action: Action.JobBack },
      { type: WidgetType.Label, text: statusIcon(j.status) + ' ' + (j.label || j.kind) },
    ]},
  ];
  const thumb = jobThumb(j.fileKey);
  if (thumb) kids.push({ type: WidgetType.Image, label: 'Result', src: thumb, width: 96 });
  kids.push({ type: WidgetType.Separator });

  const row = (k: string, v: string): Widget => ({ type: WidgetType.Label, muted: true, text: k + ': ' + v });
  kids.push(row('Status', j.status));
  kids.push(row('Kind', j.kind));
  kids.push(row('Job ID', j.jobId));
  if (j.width) kids.push(row('Size', j.width + '×' + j.height + (j.frameCount ? ' · ' + j.frameCount + ' frames' : '')));
  if (j.seed != null) kids.push(row('Seed', String(j.seed)));
  if (j.generations != null) kids.push(row('Cost', j.generations + ' generations' + (j.costIfPaid != null ? ' (~$' + Number(j.costIfPaid).toFixed(4) + ' if paid)' : '')));
  if (j.enhanceGens != null) kids.push(row('Prompt-enhance cost', j.enhanceGens + ' generations'));
  if (j.createdAt) kids.push(row('Created', String(j.createdAt).replace('T', ' ').slice(0, 19)));
  if (typeof req.action === 'string') kids.push(row('Action', req.action));
  if (typeof req.description === 'string') kids.push(row('Description', req.description));
  if (j.error) kids.push({ type: WidgetType.Label, text: '⚠ ' + j.error });
  if (j.enhancedPrompt) {
    kids.push({ type: WidgetType.Separator });
    kids.push({ type: WidgetType.Label, text: 'Enhanced prompt' });
    kids.push({ type: WidgetType.Text, text: j.enhancedPrompt });
  }
  if (j.status === 'completed' && j.fileKey) {
    kids.push({ type: WidgetType.Separator });
    kids.push({ type: WidgetType.HStack, gap: 6, children: [
      { type: WidgetType.Button, variant: 'primary', text: j.kind === 'animate' ? 'Open →timeline' : 'Insert', action: Action.JobInsert, value: String(j.seq) },
      j.kind !== 'animate' ? { type: WidgetType.Button, text: 'Asset', action: Action.JobAsset, value: String(j.seq) } : { type: WidgetType.Spacer },
    ]});
  } else if (j.status === 'processing') {
    kids.push({ type: WidgetType.Button, variant: 'primary', text: 'Resume', action: Action.JobResume, value: String(j.seq) });
  }
  return kids;
}

/** Re-poll a still-processing job and save its result when ready. */
export async function resumeJob(seq: number): Promise<void> {
  const job = findJob(seq);
  if (!job || job.status !== 'processing') return;
  try {
    const done = await poll(job.jobId, job.kind === 'animate' ? 'Animating' : 'Fetching');
    const lr = done.last_response || done;
    const images = lr.images || [];
    if (!images.length) throw new Error('No result in job.');
    const gens = (lr.billing_usage || {}).generations;

    if (job.kind === 'animate') {
      const frames: DecodedImage[] = [];
      for (const img of images) frames.push(await px.image.decode(img.base64));
      const fw = frames[0].width, fh = frames[0].height, n = frames.length;
      const strip = new Uint32Array(fw * n * fh);
      for (let i = 0; i < n; i++) {
        const f = frames[i];
        for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) strip[y * (fw * n) + i * fw + x] = f.pixels[y * fw + x];
      }
      const key = 'anim/resumed_' + nextSeq() + '.png';
      await px.files.put(key, {
        data: await px.image.encode(strip, fw * n, fh),
        mimeType: 'image/png',
        name: job.label || 'anim',
        meta: { response: { generations: gens, jobId: job.jobId, frames: n }, width: fw * n, height: fh, animation: true, frameW: fw, frameH: fh },
      });
      updateJob(seq, { status: 'completed', fileKey: key, generations: gens });
    } else {
      const key = 'gen/resumed_' + nextSeq() + '.png';
      await px.files.put(key, {
        data: images[0].base64,
        mimeType: 'image/png',
        name: job.label || 'sprite',
        meta: { response: { generations: gens, jobId: job.jobId } },
      });
      updateJob(seq, { status: 'completed', fileKey: key, generations: gens });
    }
  } catch (e) {
    updateJob(seq, { status: 'failed', error: ((e as Error)?.message || String(e)).slice(0, 140) });
    throw e;
  }
}

/** Open a completed job's result (image → insert/asset; animation → timeline). */
export async function openJob(seq: number, asAsset: boolean): Promise<string> {
  const job = findJob(seq);
  if (!job || !job.fileKey) throw new Error('No file for this job.');
  const f = await px.files.get(job.fileKey);
  const img = await px.image.decode(f.data);

  if (job.kind === 'animate') {
    const fw = (f.meta && (f.meta.frameW as number)) || job.width || img.height;
    const fh = (f.meta && (f.meta.frameH as number)) || img.height;
    const n = Math.max(1, Math.round(img.width / fw));
    if (px.editor.width() === fw && px.editor.height() === fh) {
      while (px.editor.frameCount() < n) px.editor.addFrame();
      for (let i = 0; i < n; i++) {
        const fr = new Uint32Array(fw * fh);
        for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) fr[y * fw + x] = img.pixels[y * img.width + i * fw + x];
        px.editor.setFrame(i);
        px.editor.commit(fr);
      }
      px.editor.setFrame(0);
      await saveQuietly();
      return 'Wrote ' + n + ' frames to the timeline (saved)';
    }
    const ref = await px.assets.create({ name: job.label || 'anim', type: 'character', width: img.width, height: img.height, pixels: img.pixels });
    px.assets.open(ref.id);
    return 'Opened strip as a new asset (canvas size differs)';
  }

  if (!asAsset && px.editor.width() === img.width && px.editor.height() === img.height) {
    px.editor.commit(img.pixels);
    await saveQuietly();
    return 'Inserted into canvas (saved)';
  }
  const ref = await px.assets.create({ name: job.label || 'sprite', type: 'character', width: img.width, height: img.height, pixels: img.pixels });
  px.assets.open(ref.id);
  return 'Opened as a new asset';
}

async function saveQuietly(): Promise<void> {
  try {
    await px.editor.save();
  } catch {
    /* best effort */
  }
}

// The Pixellab API client — the only place that talks to api.pixellab.ai.
// The API is asynchronous: you POST a request, get a background job id back,
// then poll until it completes. All network access goes through px.http (which
// is restricted to the hosts declared in plugin.yaml).

import { authHeader, getSettings } from './storage';

/** Submit a request to `path` and return the parsed response body. */
export async function submit(path: string, req: unknown): Promise<any> {
  const s = getSettings();
  const start = await px.http.post(s.baseUrl + path, req, { headers: authHeader() });
  if (!start.ok) throw new Error('API error ' + start.status + ': ' + start.body.slice(0, 200));
  return start.json();
}

/** Extract the background job id from a submit response. */
export function jobIdOf(body: any): string {
  const id = body.background_job_id || body.id;
  if (!id) throw new Error('No job id in response.');
  return id;
}

/**
 * Poll a background job until it finishes, reporting progress to the panel.
 * Returns the final job payload; throws on failure or timeout.
 */
export async function poll(jobId: string, label = 'Generating'): Promise<any> {
  const s = getSettings();
  px.ui.progress(null, 'Waiting…');
  for (let i = 0; i < 80; i++) {
    await px.sleep(3000);
    const r = await px.http.get(s.baseUrl + '/background-jobs/' + jobId, { headers: authHeader() });
    const d = r.json();
    const lr = d.last_response || {};
    const st = d.status || d.state || lr.status;
    // Progress (0..1) appears in last_response once generation starts; before
    // that there is nothing to show → "Waiting…" (+ queue position if given).
    let p = typeof lr.progress === 'number' ? lr.progress : typeof d.progress === 'number' ? d.progress : null;
    if (p != null) {
      if (p > 1) p = p / 100;
      px.ui.progress(p, label);
    } else {
      px.ui.progress(null, 'Waiting…' + (lr.queue_position ? ' (queue ' + lr.queue_position + ')' : ''));
    }
    if (st === 'completed' || st === 'succeeded' || st === 'success') {
      px.ui.progress(1, 'Done');
      return d;
    }
    if (st === 'failed' || st === 'error' || st === 'cancelled') {
      throw new Error('Generation failed: ' + JSON.stringify(d).slice(0, 200));
    }
  }
  throw new Error('Timed out waiting for the job');
}

/** Read the account balance as a short human string. */
export async function checkBalance(): Promise<string> {
  const s = getSettings();
  const r = await px.http.get(s.baseUrl + '/balance', { headers: authHeader() });
  const d = r.json();
  // /balance returns { credits: { type, usd }, subscription: {...} }.
  const usd = d?.credits?.usd != null ? d.credits.usd : d?.usd != null ? d.usd : null;
  const sub = d?.subscription ?? null;
  const subRem = sub ? sub.remaining ?? sub.generations ?? sub.credits ?? null : null;
  let out = usd != null ? '$' + usd + ' credits' : '—';
  if (subRem != null) out += ' · subscription: ' + subRem;
  return out;
}

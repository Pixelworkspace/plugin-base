// The job cache: every generation is recorded here so it survives a reload —
// you can see its status, resume it, re-open the result, or inspect details.
// Backed by px.storage under the 'jobs' key (a rolling list).

import { nextSeq } from './storage';
import type { JobRecord } from './types';

const MAX_JOBS = 40;

export function getJobs(): JobRecord[] {
  const j = px.storage.get('jobs');
  return Array.isArray(j) ? (j as JobRecord[]) : [];
}

function saveJobs(jobs: JobRecord[]): void {
  px.storage.set('jobs', jobs.slice(-MAX_JOBS)); // keep the most recent
}

/** Create a job record (status 'processing') and persist it. */
export function addJob(rec: Omit<JobRecord, 'seq' | 'status'> & Partial<Pick<JobRecord, 'status'>>): JobRecord {
  const jobs = getJobs();
  const job: JobRecord = { seq: nextSeq(), status: 'processing', ...rec };
  jobs.push(job);
  saveJobs(jobs);
  return job;
}

export function updateJob(seq: number, patch: Partial<JobRecord>): void {
  const jobs = getJobs();
  const j = jobs.find((x) => x.seq === seq);
  if (j) {
    Object.assign(j, patch);
    saveJobs(jobs);
  }
}

export function removeJob(seq: number): void {
  saveJobs(getJobs().filter((x) => x.seq !== seq));
}

export function findJob(seq: number): JobRecord | undefined {
  return getJobs().find((x) => x.seq === seq);
}

// --- thumbnails -------------------------------------------------------------
// render() is synchronous, so we can't fetch file data there. Instead we warm a
// cache (loadThumbs) whenever the Jobs tab opens, then read it synchronously.
const thumbs: Record<string, string> = {};

export function jobThumb(fileKey?: string): string | null {
  return fileKey ? thumbs[fileKey] ?? null : null;
}

export async function loadThumbs(): Promise<void> {
  const recent = getJobs().slice().reverse().slice(0, 16);
  for (const j of recent) {
    if (j.status === 'completed' && j.fileKey && !thumbs[j.fileKey]) {
      try {
        const f = await px.files.get(j.fileKey);
        thumbs[j.fileKey] = f.data;
      } catch {
        /* ignore — thumbnail is best-effort */
      }
    }
  }
}

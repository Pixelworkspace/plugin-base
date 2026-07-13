// Constants — the knobs of the plugin in one place.

export const BASE_DEFAULT = 'https://api.pixellab.ai/v2';

/** Panel tab order. Keep in sync with panel.ts. */
export const TABS = ['generate', 'animate', 'repaint', 'jobs', 'settings'] as const;
export const JOBS_TAB = TABS.indexOf('jobs');

/** Square sizes offered in the Generate tab. */
export const SIZES = [32, 64, 128, 256];

/** Frame counts supported by animate-with-text-v3. */
export const FRAME_COUNTS = [4, 8, 16];

// Expected cost in "generations" (Pixellab's billing unit).
/** generate-image-v2 is a flat 20 generations per call. */
export const generateCost = (): number => 20;
/** animate-with-text-v3 costs frame_count / 4. */
export const animateCost = (frameCount: number): number => Math.max(1, Math.round(frameCount / 4));

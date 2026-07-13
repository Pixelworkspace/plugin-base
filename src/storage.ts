// How storage is done: persistent, per-plugin, cloud-synced key-value via
// px.storage. Read fresh whenever you render so the UI reflects what's saved.

export function getClicks(): number {
  return px.storage.get('clicks') || 0;
}

export function addClick(): void {
  px.storage.set('clicks', getClicks() + 1);
}

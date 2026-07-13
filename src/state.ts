// Transient panel state — NOT persisted. It lives in the plugin's long-lived
// context (the sandbox keeps running between renders). Anything that must
// survive a reload goes into px.storage instead (see storage.ts / job-store.ts).

import { TABS } from './config';
import type { TransientUi } from './types';

export const ui: TransientUi = {
  // Land on Settings the first time (no API key yet) so the key field is right there.
  tab: px.storage.get('apiKey') ? 0 : TABS.indexOf('settings'),
  error: '',
  preview: null,
  balance: null,
  detailJob: null,
};

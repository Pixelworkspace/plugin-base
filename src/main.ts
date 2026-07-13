// Entry point: wire the plugin's contributions to their implementations.
//
// The ids used here (panel 'main', command 'pixellab.generate', menu) must match
// the `contributes` block in plugin.yaml — `npm run validate` checks that, and
// the host warns on drift.

import { renderPanel, handleEvent } from './panel';
import { generateImage, insertPreview } from './features/generate';
import { getSettings } from './storage';
import { ui } from './state';

px.registerPanel('main', 'Pixellab AI', renderPanel);
px.onPanelEvent('main', handleEvent);

px.registerCommand('pixellab.generate', 'Generate sprite → canvas', async () => {
  const s = getSettings();
  ui.preview = await generateImage(s.description, s.size, s.size);
  await insertPreview(false);
});
px.registerMenu('Pixellab/Generate sprite → canvas', 'pixellab.generate');

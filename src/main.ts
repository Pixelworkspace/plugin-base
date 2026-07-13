// Entry point: wire the plugin's contributions to their implementations.
//
// The ids here (panel 'main', command 'fill', menu) MUST match the
// `contributes` block in plugin.yaml — `npm run validate` checks that, and the
// host warns on drift.

import { renderPanel, handleEvent } from './panel';
import { fillCanvas } from './actions';

px.registerPanel('main', 'My Plugin', renderPanel);
px.onPanelEvent('main', handleEvent);
px.registerCommand('fill', 'Fill with current color', fillCanvas);
px.registerMenu('My Plugin/Fill with current color', 'fill');

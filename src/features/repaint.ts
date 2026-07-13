// Repaint: select a region on the canvas, describe it, and regenerate just that
// area (an inpaint-style flow built from getSelection + putRegion).

import { generateCost } from '../config';
import { getSettings } from '../storage';
import { generateImage } from './generate';
import { needsKeyBanner } from '../widgets';
import { WidgetType, Action } from '../types';

/** Regenerate the current selection at its own size and paste it back. */
export async function runRepaint(): Promise<string> {
  const sel = px.editor.getSelection();
  if (!sel) throw new Error('Select a region first.');
  px.editor.setMask([{ x: sel.x, y: sel.y }]); // brief highlight; cleared below
  try {
    const g = await generateImage(getSettings().repaintDesc, sel.w, sel.h, 'repaint');
    const img = await px.image.decode(g.base64);
    px.editor.putRegion(sel.x, sel.y, sel.w, sel.h, img.pixels);
    return 'Repainted selection';
  } finally {
    px.editor.clearMask();
  }
}

/** The Repaint tab UI. */
export function repaintTab(): Widget[] {
  const s = getSettings();
  const sel = px.editor.getSelection();
  const kids: Widget[] = [];
  if (!s.apiKey) kids.push(...needsKeyBanner());
  kids.push(
    { type: WidgetType.Text, text: 'Select a region with the selection tool, describe it, and Pixellab repaints just that area.' },
    { type: WidgetType.Label, muted: true, text: sel ? 'Selection: ' + sel.w + '×' + sel.h + ' @ ' + sel.x + ',' + sel.y : 'No selection yet.' },
    { type: WidgetType.TextArea, label: 'Repaint as', value: s.repaintDesc, rows: 2, action: Action.RepaintDesc, placeholder: 'glowing magic rune' },
    { type: WidgetType.Label, muted: true, text: 'Cost: ~' + generateCost() + ' generations' },
    { type: WidgetType.Button, variant: 'primary', text: 'Repaint selection', action: Action.Repaint }
  );
  return kids;
}

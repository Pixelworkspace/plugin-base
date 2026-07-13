// Shared UI snippets reused across tabs. Uses the WidgetType + Action enums so
// there are no magic strings.

import { WidgetType, Action } from './types';

/** A "set your API key first" banner shown at the top of a tab when unconfigured. */
export function needsKeyBanner(): Widget[] {
  return [
    { type: WidgetType.Label, text: '⚠ No API key set yet.' },
    { type: WidgetType.Button, variant: 'primary', text: 'Go to Settings →', action: Action.GotoSettings },
    { type: WidgetType.Separator },
  ];
}

/** Status glyph for a job. */
export function statusIcon(status: string): string {
  return status === 'completed' ? '✓' : status === 'failed' ? '✕' : '⏳';
}

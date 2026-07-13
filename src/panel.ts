// How UI is made: render() returns a tree of plain Widget objects, using the
// WidgetType + Action constants (see ../types) instead of magic strings. Panels
// are immediate-mode — after an interaction you update state and re-render.
// handleEvent() maps a widget's `action` to code.

import { getClicks, addClick } from './storage';
import { fillCanvas } from './actions';
import { WidgetType, Action } from './types';

export function renderPanel(): Widget {
  return {
    type: WidgetType.VStack,
    gap: 8,
    children: [
      { type: WidgetType.Heading, text: 'My Plugin' },
      { type: WidgetType.Text, text: 'Clicks: ' + getClicks() },
      { type: WidgetType.Button, text: 'Click me', action: Action.Inc },
      { type: WidgetType.Separator },
      { type: WidgetType.ColorBar, value: px.editor.color() },
      { type: WidgetType.Button, variant: 'primary', text: 'Fill canvas with current color', action: Action.Fill },
    ],
  };
}

export function handleEvent(action: string): void {
  if (action === Action.Inc) addClick();
  else if (action === Action.Fill) fillCanvas();
}

// Settings: the API key (kept in px.storage), the base URL, and a balance check.

import { getSettings } from '../storage';
import { ui } from '../state';
import { WidgetType, Action } from '../types';

export function settingsTab(): Widget[] {
  const s = getSettings();
  return [
    { type: WidgetType.Input, label: 'API key', inputType: 'password', value: s.apiKey, action: Action.ApiKey, placeholder: 'paste your Pixellab token' },
    { type: WidgetType.Input, label: 'Base URL', value: s.baseUrl, action: Action.BaseUrl },
    {
      type: WidgetType.HStack,
      gap: 6,
      children: [
        { type: WidgetType.Button, text: 'Check balance', action: Action.Balance },
        { type: WidgetType.Label, muted: true, text: ui.balance != null ? 'Balance: ' + ui.balance : '' },
      ],
    },
    { type: WidgetType.Text, text: 'Generations are billed by Pixellab. Larger sizes return multiple tiles; this plugin uses the first.' },
  ];
}

// Panel action names as named constants (CamelCase). A `const … as const` object
// (see widget-type.ts for why not an enum). Used in BOTH the widgets
// (action: Action.Fill) and the event handler (action === Action.Fill), so the
// two can't drift. Compiled into the bundle.

export const Action = {
  Inc: 'inc',
  Fill: 'fill',
} as const;

/** Union of the action string values. */
export type ActionValue = (typeof Action)[keyof typeof Action];

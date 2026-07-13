// Widget kinds as named constants (CamelCase). A `const … as const` object, not
// an `enum`, on purpose: its members are literal-typed (WidgetType.VStack has
// type 'vstack'), so they're assignable to the WidgetKind union in
// pixelworkspace.d.ts — you can write `type: WidgetType.VStack` OR the raw
// string 'vstack' and both are type-checked. It's compiled into the bundle, so
// WidgetType.VStack resolves to 'vstack' at runtime.
//
// Part of the plugin scaffold — identical across plugins.

export const WidgetType = {
  VStack: 'vstack',
  HStack: 'hstack',
  Label: 'label',
  Text: 'text',
  Heading: 'heading',
  Button: 'button',
  Slider: 'slider',
  Input: 'input',
  Checkbox: 'checkbox',
  Select: 'select',
  Color: 'color',
  ColorBar: 'colorbar',
  Swatches: 'swatches',
  Image: 'image',
  TextArea: 'textarea',
  Progress: 'progress',
  Tabs: 'tabs',
  Separator: 'separator',
  Spacer: 'spacer',
} as const;

/** Union of the widget-kind string values. */
export type WidgetTypeValue = (typeof WidgetType)[keyof typeof WidgetType];

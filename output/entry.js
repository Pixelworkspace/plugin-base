"use strict";
(() => {
  // src/storage.ts
  function getClicks() {
    return px.storage.get("clicks") || 0;
  }
  function addClick() {
    px.storage.set("clicks", getClicks() + 1);
  }

  // src/actions.ts
  function fillCanvas() {
    const buf = px.editor.pixels();
    const color = px.editor.color();
    for (let i = 0; i < buf.length; i++) buf[i] = color;
    px.editor.commit(buf);
    px.log("Filled " + px.editor.width() + "\xD7" + px.editor.height());
  }

  // src/types/widget-type.ts
  var WidgetType = {
    VStack: "vstack",
    HStack: "hstack",
    Label: "label",
    Text: "text",
    Heading: "heading",
    Button: "button",
    Slider: "slider",
    Input: "input",
    Checkbox: "checkbox",
    Select: "select",
    Color: "color",
    ColorBar: "colorbar",
    Swatches: "swatches",
    Image: "image",
    TextArea: "textarea",
    Progress: "progress",
    Tabs: "tabs",
    Separator: "separator",
    Spacer: "spacer"
  };

  // src/types/action.ts
  var Action = {
    Inc: "inc",
    Fill: "fill"
  };

  // src/panel.ts
  function renderPanel() {
    return {
      type: WidgetType.VStack,
      gap: 8,
      children: [
        { type: WidgetType.Heading, text: "My Plugin" },
        { type: WidgetType.Text, text: "Clicks: " + getClicks() },
        { type: WidgetType.Button, text: "Click me", action: Action.Inc },
        { type: WidgetType.Separator },
        { type: WidgetType.ColorBar, value: px.editor.color() },
        { type: WidgetType.Button, variant: "primary", text: "Fill canvas with current color", action: Action.Fill }
      ]
    };
  }
  function handleEvent(action) {
    if (action === Action.Inc) addClick();
    else if (action === Action.Fill) fillCanvas();
  }

  // src/main.ts
  px.registerPanel("main", "My Plugin", renderPanel);
  px.onPanelEvent("main", handleEvent);
  px.registerCommand("fill", "Fill with current color", fillCanvas);
  px.registerMenu("My Plugin/Fill with current color", "fill");
})();

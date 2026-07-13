# `px` API reference

Everything a plugin can do goes through the global **`px`**. All types below are
declared in [`../types/pixelworkspace.d.ts`](../types/pixelworkspace.d.ts) for
editor autocomplete.

Conventions:

- **Color** — a packed RGBA `uint32` (little-endian, byte order R, G, B, A).
  Build with `px.rgba(r, g, b, a?)`; split with `px.unpack(color)`.
- **async** — methods marked async return a `Promise`; `await` them (top-level
  `await` is available in the entry script and in command/panel handlers).

---

## Registration

### `px.registerCommand(id, title, run)`

Registers a runnable command. `run` may be sync or async. Commands show up in the
command palette and the editor's Plugins menu.

```js
px.registerCommand('invert', 'Invert colors', function () {
  const buf = px.editor.pixels();
  for (let i = 0; i < buf.length; i++) {
    const c = px.unpack(buf[i]);
    if (c.a) buf[i] = px.rgba(255 - c.r, 255 - c.g, 255 - c.b, c.a);
  }
  px.editor.commit(buf);
});
```

### `px.registerMenu(path, commandId)`

Adds a menu entry pointing at a command. `path` groups it, e.g.
`'My Plugin/Invert colors'` — the first segment becomes the menu, the rest the
label.

### `px.registerPanel(id, title, render)`

Registers a dockable panel. `render` returns a [Widget](#widgets) tree and is
re-invoked whenever the document or your state changes (immediate-mode).

### `px.onPanelEvent(panelId, handler)`

`handler(action, value)` receives the `action` of the widget the user
interacted with, plus its `value` (already parsed). May be async.

### `px.registerTool(id, title, options)`

Registers a canvas tool. `options.icon` is a character/emoji; the pointer
callbacks receive pixel coordinates and mouse button:

```js
px.registerTool('spray', 'Spray', {
  icon: '✷',
  onPointerDown: paint,
  onPointerMove: paint,
});
function paint(x, y /*, button */) {
  px.tool.plot(x, y, px.editor.color()); // valid only inside a tool handler
}
```

`px.tool.*` (`plot`, `read`, `sample`, `setColor`) is valid **only** during a
tool pointer callback; the whole stroke folds into one undo step.

### `px.on(event, handler)`

Subscribe to editor events. `handler(payload)` gets a parsed payload. Common
event: `'documentChange'`.

---

## `px.editor`

The active document. Pixel edits go through `pixels()` → mutate → `commit()`,
which is one undo step.

| Method                                   | Returns        | Notes                                    |
| ---------------------------------------- | -------------- | ---------------------------------------- |
| `width()` / `height()`                   | `number`       | Canvas size.                             |
| `color()`                                | `Color`        | Current drawing color.                   |
| `setColor(color)`                        | —              | Set the current color.                   |
| `getPalette()` / `setPalette(arr)`       | `Color[]` / —  | The document palette.                    |
| `getSelection()`                         | `{x,y,w,h}\|null` | Current rectangular selection.        |
| `pixels()`                               | `Uint32Array`  | Copy of the active cel.                  |
| `commit(pixels)`                         | —              | Write pixels back (one undo step).       |
| `getPixel(x, y)`                         | `Color`        | 0 outside bounds.                        |
| `getRegion(x, y, w, h)`                  | `Uint32Array`  | Crop a sub-rect.                         |
| `putRegion(x, y, w, h, pixels)`          | —              | Paste a sub-rect (one undo step).        |
| `setMask(cells)` / `clearMask()`         | —              | Non-destructive highlight (inpaint mask).|
| `frameCount()` / `setFrame(i)` / `addFrame()` | —         | Timeline.                                |
| `layerCount()` / `addLayer()`            | —              | Layers.                                  |
| `save()` **async**                       | `Promise`      | Persist the document to the server.      |

---

## `px.http` — async, allowlisted

Only hosts listed in `plugin.json` `"hosts"` are reachable.

```js
const res = await px.http.post('https://api.example.com/v1/thing', { prompt: 'x' }, {
  headers: { Authorization: 'Bearer ' + px.storage.get('token') },
});
if (res.ok) {
  const data = res.json();
}
```

- `get(url, options?)` / `post(url, body, options?)` / `request(url, options?)`
- Response: `{ status, ok, headers, body, json() }`. `post` JSON-encodes object
  bodies and sets `Content-Type`.
- `px.sleep(ms)` **async** — delay (≤ 60s), for polling loops.

---

## `px.image` — async

- `decode(base64)` → `{ width, height, pixels: Uint32Array }`
- `encode(pixels, width, height)` → PNG data-URL

---

## `px.files` — async

Per-plugin file store for artifacts + metadata (e.g. save a generation together
with its request/response).

- `list()` → `PluginFileMeta[]` (no payloads)
- `get(key)` → `PluginFileFull` (incl. `data`)
- `put(key, { data, name, mimeType, meta })` → `PluginFileMeta`
- `delete(key)`

---

## `px.assets` — mixed

- `current()` → `{ projectId, assetId, name, type, width, height } | null` (sync)
- `create({ name, type?, width, height, pixels })` → new asset (**async**)
- `open(assetId)` → navigate the editor to an asset (sync)

---

## `px.storage`

Persistent, per-plugin, cloud-synced key-value store.

- `get(key)` · `set(key, value)` · `delete(key)` · `keys()`

---

## `px.ui` & logging

- `px.ui.progress(fraction | null, label?)` — panel progress bar (`null` =
  indeterminate). Safe to call between `await`s during long work.
- `px.log(message)` — print to the plugin log.

---

## Color helpers

- `px.rgba(r, g, b, a = 255)` → `Color`
- `px.unpack(color)` → `{ r, g, b, a }`

---

## Widgets

A panel's `render()` returns a tree of widget objects `{ type, ... }`. Container
widgets have `children`. Interactive widgets carry an `action` that is delivered
to `onPanelEvent`.

| `type`                          | Key props                                             |
| ------------------------------- | ----------------------------------------------------- |
| `vstack` / `hstack`             | `children`                                            |
| `heading` / `text` / `label`    | `text`                                                |
| `button`                        | `text`, `action`                                      |
| `input` / `textarea`            | `value`, `placeholder`, `inputType`, `rows`, `action` |
| `slider`                        | `value`, `min`, `max`, `step`, `action`               |
| `checkbox`                      | `value` (bool), `text`, `action`                      |
| `select`                        | `options: [{label,value}]`, `value`, `action`         |
| `color` / `colorbar`            | `value` (Color), `action`                             |
| `swatches`                      | `colors: Color[]`, `action` (fires with the color)    |
| `image`                         | `pixels`+`width`+`height`, or `src` (data-URL); `smooth` |
| `progress`                      | `value` (0..1 or `'indeterminate'`)                   |
| `tabs`                          | `tabs: [{label, children}]`, `active` (index), `action` |
| `separator` / `spacer`          | —                                                     |

Panels are stateless from the host's view: you drive values (a slider position,
the active tab, an input's text) from your own `px.storage` and re-render.

```js
function render() {
  return {
    type: 'vstack',
    children: [
      { type: 'heading', text: 'Generate' },
      { type: 'textarea', value: px.storage.get('prompt') || '', placeholder: 'a knight', action: 'prompt', rows: 3 },
      { type: 'button', text: 'Go', action: 'go' },
      px.storage.get('busy') ? { type: 'progress', value: 'indeterminate' } : { type: 'spacer' },
    ],
  };
}
```

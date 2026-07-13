// Ambient type definitions for pixelworkspace plugin entry scripts.
//
// This file exists purely so classic editors (VS Code, WebStorm, …) offer
// autocomplete + docs for the global `px` API while you write your plugin. It is
// NOT bundled with your plugin — only your entry file (see plugin.json "entry")
// runs, inside a sandbox whose single host bridge is `px`.
//
// Keep it referenced from your entry file:  /// <reference path="./types/pixelworkspace.d.ts" />
// (a jsconfig.json that includes this file works too).

/** A packed RGBA color as a little-endian uint32 (byte order R,G,B,A). Build with px.rgba(). */
type Color = number;

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** A rectangular selection in pixel coordinates. */
interface Selection {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface HttpOptions {
  method?: string;
  headers?: Record<string, string>;
  /** Object bodies are JSON-encoded automatically by http.post. */
  body?: string | object | null;
}

interface HttpResponse {
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  /** Raw response text. */
  body: string;
  /** Parses `body` as JSON. */
  json(): any;
}

interface DecodedImage {
  width: number;
  height: number;
  pixels: Uint32Array;
}

interface PluginFileMeta {
  id: string;
  key: string;
  name: string;
  mimeType: string;
  size: number;
  meta: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface PluginFileFull extends PluginFileMeta {
  /** The stored payload (typically base64 or a data-URL). */
  data: string;
}

interface PluginFilePut {
  /** The payload to store (base64 / data-URL / text). */
  data?: string;
  name?: string;
  mimeType?: string;
  /** Arbitrary metadata stored alongside the file (e.g. the request/response). */
  meta?: Record<string, any>;
}

interface AssetContext {
  projectId: string;
  assetId: string;
  name: string;
  type: string;
  width: number;
  height: number;
}

interface CreateAssetInput {
  name: string;
  /** Asset type key (e.g. 'sprite', 'character', 'tileset'). Defaults server-side. */
  type?: string;
  width: number;
  height: number;
  pixels: Uint32Array;
}

interface CreatedAsset {
  id: string;
  name: string;
  type: string;
  projectId: string;
  documentId: string;
}

interface MaskCell {
  x: number;
  y: number;
}

/** Widget kinds understood by the panel renderer. */
type WidgetKind =
  | 'vstack'
  | 'hstack'
  | 'label'
  | 'text'
  | 'heading'
  | 'button'
  | 'slider'
  | 'input'
  | 'checkbox'
  | 'select'
  | 'color'
  | 'colorbar'
  | 'swatches'
  | 'image'
  | 'textarea'
  | 'progress'
  | 'tabs'
  | 'separator'
  | 'spacer';

/**
 * A declarative UI node returned by a panel's render function. Panels are
 * immediate-mode: your render() returns a fresh tree; interactions call back
 * into onPanelEvent, you update your storage/state, and the panel re-renders.
 */
interface Widget {
  /**
   * The widget kind. Either a raw string (checked against WidgetKind) or the
   * named `WidgetType` constant from src/types, e.g. `type: WidgetType.VStack` —
   * both are validated. Unknown kinds simply don't render.
   */
  type: WidgetKind;
  /** Children for vstack / hstack. */
  children?: Widget[];
  /** Text for label / text / heading / button. */
  text?: string;
  /** Action name delivered to onPanelEvent when this widget is used. */
  action?: string;
  /** Current value (slider / input / checkbox / select / color). */
  value?: any;
  placeholder?: string;
  /** input kind: 'text' | 'password' | 'number'. */
  inputType?: string;
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  /** Options for select. */
  options?: Array<{ label: string; value: any } | string>;
  /** Colors for swatches / palette. */
  colors?: Color[];
  /** image: packed pixels + size … */
  pixels?: Uint32Array;
  width?: number;
  height?: number;
  /** … or an image data-URL. */
  src?: string;
  /** image: nearest-neighbour by default; set true for smooth scaling. */
  smooth?: boolean;
  /** tabs: [{ label, children }] with `active` index. */
  tabs?: Array<{ label: string; children?: Widget[] }>;
  active?: number;
  /** progress: a number 0..1, or 'indeterminate'. */
  [key: string]: any;
}

interface ToolOptions {
  /** A single character / emoji shown as the tool icon. */
  icon?: string;
  onPointerDown?(x: number, y: number, button: number): void;
  onPointerMove?(x: number, y: number, button: number): void;
  onPointerUp?(x: number, y: number, button: number): void;
}

/** The active document. Pixel edits via pixels()/commit() fold into one undo step. */
interface EditorApi {
  width(): number;
  height(): number;
  /** The current drawing color. */
  color(): Color;
  setColor(color: Color): void;
  getPalette(): Color[];
  setPalette(palette: Color[]): void;
  getSelection(): Selection | null;
  /** A copy of the active cel's pixels. */
  pixels(): Uint32Array;
  /** Write a pixel buffer back to the active cel (one undo step). */
  commit(pixels: Uint32Array): void;
  getPixel(x: number, y: number): Color;
  getRegion(x: number, y: number, w: number, h: number): Uint32Array;
  putRegion(x: number, y: number, w: number, h: number, pixels: Uint32Array): void;
  /** Non-destructive highlight overlay (e.g. an inpaint mask). */
  setMask(cells: MaskCell[]): void;
  clearMask(): void;
  frameCount(): number;
  setFrame(index: number): void;
  addFrame(): void;
  layerCount(): number;
  addLayer(): void;
  /** Persist the active document to the server. */
  save(): Promise<void>;
}

/** Stroke primitives — valid ONLY inside a plugin tool's pointer handler. */
interface ToolApi {
  plot(x: number, y: number, color: Color): void;
  read(x: number, y: number): Color;
  sample(x: number, y: number): Color;
  setColor(color: Color): void;
}

/** Persistent per-plugin key-value store (cloud-synced). */
interface StorageApi {
  get(key: string): any;
  set(key: string, value: any): void;
  delete(key: string): void;
  keys(): string[];
}

/** HTTP client. Only hosts declared in plugin.json "hosts" are reachable. */
interface HttpApi {
  request(url: string, options?: HttpOptions): Promise<HttpResponse>;
  get(url: string, options?: HttpOptions): Promise<HttpResponse>;
  /** JSON POST — object bodies are stringified and Content-Type set. */
  post(url: string, body: any, options?: HttpOptions): Promise<HttpResponse>;
}

interface ImageApi {
  /** Decode a base64 (or data-URL) PNG into packed pixels. */
  decode(base64: string): Promise<DecodedImage>;
  /** Encode packed pixels as a PNG data-URL. */
  encode(pixels: Uint32Array, width: number, height: number): Promise<string>;
}

/** Per-plugin file store for artifacts + metadata. */
interface FilesApi {
  list(): Promise<PluginFileMeta[]>;
  get(key: string): Promise<PluginFileFull>;
  put(key: string, file?: PluginFilePut): Promise<PluginFileMeta>;
  delete(key: string): Promise<void>;
}

interface AssetsApi {
  /** The asset currently open in the editor, or null. */
  current(): AssetContext | null;
  /** Create a new editable asset from pixels in the current project. */
  create(input: CreateAssetInput): Promise<CreatedAsset>;
  /** Navigate the editor to an asset. */
  open(assetId: string): void;
}

interface UiApi {
  /** Show a progress bar on the plugin panel. `null` = indeterminate. */
  progress(fraction: number | null, label?: string): void;
}

/**
 * The one global your plugin gets. Register commands/menus/panels/tools/events,
 * and reach the editor, network, files and assets through the sub-APIs.
 */
interface Px {
  /** Register a runnable command (appears in the command palette / Plugins menu). */
  registerCommand(id: string, title: string, run: () => void | Promise<void>): void;
  /** Add a menu entry pointing at a command. Path like 'My Plugin/Do the thing'. */
  registerMenu(path: string, commandId: string): void;
  /** Register a dockable panel; `render` returns a Widget tree (re-called on change). */
  registerPanel(id: string, title: string, render: () => Widget): void;
  /** Handle interactions from a panel's widgets. */
  onPanelEvent(panelId: string, handler: (action: string, value: any) => void | Promise<void>): void;
  /** Register a tool that receives raw pointer events (use px.tool.* inside). */
  registerTool(id: string, title: string, options: ToolOptions): void;
  /** Subscribe to an editor event, e.g. 'documentChange'. */
  on(event: string, handler: (payload: any) => void): void;
  /** Print to the plugin log. */
  log(message: string): void;
  /** Await a delay (for polling loops). Capped at 60s. */
  sleep(ms: number): Promise<void>;
  /** Pack a color. Alpha defaults to 255. */
  rgba(r: number, g: number, b: number, a?: number): Color;
  /** Unpack a color into channels. */
  unpack(color: Color): Rgba;

  editor: EditorApi;
  tool: ToolApi;
  storage: StorageApi;
  http: HttpApi;
  image: ImageApi;
  files: FilesApi;
  assets: AssetsApi;
  ui: UiApi;
}

/** The global plugin API. */
declare const px: Px;

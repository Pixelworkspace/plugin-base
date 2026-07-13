// A command implementation: fill the active cel with the current color. Pixel
// edits go through pixels() → mutate → commit(), which is one undo step.

export function fillCanvas(): void {
  const buf = px.editor.pixels();
  const color = px.editor.color();
  for (let i = 0; i < buf.length; i++) buf[i] = color;
  px.editor.commit(buf);
  px.log('Filled ' + px.editor.width() + '×' + px.editor.height());
}

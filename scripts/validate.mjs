#!/usr/bin/env node
// Manifest validator for a pixelworkspace plugin.
//
//   1. Structure — plugin.yaml has the required fields and a well-formed
//      `contributes` block (unique ids; menus reference declared commands).
//   2. Two-track consistency — every id declared in `contributes` is registered
//      in the code, and every px.register* call in the code is declared. The
//      manifest and the code must agree (that's the whole point of declaring).
//
// Exits non-zero on any error. Run: `node scripts/validate.mjs`.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

// --- load manifest ----------------------------------------------------------
let manifest;
try {
  manifest = yaml.load(readFileSync(join(root, 'plugin.yaml'), 'utf8'));
} catch (e) {
  console.error('✗ Could not read/parse plugin.yaml: ' + e.message);
  process.exit(1);
}
if (!manifest || typeof manifest !== 'object') {
  console.error('✗ plugin.yaml is empty or not a mapping.');
  process.exit(1);
}

// --- structure --------------------------------------------------------------
const str = (v) => typeof v === 'string' && v.trim().length > 0;
if (!str(manifest.name)) err('`name` is required (non-empty string).');
if (!str(manifest.version)) err('`version` is required (non-empty string).');
if (!str(manifest.entry)) err('`entry` is required (path to the built entry file).');
if (manifest.hosts != null && !(Array.isArray(manifest.hosts) && manifest.hosts.every(str)))
  err('`hosts` must be an array of hostname strings.');

const contributes = manifest.contributes || {};
const declared = { commands: new Set(), panels: new Set(), tools: new Set() };

function checkList(kind, list, extra = () => {}) {
  if (list == null) return;
  if (!Array.isArray(list)) return err(`contributes.${kind} must be a list.`);
  for (const [i, item] of list.entries()) {
    if (!item || typeof item !== 'object') { err(`contributes.${kind}[${i}] must be a mapping.`); continue; }
    if (!str(item.id)) { err(`contributes.${kind}[${i}] needs a string \`id\`.`); continue; }
    if (!str(item.title)) err(`contributes.${kind}[${i}] (${item.id}) needs a \`title\`.`);
    if (declared[kind].has(item.id)) err(`Duplicate ${kind} id: ${item.id}`);
    declared[kind].add(item.id);
    extra(item, i);
  }
}
checkList('commands', contributes.commands);
checkList('panels', contributes.panels);
checkList('tools', contributes.tools);

// menus reference a declared command
if (contributes.menus != null) {
  if (!Array.isArray(contributes.menus)) err('contributes.menus must be a list.');
  else
    for (const [i, m] of contributes.menus.entries()) {
      if (!m || typeof m !== 'object') { err(`contributes.menus[${i}] must be a mapping.`); continue; }
      if (!str(m.path)) err(`contributes.menus[${i}] needs a \`path\`.`);
      if (!str(m.command)) err(`contributes.menus[${i}] needs a \`command\`.`);
      else if (!declared.commands.has(m.command)) err(`contributes.menus[${i}] references undeclared command: ${m.command}`);
    }
}

// --- scan the source for px.register* calls ---------------------------------
const registered = { commands: new Set(), panels: new Set(), tools: new Set() };
const srcDir = join(root, 'src');
const RE = /px\.register(Command|Panel|Tool)\s*\(\s*['"]([^'"]+)['"]/g;
const kindOf = { Command: 'commands', Panel: 'panels', Tool: 'tools' };

function scan(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) scan(p);
    else if (/\.(ts|js|mjs)$/.test(name)) {
      const code = readFileSync(p, 'utf8');
      let m;
      while ((m = RE.exec(code))) registered[kindOf[m[1]]].add(m[2]);
    }
  }
}
try {
  scan(srcDir);
} catch {
  warn('No src/ directory found — skipping the code cross-check.');
}

// --- two-track cross-check --------------------------------------------------
for (const kind of ['commands', 'panels', 'tools']) {
  for (const id of declared[kind]) if (!registered[kind].has(id)) err(`${kind}: "${id}" declared in plugin.yaml but never px.register…('${id}') in the code.`);
  for (const id of registered[kind]) if (!declared[kind].has(id)) err(`${kind}: "${id}" is registered in the code but not declared in plugin.yaml.`);
}

// --- report -----------------------------------------------------------------
for (const w of warnings) console.warn('⚠ ' + w);
if (errors.length) {
  for (const e of errors) console.error('✗ ' + e);
  console.error(`\n${errors.length} error(s). Manifest and code are out of sync.`);
  process.exit(1);
}
console.log(
  `✓ plugin.yaml OK — ${declared.commands.size} command(s), ${declared.panels.size} panel(s), ${declared.tools.size} tool(s); manifest ↔ code consistent.`
);

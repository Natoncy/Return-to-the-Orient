// Unlock editor: overview + drag-and-drop editing of what the Orient triggers unlock/unhide and the pools behind them.
// node .misc_data/tools/unlock_editor/server.js   then open http://localhost:8767
// Reads the main mod's asset XMLs (editable), every other mod folder in the repo and the vanilla tree on D: (names,
// read-only pools). Saving rewrites only the edited lists/values in place, keeping line endings, BOM and comments.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');

const TOOL = __dirname;
const argRepo = process.argv.indexOf('--repo');
const REPO = path.resolve(argRepo > 0 ? process.argv[argRepo + 1] : process.env.UNLOCK_REPO || path.join(TOOL, '../../..'));
const MAIN_ASSETS = path.join(REPO, 'data/config/export/main/asset');
const VANILLA_ASSETS = 'D:/anno_data/1800/data/config/export/main/asset/assets.xml';
const VANILLA_TEXTS = 'D:/anno_data/1800/data/config/gui/texts_english.xml';
const CACHE = path.join(TOOL, 'cache');
const argPort = process.argv.indexOf('--port');
const PORT = +(argPort > 0 ? process.argv[argPort + 1] : process.env.PORT) || 8767;

// ---------- minimal offset-tracking XML parser ----------
function parseXml(src, file) {
  const root = { type: 'el', name: '#root', children: [], start: 0, end: src.length, innerStart: 0, innerEnd: src.length };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<(\/?)([A-Za-z_][\w.\-:]*)((?:\s+[^\s=\/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;
  let m;
  while ((m = re.exec(src))) {
    const top = stack[stack.length - 1];
    if (m[0].startsWith('<!--')) { top.children.push({ type: 'comment', start: m.index, end: re.lastIndex, parent: top }); continue; }
    if (!m[2]) continue;
    if (m[1]) {
      if (top.name !== m[2]) throw new Error(`${file}:${lineOf(src, m.index)} </${m[2]}> closes <${top.name}>`);
      top.innerEnd = m.index; top.end = re.lastIndex; stack.pop(); continue;
    }
    const attrs = {};
    m[3].replace(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g, (_, k, a, b) => { attrs[k] = a ?? b; });
    const node = { type: 'el', name: m[2], attrs, start: m.index, children: [], parent: top };
    top.children.push(node);
    if (m[4]) { node.selfClosing = true; node.end = node.innerStart = node.innerEnd = re.lastIndex; }
    else { node.innerStart = re.lastIndex; stack.push(node); }
  }
  if (stack.length > 1) throw new Error(`${file}: <${stack[stack.length - 1].name}> never closed`);
  root.src = src;
  return root;
}
const lineOf = (src, i) => src.slice(0, i).split('\n').length;
const kids = (n, name) => (n ? n.children.filter(c => c.type === 'el' && (!name || c.name === name)) : []);
const kid = (n, name) => kids(n, name)[0];
const at = (n, ...names) => names.reduce((x, k) => kid(x, k), n);
function* walk(n) { for (const c of n.children) if (c.type === 'el') { yield c; yield* walk(c); } }
const textOf = (src, n) => (n && !n.selfClosing && !kids(n).length ? src.slice(n.innerStart, n.innerEnd).trim() : '');
function indentAt(src, i) { const ls = src.lastIndexOf('\n', i - 1) + 1; return /^[ \t]*/.exec(src.slice(ls, i))[0]; }

// ---------- mod scan ----------
function listXml(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listXml(p)); else if (/\.xml$/i.test(e.name)) out.push(p);
  }
  return out;
}
const isAssetDef = n => n.name === 'Asset' && kids(n).some(c => c.name === 'Template' || c.name === 'Values' || c.name === 'BaseAssetGUID');
const rel = p => path.relative(REPO, p).split(path.sep).join('/');
const hash = s => crypto.createHash('sha1').update(s).digest('hex');

function readText(file) {
  const buf = fs.readFileSync(file);
  const bom = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
  return { src: buf.toString('utf8', bom ? 3 : 0), bom, raw: buf };
}

// pick up the indentation unit a file uses
function fileUnit(src) {
  const tabs = (src.match(/\n\t/g) || []).length, sp = (src.match(/\n {2}/g) || []).length;
  if (tabs > sp) return '\t';
  const counts = {};
  for (const m of src.matchAll(/\n( +)</g)) counts[m[1].length] = (counts[m[1].length] || 0) + 1;
  const lens = Object.keys(counts).map(Number).filter(Boolean);
  const g = lens.reduce((a, b) => { while (b) [a, b] = [b, a % b]; return a; }, 0);
  return ' '.repeat(g === 2 ? 2 : 4);
}

// an editable list (UnlockAssets / UnhideAssets / AssetList) that may be missing or self-closing
function listInfo(ctx, node, parent, tag, kind, insertAfter) {
  const { src, file } = ctx;
  const id = `${file}@${node ? node.start : 'p' + parent.start}:${tag}`;
  const L = { id, file, kind, tag, items: [], trailing: [] };
  const unit = ctx.unit;
  if (node) {
    L.exists = true; L.start = node.start; L.end = node.end; L.selfClosing = !!node.selfClosing;
    L.innerStart = node.innerStart; L.innerEnd = node.innerEnd; L.indent = indentAt(src, node.start);
    let pending = [];
    for (const c of node.children) {
      if (c.type === 'comment') { pending.push(src.slice(c.start, c.end)); continue; }
      if (c.name !== 'Item') continue;
      const assetNode = kid(c, 'Asset');
      const g = textOf(src, assetNode);
      const onlyAsset = kids(c).length === 1 && assetNode && !c.children.some(x => x.type === 'comment');
      const it = { guid: g, comments: pending };
      if (!onlyAsset) it.raw = { text: src.slice(c.start, c.end), indent: indentAt(src, c.start) };
      L.items.push(it); pending = [];
      if (!L.itemStyle) L.itemStyle = /\n/.test(src.slice(c.start, c.end)) ? 'multi' : 'single';
      if (!L.itemIndent) L.itemIndent = indentAt(src, c.start);
    }
    L.trailing = pending;
  } else {
    L.exists = false;
    if (parent.selfClosing) L.readonly = true;
    L.indent = indentAt(src, kids(parent)[0] ? kids(parent)[0].start : parent.start) || indentAt(src, parent.start) + unit;
    L.insertAt = insertAfter ? insertAfter.end : parent.innerStart;
  }
  L.itemIndent = L.itemIndent || L.indent + unit;
  L.unit = L.itemIndent.length > L.indent.length ? L.itemIndent.slice(L.indent.length) : unit;
  L.itemStyle = L.itemStyle || 'multi';
  L.orig = L.items.map(i => i.guid);
  ctx.lists[id] = L;
  return L;
}

function fieldInfo(ctx, node, key) {
  const id = `${ctx.file}@${node.start}:${node.name}`;
  const F = { id, file: ctx.file, key: key || node.name, value: textOf(ctx.src, node), innerStart: node.innerStart, innerEnd: node.innerEnd, selfClosing: !!node.selfClosing, start: node.start, end: node.end, tag: node.name };
  ctx.fields[id] = F;
  return F;
}

// condition → {template, negated, fields:[F]}
function describeCondition(ctx, condNode) {
  if (!condNode) return null;
  const tpl = textOf(ctx.src, kid(condNode, 'Template'));
  const values = kid(condNode, 'Values');
  const auto = textOf(ctx.src, kid(condNode, 'IsBaseAutoCreateAsset')) === '1';
  const C = { template: tpl || (auto ? '(template default)' : '?'), negated: false, fields: [] };
  const neg = at(values, 'ConditionPropsNegatable', 'NegateCondition');
  if (neg) C.negField = fieldInfo(ctx, neg, 'NegateCondition'), C.negated = C.negField.value === '1';
  for (const block of kids(values)) {
    if (block.name === 'Condition' || block.name === 'ConditionPropsNegatable') {
      for (const n of walk(block)) if (!kids(n).length && n.name !== 'NegateCondition') C.fields.push(fieldInfo(ctx, n));
      continue;
    }
    for (const n of walk(block)) if (!kids(n).length && !n.selfClosing) C.fields.push(fieldInfo(ctx, n));
  }
  return C;
}

function scanMainFile(abs, model) {
  const { src, bom } = readText(abs);
  const file = rel(abs);
  const ctx = { src, file, unit: fileUnit(src), lists: model.lists, fields: model.fields };
  let tree;
  try { tree = parseXml(src, file); } catch (e) { model.errors.push(e.message); return; }
  model.files[file] = { hash: hash(src), bom, crlf: /\r\n/.test(src) };
  for (const n of walk(tree)) {
    if (!isAssetDef(n)) continue;
    const std = at(n, 'Values', 'Standard');
    const guid = textOf(src, kid(std, 'GUID'));
    if (!guid) continue;
    const tpl = textOf(src, kid(n, 'Template')) || (kid(n, 'BaseAssetGUID') ? 'clone of ' + textOf(src, kid(n, 'BaseAssetGUID')) : '');
    let modop = n.parent; while (modop && modop.name !== 'ModOp') modop = modop.parent;
    model.assets[guid] = { guid, name: textOf(src, kid(std, 'Name')), template: tpl, file, line: lineOf(src, n.start), mod: 'main' };
    if (tpl === 'AssetPool') {
      const ap = at(n, 'Values', 'AssetPool');
      if (ap) model.pools[guid] = { guid, file, editable: true, list: listInfo(ctx, kid(ap, 'AssetList'), ap, 'AssetList', 'pool') };
    }
    if (tpl === 'ConstructionCategory') {
      for (const it of kids(at(n, 'Values', 'ConstructionCategory', 'BuildingList'), 'Item')) {
        const b = textOf(src, kid(it, 'Building'));
        if (b) (model.menuItems[b] = model.menuItems[b] || []).push(guid);
      }
    }
    const actions = [...walk(n)].filter(x => x.name === 'ActionUnlockAsset');
    if (!actions.length) continue;
    const trig = at(n, 'Values', 'Trigger');
    const S = {
      guid, file, line: lineOf(src, n.start), template: tpl, name: textOf(src, kid(std, 'Name')),
      modopCondition: modop && modop.attrs.Condition || '',
      condition: describeCondition(ctx, kid(trig, 'TriggerCondition')),
      subConditions: kids(kid(trig, 'SubTriggers'), 'Item').map(it => describeCondition(ctx, at(it, 'SubTrigger', 'Values', 'Trigger', 'TriggerCondition'))).filter(Boolean),
      flags: {}, otherActions: [], actions: [],
    };
    for (const f of ['AutoRegisterTrigger', 'UsedBySecondParties', 'IsSessionTrigger']) {
      const v = textOf(src, kid(trig, f));
      if (v) S.flags[f] = v;
    }
    for (const it of kids(kid(trig, 'TriggerActions'), 'Item')) {
      const t = textOf(src, at(it, 'TriggerAction', 'Template'));
      if (t && t !== 'ActionUnlockAsset') S.otherActions.push(t);
    }
    actions.forEach(a => {
      // context: is it nested in a delayed action?
      const notes = [];
      for (let p = a.parent; p && p !== n; p = p.parent) {
        if (p.name === 'ActionDelayedActions') { const d = textOf(src, kid(p, 'DelayTimer')); notes.push('delayed' + (d ? ' ' + d + ' ms' : '')); }
        if (p.name === 'SubTrigger') notes.push('in sub-trigger');
      }
      const ul = kid(a, 'UnlockAssets'), uh = kid(a, 'UnhideAssets');
      const unlock = listInfo(ctx, ul, a, 'UnlockAssets', 'unlock', null);
      const unhide = listInfo(ctx, uh, a, 'UnhideAssets', 'unhide', ul || null);
      S.actions.push({ notes, unlock: unlock.id, unhide: unhide.id });
    });
    model.sources.push(S);
  }
}

// read-only scan for names / pools from another mod folder or vanilla text
function scanReadOnly(src, origin, sink) {
  const re = /<Asset>\s*(?:<BaseAssetGUID>(\d+)<\/BaseAssetGUID>\s*)?(?:<Template>([^<]*)<\/Template>\s*)?<Values>\s*<Standard>\s*<GUID>(\d+)<\/GUID>(?:\s*<Name>([^<]*)<\/Name>)?/g;
  let m, last = null;
  const pools = [];
  while ((m = re.exec(src))) {
    const [, base, tpl, guid, name] = m;
    sink.assets[guid] = sink.assets[guid] || { guid, name: name || '', template: tpl || (base ? 'clone of ' + base : ''), origin };
    if (tpl === 'AssetPool') pools.push({ guid, from: re.lastIndex });
  }
  for (const p of pools) {
    const end = src.indexOf('</AssetPool>', p.from);
    if (end < 0) continue;
    const body = src.slice(p.from, end);
    sink.pools[p.guid] = sink.pools[p.guid] || { guid: p.guid, origin, members: [...body.matchAll(/<Asset>(\d+)<\/Asset>/g)].map(x => x[1]) };
  }
}
function scanTexts(src, sink) {
  for (const m of src.matchAll(/<GUID>(\d+)<\/GUID>(?:\s*<!--[\s\S]*?-->)?\s*<Text>([^<]*)<\/Text>/g)) if (!sink[m[1]]) sink[m[1]] = m[2];
}

function vanillaIndex() {
  const stamp = [VANILLA_ASSETS, VANILLA_TEXTS].map(f => fs.existsSync(f) ? fs.statSync(f).mtimeMs : 0).join('_');
  const cf = path.join(CACHE, 'vanilla.json');
  if (fs.existsSync(cf)) {
    try { const c = JSON.parse(fs.readFileSync(cf, 'utf8')); if (c.stamp === stamp) return c; } catch {}
  }
  const out = { stamp, assets: {}, pools: {}, texts: {} };
  if (fs.existsSync(VANILLA_ASSETS)) {
    console.log('indexing vanilla assets.xml (first run only)...');
    const fd = fs.openSync(VANILLA_ASSETS, 'r');
    const CH = 32 << 20, buf = Buffer.alloc(CH);
    let carry = '', n;
    while ((n = fs.readSync(fd, buf, 0, CH, null)) > 0) {
      const s = carry + buf.toString('latin1', 0, n);
      // cut before the last asset definition (not a list entry like <Asset>123</Asset>)
      let cut = s.length;
      do cut = s.lastIndexOf('<Asset>', cut - 1); while (cut > 0 && !/[\s<]/.test(s[cut + 7]));
      if (cut <= 0) { carry = s; continue; }
      scanReadOnly(s.slice(0, cut), 'vanilla', out);
      carry = s.slice(cut);
    }
    scanReadOnly(carry, 'vanilla', out);
    fs.closeSync(fd);
    // latin1 read keeps offsets cheap; names are ASCII in practice
  }
  if (fs.existsSync(VANILLA_TEXTS)) scanTexts(readText(VANILLA_TEXTS).src, out.texts);
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(cf, JSON.stringify(out));
  return out;
}

let vanilla = null;
function buildModel() {
  vanilla = vanilla || vanillaIndex();
  const model = { sources: [], pools: {}, lists: {}, fields: {}, assets: {}, files: {}, errors: [], menuItems: {}, ext: { assets: {}, pools: {} }, texts: {} };
  for (const f of listXml(MAIN_ASSETS)) scanMainFile(f, model);
  // other mod folders in the repo (submods may nest, e.g. shared_production_silver_bars/[Shared] Silver Ore): read-only names + pools
  const modDirs = (dir, depth) => fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.') && d.name !== 'data')
    .flatMap(d => {
      const p = path.join(dir, d.name);
      return (fs.existsSync(path.join(p, 'data/config')) ? [p] : []).concat(depth > 1 ? modDirs(p, depth - 1) : []);
    });
  for (const dir of modDirs(REPO, 3)) {
    const origin = rel(dir);
    for (const f of listXml(path.join(dir, 'data/config/export/main/asset'))) {
      try { scanReadOnly(readText(f).src, origin, model.ext); } catch {}
    }
    const t = path.join(dir, 'data/config/gui/texts_english.xml');
    if (fs.existsSync(t)) scanTexts(readText(t).src, model.texts);
  }
  const mt = path.join(REPO, 'data/config/gui/texts_english.xml');
  if (fs.existsSync(mt)) { const own = {}; scanTexts(readText(mt).src, own); Object.assign(model.texts, own); }
  // trigger group order follows the triggers index
  const idx = path.join(MAIN_ASSETS, 'assets_includes/triggers/assets__index.xml');
  const order = fs.existsSync(idx) ? [...readText(idx).src.matchAll(/<Include File="([^"]+)"/g)].map(m => 'data/config/export/main/asset/assets_includes/triggers/' + m[1]) : [];
  model.fileOrder = order;
  return model;
}

function info(model, g) {
  const a = model.assets[g] || model.ext.assets[g] || vanilla.assets[g];
  const text = model.texts[g] || vanilla.texts[g] || '';
  return a ? { guid: g, name: a.name, text, template: a.template, origin: a.mod ? 'main' : a.origin, file: a.file, line: a.line } : { guid: g, name: '', text, template: '', origin: 'unknown' };
}

// strip parser internals before sending
function publicModel(model) {
  const lists = {}, fields = {};
  for (const [id, L] of Object.entries(model.lists)) lists[id] = { id, file: L.file, kind: L.kind, tag: L.tag, exists: L.exists, readonly: !!L.readonly, items: L.items.map(i => ({ guid: i.guid, comments: i.comments, raw: !!i.raw })) };
  for (const [id, F] of Object.entries(model.fields)) fields[id] = { id, key: F.key, value: F.value, file: F.file };
  const pools = {};
  for (const [g, p] of Object.entries(model.pools)) pools[g] = { guid: g, file: p.file, editable: true, list: p.list.id };
  for (const [g, p] of Object.entries(model.ext.pools)) if (!pools[g]) pools[g] = { guid: g, origin: p.origin, members: p.members };
  const strip = C => C && ({ template: C.template, negated: C.negated, negField: C.negField && C.negField.id, fields: C.fields.map(f => f.id) });
  const sources = model.sources.map(s => ({ ...s, condition: strip(s.condition), subConditions: s.subConditions.map(strip) }));
  // names for everything referenced
  const need = new Set();
  Object.values(lists).forEach(L => L.items.forEach(i => need.add(i.guid)));
  Object.keys(model.pools).forEach(g => need.add(g));
  Object.values(model.ext.pools).forEach(p => p.members.forEach(m => need.add(m)));
  Object.values(fields).forEach(f => /^\d{3,}$/.test(f.value) && need.add(f.value));
  Object.keys(model.menuItems).forEach(g => need.add(g));
  Object.values(model.menuItems).flat().forEach(g => need.add(g));
  sources.forEach(s => need.add(s.guid));
  // vanilla pools reached from main lists
  const seen = new Set();
  const addPool = g => {
    if (seen.has(g)) return; seen.add(g);
    const vp = !model.pools[g] && !model.ext.pools[g] && vanilla.pools[g];
    if (vp) { pools[g] = { guid: g, origin: 'vanilla', members: vp.members }; vp.members.forEach(m => { need.add(m); addPool(m); }); }
    const own = model.pools[g]; if (own) own.list.items.forEach(i => addPool(i.guid));
    const ex = model.ext.pools[g]; if (ex) ex.members.forEach(addPool);
  };
  Object.values(lists).forEach(L => L.items.forEach(i => addPool(i.guid)));
  const names = {};
  need.forEach(g => names[g] = info(model, g));
  return { root: REPO.split(path.sep).join('/') + '/', sources, lists, fields, pools, names, files: model.files, errors: model.errors, menuItems: model.menuItems, fileOrder: model.fileOrder };
}

// ---------- saving ----------
function renderItem(L, it, indent, nl) {
  const lines = [];
  for (const c of it.comments || []) lines.push(indent + c.trim());
  if (it.raw) {
    const t = it.raw.text.split(/\r?\n/).map((ln, i) => i === 0 ? ln : (ln.startsWith(it.raw.indent) ? indent + ln.slice(it.raw.indent.length) : ln));
    lines.push(indent + t.join(nl));
  } else if (L.itemStyle === 'single') lines.push(`${indent}<Item><Asset>${it.guid}</Asset></Item>`);
  else lines.push(`${indent}<Item>`, `${indent}${L.unit}<Asset>${it.guid}</Asset>`, `${indent}</Item>`);
  return lines.join(nl);
}

function applySave(model, req) {
  const byFile = {};
  const push = (file, e) => (byFile[file] = byFile[file] || []).push(e);
  // carry original raw/comment data through moves: look items up by guid in any list
  const rawByGuid = {};
  for (const L of Object.values(model.lists)) for (const it of L.items) if (it.raw) rawByGuid[L.id + '|' + it.guid] = it.raw;
  for (const ch of req.lists || []) {
    const L = model.lists[ch.id];
    if (!L || L.readonly) throw new Error('list not editable: ' + ch.id);
    const items = ch.items.map(i => ({ guid: String(i.guid).trim(), comments: i.comments || [], raw: i.rawFrom ? rawByGuid[i.rawFrom + '|' + i.guid] : null }));
    if (items.some(i => !/^\d+$/.test(i.guid))) throw new Error('non-numeric GUID in ' + ch.id);
    push(L.file, { L, items });
  }
  for (const ch of req.fields || []) {
    const F = model.fields[ch.id];
    if (!F) throw new Error('unknown field ' + ch.id);
    if (/[<>&]/.test(ch.value)) throw new Error('value may not contain < > &');
    push(F.file, { F, value: String(ch.value).trim() });
  }
  const written = [];
  for (const [file, edits] of Object.entries(byFile)) {
    const abs = path.join(REPO, file);
    const { src, bom } = readText(abs);
    if (hash(src) !== model.files[file].hash || req.hashes?.[file] !== model.files[file].hash)
      throw new Error(`${file} changed on disk since it was loaded. Reload and redo the edit.`);
    const nl = /\r\n/.test(src) ? '\r\n' : '\n';
    const reps = [];
    for (const e of edits) {
      if (e.F) {
        if (e.F.selfClosing) reps.push([e.F.start, e.F.end, `<${e.F.tag}>${e.value}</${e.F.tag}>`]);
        else reps.push([e.F.innerStart, e.F.innerEnd, e.value]);
        continue;
      }
      const { L, items } = e;
      const trailing = L.trailing.map(c => L.itemIndent + c.trim());
      const body = items.map(it => renderItem(L, it, L.itemIndent, nl)).concat(trailing);
      if (L.exists && !L.selfClosing) {
        reps.push([L.innerStart, L.innerEnd, body.length ? nl + body.join(nl) + nl + L.indent : '']);
      } else if (L.exists) {
        if (body.length) reps.push([L.start, L.end, body.length ? `<${L.tag}>${nl}${body.join(nl)}${nl}${L.indent}</${L.tag}>` : `<${L.tag}/>`]);
      } else if (items.length) {
        reps.push([L.insertAt, L.insertAt, `${nl}${L.indent}<${L.tag}>${nl}${body.join(nl)}${nl}${L.indent}</${L.tag}>`]);
      }
    }
    reps.sort((a, b) => b[0] - a[0]);
    for (let i = 1; i < reps.length; i++) if (reps[i][1] > reps[i - 1][0]) throw new Error('overlapping edits in ' + file);
    let out = src;
    for (const [s, e, t] of reps) out = out.slice(0, s) + t + out.slice(e);
    parseXml(out, file); // refuse to write broken XML
    written.push([abs, (bom ? '\ufeff' : '') + out]);
  }
  for (const [abs, text] of written) fs.writeFileSync(abs, text, 'utf8');
  return written.map(w => rel(w[0]));
}

// ---------- search over every known asset ----------
function search(model, q, limit = 60) {
  q = q.trim().toLowerCase();
  if (!q) return [];
  const res = [];
  const seen = new Set();
  const consider = g => {
    if (seen.has(g)) return; seen.add(g);
    const i = info(model, g);
    const hay = (g + ' ' + i.name + ' ' + i.text + ' ' + i.template).toLowerCase();
    if (q.split(/\s+/).every(w => hay.includes(w))) res.push(i);
  };
  for (const g of Object.keys(model.assets)) { consider(g); if (res.length >= limit) return res; }
  for (const g of Object.keys(model.ext.assets)) { consider(g); if (res.length >= limit) return res; }
  for (const g of Object.keys(vanilla.assets)) { consider(g); if (res.length >= limit) return res; }
  return res;
}

// ---------- http ----------
let model = buildModel();
console.log(`loaded ${model.sources.length} unlock sources, ${Object.keys(model.pools).length} mod pools` + (model.errors.length ? `, ${model.errors.length} parse errors` : ''));

const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  try {
    if (u.pathname === '/api/model') { if (u.searchParams.has('reload')) model = buildModel(); return send(res, 200, publicModel(model)); }
    if (u.pathname === '/api/search') return send(res, 200, search(model, u.searchParams.get('q') || ''));
    if (u.pathname === '/api/save' && req.method === 'POST') {
      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => {
        try {
          const files = applySave(model, JSON.parse(Buffer.concat(chunks).toString('utf8')));
          model = buildModel();
          send(res, 200, { ok: true, files, model: publicModel(model) });
        } catch (e) { send(res, 409, { ok: false, error: e.message }); }
      });
      return;
    }
    if (u.pathname === '/' || u.pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return fs.createReadStream(path.join(TOOL, 'index.html')).pipe(res);
    }
    res.writeHead(404); res.end('404');
  } catch (e) { send(res, 500, { ok: false, error: e.message }); }
}).listen(PORT, () => console.log(`unlock editor on http://localhost:${PORT}`));

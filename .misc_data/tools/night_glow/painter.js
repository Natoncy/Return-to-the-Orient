// Night-glow mask painter: pick a building, paint the light-emitting texels of its diffuse textures, save.
// node .misc_data/tools/night_glow/painter.js   then open http://localhost:8768
// Saving writes <diff minus _diff>_mask_<lod>.dds (BC1) next to the diffuse and points every material in the main
// mod's data/ cfgs that uses that diffuse at it (an empty mask switches the glow off instead). Old mask dds files are
// copied to night_glow/backup/<time>/ first. Textures that only exist in vanilla are read-only.
const http = require('http'), fs = require('fs'), path = require('path');
const L = require('./lib.js'), D = require('./detect.js');

const TOOL = __dirname, REPO = path.resolve(TOOL, '../../..'), VAN = 'D:/anno_data/1800';
const CACHE = path.join(TOOL, 'cache'), BACKUP = path.join(TOOL, 'backup');
const PORT = +process.env.PORT || 8768;
const norm = L.normTex;

function walk(d, out = []) { if (!fs.existsSync(d)) return out; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, out); else out.push(p); } return out; }
const rel = p => path.relative(REPO, p).split(path.sep).join('/');
const readRel = r => { for (const root of [REPO, VAN]) { const p = path.join(root, r); if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8'); } return null; };
const inMod = tex => L.ddsLevels(REPO, tex).length > 0;

// ---------- catalog: buildings -> cfg trees -> diffuse textures ----------
let cat = null;
function texts(file) {
  const o = {}; const p = path.join(REPO, file); if (!fs.existsSync(p)) return o;
  for (const m of fs.readFileSync(p, 'utf8').matchAll(/<GUID>(\d+)<\/GUID>\s*(?:<!--[\s\S]*?-->\s*)?<Text>([^<]*)<\/Text>/g)) o[m[1]] = m[2];
  return o;
}
function buildCatalog() {
  const t0 = Date.now();
  const de = texts('data/config/gui/texts_german.xml'), en = texts('data/config/gui/texts_english.xml');
  const assets = {};
  for (const f of walk(path.join(REPO, 'data/config/export/main/asset')).filter(f => f.endsWith('.xml'))) {
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/<Asset>([\s\S]*?)<\/Asset>/g)) {
      const b = m[1], g = (b.match(/<Standard>[\s\S]*?<GUID>(\d+)<\/GUID>/) || [])[1]; if (!g) continue;
      assets[g] = { guid: g, name: (b.match(/<Name>([^<]*)<\/Name>/) || [])[1] || '', base: (b.match(/<BaseAssetGUID>(\d+)<\/BaseAssetGUID>/) || [])[1],
        cfgs: [...new Set([...b.matchAll(/<Filename>([^<]*\.cfg)<\/Filename>/gi)].map(x => x[1].replace(/\\/g, '/')))] };
    }
  }
  const cfgOf = (a, d = 0) => a.cfgs.length ? a.cfgs : a.base && assets[a.base] && d < 5 ? cfgOf(assets[a.base], d + 1) : [];
  const mats = {}; // cfg -> [{diff, map}] including FILE children
  function cfgMats(r, seen = new Set()) {
    if (mats[r]) return mats[r]; if (seen.has(r)) return []; seen.add(r);
    const t = readRel(r); if (t === null) return (mats[r] = []);
    const out = [...t.matchAll(/<Config>\s*<ConfigType>MATERIAL<\/ConfigType>[\s\S]*?<\/Config>/g)].map(m => ({
      diff: (m[0].match(/<cModelDiffTex>([^<]*)</) || [])[1], cfg: r,
      map: /<NIGHT_GLOW_ENABLED>1</.test(m[0]) ? (m[0].match(/<cNightGlowMap>([^<]+)</) || [])[1] : undefined }));
    for (const m of t.matchAll(/<ConfigType>FILE<\/ConfigType>[\s\S]*?<FileName>([^<]*\.cfg)<\/FileName>/g)) out.push(...cfgMats(m[1].replace(/\\/g, '/'), seen));
    return (mats[r] = out);
  }
  const tex = {}, buildings = [];
  for (const a of Object.values(assets)) {
    const cfgs = cfgOf(a).filter(c => /graphics\/(.*\/)?buildings\//.test(c)); if (!cfgs.length) continue;
    const ts = new Set();
    for (const c of cfgs) for (const m of cfgMats(c)) {
      if (!m.diff || /ground|default_model|_decal|terrain/i.test(m.diff)) continue;
      const k = norm(m.diff); ts.add(k);
      const e = tex[k] ??= { path: m.diff.replace(/\\/g, '/'), maps: new Set(), modCfgs: new Set(), users: new Set() };
      if (m.map) e.maps.add(m.map);
      if (m.cfg.startsWith('data/') && fs.existsSync(path.join(REPO, m.cfg))) e.modCfgs.add(m.cfg);
      e.users.add(a.guid);
    }
    if (!ts.size) continue;
    buildings.push({ guid: a.guid, name: a.name, de: de[a.guid] || '', en: en[a.guid] || '', tex: [...ts] });
  }
  for (const e of Object.values(tex)) {
    e.editable = inMod(e.path) && e.modCfgs.size > 0;
    const lv = L.ddsLevels(REPO, e.path); e.size0 = lv.length ? fs.statSync(lv[0]).size : 0;
  }
  // copies: other editable diffuse files with the same file name and the same _0.dds size (= same atlas)
  const byName = {};
  for (const [k, e] of Object.entries(tex)) if (e.editable) (byName[path.basename(k)] ??= []).push(k);
  for (const [k, e] of Object.entries(tex)) e.copies = (byName[path.basename(k)] || []).filter(o => o !== k && tex[o].size0 === e.size0);
  buildings.sort((x, y) => (x.de || x.en || x.name).localeCompare(y.de || y.en || y.name, 'de'));
  cat = { tex, buildings, byGuid: Object.fromEntries(buildings.map(b => [b.guid, b])) };
  console.log(`catalog: ${buildings.length} buildings, ${Object.keys(tex).length} textures in ${Date.now() - t0} ms`);
}
const label = g => { const b = cat.byGuid[g]; return b ? (b.de || b.en || b.name) : g; };
function texInfo(k) {
  const e = cat.tex[k]; if (!e) return null;
  return { path: e.path, editable: e.editable, maps: [...e.maps], mask: e.maps.size ? [...e.maps][0] : null, newMask: L.maskName(e.path),
    vanillaOnly: !inMod(e.path), cfgs: [...e.modCfgs], users: [...e.users].map(label),
    copies: e.copies.map(c => ({ key: c, path: cat.tex[c].path, users: [...cat.tex[c].users].map(label), mask: [...cat.tex[c].maps][0] || null })) };
}

// ---------- images ----------
function levelPng(texPath, lod) { // decoded png of a dds level, mod first then vanilla
  for (const root of [REPO, VAN]) { const lv = L.ddsLevels(root, texPath); if (lv.length) return L.ddsToPng(lv[Math.min(lod, lv.length - 1)], CACHE); }
  return null;
}
function pngBytes(im) { const f = path.join(CACHE, `_out_${process.pid}.png`); L.encode(f, im.w, im.h, im.ch === 4 ? 4 : 3, im.ch === 4 || im.ch === 3 ? im.px : rgb(im)); return fs.readFileSync(f); }
function rgb(im) { const o = Buffer.alloc(im.w * im.h * 3); for (let i = 0; i < im.w * im.h; i++) for (let c = 0; c < 3; c++) o[i * 3 + c] = im.px[i * im.ch + Math.min(c, im.ch - 1)]; return o; }
const hintCache = {};
function hint(k) { // R = texel used by a mesh, G = wall-facing, B = detector candidate
  if (hintCache[k]) return hintCache[k];
  const e = cat.tex[k], modCfgs = walk(path.join(REPO, 'data/graphics')).filter(f => f.endsWith('.cfg')).map(rel);
  const pr = D.prepare(REPO, path.join(CACHE, 'work'), e.path, modCfgs); if (!pr) return null;
  const res = D.detect(pr), o = Buffer.alloc(pr.N * 3);
  for (let i = 0; i < pr.N; i++) { o[i * 3] = pr.used[i] ? 255 : 0; o[i * 3 + 1] = pr.wv[i] ? 255 : 0; }
  for (const c of res.keep) for (const j of c.px) o[j * 3 + 2] = 255;
  const f = path.join(CACHE, `_hint_${process.pid}.png`); L.encode(f, pr.W, pr.H, 3, o);
  return (hintCache[k] = fs.readFileSync(f));
}

// ---------- save ----------
function save({ key, png, copies = [] }) {
  const f = path.join(CACHE, `_in_${process.pid}.png`); fs.writeFileSync(f, Buffer.from(png.replace(/^data:image\/png;base64,/, ''), 'base64'));
  const im = L.decode(f), N = im.w * im.h, out = Buffer.alloc(N * 3); let lit = 0;
  for (let i = 0; i < N; i++) { const a = im.ch === 4 ? im.px[i * 4 + 3] / 255 : 1; for (let c = 0; c < 3; c++) { const v = Math.round(im.px[i * im.ch + c] * a); out[i * 3 + c] = v; if (v) lit++; } }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-'), log = [], wire = {};
  for (const k of [key, ...copies]) {
    const e = cat.tex[k]; if (!e || !e.editable) { log.push(`skipped ${k} (read-only)`); continue; }
    const lv0 = L.ddsLevels(REPO, e.path)[0], d0 = L.ddsToPng(lv0, CACHE);
    if (d0.w !== im.w || d0.h !== im.h) { log.push(`skipped ${e.path}: ${d0.w}x${d0.h} ≠ painted ${im.w}x${im.h}`); continue; }
    if (!lit) { wire[k] = ''; log.push(`glow off: ${e.path}`); continue; }
    const mtex = L.maskName(e.path), old = L.ddsLevels(REPO, mtex);
    if (old.length) { const bd = path.join(BACKUP, stamp, path.dirname(mtex)); fs.mkdirSync(bd, { recursive: true }); for (const o of old) fs.copyFileSync(o, path.join(bd, path.basename(o))); }
    const r = L.writeMaskDds(REPO, e.path, im.w, im.h, out, path.join(CACHE, 'save'));
    wire[k] = r.mtex; log.push(`${old.length ? 'overwrote' : 'wrote'} ${r.mtex.replace(/\.png$/, '_0..' + (r.files.length - 1) + '.dds')}`);
  }
  let nm = 0;
  for (const c of walk(path.join(REPO, 'data/graphics')).filter(f => f.endsWith('.cfg'))) {
    const t = fs.readFileSync(c, 'utf8'), { out: o, n } = L.wireCfgText(t, wire, true);
    if (n) { fs.writeFileSync(c, o); nm += n; log.push(`  ${rel(c)}: ${n} material(s)`); }
  }
  log.push(`${nm} material(s) changed`);
  for (const k of [key, ...copies]) delete hintCache[k];
  buildCatalog();
  return { ok: true, log };
}

// ---------- http ----------
const send = (res, code, body, type = 'application/json') => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(type === 'application/json' ? JSON.stringify(body) : body); };
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'), q = u.searchParams;
  try {
    if (u.pathname === '/') return send(res, 200, fs.readFileSync(path.join(TOOL, 'painter.html')), 'text/html; charset=utf-8');
    if (u.pathname === '/api/buildings') return send(res, 200, cat.buildings.map(b => ({ ...b, tex: b.tex.map(k => ({ key: k, editable: cat.tex[k].editable, lit: cat.tex[k].maps.size > 0 })) })));
    if (u.pathname === '/api/info') return send(res, 200, texInfo(q.get('key')));
    if (u.pathname === '/api/tex') { const e = cat.tex[q.get('key')], im = e && levelPng(e.path, +q.get('lod') || 0); return im ? send(res, 200, pngBytes(im), 'image/png') : send(res, 404, { error: 'no texture' }); }
    if (u.pathname === '/api/mask') { const im = levelPng(q.get('path'), 0); return im ? send(res, 200, pngBytes(im), 'image/png') : send(res, 404, { error: 'no mask' }); }
    if (u.pathname === '/api/hint') { const h = hint(q.get('key')); return h ? send(res, 200, h, 'image/png') : send(res, 404, { error: 'no hint' }); }
    if (u.pathname === '/api/reload' && req.method === 'POST') { buildCatalog(); return send(res, 200, { ok: true }); }
    if (u.pathname === '/api/save' && req.method === 'POST') {
      let body = ''; req.on('data', d => body += d);
      req.on('end', () => { try { send(res, 200, save(JSON.parse(body))); } catch (e) { console.error(e); send(res, 500, { error: e.message }); } });
      return;
    }
    send(res, 404, { error: 'not found' });
  } catch (e) { console.error(e); send(res, 500, { error: e.message }); }
}).listen(PORT, () => { fs.mkdirSync(CACHE, { recursive: true }); buildCatalog(); console.log(`mask painter on http://localhost:${PORT}`); });

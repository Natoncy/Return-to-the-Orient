// Shared helpers for the Y-offset bake.
const fs = require('fs');
const path = require('path');

const MOD = path.resolve(__dirname, '../../..').split(path.sep).join('/');
const VANILLA = 'D:/anno_data/1800';

// Land buildings only; over-water models keep vanilla behaviour (0).
const INCLUDE = /^data\/graphics\/(buildings|1404_import)\//;
const EXCLUDE = [
  /\/(coastal_orient_01|harbor_[^/]*|kontor|trading_company_orient|lighthouse|canal|river_orient_01|noria2)\//,
  /\/005kustengebaude\//,
  /\/kahina\/kahina_(kontor|quay|crane|platform|wheel)/,
  /orient_harbour/,
];
const inScope = (rel) => INCLUDE.test(rel) && !EXCLUDE.some((r) => r.test('/' + rel));

function walk(d, out, filter) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name !== '.git' && e.name !== '.misc_data') walk(p, out, filter); }
    else if (filter(e.name)) out.push(p);
  }
  return out;
}
const rel = (p) => path.relative(MOD, p).split(path.sep).join('/');
const norm = (p) => p.trim().replace(/\\/g, '/').toLowerCase();

// Config tree with text offsets so values can be rewritten in place.
function parse(src) {
  const re = /<Config>|<\/Config>|<([A-Za-z_.]+)>([^<]*)<\/\1>/g;
  const r = { kids: [], v: {}, at: {}, start: 0, parent: null }, st = [r]; let m;
  while ((m = re.exec(src))) {
    if (m[0] === '<Config>') { const n = { kids: [], v: {}, at: {}, start: m.index, parent: st[st.length - 1] }; st[st.length - 1].kids.push(n); st.push(n); }
    else if (m[0] === '</Config>') { st[st.length - 1].end = m.index + m[0].length; st.pop(); }
    else {
      const t = st[st.length - 1];
      if (!(m[1] in t.v)) { t.v[m[1]] = m[2]; t.at[m[1]] = { index: m.index + m[1].length + 2, len: m[2].length }; }
      (t.all = t.all || []).push({ tag: m[1], val: m[2], index: m.index + m[1].length + 2, len: m[2].length });
    }
  }
  return r;
}
function each(n, f) { f(n); n.kids.forEach((k) => each(k, f)); }
const num = (x) => (x === undefined || x === '' ? 0 : parseFloat(x));
const transformOf = (model) => model.kids.find((k) => k.v.ConfigType === 'ORIENTATION_TRANSFORM');

// What has to be baked for a MODEL: null = nothing.
function bakeParams(model) {
  const t = transformOf(model);
  if (!t) return null;
  const y = num(t.v['Position.y']);
  const q = { x: num(t.v['Rotation.x']), y: num(t.v['Rotation.y']), z: num(t.v['Rotation.z']), w: t.v['Rotation.w'] === undefined ? 1 : num(t.v['Rotation.w']) };
  const s = t.v.Scale === undefined ? 1 : num(t.v.Scale);
  const tilt = Math.abs(q.x) + Math.abs(q.z) > 1e-3;
  if (Math.abs(y) <= 1e-3 && !tilt) return null;
  return { y, q, s, tilt, t };
}

// Resolve a game path to a real file: mod first, then vanilla.
function resolve(gamePath) {
  const p = gamePath.trim().replace(/\\/g, '/');
  const m = path.join(MOD, p);
  if (fs.existsSync(m)) return { where: 'mod', file: m };
  const v = path.join(VANILLA, p);
  if (fs.existsSync(v)) return { where: 'vanilla', file: v };
  return null;
}
// lod siblings of a mesh path (game paths), always including the path itself.
function lodSiblings(gamePath) {
  const p = gamePath.trim().replace(/\\/g, '/');
  const lm = p.match(/^(.*_lod)(\d)\.rdm$/i);
  if (!lm) return [p];
  const out = [];
  for (let k = 0; k < 6; k++) { const s = lm[1] + k + '.rdm'; if (k === +lm[2] || resolve(s)) out.push(s); }
  return out;
}

module.exports = { MOD, VANILLA, inScope, walk, rel, norm, parse, each, num, transformOf, bakeParams, resolve, lodSiblings };

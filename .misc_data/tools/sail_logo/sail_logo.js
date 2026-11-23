// sail_logo.js - put the player logo on a cloth sail (see README.md)
//   node sail_logo.js list    <ship.cfg>
//   node sail_logo.js fit     <ship.cfg> <cloth#> [--view +x]
//   node sail_logo.js preview <ship.cfg> <cloth#> --at R,D --size S [--view +x] [--logo file.png|file.dds] [--out file.png]
//   node sail_logo.js apply   <ship.cfg> <cloth#> --at R,D --size S [--view +x] [--no-cfg]
// R,D = logo centre in metres right / down of the cloth pivot, seen from the --view side. S = logo square edge in metres.
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib'), os = require('os'), cp = require('child_process');
const TEXCONV = process.env.TEXCONV || 'C:/tools/texconv.exe';
const VANILLA = process.env.ANNO_DATA || 'D:/anno_data/1800';

// ---------- small helpers ----------
const die = m => { console.error('ERROR: ' + m); process.exit(1); };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const l = Math.hypot(...a); return a.map(c => c / l); };
const sub = (a, b) => a.map((c, i) => c - b[i]);
const scale = (a, s) => a.map(c => c * s);
function qrot(q, v) { const [x, y, z, w] = q, [vx, vy, vz] = v; const tx = 2 * (y * vz - z * vy), ty = 2 * (z * vx - x * vz), tz = 2 * (x * vy - y * vx);
  return [vx + w * tx + (y * tz - z * ty), vy + w * ty + (z * tx - x * tz), vz + w * tz + (x * ty - y * tx)]; }
const fmt = (a, d = 3) => a.map(c => c.toFixed(d)).join(', ');

// ---------- cfg ----------
function modRoot(cfg) { const p = cfg.replace(/\\/g, '/'); const i = p.lastIndexOf('/data/graphics/'); return i < 0 ? path.dirname(p) : p.slice(0, i); }
function resolveGame(cfg, rel) { rel = rel.replace(/\\/g, '/'); for (const r of [modRoot(cfg), VANILLA]) { const f = r + '/' + rel; if (fs.existsSync(f)) return f; } return null; }
// spans of every <Config> ... </Config> block, with nesting
function configSpans(t) { const re = /<Config>|<\/Config>/g, st = [], out = []; let m;
  while ((m = re.exec(t))) { if (m[0] === '<Config>') st.push(m.index); else { const s = st.pop(); out.push([s, m.index + m[0].length]); } } return out; }
function cloths(cfgPath) {
  const t = fs.readFileSync(cfgPath, 'utf8');
  const spans = configSpans(t).filter(([s, e]) => /^<Config>\s*<ConfigType>CLOTH<\/ConfigType>/.test(t.slice(s, e))).sort((a, b) => a[0] - b[0]);
  return spans.map(([s, e], i) => {
    const b = t.slice(s, e);
    const inner = spans => { const r = []; for (const tag of ['Materials', 'Transformer']) { const a = b.indexOf('<' + tag + '>'), z = b.indexOf('</' + tag + '>'); if (a >= 0) r.push([a, z]); } return r; };
    const skip = inner();
    let nameAt = -1; const nr = /<Name>([^<]*)<\/Name>/g; let m;
    while ((m = nr.exec(b))) if (!skip.some(([a, z]) => m.index > a && m.index < z)) { nameAt = m.index; break; }
    const g = k => { const m = b.match(new RegExp('<' + k.replace('.', '\\.') + '>([^<]*)<')); return m ? m[1] : null; };
    const tr = b.slice(b.indexOf('ORIENTATION_TRANSFORM'));
    const gt = k => parseFloat((tr.match(new RegExp('<' + k.replace('.', '\\.') + '>([^<]*)<')) || [])[1]);
    return { index: i, start: s, end: e, block: b, name: nameAt >= 0 ? b.slice(nameAt).match(/<Name>([^<]*)/)[1] : '', nameAt,
      file: g('FileName'), logo: g('LOGO_ATLAS_ENABLED'), diff: g('cClothDiffuseTex'), dye: g('cClothDyeMask'),
      q: [gt('Rotation.x'), gt('Rotation.y'), gt('Rotation.z'), gt('Rotation.w')].map(v => isNaN(v) ? 0 : v),
      pos: [gt('Position.x'), gt('Position.y'), gt('Position.z')], text: t };
  });
}

// ---------- rdm ----------
const DESC_SIZE = (type, count) => type === 7 ? 4 * count : type === 6 ? 2 * count : type === 5 ? 4 * count : die('unknown vertex attribute type ' + type);
function readRdm(f) {
  const b = fs.readFileSync(f), u32 = o => b.readUInt32LE(o);
  const meta = u32(32); if (u32(meta - 8) !== 1) die(f + ': ' + u32(meta - 8) + ' meshes in one rdm, expected 1 (cloth)');
  const vfe = u32(meta + 4), da = u32(vfe), dn = u32(da - 8);
  const descs = [...Array(dn)].map((_, k) => [0, 1, 2, 3].map(j => u32(da + k * 16 + j * 4)));
  const vb = u32(meta + 12), ib = u32(meta + 16), n = u32(vb - 8), stride = u32(vb - 4), ni = u32(ib - 8), isz = u32(ib - 4);
  let off = 0; const offs = descs.map(d => { const o = off; off += DESC_SIZE(d[1], d[3]); return o; });
  if (off !== stride) die(f + ': vertex attributes add up to ' + off + ' bytes, stride is ' + stride);
  const uvs = descs.map((d, k) => [d, offs[k]]).filter(([d]) => d[0] === 4);
  const P = [], I = [];
  for (let i = 0; i < n; i++) { const o = vb + i * stride; if (descs[0][0] !== 0 || descs[0][1] !== 7) die('position is not P3f'); P.push([0, 1, 2].map(j => b.readFloatLE(o + j * 4))); }
  for (let i = 0; i < ni; i++) I.push(isz === 2 ? b.readUInt16LE(ib + i * 2) : u32(ib + i * 4));
  const UV = k => [...Array(n)].map((_, i) => { const o = vb + i * stride + uvs[k][1]; return [b.readFloatLE(o), b.readFloatLE(o + 4)]; });
  return { b, meta, da, dn, descs, vb, ib, n, stride, uvs, P, I, UV };
}
// every u32 outside VB/IB that points at a plausible [count][size] array header
function pointerScan(b, skip) { const u32 = o => b.readUInt32LE(o), out = [];
  for (let o = 0; o + 4 <= b.length; o++) { if (skip.some(([a, z]) => o >= a && o < z)) continue; const v = u32(o); if (v < 8 || v >= b.length) continue;
    const c = u32(v - 8), s = u32(v - 4); if (c > 0 && c < 1e6 && s > 0 && s < 1e4 && v + c * s <= b.length) out.push({ loc: o, v, c, s }); }
  return out; }

// ---------- logo frame on the sail ----------
function frame(cl, R, view) {
  // sail plane normal in mesh space = area weighted triangle normals
  let nl = [0, 0, 0]; for (let t = 0; t < R.I.length; t += 3) { const [a, b, c] = [R.I[t], R.I[t + 1], R.I[t + 2]].map(i => R.P[i]); nl = nl.map((v, j) => v + cross(sub(b, a), sub(c, a))[j]); }
  nl = norm(nl); const ns = qrot(cl.q, nl);
  if (!view) { const ax = [0, 1, 2].reduce((m, i) => Math.abs(ns[i]) > Math.abs(ns[m]) ? i : m, 0); view = '+' + 'xyz'[ax]; }
  const vm = view.match(/^([+-])([xyz])$/); if (!vm) die('--view must be +x, -x, +z or -z');
  const vv = [0, 0, 0]; vv['xyz'.indexOf(vm[2])] = vm[1] === '+' ? 1 : -1;
  // Anno is left-handed: looking along -x (from +x) with y up, screen right is +z.  right = up x forward
  const rightS = cross([0, 1, 0], scale(vv, -1));
  const qi = [-cl.q[0], -cl.q[1], -cl.q[2], cl.q[3]];
  const flat = v => sub(v, scale(nl, dot(v, nl)));
  const down = norm(flat(qrot(qi, [0, -1, 0])));
  let right = flat(qrot(qi, rightS)); right = norm(sub(right, scale(down, dot(right, down))));
  const RD = R.P.map(p => [dot(p, right), dot(p, down)]);
  // outline = longest loop of edges used by one triangle only
  const ec = new Map(), key = (a, b) => a < b ? a + ',' + b : b + ',' + a;
  for (let t = 0; t < R.I.length; t += 3) for (const [a, b] of [[R.I[t], R.I[t + 1]], [R.I[t + 1], R.I[t + 2]], [R.I[t + 2], R.I[t]]]) ec.set(key(a, b), (ec.get(key(a, b)) || 0) + 1);
  const adj = new Map(); for (const [k, c] of ec) if (c === 1) { const [a, b] = k.split(',').map(Number); (adj.get(a) || adj.set(a, []).get(a)).push(b); (adj.get(b) || adj.set(b, []).get(b)).push(a); }
  const seen = new Set(); let loop = [];
  for (const s of adj.keys()) { if (seen.has(s)) continue; const l = [s]; seen.add(s); let prev = -1, cur = s;
    for (;;) { const nx = (adj.get(cur) || []).find(x => x !== prev && !seen.has(x)); if (nx === undefined) break; seen.add(nx); l.push(nx); prev = cur; cur = nx; }
    if (l.length > loop.length) loop = l; }
  const poly = loop.map(i => RD[i]);
  return { view, nl, ns, right, down, RD, poly };
}
function inside(poly, x, y) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c; } return c; }
function edgeDist(poly, x, y) { let m = 1e9; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [ax, ay] = poly[j], [bx, by] = poly[i], dx = bx - ax, dy = by - ay; let t = ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy); t = Math.max(0, Math.min(1, t)); m = Math.min(m, Math.hypot(x - ax - t * dx, y - ay - t * dy)); } return m; }
function squareFits(poly, x, y, s) { const h = s / 2; for (let a = 0; a <= 10; a++) for (let b = 0; b <= 10; b++) if (!inside(poly, x - h + s * a / 10, y - h + s * b / 10)) return false; return true; }
function largestSquare(poly, cx, cy) { let lo = 0, hi = 20; if (!inside(poly, cx, cy)) return 0; while (hi - lo > 0.002) { const m = (lo + hi) / 2; if (squareFits(poly, cx, cy, m)) lo = m; else hi = m; } return lo; }

// ---------- images ----------
function writePNG(f, w, h, px) { const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(px.buffer, y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  const T = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; }
  const crc = b => { let c = 0xffffffff; for (const x of b) c = T[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  fs.writeFileSync(f, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])); }
function readTGA(f) { const b = fs.readFileSync(f), w = b.readUInt16LE(12), h = b.readUInt16LE(14), bpp = b[16], top = (b[17] & 0x20) !== 0, o = 18 + b[0], px = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) { const sy = top ? y : h - 1 - y; for (let x = 0; x < w; x++) { const i = o + (sy * w + x) * (bpp / 8), d = (y * w + x) * 4; px[d] = b[i + 2]; px[d + 1] = b[i + 1]; px[d + 2] = b[i]; px[d + 3] = bpp === 32 ? b[i + 3] : 255; } }
  return { w, h, px }; }
function loadImage(f) { // any dds/png via texconv -> tga
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sail_logo_'));
  cp.execFileSync(TEXCONV, ['-nologo', '-y', '-ft', 'tga', '-m', '1', '-f', 'R8G8B8A8_UNORM', '-o', tmp, f], { stdio: 'pipe' });
  const img = readTGA(path.join(tmp, path.basename(f).replace(/\.[^.]+$/, '.tga'))); fs.rmSync(tmp, { recursive: true, force: true }); return img; }
function gameTexture(cfg, psd) { if (!psd) return null; const f = resolveGame(cfg, psd.replace(/\.psd$/i, '_0.dds')); return f ? loadImage(f) : null; }
function testSquare() { const N = 256, px = new Uint8Array(N * N * 4).fill(255), s = N / 512; // same design as the test logo submod
  const cut = (x0, y0, x1, y1) => { for (let y = Math.round(y0 * s); y < Math.round(y1 * s); y++) for (let x = Math.round(x0 * s); x < Math.round(x1 * s); x++) px[(y * N + x) * 4 + 3] = 0; };
  cut(0, 0, 512, 8); cut(0, 504, 512, 512); cut(0, 0, 8, 512); cut(504, 0, 512, 512); cut(252, 8, 260, 504); cut(8, 252, 504, 260); cut(64, 56, 104, 216); cut(64, 56, 200, 96); cut(64, 120, 168, 156);
  return { w: N, h: N, px }; }
function samp(t, u, v) { u = Math.min(Math.max(u, 0), 1); v = Math.min(Math.max(v, 0), 1); const i = (Math.min(t.h - 1, Math.floor(v * t.h)) * t.w + Math.min(t.w - 1, Math.floor(u * t.w))) * 4; return [t.px[i], t.px[i + 1], t.px[i + 2], t.px[i + 3]]; }

// ---------- commands ----------
function args() { const a = process.argv.slice(2), o = { _: [] }; for (let i = 0; i < a.length; i++) { if (a[i].startsWith('--')) { const k = a[i].slice(2); o[k] = (a[i + 1] && !a[i + 1].startsWith('--')) ? a[++i] : true; } else o._.push(a[i]); } return o; }
function pick(o) { const cfg = path.resolve(o._[1] || die('no cfg given')); const all = cloths(cfg); const i = +o._[2]; if (!(i >= 0 && i < all.length)) die('cloth# must be 0..' + (all.length - 1) + ' (see list)');
  const cl = all[i], rf = resolveGame(cfg, cl.file || ''); if (!rf) die('rdm not found: ' + cl.file); return { cfg, cl, rf, R: readRdm(rf) }; }
function placement(o) { if (!o.at || !o.size) die('need --at R,D and --size S (metres)'); const [r, d] = String(o.at).split(',').map(Number), s = +o.size; if ([r, d, s].some(isNaN) || s <= 0) die('bad --at/--size'); return { r, d, s }; }

function cmdList(o) { const cfg = path.resolve(o._[1] || die('no cfg given'));
  for (const c of cloths(cfg)) { const rf = resolveGame(cfg, c.file || ''); let info = 'rdm missing';
    if (rf) { const R = readRdm(rf); info = R.uvs.length + ' UV set' + (R.uvs.length > 1 ? 's' : '') + ', ' + R.n + ' verts, stride ' + R.stride; }
    const warn = c.logo === '1' && !/2 UV/.test(info) ? '   <-- LOGO_ATLAS_ENABLED 1 without a logo UV: set it to 0' : '';
    console.log(`#${c.index}  Name "${c.name}"  logo=${c.logo}  ${c.file}\n     ${info}${warn}`); } }

function cmdFit(o) { const { cl, R } = pick(o); const F = frame(cl, R, o.view);
  const xs = F.poly.map(p => p[0]), ys = F.poly.map(p => p[1]);
  let A = 0, cx = 0, cy = 0; F.poly.forEach(([x0, y0], i) => { const [x1, y1] = F.poly[(i + 1) % F.poly.length], c = x0 * y1 - x1 * y0; A += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c; }); A /= 2; cx /= 6 * A; cy /= 6 * A;
  let best = { s: 0 }; const st = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 120;
  for (let x = Math.min(...xs); x <= Math.max(...xs); x += st) for (let y = Math.min(...ys); y <= Math.max(...ys); y += st) { if (!squareFits(F.poly, x, y, best.s + 0.002)) continue; const s = largestSquare(F.poly, x, y); if (s > best.s) best = { s, x, y }; }
  console.log(`view from ${F.view}: sail plane normal in ship space ${fmt(F.ns)}`);
  console.log(`sail outline: right ${Math.min(...xs).toFixed(2)} .. ${Math.max(...xs).toFixed(2)} m, down ${Math.min(...ys).toFixed(2)} .. ${Math.max(...ys).toFixed(2)} m (from the cloth pivot), area ${Math.abs(A).toFixed(2)} m2`);
  console.log(`centroid ${cx.toFixed(3)},${cy.toFixed(3)}  -> largest square there ${largestSquare(F.poly, cx, cy).toFixed(3)} m`);
  console.log(`largest square anywhere: --at ${best.x.toFixed(3)},${best.y.toFixed(3)} --size ${best.s.toFixed(3)}`);
  console.log(`a comfortable start (90 %): --at ${best.x.toFixed(3)},${best.y.toFixed(3)} --size ${(best.s * 0.9).toFixed(3)}`);
  if (R.uvs.length > 1) { const U = R.UV(1); console.log('current logo UV: u ' + Math.min(...U.map(v => v[0])).toFixed(2) + '..' + Math.max(...U.map(v => v[0])).toFixed(2) + ', v ' + Math.min(...U.map(v => v[1])).toFixed(2) + '..' + Math.max(...U.map(v => v[1])).toFixed(2)); } }

function cmdPreview(o) { const { cfg, cl, R } = pick(o); const F = frame(cl, R, o.view); const useFile = !o.at;
  const pl = useFile ? null : placement(o); if (useFile && R.uvs.length < 2) die('this sail has no logo UV yet: pass --at R,D --size S');
  const diff = gameTexture(cfg, cl.diff), dye = gameTexture(cfg, cl.dye), logo = o.logo ? loadImage(path.resolve(o.logo)) : testSquare();
  const UV1 = R.UV(0), UV2 = useFile ? R.UV(1) : F.RD.map(([r, d]) => [(r - pl.r) / pl.s + 0.5, (d - pl.d) / pl.s + 0.5]);
  const xs = F.RD.map(p => p[0]), ys = F.RD.map(p => p[1]), x0 = Math.min(...xs) - 0.2, y0 = Math.min(...ys) - 0.2;
  const sc = 600 / (Math.max(...xs) - Math.min(...xs) + 0.4), W = Math.round((Math.max(...xs) + 0.2 - x0) * sc), H = Math.round((Math.max(...ys) + 0.2 - y0) * sc);
  const px = new Uint8Array(W * H * 4); for (let i = 0; i < W * H; i++) px.set([40, 70, 90, 255], i * 4);
  const grid = (v, s0) => Math.abs(v / 0.5 - Math.round(v / 0.5)) * 0.5 * sc < 0.6; // 0.5 m grid
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const r = x0 + x / sc, d = y0 + y / sc, i = (y * W + x) * 4;
    if (Math.abs(r) * sc < 1 || Math.abs(d) * sc < 1) px.set([120, 150, 170, 255], i); else if (grid(r) || grid(d)) px.set([55, 88, 110, 255], i); }
  const purple = [110, 50, 140];
  for (let t = 0; t < R.I.length; t += 3) { const id = [R.I[t], R.I[t + 1], R.I[t + 2]], P = id.map(k => [(F.RD[k][0] - x0) * sc, (F.RD[k][1] - y0) * sc]);
    const den = (P[1][1] - P[2][1]) * (P[0][0] - P[2][0]) + (P[2][0] - P[1][0]) * (P[0][1] - P[2][1]); if (Math.abs(den) < 1e-9) continue;
    for (let y = Math.floor(Math.min(...P.map(p => p[1]))); y <= Math.ceil(Math.max(...P.map(p => p[1]))); y++) for (let x = Math.floor(Math.min(...P.map(p => p[0]))); x <= Math.ceil(Math.max(...P.map(p => p[0]))); x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const a = ((P[1][1] - P[2][1]) * (x - P[2][0]) + (P[2][0] - P[1][0]) * (y - P[2][1])) / den, b = ((P[2][1] - P[0][1]) * (x - P[2][0]) + (P[0][0] - P[2][0]) * (y - P[2][1])) / den, g = 1 - a - b;
      if (a < -1e-6 || b < -1e-6 || g < -1e-6) continue; const L = (A, k) => a * A[id[0]][k] + b * A[id[1]][k] + g * A[id[2]][k];
      const u = L(UV1, 0), v = L(UV1, 1); let col = diff ? samp(diff, u, v) : [230, 220, 195, 255]; if (col[3] < 26) continue; col = col.slice(0, 3);
      if (dye) { const k = samp(dye, u, v)[0] / 255; col = col.map((c, j) => c * (1 - k) + purple[j] * k * (0.55 + 0.45 * c / 255)); }
      const lu = L(UV2, 0), lv = L(UV2, 1); if (lu >= 0 && lu <= 1 && lv >= 0 && lv <= 1) { const al = samp(logo, lu, lv)[3] / 255; col = col.map((c, j) => c * (1 - al) + purple[j] * al * (0.55 + 0.45 * c / 255)); }
      px.set([col[0], col[1], col[2], 255], (y * W + x) * 4); } }
  const out = path.resolve(o.out || 'sail_preview.png'); writePNG(out, W, H, px);
  console.log(`wrote ${out} (${W}x${H}, view from ${F.view}; grid 0.5 m, light lines = pivot axes, right = +R, down = +D)` + (useFile ? ' using the logo UV stored in the rdm' : '')); }

function cmdApply(o) { const { cfg, cl, rf, R } = pick(o); const F = frame(cl, R, o.view), pl = placement(o);
  if (R.uvs.length === 0) die('no UV set in the rdm'); const [d1, off1] = R.uvs[0]; if (d1[1] !== 7 || d1[3] !== 2) die('UV set 1 is not T2f');
  const UV2 = F.RD.map(([r, d]) => [(r - pl.r) / pl.s + 0.5, (d - pl.d) / pl.s + 0.5]); let nb;
  if (R.uvs.length >= 2) { // already a logo sail: overwrite the second UV set in place
    const off2 = R.uvs[1][1]; nb = Buffer.from(R.b); UV2.forEach(([u, v], i) => { nb.writeFloatLE(u, R.vb + i * R.stride + off2); nb.writeFloatLE(v, R.vb + i * R.stride + off2 + 4); });
    console.log('rdm already had a logo UV: rewrote it in place');
  } else { // insert a second T2f after the first one
    const b = R.b, k1 = R.descs.findIndex(d => d[0] === 4), ins = R.da + (k1 + 1) * 16, vbEnd = R.vb + R.n * R.stride, ns = R.stride + 8, D1 = 16, D2 = 16 + R.n * 8;
    const shift = v => v < ins ? v : v <= R.vb ? v + D1 : v >= vbEnd ? v + D2 : die('pointer into the middle of the vertex buffer');
    const ptrs = pointerScan(b, [[R.vb, vbEnd], [R.ib, R.ib + b.readUInt32LE(R.ib - 8) * b.readUInt32LE(R.ib - 4)]]);
    const desc = Buffer.alloc(16); [4, 7, 0, 2].forEach((v, j) => desc.writeUInt32LE(v, j * 4));
    const nvb = Buffer.alloc(R.n * ns), cut = off1 + 8;
    for (let i = 0; i < R.n; i++) { const a = R.vb + i * R.stride, z = i * ns; b.copy(nvb, z, a, a + cut); nvb.writeFloatLE(UV2[i][0], z + cut); nvb.writeFloatLE(UV2[i][1], z + cut + 4); b.copy(nvb, z + cut + 8, a + cut, a + R.stride); }
    nb = Buffer.concat([b.subarray(0, ins), desc, b.subarray(ins, R.vb), nvb, b.subarray(vbEnd)]);
    for (const p of ptrs) if (p.v >= ins) nb.writeUInt32LE(shift(p.v), shift(p.loc));
    nb.writeUInt32LE(R.dn + 1, R.da - 8); nb.writeUInt32LE(ns, shift(R.vb - 4));
    // verify by round trip: drop the new descriptor and UV bytes, restore the old pointers -> must equal the old file byte for byte
    const ovb = Buffer.alloc(R.n * R.stride); for (let i = 0; i < R.n; i++) { const a = R.vb + D1 + i * ns; nb.copy(ovb, i * R.stride, a, a + cut); nb.copy(ovb, i * R.stride + cut, a + cut + 8, a + ns); }
    const rev = Buffer.concat([nb.subarray(0, ins), nb.subarray(ins + D1, R.vb + D1), ovb, nb.subarray(vbEnd + D2)]);
    for (const p of ptrs) if (p.v >= ins) rev.writeUInt32LE(p.v, p.loc);
    rev.writeUInt32LE(R.dn, R.da - 8); rev.writeUInt32LE(R.stride, R.vb - 4);
    if (!rev.equals(b)) die('verify: round trip does not give the original file back, nothing written');
    console.log(`inserted a logo UV set: ${ptrs.filter(p => p.v >= ins).length} pointers moved, stride ${R.stride} -> ${ns}, ${b.length} -> ${nb.length} bytes`);
  }
  // re-read and compare geometry
  const tmp = rf + '.tmp'; fs.writeFileSync(tmp, nb); const N = readRdm(tmp); fs.unlinkSync(tmp);
  if (N.uvs.length !== 2 || N.n !== R.n || N.I.join() !== R.I.join() || N.P.some((p, i) => p.some((c, j) => c !== R.P[i][j])) || N.UV(0).some((u, i) => u[0] !== R.UV(0)[i][0] || u[1] !== R.UV(0)[i][1])) die('verify: geometry changed, nothing written');
  fs.writeFileSync(rf, nb); const U = N.UV(1);
  console.log(`wrote ${rf}\n  logo centre ${pl.r},${pl.d} m, size ${pl.s} m, view from ${F.view}; logo UV u ${Math.min(...U.map(v => v[0])).toFixed(2)}..${Math.max(...U.map(v => v[0])).toFixed(2)}, v ${Math.min(...U.map(v => v[1])).toFixed(2)}..${Math.max(...U.map(v => v[1])).toFixed(2)}`);
  if (o['no-cfg']) return;
  // cfg: material LOGO_ATLAS_ENABLED 1, cloth Name player_logo (vanilla names every logo cloth so)
  let blk = cl.block; const before = blk;
  blk = blk.replace(/<LOGO_ATLAS_ENABLED>0<\/LOGO_ATLAS_ENABLED>/g, '<LOGO_ATLAS_ENABLED>1</LOGO_ATLAS_ENABLED>');
  if (!/<LOGO_ATLAS_ENABLED>1</.test(blk)) console.log('  NOTE: the material has no LOGO_ATLAS_ENABLED tag: add <LOGO_ATLAS_ENABLED>1</LOGO_ATLAS_ENABLED> by hand');
  if (cl.nameAt >= 0) blk = blk.slice(0, cl.nameAt) + blk.slice(cl.nameAt).replace(/<Name>[^<]*<\/Name>/, '<Name>player_logo</Name>'); else console.log('  NOTE: the cloth has no <Name>: add <Name>player_logo</Name> by hand');
  if (blk !== before) { fs.writeFileSync(cfg, cl.text.slice(0, cl.start) + blk + cl.text.slice(cl.end)); console.log('  cfg: cloth #' + cl.index + ' -> Name player_logo, LOGO_ATLAS_ENABLED 1'); } else console.log('  cfg already set up');
}

const o = args();
({ list: cmdList, fit: cmdFit, preview: cmdPreview, apply: cmdApply }[o._[0]] || (() => { console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(0, 6).join('\n')); }))(o);

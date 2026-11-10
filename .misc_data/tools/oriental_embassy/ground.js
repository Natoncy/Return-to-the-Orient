// Oriental Embassy ground decal (6x4, extents 3.05 x 2.05): Old World grey herringbone paving like the vanilla
// factory grounds, with a light kerb along the footprint edge and soft shadow where the walls stand.
// - paving: min-cut image quilting from the clean middle of vanilla factory_06_ground (diff, norm and metal share
//   one coordinate map, so the maps stay consistent)
// - kerb: procedural slabs on a rounded rectangle at the footprint edge (normal R = 127 - k*dh/dx, G = 127 + k*dh/dy,
//   measured on factory_06's kerbs), the diffuse alpha (decal blend mask) fades just outside it
// - shadow: occupancy of the building's low geometry, rasterised top-down from the cfg
// Writes maps/oriental_embassy_ground_{diff,norm,metal}_{0,1,2}.dds (BC7, -sepalpha, dds only) and the cfg's DECAL.
// Run promote.js first (it rewrites the cfg). Needs D:\anno_data\1800 and C:\tools\texconv.exe.
//   node ground.js [--preview]   (--preview: PNGs into ./out only, nothing installed)
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const { decode, encode } = require(path.join(__dirname, '..', 'ornament_icons', 'png.js'));
const { loadScene, IDENT } = require(path.join(__dirname, '..', 'ornament_icons', 'scene.js'));

const MOD = path.join(__dirname, '..', '..', '..');
const DIR = 'data/graphics/buildings/orient/oriental_embassy/';
const CFG = path.join(MOD, DIR, 'oriental_embassy.cfg');
const VAN = 'D:/anno_data/1800/data/graphics/buildings/production/factory_06/maps/factory_06_ground_';
const PREVIEW = process.argv.includes('--preview');
const EX = 3.05, EZ = 2.05, K = 1536 / (2 * EX);          // px per unit (factory_06 density)
const W = 1536, H = Math.round(2 * EZ * K / 16) * 16;      // 1536 x 1040 (level 2 stays a multiple of 4 for BC7)
let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ---------- vanilla source maps ----------
const cache = path.join(__dirname, 'cache'); fs.mkdirSync(cache, { recursive: true });
function van(kind) {
  const png = path.join(cache, `factory_06_ground_${kind}_0.png`);
  if (!fs.existsSync(png)) execFileSync('C:/tools/texconv.exe', ['-nologo', '-y', '-ft', 'PNG', '-o', cache, VAN + kind + '_0.dds']);
  return decode(png);
}
const S = { diff: van('diff'), norm: van('norm'), metal: van('metal') };
const SW = S.diff.w;
const sLum = new Float32Array(SW * SW), sCav = new Float32Array(SW * SW);
for (let i = 0; i < SW * SW; i++) { const p = S.diff.px; sLum[i] = 0.3 * p[i * 4] + 0.59 * p[i * 4 + 1] + 0.11 * p[i * 4 + 2]; sCav[i] = S.metal.px[i * 4 + 3]; }

// ---------- quilting ----------
const P = 64, OV = 16, STEP = P - OV;
// clean paving between the kerbs; keeps clear of the inner soldier courses at x ~540-580 (y < 690) and x ~1230
const RECTS = [[630, 400, 1200, 1190], [300, 700, 1200, 1190]];
const cands = [];
for (const [x0, y0, x1, y1] of RECTS) for (let y = y0; y + P <= y1; y += 3) for (let x = x0; x + P <= x1; x += 3) cands.push([x, y]);
const mapX = new Int32Array(W * H).fill(-1), mapY = new Int32Array(W * H);
const oL = new Float32Array(W * H), oC = new Float32Array(W * H); // current output features
for (let by = 0; by * STEP < H; by++) for (let bx = 0; bx * STEP < W; bx++) {
  const X = bx * STEP, Y = by * STEP, hasL = bx > 0, hasT = by > 0;
  const err = (cx, cy, full) => {
    let e = 0, n = 0, st = full ? 1 : 2;
    for (let y = 0; y < P; y += st) for (let x = 0; x < P; x += st) {
      if (!((hasL && x < OV) || (hasT && y < OV))) continue;
      const ox = X + x, oy = Y + y; if (ox >= W || oy >= H) continue;
      const o = oy * W + ox, s = (cy + y) * SW + cx + x;
      e += (oL[o] - sLum[s]) ** 2 + 0.5 * (oC[o] - sCav[s]) ** 2; n++;
    }
    return n ? e / n : 0;
  };
  let pick;
  if (!hasL && !hasT) pick = cands[(rnd() * cands.length) | 0];
  else {
    const trial = []; for (let k = 0; k < 500; k++) { const c = cands[(rnd() * cands.length) | 0]; trial.push([err(c[0], c[1]), c]); }
    trial.sort((a, b) => a[0] - b[0]);
    const ok = trial.filter(t => t[0] <= trial[0][0] * 1.1 + 1); pick = ok[(rnd() * ok.length) | 0][1];
  }
  const [cx, cy] = pick;
  // min-cut seams through the overlap error
  const e2 = (x, y) => { const ox = X + x, oy = Y + y; if (ox >= W || oy >= H) return 0; const o = oy * W + ox, s = (cy + y) * SW + cx + x; return (oL[o] - sLum[s]) ** 2 + 0.5 * (oC[o] - sCav[s]) ** 2; };
  const vcut = new Int32Array(P).fill(0), hcut = new Int32Array(P).fill(0);
  if (hasL) { // vertical path, x in [0,OV)
    const D = []; for (let y = 0; y < P; y++) { D.push(new Float64Array(OV)); for (let x = 0; x < OV; x++) { let m = y ? Math.min(D[y - 1][x], x ? D[y - 1][x - 1] : 1e18, x < OV - 1 ? D[y - 1][x + 1] : 1e18) : 0; D[y][x] = e2(x, y) + m; } }
    let x = 0; for (let k = 1; k < OV; k++) if (D[P - 1][k] < D[P - 1][x]) x = k;
    for (let y = P - 1; y >= 0; y--) { vcut[y] = x; if (y) { let b = x; for (const d of [-1, 1]) { const xx = x + d; if (xx >= 0 && xx < OV && D[y - 1][xx] < D[y - 1][b]) b = xx; } x = b; } }
  }
  if (hasT) { // horizontal path, y in [0,OV)
    const D = []; for (let x = 0; x < P; x++) { D.push(new Float64Array(OV)); for (let y = 0; y < OV; y++) { let m = x ? Math.min(D[x - 1][y], y ? D[x - 1][y - 1] : 1e18, y < OV - 1 ? D[x - 1][y + 1] : 1e18) : 0; D[x][y] = e2(x, y) + m; } }
    let y = 0; for (let k = 1; k < OV; k++) if (D[P - 1][k] < D[P - 1][y]) y = k;
    for (let x = P - 1; x >= 0; x--) { hcut[x] = y; if (x) { let b = y; for (const d of [-1, 1]) { const yy = y + d; if (yy >= 0 && yy < OV && D[x - 1][yy] < D[x - 1][b]) b = yy; } y = b; } }
  }
  for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) {
    const ox = X + x, oy = Y + y; if (ox >= W || oy >= H) continue;
    if (hasL && x < vcut[y]) continue;
    if (hasT && y < hcut[x]) continue;
    const o = oy * W + ox, s = (cy + y) * SW + cx + x;
    mapX[o] = cx + x; mapY[o] = cy + y; oL[o] = sLum[s]; oC[o] = sCav[s];
  }
}

// ---------- output buffers from the coordinate map ----------
const D = new Float32Array(W * H * 4), N = new Float32Array(W * H * 4), Mt = new Float32Array(W * H * 4);
for (let i = 0; i < W * H; i++) {
  const s = (mapY[i] * SW + mapX[i]) * 4;
  for (let k = 0; k < 4; k++) { D[i * 4 + k] = S.diff.px[s + k]; N[i * 4 + k] = S.norm.px[s + k]; Mt[i * 4 + k] = S.metal.px[s + k]; }
}

// ---------- building shadow ----------
const scene = loadScene(MOD, DIR + 'oriental_embassy.cfg', IDENT, {});
const occ = new Uint8Array(W * H);
const toPx = v => [(v[0] + EX) * K, (EZ - v[2]) * K];
for (const t of scene.tris) {
  const p = t.v.map(toPx);
  const x0 = Math.max(0, Math.floor(Math.min(...p.map(q => q[0])))), x1 = Math.min(W - 1, Math.ceil(Math.max(...p.map(q => q[0]))));
  const y0 = Math.max(0, Math.floor(Math.min(...p.map(q => q[1])))), y1 = Math.min(H - 1, Math.ceil(Math.max(...p.map(q => q[1]))));
  const ar = (p[1][0] - p[0][0]) * (p[2][1] - p[0][1]) - (p[2][0] - p[0][0]) * (p[1][1] - p[0][1]);
  if (Math.abs(ar) < 1e-6) { for (const q of p) { const x = Math.round(q[0]), y = Math.round(q[1]); if (x >= 0 && y >= 0 && x < W && y < H) occ[y * W + x] = 1; } continue; }
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const px = x + 0.5, py = y + 0.5;
    const a = ((p[1][0] - px) * (p[2][1] - py) - (p[2][0] - px) * (p[1][1] - py)) / ar, b = ((p[2][0] - px) * (p[0][1] - py) - (p[0][0] - px) * (p[2][1] - py)) / ar;
    if (a >= -0.02 && b >= -0.02 && a + b <= 1.02) occ[y * W + x] = 1;
  }
}
// top-down footprint of the whole building (roofs included): close small gaps, fill enclosed holes,
// then darken under it with a soft falloff outside (like the dark building area on vanilla grounds)
const occF = blur(Float32Array.from(occ), 4);
const solid = new Float32Array(W * H); for (let i = 0; i < W * H; i++) solid[i] = occF[i] > 0.08 ? 1 : 0;
{ const seen = new Uint8Array(W * H), st = [];
  for (let x = 0; x < W; x++) st.push(x, (H - 1) * W + x); for (let y = 0; y < H; y++) st.push(y * W, y * W + W - 1);
  while (st.length) { const i = st.pop(); if (seen[i] || solid[i]) continue; seen[i] = 1; const x = i % W, y = (i / W) | 0;
    if (x > 0) st.push(i - 1); if (x < W - 1) st.push(i + 1); if (y > 0) st.push(i - W); if (y < H - 1) st.push(i + W); }
  for (let i = 0; i < W * H; i++) if (!seen[i]) solid[i] = 1; }
const ao = blur(solid, 9);
for (let i = 0; i < W * H; i++) {
  const k = 1 - 0.45 * Math.min(1, ao[i] * 1.3);
  for (let c = 0; c < 3; c++) D[i * 4 + c] *= k;
  Mt[i * 4 + 3] *= 0.85 + 0.15 * k; // a bit more cavity in the shadow
}
function blur(src, r) { // box blur x3 ~ gaussian
  let a = Float32Array.from(src), b = new Float32Array(src.length);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < H; y++) { let s = 0; for (let x = -r; x <= r; x++) s += a[y * W + clamp(x, 0, W - 1)]; for (let x = 0; x < W; x++) { b[y * W + x] = s / (2 * r + 1); s += a[y * W + clamp(x + r + 1, 0, W - 1)] - a[y * W + clamp(x - r, 0, W - 1)]; } }
    for (let x = 0; x < W; x++) { let s = 0; for (let y = -r; y <= r; y++) s += b[clamp(y, 0, H - 1) * W + x]; for (let y = 0; y < H; y++) { a[y * W + x] = s / (2 * r + 1); s += b[clamp(y + r + 1, 0, H - 1) * W + x] - b[clamp(y - r, 0, H - 1) * W + x]; } }
  }
  return a;
}

// ---------- kerb + alpha ----------
const INSET = 0.05 * K, KW = 13, RC = 64, SLAB = 60; // px
const hx = W / 2 - INSET, hy = H / 2 - INSET, cxp = W / 2, cyp = H / 2;
function sdBox(x, y) { const qx = Math.abs(x - cxp) - (hx - RC), qy = Math.abs(y - cyp) - (hy - RC); return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - RC; }
const hash = n => { let h = (n * 374761393) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function slabOf(x, y) { // slab id and distance (px) to the nearest slab joint along the kerb
  const qx = Math.abs(x - cxp) - (hx - RC), qy = Math.abs(y - cyp) - (hy - RC);
  if (qx > 0 && qy > 0) { // corner: 3 slabs per quarter arc
    const ang = Math.atan2(qy, qx), f = ang / (Math.PI / 2) * 3, i = Math.floor(f);
    const corner = (x > cxp ? 1 : 0) + (y > cyp ? 2 : 0);
    return { id: 1000 + corner * 10 + i, dj: Math.min(f - i, i + 1 - f) * (Math.PI / 2 / 3) * (RC - KW / 2) };
  }
  const along = qx > qy ? y : x, side = qx > qy ? (x > cxp ? 1 : 3) : (y > cyp ? 2 : 0);
  const off = hash(side + 7) * SLAB, f = (along + off) / SLAB, i = Math.floor(f);
  // jitter the joints a little per slab
  const j0 = (hash(side * 977 + i) - 0.5) * 14, j1 = (hash(side * 977 + i + 1) - 0.5) * 14;
  const d0 = (f - i) * SLAB - j0, d1 = (i + 1 - f) * SLAB + j1;
  return { id: side * 100000 + i, dj: Math.min(d0, d1) };
}
const KERB = [124, 120, 113];
const hgt = new Float32Array(W * H), kerbA = new Float32Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x, sd = sdBox(x + 0.5, y + 0.5), t = -sd; // t: px inside the outer kerb edge
  // alpha: full inside the kerb's outer edge, gone 4 px outside (with a little noise)
  const a = 1 - smooth(-0.5, 4 + (hash(i) - 0.5) * 1.5, sd);
  D[i * 4 + 3] = 255 * a;
  if (t >= -1 && t <= KW + 1) {
    const s = slabOf(x + 0.5, y + 0.5);
    const joint = smooth(0.6, 2.2, s.dj);
    const prof = smooth(0, 2.5, t) * smooth(0, 2.5, KW - t);     // bevel on both long sides
    hgt[i] = prof * (0.75 + 0.25 * joint) * (1 + (hash(s.id) - 0.5) * 0.15);
    const k = Math.min(1, prof * 1.4) * joint;                      // slab body
    const v = 1 + (hash(s.id * 3 + 1) - 0.5) * 0.14 + (hash(i * 7) - 0.5) * 0.08;
    const edge = 0.82 + 0.18 * smooth(0, 3, t);                    // outer edge darker
    const col = KERB.map(c => c * v * edge);
    const dark = [70, 66, 60];                                      // joints / gap to the paving
    const m = Math.max(k, t < 0 ? 0 : 0);
    kerbA[i] = Math.min(1, smooth(-1, 0.5, t) * smooth(-1, 0.5, KW - t));
    for (let c = 0; c < 3; c++) D[i * 4 + c] = D[i * 4 + c] * (1 - kerbA[i]) + (col[c] * m + dark[c] * (1 - m)) * kerbA[i];
    Mt[i * 4] = Mt[i * 4 + 1] = Mt[i * 4 + 2] = 0;
    Mt[i * 4 + 3] = Mt[i * 4 + 3] * (1 - kerbA[i]) + (180 + 74 * m) * kerbA[i];
    N[i * 4 + 3] = N[i * 4 + 3] * (1 - kerbA[i]) + (60 + 25 * m) * kerbA[i];
  } else if (t > KW + 1 && t < KW + 9) { // grime on the paving along the kerb
    const g = 1 - 0.18 * (1 - smooth(KW + 1, KW + 9, t));
    for (let c = 0; c < 3; c++) D[i * 4 + c] *= g;
  }
}
// kerb normals from the height field, blended over the paving normals
const NK = 70;
for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
  const i = y * W + x; if (!kerbA[i]) continue;
  const dx = (hgt[i + 1] - hgt[i - 1]) / 2, dy = (hgt[i + W] - hgt[i - W]) / 2;
  const r = 127 - NK * dx, g = 127 + NK * dy;
  N[i * 4] = N[i * 4] * (1 - kerbA[i]) + r * kerbA[i];
  N[i * 4 + 1] = N[i * 4 + 1] * (1 - kerbA[i]) + g * kerbA[i];
  N[i * 4 + 2] = 0;
}

// ---------- write ----------
const outDir = PREVIEW ? path.join(__dirname, 'out') : fs.mkdtempSync(path.join(os.tmpdir(), 'embassy_ground_'));
fs.mkdirSync(outDir, { recursive: true });
function level(src, w, h, f) { // box downscale by f
  const w2 = w / f, h2 = h / f, o = new Float32Array(w2 * h2 * 4);
  for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) for (let c = 0; c < 4; c++) {
    let s = 0; for (let j = 0; j < f; j++) for (let k = 0; k < f; k++) s += src[((y * f + j) * w + x * f + k) * 4 + c];
    o[(y * w2 + x) * 4 + c] = s / (f * f);
  }
  return o;
}
const toBuf = a => { const b = Buffer.alloc(a.length); for (let i = 0; i < a.length; i++) b[i] = clamp(Math.round(a[i]), 0, 255); return b; };
const written = [];
for (const [kind, buf] of [['diff', D], ['norm', N], ['metal', Mt]]) for (const lv of [0, 1, 2]) {
  const f = 1 << lv, img = f === 1 ? buf : level(buf, W, H, f), file = path.join(outDir, `oriental_embassy_ground_${kind}_${lv}.png`);
  encode(file, W / f, H / f, 4, toBuf(img)); written.push(file);
}
console.log('maps', W + 'x' + H, 'in', outDir);
if (PREVIEW) process.exit(0);

const maps = path.join(MOD, DIR, 'maps');
for (const f of written) {
  execFileSync('C:/tools/texconv.exe', ['-nologo', '-y', '-sepalpha', '-f', 'BC7_UNORM', '-m', '0', '-o', maps, f]);
  fs.unlinkSync(f);
}
fs.rmdirSync(outDir);

// ---------- DECAL in the cfg (factory_06 settings: no height map, no grass blades) ----------
const m = p => `data/graphics/buildings/orient/oriental_embassy/maps/oriental_embassy_ground_${p}.psd`;
const decal = `<Decals>
		<Config>
			<ConfigType>DECAL</ConfigType>
			<Materials>
				<Config>
					<ConfigType>MATERIAL</ConfigType>
					<Name></Name>
					<ShaderID>1</ShaderID>
					<VertexFormat>P3f_N3f_G3f_T2f_T1f_T1f_T1f</VertexFormat>
					<NumBonesPerVertex>0</NumBonesPerVertex>
					<METALLIC_TEX_ENABLED>1</METALLIC_TEX_ENABLED>
					<cModelMetallicTex>${m('metal')}</cModelMetallicTex>
					<cUseTerrainTinting>0</cUseTerrainTinting>
					<Common>Common</Common>
					<DIFFUSE_ENABLED>1</DIFFUSE_ENABLED>
					<cModelDiffTex>${m('diff')}</cModelDiffTex>
					<NORMAL_ENABLED>1</NORMAL_ENABLED>
					<cModelNormalTex>${m('norm')}</cModelNormalTex>
					<cDiffuseColor.r>1.000000</cDiffuseColor.r>
					<cDiffuseColor.g>1.000000</cDiffuseColor.g>
					<cDiffuseColor.b>1.000000</cDiffuseColor.b>
					<cGlossinessFactor>1.000000</cGlossinessFactor>
					<cOpacity>1.000000</cOpacity>
					<HEIGHT_MAP_ENABLED>0</HEIGHT_MAP_ENABLED>
					<cHeightMap>data/graphics/effects/default_height.png</cHeightMap>
					<cParallaxScale>1.000000</cParallaxScale>
					<PARALLAX_MAPPING_ENABLED>1</PARALLAX_MAPPING_ENABLED>
					<SELF_SHADOWING_ENABLED>0</SELF_SHADOWING_ENABLED>
					<TerrainAdaption>TerrainAdaption</TerrainAdaption>
					<ADJUST_TO_TERRAIN_HEIGHT>0</ADJUST_TO_TERRAIN_HEIGHT>
					<VERTEX_COLORED_TERRAIN_ADAPTION>0</VERTEX_COLORED_TERRAIN_ADAPTION>
					<ABSOLUTE_TERRAIN_ADAPTION>0</ABSOLUTE_TERRAIN_ADAPTION>
					<Environment>Environment</Environment>
					<cUseLocalEnvironmentBox>1</cUseLocalEnvironmentBox>
					<cEnvironmentBoundingBox.x>0.000000</cEnvironmentBoundingBox.x>
					<cEnvironmentBoundingBox.y>0.000000</cEnvironmentBoundingBox.y>
					<cEnvironmentBoundingBox.z>0.000000</cEnvironmentBoundingBox.z>
					<cEnvironmentBoundingBox.w>4.000000</cEnvironmentBoundingBox.w>
					<Glow>Glow</Glow>
					<GLOW_ENABLED>0</GLOW_ENABLED>
					<cEmissiveColor.r>2.000000</cEmissiveColor.r>
					<cEmissiveColor.g>2.000000</cEmissiveColor.g>
					<cEmissiveColor.b>2.000000</cEmissiveColor.b>
				</Config>
			</Materials>
			<Type>Terrain</Type>
			<Name></Name>
			<Extents.x>${EX.toFixed(6)}</Extents.x>
			<Extents.y>0.250000</Extents.y>
			<Extents.z>${EZ.toFixed(6)}</Extents.z>
			<TexCoords.x>0.000000</TexCoords.x>
			<TexCoords.y>0.000000</TexCoords.y>
			<TexCoords.z>1.000000</TexCoords.z>
			<TexCoords.w>1.000000</TexCoords.w>
			<OnStreets>1</OnStreets>
			<FadeDuration>1000</FadeDuration>
			<HasDetails>0</HasDetails>
			<DetailMeshEmpty>1</DetailMeshEmpty>
		</Config>
	</Decals>`;
let cfg = fs.readFileSync(CFG, 'utf8');
cfg = cfg.replace(/<Decals>[\s\S]*?<\/Decals>/, decal);
fs.writeFileSync(CFG, cfg);
console.log('installed dds into', maps, 'and the DECAL into', CFG);

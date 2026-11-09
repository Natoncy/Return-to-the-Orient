// Lighthouse construction-stage feedback (.fc): the Grand Mosque's actor block + dummies fitted to each stage's decks.
// node gen.js [--write] [--fresh]   see README.md
const fs = require('fs'), path = require('path');
const { render, overlay, R, K, N } = require('./hm.js');
const MOD = path.resolve(__dirname, '../../..');
const MOSQUE = MOD + '/data/graphics/1404_import/buildings/public/south/sultan_mosque/s_sultan_mosque_unfinished_00.fc';
const LH = MOD + '/data/graphics/buildings/orient/lighthouse/iaam/orient/005kustengebaude/leuchtturm';
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const CENTER = [0, -0.2];

// ---- placements: [x, level, z, yaw]; each is snapped to the nearest free floor at that level within 0.45 m.
// yaw: number (deg; the unit faces local +x = (cos a, 0, -sin a)) | 'wall:<deg>' (nearest wall within ±45° of deg) | 'tower' | omitted (seeded random)
// levels: 0.83 deck, 0.34 side terraces, 5.63 gallery, 8.96 stage-3 top floor, 3.6/3.72/3.14/2.58 stage-1/2 scaffold tops
const crowdL = [[-3.85, 0.34, 0.2], [-3.75, 0.34, 0.55], [-3.9, 0.34, 0.9], [-3.75, 0.34, 1.25], [-3.9, 0.34, 1.6], [-3.75, 0.34, 2.0]].map(p => [...p, 'tower']);
const crowdR = [[3.85, 0.34, 0.2], [3.75, 0.34, 0.6], [3.9, 0.34, 0.95], [3.75, 0.34, 1.35], [3.9, 0.34, 1.7], [3.8, 0.34, 2.1]].map(p => [...p, 'tower']);
const STAGES = {
  1: {
    Crowd_01: crowdL, Crowd_02: crowdR,
    foreman: [[-2.2, 0.83, -2.3, 'tower'], [2.7, 0.83, 0.9, 'tower']],
    Hammerer_Down: [[-0.3, 3.6, -1.1], [0.35, 3.6, -0.95], [1.1, 3.72, -0.7], [-0.1, 3.14, 1.5]],
    Hammerer_UP: [[-1.05, 0.83, -1.0, 'wall:0'], [1.5, 0.83, -0.6, 'wall:180'], [2.25, 0.83, -0.8, 'wall:180'], [0.0, 0.83, 0.1, 'wall:90']],
    Shoveler: [[-1.3, 0.83, 0.3], [-0.3, 0.83, 0.4], [-1.9, 0.83, 1.0], [-1.6, 0.83, -1.8], [2.6, 0.83, -2.4], [-2.8, 0.83, -2.6]],
    Sweeper: [[-3.0, 0.83, 2.0], [2.5, 0.83, 2.0], [0.9, 0.83, -3.0], [-1.7, 0.83, -3.0]],
  },
  2: {
    Crowd_01: crowdL, Crowd_02: crowdR,
    foreman: [[-2.2, 0.83, -2.5, 'tower'], [3.0, 0.83, -0.6, 'tower']],
    Hammerer_Down: [[-1.25, 5.63, -0.95], [1.2, 5.63, -1.3], [1.25, 5.63, 0.35], [-1.2, 5.63, 1.0], [1.0, 2.58, -2.1]],
    Hammerer_UP: [[-1.0, 5.63, -0.55, 'wall:0'], [1.0, 5.63, -0.2, 'wall:180'], [-2.05, 0.83, -0.9, 'wall:0'], [2.05, 0.83, 0.2, 'wall:180']],
    Shoveler: [[-3.5, 0.83, -1.2], [3.3, 0.83, -1.6], [0.6, 0.83, 2.1], [1.6, 0.83, -2.9]],
    Sweeper: [[-3.0, 0.83, 2.0], [2.5, 0.83, 2.0], [-0.9, 0.83, -3.0]],
  },
  3: {
    Crowd_01: crowdL, Crowd_02: crowdR,
    foreman: [[-2.2, 0.83, -2.5, 'tower'], [3.2, 0.83, 1.2, 'tower']],
    Hammerer_Down: [[-0.8, 8.96, -0.6], [0.8, 8.96, -0.8], [-0.6, 8.96, 0.6], [-1.4, 5.63, -1.0], [1.4, 5.63, 0.8]],
    Hammerer_UP: [[-1.4, 5.63, 0.2, 'wall:0'], [1.45, 5.63, -0.6, 'wall:180'], [-2.1, 0.83, 0.2, 'wall:0'], [2.1, 0.83, -0.6, 'wall:180']],
    Shoveler: [[-3.4, 0.83, -1.2], [3.3, 0.83, -1.6], [0.6, 0.83, 2.1]],
    Sweeper: [[-3.0, 0.83, 2.0], [2.5, 0.83, 2.0], [-0.9, 0.83, -3.0], [1.4, 0.83, -3.0]],
  },
};
const ORDER = ['Crowd_01', 'Crowd_02', 'foreman', 'Hammerer_Down', 'Hammerer_UP', 'Shoveler', 'Sweeper'];
const RADIUS = { Crowd_01: 0.12, Crowd_02: 0.12, Hammerer_UP: 0.1 };

// ---- template: group Ids + dummy Ids from the mosque, actor tail verbatim
const tpl = fs.readFileSync(MOSQUE, 'latin1');
const head = tpl.slice(0, tpl.indexOf('\r\t\t<Groups>'));
const tail = tpl.slice(tpl.indexOf('\r\t\t</Groups>'));
const ids = {};
for (const g of ORDER) {
  const a = tpl.indexOf(`<Name>${g}</Name>`), b = tpl.indexOf('</Dummies>', a);
  const seg = tpl.slice(a, b);
  ids[g] = { group: +seg.match(/<Id>(\d+)<\/Id>/)[1], dummies: {} };
  for (const m of seg.matchAll(/<Name>(\w+?)_(\d+)<\/Name>\r\t*<hasValue>1<\/hasValue>\r\t*<Id>(\d+)<\/Id>/g)) ids[g].dummies[+m[2]] = +m[3];
}
let idCounter = +tpl.match(/<IdCounter>(\d+)<\/IdCounter>/)[1];

// ---- height maps
const hm = {};
const H = (s, x, z) => { const i = Math.round((z + R) * K), j = Math.round((x + R) * K); return i < 0 || j < 0 || i >= N || j >= N ? -99 : hm[s][i * N + j]; };
// nothing above the floor within r; at least 70% of the disk is floor (slatted scaffold decks have gaps); centre on floor
function okAt(s, x, z, y, r) {
  let n = 0, f = 0;
  const c = H(s, x, z); if (c < y - 0.05 || c > y + 0.07) return false;
  for (let dz = -r; dz <= r + 1e-9; dz += 1 / K) for (let dx = -r; dx <= r + 1e-9; dx += 1 / K) {
    if (dx * dx + dz * dz > r * r) continue;
    const h = H(s, x + dx, z + dz); n++;
    if (h > y + 0.07) return false;
    if (h >= y - 0.05) f++;
  }
  return f >= 0.7 * n;
}
function snap(s, x, z, y, r, taken) {
  let best = null;
  for (let d = 0; d <= 0.45 + 1e-9; d += 1 / K) {
    for (let k = 0; k < Math.max(1, Math.round(d * K * 6)); k++) {
      const t = k / Math.max(1, Math.round(d * K * 6)) * 2 * Math.PI, px = x + d * Math.cos(t), pz = z + d * Math.sin(t);
      if (!okAt(s, px, pz, y, r)) continue;
      if (taken.some(q => Math.hypot(q[0] - px, q[2] - pz) < 0.26 && Math.abs(q[1] - y) < 1)) continue;
      best = [px, pz]; break;
    }
    if (best) break;
  }
  return best;
}
function wallYaw(s, x, z, y, hint) {
  let best = null;
  for (const a of [0, 5, -5, 10, -10, 15, -15, 20, -20, 25, -25, 30, -30, 35, -35, 40, -40, 45, -45].map(o => hint + o)) {
    const t = a * Math.PI / 180, dx = Math.cos(t), dz = -Math.sin(t);
    for (let d = 0.1; d <= 0.7; d += 0.02) if (H(s, x + dx * d, z + dz * d) > y + 0.6) { best = { d, a }; break; }
    if (best) break;
  }
  return best;
}
let seed = 1404;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

const fmt = v => (Math.abs(v) < 5e-7 ? 0 : v).toFixed(6);
function dummyXml(name, id, p, yawRad) {
  const w = Math.cos(yawRad / 2), qy = Math.sin(yawRad / 2);
  const rotY = ((-yawRad % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const T = '\t\t\t\t\t';
  return [
    `${T}<i>`, `${T}\t<Name>${name}</Name>`, `${T}\t<hasValue>1</hasValue>`, `${T}\t<Id>${id}</Id>`, `${T}\t<HeightAdaptationMode>0</HeightAdaptationMode>`,
    `${T}\t<Orientation>`, `${T}\t\t<w>${fmt(w)}</w>`, `${T}\t\t<x>0.000000</x>`, `${T}\t\t<y>${fmt(qy)}</y>`, `${T}\t\t<z>0.000000</z>`, `${T}\t</Orientation>`,
    `${T}\t<Transformer>`, `${T}\t\t<Flags>8</Flags>`,
    `${T}\t\t<BBoxCenter>`, `${T}\t\t\t<xf>0.000000</xf>`, `${T}\t\t\t<zf>0.000000</zf>`, `${T}\t\t</BBoxCenter>`,
    `${T}\t\t<BBoxXExtents>`, `${T}\t\t\t<xf>0.000000</xf>`, `${T}\t\t\t<zf>0.000000</zf>`, `${T}\t\t</BBoxXExtents>`,
    `${T}\t\t<BBoxZExtents>`, `${T}\t\t\t<xf>0.000000</xf>`, `${T}\t\t\t<zf>0.000000</zf>`, `${T}\t\t</BBoxZExtents>`,
    `${T}\t</Transformer>`,
    `${T}\t<Position>`, `${T}\t\t<x>${fmt(p[0])}</x>`, `${T}\t\t<y>${fmt(p[1])}</y>`, `${T}\t\t<z>${fmt(p[2])}</z>`, `${T}\t</Position>`,
    `${T}\t<RotationY>${fmt(rotY)}</RotationY>`,
    `${T}\t<Extents>`, `${T}\t\t<x>0.100000</x>`, `${T}\t\t<y>0.100000</y>`, `${T}\t\t<z>0.100000</z>`, `${T}\t</Extents>`,
    `${T}</i>`].join('\r');
}

const write = process.argv.includes('--write');
let problems = 0;
for (const s of [1, 2, 3]) {
  const cfg = `data/graphics/buildings/orient/lighthouse/iaam/orient/005kustengebaude/leuchtturm/stufe0${s}/leuchtturm0${s}.cfg`;
  const bin = path.join(OUT, `lh${s}.hm.bin`), base = path.join(OUT, `lh${s}.rgb.bin`);
  if (process.argv.includes('--fresh') || !fs.existsSync(bin)) { const r = render(cfg); fs.writeFileSync(bin, Buffer.from(r.h.buffer)); fs.writeFileSync(base, r.img); }
  hm[s] = new Float32Array(new Uint8Array(fs.readFileSync(bin)).buffer);
  const taken = [], json = [], groupsXml = [];
  for (const g of ORDER) {
    const list = STAGES[s][g] || [];
    const dx = [];
    list.forEach(([x, y, z, yaw], i) => {
      const r = RADIUS[g] ?? 0.15;
      const sp = snap(s, x, z, y, r, taken);
      if (!sp) { console.log(`stage ${s} ${g}_${i}: NO SPOT near (${x}, ${y}, ${z})`); problems++; return; }
      const fy = H(s, sp[0], sp[1]);
      let a;
      if (typeof yaw === 'string' && yaw.startsWith('wall')) { const w = wallYaw(s, sp[0], sp[1], fy, +yaw.split(':')[1]); if (!w) { console.log(`stage ${s} ${g}_${i}: no wall`); problems++; a = 0; } else a = w.a * Math.PI / 180; }
      else if (yaw === 'tower') a = Math.atan2(-(CENTER[1] - sp[1]), CENTER[0] - sp[0]);
      else if (typeof yaw === 'number') a = yaw * Math.PI / 180;
      else a = rnd() * 2 * Math.PI;
      a = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const p = [sp[0], fy, sp[1]];
      taken.push(p);
      const moved = Math.hypot(sp[0] - x, sp[1] - z);
      if (moved > 0.2) console.log(`stage ${s} ${g}_${i}: moved ${moved.toFixed(2)} m`);
      dx.push({ name: `${g}_${dx.length}`, p, a });
      json.push({ g, p, yaw: a });
    });
    const gid = ids[g].group;
    const body = dx.map((d, k) => {
      let id = ids[g].dummies[k];
      if (id == null) id = ++idCounter;
      return dummyXml(d.name, id, d.p, d.a);
    });
    groupsXml.push(['\t\t\t<i>', `\t\t\t\t<Name>${g}</Name>`, '\t\t\t\t<Groups />', '\t\t\t\t<hasValue>1</hasValue>', `\t\t\t\t<Id>${gid}</Id>`,
      ...(body.length ? ['\t\t\t\t<Dummies>', ...body, '\t\t\t\t</Dummies>'] : ['\t\t\t\t<Dummies />']), '\t\t\t</i>'].join('\r'));
    console.log(`stage ${s} ${g}: ${dx.length}`);
  }
  overlay(path.join(OUT, `stage${s}_dummies.png`), fs.readFileSync(base), json);
  const out = head.replace(/<IdCounter>\d+<\/IdCounter>/, `<IdCounter>${idCounter}</IdCounter>`) + '\r\t\t<Groups>\r' + groupsXml.join('\r') + tail;
  const dst = write ? `${LH}/stufe0${s}/leuchtturm0${s}.fc` : path.join(OUT, `leuchtturm0${s}.fc`);
  fs.writeFileSync(dst, out, 'latin1');
  console.log('wrote', dst);
}
if (problems) console.log(problems, 'PROBLEMS');

// Construction cost audit (2026-11-16). node costaudit.js <S3.xml> <mod root> [guid,guid → SHOW resolved cost lists]
// Flags Mod3 costs other than money/palm planks/rammed earth/mosaics, and materials unlocked after the building (upgrades: after NextGUID).
// Stages come from triggers/assets_intermediate_orient_X_Y.xml (pools expanded); creative triggers ignored.
const fs = require('fs'), path = require('path');
const S = fs.readFileSync(process.argv[2], 'utf8');
const ROOT = process.argv[3];
const ALLOWED = { '1010017': 'money', '1400201040': 'palm planks', '1404009000': 'rammed earth', '1404000256': 'mosaics' };
// User-approved exceptions (2026-11-17): creative-mode buildings, Kontor I main/imperial (timber), scholar residence sultan's seals,
// weapons + advanced weapons on gun buildings (HarborBuildingAttacker), steam motors on the tractor module, steel beams on the rails.
const EXCEPT = (g, ing, tplName, name) =>
  /CreativeMode|creative_/i.test(name) || ['1404000218', '1404000862'].includes(g) || (g === '1404001113' && ing === '1404000207') ||
  (tplName === 'HarborBuildingAttacker' && ['1010221', '1010223'].includes(ing)) || (g === '1404005010' && ing === '1010224') ||
  (g === '119035' && ing === '1010218');
const DEF = ['1010017', '1010196', '1010205', '1010218', '1010207', '1010202'];

// ---- index assets with balanced <Asset> tags
const A = new Map();
{
  const re = /<Asset>|<\/Asset>/g;
  let m, stack = [];
  while ((m = re.exec(S))) {
    if (m[0] === '<Asset>') {
      const nx = S.slice(re.lastIndex, re.lastIndex + 40);
      if (/^\s*</.test(nx)) stack.push(m.index); else stack.push(-1);
    } else {
      const st = stack.pop();
      if (st >= 0 && stack.every(x => x < 0)) {
        const blk = S.slice(st, re.lastIndex);
        const g = (blk.match(/<Standard>\s*<GUID>(\d+)<\/GUID>/) || [])[1];
        if (g) A.set(g, blk);
      }
    }
  }
}
const names = {};
for (const [g, b] of A) names[g] = (b.match(/<Standard>\s*<GUID>\d+<\/GUID>\s*<Name>([^<]*)/) || [])[1] || '';
const tpl = g => ((A.get(g) || '').match(/^<Asset>\s*(?:<BaseAssetGUID>\d+<\/BaseAssetGUID>\s*)?<Template>([^<]*)/) || [])[1];
const base = g => ((A.get(g) || '').match(/^<Asset>\s*(?:<Template>[^<]*<\/Template>\s*)?<BaseAssetGUID>(\d+)/) || [])[1];
function chainTpl(g) { for (let d = 0; g && d < 10; d++, g = base(g)) { const t = tpl(g); if (t) return t; } }
function regions(g) { for (let d = 0; g && d < 10; d++, g = base(g)) { const r = ((A.get(g) || '').match(/<AssociatedRegions>([^<]*)</) || [])[1]; if (r !== undefined) return r; } return ''; }

function parseCosts(blk, wrap) {
  const c = blk.match(wrap);
  if (!c) return null;
  const out = []; let pos = 0;
  for (const it of c[1].split(/<Item>/).slice(1)) {
    const idx = +((it.match(/<InheritedIndex>(\d+)/) || [])[1] ?? pos);
    out.push({ idx, ing: (it.match(/<Ingredient>(\d+)/) || [])[1], amt: (it.match(/<Amount>(\d+)/) || [])[1], inh: /<InheritedIndex>/.test(it) });
    pos++;
  }
  return out;
}
function resolve(g, wrap, depth = 0) {
  const blk = A.get(g); if (!blk || depth > 10) return null;
  const own = parseCosts(blk, wrap);
  const b = base(g);
  if (!b) return own && own.map((x, i) => ({ ing: x.ing ?? DEF[x.idx] ?? DEF[i], amt: x.amt ?? '0' }));
  const bb = resolve(b, wrap, depth + 1) || [];
  if (!own) return bb;
  return own.map((x, i) => { const f = x.inh ? bb[x.idx] || {} : {}; return { ing: x.ing ?? f.ing ?? DEF[x.idx], amt: x.amt ?? f.amt ?? '0' }; });
}
const W_COST = /<Cost>\s*<Costs>([\s\S]*?)<\/Costs>/;
const W_UP = /<UpgradeCost>([\s\S]*?)<\/UpgradeCost>/;
const W_FLOOR = /<AddFloorCost>([\s\S]*?)<\/AddFloorCost>/;

// ---- stages from trigger files
const TD = path.join(ROOT, 'data/config/export/main/asset/assets_includes/triggers');
const stageOf = {}; // guid -> {stage, via}
const STAGE_FILE = f => { const m = f.match(/orient_(\d)_(\d)\.xml$/); return m ? +(m[1] + '.' + m[2]) : null; };
const pools = {};
for (const [g, b] of A) if (tpl(g) === 'AssetPool') pools[g] = [...b.matchAll(/<Asset>(\d+)<\/Asset>/g)].map(x => x[1]);
function mark(g, st, via, seen = new Set()) {
  if (seen.has(g)) return; seen.add(g);
  if (!stageOf[g] || stageOf[g].stage > st) stageOf[g] = { stage: st, via };
  if (pools[g]) for (const m of pools[g]) mark(m, st, via + ' > pool ' + g, seen);
}
const trigFiles = fs.readdirSync(TD).filter(f => f.endsWith('.xml') && !/creative|index/.test(f));
const extra = {};
for (const f of trigFiles) {
  const src = fs.readFileSync(path.join(TD, f), 'utf8');
  // split per top-level trigger asset by its Standard GUID
  const parts = src.split(/<Standard>\s*<GUID>/).slice(1);
  for (const p of parts) {
    const tg = p.match(/^(\d+)/)[1];
    const nm = (p.match(/<Name>([^<]*)/) || [])[1] || '';
    let st = STAGE_FILE(f);
    const nmS = nm.match(/(\d)\.(\d)/);
    if (st == null && nmS && /Orient \d\.\d|Intermediate Orient \d\.\d/.test(nm)) st = +(nmS[1] + '.' + nmS[2]);
    if (/Skyscraper/.test(nm)) st = 'sky ' + nm.match(/(\d\.\d)/)[1];
    if (/creative/i.test(nm) || /retired|retire/.test(nm)) continue;
    if (st == null) { extra[tg] = nm + ' (' + f + ')'; st = 9; }
    for (const ul of p.matchAll(/<UnlockAssets>([\s\S]*?)<\/UnlockAssets>/g))
      for (const a of ul[1].matchAll(/<Asset>(\d+)<\/Asset>/g)) mark(a[1], typeof st === 'number' ? st : 2.45, f.replace('assets_intermediate_orient_', '').replace('.xml', '') + ' ' + tg + ' ' + nm);
  }
}
// enter session file: stage 1.0
// ---- audit
const fmt = st => st == null ? '?' : String(st);
const rows = [];
const matStage = g => stageOf[g] ? stageOf[g].stage : null;
for (const [g] of A) {
  if (!/(^|;)Mod3(;|$)/.test(regions(g))) continue;
  const lists = [['cost', W_COST], ['upgrade', W_UP], ['floor', W_FLOOR]];
  for (const [kind, w] of lists) {
    let nextG = null;
    if (kind === 'upgrade') { const n = (A.get(g).match(/<NextGUID>(\d+)/) || [])[1]; if (!n || n === '0') continue; nextG = n; }
    const r = resolve(g, w); if (!r) continue;
    const used = r.filter(x => x.amt && x.amt !== '0');
    if (!used.length) continue;
    const bst = nextG ? matStage(nextG) : matStage(g);
    const issues = [];
    for (const x of used) {
      if (!ALLOWED[x.ing] && EXCEPT(g, x.ing, chainTpl(g), names[g] || '')) continue;
      if (!ALLOWED[x.ing]) issues.push('MATERIAL ' + x.ing + ' ' + (names[x.ing] || '') + ' x' + x.amt);
      else if (x.ing !== '1010017') {
        const ms = matStage(x.ing);
        if (typeof bst === 'number' && (ms == null || ms > bst)) issues.push('LATE ' + ALLOWED[x.ing] + ' (' + fmt(ms) + ')');
      }
    }
    rows.push({ next: nextG, g, name: names[g], tpl: chainTpl(g), kind, stage: bst, via: stageOf[g] && stageOf[g].via, costs: used.map(x => (ALLOWED[x.ing] || x.ing) + ' ' + x.amt).join(', '), issues });
  }
}
console.log('material stages:', Object.keys(ALLOWED).map(k => ALLOWED[k] + '=' + fmt(matStage(k)) + ' via ' + (stageOf[k] || {}).via).join('\n  '));
console.log('triggers without stage:', JSON.stringify(extra, null, 1));
rows.sort((a, b) => (a.issues.length ? 0 : 1) - (b.issues.length ? 0 : 1) || String(a.stage).localeCompare(String(b.stage)));
for (const r of rows) console.log((r.issues.length ? '!! ' : '   ') + r.g + ' ' + r.name + ' [' + r.tpl + '] ' + r.kind + (r.next ? '->' + r.next : '') + ' stage ' + fmt(r.stage) + ' | ' + r.costs + (r.issues.length ? ' | ' + r.issues.join('; ') : '') + (r.issues.length ? '\n      via ' + r.via : ''));
console.log('total', rows.length, 'issues', rows.filter(r => r.issues.length).length);
if (process.argv[4]) for (const g of process.argv[4].split(',')) {
  for (const [k, w] of [['cost', W_COST], ['upgrade', W_UP]]) { const r = resolve(g, w); if (r) console.log('SHOW', g, names[g], k, r.map((x, i) => i + ':' + (ALLOWED[x.ing] || names[x.ing] || x.ing) + '=' + x.amt).join('  ')); }
}

// Resolve Cost/Costs through BaseAssetGUID for every asset in a patched assets.xml; report Mod3 assets still costing <product>.
// node costcheck.js S1.xml 114402
const fs = require('fs');
const s = fs.readFileSync(process.argv[2], 'utf8');
const P = process.argv[3] || '114402';
const A = new Map();
const re = /<Asset>\s*</g;
let m;
while ((m = re.exec(s))) {
  const end = s.indexOf('</Values>', m.index);
  if (end < 0) break;
  const blk = s.slice(m.index, end);
  const g = (blk.match(/<GUID>(\d+)<\/GUID>/) || [])[1];
  if (!g) continue;
  const base = (blk.match(/^<Asset>\s*(?:<Template>[^<]*<\/Template>\s*)?<BaseAssetGUID>(\d+)/) || [])[1];
  const regions = (blk.match(/<AssociatedRegions>([^<]*)</) || [])[1];
  const name = (blk.match(/<Name>([^<]*)</) || [])[1];
  let costs = null;
  const c = blk.match(/<Cost>\s*<Costs>([\s\S]*?)<\/Costs>/);
  if (c) {
    costs = [];
    const items = c[1].split(/<Item>/).slice(1);
    let pos = 0;
    for (const it of items) {
      if (/^\s*<VectorElement>/.test(it) === false && /<\/VectorElement>/.test(it) === false && !/<Ingredient>|<Amount>/.test(it)) { pos++; continue; }
      const idx = +((it.match(/<InheritedIndex>(\d+)/) || [])[1] ?? pos);
      costs.push({ idx, ing: (it.match(/<Ingredient>(\d+)/) || [])[1], amt: (it.match(/<Amount>(\d+)/) || [])[1], inh: /<InheritedIndex>/.test(it) });
      pos++;
    }
  }
  A.set(g, { base, regions, name, costs });
}
function resolve(g, depth = 0) {
  const a = A.get(g);
  if (!a || depth > 10) return [];
  const own = a.costs;
  if (!a.base) return (own || []).map(x => ({ ...x }));
  const b = resolve(a.base, depth + 1);
  if (!own) return b;
  const out = [];
  for (const x of own) {
    const from = x.inh ? b[x.idx] || {} : {};
    out.push({ ing: x.ing ?? from.ing, amt: x.amt ?? from.amt });
  }
  return out;
}
let n = 0;
for (const [g, a] of A) {
  let r = a.regions, cur = a;
  for (let d = 0; !r && cur && cur.base && d < 10; d++) { cur = A.get(cur.base); r = cur && cur.regions; }
  if (!r || !/Mod3/.test(r)) continue;
  const res = resolve(g);
  const hit = res.find(x => x.ing === P && x.amt !== '0' && x.amt !== undefined);
  if (hit) { n++; console.log(g, a.name, 'base', a.base, 'amount', hit.amt); }
}
console.log('Mod3 assets costing', P + ':', n);

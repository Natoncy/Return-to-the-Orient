// Adds the static body model to each portrait cfg and grows the cfg/ifo bounds downwards.
const fs = require('fs');
const MOD = process.argv[2];
const YMIN = -6.6;
const fx = v => v.toFixed(6);
for (const t of ['01', '02']) {
  // each portrait is a submod, shared_portraits/Natoncy_portrait_1404_<nn>_<name> (../portrait_1404/picker.json)
  const sub = fs.readdirSync(`${MOD}/shared_portraits`).find(d => d.startsWith('Natoncy_portrait_1404_') && d.endsWith(t === '01' ? '_nomad' : '_envoy'));
  const dir = `${MOD}/shared_portraits/${sub}/data/graphics/portraits/orient/resident_orient_tier${t}`;
  const name = `resident_orient_tier${t}`;
  // ---- cfg
  let s = fs.readFileSync(`${dir}/${name}.cfg`, 'latin1');
  if (s.includes('_body.rdm')) throw new Error('already patched ' + t);
  const m0 = s.indexOf('<Models>'), mStart = s.indexOf('<Config>', m0);
  const mEnd = s.indexOf('</Animations>', mStart);
  const close = s.indexOf('</Config>', mEnd) + '</Config>'.length; // end of the bust MODEL
  const lineStart = s.lastIndexOf('\n', mStart) + 1;
  let blk = s.slice(lineStart, close);
  blk = blk.replace(/\r?\n[ \t]*<Animations>[\s\S]*<\/Animations>/, '');
  const rep = (a, b) => { if (!blk.includes(a)) throw new Error(t + ' missing ' + a); blk = blk.replace(a, b); };
  rep('<Name>02___Default</Name>', '<Name>body</Name>');
  rep('<VertexFormat>P4h_N4b_G4b_B4b_T2h_I4b_W4b</VertexFormat>', '<VertexFormat>P4h_N4b_G4b_B4b_T2h</VertexFormat>');
  rep('<NumBonesPerVertex>4</NumBonesPerVertex>', '<NumBonesPerVertex>0</NumBonesPerVertex>');
  rep(`maps/${name}_diff.psd`, `maps/${name}_body_diff.psd`);
  const BS = String.fromCharCode(92);
  rep(`rdm${BS}${name}.rdm`, `rdm${BS}${name}_body.rdm`);
  s = s.slice(0, close) + '\r\n' + blk + s.slice(close);
  // bounds: keep the top, extend the bottom to YMIN
  const esc = tag => tag.split('.').join('[.]');
  const num = tag => { const m = s.match(new RegExp(`<${esc(tag)}>([-0-9.]+)</`)); return +m[1]; };
  const setn = (tag, v) => { s = s.replace(new RegExp(`(<${esc(tag)}>)[-0-9.]+(</)`), `$1${fx(v)}$2`); };
  const grow = (C, E, R) => {
    const top = num(C + '.y') + num(E + '.y'), c = (top + YMIN) / 2, e = (top - YMIN) / 2;
    setn(C + '.y', c); setn(E + '.y', e);
    setn(R, Math.hypot(num(E + '.x'), e, num(E + '.z')));
    return { c, e };
  };
  const bb = grow('Center', 'Extent', 'Radius'), mb = grow('MeshCenter', 'MeshExtent', 'MeshRadius');
  fs.writeFileSync(`${dir}/${name}.cfg`, s, 'latin1');
  // ---- ifo (same numbers, BoundingBox and MeshBoundingBox)
  let f = fs.readFileSync(`${dir}/${name}.ifo`, 'latin1');
  const setBox = (box, v) => {
    const i = f.indexOf(`<${box}>`), j = f.indexOf(`</${box}>`, i);
    let b = f.slice(i, j);
    b = b.replace(/(<Position>[\s\S]*?<yf>)[-0-9.eE]+(<\/yf>)/, `$1${+v.c.toFixed(6)}$2`);
    b = b.replace(/(<Extents>[\s\S]*?<yf>)[-0-9.eE]+(<\/yf>)/, `$1${+v.e.toFixed(6)}$2`);
    f = f.slice(0, i) + b + f.slice(j);
  };
  setBox('BoundingBox', bb); setBox('MeshBoundingBox', mb);
  fs.writeFileSync(`${dir}/${name}.ifo`, f, 'latin1');
  console.log(t, 'box y', bb, 'mesh y', mb);
}

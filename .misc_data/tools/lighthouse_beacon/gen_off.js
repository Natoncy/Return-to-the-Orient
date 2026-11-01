// Builds the "light off" lighthouse variant next to leuchtturm04.cfg:
//   beacon_off.cfg       = beacon.cfg without lights and without lens glow
//   leuchtturm04_off.cfg = leuchtturm04.cfg with the beacon FILE pointing at beacon_off.cfg, no ANIMATION_TRANSFORM
//   leuchtturm04_off.ifo = copy of leuchtturm04.ifo
const fs = require('fs');
const path = require('path');
const dir = process.argv[2];
const rd = f => fs.readFileSync(path.join(dir, f), 'utf8');
const wr = (f, s) => { fs.writeFileSync(path.join(dir, f), s); console.log('wrote', f, s.length); };
const must = (cond, msg) => { if (!cond) throw new Error(msg); };

// beacon_off.cfg
let b = rd('beacon.cfg');
const lightsRe = /(\t<Lights>)[\s\S]*?(\r\n\t<\/Lights>)/;
must(lightsRe.test(b), 'Lights block not found');
b = b.replace(lightsRe, '$1\r\n$2');
must((b.match(/<GLOW_ENABLED>1<\/GLOW_ENABLED>/g) || []).length === 1, 'GLOW_ENABLED');
b = b.replace('<GLOW_ENABLED>1</GLOW_ENABLED>', '<GLOW_ENABLED>0</GLOW_ENABLED>');
b = b.replace(/<cEmissiveColor\.([rgb])>2<\/cEmissiveColor\.\1>/g, '<cEmissiveColor.$1>0</cEmissiveColor.$1>');
must(!/ConfigType>LIGHT/.test(b) && !/cEmissiveColor\.[rgb]>2/.test(b), 'beacon_off check');
wr('beacon_off.cfg', b);

// leuchtturm04_off.cfg
let m = rd('leuchtturm04.cfg');
const animRe = /\r\n {16}<Config>\r\n {20}<ConfigType>ANIMATION_TRANSFORM<\/ConfigType>[\s\S]*?\r\n {16}<\/Config>(?=\r\n {12}<\/Transformer>\r\n {12}<Name>beacon<\/Name>)/;
must(animRe.test(m), 'beacon ANIMATION_TRANSFORM not found');
m = m.replace(animRe, '');
const ref = 'leuchtturm/stufe04/beacon.cfg</FileName>';
must(m.split(ref).length === 2, 'beacon FileName');
m = m.replace(ref, 'leuchtturm/stufe04/beacon_off.cfg</FileName>');
must(!/ANIMATION_TRANSFORM/.test(m), 'animation left');
wr('leuchtturm04_off.cfg', m);

fs.copyFileSync(path.join(dir, 'leuchtturm04.ifo'), path.join(dir, 'leuchtturm04_off.ifo'));
console.log('copied leuchtturm04_off.ifo');

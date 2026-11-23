// Usage: node patch_template.js <orig.a7t> <out.a7t> [--patch]
// Rebuilds a single-file RDA 2.2 (.a7t) around gamedata.data; with --patch sets the
// session AreaIDs grid (2880x2880 uint16) to 1 everywhere.
const fs=require('fs'),zlib=require('zlib');
const [src,dst,flag]=process.argv.slice(2);
const b=fs.readFileSync(src);
const first=Number(b.readBigUInt64LE(784));
const flags=b.readUInt32LE(first),n=b.readUInt32LE(first+4),dirSize=Number(b.readBigUInt64LE(first+8));
if(flags!==1||n!==1)throw new Error('unexpected block layout');
const dir=zlib.inflateSync(b.subarray(first-dirSize,first));
const o=Number(dir.readBigUInt64LE(520)),c=Number(dir.readBigUInt64LE(528)),s=Number(dir.readBigUInt64LE(536));
const data=Buffer.from(zlib.inflateSync(b.subarray(o,o+c)));
if(data.length!==s)throw new Error('size mismatch');
if(flag==='--patch'){
  // locate: AreaIDs tag (0x3f) -> x attr (0x800d)=2880, y attr (0x800e)=2880, val attr (0x800f) varint 16588800
  const sig=Buffer.from('3f000d8004400b00000e8004400b00000f8080c0f407','hex');
  const at=data.indexOf(sig);if(at<0||data.indexOf(sig,at+1)>=0)throw new Error('AreaIDs signature not unique/found');
  const start=at+sig.length,len=2880*2880*2;
  for(let i=start;i<start+len;i++)if(data[i]!==0&&data[i]!==1)throw new Error('unexpected byte at '+i);
  if(data.readUInt16LE(start+len)!==0)throw new Error('no closing tag after val');
  for(let i=0;i<len;i+=2){data[start+i]=1;data[start+i+1]=0;}
  console.log('patched AreaIDs at',start,'len',len);
}
const comp=zlib.deflateSync(data,{level:1});
const hdr=Buffer.from(b.subarray(0,792));
const dataOff=792;
const blockOff=dataOff+comp.length; // dir goes before block header
const ndir=Buffer.from(dir);ndir.writeBigUInt64LE(BigInt(dataOff),520);ndir.writeBigUInt64LE(BigInt(comp.length),528);ndir.writeBigUInt64LE(BigInt(data.length),536);ndir.writeBigUInt64LE(BigInt(Math.floor(Date.now()/1000)),544);
const cdir=zlib.deflateSync(ndir,{level:1});
const bh=Buffer.alloc(32);const bOff=dataOff+comp.length+cdir.length;
bh.writeUInt32LE(1,0);bh.writeUInt32LE(1,4);bh.writeBigUInt64LE(BigInt(cdir.length),8);bh.writeBigUInt64LE(560n,16);bh.writeBigUInt64LE(BigInt(bOff+32),24);
hdr.writeBigUInt64LE(BigInt(bOff),784);
fs.writeFileSync(dst,Buffer.concat([hdr,comp,cdir,bh]));
console.log('wrote',dst,bOff+32,'bytes (orig',b.length+')');

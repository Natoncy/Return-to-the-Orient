const fs=require("fs"),path=require("path");
const ROOT=process.argv[2];
const u=JSON.parse(fs.readFileSync("unused.json"));const un=new Map(u);
const used=new Map(JSON.parse(fs.readFileSync("used.json")));
// "model folder" = top folder under graphics/... at depth: data/graphics/buildings/orient/X, data/graphics/1404_import/a/b/c/X, else dirname
function unit(k){const p=k.split("/");
 if(k.startsWith("data/graphics/buildings/orient/sbm/")||k.startsWith("data/graphics/buildings/orient/")&&/\/iaam\/|\/gvdb\//.test(k)){const i=p.findIndex((x,j)=>j>4&&/^(maps|rdm|anims|anim|textures)$/.test(x));return (i>0?p.slice(0,i):p.slice(0,-1)).join("/");}
 if(p[2]==="buildings"&&p[3]==="orient") return p.slice(0,5).join("/");
 if(p[2]==="1404_import"){const i=p.findIndex((x,j)=>j>3&&/^(maps|rdm|anims|anim)$/.test(x));return (i>0?p.slice(0,i):p.slice(0,-1)).join("/");}
 const i=p.findIndex((x,j)=>j>2&&/^(maps|rdm|anims|anim)$/.test(x));return (i>0?p.slice(0,i):p.slice(0,-1)).join("/");}
const all=[];(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const q=path.join(d,e.name);if(e.isDirectory())w(q);else all.push(path.relative(ROOT,q).split(path.sep).join("/").toLowerCase())}})(path.join(ROOT,"data"));
const g={};for(const k of all){const x=unit(k);g[x]=g[x]||{n:0,u:0,us:0};g[x].n++;if(un.has(k)){g[x].u++;g[x].us+=un.get(k)}}
const full=Object.entries(g).filter(([k,v])=>v.u===v.n).sort((a,b)=>b[1].us-a[1].us);
const part=Object.entries(g).filter(([k,v])=>v.u&&v.u<v.n).sort((a,b)=>b[1].us-a[1].us);
const sum=a=>a.reduce((s,[k,v])=>s+v.us,0)/1e6;
console.log("FULLY UNUSED units",full.length,sum(full).toFixed(0)+"MB");for(const [k,v] of full)console.log("  "+(v.us/1e6).toFixed(1).padStart(6)+"MB "+String(v.n).padStart(4)+" "+k);
console.log("PARTIAL units",part.length,sum(part).toFixed(0)+"MB");for(const [k,v] of part)console.log("  "+(v.us/1e6).toFixed(1).padStart(6)+"MB "+v.u+"/"+v.n+" "+k);
fs.writeFileSync("groups.json",JSON.stringify({full,part}));

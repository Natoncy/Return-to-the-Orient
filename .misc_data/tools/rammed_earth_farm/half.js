const PNG=require('../canal_orient/png.js');const [src,dst]=process.argv.slice(2);const t=PNG.decode(src);const w=t.w>>1,h=t.h>>1,o=PNG.create(w,h);
for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let q=0;q<4;q++){let s=0;for(const[dx,dy]of[[0,0],[1,0],[0,1],[1,1]])s+=t.data[((2*y+dy)*t.w+2*x+dx)*4+q];o.data[(y*w+x)*4+q]=Math.round(s/4);}
PNG.encode(dst,o,true);

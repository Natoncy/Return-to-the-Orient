import sys,os,struct,numpy as np
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from repack import decode0, load_mesh
def uvs(p):
    b=open(p,'rb').read(); vb,n,sz,idx,raw=load_mesh(b)
    return raw[:,sz-4:].copy().view(np.float16).astype(float),idx
def sample(img,uv):
    H,W=img.shape[:2]; x=np.clip((uv[:,0]*W).astype(int),0,W-1); y=np.clip((uv[:,1]*H).astype(int),0,H-1); return img[y,x].astype(float)
old,new,pairs=sys.argv[1],sys.argv[2],sys.argv[3:]
uo,idx=uvs(old); un,idx2=uvs(new); assert (idx==idx2).all()
# barycentric samples, slightly inside triangles
bc=np.array([(a,b_,1-a-b_) for a in np.linspace(.05,.9,8) for b_ in np.linspace(.05,.9,8) if a+b_<=.95])
def pts(uv): return np.einsum('kj,tjc->tkc',bc,uv[idx]).reshape(-1,2)
po,pn=pts(uo),pts(un)
for i in range(0,len(pairs),2):
    a=sample(decode0(pairs[i]),po); c=sample(decode0(pairs[i+1]),pn)
    d=np.abs(a-c)
    print('%-40s mean abs diff RGBA %s  p99 %s'%(os.path.basename(pairs[i+1]),d.mean(0).round(2).tolist(),np.percentile(d,99,axis=0).round(1).tolist()))

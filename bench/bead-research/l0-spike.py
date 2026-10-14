"""Research-only NumPy FFT L0-gradient smoothing baseline.

Independent implementation of the half-quadratic objective described by Xu et al.
2011; not their supplied code. Private JSON contains image data and stays ignored.
After smoothing, snap to the source palette and restore hard Keep/dark/boundary
constraints. The composited discrete output is NOT the unconstrained L0 optimum.
"""
import json, sys
import numpy as np
from collections import deque

def lab(rgb):
    rgb = np.clip(rgb, 0, 1)
    linear = np.where(rgb <= .04045, rgb/12.92, ((rgb+.055)/1.055)**2.4)
    lms = np.cbrt(linear @ np.array([[.4122214708,.2119034982,.0883024619],
                                    [.5363325363,.6806995451,.2817188376],
                                    [.0514459929,.1073969566,.6299787005]]))
    return lms @ np.array([[.2104542553,1.9779984951,.0259040371],
                           [.793617785,-2.428592205,.7827717662],
                           [-.0040720468,.4505937099,-.808675766]])

def smooth(image, strength):
    h,w,_ = image.shape
    denom = (2-2*np.cos(2*np.pi*np.arange(h)/h))[:,None] + (2-2*np.cos(2*np.pi*np.arange(w)/w))[None,:]
    source_fft = np.fft.fft2(image, axes=(0,1))
    result = image.copy()
    beta = strength*2
    while beta < 1e5:
        dx = np.roll(result,-1,axis=1)-result
        dy = np.roll(result,-1,axis=0)-result
        remove = np.sum(dx*dx+dy*dy,axis=2) < strength/beta
        dx[remove] = 0
        dy[remove] = 0
        div = np.roll(dx,1,axis=1)-dx + np.roll(dy,1,axis=0)-dy
        result = np.fft.ifft2((source_fft+beta*np.fft.fft2(div,axes=(0,1)))/(1+beta*denom[...,None]),axes=(0,1)).real
        beta *= 2
    return np.clip(result,0,1)

def opaque_extension(source, labels):
    """Nearest visible-cell extension by a multi-source four-neighbor flood.

    Avoid a synthetic black transparent matte in the continuous optimization.
    Ties resolve in source scan order; this is not semantic shape reconstruction.
    """
    h,w = labels.shape
    filled = source.copy()
    seen = labels >= 0
    queue = deque(map(tuple,np.argwhere(seen)))
    while queue:
        y,x = queue.popleft()
        for yy,xx in [(y-1,x),(y,x-1),(y,x+1),(y+1,x)]:
            if 0<=yy<h and 0<=xx<w and not seen[yy,xx]:
                seen[yy,xx] = True
                filled[yy,xx] = filled[y,x]
                queue.append((yy,xx))
    return filled

def main():
    job = json.load(open(sys.argv[1], encoding='utf-8'))
    outputs = []
    for case in job['cases']:
        h,w = case['height'],case['width']
        source = np.array(case['rgb'],dtype=float).reshape(h,w,3)/255
        palette = np.array([[int(c[i:i+2],16) for i in [1,3,5]] for c in case['colors']],dtype=float)/255
        plab = lab(palette)
        allowed = np.flatnonzero(plab[:,0]>=.5)
        original = np.array(case['labels'],dtype=int)
        locked = np.array(case['locked'],dtype=bool)
        extended = np.pad(opaque_extension(source, original.reshape(h,w)),((8,8),(8,8),(0,0)),mode='edge')
        for strength in job['strengths']:
            filtered = smooth(extended,strength)[8:8+h,8:8+w]
            labels = original.copy()
            if len(allowed):
                flab = lab(filtered.reshape(-1,3))
                nearest = allowed[np.argmin(np.sum((flab[:,None,:]-plab[allowed][None,:,:])**2,axis=2),axis=1)]
                labels[~locked] = nearest[~locked]
            outputs.append({'id':case['id'],'strength':strength,'labels':labels.tolist()})
    json.dump(outputs,open(sys.argv[2],'w',encoding='utf-8'))
    print(json.dumps({'cases':len(job['cases']),'outputs':len(outputs)}))

if __name__ == '__main__':
    main()

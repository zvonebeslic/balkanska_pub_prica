import cv2,numpy as np,sys,subprocess
from pathlib import Path
K=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(3,3))
def cut(bgr):
    bgr=bgr.copy(); h,w=bgr.shape[:2]; bgr[:47,294:]=0
    p=bgr.max(2)
    m=cv2.morphologyEx((p>12).astype('uint8'),cv2.MORPH_CLOSE,K,iterations=1)
    n,l,stats,_=cv2.connectedComponentsWithStats(m,8)
    m=(l==1+np.argmax(stats[1:,cv2.CC_STAT_AREA])).astype('uint8')
    n,l,stats,_=cv2.connectedComponentsWithStats(1-m,8)
    for i in range(1,n):
        x,y,ww,hh,a=stats[i]
        if x>0 and y>0 and x+ww<w and y+hh<h and a<=150: m[l==i]=1
    core=cv2.erode(m,K,iterations=1); edge=cv2.dilate(m,K,iterations=1)
    a=np.zeros_like(p); a[core>0]=255
    band=(edge>0)&(core==0)
    a[band]=np.clip((p[band].astype(float)-6)*255/39,0,255).astype('uint8')
    rgb=bgr.astype(np.float32); den=np.maximum(a.astype(np.float32)/255,0.2)
    rgb[band]=np.minimum(255,rgb[band]/den[band,None]); rgb[a==0]=0
    return np.dstack((rgb.astype('uint8'),a))
root=Path('kraljevstvo-znanja')
src=root/'media/korner-henry.mp4'
out=root/'media/korner-henry-clean.webm'
cap=cv2.VideoCapture(str(src))
assert cap.isOpened()
cmd=['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','bgra','-s','896x896','-r','24','-i','-','-an','-c:v','libvpx-vp9','-pix_fmt','yuva420p','-b:v','0','-crf','17','-deadline','realtime','-cpu-used','6','-row-mt','1','-auto-alt-ref','0',str(out)]
p=subprocess.Popen(cmd,stdin=subprocess.PIPE); n=0
while True:
    ok,f=cap.read()
    if not ok:break
    assert f.shape[:2]==(448,448)
    x=cut(f); a=x[:,:,3].astype(np.float32)/255; col=x[:,:,:3].astype(np.float32)*a[:,:,None]
    a=cv2.resize(a,(896,896),interpolation=cv2.INTER_LINEAR); col=cv2.resize(col,(896,896),interpolation=cv2.INTER_CUBIC)
    color=np.clip(col/np.maximum(a[:,:,None],1e-4),0,255).astype('uint8'); color[a<0.005]=0
    x=np.dstack([color,np.round(a*255).astype('uint8')]);p.stdin.write(x.tobytes());n+=1
p.stdin.close();assert p.wait()==0;assert n==141
import json
meta=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(out)]))
v=meta['streams'][0];assert v['width']==896 and v['height']==896 and v['tags']['alpha_mode']=='1'
# Only switch the corner, leave the golf rendering unchanged.
js=root/'kz-knowledge-flags.js'; html=root/'index.html'
s=js.read_text(); h=html.read_text()
old='corner:"./media/korner-henry.mp4?v=2"'
assert s.count(old)==1
s=s.replace(old,'corner:"./media/korner-henry-clean.webm?v=1"')
old='if(kind==="golf"||(kind==="corner"&&!video.dataset.cornerFallback)){'
assert s.count(old)==1
s=s.replace(old,'if(kind==="golf"){')
old='c.width=kind==="golf"?416:448;c.height=kind==="golf"?384:448;'
assert s.count(old)==1
s=s.replace(old,'c.width=kind==="golf"?416:896;c.height=kind==="golf"?384:896;')
assert h.count('./kz-knowledge-flags.js?v=11')==1
h=h.replace('./kz-knowledge-flags.js?v=11','./kz-knowledge-flags.js?v=12')
js.write_text(s);html.write_text(h)
print('Verified frames',n,'size',out.stat().st_size)

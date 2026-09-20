// Pin the physical mid-fold point to the visible divider. Screen Y grows upward.
// Each half eases into that same point, so the ball turns ON the hinge, in front
// of it, rather than arcing across an unrelated part of the image.
export function foldScreenY(lowerY,upperY,height,t){
 const middle=height/2;
 const smooth=v=>v*v*(3-2*v);
 if(t<=.5){const u=smooth(t*2);return Math.min(lowerY,middle-8)*(1-u)+middle*u;}
 const u=smooth((t-.5)*2);return middle*(1-u)+Math.max(upperY,middle+8)*u;
}

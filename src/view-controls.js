// Small inspection movements only; independent from the physical hinge.
export const VIEW_LIMITS={yaw:8,pitch:5,minZoom:.92,maxZoom:1.1};
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function limitedView(yaw=0,pitch=0,zoom=1){
 return {yaw:clamp(yaw,-VIEW_LIMITS.yaw,VIEW_LIMITS.yaw),pitch:clamp(pitch,-VIEW_LIMITS.pitch,VIEW_LIMITS.pitch),zoom:clamp(zoom,VIEW_LIMITS.minZoom,VIEW_LIMITS.maxZoom)};
}

export const CHARACTER_RADIUS = .64;
export const STRIKE_DURATION = .42;
export const STRIKE_COOLDOWN = .9;
export const CHARACTERS = [
 {name:'Bico',color:0xd8ee93,side:-1,phase:0},
 {name:'Bola',color:0xb8adf0,side:1,phase:Math.PI},
];
// Deterministic patrol: readable arcs, no random last-second dodges.
export function characterPose(index,time,strikeAge=Infinity){
 const c=CHARACTERS[index];
 const x=c.side*1.65+Math.sin(time*.82+c.phase)*1.08;
 const punch=strikeAge<STRIKE_DURATION?Math.sin(Math.PI*strikeAge/STRIKE_DURATION):0;
 return {x,y:.66+punch*.12,z:10.95-punch*1.65};
}
// A subtle physical draft prevents indefinite rest on the flat lower deck.
export function applyReturnDraft(ball){
 const p=ball.translation(),v=ball.linvel();
 ball.resetForces(true);
 if(p.z>2.8&&p.y<1.8&&v.z>-.25)ball.addForce({x:0,y:0,z:ball.mass()*1.3},true);
}

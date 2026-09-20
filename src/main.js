import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-800.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-700.css';
import './style.css';
import { initPhysics, Simulation } from './physics.js';
import { Graphics } from './graphics.js';
import { STEP } from './level.js';
const $=s=>document.querySelector(s);
const lab=new URLSearchParams(location.search).has('lab');document.body.className=lab?'lab':'player';
if(!lab){
 for(const type of ['gesturestart','gesturechange','gestureend'])document.addEventListener(type,e=>e.preventDefault(),{passive:false});
 document.addEventListener('touchstart',e=>{if(e.touches.length>1)e.preventDefault();},{passive:false});
}
const speechUntil=[0,0];let nextQuip=6;
function say(index,text){$('#speech-'+index).textContent=text;$('#speech-'+index).hidden=false;speechUntil[index]=sim.time+2.1;}
function defend(index){if(sim.lesson.home){if(sim.assistHome()){toast('Fuu! Traz o Pingo para o centro.');sound('launch');}return;}if(sim.level<3)return;if(sim.headbutt(index)){say(index,index===0?'Deixa comigo!':'Eu? Agora?!');sound('launch');}}
let bestScore=0;try{bestScore=Number(localStorage.getItem('ricochete-best'))||0;}catch{}
function showResult(won){
 const newBest=sim.score>bestScore;bestScore=Math.max(bestScore,sim.score);try{localStorage.setItem('ricochete-best',String(bestScore));}catch{}
 $('#victory').hidden=false;$('#result-label').textContent=won?`CAIXA ${sim.level} / COMPLETA`:'FIM DA TENTATIVA';$('#again').textContent=won&&sim.level<5?'Abrir a próxima caixa':'Jogar outra vez';
 $('#result-title').textContent=won?(sim.lesson.home?'Pingo chegou a casa!':sim.level<5?'Caixa conquistada.':'Calaste as duas.'):'Quase. Mais uma?';
 $('#result-text').textContent=`${sim.score} pontos · ${sim.saves} defesas. ${newBest?'Novo recorde!':'Recorde: '+bestScore+'.'} ${won?sim.lesson.name+'.':'Tenta outra vez.'}`;
}
let lessonIndex=lab?5:1;
let sim,graphics,power=72,aim=0,desiredAngle=115,showPath=true,overview=true,predictionDirty=true,predictionAt=0,predictionAngle=-1,paused=false;
let openingPhase=lab?'playing':'closed',openingTime=0;
let audioContext,audioOn=true,lastTone=0,toastTimer,resetAt=0,resultDelay=0;
function sound(type,item,intensity=1){
 if(!audioOn)return;
 try{audioContext??=new (window.AudioContext||window.webkitAudioContext)();audioContext.resume();const t=audioContext.currentTime;if(type!=='bell'&&t-lastTone<.07)return;lastTone=t;
 if(type==='bell'){
  const fundamental=item?.size?.[0]>.4?660:item?.pos?.[0]<0?880:1046;
  for(const [ratio,level,decay] of [[1,.10,1.7],[2.76,.045,1.05],[5.4,.018,.48]]){
   const o=audioContext.createOscillator(),g=audioContext.createGain();o.type='sine';o.frequency.value=fundamental*ratio;
   g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(level*Math.max(.25,intensity),t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+decay);
   o.connect(g);g.connect(audioContext.destination);o.start(t);o.stop(t+decay+.02);o.onended=()=>{o.disconnect();g.disconnect();};
  }return;
 }
 const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type=type==='bell'?'sine':'triangle';osc.frequency.setValueAtTime({target:740,bell:1100,hoop:880,impact:150,launch:240,crossing:520,won:1046}[type]||300,t);osc.frequency.exponentialRampToValueAtTime(type==='impact'?60:440,t+.18);gain.gain.setValueAtTime(.05,t);gain.gain.exponentialRampToValueAtTime(.001,t+.35);osc.connect(gain).connect(audioContext.destination);osc.start(t);osc.stop(t+.36);}catch{/* Audio never blocks physics. */}
}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2200);}
function updateControls(){
 $('#shot-direction').textContent=Math.abs(aim)<.5?'Ao centro':`${Math.abs(Math.round(aim))}° ${aim<0?'à esquerda':'à direita'}`;$('#shot-strength').value=power;$('#shot-strength-value').textContent=`${Math.round(power)}%`;if(graphics)graphics.aimPower=power;$('#power').value=power;$('#power-value').innerHTML=`${Math.round(power)}<span>%</span>`;$('#aim').value=aim;$('#aim-value').textContent=`${aim>0?'+':''}${aim.toFixed(0)}°`;
 $('#angle').value=desiredAngle;$('#angle-value').textContent=`${Math.round(desiredAngle)}°`;
 document.querySelectorAll('[data-angle]').forEach(b=>b.classList.toggle('active',Number(b.dataset.angle)===desiredAngle));
 const radians=(180-desiredAngle)*Math.PI/180;$('#hinge-arm').setAttribute('d',`M34 75L${34-63*Math.cos(radians)} ${75-63*Math.sin(radians)}`);
 $('#hinge-arc').setAttribute('d',`M65 75A31 31 0 0 0 ${34-31*Math.cos(radians)} ${75-31*Math.sin(radians)}`);
 $('#angle-description').textContent=desiredAngle===90?'CAIXA VERTICAL':desiredAngle===180?'MUNDO ABERTO':'NOVOS CAMINHOS';
 if(graphics)graphics.launcher.rotation.y=-aim*Math.PI/180;
}
function updateHUD(){
 $('#score').textContent=String(sim.score).padStart(4,'0');$('#hits').textContent=`${sim.targets.size} / ${sim.lesson.targets}`;$('#shots').textContent=String(sim.shots).padStart(2,'0');
 for(let i=0;i<3;i++){$(`#goal-${i}`).hidden=i>=sim.lesson.targets;$(`#target-${i}`).classList.toggle('hit',sim.targets.has(i));$(`#goal-${i}`).classList.toggle('hit',sim.targets.has(i));}
 if(sim.lesson.home){$('#goal-0').textContent=sim.homeOpen?'NINHO':'SINO';$('#goal-0').setAttribute('aria-label',sim.homeOpen?'Sino ativado. Leva Pingo ao ninho.':'Toca no sino para abrir o ninho.');}
 $('#player-score').textContent=String(sim.score).padStart(4,'0');$('#lives').textContent='● '.repeat(sim.lives).trim()||'—';$('#lives-label').textContent=`${sim.lives} ${sim.lives===1?'BOLA':'BOLAS'}`;
 sim.characters.forEach((c,i)=>{const name=i===0?'bico':'bola';$('#'+name).disabled=!['ready','flying'].includes(sim.state);$('#'+name+'-state').textContent=sim.state!=='flying'?'À ESPERA DA BOLA':c.cooldown>0?'A RECUPERAR…':'PREME PARA DEFENDER';});
 $('#play-instruction').textContent=sim.state==='ready'?sim.lesson.hint:sim.state==='recovering'?'Bola recuperada — podes voltar a lançar.':sim.state==='feeding'?'A carregar a próxima bola…':sim.state==='flying'?(sim.lesson.home?(sim.homeOpen?'O ninho abriu! Usa o fole quando o Pingo regressar.':'Toca no sino para abrir o ninho.') :sim.level<3?'Segue a bola até ao alvo.':'Arrasta para posicionar. Mantém premido para defender.'):sim.state==='lost'?'Uma escapou. Os alvos mantêm-se.':(sim.state==='won'&&sim.level<5?'Continua para a próxima caixa.':'Toca em jogar outra vez para recomeçar.');
 $('#phase').textContent={recovering:'BOLA RECUPERADA',feeding:'A CARREGAR',ready:'PRONTO A LANÇAR',flying:'BOLA EM JOGO',lost:'UMA BOLA ESCAPOU',gameover:'FIM DA PARTIDA',won:'NÍVEL COMPLETO'}[sim.state];
 $('#launch').disabled=sim.state!=='ready';$('#aim-hint').style.opacity=sim.state==='ready'?'1':'0';
 $('#ball-location').textContent=`BOLA / ${sim.inUpper?'CAIXA SUPERIOR':'BASE'}`;$('#seam-angle').textContent=`${Math.round(sim.angle)}°`;
}
function openBox(){if(openingPhase!=='closed')return;openingPhase='opening';openingTime=0;$('#open-box').disabled=true;$('#open-box').textContent='A abrir…';sound('launch');}
function launch(){if(openingPhase!=='playing')return;if(sim.launch(power,aim)){sound('launch');resetAt=0;updateHUD();}}
function reset(){if(sim.state==='won'||sim.state==='gameover'){restart();return;}sim.resetBall();resetAt=0;predictionDirty=true;$('#victory').hidden=true;updateHUD();}
function fold(value){desiredAngle=Number(value);sim.setAngle(desiredAngle);predictionDirty=true;updateControls();}
function restart(){resultDelay=0;sim.dispose();graphics.dispose();sim=new Simulation(desiredAngle,lessonIndex);graphics=new Graphics($('#game'),sim);graphics.showPath=showPath;graphics.overview=overview;predictionDirty=true;resetAt=0;$('#victory').hidden=true;nextQuip=6;speechUntil.fill(0);updateControls();updateHUD();prepareBox();}
function prepareBox(){
 clearTimeout(toastTimer);$('#toast').classList.remove('visible');
 openingPhase=lab?'playing':'closed';openingTime=0;graphics.setOpening(lab?1:0);
 $('#box-intro').hidden=lab;$('#open-box').disabled=false;$('#open-box').textContent=`Toca na caixa para abrir`;
 $('#box-intro span').textContent=sim.lesson.name;document.body.classList.toggle('opening-box',!lab);document.body.classList.toggle('first-lessons',lessonIndex<3);document.body.classList.toggle('home-lesson',!!sim.lesson.home);$('#bico-label').textContent=sim.lesson.home?'FOLE':'BICO';$('#bico').setAttribute('aria-label',sim.lesson.home?'Ativar fole para trazer Pingo ao ninho':'Defender à esquerda');$('#goal-0').textContent='1';
 document.title=`RICOCHETE · Caixa ${lessonIndex}`;
}
async function start(){
 await initPhysics();sim=new Simulation(desiredAngle,lessonIndex);graphics=new Graphics($('#game'),sim);graphics.overview=overview;$('#stage').classList.add('overview');$('#loading').remove();graphics.setOpening(lab?1:0);$('#box-intro').hidden=lab;document.body.classList.toggle('opening-box',!lab);prepareBox();
 $('#open-box').addEventListener('click',openBox);updateControls();updateHUD();
 $('#angle').addEventListener('input',e=>fold(e.target.value));document.querySelectorAll('[data-angle]').forEach(b=>b.addEventListener('click',()=>fold(b.dataset.angle)));
 $('#shot-strength').addEventListener('input',e=>{power=Number(e.target.value);predictionDirty=true;updateControls();});
 $('#power').addEventListener('input',e=>{power=Number(e.target.value);predictionDirty=true;updateControls();});$('#aim').addEventListener('input',e=>{aim=Number(e.target.value);predictionDirty=true;updateControls();});
 $('#trajectory').addEventListener('change',e=>{showPath=e.target.checked;graphics.showPath=showPath;predictionDirty=true;});
 $('#launch').addEventListener('click',launch);$('#reset').addEventListener('click',reset);$('#restart').addEventListener('click',restart);$('#again').addEventListener('click',()=>{if(sim.state==='won'&&lessonIndex<5)lessonIndex++;restart();});
 $('#overview').addEventListener('click',()=>{overview=!overview;graphics.overview=overview;$('#stage').classList.toggle('overview',overview);$('#overview').classList.toggle('active',overview);$('#overview span').textContent=overview?'Duas vistas':'Ver dobra';});
 for(const id of ['#help','#player-help'])$(id).addEventListener('click',()=>{$('#help-dialog').showModal();paused=true;});
 for(const [id,index]of [['#bico',0],['#bola',1]]){
  const button=$(id);let slide=null;
  button.addEventListener('pointerdown',e=>{if(!e.isPrimary||openingPhase!=='playing')return;e.preventDefault();sim.setDefending(index,true);defend(index);slide={x:e.clientX,start:sim.characters[index].body.translation().x,id:e.pointerId};button.setPointerCapture(e.pointerId);});
  button.addEventListener('pointermove',e=>{if(!slide||slide.id!==e.pointerId)return;sim.moveCharacter(index,slide.start+(e.clientX-slide.x)/$('#game').getBoundingClientRect().width*10);});
  button.addEventListener('pointerup',e=>{if(!slide||slide.id!==e.pointerId)return;sim.setDefending(index,false);slide=null;button.releasePointerCapture(e.pointerId);defend(index);});
  button.addEventListener('pointercancel',()=>{sim.setDefending(index,false);slide=null;});
 }
 for(const [id,index]of [['#bico',0],['#bola',1]])$(id).addEventListener('click',e=>{if(e.detail===0)defend(index);});$('#close-help').addEventListener('click',()=>$('#help-dialog').close());$('#help-dialog').addEventListener('close',()=>paused=false);
 $('#sound').addEventListener('click',()=>{audioOn=!audioOn;$('#sound').classList.toggle('muted',!audioOn);$('#sound').title=audioOn?'Som ligado':'Som desligado';$('#sound span').textContent=audioOn?'ON':'OFF';$('#sound').setAttribute('aria-label',audioOn?'Desativar som':'Ativar som');sound('target');});
 let drag=null,crewDrag=null;const canvas=$('#game');
 const viewPointers=new Map();let orbitDrag=null,pinch=null,viewGesture=false;
 const surface=e=>!e.target.closest('button,input,a,dialog,#shot-power')&&(e.target===canvas||!e.target.closest('#app header,.controls,.intro'));
 const overBox=e=>{const r=canvas.getBoundingClientRect();return graphics.closedBoxHit(e.clientX-r.left,e.clientY-r.top);};
 const stopAim=()=>{drag=null;if(crewDrag)sim.setDefending(crewDrag.index,false);crewDrag=null;$('#shot-power').hidden=true;};
 const distance=()=>{const p=[...viewPointers.values()];return Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);};
 document.addEventListener('pointerdown',e=>{
  if(!overview||!surface(e)||openingPhase==='opening')return;
  viewPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(viewPointers.size===2){stopAim();pinch={distance:Math.max(1,distance()),zoom:graphics.inspection.zoom};viewGesture=true;orbitDrag=null;e.preventDefault();e.stopImmediatePropagation();}
  else if(viewPointers.size===1&&!overBox(e)){orbitDrag={x:e.clientX,y:e.clientY,...graphics.inspection};viewGesture=true;e.preventDefault();e.stopImmediatePropagation();}
 },true);
 document.addEventListener('pointermove',e=>{
  if(!viewPointers.has(e.pointerId))return;viewPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(!viewGesture)return;e.preventDefault();e.stopImmediatePropagation();
  if(pinch&&viewPointers.size===2)graphics.setInspection(graphics.inspection.yaw,graphics.inspection.pitch,pinch.zoom*distance()/pinch.distance);
  else if(orbitDrag)graphics.setInspection(orbitDrag.yaw+(e.clientX-orbitDrag.x)*.045,orbitDrag.pitch+(e.clientY-orbitDrag.y)*.035,graphics.inspection.zoom);
 },true);
 const endView=e=>{if(!viewPointers.has(e.pointerId))return;viewPointers.delete(e.pointerId);if(viewGesture){e.preventDefault();e.stopImmediatePropagation();}pinch=null;orbitDrag=null;if(viewPointers.size===0)viewGesture=false;};
 document.addEventListener('pointerup',endView,true);document.addEventListener('pointercancel',endView,true);
 window.addEventListener('blur',()=>{viewPointers.clear();viewGesture=false;orbitDrag=null;pinch=null;stopAim();});
 document.addEventListener('wheel',e=>{if(!overview||!surface(e))return;e.preventDefault();graphics.setInspection(graphics.inspection.yaw,graphics.inspection.pitch,graphics.inspection.zoom*Math.exp(-e.deltaY*.001));},{passive:false});
 document.addEventListener('dblclick',e=>{if(overview&&surface(e)&&!overBox(e)){e.preventDefault();graphics.setInspection(0,0,1);}});

 canvas.addEventListener('pointerdown',e=>{if(!e.isPrimary)return;if(openingPhase==='closed'){const r=canvas.getBoundingClientRect();if(graphics.closedBoxHit(e.clientX-r.left,e.clientY-r.top)){e.preventDefault();openBox();}return;}if(openingPhase!=='playing')return;e.preventDefault();const r=canvas.getBoundingClientRect();if(sim.level>=3&&['ready','flying'].includes(sim.state)){if(!overview&&e.clientY<r.top+r.height/2)return;const x=e.clientX-r.left,y=e.clientY-r.top;let best=-1,distance=Math.max(24,Math.min(36,r.width*.08));for(let i=0;i<2;i++){const p=graphics.characterScreen(i),f=graphics.padScreen(i),d=Math.min(Math.hypot(x-p.x,y-(p.y+12)),f?Math.hypot(x-f.x,y-f.y):Infinity);if(d<distance){best=i;distance=d;}}if(best>=0){sim.setDefending(best,true);defend(best);crewDrag={index:best,x:e.clientX,start:sim.characters[best].body.translation().x,id:e.pointerId};canvas.setPointerCapture(e.pointerId);return;}if(sim.state==='flying')return;}if(sim.state!=='ready'||(!overview&&e.clientY<r.top+r.height/2))return;$('#shot-power').hidden=false;drag={x:e.clientX,y:e.clientY,power,aim,id:e.pointerId};canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(crewDrag?.id===e.pointerId){sim.moveCharacter(crewDrag.index,crewDrag.start+(e.clientX-crewDrag.x)/canvas.getBoundingClientRect().width*10);return;}if(!drag||drag.id!==e.pointerId)return;const r=canvas.getBoundingClientRect();aim=Math.max(-28,Math.min(28,drag.aim+(e.clientX-drag.x)/r.width*65));power=Math.max(25,Math.min(100,drag.power+(e.clientY-drag.y)/Math.min(160,r.height*.24)*75));predictionDirty=true;updateControls();});
 canvas.addEventListener('pointerup',e=>{if(crewDrag?.id===e.pointerId){const index=crewDrag.index;sim.setDefending(index,false);crewDrag=null;canvas.releasePointerCapture(e.pointerId);defend(index);return;}if(!drag||drag.id!==e.pointerId)return;drag=null;$('#shot-power').hidden=true;canvas.releasePointerCapture(e.pointerId);launch();});canvas.addEventListener('pointercancel',()=>{drag=null;if(crewDrag)sim.setDefending(crewDrag.index,false);crewDrag=null;$('#shot-power').hidden=true;});
 document.addEventListener('keydown',e=>{if(openingPhase!=='playing')return;if(!$('#help-dialog').open&&['KeyA','KeyD'].includes(e.code)&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();if(!e.repeat)defend(e.code==='KeyA'?0:1);return;}if($('#help-dialog').open||['INPUT','BUTTON','A'].includes(document.activeElement.tagName))return;if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyR'].includes(e.code))e.preventDefault();if(e.code==='Space')launch();if(e.code==='KeyR'&&lab)reset();if(e.code==='ArrowLeft')aim=Math.max(-28,aim-1);if(e.code==='ArrowRight')aim=Math.min(28,aim+1);if(e.code==='ArrowUp')power=Math.min(100,power+2);if(e.code==='ArrowDown')power=Math.max(25,power-2);predictionDirty=true;updateControls();});
 new ResizeObserver(()=>graphics.resize()).observe($('#stage'));
 document.addEventListener('visibilitychange',()=>{accumulator=0;last=performance.now();});
 let last=performance.now(),accumulator=0,lastHUD=0;
 function tick(now){
  requestAnimationFrame(tick);const dt=Math.min((now-last)/1000,.065);last=now;
  if(openingPhase==='opening'&&!document.hidden){openingTime+=dt;graphics.setOpening(Math.min(1,openingTime/.75));if(openingTime>=.75){openingPhase='playing';sim.beginFeed();$('#box-intro').hidden=true;document.body.classList.remove('opening-box');predictionDirty=true;}}
  if(!paused&&!document.hidden&&openingPhase==='playing'){accumulator+=dt;while(accumulator>=STEP){
   const events=sim.step();for(const event of events){
    if(event.type==='target'&&!sim.lesson.home){graphics.hit(event.item);toast(sim.targets.size===sim.lesson.targets&&sim.lesson.saves>sim.saves?'Agora devolve a bola com uma almofada!':sim.targets.size===sim.lesson.targets-1&&sim.lesson.targets>1?'Só falta um alvo!':`Alvo ${event.item.target+1} · +${event.item.points} pontos`);sound('target');}
    if(['bell','hoop','bumper'].includes(event.type)&&!sim.lesson.home){graphics.hit(event.item);toast({bell:'Ding! · +50 pontos',hoop:'Cesto! · +75 pontos',bumper:'Bumper · +10 pontos'}[event.type]);if(event.type!=='bell')sound(event.type);}
    if(event.type==='break'){toast('Tijolo partido · +20 pontos');sound('impact');}
    if(event.type==='home-open'){toast('Ding! O ninho abriu. Agora traz-me de volta!');}
    if(event.type==='home-assist'){toast('Boa! Agora deixa-o cair no ninho.');}
    if(event.type==='crossing'){sound('crossing');}
    if(event.type==='ring'){graphics.ring(event.item,event.intensity);sound('bell',event.item,event.intensity);}
    if(event.type==='impact'&&event.item?.shape!=='bell')sound('impact');
    if(event.type==='save'){say(event.character,event.character===0?'Viste? Fácil.':'Foi sem querer!');toast(event.rally>1?`${event.rally} defesas seguidas! +${event.points}`:`Boa defesa! +${event.points}`);sound('target');}
    if(event.type==='lost'){resetAt=now+1100;say(sim.lives%2,'Ups… era tua, não era?');sound('impact');}
    if(event.type==='gameover')showResult(false);
    if(event.type==='unstuck')toast('Desencalhada — sem perder bola.');
    if(event.type==='won'){resultDelay=2.4;toast(sim.lesson.home?'Em casa!':'Boa!');sound('won');}
    if(event.type==='recovered')toast('Bola recuperada · sem perder vida');
    if(event.type==='loaded'){predictionDirty=true;updateHUD();}
   }accumulator-=STEP;
  }}
  if(resultDelay>0&&!paused&&!document.hidden){resultDelay-=dt;if(resultDelay<=0)showResult(true);}
  if(resetAt&&now>resetAt&&!paused){if(sim.nextBall()){sim.beginFeed();predictionDirty=true;updateHUD();}resetAt=0;}
  if(sim.level>=3&&sim.time>nextQuip&&sim.state==='ready'){const i=Math.floor(sim.time/6)%2;say(i,i===0?'Essa era a tua melhor?':'Eu fazia melhor… acho.');nextQuip=sim.time+10;}
  for(let i=0;i<2;i++){const el=$('#speech-'+i);if(sim.time>=speechUntil[i])el.hidden=true;else{const p=graphics.characterScreen(i);el.style.left=`${p.x}px`;el.style.top=`${p.y}px`;}}
  if(sim.state==='ready'&&showPath&&(predictionDirty||Math.abs(sim.angle-predictionAngle)>.005)&&now-predictionAt>130){graphics.setTrajectory(sim.predict(power,aim));predictionDirty=false;predictionAt=now;predictionAngle=sim.angle;}
  graphics.showPath=showPath;graphics.sync();graphics.render();if(now-lastHUD>100){updateHUD();lastHUD=now;}
 }
 requestAnimationFrame(tick);
 if(new URLSearchParams(location.search).has('debug'))window.__ricochete={get sim(){return sim;},get graphics(){return graphics;},get power(){return power;},get aim(){return aim;},setShot(p,a){power=p;aim=a;predictionDirty=true;updateControls();},fold,launch,reset,restart,defend,pause(value=true){paused=value;},step(count=1){for(let i=0;i<count;i++)sim.step();graphics.sync();graphics.render();updateHUD();},snapshot(){return{state:sim.state,ball:{...sim.ball.translation()},handle:sim.ball.handle,angle:sim.angle,score:sim.score,lives:sim.lives,saves:sim.saves,targets:[...sim.targets],shots:sim.shots,crossings:sim.crossings,bodies:sim.world.bodies.len(),colliders:sim.world.colliders.len()};}};
}
start().catch(error=>{console.error(error);const loading=$('#loading');if(loading){loading.textContent='Não foi possível iniciar o 3D. Atualiza a página num browser com WebGL 2.';loading.style.padding='30px';}$('#phase').textContent='ERRO AO INICIAR';});

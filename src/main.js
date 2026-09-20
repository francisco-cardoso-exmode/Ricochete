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
const speechUntil=[0,0];let nextQuip=6;
function say(index,text){$('#speech-'+index).textContent=text;$('#speech-'+index).hidden=false;speechUntil[index]=sim.time+2.1;}
function defend(index){if(sim.headbutt(index)){say(index,index===0?'Deixa comigo!':'Eu? Agora?!');sound('launch');}}
function showResult(won){$('#victory').hidden=false;$('#result-label').textContent=won?'LEVEL 01 / COMPLETO':'FIM DA PARTIDA';$('#result-title').textContent=won?'Calaste as duas.':'Elas riem por último.';$('#result-text').textContent=won?`${sim.score} pontos · ${sim.saves} defesas. Os três alvos são teus.`:'As cinco bolas escaparam. Mais uma tentativa?';}
let sim,graphics,power=72,aim=0,desiredAngle=90,showPath=true,overview=false,predictionDirty=true,predictionAt=0,predictionAngle=-1,paused=false;
let audioContext,audioOn=false,lastTone=0,toastTimer,resetAt=0;
function sound(type){
 if(!audioOn)return;
 try{audioContext??=new (window.AudioContext||window.webkitAudioContext)();audioContext.resume();const t=audioContext.currentTime;if(t-lastTone<.07)return;lastTone=t;
 const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type=type==='bell'?'sine':'triangle';osc.frequency.setValueAtTime({target:740,bell:1100,hoop:880,impact:150,launch:240,crossing:520,won:1046}[type]||300,t);osc.frequency.exponentialRampToValueAtTime(type==='impact'?60:440,t+.18);gain.gain.setValueAtTime(.05,t);gain.gain.exponentialRampToValueAtTime(.001,t+.35);osc.connect(gain).connect(audioContext.destination);osc.start(t);osc.stop(t+.36);}catch{/* Audio never blocks physics. */}
}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2200);}
function updateControls(){
 $('#power').value=power;$('#power-value').innerHTML=`${Math.round(power)}<span>%</span>`;$('#aim').value=aim;$('#aim-value').textContent=`${aim>0?'+':''}${aim.toFixed(0)}°`;
 $('#angle').value=desiredAngle;$('#angle-value').textContent=`${Math.round(desiredAngle)}°`;
 document.querySelectorAll('[data-angle]').forEach(b=>b.classList.toggle('active',Number(b.dataset.angle)===desiredAngle));
 const radians=(180-desiredAngle)*Math.PI/180;$('#hinge-arm').setAttribute('d',`M34 75L${34-63*Math.cos(radians)} ${75-63*Math.sin(radians)}`);
 $('#hinge-arc').setAttribute('d',`M65 75A31 31 0 0 0 ${34-31*Math.cos(radians)} ${75-31*Math.sin(radians)}`);
 $('#angle-description').textContent=desiredAngle===90?'CAIXA VERTICAL':desiredAngle===180?'MUNDO ABERTO':'NOVOS CAMINHOS';
 if(graphics)graphics.launcher.rotation.y=-aim*Math.PI/180;
}
function updateHUD(){
 $('#score').textContent=String(sim.score).padStart(4,'0');$('#hits').textContent=`${sim.targets.size} / 3`;$('#shots').textContent=String(sim.shots).padStart(2,'0');
 for(let i=0;i<3;i++){$(`#target-${i}`).classList.toggle('hit',sim.targets.has(i));$(`#goal-${i}`).classList.toggle('hit',sim.targets.has(i));}
 $('#player-score').textContent=String(sim.score).padStart(4,'0');$('#lives').textContent='● '.repeat(sim.lives).trim()||'—';$('#lives-label').textContent=`${sim.lives} ${sim.lives===1?'BOLA':'BOLAS'}`;
 sim.characters.forEach((c,i)=>{const name=i===0?'bico':'bola';$('#'+name).disabled=sim.state!=='flying'||c.cooldown>0;$('#'+name+'-state').textContent=sim.state!=='flying'?'À ESPERA DA BOLA':c.cooldown>0?'A RECUPERAR…':'TOCA PARA SALVAR';});
 $('#play-instruction').textContent=sim.state==='ready'?'Arrasta na base e solta para lançar.':sim.state==='flying'?'Quando regressar, toca numa personagem para a salvar.':sim.state==='lost'?'Uma escapou. Os alvos mantêm-se.':'Toca em jogar outra vez para recomeçar.';
 $('#phase').textContent={ready:'PRONTO A LANÇAR',flying:'BOLA EM JOGO',lost:'UMA BOLA ESCAPOU',gameover:'FIM DA PARTIDA',won:'NÍVEL COMPLETO'}[sim.state];
 $('#launch').disabled=sim.state!=='ready';$('#aim-hint').style.opacity=sim.state==='ready'?'1':'0';
 $('#ball-location').textContent=`BOLA / ${sim.inUpper?'CAIXA SUPERIOR':'BASE'}`;$('#seam-angle').textContent=`${Math.round(sim.angle)}°`;
}
function launch(){if(sim.launch(power,aim)){sound('launch');resetAt=0;updateHUD();}}
function reset(){if(sim.state==='won'||sim.state==='gameover'){restart();return;}sim.resetBall();resetAt=0;predictionDirty=true;$('#victory').hidden=true;updateHUD();}
function fold(value){desiredAngle=Number(value);sim.setAngle(desiredAngle);predictionDirty=true;updateControls();}
function restart(){sim.dispose();graphics.dispose();sim=new Simulation(desiredAngle);graphics=new Graphics($('#game'),sim);graphics.showPath=showPath;graphics.overview=overview;predictionDirty=true;resetAt=0;$('#victory').hidden=true;nextQuip=6;speechUntil.fill(0);updateControls();updateHUD();toast('5 bolas. 3 alvos. E estas duas.');}
async function start(){
 await initPhysics();sim=new Simulation();graphics=new Graphics($('#game'),sim);$('#loading').remove();updateControls();updateHUD();
 $('#angle').addEventListener('input',e=>fold(e.target.value));document.querySelectorAll('[data-angle]').forEach(b=>b.addEventListener('click',()=>fold(b.dataset.angle)));
 $('#power').addEventListener('input',e=>{power=Number(e.target.value);predictionDirty=true;updateControls();});$('#aim').addEventListener('input',e=>{aim=Number(e.target.value);predictionDirty=true;updateControls();});
 $('#trajectory').addEventListener('change',e=>{showPath=e.target.checked;graphics.showPath=showPath;predictionDirty=true;});
 $('#launch').addEventListener('click',launch);$('#reset').addEventListener('click',reset);$('#restart').addEventListener('click',restart);$('#again').addEventListener('click',restart);
 $('#overview').addEventListener('click',()=>{overview=!overview;graphics.overview=overview;$('#stage').classList.toggle('overview',overview);$('#overview').classList.toggle('active',overview);$('#overview span').textContent=overview?'Duas vistas':'Ver dobra';});
 for(const id of ['#help','#player-help'])$(id).addEventListener('click',()=>{$('#help-dialog').showModal();paused=true;});
 for(const [id,index]of [['#bico',0],['#bola',1]])$(id).addEventListener('pointerdown',e=>{e.preventDefault();defend(index);});
 for(const [id,index]of [['#bico',0],['#bola',1]])$(id).addEventListener('click',e=>{if(e.detail===0)defend(index);});$('#close-help').addEventListener('click',()=>$('#help-dialog').close());$('#help-dialog').addEventListener('close',()=>paused=false);
 $('#sound').addEventListener('click',()=>{audioOn=!audioOn;$('#sound span').textContent=audioOn?'ON':'OFF';$('#sound').setAttribute('aria-label',audioOn?'Desativar som':'Ativar som');sound('target');});
 let drag=null;const canvas=$('#game');
 canvas.addEventListener('pointerdown',e=>{const r=canvas.getBoundingClientRect();if(sim.state==='flying'){if(!overview&&e.clientY<r.top+r.height/2)return;const x=e.clientX-r.left,y=e.clientY-r.top;let best=-1,distance=60;for(let i=0;i<2;i++){const p=graphics.characterScreen(i),d=Math.hypot(x-p.x,y-(p.y+12));if(d<distance){best=i;distance=d;}}if(best>=0)defend(best);return;}if(sim.state!=='ready'||(!overview&&e.clientY<r.top+r.height/2))return;drag={x:e.clientX,y:e.clientY,power,aim,id:e.pointerId};canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const r=canvas.getBoundingClientRect();aim=Math.max(-28,Math.min(28,drag.aim+(e.clientX-drag.x)/r.width*65));power=Math.max(25,Math.min(100,drag.power+(e.clientY-drag.y)/r.height*120));predictionDirty=true;updateControls();});
 canvas.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;drag=null;canvas.releasePointerCapture(e.pointerId);launch();});canvas.addEventListener('pointercancel',()=>{drag=null;});
 document.addEventListener('keydown',e=>{if(!$('#help-dialog').open&&['KeyA','KeyD'].includes(e.code)&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();if(!e.repeat)defend(e.code==='KeyA'?0:1);return;}if($('#help-dialog').open||['INPUT','BUTTON','A'].includes(document.activeElement.tagName))return;if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyR'].includes(e.code))e.preventDefault();if(e.code==='Space')launch();if(e.code==='KeyR'&&lab)reset();if(e.code==='ArrowLeft')aim=Math.max(-28,aim-1);if(e.code==='ArrowRight')aim=Math.min(28,aim+1);if(e.code==='ArrowUp')power=Math.min(100,power+2);if(e.code==='ArrowDown')power=Math.max(25,power-2);predictionDirty=true;updateControls();});
 new ResizeObserver(()=>graphics.resize()).observe($('#stage'));
 document.addEventListener('visibilitychange',()=>{accumulator=0;last=performance.now();});
 let last=performance.now(),accumulator=0,lastHUD=0;
 function tick(now){
  requestAnimationFrame(tick);const dt=Math.min((now-last)/1000,.065);last=now;
  if(!paused&&!document.hidden){accumulator+=dt;while(accumulator>=STEP){
   const events=sim.step();for(const event of events){
    if(event.type==='target'){graphics.hit(event.item);toast(`Alvo ${event.item.target+1} · +${event.item.points} pontos`);sound('target');}
    if(['bell','hoop','bumper'].includes(event.type)){graphics.hit(event.item);toast({bell:'Ding! · +50 pontos',hoop:'Cesto! · +75 pontos',bumper:'Bumper · +10 pontos'}[event.type]);sound(event.type);}
    if(event.type==='crossing'){toast('Pela dobra. A mesma bola.');sound('crossing');}
    if(event.type==='impact')sound('impact');
    if(event.type==='save'){say(event.character,event.character===0?'Viste? Fácil.':'Foi sem querer!');toast('Cabeçada! +25');sound('target');}
    if(event.type==='lost'){resetAt=now+1100;say(sim.lives%2,'Ups… era tua, não era?');sound('impact');}
    if(event.type==='gameover')showResult(false);
    if(event.type==='unstuck')toast('Desencalhada — sem perder bola.');
    if(event.type==='won'){showResult(true);sound('won');}
   }accumulator-=STEP;
  }}
  if(resetAt&&now>resetAt&&!paused){if(sim.nextBall()){predictionDirty=true;updateHUD();}resetAt=0;}
  if(sim.time>nextQuip&&['ready','flying'].includes(sim.state)){const i=Math.floor(sim.time/6)%2;say(i,i===0?'Essa era a tua melhor?':'Eu fazia melhor… acho.');nextQuip=sim.time+10;}
  for(let i=0;i<2;i++){const el=$('#speech-'+i);if(sim.time>=speechUntil[i])el.hidden=true;else{const p=graphics.characterScreen(i);el.style.left=`${p.x}px`;el.style.top=`${p.y}px`;}}
  if(sim.state==='ready'&&showPath&&(predictionDirty||Math.abs(sim.angle-predictionAngle)>.005)&&now-predictionAt>130){graphics.setTrajectory(sim.predict(power,aim));predictionDirty=false;predictionAt=now;predictionAngle=sim.angle;}
  graphics.sync();graphics.render();if(now-lastHUD>100){updateHUD();lastHUD=now;}
 }
 requestAnimationFrame(tick);
 if(new URLSearchParams(location.search).has('debug'))window.__ricochete={get sim(){return sim;},get graphics(){return graphics;},get power(){return power;},get aim(){return aim;},setShot(p,a){power=p;aim=a;predictionDirty=true;updateControls();},fold,launch,reset,restart,defend,pause(value=true){paused=value;},step(count=1){for(let i=0;i<count;i++)sim.step();graphics.sync();graphics.render();updateHUD();},snapshot(){return{state:sim.state,ball:{...sim.ball.translation()},handle:sim.ball.handle,angle:sim.angle,score:sim.score,lives:sim.lives,saves:sim.saves,targets:[...sim.targets],shots:sim.shots,crossings:sim.crossings,bodies:sim.world.bodies.len(),colliders:sim.world.colliders.len()};}};
}
start().catch(error=>{console.error(error);const loading=$('#loading');if(loading){loading.textContent='Não foi possível iniciar o 3D. Atualiza a página num browser com WebGL 2.';loading.style.padding='30px';}$('#phase').textContent='ERRO AO INICIAR';});

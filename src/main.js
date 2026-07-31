import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js';

const canvas = document.querySelector('#webgl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
camera.position.z = 1;

const stateOrder = ['operator', 'gear', 'weapon', 'modules', 'sync', 'ready', 'deploy'];
const durations = [2.2, 2.4, 2.4, 2.5, 1.5, 2.2, 1.2];
const totalDuration = durations.reduce((a, b) => a + b, 0);
const textures = Object.fromEntries(stateOrder.map(name => [name, makeStateTexture(name)]));

function makeStateTexture(name){
  const c = document.createElement('canvas');
  c.width = 1280; c.height = 720;
  const x = c.getContext('2d');
  const light = name === 'ready' || name === 'deploy';
  x.fillStyle = light ? '#e9e7df' : '#07090a';
  x.fillRect(0, 0, c.width, c.height);

  x.strokeStyle = light ? 'rgba(20,22,22,.12)' : 'rgba(255,255,255,.08)';
  x.lineWidth = 1;
  for (let gx = 0; gx < 1280; gx += 64) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, 720); x.stroke(); }
  for (let gy = 0; gy < 720; gy += 64) { x.beginPath(); x.moveTo(0, gy); x.lineTo(1280, gy); x.stroke(); }

  x.fillStyle = light ? '#161818' : '#f2f2ed';
  x.font = '700 22px Arial';
  x.fillText('VANTA/9', 38, 46);
  x.font = '12px Arial';
  ['OPERATORS','GEAR','SYSTEM'].forEach((label, i) => x.fillText(label, 760 + i * 150, 44));
  x.fillStyle = '#b7cd36'; x.fillRect(752, 54, 112, 3);

  drawCharacter(x, light);
  const title = {
    operator: 'KIRA VENN', gear: 'LOADOUT', weapon: 'ARC SPEAR 07', modules: 'PHASE MODULES',
    sync: 'SYNCHRONIZING', ready: 'READY', deploy: 'DEPLOYED'
  }[name];

  if (light) {
    x.fillStyle = 'rgba(15,16,16,.12)'; x.font = '900 190px Arial'; x.fillText(title, 430, 355);
  }
  x.fillStyle = light ? '#171919' : '#f1f1ed'; x.font = '800 52px Arial'; x.fillText(title, 44, 135);
  x.fillStyle = '#b7cd36'; x.fillRect(44, 152, 190, 5);

  if (name === 'operator') drawOperator(x);
  if (name === 'gear') drawCards(x, ['PRIMARY','ARMOR','CORE','MOD','SECONDARY','BOOTS']);
  if (name === 'weapon') drawWeapon(x);
  if (name === 'modules') drawModules(x);
  if (name === 'sync') drawSync(x);
  if (name === 'ready' || name === 'deploy') drawReady(x, name === 'deploy');

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
  return t;
}

function drawCharacter(x, light){
  x.save(); x.translate(410, 155);
  x.fillStyle = light ? '#35383a' : '#181c1e';
  x.beginPath(); x.arc(160, 80, 45, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.moveTo(112,128); x.lineTo(205,128); x.lineTo(240,410); x.lineTo(78,410); x.closePath(); x.fill();
  x.fillStyle = '#b7cd36'; x.fillRect(102,170,112,9); x.fillRect(91,310,135,7);
  x.strokeStyle = light ? '#555' : '#353b3e'; x.lineWidth = 24;
  x.beginPath(); x.moveTo(110,170); x.lineTo(45,300); x.stroke();
  x.beginPath(); x.moveTo(210,170); x.lineTo(275,295); x.stroke();
  x.lineWidth = 28; x.beginPath(); x.moveTo(128,400); x.lineTo(108,550); x.stroke(); x.beginPath(); x.moveTo(190,400); x.lineTo(210,550); x.stroke();
  x.restore();
}

function panel(x, px, py, w, h, label){
  x.fillStyle = 'rgba(255,255,255,.035)'; x.fillRect(px, py, w, h);
  x.strokeStyle = 'rgba(255,255,255,.18)'; x.strokeRect(px, py, w, h);
  x.fillStyle = '#b7cd36'; x.fillRect(px, py, 5, h);
  x.fillStyle = '#d9dad6'; x.font = '700 13px Arial'; x.fillText(label, px + 18, py + 27);
}
function drawOperator(x){
  panel(x, 44, 205, 280, 370, 'OPERATOR PROFILE');
  ['POWER','SPEED','CONTROL'].forEach((s,i)=>{ x.fillStyle='#a8aaa6'; x.fillText(s,70,275+i*72); x.fillStyle='#202526'; x.fillRect(70,292+i*72,210,8); x.fillStyle='#b7cd36'; x.fillRect(70,292+i*72,120+i*32,8); });
  x.fillStyle='#b7cd36'; x.fillRect(70,500,190,52); x.fillStyle='#111'; x.font='800 17px Arial'; x.fillText('SELECT',130,533);
}
function drawCards(x, labels){ labels.forEach((l,i)=>panel(x,740+(i%3)*165,170+Math.floor(i/3)*190,145,160,l)); x.fillStyle='#b7cd36'; x.fillRect(1030,585,205,62); x.fillStyle='#111'; x.font='800 18px Arial'; x.fillText('CONFIRM',1090,623); }
function drawWeapon(x){
  x.strokeStyle='#c9d24b'; x.lineWidth=18; x.beginPath(); x.moveTo(760,560); x.lineTo(1120,185); x.stroke();
  x.fillStyle='#b7cd36'; x.beginPath(); x.moveTo(1120,185); x.lineTo(1080,250); x.lineTo(1150,230); x.closePath(); x.fill();
  ['PHASE EDGE','GRAV CORE','PHASE LINK'].forEach((l,i)=>panel(x,760,210+i*105,210,78,l));
  x.fillStyle='#b7cd36'; x.fillRect(1030,585,205,62); x.fillStyle='#111'; x.font='800 18px Arial'; x.fillText('EQUIP',1100,623);
}
function drawModules(x){ ['BLINK','ECHO','BREAK'].forEach((l,i)=>{ panel(x,630+i*205,175,180,330,l); x.strokeStyle='#b7cd36'; x.lineWidth=4; x.beginPath(); x.arc(720+i*205,330,48,0,Math.PI*2); x.stroke(); }); x.fillStyle='#b7cd36'; x.fillRect(1030,585,205,62); x.fillStyle='#111'; x.font='800 18px Arial'; x.fillText('CONFIRM',1080,623); }
function drawSync(x){ x.strokeStyle='#b7cd36'; x.lineWidth=12; x.beginPath(); x.arc(1010,360,110,-Math.PI/2,Math.PI*1.35); x.stroke(); x.fillStyle='#f0f0ec'; x.font='800 34px Arial'; x.fillText('92%',970,372); }
function drawReady(x, deployed){ ['KIRA VENN','ARC SPEAR','BLINK','SYNC 100%'].forEach((l,i)=>panel(x,720+(i%2)*235,185+Math.floor(i/2)*150,210,125,l)); x.fillStyle='#b7cd36'; x.fillRect(920,570,300,72); x.fillStyle='#111'; x.font='900 22px Arial'; x.fillText(deployed?'DEPLOYMENT CONFIRMED':'DEPLOY',deployed?950:1030,614); }

const uniforms = { mapFrom:{value:textures.operator}, mapTo:{value:textures.operator}, progress:{value:0}, time:{value:0} };
const material = new THREE.ShaderMaterial({ uniforms, vertexShader:`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`, fragmentShader:`precision highp float; uniform sampler2D mapFrom; uniform sampler2D mapTo; uniform float progress; uniform float time; varying vec2 vUv; float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} void main(){float n=h(floor(vUv*vec2(40.,20.))+floor(time*4.));float edge=vUv.x+(n-.5)*.12+(1.-vUv.y)*.05;float m=smoothstep(progress*1.35-.22,progress*1.35+.02,edge);vec4 c=mix(texture2D(mapFrom,vUv),texture2D(mapTo,vUv),m);float s=1.-smoothstep(0.,.018,abs(edge-(progress*1.35-.08)));s*=step(.001,progress)*step(progress,.999);c.rgb+=vec3(.58,.69,.05)*s*.8;gl_FragColor=c;}` });
const plane = new THREE.Mesh(new THREE.PlaneGeometry(2,2),material); scene.add(plane);

const els = Object.fromEntries(['boot','modeButton','modeLabel','soundButton','playPause','enterInteractive','timeline','timelineFill','timecode','interactiveLayer','interactionNote'].map(id=>[id,document.querySelector('#'+id)]));
let mode='cinematic', currentState='operator', transitioning=false, selectedModule='blink', playing=true, playhead=0, last=performance.now();

function resize(){ const w=innerWidth,h=innerHeight; renderer.setSize(w,h,false); const a=w/h,m=16/9; plane.scale.set(a>m?m/a:1,a>m?1:a/m,1); } addEventListener('resize',resize); resize();
function animateTo(next){ if(transitioning||next===currentState)return; transitioning=true; uniforms.mapFrom.value=textures[currentState]; uniforms.mapTo.value=textures[next]; const start=performance.now(); const tick=now=>{let p=Math.min(1,(now-start)/620);p=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;uniforms.progress.value=p;if(p<1)requestAnimationFrame(tick);else{currentState=next;uniforms.mapFrom.value=textures[next];uniforms.mapTo.value=textures[next];uniforms.progress.value=0;transitioning=false;updateUI();}};requestAnimationFrame(tick); }
function stateAt(t){ let sum=0; for(let i=0;i<durations.length;i++){sum+=durations[i];if(t<sum)return stateOrder[i];}return 'deploy'; }
function setMode(next){ mode=next; document.body.classList.toggle('interactive',next==='interactive'); els.modeLabel.textContent=next==='interactive'?'INTERACTIVE REPLICA':'CINEMATIC REPLICA'; if(next==='interactive'){playing=false; uniforms.mapFrom.value=textures[currentState]; uniforms.mapTo.value=textures[currentState]; updateUI();}else playing=true; }
function updateUI(){ document.querySelectorAll('.hotspot').forEach(e=>e.classList.remove('enabled')); const e=s=>document.querySelector(s)?.classList.add('enabled'); if(currentState==='operator')e('.operator-select');if(currentState==='gear')e('.gear-confirm');if(currentState==='weapon')e('.weapon-equip');if(currentState==='modules'){e('.module-blink');e('.module-echo');e('.module-break');e('.module-confirm');}if(currentState==='sync')e('.sync-continue');if(['ready','deploy'].includes(currentState))e('.deploy-button'); document.querySelectorAll('[data-scene]').forEach(b=>b.classList.toggle('active',b.dataset.scene===currentState)); els.interactionNote.textContent={operator:'SELECT KIRA VENN',gear:'CONFIRM LOADOUT',weapon:'EQUIP ARC SPEAR 07',modules:`PHASE MODULE: ${selectedModule.toUpperCase()}`,sync:'SYNCHRONIZATION COMPLETE',ready:'DEPLOY WHEN READY',deploy:'DEPLOYMENT CONFIRMED'}[currentState]; }
function render(now){const dt=(now-last)/1000;last=now;uniforms.time.value=now/1000;if(mode==='cinematic'&&playing){playhead=(playhead+dt)%totalDuration;const next=stateAt(playhead);if(next!==currentState)animateTo(next);const pct=playhead/totalDuration*100;els.timelineFill.style.width=pct+'%';els.timecode.textContent=`00:${String(Math.floor(playhead)).padStart(2,'0')} / 00:${String(Math.floor(totalDuration)).padStart(2,'0')}`;}renderer.render(scene,camera);requestAnimationFrame(render);}requestAnimationFrame(render);

document.querySelectorAll('[data-target]').forEach(b=>b.addEventListener('click',()=>animateTo(b.dataset.target)));document.querySelectorAll('[data-scene]').forEach(b=>b.addEventListener('click',()=>animateTo(b.dataset.scene)));document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>{selectedModule=b.dataset.action;updateUI();}));
els.modeButton.addEventListener('click',()=>setMode(mode==='cinematic'?'interactive':'cinematic'));els.enterInteractive.addEventListener('click',()=>setMode('interactive'));els.playPause.addEventListener('click',()=>{playing=!playing;els.playPause.textContent=playing?'PAUSE':'PLAY';});els.timeline.addEventListener('click',e=>{const r=els.timeline.getBoundingClientRect();playhead=(e.clientX-r.left)/r.width*totalDuration;const next=stateAt(playhead);if(next!==currentState)animateTo(next);});els.soundButton.textContent='SOUND N/A';
document.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='i')setMode('interactive');if(e.key.toLowerCase()==='c')setMode('cinematic');if(mode==='interactive'){const i=stateOrder.indexOf(currentState);if(e.key==='ArrowRight')animateTo(stateOrder[Math.min(i+1,stateOrder.length-1)]);if(e.key==='ArrowLeft')animateTo(stateOrder[Math.max(i-1,0)]);}});
setTimeout(()=>els.boot.classList.add('hidden'),700);updateUI();

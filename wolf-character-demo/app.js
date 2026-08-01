const viewer=document.getElementById('viewer');
const fallback=document.getElementById('fallback');
const mount=document.getElementById('webgl');
const loading=document.getElementById('loading');
const status=document.getElementById('status');
const resetButton=document.getElementById('reset');
const params=new URLSearchParams(location.search);
if(params.has('debug'))document.body.classList.add('debug');
const colorData=globalThis.__WOLF;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pointer={x:0,y:0,tx:0,ty:0,down:false,startX:0,startY:0,baseX:0,baseY:0};
let fallbackScale=1;
let webglControls=null;
let loadFinished=false;

function finishLoading(message='Ready'){
  if(loadFinished)return;
  loadFinished=true;
  status.textContent=message;
  loading.classList.add('done');
  setTimeout(()=>loading.remove(),220);
}

if(!colorData||colorData.length<1000){
  finishLoading('Image asset missing');
}else{
  fallback.addEventListener('load',()=>finishLoading('Image ready'),{once:true});
  fallback.addEventListener('error',()=>finishLoading('Image failed to decode'),{once:true});
  fallback.src=colorData;
  if(fallback.complete&&fallback.naturalWidth)finishLoading('Image ready');
}
setTimeout(()=>finishLoading('Interactive image ready'),2200);

function targetFromEvent(e){
  const r=viewer.getBoundingClientRect();
  pointer.tx=clamp(((e.clientX-r.left)/r.width)*2-1,-1,1);
  pointer.ty=clamp(-(((e.clientY-r.top)/r.height)*2-1),-1,1);
}
function reset(){pointer.tx=pointer.ty=0;fallbackScale=1;webglControls?.reset();}
resetButton.addEventListener('click',reset);
viewer.addEventListener('dblclick',reset);
viewer.addEventListener('pointerdown',e=>{
  pointer.down=true;pointer.startX=e.clientX;pointer.startY=e.clientY;pointer.baseX=pointer.tx;pointer.baseY=pointer.ty;
  viewer.classList.add('dragging');viewer.setPointerCapture?.(e.pointerId);
});
viewer.addEventListener('pointermove',e=>{
  if(pointer.down){
    const r=viewer.getBoundingClientRect();
    pointer.tx=clamp(pointer.baseX+(e.clientX-pointer.startX)/r.width*3,-1,1);
    pointer.ty=clamp(pointer.baseY-(e.clientY-pointer.startY)/r.height*3,-1,1);
  }else targetFromEvent(e);
});
function endPointer(e){pointer.down=false;viewer.classList.remove('dragging');viewer.releasePointerCapture?.(e.pointerId);}
viewer.addEventListener('pointerup',endPointer);
viewer.addEventListener('pointercancel',endPointer);
viewer.addEventListener('pointerleave',()=>{if(!pointer.down){pointer.tx=0;pointer.ty=0;}});
viewer.addEventListener('wheel',e=>{
  e.preventDefault();
  fallbackScale=clamp(fallbackScale*Math.exp(-e.deltaY*.00055),.94,1.16);
  webglControls?.zoom(e.deltaY);
},{passive:false});

function animateFallback(){
  pointer.x+=(pointer.tx-pointer.x)*.09;
  pointer.y+=(pointer.ty-pointer.y)*.09;
  const active=Math.hypot(pointer.x,pointer.y)>.004||Math.abs(fallbackScale-1)>.001;
  if(!active){fallback.style.transform='none';fallback.style.filter='none';}
  else{
    const guard=1.025+Math.hypot(pointer.x,pointer.y)*.018;
    fallback.style.transform=`perspective(1500px) translate3d(${pointer.x*3}px,${-pointer.y*2.2}px,0) rotateX(${-pointer.y*1.25}deg) rotateY(${pointer.x*1.55}deg) scale(${fallbackScale*guard})`;
    fallback.style.filter=`saturate(${1+Math.abs(pointer.x)*.014}) brightness(${1+pointer.y*.006})`;
  }
  requestAnimationFrame(animateFallback);
}
animateFallback();

async function importThree(){
  const urls=[
    'https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js',
    'https://unpkg.com/three@0.166.1/build/three.module.js?module',
    'https://esm.sh/three@0.166.1'
  ];
  let lastError;
  for(const url of urls){
    try{
      status.textContent='Loading Three.js…';
      return await Promise.race([
        import(url),
        new Promise((_,reject)=>setTimeout(()=>reject(new Error('Three.js CDN timeout')),6500))
      ]);
    }catch(error){lastError=error;}
  }
  throw lastError||new Error('Three.js unavailable');
}

try{
  const THREE=await importThree();
  status.textContent='Building Three.js scene…';
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x070b23);
  const camera=new THREE.OrthographicCamera(-1,1,1.5,-1.5,.01,20);
  camera.position.z=5;
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',alpha:false});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.NoToneMapping;
  renderer.setClearColor(0x070b23,1);
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  mount.appendChild(renderer.domElement);
  const texture=await new THREE.TextureLoader().loadAsync(colorData);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.minFilter=texture.magFilter=THREE.LinearFilter;
  texture.generateMipmaps=false;
  const card=new THREE.Mesh(
    new THREE.PlaneGeometry(2,3,96,144),
    new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false})
  );
  scene.add(card);
  let zoom=1,targetZoom=1,interaction=0;
  function resize(){
    const vw=innerWidth,vh=innerHeight,aspect=vw/vh,imageAspect=2/3;
    if(aspect>imageAspect){const hh=1.5;camera.top=hh;camera.bottom=-hh;camera.right=hh*aspect;camera.left=-camera.right;}
    else{const hw=1;camera.left=-hw;camera.right=hw;camera.top=hw/aspect;camera.bottom=-camera.top;}
    camera.updateProjectionMatrix();renderer.setSize(vw,vh,false);renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  }
  addEventListener('resize',resize);resize();
  webglControls={
    zoom(delta){targetZoom=clamp(targetZoom*Math.exp(-delta*.00055),.94,1.16);},
    reset(){targetZoom=1;}
  };
  const clock=new THREE.Clock();
  function render(){
    const t=clock.getElapsedTime();
    const activity=Math.min(1,Math.hypot(pointer.x,pointer.y)*1.15+(pointer.down?.22:0));
    interaction+=(activity-interaction)*.075;
    zoom+=(targetZoom-zoom)*.09;
    card.rotation.x+=(-pointer.y*.04*interaction-card.rotation.x)*.08;
    card.rotation.y+=(pointer.x*.055*interaction-card.rotation.y)*.08;
    card.position.x+=(pointer.x*.014*interaction-card.position.x)*.08;
    card.position.y+=(pointer.y*.009*interaction+Math.sin(t*.8)*.0015*interaction-card.position.y)*.08;
    const guard=1+interaction*.02;
    card.scale.setScalar(zoom*guard);
    renderer.render(scene,camera);
    const showWebGL=interaction>.012||Math.abs(zoom-1)>.0015;
    document.body.classList.toggle('webgl-active',showWebGL);
    requestAnimationFrame(render);
  }
  render();
  status.textContent='Three.js scene ready';
}catch(error){
  console.warn('Three.js unavailable; exact-image interactive fallback remains active.',error);
  status.textContent='Interactive fallback active';
  document.body.classList.remove('webgl-active');
}

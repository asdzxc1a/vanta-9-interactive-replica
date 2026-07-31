import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js';

const canvas = document.querySelector('#webgl');
const fallbackVideo = document.querySelector('#fallbackVideo');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
canvas.style.opacity = '1';
fallbackVideo.style.opacity = '0';
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
camera.position.z = 1;

const stateOrder = ['operator', 'gear', 'weapon', 'modules', 'sync', 'ready', 'deploy'];
const stateTimes = {
  operator: 1.375,
  gear: 4.375,
  weapon: 6.6667,
  modules: 9.875,
  sync: 11.2083,
  ready: 13.6667,
  deploy: 14.6667
};
const textures = {};

async function loadReferenceVideoUrl(){
  const chunkCount = 22;
  const chunks = await Promise.all(Array.from({ length: chunkCount }, (_, index) =>
    fetch(`/assets/reference.b64.part${String(index).padStart(2, '0')}`).then(response => {
      if (!response.ok) throw new Error(`Missing video chunk ${index}`);
      return response.text();
    })
  ));
  const binary = atob(chunks.join('').replace(/\s+/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: 'video/mp4' }));
}

const video = document.createElement('video');
const referenceVideoUrl = await loadReferenceVideoUrl();
video.src = referenceVideoUrl;
video.muted = true;
video.loop = true;
video.playsInline = true;
video.preload = 'auto';
video.crossOrigin = 'anonymous';

fallbackVideo.src = referenceVideoUrl;
const videoTexture = new THREE.VideoTexture(video);
videoTexture.colorSpace = THREE.SRGBColorSpace;
videoTexture.minFilter = THREE.LinearFilter;
videoTexture.magFilter = THREE.LinearFilter;

function waitForEvent(target, eventName){
  return new Promise((resolve, reject) => {
    const onReady = () => { cleanup(); resolve(); };
    const onError = () => { cleanup(); reject(new Error(`Failed while waiting for ${eventName}`)); };
    const cleanup = () => {
      target.removeEventListener(eventName, onReady);
      target.removeEventListener('error', onError);
    };
    target.addEventListener(eventName, onReady, { once: true });
    target.addEventListener('error', onError, { once: true });
  });
}

async function generateStateTextures(){
  const captureVideo = document.createElement('video');
  captureVideo.src = referenceVideoUrl;
  captureVideo.muted = true;
  captureVideo.playsInline = true;
  captureVideo.preload = 'auto';
  captureVideo.load();
  if (captureVideo.readyState < 1) await waitForEvent(captureVideo, 'loadedmetadata');

  for (const name of stateOrder) {
    captureVideo.currentTime = Math.min(stateTimes[name], Math.max(0, captureVideo.duration - 0.05));
    await waitForEvent(captureVideo, 'seeked');
    const frame = document.createElement('canvas');
    frame.width = captureVideo.videoWidth || 1280;
    frame.height = captureVideo.videoHeight || 720;
    const context = frame.getContext('2d', { alpha: false });
    context.drawImage(captureVideo, 0, 0, frame.width, frame.height);
    const texture = new THREE.CanvasTexture(frame);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    textures[name] = texture;
  }
}

const uniforms = {
  mapFrom: { value: videoTexture },
  mapTo: { value: videoTexture },
  progress: { value: 0 },
  time: { value: 0 },
  resolution: { value: new THREE.Vector2(1280, 720) },
  isVideo: { value: 1 }
};

const material = new THREE.ShaderMaterial({
  uniforms,
  vertexShader: `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: `
    precision highp float;
    uniform sampler2D mapFrom;
    uniform sampler2D mapTo;
    uniform float progress;
    uniform float time;
    uniform float isVideo;
    varying vec2 vUv;

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }

    void main(){
      vec2 uv = vUv;
      float p = clamp(progress, 0.0, 1.0);
      float n = hash(floor(uv * vec2(42.0, 20.0)) + floor(time * 4.0));
      float edge = uv.x + (n - 0.5) * 0.12 + (1.0 - uv.y) * 0.05;
      float mask = smoothstep(p * 1.35 - 0.22, p * 1.35 + 0.02, edge);
      vec4 a = texture2D(mapFrom, uv);
      vec4 b = texture2D(mapTo, uv);
      vec4 color = mix(a, b, mask);
      float stripe = 1.0 - smoothstep(0.0, 0.018, abs(edge - (p * 1.35 - 0.08)));
      stripe *= step(0.001, p) * step(p, 0.999);
      color.rgb += vec3(0.58, 0.69, 0.05) * stripe * 0.8;
      float scan = sin((uv.y * 720.0 + time * 10.0) * 3.14159) * 0.004;
      color.rgb += scan * (1.0 - isVideo * 0.75);
      gl_FragColor = color;
    }
  `
});

const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
scene.add(plane);

const els = {
  boot: document.querySelector('#boot'),
  modeButton: document.querySelector('#modeButton'),
  modeLabel: document.querySelector('#modeLabel'),
  soundButton: document.querySelector('#soundButton'),
  playPause: document.querySelector('#playPause'),
  enterInteractive: document.querySelector('#enterInteractive'),
  timeline: document.querySelector('#timeline'),
  timelineFill: document.querySelector('#timelineFill'),
  timecode: document.querySelector('#timecode'),
  interactiveLayer: document.querySelector('#interactiveLayer'),
  transitionFlash: document.querySelector('.transition-flash'),
  interactionNote: document.querySelector('#interactionNote')
};

let mode = 'cinematic';
let currentState = 'operator';
let transitioning = false;
let selectedModule = 'blink';

function resize(){
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  const screenAspect = w / h;
  const mediaAspect = 16 / 9;
  if (screenAspect > mediaAspect) {
    plane.scale.set(mediaAspect / screenAspect, 1, 1);
  } else {
    plane.scale.set(1, screenAspect / mediaAspect, 1);
  }
}
window.addEventListener('resize', resize);
resize();

function render(t){
  uniforms.time.value = t * 0.001;
  renderer.render(scene, camera);
  if (mode === 'cinematic' && video.duration) {
    const pct = (video.currentTime / video.duration) * 100;
    els.timelineFill.style.width = `${pct}%`;
    els.timeline.setAttribute('aria-valuenow', String(Math.round(pct)));
    els.timecode.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
    if (video.ended) els.playPause.textContent = 'REPLAY';
  }
  requestAnimationFrame(render);
}
requestAnimationFrame(render);

function formatTime(seconds){
  const s = Math.max(0, Math.floor(seconds || 0));
  return `00:${String(s).padStart(2,'0')}`;
}

function animateValue({ from = 0, to = 1, duration = 600, ease = t => t, onUpdate, onComplete }){
  const started = performance.now();
  function step(now){
    const raw = Math.min(1, (now - started) / duration);
    const value = from + (to - from) * ease(raw);
    onUpdate(value);
    if (raw < 1) requestAnimationFrame(step);
    else onComplete?.();
  }
  requestAnimationFrame(step);
}

const easeInOut = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

function flash(){
  els.transitionFlash.getAnimations().forEach(animation => animation.cancel());
  els.transitionFlash.animate([
    { opacity: .85, transform: 'scaleX(0)', transformOrigin: 'left' },
    { opacity: .85, transform: 'scaleX(1)', transformOrigin: 'left', offset: .4 },
    { opacity: 0, transform: 'scaleX(0)', transformOrigin: 'right' }
  ], { duration: 560, easing: 'cubic-bezier(.65,0,.2,1)' });
}

function transitionTo(next){
  if (transitioning || !textures[next] || next === currentState) return;
  transitioning = true;
  uniforms.mapFrom.value = textures[currentState];
  uniforms.mapTo.value = textures[next];
  uniforms.progress.value = 0;
  uniforms.isVideo.value = 0;
  flash();
  animateValue({
    from: 0,
    to: 1,
    duration: 620,
    ease: easeInOut,
    onUpdate: value => { uniforms.progress.value = value; },
    onComplete: () => {
      currentState = next;
      uniforms.mapFrom.value = textures[next];
      uniforms.mapTo.value = textures[next];
      uniforms.progress.value = 0;
      transitioning = false;
      updateInteractiveState();
    }
  });
}

function setMode(nextMode){
  mode = nextMode;
  const interactive = mode === 'interactive';
  document.body.classList.toggle('interactive', interactive);
  els.interactiveLayer.setAttribute('aria-hidden', String(!interactive));
  els.modeLabel.textContent = interactive ? 'INTERACTIVE REPLICA' : 'EXACT PLAYBACK';
  if (interactive) {
    video.pause();
    currentState = stateOrder.includes(currentState) ? currentState : 'operator';
    uniforms.mapFrom.value = textures[currentState];
    uniforms.mapTo.value = textures[currentState];
    uniforms.progress.value = 0;
    uniforms.isVideo.value = 0;
    updateInteractiveState();
  } else {
    uniforms.mapFrom.value = videoTexture;
    uniforms.mapTo.value = videoTexture;
    uniforms.progress.value = 0;
    uniforms.isVideo.value = 1;
    video.play().catch(() => {});
  }
}

function updateInteractiveState(){
  document.querySelectorAll('.hotspot').forEach(el => el.classList.remove('enabled'));
  const enable = selector => document.querySelector(selector)?.classList.add('enabled');
  if (currentState === 'operator') enable('.operator-select');
  if (currentState === 'gear') enable('.gear-confirm');
  if (currentState === 'weapon') enable('.weapon-equip');
  if (currentState === 'modules') {
    enable('.module-blink'); enable('.module-echo'); enable('.module-break'); enable('.module-confirm');
  }
  if (currentState === 'sync') enable('.sync-continue');
  if (currentState === 'ready' || currentState === 'deploy') enable('.deploy-button');
  document.querySelectorAll('[data-scene]').forEach(btn => btn.classList.toggle('active', btn.dataset.scene === currentState));
  const notes = {
    operator: 'SELECT KIRA VENN', gear: 'CONFIRM LOADOUT', weapon: 'EQUIP ARC SPEAR 07',
    modules: `PHASE MODULE: ${selectedModule.toUpperCase()}`, sync: 'SYNCHRONIZATION COMPLETE',
    ready: 'DEPLOY WHEN READY', deploy: 'DEPLOYMENT CONFIRMED'
  };
  els.interactionNote.textContent = notes[currentState] || '';
}

document.querySelectorAll('[data-target]').forEach(button => {
  button.addEventListener('click', () => transitionTo(button.dataset.target));
});

document.querySelectorAll('[data-scene]').forEach(button => {
  button.addEventListener('click', () => transitionTo(button.dataset.scene));
});

document.querySelectorAll('[data-action]').forEach(button => {
  button.addEventListener('click', () => {
    selectedModule = button.dataset.action;
    els.interactionNote.textContent = `PHASE MODULE: ${selectedModule.toUpperCase()}`;
    flash();
  });
});

els.modeButton.addEventListener('click', () => setMode(mode === 'cinematic' ? 'interactive' : 'cinematic'));
els.enterInteractive.addEventListener('click', () => setMode('interactive'));
els.soundButton.addEventListener('click', () => {
  video.muted = !video.muted;
  els.soundButton.textContent = video.muted ? 'SOUND OFF' : 'SOUND ON';
});
els.playPause.addEventListener('click', () => {
  if (video.ended) { video.currentTime = 0; video.play(); els.playPause.textContent = 'PAUSE'; return; }
  if (video.paused) { video.play(); els.playPause.textContent = 'PAUSE'; }
  else { video.pause(); els.playPause.textContent = 'PLAY'; }
});
els.timeline.addEventListener('click', event => {
  if (!video.duration) return;
  const rect = els.timeline.getBoundingClientRect();
  video.currentTime = ((event.clientX - rect.left) / rect.width) * video.duration;
});
video.addEventListener('play', () => els.playPause.textContent = 'PAUSE');
video.addEventListener('pause', () => { if (!video.ended) els.playPause.textContent = 'PLAY'; });
video.addEventListener('ended', () => els.playPause.textContent = 'REPLAY');

document.addEventListener('keydown', event => {
  if (event.key.toLowerCase() === 'i') setMode('interactive');
  if (event.key.toLowerCase() === 'c') setMode('cinematic');
  if (mode === 'interactive') {
    const index = stateOrder.indexOf(currentState);
    if (event.key === 'ArrowRight') transitionTo(stateOrder[Math.min(index + 1, stateOrder.length - 1)]);
    if (event.key === 'ArrowLeft') transitionTo(stateOrder[Math.max(index - 1, 0)]);
  }
});

Promise.all([
  generateStateTextures(),
  video.readyState >= 3 ? Promise.resolve() : waitForEvent(video, 'canplay')
]).then(() => {
  video.play().catch(() => {});
  setTimeout(() => els.boot.classList.add('hidden'), 850);
  updateInteractiveState();
}).catch(error => {
  console.error('Failed to load replica assets', error);
  els.boot.querySelector('.boot-copy').textContent = 'ASSET LOAD FAILED';
});

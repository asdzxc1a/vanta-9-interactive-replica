# VANTA/9 Interactive Replica

A scene-by-scene interactive web reconstruction of the supplied 15-second interface video.

## Run locally

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Controls

- Exact Playback is the pixel-faithful source sequence rendered through a Three.js WebGL surface.
- Enter Interactive switches to clickable scene states.
- Arrow Left/Right changes interactive scenes.
- `I` opens interactive mode; `C` returns to cinematic mode.
- Sound, play/pause, timeline scrubbing, module selection, and deploy controls are functional.

## Implementation

- Three.js WebGL shader surface
- Exact reference playback
- Extracted key-state textures
- Custom lime scan/wipe transition shader
- Responsive 16:9 composition
- DOM interaction hotspots and accessible labels

# VANTA/9 Interactive Replica

A self-contained Three.js reconstruction of the futuristic operator, loadout, weapon-inspection, phase-module, synchronization, ready, and deploy sequence.

## Run locally

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Controls

- **Cinematic Replica** automatically plays the reconstructed sequence.
- **Enter Interactive** enables clickable scene controls.
- Left and right arrow keys change scenes in interactive mode.
- `I` opens interactive mode; `C` returns to cinematic mode.
- The timeline supports play, pause, and scrubbing.
- Operator selection, gear confirmation, weapon equip, module selection, synchronization, and deploy controls are functional.

## Implementation

- Three.js WebGL rendering
- Runtime-generated 1280×720 interface textures
- Custom lime scan/wipe shader transitions
- Responsive 16:9 presentation
- DOM interaction hotspots and accessible labels
- No build step or binary assets required

## Source-video edition

The separately delivered project archive includes the supplied reference MP4 and extracted interface-state assets. This GitHub edition is intentionally self-contained so it can be cloned and run immediately from static hosting.

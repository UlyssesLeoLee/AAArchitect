# Third-party notices

## Three.js

- Package: `three` pinned at `0.180.0` (installed during frontend build)
- License: MIT License (https://threejs.org/license/)
- Copyright: © 2010–2026 three.js authors
- Retain Three.js MIT license when you redistribute a compiled application including Three.js.

## Vite

- Package: `vite` pinned at `7.1.10` (development/build dependency)
- License: MIT (https://github.com/vitejs/vite/blob/main/LICENSE)

The distributed plugin source archive **does not vendor** the npm packages or contain a compiled WebGL bundle. `npm install` and `npm run build` must complete on a machine with npm registry access or a usable local npm cache before obtaining a self-contained static deployment directory.

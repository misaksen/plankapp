# Plank Tracker (MediaPipe + Offline PWA)

Mobile-focused progressive web app that uses the device camera and MediaPipe Pose Landmarker to decide when you are actively holding a plank, track breaks, and summarize every session. The app caches assets, pose models, and history locally so it works without a network connection after the first load.

## Features

- **On-device pose inference** using `@mediapipe/tasks-vision` with a custom heuristic classifier for plank vs. break.
- **Tap-to-start camera flow** that respects permissions and keeps the UI responsive by doing detection in `requestAnimationFrame` loops.
- **Audio cues while holding** a plank so you get instant feedback without looking at the screen.
- **Session analytics** showing total time, current hold, break durations, and prior records.
- **Local-only history** backed by IndexedDB (`idb`) plus a lightweight Zustand store.
- **Offline-first PWA** via `vite-plugin-pwa`, service-worker caching for MediaPipe models, and installable manifest/icons.

## Getting Started

```bash
npm install
npm run dev
```

Visit the printed URL on a mobile browser, grant camera access after tapping **Start tracking**, and you should see live posture feedback.

### Camera Permissions & HTTPS

Mobile browsers only expose the camera to pages served from `https://` (or `http://localhost`). If you see a “Camera permission was blocked” warning, reload over HTTPS and re-enable camera access in the browser settings before tapping **Start tracking** again.

### Production Build

```bash
npm run build
npm run preview
```

Deploy the `dist/` folder to any static host that serves HTTPS.

## MediaPipe Model Caching

The pose model (`pose_landmarker_lite.task`) and WASM files are requested from Google Cloud storage/JSDelivr the first time you start tracking. The service worker pins these assets so subsequent sessions can run offline. If you need to ship fully offline from the first run, download the task file + `@mediapipe/tasks-vision` wasm bundle and place them under `public/mediapipe`, then update `MODEL_URL` / `WASM_URL` inside `src/hooks/usePoseTracker.ts`.

## Tech Stack

- Vite + React 19 + TypeScript
- MediaPipe Tasks Vision
- Zustand for lightweight state
- IndexedDB via `idb`
- `vite-plugin-pwa` for manifest/workbox/service worker plumbing

## Scripts

| Command        | Description                                |
| -------------- | ------------------------------------------ |
| `npm run dev`  | Start Vite dev server with SW + HMR        |
| `npm run build`| Type-check + bundle for production         |
| `npm run preview` | Preview the production build locally   |
| `npm run lint` | ESLint on all source files                 |

## Privacy & Offline Storage

All session stats stay in IndexedDB inside the browser. Use the **Clear** button in the history panel (or `resetHistory` inside `sessionStore`) to delete every stored record.

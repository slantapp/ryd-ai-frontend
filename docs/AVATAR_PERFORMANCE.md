# Avatar performance notes

The active `public/avatars/avatar.glb` and `public/avatars/male.glb` are Meshopt-compressed copies of the original Avaturn models. Their sizes dropped from 12.98 MB and 12.13 MB to 4.11 MB and 3.78 MB. The package's GLTF loader supports `EXT_meshopt_compression`; both files pass glTF validation, retain the original node names and facial morph-target lists, and are included in the Vite build. The previous byte-identical models remain in `public/avatars/original/` for rollback.

Vercel serves `/avatars/*` with a one-day browser cache. Keep those URLs stable only when a one-day update delay is acceptable. If a model is replaced again and must update immediately for returning visitors, give the new file a versioned URL and update `src/stores/instructorStore.ts`.

The app manifest requests `@thattobi/narrator-avatar@1.1.11`. Version 1.1.11 adds bounded Deepgram retries, adaptive compressed audio for slow connections, and parallel lip-sync initialization. After publishing 1.1.11 to npm, run `npm install` in this project to update `package-lock.json` and `node_modules`; until then they remain at 1.1.10, so these package improvements are not active yet. The teacher playground also passes the auditioned voice to `speakText`, which remains useful independently of the package upgrade.

The legacy exercise screen uses `@sage-rsc/talking-head-react`, not `@thattobi/narrator-avatar`. It therefore does not receive the 1.1.11 speech improvements and its GLTF loader does not enable Meshopt decoding for the compressed instructor GLBs. Migrate or repair that path separately before claiming the exercise screen uses the same optimized engine.

No lesson text is pre-sent to Deepgram here. Background preloading or pre-generating curriculum speech changes when and how authored text is sent to the provider, may incur extra requests, and should be enabled only after that behavior is explicitly approved.

# Avatar performance notes

The active `public/avatars/avatar.glb` and `public/avatars/male.glb` are Meshopt-compressed copies of the original Avaturn models. Their sizes dropped from 12.98 MB and 12.13 MB to 4.11 MB and 3.78 MB. The package's GLTF loader supports `EXT_meshopt_compression`; both files pass glTF validation, retain the original node names and facial morph-target lists, and are included in the Vite build. The previous byte-identical models remain in `public/avatars/original/` for rollback.

Vercel serves `/avatars/*` with a one-day browser cache. Keep those URLs stable only when a one-day update delay is acceptable. If a model is replaced again and must update immediately for returning visitors, give the new file a versioned URL and update `src/stores/instructorStore.ts`.

The teacher playground passes a fixed `ttsVoice` prop to the currently published package and supplies the selected voice to `speakText`. This avoids rebuilding the 3D avatar each time a teacher auditions another voice. The narrator-avatar source also fixes that reload at the package level and adds bounded Deepgram retries, adaptive compressed audio for slow connections, and parallel lip-sync initialization. Those package-level changes require publishing and installing a new npm version before they affect this app.

No lesson text is pre-sent to Deepgram here. Background preloading or pre-generating curriculum speech changes when and how authored text is sent to the provider, may incur extra requests, and should be enabled only after that behavior is explicitly approved.

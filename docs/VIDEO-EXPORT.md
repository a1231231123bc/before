# Six-second progress video

On the comparison screen, choose two moments and tap **Create 6-second video**. Frameago creates a silent H.264/MP4 on the device, displays a playable preview, and offers **Save to Photos** and **Share video**. The browser offers a download and Web Share when supported. Instagram publication is completed by the user in Instagram; Frameago does not connect to an Instagram account or auto-publish.

## Output

- 1080 × 1920, portrait 9:16, H.264 / YUV 4:2:0, 30 fps, exactly 180 frames / 6 seconds.
- Hold before for 1 second, reveal after over 2 seconds, hold after for 1 second, return over 2 seconds. The first and last frame have identical composition.
- Center-cropped photos, project title, dates, elapsed days, and Frameago branding. The title is fitted with an ellipsis if necessary. No music is embedded.
- The selected before/after order is preserved, including comparisons in reverse chronological order.

## Implementation

`src/video/renderer.ts` draws the composition to a canvas and encodes frames with the bundled `h264-mp4-encoder` WebAssembly binary. It runs inside a native `react-native-webview` or a sandboxed browser iframe, so it does not rely on Hermes supporting WebAssembly, a server, a CDN, or a custom native encoder. WebView and MediaLibrary are included in Expo Go SDK 57. The two images and fonts are passed as data URLs; nothing is uploaded. Browser development assets still come from the local dev server, as usual.

`npm run build:video` packages the renderer and encoder into an ignored generated TypeScript string module. `npm ci` runs this through `postinstall`; the normal start/check commands also rebuild it. Run it manually after changing the renderer if Metro is already running. Never import the encoder's Node build into the app.

The renderer pre-draws still layers, keeps only a few full-size frames in memory, and yields between frame groups. Progress and result messages cross a validated bridge. The browser listener only accepts messages from its own iframe. User text is JSON-encoded and escaped before embedding in HTML. The frame has a restrictive content-security policy and no network-dependent assets.

Closing the sheet destroys the renderer and cancels an in-progress export. A stalled or failed export can be retried. Completed MP4s are temporary files in the native cache; closing the sheet removes them after any active save/share operation finishes. Files copied to Photos remain there. Browser blob URLs are released after a short delay so a download can finish. App termination can leave cache files for the OS to purge.

On iOS, saving requests **add-only** Photos permission at the user's tap. It uses the SDK 57 `MediaLibrary.Asset.create` API. Modern Android saves app-owned media without requesting broad read permissions; older Android requests write access. Denial does not discard the video: the user can retry or use the share sheet. Nothing is saved until Save/Share is tapped.

## Validation and device checks

- Unit tests cover timeline landmarks, safe Unicode filenames, and bridge validation.
- Chromium and WebKit browser tests render and decode a real MP4, assert duration/dimensions and AVC MP4 content, download it, and exercise cancellation/reopening.
- The iOS/Android/web JS bundles must build. A JS export is not a signed native build.
- Manually verified in Expo Go 57.0.9 on the iPhone 16 Pro / iOS 18.3 simulator: encoding, in-app playback, add-only permission denial, successful save after granting permission, and the native MP4 share sheet. The sample output is about 2.2 MB; FFprobe confirms H.264 Baseline level 4.0, YUV420p, 30 fps, 180 frames and 6.000 seconds.
- During development, Fast Refresh can invalidate an open export's temporary file. Close and recreate the video after changing the export code. Missing cached files produce an actionable message; exported copies in Photos are unaffected.
- Before store release, test a physical iPhone and Android device: actual photo-library save, denied permission, share cancellation, imported HEIC/large images, backgrounding, low storage, and export speed/memory on older devices. Verify a saved file can be selected in the installed Instagram app.

## Licenses and source

- **h264-mp4-encoder 1.0.12**: [MIT license](licenses/h264-mp4-encoder-MIT.txt), [upstream source and build instructions](https://github.com/TrevorSundberg/h264-mp4-encoder). Its browser distribution is bundled unmodified.
- **minih264**: CC0/public-domain H.264 encoder; [source used by the encoder](https://github.com/TrevorSundberg/minih264).
- **libmp4v2**: [MPL 1.1 license](licenses/libmp4v2-MPL-1.1.txt); [source, including the upstream WebAssembly modifications](https://github.com/TrevorSundberg/libmp4v2). Frameago makes no changes to this library. The upstream h264-mp4-encoder repository pins its submodule source revisions and provides the build scripts.
- Bundled fonts retain their existing SIL Open Font License notices in `docs/licenses/`.

The app's About screen links to these notices and sources. Maintain them when updating the encoder.

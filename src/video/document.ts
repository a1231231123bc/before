import { rendererSource } from './generated/renderer';
import type { VideoJob } from './spec';

export function videoDocument(job: VideoJob) {
  // User-entered titles must never be able to terminate the inline script.
  const data = JSON.stringify(job).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data:; font-src data:; media-src blob: data:; connect-src data:">
<style>html,body{margin:0;background:#F7F5EF;overflow:hidden}canvas,video{width:100%;height:100%;object-fit:contain;display:block}body{height:100vh}[hidden]{display:none}</style></head>
<body><canvas aria-label="Rendering your progress video"></canvas><video hidden controls playsinline loop muted aria-label="Your progress video"></video>
<script>${rendererSource.replace(/<\/script/gi, '<\\/script')}\nBeforeVideo.start(${data});</script></body></html>`;
}

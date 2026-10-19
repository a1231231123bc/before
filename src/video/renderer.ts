// Runs only inside an isolated browser frame / native WebView, never in Hermes.
import { beforeFraction, VIDEO, type VideoJob, type VideoMessage } from './spec';
declare const HME: typeof import('h264-mp4-encoder');

const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

async function loadImage(src: string) {
  const image = new Image();
  image.src = src;
  await image.decode();
  return image;
}

function cover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
  const sw = w / scale,
    sh = h / scale;
  ctx.drawImage(
    image,
    (image.naturalWidth - sw) / 2,
    (image.naturalHeight - sh) / 2,
    sw,
    sh,
    x,
    y,
    w,
    h,
  );
}

function fitText(ctx: CanvasRenderingContext2D, text: string, width: number) {
  if (ctx.measureText(text).width <= width) return text;
  const chars = Array.from(text);
  while (chars.length && ctx.measureText(`${chars.join('')}…`).width > width) chars.pop();
  return `${chars.join('')}…`;
}

async function makeScene(job: VideoJob) {
  const [before, after] = await Promise.all([loadImage(job.before), loadImage(job.after)]);
  await Promise.all([
    new FontFace('BeforeSerif', `url(${job.serif})`).load(),
    new FontFace('BeforeSans', `url(${job.sans})`).load(),
  ]).then((fonts) => fonts.forEach((font) => document.fonts.add(font)));
  // Pre-render the two photos and the typography once. Encoding keeps only a few frames in memory.
  const base = document.createElement('canvas');
  base.width = VIDEO.width;
  base.height = VIDEO.height;
  const bg = base.getContext('2d')!;
  bg.fillStyle = '#F7F5EF';
  bg.fillRect(0, 0, base.width, base.height);
  bg.fillStyle = '#455942';
  bg.font = '25px BeforeSans';
  bg.fillText('A CHANGE WORTH SEEING', 64, 210);
  bg.font = '74px BeforeSerif';
  bg.fillStyle = '#292E29';
  bg.fillText(fitText(bg, job.title.replace(/\s+/g, ' '), 952), 64, 312);
  bg.font = '30px BeforeSans';
  bg.fillStyle = '#74786E';
  bg.fillText(
    job.days === 0
      ? 'Two moments. One story.'
      : `${job.days} ${job.days === 1 ? 'day' : 'days'} of progress`,
    64,
    374,
  );

  const rect = { x: 64, y: 438, w: 952, h: 1056 };
  cover(bg, after, rect.x, rect.y, rect.w, rect.h);
  bg.font = '25px BeforeSans';
  bg.fillStyle = '#455942';
  bg.fillText('BEFORE', 64, 1556);
  bg.textAlign = 'right';
  bg.fillText('AFTER', 1016, 1556);
  bg.fillStyle = '#74786E';
  bg.font = '28px BeforeSans';
  bg.fillText(job.afterDate, 1016, 1604);
  bg.textAlign = 'left';
  bg.fillText(job.beforeDate, 64, 1604);
  bg.fillStyle = '#455942';
  bg.font = '52px BeforeSerif';
  bg.fillText('frameago.', 64, 1712);
  bg.font = '24px BeforeSans';
  bg.textAlign = 'right';
  bg.fillText('Small moments. Visible progress.', 1016, 1708);
  const first = document.createElement('canvas');
  first.width = rect.w;
  first.height = rect.h;
  cover(first.getContext('2d')!, before, 0, 0, rect.w, rect.h);

  return (ctx: CanvasRenderingContext2D, time: number) => {
    ctx.drawImage(base, 0, 0);
    const fraction = beforeFraction(time);
    const cut = rect.w * fraction;
    if (cut > 0) ctx.drawImage(first, 0, 0, cut, rect.h, rect.x, rect.y, cut, rect.h);
    if (fraction > 0.001 && fraction < 0.999) {
      const x = rect.x + cut,
        y = rect.y + rect.h / 2;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x - 2, rect.y, 4, rect.h);
      ctx.beginPath();
      ctx.arc(x, y, 31, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#455942';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 8, y - 8);
      ctx.lineTo(x - 16, y);
      ctx.lineTo(x - 8, y + 8);
      ctx.moveTo(x + 8, y - 8);
      ctx.lineTo(x + 16, y);
      ctx.lineTo(x + 8, y + 8);
      ctx.stroke();
    }
  };
}

function send(message: VideoMessage) {
  const data = JSON.stringify(message);
  const bridge = (
    window as unknown as { ReactNativeWebView?: { postMessage: (value: string) => void } }
  ).ReactNativeWebView;
  if (bridge) bridge.postMessage(data);
  else window.parent.postMessage(data, '*');
}

export async function start(job: VideoJob) {
  let encoder: Awaited<ReturnType<typeof HME.createH264MP4Encoder>> | undefined;
  try {
    const canvas = document.querySelector('canvas')!;
    canvas.width = VIDEO.width;
    canvas.height = VIDEO.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('This device could not create the video canvas.');
    const draw = await makeScene(job);
    draw(ctx, 0);
    encoder = await HME.createH264MP4Encoder();
    encoder.width = VIDEO.width;
    encoder.height = VIDEO.height;
    encoder.frameRate = VIDEO.fps;
    // A fixed quantizer avoids the rate controller starving the first still frame.
    encoder.kbps = 0;
    encoder.quantizationParameter = 22;
    encoder.speed = 5;
    encoder.groupOfPictures = VIDEO.fps;
    encoder.initialize();
    for (let frame = 0; frame < VIDEO.frames; frame++) {
      // Include both endpoints: the last frame is exactly the first frame for a clean loop.
      draw(ctx, (frame * VIDEO.seconds) / (VIDEO.frames - 1));
      encoder.addFrameRgba(ctx.getImageData(0, 0, VIDEO.width, VIDEO.height).data);
      if (frame % 3 === 0) {
        send({ type: 'progress', progress: (frame + 1) / (VIDEO.frames + 3) });
        await pause();
      }
    }
    encoder.finalize();
    const bytes = new Uint8Array(encoder.FS.readFile(encoder.outputFilename));
    encoder.delete();
    encoder = undefined;
    const blob = new Blob([bytes], { type: 'video/mp4' });
    const video = document.querySelector('video')!;
    video.src = URL.createObjectURL(blob);
    video.hidden = false;
    canvas.hidden = true;
    // Blob URL lives until this export's iframe/WebView is destroyed.
    void video.play().catch(() => {
      /* Playback can require a tap on iOS. */
    });
    const reader = new FileReader();
    reader.onload = () => send({ type: 'done', base64: (reader.result as string).split(',')[1] });
    reader.onerror = () =>
      send({ type: 'error', message: 'The video could not be prepared. Please try again.' });
    reader.readAsDataURL(blob);
  } catch (error) {
    send({
      type: 'error',
      message: error instanceof Error ? error.message : 'The video could not be created.',
    });
  } finally {
    encoder?.delete();
  }
}

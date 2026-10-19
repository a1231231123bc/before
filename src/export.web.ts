import type { ExportOptions } from './export';
import { formatDate } from './domain';
import { photoUri } from './photos';

export async function exportComparison({ title, before, after }: ExportOptions) {
  const images = await Promise.all(
    [before, after].map(async (entry) => {
      const image = new window.Image();
      image.crossOrigin = 'anonymous';
      image.src = photoUri(entry.imageUri);
      await image.decode();
      return image;
    }),
  );
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1380;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not export this comparison.');
  ctx.fillStyle = '#F7F5EF';
  ctx.fillRect(0, 0, 1200, 1380);
  ctx.fillStyle = '#292E29';
  ctx.font = '68px Georgia';
  ctx.fillText(title, 64, 100, 1072);
  images.forEach((image, index) => {
    const w = 532,
      h = 1000,
      x = 64 + index * 540,
      y = 148;
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
    ctx.fillStyle = '#292E29';
    ctx.font = 'bold 21px sans-serif';
    ctx.fillText(index === 0 ? 'BEFORE' : 'AFTER', x, 1200);
    ctx.fillStyle = '#74786E';
    ctx.font = '24px sans-serif';
    ctx.fillText(formatDate((index === 0 ? before : after).date, true), x, 1240);
  });
  ctx.fillStyle = '#455942';
  ctx.font = '44px Georgia';
  ctx.fillText('frameago.', 64, 1330);
  ctx.font = '22px sans-serif';
  ctx.fillText('Small moments. Visible progress.', 540, 1326);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Export failed.'))),
      'image/png',
    ),
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'frameago'}-comparison.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

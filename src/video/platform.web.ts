import { Asset } from 'expo-asset';
import { videoDocument } from './document';
import { prepareVideoJob } from './prepare';
import { videoFilename, type ExportedVideo, type VideoInput } from './spec';

export async function prepareVideoDocument(input: VideoInput) {
  return videoDocument(
    await prepareVideoJob(input, async (source, mime) => {
      if (typeof source === 'string' && source.startsWith('data:')) return source;
      const response = await fetch(
        typeof source === 'number' ? Asset.fromModule(source).uri : source,
      );
      if (!response.ok) throw new Error('A photo or font could not be loaded. Please try again.');
      const blob = new Blob([await response.arrayBuffer()], { type: mime });
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('A photo could not be read.'));
        reader.readAsDataURL(blob);
      });
    }),
  );
}

export function receiveVideo(base64: string, title: string): ExportedVideo {
  const raw = atob(base64);
  const bytes = Uint8Array.from(raw, (char) => char.charCodeAt(0));
  const file = new File([bytes], videoFilename(title), { type: 'video/mp4' });
  const url = URL.createObjectURL(file);
  return {
    canShare: !!navigator.canShare?.({ files: [file] }),
    async save() {
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
    },
    async share() {
      await navigator.share({ files: [file], title });
    },
    // Keep a just-started browser download alive even if the sheet is closed immediately.
    dispose() {
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
  };
}

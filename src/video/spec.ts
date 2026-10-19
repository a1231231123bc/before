import type { Entry } from '../domain';

export const VIDEO = { width: 1080, height: 1920, fps: 30, seconds: 6, frames: 180 } as const;
export type VideoInput = { title: string; before: Entry; after: Entry };
export type VideoJob = {
  title: string;
  before: string;
  after: string;
  beforeDate: string;
  afterDate: string;
  days: number;
  serif: string;
  sans: string;
};
export type VideoMessage =
  | { type: 'progress'; progress: number }
  | { type: 'done'; base64: string }
  | { type: 'error'; message: string };
export type ExportedVideo = {
  save: () => Promise<void>;
  share: () => Promise<void>;
  canShare: boolean;
  dispose: () => void;
};

/** Fraction of the frame covered by the BEFORE image. */
export function beforeFraction(seconds: number) {
  const ease = (t: number) => t * t * (3 - 2 * t);
  const t = Math.max(0, Math.min(VIDEO.seconds, seconds));
  if (t <= 1) return 1;
  if (t < 3) return 1 - ease((t - 1) / 2);
  if (t <= 4) return 0;
  return ease((t - 4) / 2);
}

export function videoFilename(title: string) {
  return `${
    title
      .normalize('NFKC')
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 70) || 'frameago'
  }-progress.mp4`;
}

export function parseVideoMessage(raw: string): VideoMessage | null {
  try {
    const value = JSON.parse(raw);
    if (value?.type === 'progress' && Number.isFinite(value.progress))
      return { type: 'progress', progress: Math.min(1, Math.max(0, value.progress)) };
    if (value?.type === 'error' && typeof value.message === 'string')
      return { type: 'error', message: value.message.slice(0, 300) };
    if (
      value?.type === 'done' &&
      typeof value.base64 === 'string' &&
      value.base64.length > 32 &&
      value.base64.length < 40_000_000 &&
      /^[A-Za-z0-9+/]+={0,2}$/.test(value.base64)
    )
      return { type: 'done', base64: value.base64 };
  } catch {
    /* Ignore messages that are not part of the renderer protocol. */
  }
  return null;
}

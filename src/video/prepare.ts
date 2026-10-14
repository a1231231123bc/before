import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display/400Regular';
import { daySpan, formatDate } from '../domain';
import { photoSource } from '../photos';
import type { VideoInput, VideoJob } from './spec';

export async function prepareVideoJob(
  input: VideoInput,
  read: (source: number | string, mime: string) => Promise<string>,
): Promise<VideoJob> {
  const sources = [input.before, input.after].map((entry) => {
    const source = photoSource(entry.imageUri);
    return typeof source === 'number' ? source : source.uri;
  });
  const [before, after, serif, sans] = await Promise.all([
    read(sources[0], 'image/jpeg'),
    read(sources[1], 'image/jpeg'),
    read(DMSerifDisplay_400Regular, 'font/ttf'),
    read(DMSans_400Regular, 'font/ttf'),
  ]);
  return {
    title: input.title,
    before,
    after,
    serif,
    sans,
    beforeDate: formatDate(input.before.date, true),
    afterDate: formatDate(input.after.date, true),
    days: daySpan([input.before, input.after]),
  };
}

import { RefObject } from 'react';
import { View } from 'react-native';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Entry } from './domain';

export type ExportOptions = {
  title: string;
  before: Entry;
  after: Entry;
  view: RefObject<View | null>;
};
export async function exportComparison({ view }: ExportOptions) {
  if (!(await Sharing.isAvailableAsync()))
    throw new Error('Sharing is unavailable on this device.');
  const uri = await captureRef(view, { format: 'png', quality: 1, result: 'tmpfile', width: 1200 });
  try {
    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      UTI: 'public.png',
      dialogTitle: 'Share your progress',
    });
  } finally {
    releaseCapture(uri);
  }
}

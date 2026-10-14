import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { makeId } from '../domain';
import { videoDocument } from './document';
import { prepareVideoJob } from './prepare';
import { videoFilename, type ExportedVideo, type VideoInput } from './spec';

export async function prepareVideoDocument(input: VideoInput) {
  return videoDocument(
    await prepareVideoJob(input, async (source, mime) => {
      if (typeof source === 'string' && source.startsWith('data:')) return source;
      let uri: string;
      if (typeof source === 'number') {
        const asset = await Asset.fromModule(source).downloadAsync();
        uri = asset.localUri ?? asset.uri;
      } else uri = source;
      return `data:${mime};base64,${await new File(uri).base64()}`;
    }),
  );
}

export function receiveVideo(base64: string, title: string): ExportedVideo {
  const directory = new Directory(Paths.cache, `before-video-${makeId()}`);
  directory.create();
  const file = new File(directory, videoFilename(title));
  try {
    file.write(base64, { encoding: 'base64' });
  } catch (error) {
    directory.delete();
    throw error;
  }
  return {
    canShare: true,
    async save() {
      if (!file.exists)
        throw new Error('This temporary video has expired. Close this window and create it again.');
      // On modern Android adding our own media needs no broad library read access.
      if (Platform.OS === 'ios' || Number(Platform.Version) < 29) {
        const permission = await MediaLibrary.requestPermissionsAsync(true);
        if (!permission.granted)
          throw new Error(
            'Allow adding videos to Photos in Settings, then try again. You can also share this video to another app.',
          );
      }
      try {
        await MediaLibrary.Asset.create(file.uri);
      } catch {
        throw new Error(
          'Photos could not save the video. Check your free storage and photo permissions, then try again. The video is still available to share.',
        );
      }
    },
    async share() {
      if (!file.exists)
        throw new Error('This temporary video has expired. Close this window and create it again.');
      if (!(await Sharing.isAvailableAsync()))
        throw new Error('Sharing is unavailable. Save the video to Photos instead.');
      await Sharing.shareAsync(file.uri, {
        mimeType: 'video/mp4',
        UTI: 'public.mpeg-4',
        dialogTitle: 'Share your progress',
      });
    },
    dispose() {
      if (directory.exists) directory.delete();
    },
  };
}

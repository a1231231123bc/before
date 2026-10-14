import { Directory, File, Paths } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { makeId } from './domain';

export async function preparePhoto(uri: string, width: number, height: number): Promise<string> {
  const action =
    width >= height
      ? { resize: { width: Math.min(width, 1600) } }
      : { resize: { height: Math.min(height, 1600) } };
  const result = await manipulateAsync(uri, [action], { compress: 0.85, format: SaveFormat.JPEG });
  const directory = new Directory(Paths.document, 'moments');
  directory.create({ intermediates: true, idempotent: true });
  const destination = new File(directory, `${makeId()}.jpg`);
  new File(result.uri).copy(destination);
  return `local:${destination.name}`;
}

export function localPhotoUri(uri: string) {
  return uri.startsWith('local:') ? new File(Paths.document, 'moments', uri.slice(6)).uri : uri;
}

export async function removePhoto(uri: string) {
  if (!uri.startsWith('local:')) return;
  const file = new File(localPhotoUri(uri));
  if (file.exists) file.delete();
}

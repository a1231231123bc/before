import { Asset } from 'expo-asset';
import { localPhotoUri } from './media';

const samples: Record<string, number> = {
  'sample:white': require('../assets/demo/plant-white.jpg'),
  'sample:terracotta': require('../assets/demo/plant-terracotta.jpg'),
};
export function photoSource(uri: string): number | { uri: string } {
  return samples[uri] ?? { uri: localPhotoUri(uri) };
}
export function photoUri(uri: string) {
  return samples[uri] ? Asset.fromModule(samples[uri]).uri : localPhotoUri(uri);
}

export async function preparePhoto(uri: string, _width: number, _height: number): Promise<string> {
  const image = new window.Image();
  image.src = uri;
  await image.decode();
  const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser could not prepare this photo.');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}
export function localPhotoUri(uri: string) {
  return uri;
}
export async function removePhoto(_uri: string) {
  /* Photos live inside the atomic IndexedDB journal. */
}

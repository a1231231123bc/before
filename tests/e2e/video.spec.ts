import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('render a playable six-second portrait MP4 and download it', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore a sample story', exact: true }).click();
  await page.getByRole('button', { name: 'Compare photos' }).click();
  await page.getByRole('button', { name: 'Create 6-second video' }).click();
  await expect(
    page.getByRole('heading', { name: 'Your video is ready' }).or(page.getByRole('alert')),
  ).toBeVisible({ timeout: 120_000 });
  await expect(page.getByRole('alert')).toHaveCount(0);
  const video = page.frameLocator('iframe[title="Progress video preview"]').locator('video');
  await expect
    .poll(
      () =>
        video.evaluate((element: HTMLVideoElement) => ({
          playable: element.readyState >= 2,
          error: element.error?.message ?? null,
        })),
      { timeout: 30_000, message: 'The exported MP4 should load playable frames' },
    )
    .toEqual({ playable: true, error: null });
  const metadata = await video.evaluate((element: HTMLVideoElement) => {
    element.pause();
    return { width: element.videoWidth, height: element.videoHeight, duration: element.duration };
  });
  expect(metadata).toEqual({ width: 1080, height: 1920, duration: 6 });
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download MP4', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('A-little-greener-progress.mp4');
  const path = testInfo.outputPath('progress.mp4');
  await download.saveAs(path);
  const bytes = await readFile(path);
  expect(bytes.subarray(4, 8).toString()).toBe('ftyp');
  expect(bytes.includes(Buffer.from('avc1'))).toBe(true);
  expect(bytes.length).toBeGreaterThan(100_000);
  await testInfo.attach('Exported progress video', { path, contentType: 'video/mp4' });
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Create 6-second video' })).toBeEnabled();
});

test('closing an in-flight export cancels it and allows a fresh attempt', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore a sample story', exact: true }).click();
  await page.getByRole('button', { name: 'Compare photos' }).click();
  await page.getByRole('button', { name: 'Create 6-second video' }).click();
  await expect(page.getByRole('progressbar', { name: 'Creating video' })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.getByRole('button', { name: 'Create 6-second video' }).click();
  await expect(page.getByRole('progressbar', { name: 'Creating video' })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
});

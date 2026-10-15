import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { today, formatDate } from '../../src/domain';
const white = resolve('assets/demo/plant-white.jpg');
const orange = resolve('assets/demo/plant-terracotta.jpg');

async function addPhoto(page: Page, file = white) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Add photo', exact: true }).click();
  await (await chooser).setFiles(file);
}
async function createStory(page: Page) {
  await addPhoto(page);
  await expect(page.getByRole('heading', { name: 'Story 1', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveCount(0);
}
async function editPhoto(page: Page, date: string, note: string) {
  await page
    .getByRole('button', { name: `Edit photo from ${formatDate(today(), true)}`, exact: true })
    .click();
  await page.getByRole('textbox', { name: 'Date (YYYY-MM-DD)' }).fill(date);
  await page.getByRole('textbox', { name: 'Note (optional)' }).fill(note);
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Photo details' })).toHaveCount(0);
}
async function failWrites(page: Page) {
  await page.evaluate(() => {
    const original = IDBDatabase.prototype.transaction;
    (window as any).restoreStorage = () => {
      IDBDatabase.prototype.transaction = original;
    };
    IDBDatabase.prototype.transaction = function (this: IDBDatabase, ...args: any[]) {
      if (args[1] === 'readwrite') throw new DOMException('Disk full', 'QuotaExceededError');
      return original.apply(this, args as any);
    } as typeof original;
  });
}

test('photo-first creation and additions need no typing and survive a reload', async ({ page }) => {
  await page.goto('/');
  await createStory(page);
  await expect(page.getByRole('button', { name: 'Compare photos' })).toBeDisabled();
  await addPhoto(page, orange);
  await expect(page.getByText('2 photos · 0 days', { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: /^Edit photo from/ })).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Compare photos' })).toBeEnabled();
  await page.getByRole('button', { name: 'Before home' }).click();
  await addPhoto(page);
  await expect(page.getByRole('heading', { name: 'Story 2', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Before home' }).click();
  await expect(page.getByRole('button', { name: /^Open Story/ })).toHaveCount(2);
});

test('optional details, search, comparison, PNG export and deletion still work', async ({
  page,
}) => {
  const exceptions: string[] = [];
  page.on('pageerror', (e) => exceptions.push(e.message));
  await page.goto('/');
  await createStory(page);
  await editPhoto(page, '2025-09-01', 'A fresh beginning');
  await addPhoto(page, orange);
  await expect(page.getByRole('button', { name: 'Compare photos' })).toBeEnabled();
  await editPhoto(page, '2025-10-14', 'A little more green');
  await page.getByRole('button', { name: 'Edit story' }).click();
  await page.getByRole('textbox', { name: 'Story name' }).fill('Balcony garden');
  await page.getByRole('button', { name: 'Plants', exact: true }).click();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Story details' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Balcony garden' })).toBeVisible();
  await page.reload();
  await expect(page.getByText('A fresh beginning', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Before home' }).click();
  await page.getByRole('button', { name: 'Search stories' }).click();
  await page.getByRole('textbox', { name: 'Search stories' }).fill('plants');
  await page.getByRole('button', { name: 'Open Balcony garden', exact: true }).click();
  await page.getByRole('button', { name: 'Compare photos' }).click();
  await expect(page.getByRole('heading', { name: 'Before & after' })).toBeVisible();
  const slider = page.getByLabel('Before and after comparison', { exact: true });
  await page.getByRole('button', { name: 'More before' }).click();
  await expect(slider).toHaveAttribute('aria-valuenow', '65');
  const box = await slider.boundingBox();
  if (!box) throw new Error('Missing slider');
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect(slider).toHaveAttribute('aria-valuenow', '30');
  await page.getByRole('button', { name: 'Share image', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export comparison' }).click();
  const downloaded = await download;
  expect(downloaded.suggestedFilename()).toBe('Balcony-garden-comparison.png');
  const png = await readFile((await downloaded.path())!);
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(1380);
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Back to story' }).click();
  await page.getByRole('button', { name: 'Edit photo from Oct 14, 2025' }).click();
  await expect(page.getByRole('textbox', { name: 'Note (optional)' })).toHaveValue(
    'A little more green',
  );
  await page.getByRole('button', { name: 'Delete photo', exact: true }).click();
  await page.getByRole('button', { name: 'Keep it' }).click();
  await expect(
    page.getByText('A little more green', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Edit photo from Oct 14, 2025' }).click();
  await page.getByRole('button', { name: 'Delete photo', exact: true }).click();
  await page.getByRole('button', { name: 'Delete moment permanently' }).click();
  await expect(page.getByRole('button', { name: 'Compare photos' })).toBeDisabled();
  await page.getByRole('button', { name: 'Edit story' }).click();
  await page.getByRole('button', { name: 'Delete story', exact: true }).click();
  await page.getByRole('button', { name: 'Delete story permanently' }).click();
  await expect(page.getByRole('heading', { name: 'Start with a photo.' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Start with a photo.' })).toBeVisible();
  expect(exceptions).toEqual([]);
});

test('cancelled edits preserve saved photos and invalid details cannot be saved', async ({
  page,
}) => {
  await page.goto('/');
  await createStory(page);
  await page.getByRole('button', { name: 'Edit story' }).click();
  await page.getByRole('textbox', { name: 'Story name' }).fill('   ');
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: /^Edit photo from/ }).click();
  await page.getByRole('textbox', { name: 'Date (YYYY-MM-DD)' }).fill('2025-02-30');
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.reload();
  await expect(
    page.getByRole('button', { name: `Edit photo from ${formatDate(today(), true)}` }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Story 1', exact: true })).toBeVisible();
});

test('cancelling the picker creates no empty story and another attempt works', async ({ page }) => {
  await page.goto('/');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Add photo', exact: true }).click();
  await (await chooser).setFiles([]);
  await expect(page.getByRole('button', { name: 'Add photo', exact: true })).toBeEnabled();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Start with a photo.' })).toBeVisible();
  await createStory(page);
});

test('failed auto-save retains the photo and retry saves it exactly once', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Add photo', exact: true })).toBeVisible();
  await failWrites(page);
  await addPhoto(page);
  await expect(page.getByRole('alert')).toContainText('Couldn’t save');
  await expect(page.getByRole('heading', { name: 'Photo not saved' })).toBeVisible();
  await page.evaluate(() => (window as any).restoreStorage());
  await page.getByRole('button', { name: 'Retry saving photo' }).click();
  await expect(page.getByRole('heading', { name: 'Story 1', exact: true })).toBeVisible();
  await failWrites(page);
  await addPhoto(page, orange);
  await expect(page.getByRole('heading', { name: 'Photo not saved' })).toBeVisible();
  await page.evaluate(() => (window as any).restoreStorage());
  await page.getByRole('button', { name: 'Retry saving photo' }).click();
  await expect(page.getByRole('button', { name: /^Edit photo from/ })).toHaveCount(2);
  await page.reload();
  await expect(page.getByRole('button', { name: /^Edit photo from/ })).toHaveCount(2);
});

test('discarding a failed first photo leaves the journal empty', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Add photo', exact: true })).toBeVisible();
  await failWrites(page);
  await addPhoto(page);
  await expect(page.getByRole('heading', { name: 'Photo not saved' })).toBeVisible();
  await page.getByRole('button', { name: 'Discard photo' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Start with a photo.' })).toBeVisible();
});

test('sample comparison works without adding sample data to the journal', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore a sample story', exact: true }).click();
  await page.getByRole('button', { name: 'Compare photos' }).click();
  await page.getByRole('button', { name: 'Change photos' }).click();
  await page.getByRole('button', { name: 'Choose after photo' }).click();
  await page.getByRole('button', { name: 'Use Sep 1, 2026 as after' }).click();
  await expect(page.getByRole('button', { name: 'Choose before photo' })).toContainText(
    'Oct 14, 2026',
  );
  await page.getByRole('button', { name: 'Done choosing' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Before home' }).click();
  await expect(page.getByRole('heading', { name: 'Start with a photo.' })).toBeVisible();
});

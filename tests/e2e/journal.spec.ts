import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
const white = resolve('assets/demo/plant-white.jpg');
const orange = resolve('assets/demo/plant-terracotta.jpg');

async function createStory(page: Page, name = 'Balcony garden') {
  await page.getByRole('button', { name: 'Create a story', exact: true }).click();
  await page.getByRole('textbox', { name: 'Story name' }).fill(name);
  await page.getByRole('button', { name: 'Plants', exact: true }).click();
  await page.getByRole('button', { name: 'Create story', exact: true }).click();
  await expect(page.getByRole('heading', { name })).toBeVisible();
}
async function addMoment(page: Page, file: string, date: string, note: string) {
  await page.getByRole('button', { name: 'Add a moment', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Choose from library' }).click();
  await (await chooser).setFiles(file);
  await page.getByRole('textbox', { name: 'Date (YYYY-MM-DD)', exact: true }).fill(date);
  await page.getByRole('textbox', { name: 'A little note (optional)', exact: true }).fill(note);
  await page.getByRole('button', { name: 'Save moment', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save moment', exact: true })).toHaveCount(0);
  await expect(page.getByText(note, { exact: true }).filter({ visible: true })).toBeVisible();
}

test('create, import two photos, reload, compare, export, rename and delete', async ({ page }) => {
  const exceptions: string[] = [];
  page.on('pageerror', (e) => exceptions.push(e.message));
  await page.goto('/');
  await createStory(page);
  await expect(page.getByRole('button', { name: 'Compare photos' })).toBeDisabled();
  await addMoment(page, white, '2025-09-01', 'A fresh beginning');
  await addMoment(page, orange, '2025-10-14', 'A little more green');
  await page.reload();
  await page.getByRole('button', { name: 'Before home', exact: true }).click();
  await page.getByRole('button', { name: 'Open Balcony garden', exact: true }).click();
  await expect(
    page.getByText('A fresh beginning', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await expect(
    page.getByText('A little more green', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Compare photos' }).click();
  await expect(page.getByRole('heading', { name: 'Then. And now.' })).toBeVisible();
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
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export comparison' }).click();
  const downloaded = await download;
  expect(downloaded.suggestedFilename()).toBe('Balcony-garden-comparison.png');
  const png = await readFile((await downloaded.path())!);
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(1380);
  await page.getByRole('button', { name: 'Back to story' }).click();
  await page.getByRole('button', { name: 'Edit story' }).click();
  await page.getByRole('textbox', { name: 'Story name' }).fill('My green corner');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('heading', { name: 'My green corner' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete moment from Oct 14, 2025' }).click();
  await page.getByRole('button', { name: 'Keep it' }).click();
  await expect(
    page.getByText('A little more green', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Delete moment from Oct 14, 2025' }).click();
  await page.getByRole('button', { name: 'Delete moment permanently' }).click();
  await expect(page.getByRole('button', { name: 'Compare photos' })).toBeDisabled();
  await page.getByRole('button', { name: 'Delete story', exact: true }).click();
  await page.getByRole('button', { name: 'Delete story permanently' }).click();
  await expect(
    page.getByText('Every story starts somewhere.', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Before home', exact: true }).click();
  await expect(
    page.getByText('Every story starts somewhere.', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  expect(exceptions).toEqual([]);
});

test('empty names and invalid photo dates cannot be saved', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a story', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Create story', exact: true })).toBeDisabled();
  await page.getByRole('textbox', { name: 'Story name' }).fill('   ');
  await expect(page.getByRole('button', { name: 'Create story', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await createStory(page);
  await page.getByRole('button', { name: 'Add a moment', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Choose from library' }).click();
  await (await chooser).setFiles(white);
  await page.getByRole('textbox', { name: 'Date (YYYY-MM-DD)' }).fill('2025-02-30');
  await expect(page.getByRole('button', { name: 'Save moment', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Before home', exact: true }).click();
  await page.getByRole('button', { name: 'Open Balcony garden' }).click();
  await expect(
    page.getByText('0 moments collected', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
});

test('a failed save retains the form and permits a successful retry', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a story', exact: true }).click();
  await page.getByRole('textbox', { name: 'Story name' }).fill('Keep my draft');
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
  await page.getByRole('button', { name: 'Create story', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Couldn’t save');
  await expect(page.getByRole('textbox', { name: 'Story name' })).toHaveValue('Keep my draft');
  await page.evaluate(() => (window as any).restoreStorage());
  await page.getByRole('button', { name: 'Create story', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Keep my draft' })).toBeVisible();
});

test('sample comparison works without adding sample data to the journal', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore a sample story', exact: true }).click();
  await page.getByRole('button', { name: 'Compare photos' }).click();
  await expect(page.getByRole('button', { name: 'Export comparison' })).toBeEnabled();
  await page.getByRole('button', { name: 'Choose after photo' }).click();
  await page.getByRole('button', { name: 'Use Sep 1, 2026 as after' }).click();
  await expect(page.getByRole('button', { name: 'Choose before photo' })).toContainText(
    'Oct 14, 2026',
  );
  await page.reload();
  await page.getByRole('button', { name: 'Before home', exact: true }).click();
  await expect(
    page.getByText('Every story starts somewhere.', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
});

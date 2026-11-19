import { expect, openEditor, stickerCount, test } from './fixtures';

test('text sticker, totals sticker, and the layers list', async ({ page }) => {
  await openEditor(page);
  const n0 = await stickerCount(page);

  await page.getByRole('button', { name: 'Add a sticker' }).click();
  await page.getByText('Text', { exact: true }).first().click();
  await page.getByLabel('Your words').fill('First sub-50 10K');
  await page.getByRole('button', { name: 'Done' }).click();
  await expect.poll(() => stickerCount(page)).toBe(n0 + 1);

  await page.getByRole('button', { name: 'Add a sticker' }).click();
  await page.getByRole('tab', { name: 'Totals' }).click();
  await page.getByRole('button', { name: 'Add Week days' }).click();
  await expect.poll(() => stickerCount(page)).toBe(n0 + 2);

  await page.getByRole('button', { name: 'Layers' }).click();
  await expect(page.getByText('“First sub-50 10K”')).toBeVisible();
  await page.getByRole('button', { name: 'Move Week days back' }).click();
  const names = await page.$$eval('[aria-label$=". Select"]', (els) => els.map((e) => e.getAttribute('aria-label')!.split(/,|\. Select/)[0]));
  expect(names.slice(0, 2)).toEqual(['“First sub-50 10K”', 'Week days']);
  await page.getByRole('button', { name: 'Delete Week days' }).click();
  await page.keyboard.press('Escape');
  await expect.poll(() => stickerCount(page)).toBe(n0 + 1);
});

test('stickers an activity cannot fill say why', async ({ page }) => {
  await openEditor(page, 'a4'); // treadmill run: no route, no splits
  await page.getByRole('button', { name: 'Add a sticker' }).click();
  await expect(page.getByRole('button', { name: 'Route, unavailable: No route', exact: true })).toBeDisabled();
});

test('choose which stats a sticker shows, in order', async ({ page }) => {
  await openEditor(page);
  await page.getByRole('button', { name: 'Layers' }).click();
  await page.getByRole('button', { name: /^Three stats.*Select$/ }).click();
  await page.getByRole('button', { name: 'Choose stats' }).click();

  const chip = (name: RegExp) => page.getByRole('button', { name });
  await expect(chip(/^3\s+Time$/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back to the default' })).toBeDisabled();

  await chip(/^3\s+Time$/).click(); // take Time off
  await chip(/^Max HR$/).click(); // Max HR goes on the end
  await expect(chip(/^3\s+Max HR$/)).toHaveAttribute('aria-pressed', 'true');

  await chip(/^Climb$/).click(); // full: nothing changes, and it says why
  await expect(page.getByText('This sticker fits 3. Tap one to take it off first.')).toBeVisible();
  await expect(chip(/^Climb$/)).toHaveAttribute('aria-pressed', 'false');

  await chip(/^1\s+Distance$/).click(); // the rest move up
  await expect(chip(/^1\s+Pace$/)).toBeVisible();
  await expect(chip(/^2\s+Max HR$/)).toBeVisible();

  await page.getByRole('button', { name: 'Back to the default' }).click();
  await expect(chip(/^1\s+Distance$/)).toBeVisible();
  await expect(chip(/^3\s+Time$/)).toBeVisible();
});

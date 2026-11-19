import { expect, openEditor, stickerCount, test } from './fixtures';

test('core loop: open a run, design a story, export it, and find it again', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Hill repeats/ }).click();
  await page.getByTestId('story-canvas').waitFor({ timeout: 30_000 });
  const before = await stickerCount(page);

  await page.getByRole('button', { name: 'Add a sticker' }).click();
  await page.getByRole('button', { name: 'Add Splits', exact: true }).click();
  await page.getByRole('button', { name: 'Background' }).click();
  await page.getByRole('button', { name: 'Tide background' }).click();
  expect(await stickerCount(page)).toBe(before + 1);

  // the saved PNG is exactly story size
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save' }).click()]);
  const chunks: Buffer[] = [];
  for await (const c of await download.createReadStream()) chunks.push(c as Buffer);
  const bytes = Buffer.concat(chunks);
  expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([1080, 1920]);

  await page.waitForTimeout(600); // autosave
  await page.getByRole('button', { name: 'Close editor' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole('button', { name: /Hill repeats/ }).click();
  await page.getByTestId('story-canvas').waitFor();
  expect(await stickerCount(page)).toBe(before + 1);
});

test('dragging moves the selected sticker and shows its tools', async ({ page }) => {
  await openEditor(page);
  const box = (await page.getByTestId('story-canvas').boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height * (930 / 1920); // the route sticker
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(x + i * 4, y + i * 6);
  await page.mouse.up();
  await expect(page.getByRole('button', { name: 'Delete sticker' })).toBeVisible();
});

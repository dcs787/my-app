import { expect, test } from './fixtures';

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

test('tap copies a transparent sticker PNG; press and hold saves it', async ({ page }) => {
  await page.goto('/stickers/a1');
  const tile = page.getByRole('button', { name: 'Copy Big distance' });
  await tile.waitFor({ timeout: 30_000 });
  await tile.click();
  await expect(page.getByText('Copied. Paste it into your story.')).toBeVisible();
  const clip = await page.evaluate(async () => {
    const [item] = await navigator.clipboard.read();
    const type = item.types.find((t) => t.startsWith('image/'))!;
    const bmp = await createImageBitmap(await item.getType(type));
    const c = document.createElement('canvas');
    c.width = bmp.width;
    c.height = bmp.height;
    const g = c.getContext('2d')!;
    g.drawImage(bmp, 0, 0);
    return { type, w: bmp.width, h: bmp.height, cornerAlpha: g.getImageData(0, 0, 1, 1).data[3] };
  });
  expect(clip).toEqual({ type: 'image/png', w: 1800, h: 840, cornerAlpha: 0 });

  const box = (await page.getByRole('button', { name: 'Copy Three stats' }).boundingBox())!;
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    (async () => {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(700);
      await page.mouse.up();
    })(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.png$/);
});

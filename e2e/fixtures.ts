import { expect, test as base, type Page } from '@playwright/test';

/** Every test fails if the page logs an error or throws. */
export const test = base.extend<{ errors: string[] }>({
  errors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      await use(errors);
      expect(errors, 'console errors').toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };

/** Stickers on the canvas, read from its accessibility label. */
export async function stickerCount(page: Page): Promise<number> {
  const label = (await page.getByTestId('story-canvas').getAttribute('aria-label')) ?? '';
  return Number(/with (\d+) stickers/.exec(label)?.[1] ?? NaN);
}

export async function openEditor(page: Page, id = 'a1') {
  await page.goto(`/edit/${id}`);
  await page.getByTestId('story-canvas').waitFor({ timeout: 30_000 });
}

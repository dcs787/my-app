import { expect, test } from './fixtures';

test('empty state offers a way in, without an account', async ({ page }) => {
  await page.goto('/?empty');
  await expect(page.getByText('Bring in a run to get started')).toBeVisible();
  await expect(page.getByText(/No account needed/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Import a GPX, TCX or FIT file' })).toBeVisible();
});

test('manual entry validates, then saves straight into the editor', async ({ page }) => {
  await page.goto('/activities/new');
  await page.getByLabel('Distance (mi)').fill('abc');
  await page.getByLabel('Time', { exact: true }).fill('4:75');
  await page.getByRole('button', { name: 'Save and make a story' }).click();
  await expect(page.getByText('Enter a distance, like 6.2')).toBeVisible();
  await page.getByLabel('Distance (mi)').fill('5');
  await page.getByLabel('Time', { exact: true }).fill('40:00');
  await page.getByRole('button', { name: 'Save and make a story' }).click();
  await expect(page).toHaveURL(/\/edit\//);
});

test('details show splits; units switch to km across the app', async ({ page }) => {
  await page.goto('/activities/a1');
  await expect(page.getByText('Splits', { exact: false }).first()).toBeVisible();
  await page.goto('/settings');
  await page.getByText('Kilometres and metres').click();
  await page.getByRole('tab', { name: /Activities/ }).first().click();
  await expect(page.getByText(/10\.20 km/).first()).toBeVisible();
});

test('help answers the common questions', async ({ page }) => {
  await page.goto('/help');
  await expect(page.getByText('No. Mileprint keeps your activities and designs on this phone.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Which watches and apps work?' }).click();
  await expect(page.getByText(/Apple Watch, plus any watch app/)).toBeVisible();
});

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false });
  test('keyboard reaches the activity list', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Sunrise loop/ }).waitFor();
    const seen: string[] = [];
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      seen.push((await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '')) || '');
    }
    expect(seen.some((s) => /Sunrise loop/.test(s))).toBe(true);
  });
});

test('Delete all data empties the app', async ({ page }) => {
  await page.goto('/settings');
  page.once('dialog', (d) => d.accept()); // the confirm step
  await page.getByRole('button', { name: 'Delete all data' }).click();
  await expect(page.getByText('All data deleted')).toBeVisible();
  await page.getByRole('tab', { name: /Activities/ }).first().click();
  await expect(page.getByText('Bring in a run to get started')).toBeVisible();
});

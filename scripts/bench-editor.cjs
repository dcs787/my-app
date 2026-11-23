/**
 * Editor speed check: fills a story with stickers, drags one, and reports
 * frame gaps and long tasks, with the CPU slowed down to stand in for an
 * older iPhone. Web only (CanvasKit), so use it to compare changes, not as
 * the real number: the device checklist in SETUP.md has the iPhone check.
 *
 *   npm run build && npx serve@14 dist -l 8099 -s
 *   node scripts/bench-editor.cjs [stickers=18] [cpuSlowdown=6]
 *
 * Budget (6x slowdown, 18 stickers, 60-step drag): p95 frame gap at most
 * 70 ms, at most 35 long tasks, drag done in under 5 s. Before gestures moved
 * to the UI thread (2026-11-23): 67-100 ms, 57-58 long tasks, 6.4-7.6 s.
 * After: 50-67 ms, 8-34, 3.4-4.3 s.
 */
const { chromium, devices } = require('playwright');
const N = Number(process.argv[2] || 18);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ ...devices['iPhone 14'], deviceScaleFactor: 1 });
  const cdp = await p.context().newCDPSession(p);
  await p.goto('http://localhost:8099/edit/a1');
  await p.getByTestId('story-canvas').waitFor({ timeout: 30000 });
  const names = ['Big distance','Three stats','Stat grid','Route and stats','Title and day','Splits','Big pace','Stat list','Stacked','One line','Distance pill','Route beside stats','Framed route','Date','Fastest split','Week total','Week days','Month total'];
  let count = Number(/with (\d+) stickers/.exec(await p.getByTestId('story-canvas').getAttribute('aria-label'))[1]);
  for (const n of names) {
    if (count >= N) break;
    await p.getByRole('button', { name: 'Add a sticker' }).click();
    if (/Week|Month/.test(n)) await p.getByRole('tab', { name: 'Totals' }).click();
    const btn = p.getByRole('button', { name: `Add ${n}`, exact: true });
    if (!(await btn.count())) { await p.keyboard.press('Escape'); continue; }
    await btn.first().click();
    count++;
    await p.waitForTimeout(150);
  }
  await p.waitForTimeout(800);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.argv[3] || 6) });
  const box = await p.getByTestId('story-canvas').boundingBox();
  // measure rAF gaps and long tasks during the drag
  await p.evaluate(() => {
    window.__gaps = []; window.__long = 0; let last = performance.now();
    const loop = (t) => { window.__gaps.push(t - last); last = t; if (window.__run) requestAnimationFrame(loop); };
    window.__run = true; requestAnimationFrame(loop);
    new PerformanceObserver((l) => { window.__long += l.getEntries().length; }).observe({ entryTypes: ['longtask'] });
  });
  const x0 = box.x + box.width / 2, y0 = box.y + box.height * (1600 / 1920);
  const t0 = Date.now();
  await p.mouse.move(x0, y0); await p.mouse.down();
  for (let i = 0; i < 60; i++) await p.mouse.move(x0 + Math.sin(i / 6) * 60, y0 - i * 3);
  await p.mouse.up();
  const ms = Date.now() - t0;
  const r = await p.evaluate(() => { window.__run = false; const g = window.__gaps.slice(2).sort((a, b) => a - b); return { frames: g.length, p50: g[Math.floor(g.length / 2)], p95: g[Math.floor(g.length * 0.95)], max: g[g.length - 1], long: window.__long }; });
  console.log(JSON.stringify({ stickers: count, dragMs: ms, ...r }));
  await b.close();
})();

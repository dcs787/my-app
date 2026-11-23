/**
 * Download size check for the iPhone app's JavaScript and assets.
 *
 *   npm run size
 *
 * Exports the iOS bundle (Hermes bytecode) and sums it with the bundled
 * assets, then compares against the budget. The native part (React Native,
 * Hermes, Skia) comes on top: read it from each EAS build's page or from
 * App Store Connect → the build → App Store File Sizes. Target for the whole
 * download: under 60 MB (replica/fixes.md, fix 6).
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BUDGET = { js: 6.5, assets: 3 }; // MB; 2026-11-23: 5.6 and 2.4 (was 8.0 and 6.7)

const out = mkdtempSync(join(tmpdir(), 'mileprint-size-'));
const r = spawnSync('npx', ['expo', 'export', '-p', 'ios', '--output-dir', out], { stdio: 'inherit', env: { ...process.env, EXPO_OFFLINE: '1' } });
if (r.status !== 0) process.exit(r.status ?? 1);

const size = (dir) =>
  readdirSync(dir, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? size(join(dir, e.name)) : statSync(join(dir, e.name)).size), 0);
const mb = (b) => b / 1024 / 1024;
const js = mb(size(join(out, '_expo')));
const assets = mb(size(join(out, 'assets')));
rmSync(out, { recursive: true, force: true });

const rows = [
  ['JavaScript (bytecode)', js, BUDGET.js],
  ['Assets (fonts, images)', assets, BUDGET.assets],
];
let over = false;
for (const [name, v, b] of rows) {
  const ok = v <= b;
  over ||= !ok;
  console.log(`${ok ? 'ok  ' : 'OVER'}  ${name.padEnd(24)} ${v.toFixed(1)} MB  (budget ${b} MB)`);
}
process.exit(over ? 1 : 0);

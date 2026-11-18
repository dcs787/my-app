/**
 * @jest-environment node
 */
import { createMemoryStore } from '@/data/memoryStore';
import { toFit, toTcx } from '@/domain/__fixtures__/devices';
import { northTrack, toGpx } from '@/domain/__fixtures__/gpx';

import { importBytes, summarise } from '../importBytes';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createHash } = require('node:crypto');
const hash = async (b: ArrayBuffer): Promise<string> => createHash('sha256').update(new Uint8Array(b)).digest('hex');
const enc = (s: string) => new TextEncoder().encode(s).buffer as ArrayBuffer;
const pts = northTrack(101, 10, 3);

it('imports GPX, TCX and FIT, skips repeats, and explains failures', async () => {
  let n = 0;
  const store = createMemoryStore(() => `a${++n}`);
  const gpx = await importBytes(store, 'run.gpx', enc(toGpx(pts)), hash);
  const tcx = await importBytes(store, 'Run.TCX', enc(toTcx(pts, { distanceM: 1000, timeS: 300 })), hash);
  const fit = await importBytes(
    store,
    'watch.fit',
    toFit(pts, { sport: 2, distanceM: 1000, timerS: 300, elapsedS: 300, calories: 50, ascentM: 3, utcOffsetMin: 0 }),
    hash,
  );
  const again = await importBytes(store, 'copy.gpx', enc(toGpx(pts)), hash);
  const pdf = await importBytes(store, 'notes.pdf', enc('%PDF'), hash);
  const broken = await importBytes(store, 'broken.gpx', enc('<gpx></gpx>'), hash);

  expect([gpx, tcx, fit, again, pdf, broken].map((r) => r.status)).toEqual(['imported', 'imported', 'imported', 'duplicate', 'failed', 'failed']);
  if (fit.status !== 'failed') expect(fit.activity).toMatchObject({ source: 'fit', type: 'ride' });
  if (broken.status === 'failed') expect(broken.reason).toBe('This GPX file has no track points.');
  expect(summarise([gpx, tcx, fit, again, pdf, broken])).toBe('3 added, 1 already here, 2 couldn’t be read');
});

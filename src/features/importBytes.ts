import type { Store } from '@/data/store';
import { activityFromFit, activityFromGpx, activityFromTcx } from '@/domain/import';
import { ImportError } from '@/domain/track';
import type { Activity, NewActivity } from '@/domain/types';

export type ImportOutcome =
  | { name: string; status: 'imported'; activity: Activity }
  | { name: string; status: 'duplicate'; activity: Activity }
  | { name: string; status: 'failed'; reason: string };

/** Turn a file's bytes into an activity and save it. Format comes from the extension, checked by content. */
export async function importBytes(
  store: Store,
  name: string,
  bytes: ArrayBuffer,
  hash: (b: ArrayBuffer) => Promise<string>,
): Promise<ImportOutcome> {
  const ext = name.split('.').pop()?.toLowerCase();
  if (!ext || !['gpx', 'tcx', 'fit', 'xml'].includes(ext)) {
    return { name, status: 'failed', reason: 'Not a workout file. Choose a GPX, TCX or FIT file.' };
  }
  try {
    const fileHash = await hash(bytes);
    let activity: NewActivity;
    if (ext === 'fit') {
      activity = await activityFromFit(bytes, { fileHash });
    } else {
      const text = new TextDecoder('utf-8').decode(bytes);
      activity = /<TrainingCenterDatabase[\s>]/i.test(text) ? activityFromTcx(text, { fileHash }) : activityFromGpx(text, { fileHash });
    }
    const r = await store.insertActivity(activity);
    return { name, status: r.duplicate ? 'duplicate' : 'imported', activity: r.activity };
  } catch (e) {
    return { name, status: 'failed', reason: e instanceof ImportError ? e.message : 'This file could not be read.' };
  }
}

export function summarise(results: ImportOutcome[]): string {
  const n = (s: ImportOutcome['status']) => results.filter((r) => r.status === s).length;
  const parts = [];
  if (n('imported')) parts.push(`${n('imported')} added`);
  if (n('duplicate')) parts.push(`${n('duplicate')} already here`);
  if (n('failed')) parts.push(`${n('failed')} couldn’t be read`);
  return parts.join(', ') || 'Nothing to import';
}

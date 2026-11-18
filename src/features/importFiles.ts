import { CryptoDigestAlgorithm, digestStringAsync } from 'expo-crypto';
import { getDocumentAsync, type DocumentPickerAsset } from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import type { Store } from '@/data';
import { GpxError } from '@/domain/gpx';
import { activityFromGpx } from '@/domain/import';
import type { Activity, Units } from '@/domain/types';

export type ImportOutcome =
  | { name: string; status: 'imported'; activity: Activity }
  | { name: string; status: 'duplicate'; activity: Activity }
  | { name: string; status: 'failed'; reason: string };

const MAX_BYTES = 25 * 1024 * 1024;

/** Let the user pick files and import every GPX among them. Returns null if they cancelled. */
export async function pickAndImport(store: Store, units: Units): Promise<ImportOutcome[] | null> {
  const res = await getDocumentAsync({ multiple: true, copyToCacheDirectory: true, type: '*/*' });
  if (res.canceled) return null;
  const out: ImportOutcome[] = [];
  for (const asset of res.assets) out.push(await importOne(store, units, asset));
  return out;
}

async function importOne(store: Store, units: Units, asset: DocumentPickerAsset): Promise<ImportOutcome> {
  const name = asset.name ?? 'file';
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'tcx' || ext === 'fit') {
    return { name, status: 'failed', reason: `${ext.toUpperCase()} files are coming in the next update. GPX works today.` };
  }
  if (ext !== 'gpx' && ext !== 'xml') {
    return { name, status: 'failed', reason: 'Not a workout file. Choose a .gpx file.' };
  }
  if (asset.size != null && asset.size > MAX_BYTES) {
    return { name, status: 'failed', reason: 'This file is over 25 MB.' };
  }
  try {
    const xml = await readText(asset);
    const fileHash = await digestStringAsync(CryptoDigestAlgorithm.SHA256, xml);
    const activity = activityFromGpx(xml, { fileHash, units });
    const r = await store.insertActivity(activity);
    return { name, status: r.duplicate ? 'duplicate' : 'imported', activity: r.activity };
  } catch (e) {
    const reason = e instanceof GpxError ? e.message : 'This file could not be read.';
    return { name, status: 'failed', reason };
  }
}

async function readText(asset: DocumentPickerAsset): Promise<string> {
  if (Platform.OS === 'web' && asset.file) return asset.file.text();
  return new File(asset.uri).text();
}

export function summarise(results: ImportOutcome[]): string {
  const n = (s: ImportOutcome['status']) => results.filter((r) => r.status === s).length;
  const parts = [];
  if (n('imported')) parts.push(`${n('imported')} added`);
  if (n('duplicate')) parts.push(`${n('duplicate')} already here`);
  if (n('failed')) parts.push(`${n('failed')} couldn’t be read`);
  return parts.join(', ') || 'Nothing to import';
}

import { CryptoDigestAlgorithm, digest } from 'expo-crypto';
import { getDocumentAsync, type DocumentPickerAsset } from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import type { Store } from '@/data';

import { importBytes, type ImportOutcome } from './importBytes';

export type { ImportOutcome };
export { summarise } from './importBytes';

const MAX_BYTES = 25 * 1024 * 1024;

/** Let the user pick files and import every GPX, TCX and FIT among them. Returns null if they cancelled. */
export async function pickAndImport(store: Store): Promise<ImportOutcome[] | null> {
  const res = await getDocumentAsync({ multiple: true, copyToCacheDirectory: true, type: '*/*' });
  if (res.canceled) return null;
  const out: ImportOutcome[] = [];
  for (const asset of res.assets) out.push(await importAsset(store, asset));
  return out;
}

async function importAsset(store: Store, asset: DocumentPickerAsset): Promise<ImportOutcome> {
  const name = asset.name ?? 'file';
  if (asset.size != null && asset.size > MAX_BYTES) return { name, status: 'failed', reason: 'This file is over 25 MB.' };
  try {
    const bytes = await readBytes(asset);
    return await importBytes(store, name, bytes, sha256);
  } catch {
    return { name, status: 'failed', reason: 'This file could not be opened.' };
  }
}

async function readBytes(asset: DocumentPickerAsset): Promise<ArrayBuffer> {
  if (Platform.OS === 'web' && asset.file) return asset.file.arrayBuffer();
  return new File(asset.uri).arrayBuffer();
}

async function sha256(bytes: ArrayBuffer): Promise<string> {
  const d = new Uint8Array(await digest(CryptoDigestAlgorithm.SHA256, bytes));
  return Array.from(d, (b) => b.toString(16).padStart(2, '0')).join('');
}

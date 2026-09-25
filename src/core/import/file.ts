import { ImportError } from './shared';

/** Inspect content, not the extension: text exports may have arbitrary names. */
export function validateTextFile(text: string, fileName = ''): string {
  if (!text.trim()) throw new ImportError('That file is empty.');
  const sample = text.slice(0, 8000);
  let controls = 0;
  for (const char of sample) {
    if (char.charCodeAt(0) < 32 && !'\n\r\t'.includes(char)) controls++;
  }
  if (sample.includes('\0') || controls / sample.length > 0.05 || sample.includes('\uFFFD')) {
    if (/\.vce$/i.test(fileName)) {
      throw new ImportError(
        'This is a binary VCE exam. Direct binary .vce decoding is not available. ' +
        'Export the questions and answer key to a supported text format using the application ' +
        'that created it, then import that export. Renaming the file will not convert it.',
      );
    }
    throw new ImportError('That file is not supported text. Import JSON, dump text, GIFT, Aiken or CSV/TSV.');
  }
  return text.replace(/^\uFEFF/, '');
}

/** Web pickers supply a File; native pickers supply a cached local URI. */
export async function readPickedText(
  asset: { name: string; uri: string; file?: { text(): Promise<string> } },
  readNative: (uri: string) => Promise<string>,
): Promise<string> {
  const text = asset.file ? await asset.file.text() : await readNative(asset.uri);
  return validateTextFile(text, asset.name);
}

export async function readPickedBytes(
  asset: { uri: string; file?: { arrayBuffer(): Promise<ArrayBuffer> } },
  readNative: (uri: string) => Promise<Uint8Array>,
): Promise<Uint8Array> {
  return asset.file ? new Uint8Array(await asset.file.arrayBuffer()) : readNative(asset.uri);
}

import { describe, expect, it } from 'vitest';
import { importVce } from '../src/core/import/vce';

describe('VCE import', () => {
  it('rejects files without the VCE signature', () => {
    expect(() => importVce(new Uint8Array([1, 2, 3, 4]), 'fake.vce')).toThrow('valid VCE');
  });

  it('reports unsupported versions clearly', () => {
    expect(() => importVce(new Uint8Array([0x85, 0xa8, 9, 9]), 'new.vce')).toThrow('version 99');
  });
});

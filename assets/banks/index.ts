import type { ExamBank } from '../../src/core/types';
import { GCSE_BANKS } from './gcse';

/**
 * Banks bundled with the app and installed on first launch.
 *
 * These are original questions written for this project — the app is the
 * simulator, and real exam content comes from whatever you import.
 */
export const SAMPLE_BANKS: ExamBank[] = GCSE_BANKS;

export { GCSE_BANKS };

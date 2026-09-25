import { create } from 'zustand';
import { useExamStore } from './examStore';
import { importBank, importVce, type ImportOptions } from '../core/import';
import type { ExamBank } from '../core/types';
import {
  deleteBank,
  listBanks,
  saveBank,
  type BankSummary,
} from '../db/repositories';
import { SAMPLE_BANKS } from '../../assets/banks';

/**
 * The exam library: which banks are installed, and importing new ones.
 */

interface LibraryState {
  banks: BankSummary[];
  loading: boolean;
  error: string | null;
  /** Warnings from the most recent import, shown on the import screen. */
  lastImportWarnings: string[];

  refresh: () => Promise<void>;
  /** Copies the bundled sample banks in on first launch. */
  seedSamples: () => Promise<void>;
  importFromText: (raw: string, options?: ImportOptions) => Promise<ExamBank>;
  importFromVce: (raw: Uint8Array, fileName: string) => Promise<ExamBank>;
  install: (bank: ExamBank) => Promise<void>;
  remove: (bankId: string) => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  banks: [],
  loading: false,
  error: null,
  lastImportWarnings: [],

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      set({ banks: await listBanks(), loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  seedSamples: async () => {
    try {
      const existing = await listBanks();
      // Refresh bundled content only when its version changes. Stable bank and
      // question ids keep attempt history, notes and mastery attached.
      const installed = new Map(existing.map((bank) => [bank.id, bank.version]));
      const updates = SAMPLE_BANKS.filter((bank) => installed.get(bank.id) !== bank.version);
      for (const bank of updates) {
        await saveBank({ ...bank, importedAt: bank.importedAt ?? Date.now() });
      }
      set({ banks: await listBanks() });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  importFromText: async (raw, options = {}) => {
    set({ loading: true, error: null, lastImportWarnings: [] });
    try {
      const { bank, warnings } = importBank(raw, options);
      await saveBank(bank);
      set({ banks: await listBanks(), loading: false, lastImportWarnings: warnings });
      return bank;
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
      throw err;
    }
  },

  importFromVce: async (raw, fileName) => {
    set({ loading: true, error: null, lastImportWarnings: [] });
    try {
      const { bank, warnings } = importVce(raw, fileName);
      await saveBank(bank);
      set({ banks: await listBanks(), loading: false, lastImportWarnings: warnings });
      return bank;
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
      throw err;
    }
  },

  install: async (bank) => {
    await saveBank(bank);
    set({ banks: await listBanks() });
  },

  remove: async (bankId) => {
    if (useExamStore.getState().session?.bankId === bankId) useExamStore.getState().clear();
    await deleteBank(bankId);
    set({ banks: await listBanks() });
  },
}));

import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Core tests run in Node. Persistence tests use real SQLite via node:sqlite,
// with a small adapter replacing the Expo native database bridge.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
  },
});

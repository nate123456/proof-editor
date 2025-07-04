import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Suppress CJS deprecation warning by using ESM imports
  esbuild: {
    target: 'node18'
  },
  resolve: {
    alias: {
      vscode: new URL('./src/__mocks__/vscode.ts', import.meta.url).pathname,
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['src/domain/__tests__/test-setup.ts'],
    
    // Use forks to prevent hanging processes
    pool: 'forks',
    
    // Add hanging-process reporter for debugging
    reporters: ['default', 'hanging-process'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/tests/e2e/**', // Exclude E2E tests - these use Playwright
      '**/*.e2e.spec.ts',
      '**/*.playwright.spec.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'scripts/**',
        '**/*.config.*',
        '**/*.d.ts',
        'coverage/**',
        'src/**/__tests__/**',
        'src/**/coverage/**',
        'tests/e2e/**', // Exclude E2E tests from coverage
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
});

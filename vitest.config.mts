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
        // Exclude interface-only files (pure TypeScript types with no executable code)
        'src/application/commands/argument-commands.ts',
        'src/application/commands/statement-commands.ts', 
        'src/application/commands/orderedset-commands.ts',
        'src/application/commands/tree-commands.ts',
        'src/application/commands/validation-commands.ts',
        'src/application/commands/bootstrap-commands.ts',
        'src/application/commands/document-commands.ts',
        'src/application/queries/connection-queries.ts',
        'src/application/queries/document-queries.ts',
        'src/application/queries/tree-queries.ts',
        'src/application/queries/statement-queries.ts',
      ],
      thresholds: {
        global: {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95,
        },
      },
    },
  },
});

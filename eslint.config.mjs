import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

export default tseslint.config(
  // Base configurations
  eslint.configs.recommended,
  tseslint.configs.recommended,
  tseslint.configs.stylistic,
  
  // For type-aware linting (recommended for production codebases)
  tseslint.configs.recommendedTypeChecked,
  
  // Prettier integration (must be last)
  prettierConfig,
  
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        // Performance optimization for JSDoc parsing
        jsDocParsingMode: 'none',
      },
    },
    
    rules: {
      // Import organization
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      
      // TypeScript-specific rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      
      // Modern JavaScript/TypeScript conventions
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error',
      'prefer-destructuring': ['error', { array: false, object: true }],
      
      // Code quality
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
    },
  },
  
  {
    // Performance optimization: ignore certain files/directories
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.next/**',
      'coverage/**',
      '*.config.js',
      '*.config.mjs',
      '.qodana/**',
      '.claude/**',
    ],
  },
  
  {
    // Specific rules for test files
    files: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      'no-console': 'off',
    },
  }
);
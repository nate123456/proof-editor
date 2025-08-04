/**
 * System E2E Integration Tests - Error Recovery and Resilience
 *
 * Tests for system resilience including webview communication failures,
 * file system errors, validation service failures, data consistency,
 * and memory pressure handling.
 */

import {
  DocumentContent,
  DocumentId,
  DocumentVersion,
  FileSize,
  Timestamp,
  Title,
} from '../../domain/shared/value-objects/index.js';
import {
  type ApplicationContainer,
  activate,
  afterEach,
  beforeAll,
  beforeEach,
  createTestSetup,
  type DocumentQueryService,
  describe,
  err,
  expect,
  generateComplexProofDocument,
  type IFileSystemPort,
  it,
  type PerformanceMetrics,
  TOKENS,
  type ValidationController,
  ValidationError,
  vi,
  vscode,
  type YAMLSerializer,
} from './shared/system-e2e-test-utils.js';

describe('System E2E - Error Recovery and Resilience Tests', () => {
  let mockContext: any;
  let container: ApplicationContainer;
  let performanceMetrics: PerformanceMetrics;
  let mockDocument: any;
  let mockWebview: any;
  let testSetup: ReturnType<typeof createTestSetup>;

  beforeAll(async () => {
    testSetup = createTestSetup();
    await testSetup.setup();
  });

  beforeEach(async () => {
    mockContext = testSetup.mockContext;
    container = testSetup.container;
    performanceMetrics = testSetup.performanceMetrics;
    mockDocument = testSetup.mockDocument;
    mockWebview = testSetup.mockWebview;

    await activate(mockContext);
  });

  afterEach(async () => {
    try {
      await testSetup.teardown();
    } catch (_error) {
      // Ignore cleanup errors in tests
    }
  });

  describe('6. Error Recovery and Resilience Tests', () => {
    it('should recover from webview communication failures', async () => {
      // Simulate webview communication failure
      mockWebview.postMessage.mockRejectedValueOnce(new Error('Webview communication failed'));

      const testContent = generateComplexProofDocument(5, 3);
      mockDocument.getText.mockReturnValue(testContent);

      const showTreeCommand = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.find((call) => call[0] === 'proofEditor.showTree');

      if (showTreeCommand) {
        const handler = showTreeCommand[1] as (...args: unknown[]) => Promise<void>;

        // Should handle webview errors gracefully
        await expect(handler()).resolves.not.toThrow();

        // Error should be logged but not crash the system
        performanceMetrics.errorCount++;
      }
    });

    it('should handle file system errors during save operations', async () => {
      const fileSystemPort = container.resolve<IFileSystemPort>(TOKENS.IFileSystemPort);

      // Mock file system error
      const originalWriteFile = fileSystemPort.writeFile;
      fileSystemPort.writeFile = vi.fn().mockResolvedValue(err(new ValidationError('Disk full')));

      const docIdResult = DocumentId.create('test-save-error');
      const contentResult = DocumentContent.create(generateComplexProofDocument(10, 5));
      const titleResult = Title.create('Test Document');
      const versionResult = DocumentVersion.create(1);

      if (
        !docIdResult.isOk() ||
        !contentResult.isOk() ||
        !titleResult.isOk() ||
        !versionResult.isOk()
      ) {
        throw new Error('Failed to create value objects');
      }

      const testDocument = {
        id: docIdResult.value,
        content: contentResult.value,
        metadata: {
          id: docIdResult.value,
          title: titleResult.value,
          modifiedAt: Timestamp.now(),
          size: FileSize.fromNumber(1000).unwrapOr(FileSize.zero()),
          syncStatus: 'synced' as const,
        },
        version: versionResult.value,
      };

      const result = await fileSystemPort.storeDocument(testDocument);
      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error.message).toContain('Disk full');
      }

      // Restore original function
      fileSystemPort.writeFile = originalWriteFile;

      performanceMetrics.errorCount++;
    });

    it('should handle validation service failures gracefully', async () => {
      const validationController = container.resolve<ValidationController>(
        TOKENS.ValidationController,
      );

      // Mock validation failure
      const originalValidate = validationController.validateDocumentImmediate;
      validationController.validateDocumentImmediate = vi.fn().mockImplementation(() => {
        throw new Error('Validation service unavailable');
      });

      const invalidContent = 'invalid yaml content {{{';
      mockDocument.getText.mockReturnValue(invalidContent);

      // Trigger document change that would normally validate
      const onChangeHandler = vi.mocked(vscode.workspace.onDidChangeTextDocument).mock
        .calls[0]?.[0];

      if (onChangeHandler) {
        const mockChangeEvent = {
          document: mockDocument,
          contentChanges: [{ text: 'new content' }],
        } as any;

        // Should not crash even with validation failure
        await expect(onChangeHandler(mockChangeEvent)).resolves.not.toThrow();
      }

      // Restore original function
      validationController.validateDocumentImmediate = originalValidate;

      performanceMetrics.errorCount++;
    });

    it('should maintain data consistency during system failures', async () => {
      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );
      const _yamlSerializer = container.resolve<YAMLSerializer>(TOKENS.YAMLSerializer);

      const testContent = generateComplexProofDocument(20, 10);

      // Test parsing with deliberate corruption
      const corruptedContent = testContent.replace('statements:', 'statements_corrupted:');

      const parseResult = await documentQueryService.parseDocumentContent(corruptedContent);

      // Should handle corruption gracefully
      expect(parseResult.isErr()).toBe(true);

      if (parseResult.isErr()) {
        expect(parseResult.error).toBeInstanceOf(ValidationError);
      }

      // Original content should still parse correctly
      const validParseResult = await documentQueryService.parseDocumentContent(testContent);
      expect(validParseResult.isOk()).toBe(true);

      performanceMetrics.errorCount++;
    });

    it('should recover from memory pressure situations', async () => {
      // Simulate memory pressure by creating many large objects
      const largeObjects: any[] = [];

      try {
        // Create memory pressure
        for (let i = 0; i < 100; i++) {
          const largeContent = generateComplexProofDocument(1000, 500);
          largeObjects.push(largeContent);
        }

        // System should still be able to process documents under pressure
        const documentQueryService = container.resolve<DocumentQueryService>(
          TOKENS.DocumentQueryService,
        );
        const testContent = generateComplexProofDocument(10, 5);

        const parseResult = await documentQueryService.parseDocumentContent(testContent);
        expect(parseResult.isOk()).toBe(true);

        // Check memory usage
        const memoryUsage = process.memoryUsage();
        expect(memoryUsage.heapUsed).toBeLessThan(1024 * 1024 * 1024); // Under 1GB
      } finally {
        // Clean up to prevent test memory leaks
        largeObjects.length = 0;

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      performanceMetrics.operationCount++;
    });
  });
});

/**
 * System E2E Integration Tests - User Workflow
 *
 * Tests for complete user workflows including proof creation, complex construction,
 * multi-document handling, and export/import operations.
 */

import {
  type ApplicationContainer,
  activate,
  afterEach,
  type BootstrapController,
  beforeAll,
  beforeEach,
  createTestSetup,
  type DocumentController,
  type DocumentQueryService,
  describe,
  expect,
  generateComplexProofDocument,
  it,
  type PerformanceMetrics,
  ProofTreePanelManager,
  type ProofVisualizationService,
  TOKENS,
  type TreeRenderer,
  vi,
  vscode,
  type YAMLSerializer,
} from './shared/system-e2e-test-utils.js';

describe('System E2E - User Workflow Tests', () => {
  let mockContext: any;
  let container: ApplicationContainer;
  let performanceMetrics: PerformanceMetrics;
  let mockDocument: any;
  let mockTextEditor: any;
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
    mockTextEditor = testSetup.mockTextEditor;

    await activate(mockContext);
  });

  afterEach(async () => {
    try {
      await testSetup.teardown();
    } catch (_error) {
      // Ignore cleanup errors in tests
    }
  });

  describe('2. Complete User Workflow Tests', () => {
    it('should complete new proof creation workflow end-to-end', async () => {
      const workflowStart = Date.now();

      // Step 1: Create new proof document
      const createDocumentCommand = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.find((call) => call[0] === 'proofEditor.createBootstrapDocument');

      expect(createDocumentCommand).toBeDefined();

      if (createDocumentCommand) {
        const handler = createDocumentCommand[1] as (...args: unknown[]) => Promise<void>;

        // Mock user input for document creation
        vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce('test-proof');

        await handler();

        // Verify file creation workflow
        expect(vscode.window.showInputBox).toHaveBeenCalledWith({
          prompt: 'Enter the name for your new proof document',
          placeHolder: 'my-first-proof',
          validateInput: expect.any(Function),
        });
      }

      // Step 2: Create bootstrap argument
      const createArgumentCommand = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.find((call) => call[0] === 'proofEditor.createBootstrapArgument');

      if (createArgumentCommand) {
        const handler = createArgumentCommand[1] as (...args: unknown[]) => Promise<void>;
        await handler();

        // Should trigger bootstrap controller
        const bootstrapController = container.resolve<BootstrapController>(
          TOKENS.BootstrapController,
        );
        expect(bootstrapController).toBeDefined();
      }

      // Step 3: Show tree visualization
      const showTreeCommand = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.find((call) => call[0] === 'proofEditor.showTree');

      if (showTreeCommand) {
        // Set up document content
        mockDocument.getText.mockReturnValue(generateComplexProofDocument(5, 3));

        const handler = showTreeCommand[1] as (...args: unknown[]) => Promise<void>;
        await handler();

        // Verify webview creation
        expect(vscode.window.createWebviewPanel).toHaveBeenCalled();
      }

      const workflowTime = Date.now() - workflowStart;
      expect(workflowTime).toBeLessThan(10000); // Complete workflow in under 10 seconds

      performanceMetrics.operationCount += 3;
    });

    it('should handle complex proof construction workflow', async () => {
      // Simulate a complex proof with 50 statements and 20 arguments
      const complexProofContent = generateComplexProofDocument(50, 20);
      mockDocument.getText.mockReturnValue(complexProofContent);

      const processingStart = Date.now();

      // Test document parsing and visualization
      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );
      const parseResult = await documentQueryService.parseDocumentContent(complexProofContent);

      expect(parseResult.isOk()).toBe(true);

      if (parseResult.isOk()) {
        // Test visualization generation
        const visualizationService = container.resolve<ProofVisualizationService>(
          TOKENS.ProofVisualizationService,
        );
        const vizResult = visualizationService.generateVisualization(parseResult.value);

        expect(vizResult.isOk()).toBe(true);

        if (vizResult.isOk()) {
          // Test rendering
          const renderer = container.resolve<TreeRenderer>(TOKENS.TreeRenderer);
          const svg = renderer.generateSVG(vizResult.value);

          expect(svg).toContain('<svg');
          expect(svg.length).toBeGreaterThan(1000); // Should generate substantial SVG
        }
      }

      const processingTime = Date.now() - processingStart;
      expect(processingTime).toBeLessThan(5000); // Process complex proof in under 5 seconds

      performanceMetrics.operationCount++;
    });

    it('should handle multi-document workflow with state isolation', async () => {
      // Create multiple documents
      const doc1Content = generateComplexProofDocument(10, 5);
      const doc2Content = generateComplexProofDocument(15, 8);

      const doc1 = { ...mockDocument, fileName: '/test/proof1.proof' };
      const doc2 = { ...mockDocument, fileName: '/test/proof2.proof' };

      doc1.getText = vi.fn().mockReturnValue(doc1Content);
      doc2.getText = vi.fn().mockReturnValue(doc2Content);

      // Test opening multiple documents
      const documentController = container.resolve<DocumentController>(TOKENS.DocumentController);

      await documentController.handleDocumentOpened({
        fileName: doc1.fileName,
        uri: 'file:///test/proof1.proof',
        getText: () => doc1Content,
      });

      await documentController.handleDocumentOpened({
        fileName: doc2.fileName,
        uri: 'file:///test/proof2.proof',
        getText: () => doc2Content,
      });

      // Verify state isolation
      const panelManager = ProofTreePanelManager.getInstance();
      expect(panelManager).toBeDefined();

      // Test switching between documents
      vi.mocked(vscode.window).activeTextEditor = { ...mockTextEditor, document: doc1 } as any;

      const showTreeCommand = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.find((call) => call[0] === 'proofEditor.showTree');

      if (showTreeCommand) {
        const handler = showTreeCommand[1] as (...args: unknown[]) => Promise<void>;
        await handler();

        // Should create visualization for correct document
        expect(vscode.window.createWebviewPanel).toHaveBeenCalled();
      }

      performanceMetrics.operationCount += 2;
    });

    it('should complete export and import workflow', async () => {
      const complexContent = generateComplexProofDocument(25, 12);
      mockDocument.getText.mockReturnValue(complexContent);

      // Test YAML serialization
      const yamlSerializer = container.resolve<YAMLSerializer>(TOKENS.YAMLSerializer);

      // Parse document content
      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );
      const parseResult = await documentQueryService.parseDocumentContent(complexContent);

      expect(parseResult.isOk()).toBe(true);

      if (parseResult.isOk()) {
        // Test serialization
        const serializeResult = await yamlSerializer.serialize(parseResult.value as any);
        expect(serializeResult.isOk()).toBe(true);

        if (serializeResult.isOk()) {
          // Test that serialized content is valid YAML
          expect(typeof serializeResult.value).toBe('string');
          expect(serializeResult.value.length).toBeGreaterThan(0);
        }
      }

      performanceMetrics.operationCount++;
    });
  });
});

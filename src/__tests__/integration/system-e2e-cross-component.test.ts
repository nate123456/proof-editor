/**
 * System E2E Integration Tests - Cross-Component Integration
 *
 * Tests for integration between different system components including
 * extension-webview integration, domain-infrastructure integration,
 * event bus message flow, and state synchronization.
 */

import {
  type ApplicationContainer,
  activate,
  afterEach,
  beforeAll,
  beforeEach,
  createTestSetup,
  describe,
  expect,
  generateComplexProofDocument,
  type IFileSystemPort,
  type IUIPort,
  type IViewStatePort,
  it,
  type PerformanceMetrics,
  ProofTransactionService,
  StatementFlowService,
  TOKENS,
  TreeStructureService,
  type ViewStateManager,
  vi,
  vscode,
} from './shared/system-e2e-test-utils.js';

describe('System E2E - Cross-Component Integration Tests', () => {
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

  describe('3. Cross-Component Integration Tests', () => {
    it('should integrate extension with webview with services injection', async () => {
      const testContent = generateComplexProofDocument(10, 5);
      mockDocument.getText.mockReturnValue(testContent);

      // Test webview creation through extension command
      const showTreeCommand = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.find((call) => call[0] === 'proofEditor.showTree');

      expect(showTreeCommand).toBeDefined();

      if (showTreeCommand) {
        const handler = showTreeCommand[1] as (...args: unknown[]) => Promise<void>;
        await handler();

        // Verify webview panel creation
        expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
          'proofTreeVisualization',
          expect.stringContaining('Proof Tree:'),
          expect.any(Object),
          expect.objectContaining({
            enableScripts: true,
            retainContextWhenHidden: true,
          }),
        );

        // Verify webview content is set
        expect(mockWebview.html).toBeDefined();
      }

      performanceMetrics.operationCount++;
    });

    it('should integrate domain services with infrastructure layer', async () => {
      // Test domain services can communicate through infrastructure
      const statementFlow = new StatementFlowService();
      const treeStructure = new TreeStructureService();
      const transactionService = new ProofTransactionService();

      // Create test data through domain services
      const statement1 = statementFlow.createStatementFromContent('Test premise');
      const statement2 = statementFlow.createStatementFromContent('Test conclusion');

      expect(statement1.isOk()).toBe(true);
      expect(statement2.isOk()).toBe(true);

      if (statement1.isOk() && statement2.isOk()) {
        // Test ordered set creation
        const premiseSet = statementFlow.createOrderedSetFromStatements([statement1.value]);
        const conclusionSet = statementFlow.createOrderedSetFromStatements([statement2.value]);

        expect(premiseSet.isOk()).toBe(true);
        expect(conclusionSet.isOk()).toBe(true);

        if (premiseSet.isOk() && conclusionSet.isOk()) {
          // Test atomic argument creation
          const atomicArg = statementFlow.createAtomicArgumentWithSets(
            premiseSet.value,
            conclusionSet.value,
          );

          expect(atomicArg.isOk()).toBe(true);

          if (atomicArg.isOk()) {
            // Test tree structure integration
            const treeResult = treeStructure.createTreeWithRootNode('test-doc', atomicArg.value);
            expect(treeResult.isOk()).toBe(true);

            // Test transaction service integration
            const txResult = await transactionService.beginTransaction();
            expect(txResult.isOk()).toBe(true);
          }
        }
      }

      performanceMetrics.operationCount++;
    });

    it('should integrate event bus message flow throughout system', async () => {
      const fileSystemPort = container.resolve<IFileSystemPort>(TOKENS.IFileSystemPort);
      const uiPort = container.resolve<IUIPort>(TOKENS.IUIPort);

      // Test file system operations trigger UI updates
      const testDocument = {
        id: 'test-doc',
        content: generateComplexProofDocument(5, 3),
        metadata: {
          id: 'test-doc',
          title: 'Test Document',
          modifiedAt: new Date(),
          size: 1000,
          syncStatus: 'synced' as const,
        },
        version: 1,
      };

      const storeResult = await fileSystemPort.storeDocument(testDocument);
      expect(storeResult.isOk()).toBe(true);

      // Verify UI capabilities are available
      const capabilities = fileSystemPort.capabilities();
      expect(capabilities.canAccessArbitraryPaths).toBe(true);
      expect(capabilities.supportsOfflineStorage).toBe(true);

      // Test UI operations
      uiPort.showInformation('Test message');
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Test message');

      performanceMetrics.operationCount++;
    });

    it('should maintain state synchronization across all components', async () => {
      const viewStateManager = container.resolve<ViewStateManager>(TOKENS.ViewStateManager);
      const viewStatePort = container.resolve<IViewStatePort>(TOKENS.IViewStatePort);

      // Test view state management integration
      const testViewState = {
        zoom: 1.5,
        pan: { x: 100, y: 200 },
        center: { x: 0, y: 0 },
      };

      const updateResult = await viewStateManager.updateViewportState(testViewState);
      expect(updateResult.isOk()).toBe(true);

      const retrieveResult = await viewStateManager.getViewportState();
      expect(retrieveResult.isOk()).toBe(true);

      if (retrieveResult.isOk()) {
        expect(retrieveResult.value).toEqual(testViewState);
      }

      // Test port functionality (capabilities not available on interface)
      const hasStateResult = await viewStatePort.hasViewState('viewport');
      expect(hasStateResult.isOk()).toBe(true);

      performanceMetrics.operationCount++;
    });
  });
});

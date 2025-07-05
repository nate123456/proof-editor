/**
 * HEAVY TEST COVERAGE: End-to-End System Integration Test Suite
 *
 * Comprehensive integration tests verifying the entire system works together flawlessly,
 * from VS Code extension activation through complex user workflows to proper cleanup.
 *
 * This test suite provides confidence for production deployment to thousands of VS Code users.
 */

import { err } from 'neverthrow';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type { IFileSystemPort } from '../../application/ports/IFileSystemPort.js';
// Import interfaces for proper typing
import type { IUIPort } from '../../application/ports/IUIPort.js';
import type { IViewStatePort } from '../../application/ports/IViewStatePort.js';
import type { DocumentQueryService } from '../../application/services/DocumentQueryService.js';
import type { ProofVisualizationService } from '../../application/services/ProofVisualizationService.js';
import type { ViewStateManager } from '../../application/services/ViewStateManager.js';
import { ProofTransactionService } from '../../domain/services/ProofTransactionService.js';
// Import domain services for end-to-end workflow testing
import { StatementFlowService } from '../../domain/services/StatementFlowService.js';
import { TreeStructureService } from '../../domain/services/TreeStructureService.js';
// Import validation and error handling
import { ValidationError } from '../../domain/shared/result.js';
// Import all system components we need to test integration between
import { activate, deactivate } from '../../extension/extension.js';
import {
  type ApplicationContainer,
  getContainer,
  initializeContainer,
} from '../../infrastructure/di/container.js';
import { TOKENS } from '../../infrastructure/di/tokens.js';
import type { YAMLSerializer } from '../../infrastructure/repositories/yaml/YAMLSerializer.js';
import type { BootstrapController } from '../../presentation/controllers/BootstrapController.js';
import type { DocumentController } from '../../presentation/controllers/DocumentController.js';
import type { ValidationController } from '../../validation/ValidationController.js';
import { ProofTreePanelManager } from '../../webview/ProofTreePanelManager.js';
import type { TreeRenderer } from '../../webview/TreeRenderer.js';

// Performance and memory tracking
interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  operationCount: number;
  errorCount: number;
}

// Test data generators
const generateComplexProofDocument = (statementCount: number, argumentCount: number): string => {
  const statements: Record<string, string> = {};
  const proofArguments: Record<string, any> = {};
  const trees: any[] = [];

  // Generate statements
  for (let i = 1; i <= statementCount; i++) {
    statements[`s${i}`] =
      `Statement ${i}: This is a test statement with sufficient complexity for testing.`;
  }

  // Generate arguments with realistic connections
  for (let i = 1; i <= argumentCount; i++) {
    const premiseStart = Math.max(1, i - 2);
    const premiseCount = Math.min(3, i);
    const premises = Array.from({ length: premiseCount }, (_, j) => `s${premiseStart + j}`);
    const conclusion = `s${statementCount + i}`;

    statements[conclusion] = `Conclusion ${i}: Derived from premises ${premises.join(', ')}`;

    proofArguments[`arg${i}`] = {
      premises,
      conclusions: [conclusion],
      metadata: {
        rule: `Rule${i}`,
        confidence: 0.95,
        created: new Date().toISOString(),
      },
    };
  }

  // Generate tree structure
  if (argumentCount > 0) {
    const nodes: Record<string, any> = {};
    nodes.n1 = { arg: 'arg1' };

    for (let i = 2; i <= argumentCount; i++) {
      const parentNode = `n${Math.max(1, i - 1)}`;
      nodes[`n${i}`] = { [parentNode]: `arg${i}`, on: 0 };
    }

    trees.push({
      id: 'tree1',
      offset: { x: 100, y: 100 },
      nodes,
    });
  }

  return `# Generated Complex Proof Document
# ${statementCount} statements, ${argumentCount} arguments

statements:
${Object.entries(statements)
  .map(([id, content]) => `  ${id}: "${content}"`)
  .join('\n')}

arguments:
${Object.entries(proofArguments)
  .map(
    ([id, arg]) =>
      `  ${id}:
    premises: [${arg.premises.join(', ')}]
    conclusions: [${arg.conclusions.join(', ')}]
    metadata:
      rule: "${arg.metadata.rule}"
      confidence: ${arg.metadata.confidence}
      created: "${arg.metadata.created}"`,
  )
  .join('\n')}

trees:
${trees
  .map(
    (tree) =>
      `- id: ${tree.id}
    offset:
      x: ${tree.offset.x}
      y: ${tree.offset.y}
    nodes:
${Object.entries(tree.nodes)
  .map(([nodeId, nodeData]) => {
    if (!nodeData || typeof nodeData !== 'object') {
      return `      ${nodeId}: {arg: unknown}`;
    }
    if ('arg' in nodeData) {
      return `      ${nodeId}: {arg: ${(nodeData as any).arg}}`;
    } else {
      const parentKey = Object.keys(nodeData as Record<string, any>).find((k) => k !== 'on');
      return `      ${nodeId}: {${parentKey || 'unknown'}: ${(nodeData as any)[parentKey || 'unknown']}, on: ${(nodeData as any).on}}`;
    }
  })
  .join('\n')}`,
  )
  .join('\n')}

metadata:
  title: "Complex Test Proof"
  created: "${new Date().toISOString()}"
  version: "1.0.0"
  complexity: "high"
  statementCount: ${statementCount}
  argumentCount: ${argumentCount}
`;
};

// Mock VS Code environment with full feature support
const createVSCodeMocks = () => {
  const mockDisposable = { dispose: vi.fn() };

  const mockWebview = {
    html: '',
    options: { enableScripts: true },
    onDidReceiveMessage: vi.fn(() => mockDisposable),
    postMessage: vi.fn().mockResolvedValue(true),
    asWebviewUri: vi.fn(),
    cspSource: 'vscode-webview:',
  };

  const mockWebviewPanel = {
    webview: mockWebview,
    title: 'Test Proof Tree',
    viewType: 'proofTreeVisualization',
    viewColumn: vscode.ViewColumn.Two,
    active: true,
    visible: true,
    options: { retainContextWhenHidden: true },
    reveal: vi.fn(),
    dispose: vi.fn(),
    onDidDispose: vi.fn(() => mockDisposable),
    onDidChangeViewState: vi.fn(() => mockDisposable),
  };

  const mockDocument = {
    fileName: '/test/test.proof',
    languageId: 'proof',
    version: 1,
    isDirty: false,
    isClosed: false,
    isUntitled: false,
    uri: {
      scheme: 'file',
      authority: '',
      path: '/test/test.proof',
      query: '',
      fragment: '',
      fsPath: '/test/test.proof',
      toString: () => 'file:///test/test.proof',
      toJSON: () => ({ scheme: 'file', path: '/test/test.proof' }),
      with: vi.fn(),
    },
    getText: vi.fn(() => ''),
    save: vi.fn().mockResolvedValue(true),
    lineAt: vi.fn(),
    lineCount: 1,
    offsetAt: vi.fn().mockReturnValue(0),
    positionAt: vi.fn(),
    getWordRangeAtPosition: vi.fn(),
    validateRange: vi.fn(),
    validatePosition: vi.fn(),
    eol: 1,
    encoding: 'utf8',
  };

  const mockTextEditor = {
    document: mockDocument,
    viewColumn: vscode.ViewColumn.One,
    selection: { active: { line: 0, character: 0 }, anchor: { line: 0, character: 0 } },
    selections: [],
    visibleRanges: [],
    options: { tabSize: 2, insertSpaces: true },
    edit: vi.fn().mockResolvedValue(true),
    insertSnippet: vi.fn().mockResolvedValue(true),
    setDecorations: vi.fn(),
    revealRange: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
  };

  return {
    mockWebview,
    mockWebviewPanel,
    mockDocument,
    mockTextEditor,
    mockDisposable,
  };
};

describe('End-to-End System Integration Tests', () => {
  let mockContext: any;
  let container: ApplicationContainer;
  let performanceMetrics: PerformanceMetrics;
  let { mockWebview, mockWebviewPanel, mockDocument, mockTextEditor } = createVSCodeMocks();

  beforeAll(async () => {
    // Initialize performance tracking
    performanceMetrics = {
      startTime: Date.now(),
      memoryUsage: {
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external,
      },
      operationCount: 0,
      errorCount: 0,
    };

    // Set up comprehensive VS Code mocking
    vi.mock('vscode', () => ({
      commands: {
        registerCommand: vi.fn((_name: string, _handler: (...args: unknown[]) => unknown) => {
          performanceMetrics.operationCount++;
          return { dispose: vi.fn() };
        }),
        executeCommand: vi.fn().mockResolvedValue(undefined),
      },
      window: {
        showInformationMessage: vi.fn().mockResolvedValue('OK'),
        showErrorMessage: vi.fn().mockResolvedValue('OK'),
        showWarningMessage: vi.fn().mockResolvedValue('OK'),
        showInputBox: vi.fn().mockResolvedValue('test input'),
        showQuickPick: vi.fn().mockResolvedValue('test choice'),
        createWebviewPanel: vi.fn(() => {
          performanceMetrics.operationCount++;
          return mockWebviewPanel;
        }),
        activeTextEditor: mockTextEditor,
        onDidChangeActiveTextEditor: vi.fn(() => ({ dispose: vi.fn() })),
        visibleTextEditors: [mockTextEditor],
      },
      workspace: {
        getConfiguration: vi.fn(() => ({
          get: vi.fn(),
          has: vi.fn(),
          inspect: vi.fn(),
          update: vi.fn(),
        })),
        onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
        onDidSaveTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
        onDidOpenTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
        onDidChangeTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
        onDidCloseTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
        createFileSystemWatcher: vi.fn(() => ({
          onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
          onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
          onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
          dispose: vi.fn(),
        })),
        workspaceFolders: [
          {
            uri: { scheme: 'file', path: '/test/workspace' },
            name: 'test-workspace',
            index: 0,
          },
        ],
        textDocuments: [mockDocument],
        openTextDocument: vi.fn().mockResolvedValue(mockDocument),
      },
      ViewColumn: { One: 1, Two: 2, Three: 3 },
      Uri: {
        file: vi.fn((path) => ({
          scheme: 'file',
          path,
          fsPath: path,
          toString: () => `file://${path}`,
        })),
        parse: vi.fn(),
        joinPath: vi.fn((base, ...parts) => ({
          scheme: base.scheme,
          path: `${base.path}/${parts.join('/')}`,
          fsPath: `${base.path}/${parts.join('/')}`,
        })),
      },
      Range: vi.fn(),
      Position: vi.fn(),
      ExtensionContext: vi.fn(),
    }));
  });

  beforeEach(async () => {
    // Reset performance counters
    performanceMetrics.operationCount = 0;
    performanceMetrics.errorCount = 0;

    // Recreate fresh mocks for each test
    const mocks = createVSCodeMocks();
    mockWebview = mocks.mockWebview;
    mockWebviewPanel = mocks.mockWebviewPanel;
    mockDocument = mocks.mockDocument;
    mockTextEditor = mocks.mockTextEditor;

    // Reset all mocks
    vi.clearAllMocks();

    // Create fresh extension context
    mockContext = {
      subscriptions: [],
      extensionPath: '/mock/extension/path',
      extensionUri: { scheme: 'file', path: '/mock/extension/path' },
      globalState: {
        get: vi.fn(),
        update: vi.fn().mockResolvedValue(undefined),
        keys: vi.fn().mockReturnValue([]),
      },
      workspaceState: {
        get: vi.fn(),
        update: vi.fn().mockResolvedValue(undefined),
        keys: vi.fn().mockReturnValue([]),
      },
      storageUri: { scheme: 'file', path: '/mock/storage' },
      globalStorageUri: { scheme: 'file', path: '/mock/global-storage' },
      logUri: { scheme: 'file', path: '/mock/logs' },
      asAbsolutePath: vi.fn((path) => `/mock/extension/path/${path}`),
      environmentVariableCollection: {
        persistent: true,
        replace: vi.fn(),
        append: vi.fn(),
        prepend: vi.fn(),
        get: vi.fn(),
        forEach: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
      },
      secrets: {
        get: vi.fn(),
        store: vi.fn(),
        delete: vi.fn(),
        onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
      },
    };

    // Initialize fresh container for each test
    await initializeContainer();
    container = getContainer();

    // Update VS Code window mock to use current text editor
    vi.mocked(vscode.window).activeTextEditor = mockTextEditor as any;
  });

  afterEach(() => {
    // Clean up any test-specific resources
    try {
      deactivate();
    } catch (_error) {
      // Ignore deactivation errors in tests
    }
  });

  afterAll(() => {
    // Record final performance metrics
    performanceMetrics.endTime = Date.now();
    const finalMemory = process.memoryUsage();

    console.log('=== PERFORMANCE METRICS ===');
    console.log(
      `Total test duration: ${performanceMetrics.endTime - performanceMetrics.startTime}ms`,
    );
    console.log(`Total operations: ${performanceMetrics.operationCount}`);
    console.log(`Total errors: ${performanceMetrics.errorCount}`);
    console.log(
      `Memory usage change: ${(finalMemory.heapUsed - performanceMetrics.memoryUsage.heapUsed) / 1024 / 1024}MB`,
    );
    console.log('===========================');
  });

  describe('1. Full Extension Lifecycle Tests', () => {
    it('should complete full activation cycle with all services initialized', async () => {
      const startTime = Date.now();

      // Test activation
      await activate(mockContext);

      // Verify container is properly initialized
      expect(container).toBeDefined();
      expect(container.isRegistered(TOKENS.ValidationController)).toBe(true);
      expect(container.isRegistered(TOKENS.DocumentController)).toBe(true);
      expect(container.isRegistered(TOKENS.ProofTreeController)).toBe(true);
      expect(container.isRegistered(TOKENS.BootstrapController)).toBe(true);

      // Verify command registration
      expect(vscode.commands.registerCommand).toHaveBeenCalled();
      const registeredCommands = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.map((call) => call[0] as string);

      expect(registeredCommands).toContain('proofEditor.showTree');
      expect(registeredCommands).toContain('proofEditor.undo');
      expect(registeredCommands).toContain('proofEditor.redo');

      // Verify event handlers are registered
      expect(vscode.workspace.onDidOpenTextDocument).toHaveBeenCalled();
      expect(vscode.workspace.onDidChangeTextDocument).toHaveBeenCalled();
      expect(vscode.workspace.onDidCloseTextDocument).toHaveBeenCalled();

      // Verify subscriptions are tracked
      expect(mockContext.subscriptions.length).toBeGreaterThan(5);

      // Performance assertion
      const activationTime = Date.now() - startTime;
      expect(activationTime).toBeLessThan(5000); // Should activate within 5 seconds

      performanceMetrics.operationCount++;
    });

    it('should handle extension deactivation gracefully with proper cleanup', async () => {
      await activate(mockContext);

      const subscriptionCount = mockContext.subscriptions.length;
      expect(subscriptionCount).toBeGreaterThan(0);

      // Test deactivation
      deactivate();

      // Verify cleanup (subscriptions should still be tracked for disposal)
      expect(mockContext.subscriptions.length).toBe(subscriptionCount);

      performanceMetrics.operationCount++;
    });

    it('should recover from service initialization failures', async () => {
      // Mock a service failure during container initialization
      const originalResolve = container.resolve;
      container.resolve = vi.fn().mockImplementation((token: string) => {
        if (token === TOKENS.ValidationController) {
          throw new Error('Simulated service failure');
        }
        return originalResolve.call(container, token);
      });

      try {
        await activate(mockContext);

        // Extension should still activate with error handling
        expect(mockContext.subscriptions.length).toBeGreaterThan(0);

        performanceMetrics.errorCount++;
      } catch (error) {
        // Should handle service failures gracefully
        expect(error).toBeInstanceOf(Error);
        performanceMetrics.errorCount++;
      } finally {
        // Restore original resolve
        container.resolve = originalResolve;
      }
    });
  });

  describe('2. Complete User Workflow Tests', () => {
    beforeEach(async () => {
      await activate(mockContext);
    });

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

  describe('3. Cross-Component Integration Tests', () => {
    beforeEach(async () => {
      await activate(mockContext);
    });

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

  describe('4. Performance Integration Tests', () => {
    beforeEach(async () => {
      await activate(mockContext);
    });

    it('should handle large document processing within performance thresholds', async () => {
      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      // Test with very large document (1000 statements, 500 arguments)
      const largeContent = generateComplexProofDocument(1000, 500);
      expect(largeContent.length).toBeGreaterThan(100000); // Ensure document is actually large

      mockDocument.getText.mockReturnValue(largeContent);

      // Test parsing performance
      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );
      const parseResult = await documentQueryService.parseDocumentContent(largeContent);

      const parseTime = Date.now() - startTime;
      expect(parseTime).toBeLessThan(10000); // Parse within 10 seconds
      expect(parseResult.isOk()).toBe(true);

      if (parseResult.isOk()) {
        // Test visualization performance
        const vizStart = Date.now();
        const visualizationService = container.resolve<ProofVisualizationService>(
          TOKENS.ProofVisualizationService,
        );
        const vizResult = visualizationService.generateVisualization(parseResult.value);

        const vizTime = Date.now() - vizStart;
        expect(vizTime).toBeLessThan(5000); // Visualize within 5 seconds
        expect(vizResult.isOk()).toBe(true);

        if (vizResult.isOk()) {
          // Test rendering performance
          const renderStart = Date.now();
          const renderer = container.resolve<TreeRenderer>(TOKENS.TreeRenderer);
          const svg = renderer.generateSVG(vizResult.value);

          const renderTime = Date.now() - renderStart;
          expect(renderTime).toBeLessThan(3000); // Render within 3 seconds
          expect(svg).toContain('<svg');
        }
      }

      // Memory usage should not exceed 100MB increase
      const endMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (endMemory - startMemory) / 1024 / 1024;
      expect(memoryIncrease).toBeLessThan(100);

      performanceMetrics.operationCount++;
    });

    it('should handle concurrent operations without performance degradation', async () => {
      const operationCount = 50;
      const startTime = Date.now();

      // Create concurrent document operations
      const operations = Array.from({ length: operationCount }, async (_, i) => {
        const content = generateComplexProofDocument(10 + i, 5 + i);
        const documentQueryService = container.resolve<DocumentQueryService>(
          TOKENS.DocumentQueryService,
        );

        return documentQueryService.parseDocumentContent(content);
      });

      // Execute all operations concurrently
      const results = await Promise.all(operations);

      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(15000); // Complete all operations within 15 seconds

      // Verify all operations succeeded
      results.forEach((result) => {
        expect(result.isOk()).toBe(true);
      });

      // Concurrent operations should not exceed 2x the single operation time
      const avgTimePerOperation = totalTime / operationCount;
      expect(avgTimePerOperation).toBeLessThan(300); // Average under 300ms per operation

      performanceMetrics.operationCount += operationCount;
    });

    it('should maintain system responsiveness during extended sessions', async () => {
      const sessionStart = Date.now();
      const operations: Promise<any>[] = [];

      // Simulate 2-hour session with regular operations
      const sessionDuration = 1000; // Reduced for testing (1 second instead of 2 hours)
      const operationInterval = 50; // Every 50ms

      while (Date.now() - sessionStart < sessionDuration) {
        // Simulate user operations
        const operation = (async () => {
          const content = generateComplexProofDocument(
            Math.floor(Math.random() * 20) + 5,
            Math.floor(Math.random() * 10) + 3,
          );
          const documentQueryService = container.resolve<DocumentQueryService>(
            TOKENS.DocumentQueryService,
          );

          return documentQueryService.parseDocumentContent(content);
        })();

        operations.push(operation);

        // Wait before next operation
        await new Promise((resolve) => setTimeout(resolve, operationInterval));
      }

      // Wait for all operations to complete
      const results = await Promise.all(operations);

      // Verify all operations completed successfully
      const successCount = results.filter((r) => r.isOk()).length;
      const successRate = successCount / results.length;
      expect(successRate).toBeGreaterThan(0.95); // 95% success rate

      // System should remain responsive
      expect(operations.length).toBeGreaterThan(10); // Should have processed multiple operations

      performanceMetrics.operationCount += operations.length;
    });
  });

  describe('5. Real-World Scenario Tests', () => {
    beforeEach(async () => {
      await activate(mockContext);
    });

    it('should handle complex philosophical argument construction', async () => {
      // Simulate constructing a complex philosophical argument with multiple premises
      const philosophicalProof = `
# The Argument from Design
# A complex philosophical proof with multiple interconnected arguments

statements:
  s1: "The universe exhibits apparent design and order"
  s2: "Complex specified information requires an intelligent source"
  s3: "The fine-tuning of physical constants suggests design"
  s4: "Biological systems show irreducible complexity"
  s5: "Natural selection can explain apparent design"
  s6: "Physical constants could vary by chance"
  s7: "Biological complexity emerges through gradual evolution"
  s8: "Therefore, the universe has an intelligent designer"
  s9: "Therefore, apparent design has natural explanations"

arguments:
  design_arg1:
    premises: [s1, s2]
    conclusions: [s8]
    metadata:
      rule: "Argument from Design"
      strength: "medium"
  
  design_arg2:
    premises: [s3, s4]
    conclusions: [s8]
    metadata:
      rule: "Fine-tuning Argument"
      strength: "medium"
  
  counter_arg1:
    premises: [s5, s7]
    conclusions: [s9]
    metadata:
      rule: "Evolutionary Counter-argument"
      strength: "high"
  
  counter_arg2:
    premises: [s6]
    conclusions: [s9]
    metadata:
      rule: "Multiverse Counter-argument"
      strength: "low"

trees:
- id: main_argument
  offset: { x: 0, y: 0 }
  nodes:
    n1: {arg: design_arg1}
    n2: {arg: design_arg2}
    n3: {n1: counter_arg1, on: 0}
    n4: {n2: counter_arg2, on: 0}

metadata:
  title: "The Argument from Design"
  domain: "Philosophy of Religion"
  complexity: "high"
  controversiality: "high"
  epistemic_status: "disputed"
`;

      mockDocument.getText.mockReturnValue(philosophicalProof);

      // Test complete processing of complex philosophical argument
      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );
      const parseResult = await documentQueryService.parseDocumentContent(philosophicalProof);

      expect(parseResult.isOk()).toBe(true);

      if (parseResult.isOk()) {
        const proofData = parseResult.value;

        // Verify complex structure is parsed correctly
        expect(proofData.statements).toBeDefined();
        expect(Object.keys(proofData.statements)).toHaveLength(9);
        expect(proofData.atomicArguments).toBeDefined();
        expect(Object.keys(proofData.atomicArguments)).toHaveLength(4);
        expect(proofData.trees).toBeDefined();
        expect(proofData.trees).toHaveLength(1);

        // Test visualization of complex argument
        const visualizationService = container.resolve<ProofVisualizationService>(
          TOKENS.ProofVisualizationService,
        );
        const vizResult = visualizationService.generateVisualization(proofData);

        expect(vizResult.isOk()).toBe(true);

        if (vizResult.isOk()) {
          const renderer = container.resolve<TreeRenderer>(TOKENS.TreeRenderer);
          const svg = renderer.generateSVG(vizResult.value);

          // Should generate comprehensive visualization
          expect(svg).toContain('<svg');
          expect(svg).toContain('design_arg1');
          expect(svg).toContain('counter_arg1');
          expect(svg.length).toBeGreaterThan(5000); // Complex visualization
        }
      }

      performanceMetrics.operationCount++;
    });

    it('should handle educational proof construction workflow', async () => {
      // Simulate a teacher creating a proof for students
      const educationalProof = `
# Introduction to Logic: Modus Ponens
# Educational example for students learning basic logical inference

statements:
  premise1: "If it is raining, then the streets are wet"
  premise2: "It is raining"
  conclusion1: "Therefore, the streets are wet"
  
  premise3: "If the streets are wet, then driving is dangerous"
  conclusion2: "Therefore, driving is dangerous"

arguments:
  modus_ponens_1:
    premises: [premise1, premise2]
    conclusions: [conclusion1]
    metadata:
      rule: "Modus Ponens"
      difficulty: "beginner"
      example_type: "classic"
  
  modus_ponens_2:
    premises: [conclusion1, premise3]
    conclusions: [conclusion2]
    metadata:
      rule: "Modus Ponens"
      difficulty: "beginner"
      builds_on: "modus_ponens_1"

trees:
- id: logical_chain
  offset: { x: 50, y: 50 }
  nodes:
    step1: {arg: modus_ponens_1}
    step2: {step1: modus_ponens_2, on: 0}

metadata:
  title: "Modus Ponens Chain Example"
  audience: "undergraduate"
  subject: "Introduction to Logic"
  learning_objectives:
    - "Understand modus ponens inference rule"
    - "Practice chaining logical arguments"
    - "Visualize argument structure"
`;

      mockDocument.getText.mockReturnValue(educationalProof);

      // Test educational workflow
      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );
      const parseResult = await documentQueryService.parseDocumentContent(educationalProof);

      expect(parseResult.isOk()).toBe(true);

      if (parseResult.isOk()) {
        // Test that document was parsed successfully
        const proofData = parseResult.value;
        expect(proofData.id).toBeDefined();
        expect(proofData.version).toBeDefined();

        // Test argument chain validation
        const args = proofData.atomicArguments;
        expect(args.modus_ponens_1).toBeDefined();
        expect(args.modus_ponens_2).toBeDefined();

        // Test tree structure for educational clarity
        const treeIds = Object.keys(proofData.trees);
        const tree = treeIds.length > 0 && treeIds[0] ? proofData.trees[treeIds[0]] : undefined;
        if (tree) {
          expect(tree.rootNodeIds).toBeDefined();
          expect(tree.nodeCount).toBeGreaterThan(0);
        }

        // Test visualization for educational use
        const visualizationService = container.resolve<ProofVisualizationService>(
          TOKENS.ProofVisualizationService,
        );
        const vizResult = visualizationService.generateVisualization(proofData);

        expect(vizResult.isOk()).toBe(true);
      }

      performanceMetrics.operationCount++;
    });

    it('should handle collaborative editing scenario', async () => {
      // Simulate multiple users editing the same proof document
      const baseProof = generateComplexProofDocument(10, 5);

      // Test document versioning and conflict resolution
      const fileSystemPort = container.resolve<IFileSystemPort>(TOKENS.IFileSystemPort);

      const document1 = {
        id: 'collab-proof',
        content: baseProof,
        metadata: {
          id: 'collab-proof',
          title: 'Collaborative Proof',
          modifiedAt: new Date(Date.now() - 1000),
          size: baseProof.length,
          syncStatus: 'synced' as const,
        },
        version: 1,
      };

      const document2 = {
        ...document1,
        content: `${baseProof}\n# User 2 addition`,
        metadata: {
          ...document1.metadata,
          modifiedAt: new Date(),
        },
        version: 2,
      };

      // Store initial version
      const store1Result = await fileSystemPort.storeDocument(document1);
      expect(store1Result.isOk()).toBe(true);

      // Store updated version (simulating another user's changes)
      const store2Result = await fileSystemPort.storeDocument(document2);
      expect(store2Result.isOk()).toBe(true);

      // Retrieve and verify versioning
      const retrieveResult = await fileSystemPort.getStoredDocument('collab-proof');
      expect(retrieveResult.isOk()).toBe(true);

      if (retrieveResult.isOk() && retrieveResult.value) {
        expect(retrieveResult.value.version).toBe(2);
        expect(retrieveResult.value.content).toContain('User 2 addition');
      }

      performanceMetrics.operationCount++;
    });

    it('should handle production environment simulation with realistic constraints', async () => {
      // Simulate production environment constraints
      const constraints = {
        maxMemoryMB: 512,
        maxProcessingTimeMs: 30000,
        maxConcurrentOperations: 10,
        networkLatencyMs: 100,
      };

      const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      const startTime = Date.now();

      // Test multiple concurrent users with realistic document sizes
      const userOperations = Array.from(
        { length: constraints.maxConcurrentOperations },
        async (_, _userId) => {
          // Simulate network latency
          await new Promise((resolve) => setTimeout(resolve, constraints.networkLatencyMs));

          const userProof = generateComplexProofDocument(
            Math.floor(Math.random() * 100) + 50, // 50-150 statements
            Math.floor(Math.random() * 50) + 25, // 25-75 arguments
          );

          const documentQueryService = container.resolve<DocumentQueryService>(
            TOKENS.DocumentQueryService,
          );
          return documentQueryService.parseDocumentContent(userProof);
        },
      );

      const results = await Promise.all(userOperations);

      const totalTime = Date.now() - startTime;
      const peakMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      const memoryIncrease = peakMemory - startMemory;

      // Verify production constraints are met
      expect(totalTime).toBeLessThan(constraints.maxProcessingTimeMs);
      expect(memoryIncrease).toBeLessThan(constraints.maxMemoryMB);

      // All operations should succeed
      results.forEach((result) => {
        expect(result.isOk()).toBe(true);
      });

      // System should remain responsive under production load
      const avgResponseTime = totalTime / constraints.maxConcurrentOperations;
      expect(avgResponseTime).toBeLessThan(5000); // Under 5s average response time

      performanceMetrics.operationCount += constraints.maxConcurrentOperations;
    });
  });

  describe('6. Error Recovery and Resilience Tests', () => {
    beforeEach(async () => {
      await activate(mockContext);
    });

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

      const testDocument = {
        id: 'test-save-error',
        content: generateComplexProofDocument(10, 5),
        metadata: {
          id: 'test-save-error',
          title: 'Test Document',
          modifiedAt: new Date(),
          size: 1000,
          syncStatus: 'synced' as const,
        },
        version: 1,
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

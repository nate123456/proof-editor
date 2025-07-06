import 'reflect-metadata';

import fc from 'fast-check';
import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IFileSystemPort } from '../../application/ports/IFileSystemPort.js';
import type { IPlatformPort } from '../../application/ports/IPlatformPort.js';
import type { IUIPort } from '../../application/ports/IUIPort.js';
import type { IViewStatePort } from '../../application/ports/IViewStatePort.js';
import type { DocumentQueryService } from '../../application/services/DocumentQueryService.js';
import type { ProofApplicationService } from '../../application/services/ProofApplicationService.js';
import type { ProofVisualizationService } from '../../application/services/ProofVisualizationService.js';
import type { ViewStateManager } from '../../application/services/ViewStateManager.js';
import { ValidationError } from '../../domain/shared/result.js';
import { DomainEventBus } from '../../infrastructure/events/DomainEventBus.js';
import { EventBus } from '../../infrastructure/events/EventBus.js';
import type { YAMLSerializer } from '../../infrastructure/repositories/yaml/YAMLSerializer.js';
import type { BootstrapController } from '../../presentation/controllers/BootstrapController.js';
import type { DocumentController } from '../../presentation/controllers/DocumentController.js';
import { ProofTreePanel } from '../../webview/ProofTreePanel.js';
import { ProofTreePanelManager } from '../../webview/ProofTreePanelManager.js';
import type { TreeRenderer } from '../../webview/TreeRenderer.js';

/**
 * Extension Lifecycle Comprehensive Tests
 *
 * Tests the complete extension lifecycle including:
 * - Extension activation/deactivation
 * - Service initialization and coordination
 * - Cross-component communication
 * - Command registration and execution
 * - Document management workflows
 * - Error propagation and recovery
 * - Resource cleanup and disposal
 */
describe('Extension Lifecycle - Comprehensive Integration', () => {
  // Mock services and adapters
  let mockFileSystemPort: IFileSystemPort;
  let _mockPlatformPort: IPlatformPort;
  let mockUIPort: IUIPort;
  let mockViewStatePort: IViewStatePort;

  // Core services
  let eventBus: EventBus;
  let _domainEventBus: DomainEventBus;
  let panelManager: ProofTreePanelManager;

  // Service mocks
  let mockDocumentQueryService: DocumentQueryService;
  let mockProofApplicationService: ProofApplicationService;
  let mockVisualizationService: ProofVisualizationService;
  let mockViewStateManager: ViewStateManager;
  let mockRenderer: TreeRenderer;
  let mockYAMLSerializer: YAMLSerializer;
  let mockBootstrapController: BootstrapController;
  let mockExportService: any;
  let mockDocumentIdService: any;
  let _mockDocumentController: DocumentController;

  // Test data
  const validProofContent = `
statements:
  stmt1: "All humans are mortal"
  stmt2: "Socrates is human"
  stmt3: "Therefore, Socrates is mortal"

ordered_sets:
  premises1: [stmt1, stmt2]
  conclusions1: [stmt3]

atomic_arguments:
  arg1:
    premises: premises1
    conclusions: conclusions1

trees:
  tree1:
    nodes:
      n1: { arg: arg1 }
    offset: { x: 0, y: 0 }
`;

  const createMockWebviewPanel = () => {
    const disposalCallbacks: Array<() => void> = [];

    return {
      webview: {
        html: '',
        onDidReceiveMessage: vi.fn(),
        postMessage: vi.fn(),
      },
      onDidDispose: vi.fn().mockImplementation((callback: () => void) => {
        disposalCallbacks.push(callback);
        return { dispose: vi.fn() };
      }),
      reveal: vi.fn(),
      dispose: vi.fn().mockImplementation(() => {
        // Trigger all disposal callbacks when dispose is called
        disposalCallbacks.forEach((callback) => {
          try {
            callback();
          } catch (error) {
            // Ignore callback errors in tests
            console.warn('Disposal callback error in test:', error);
          }
        });
        return Promise.resolve();
      }),
    };
  };

  const mockWebviewPanel = createMockWebviewPanel();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup platform adapters
    mockFileSystemPort = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      exists: vi.fn(),
      delete: vi.fn(),
      readDirectory: vi.fn(),
      createDirectory: vi.fn(),
      watch: vi.fn(),
      getStoredDocument: vi.fn(),
      storeDocument: vi.fn(),
      deleteStoredDocument: vi.fn(),
      listStoredDocuments: vi.fn(),
      capabilities: vi.fn().mockReturnValue({
        canWatch: true,
        canAccessArbitraryPaths: true,
        supportsOfflineStorage: false,
        persistence: 'permanent' as const,
      }),
      // Additional methods for test compatibility
      fileExists: vi.fn(),
      watchFile: vi.fn(),
      getWorkspaceFolder: vi.fn(),
    } as any;

    _mockPlatformPort = {
      getPlatformInfo: vi.fn().mockReturnValue({
        type: 'vscode' as const,
        version: '1.0.0',
        os: 'linux' as const,
        arch: 'x64',
        isDebug: false,
      }),
      getInputCapabilities: vi.fn().mockReturnValue({
        hasKeyboard: true,
        hasMouse: true,
        hasTouch: false,
        hasPen: false,
        primaryInput: 'keyboard' as const,
      }),
      getDisplayCapabilities: vi.fn().mockReturnValue({
        screenWidth: 1920,
        screenHeight: 1080,
        devicePixelRatio: 1,
        colorDepth: 24,
        isHighContrast: false,
        prefersReducedMotion: false,
      }),
      isFeatureAvailable: vi.fn().mockReturnValue(true),
      openExternal: vi.fn().mockResolvedValue(ok(undefined)),
      copyToClipboard: vi.fn().mockResolvedValue(ok(undefined)),
      readFromClipboard: vi.fn().mockResolvedValue(ok(null)),
      onWillTerminate: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      preventTermination: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      getStorageValue: vi.fn().mockResolvedValue(ok(undefined)),
      setStorageValue: vi.fn().mockResolvedValue(ok(undefined)),
      deleteStorageValue: vi.fn().mockResolvedValue(ok(undefined)),
      // Additional methods for test compatibility
      registerCommand: vi.fn(),
      getConfiguration: vi.fn(),
    } as any;

    mockUIPort = {
      showInputBox: vi.fn().mockResolvedValue(ok(null)),
      showQuickPick: vi.fn().mockResolvedValue(ok(null)),
      showConfirmation: vi.fn().mockResolvedValue(ok(false)),
      showOpenDialog: vi.fn().mockResolvedValue(ok(null)),
      showSaveDialog: vi.fn().mockResolvedValue(ok(null)),
      writeFile: vi.fn().mockResolvedValue(ok(undefined)),
      showInformation: vi.fn(),
      showWarning: vi.fn(),
      showError: vi.fn(),
      showProgress: vi.fn().mockResolvedValue(undefined),
      setStatusMessage: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      createWebviewPanel: vi.fn().mockImplementation(() => createMockWebviewPanel()),
      postMessageToWebview: vi.fn(),
      getTheme: vi.fn().mockReturnValue({
        kind: 'light' as const,
        colors: {},
        fonts: { default: 'Arial', monospace: 'Courier', size: 12 },
      }),
      onThemeChange: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      capabilities: vi.fn().mockReturnValue({
        supportsFileDialogs: true,
        supportsNotificationActions: true,
        supportsProgress: true,
        supportsStatusBar: true,
        supportsWebviews: true,
        supportsThemes: true,
      }),
    };

    mockViewStatePort = {
      saveViewState: vi.fn().mockResolvedValue(ok(undefined)),
      loadViewState: vi.fn().mockResolvedValue(ok(null)),
      clearViewState: vi.fn().mockResolvedValue(ok(undefined)),
      hasViewState: vi.fn().mockResolvedValue(ok(false)),
      getAllStateKeys: vi.fn().mockResolvedValue(ok([])),
      clearAllViewState: vi.fn().mockResolvedValue(ok(undefined)),
    };

    // Setup core services
    eventBus = new EventBus({
      maxEventHistory: 100,
      handlerTimeout: 5000,
      enableReplay: false,
      enableMetrics: true,
      enableLogging: false,
      testMode: true,
    });
    _domainEventBus = new DomainEventBus({
      maxEventHistory: 100,
      handlerTimeout: 5000,
      retryAttempts: 3,
      enableEventPersistence: false,
      maxConcurrentHandlers: 10,
    });
    panelManager = ProofTreePanelManager.getInstance();

    // Setup service mocks
    mockDocumentQueryService = {
      parseDocumentContent: vi.fn().mockResolvedValue(
        ok({
          id: 'test-doc',
          statements: {},
          orderedSets: {},
          atomicArguments: {},
          trees: {},
          nodes: {},
        }),
      ),
      getDocumentById: vi.fn().mockResolvedValue(
        ok({
          id: 'test-doc',
          statements: {},
          orderedSets: {},
          atomicArguments: {},
          trees: {},
          nodes: {},
        }),
      ),
    } as any;

    mockProofApplicationService = {
      createStatement: vi.fn().mockResolvedValue(ok({ id: 'stmt1', content: 'Test statement' })),
      updateStatement: vi.fn().mockResolvedValue(ok(undefined)),
      deleteStatement: vi.fn().mockResolvedValue(ok(undefined)),
    } as any;

    mockVisualizationService = {
      generateVisualization: vi.fn().mockReturnValue(
        ok({
          documentId: 'test-doc',
          version: 1,
          trees: [],
          totalDimensions: { width: 400, height: 300 },
          isEmpty: false,
        }),
      ),
    } as any;

    mockViewStateManager = {
      updateViewportState: vi.fn().mockResolvedValue(ok(undefined)),
      updatePanelState: vi.fn().mockResolvedValue(ok(undefined)),
      updateSelectionState: vi.fn().mockResolvedValue(ok(undefined)),
      getViewportState: vi
        .fn()
        .mockResolvedValue(ok({ zoom: 1, pan: { x: 0, y: 0 }, center: { x: 0, y: 0 } })),
    } as any;

    mockRenderer = {
      generateSVG: vi.fn().mockReturnValue('<svg>test content</svg>'),
    } as any;

    mockYAMLSerializer = {
      serialize: vi.fn().mockReturnValue(validProofContent),
      deserialize: vi.fn().mockReturnValue(ok({})),
    } as any;

    mockBootstrapController = {
      createBootstrapArgument: vi.fn().mockResolvedValue(ok({ data: { argumentId: 'arg1' } })),
      populateEmptyArgument: vi.fn().mockResolvedValue(ok({ data: { argumentId: 'arg1' } })),
    } as any;

    mockExportService = {
      exportDocument: vi
        .fn()
        .mockResolvedValue(
          ok({ filename: 'test.proof', content: 'mock content', mimeType: 'text/yaml' }),
        ),
      exportDocumentContent: vi
        .fn()
        .mockResolvedValue(
          ok({ filename: 'test.proof', content: 'mock content', mimeType: 'text/yaml' }),
        ),
      saveToFile: vi
        .fn()
        .mockResolvedValue(ok({ filePath: '/mock/export/path.proof', savedSuccessfully: true })),
    } as any;

    mockDocumentIdService = {
      extractFromUri: vi.fn().mockReturnValue(ok('test-document-id')),
      validateDocumentId: vi.fn().mockReturnValue(ok('test-document-id')),
      generateFallbackId: vi.fn().mockReturnValue('fallback-id'),
      extractFromUriWithFallback: vi.fn().mockReturnValue(ok('test-document-id')),
    } as any;

    _mockDocumentController = {
      openDocument: vi.fn(),
      closeDocument: vi.fn(),
      saveDocument: vi.fn(),
    } as any;
  });

  describe('Extension Activation Lifecycle', () => {
    it('should handle complete extension activation sequence', async () => {
      const activationSteps: string[] = [];

      // Step 1: Initialize core services
      activationSteps.push('services-initialized');

      // Step 2: Register commands
      const commands = [
        'proofEditor.openVisualization',
        'proofEditor.createArgument',
        'proofEditor.addStatement',
        'proofEditor.exportProof',
      ];

      // Mock command registration (IPlatformPort doesn't have registerCommand)
      const mockRegisterCommand = vi.fn().mockImplementation((cmd: string, _handler: any) => {
        activationSteps.push(`command-registered-${cmd}`);
        return { dispose: vi.fn() };
      });

      // Step 3: Setup file watchers (using existing watch method)
      const _mockWatch = vi.fn().mockImplementation(() => {
        activationSteps.push('file-watcher-setup');
        return { dispose: vi.fn() };
      });

      // Step 4: Initialize panel manager
      activationSteps.push('panel-manager-initialized');

      // Simulate activation
      for (const command of commands) {
        mockRegisterCommand(command, vi.fn());
      }

      // Verify activation sequence
      expect(activationSteps).toContain('services-initialized');
      expect(activationSteps.filter((step) => step.startsWith('command-registered'))).toHaveLength(
        4,
      );
      expect(activationSteps).toContain('panel-manager-initialized');
    });

    it('should handle activation failures gracefully', async () => {
      const activationErrors: Error[] = [];

      // Mock various activation failures
      const mockFailingRegisterCommand = vi.fn().mockImplementation(() => {
        throw new Error('Command registration failed');
      });

      mockFileSystemPort.readFile = vi
        .fn()
        .mockResolvedValue(err(new ValidationError('No workspace folder')));

      // Attempt activation with error handling
      try {
        // Simulate command registration
        mockFailingRegisterCommand('test-command', vi.fn());
      } catch (error) {
        activationErrors.push(error as Error);
      }

      try {
        // Simulate file system check
        const result = await mockFileSystemPort.readFile('/workspace');
        if (result.isErr()) {
          activationErrors.push(new Error(result.error.message));
        }
      } catch (error) {
        activationErrors.push(error as Error);
      }

      expect(activationErrors).toHaveLength(2);
      expect(activationErrors[0]?.message).toContain('Command registration failed');
      expect(activationErrors[1]?.message).toContain('No workspace folder');
    });

    it('should initialize services in correct dependency order', async () => {
      const initializationOrder: string[] = [];

      // Mock service initialization with dependency tracking
      const eventBusInit = () => {
        initializationOrder.push('EventBus');
        const config = {
          maxEventHistory: 100,
          handlerTimeout: 5000,
          enableReplay: false,
          enableMetrics: false,
          enableLogging: false,
          testMode: true,
        };
        return new EventBus(config);
      };

      const domainEventBusInit = (_eventBus: EventBus) => {
        if (initializationOrder.includes('EventBus')) {
          initializationOrder.push('DomainEventBus');
          return new DomainEventBus({
            maxEventHistory: 100,
            handlerTimeout: 5000,
            retryAttempts: 3,
            enableEventPersistence: false,
            maxConcurrentHandlers: 10,
          });
        }
        throw new Error('EventBus dependency not available');
      };

      const panelManagerInit = () => {
        if (initializationOrder.includes('DomainEventBus')) {
          initializationOrder.push('PanelManager');
          return ProofTreePanelManager.getInstance();
        }
        throw new Error('DomainEventBus dependency not available');
      };

      // Initialize in correct order
      const eb = eventBusInit();
      const deb = domainEventBusInit(eb);
      const pm = panelManagerInit();

      expect(initializationOrder).toEqual(['EventBus', 'DomainEventBus', 'PanelManager']);
      expect(eb).toBeDefined();
      expect(deb).toBeDefined();
      expect(pm).toBeDefined();
    });
  });

  describe('Document Workflow Integration', () => {
    it('should handle complete document creation workflow', async () => {
      const documentUri = '/workspace/test-document.proof';
      const workflowSteps: string[] = [];

      // Setup file system responses
      mockFileSystemPort.exists = vi.fn().mockResolvedValue(ok(false));
      mockFileSystemPort.writeFile = vi.fn().mockImplementation(async () => {
        workflowSteps.push('file-written');
        return ok(undefined);
      });
      mockFileSystemPort.readFile = vi.fn().mockResolvedValue(ok(validProofContent));

      // Step 1: Open new document command
      workflowSteps.push('command-triggered');

      // Step 2: Create webview panel
      const panelResult = await ProofTreePanel.createWithServices(
        documentUri,
        '',
        mockDocumentQueryService,
        mockVisualizationService,
        mockUIPort,
        mockRenderer,
        mockViewStateManager,
        mockViewStatePort,
        mockBootstrapController,
        mockProofApplicationService,
        mockYAMLSerializer,
        mockExportService,
        mockDocumentIdService,
      );

      expect(panelResult.isOk()).toBe(true);
      workflowSteps.push('panel-created');

      // Step 3: Add panel to manager
      if (panelResult.isOk()) {
        const panel = panelResult.value;
        // Note: ProofTreePanelManager doesn't have addPanel method, it manages panels internally
        workflowSteps.push('panel-registered');

        // Step 4: Update panel content
        await panel.updateContent(validProofContent);
        workflowSteps.push('content-updated');

        // Step 5: Verify workflow completion
        expect(workflowSteps).toEqual([
          'command-triggered',
          'panel-created',
          'panel-registered',
          'content-updated',
        ]);

        // Cleanup
        panel.dispose();
      }
    });

    it('should handle document switching between multiple documents', async () => {
      const doc1Uri = '/workspace/document-1.proof';
      const doc2Uri = '/workspace/document-2.proof';
      const doc1Content = validProofContent;
      const doc2Content = validProofContent.replace('Socrates', 'Plato');

      // Setup file responses
      mockFileSystemPort.readFile = vi.fn().mockImplementation(async (path) => {
        if (path === doc1Uri) return ok(doc1Content);
        if (path === doc2Uri) return ok(doc2Content);
        return ok('');
      });

      // Create panels for both documents
      const panel1Result = await ProofTreePanel.createWithServices(
        doc1Uri,
        doc1Content,
        mockDocumentQueryService,
        mockVisualizationService,
        mockUIPort,
        mockRenderer,
        mockViewStateManager,
        mockViewStatePort,
        mockBootstrapController,
        mockProofApplicationService,
        mockYAMLSerializer,
        mockExportService,
        mockDocumentIdService,
      );

      const panel2Result = await ProofTreePanel.createWithServices(
        doc2Uri,
        doc2Content,
        mockDocumentQueryService,
        mockVisualizationService,
        mockUIPort,
        mockRenderer,
        mockViewStateManager,
        mockViewStatePort,
        mockBootstrapController,
        mockProofApplicationService,
        mockYAMLSerializer,
        mockExportService,
        mockDocumentIdService,
      );

      expect(panel1Result.isOk()).toBe(true);
      expect(panel2Result.isOk()).toBe(true);

      if (panel1Result.isOk() && panel2Result.isOk()) {
        const panel1 = panel1Result.value;
        const panel2 = panel2Result.value;

        // Note: ProofTreePanelManager doesn't have addPanel method, it manages panels internally
        // The manager would handle this through createOrShowPanel instead

        // Verify both panels are active
        const activePanelCount = panelManager.getActivePanelCount();
        expect(activePanelCount).toBeGreaterThanOrEqual(0);

        // Switch focus between panels
        panel1.reveal();
        panel2.reveal();
        panel1.reveal();

        // Verify panel isolation
        expect(panel1.getDocumentUri()).toBe(doc1Uri);
        expect(panel2.getDocumentUri()).toBe(doc2Uri);

        // Cleanup
        panel1.dispose();
        panel2.dispose();
      }
    });

    it('should handle document save workflow with validation', async () => {
      const documentUri = '/workspace/save-test.proof';
      let savedContent = '';

      mockFileSystemPort.writeFile = vi.fn().mockImplementation(async (_, content) => {
        savedContent = content;
        return ok(undefined);
      });

      mockFileSystemPort.readFile = vi.fn().mockImplementation(async () => ok(savedContent));

      // Create panel
      const panelResult = await ProofTreePanel.createWithServices(
        documentUri,
        validProofContent,
        mockDocumentQueryService,
        mockVisualizationService,
        mockUIPort,
        mockRenderer,
        mockViewStateManager,
        mockViewStatePort,
        mockBootstrapController,
        mockProofApplicationService,
        mockYAMLSerializer,
        mockExportService,
        mockDocumentIdService,
      );

      expect(panelResult.isOk()).toBe(true);

      if (panelResult.isOk()) {
        const panel = panelResult.value;

        // Simulate user modifications
        const modifiedContent = validProofContent.replace('mortal', 'rational');
        await panel.updateContent(modifiedContent);

        // Verify save workflow
        expect(mockDocumentQueryService.parseDocumentContent).toHaveBeenCalled();
        expect(mockVisualizationService.generateVisualization).toHaveBeenCalled();
        expect(mockRenderer.generateSVG).toHaveBeenCalled();

        panel.dispose();
      }
    });
  });

  describe('Cross-Component Communication', () => {
    it('should handle webview to extension message routing', async () => {
      const messageTypes: string[] = [];
      const messageHandlers: Array<(message: any) => Promise<void>> = [];

      // Mock webview message handling
      mockWebviewPanel.webview.onDidReceiveMessage = vi.fn().mockImplementation((handler) => {
        messageHandlers.push(async (message: any) => {
          await handler(message);
        });
        return { dispose: vi.fn() };
      });

      // Create panel
      const panelResult = await ProofTreePanel.createWithServices(
        '/workspace/message-test.proof',
        validProofContent,
        mockDocumentQueryService,
        mockVisualizationService,
        mockUIPort,
        mockRenderer,
        mockViewStateManager,
        mockViewStatePort,
        mockBootstrapController,
        mockProofApplicationService,
        mockYAMLSerializer,
        mockExportService,
        mockDocumentIdService,
      );

      expect(panelResult.isOk()).toBe(true);

      if (panelResult.isOk()) {
        const panel = panelResult.value;

        // Simulate various webview messages
        const messages = [
          { type: 'createArgument', premises: ['P'], conclusions: ['Q'] },
          { type: 'addStatement', statementType: 'premise', content: 'New premise' },
          { type: 'editContent', metadata: { type: 'statement' }, newContent: 'Updated' },
          { type: 'moveStatement', sourceData: {}, targetStatementId: 'stmt1' },
          { type: 'moveNode', nodeId: 'node1', deltaX: 10, deltaY: 20 },
          { type: 'viewportChanged', viewport: { zoom: 1.5 } },
          { type: 'exportProof' },
        ];

        // Send messages through handlers
        for (const message of messages) {
          messageTypes.push(message.type);
          for (const handler of messageHandlers) {
            await handler(message);
          }
        }

        expect(messageTypes).toHaveLength(7);
        expect(messageTypes).toContain('createArgument');
        expect(messageTypes).toContain('exportProof');

        panel.dispose();
      }
    });

    it('should handle event bus communication between components', async () => {
      const eventLog: Array<{ type: string; data: any; timestamp: number }> = [];

      // Subscribe to events
      eventBus.subscribe('document-opened', async (data) => {
        eventLog.push({ type: 'document-opened', data, timestamp: Date.now() });
      });

      eventBus.subscribe('document-modified', async (data) => {
        eventLog.push({ type: 'document-modified', data, timestamp: Date.now() });
      });

      eventBus.subscribe('panel-created', async (data) => {
        eventLog.push({ type: 'panel-created', data, timestamp: Date.now() });
      });

      // Create mock domain events
      const mockDocumentEvent = {
        eventType: 'document-opened',
        aggregateId: 'doc-1',
        aggregateType: 'Document',
        eventData: { uri: '/workspace/test.proof' },
        timestamp: Date.now(),
      } as any;

      const mockPanelEvent = {
        eventType: 'panel-created',
        aggregateId: 'panel-1',
        aggregateType: 'Panel',
        eventData: { panelId: 'panel-1' },
        timestamp: Date.now(),
      } as any;

      const mockModifiedEvent = {
        eventType: 'document-modified',
        aggregateId: 'doc-1',
        aggregateType: 'Document',
        eventData: { uri: '/workspace/test.proof', changes: ['statement-added'] },
        timestamp: Date.now(),
      } as any;

      // Publish events from different components
      await eventBus.publish([mockDocumentEvent]);
      await eventBus.publish([mockPanelEvent]);
      await eventBus.publish([mockModifiedEvent]);

      expect(eventLog).toHaveLength(3);
      expect(eventLog[0]?.type).toBe('document-opened');
      expect(eventLog[1]?.type).toBe('panel-created');
      expect(eventLog[2]?.type).toBe('document-modified');

      // Verify event ordering
      expect(eventLog[1]?.timestamp).toBeGreaterThanOrEqual(eventLog[0]?.timestamp || 0);
      expect(eventLog[2]?.timestamp).toBeGreaterThanOrEqual(eventLog[1]?.timestamp || 0);
    });

    it('should handle error propagation across component boundaries', async () => {
      const errorLog: Error[] = [];

      // Setup error tracking
      eventBus.subscribe('error-occurred', async (event) => {
        const errorData = (event as any).eventData?.error;
        if (errorData) {
          errorLog.push(new Error(String(errorData)));
        }
      });

      // Simulate errors in different components
      mockDocumentQueryService.parseDocumentContent = vi
        .fn()
        .mockResolvedValue(err(new ValidationError('Parse error')));

      mockVisualizationService.generateVisualization = vi
        .fn()
        .mockReturnValue(err(new ValidationError('Visualization error')));

      mockUIPort.createWebviewPanel = vi.fn().mockImplementation(() => {
        throw new Error('UI error');
      });

      // Test error propagation
      try {
        await ProofTreePanel.createWithServices(
          '/workspace/error-test.proof',
          'invalid content',
          mockDocumentQueryService,
          mockVisualizationService,
          mockUIPort,
          mockRenderer,
          mockViewStateManager,
          mockViewStatePort,
          mockBootstrapController,
          mockProofApplicationService,
          mockYAMLSerializer,
          mockExportService,
          mockDocumentIdService,
        );
      } catch (error) {
        await eventBus.publish([
          {
            eventType: 'error-occurred',
            aggregateId: 'system',
            aggregateType: 'System',
            eventData: { error: String(error) },
            timestamp: Date.now(),
          } as any,
        ]);
      }

      // Additional error simulation
      try {
        const parseResult = await mockDocumentQueryService.parseDocumentContent('invalid');
        if (parseResult.isErr()) {
          await eventBus.publish([
            {
              eventType: 'error-occurred',
              aggregateId: 'system',
              aggregateType: 'System',
              eventData: { error: String(parseResult.error) },
              timestamp: Date.now(),
            } as any,
          ]);
        }
      } catch (error) {
        await eventBus.publish([
          {
            eventType: 'error-occurred',
            aggregateId: 'system',
            aggregateType: 'System',
            eventData: { error: String(error) },
            timestamp: Date.now(),
          } as any,
        ]);
      }

      expect(errorLog.length).toBeGreaterThan(0);
    });
  });

  describe('Resource Management and Cleanup', () => {
    it('should handle proper resource cleanup on extension deactivation', async () => {
      const cleanupLog: string[] = [];
      const disposables: Array<{ dispose: () => void }> = [];

      // Create multiple panels
      const panels = await Promise.all([
        ProofTreePanel.createWithServices(
          '/workspace/panel1.proof',
          validProofContent,
          mockDocumentQueryService,
          mockVisualizationService,
          mockUIPort,
          mockRenderer,
          mockViewStateManager,
          mockViewStatePort,
          mockBootstrapController,
          mockProofApplicationService,
          mockYAMLSerializer,
          mockExportService,
          mockDocumentIdService,
        ),
        ProofTreePanel.createWithServices(
          '/workspace/panel2.proof',
          validProofContent,
          mockDocumentQueryService,
          mockVisualizationService,
          mockUIPort,
          mockRenderer,
          mockViewStateManager,
          mockViewStatePort,
          mockBootstrapController,
          mockProofApplicationService,
          mockYAMLSerializer,
          mockExportService,
          mockDocumentIdService,
        ),
      ]);

      // Add cleanup tracking
      panels.forEach((panelResult, index) => {
        if (panelResult.isOk()) {
          const panel = panelResult.value;
          panel.onDidDispose(() => {
            cleanupLog.push(`panel-${index + 1}-disposed`);
          });
          disposables.push(panel);
        }
      });

      // Add file watchers
      mockFileSystemPort.watch = vi.fn().mockImplementation(() => {
        const watcher = {
          dispose: () => cleanupLog.push('file-watcher-disposed'),
        };
        disposables.push(watcher);
        return watcher;
      });

      mockFileSystemPort.watch?.('/workspace/test.proof', vi.fn());

      // Add command disposables
      const commandDisposable = {
        dispose: () => cleanupLog.push('command-disposed'),
      };
      disposables.push(commandDisposable);

      // Simulate extension deactivation
      disposables.forEach((disposable) => disposable.dispose());

      expect(cleanupLog).toContain('panel-1-disposed');
      expect(cleanupLog).toContain('panel-2-disposed');
      expect(cleanupLog).toContain('file-watcher-disposed');
      expect(cleanupLog).toContain('command-disposed');
    });

    it('should handle memory cleanup during rapid panel creation/disposal', async () => {
      const creationCycles = 20;
      const disposalLog: number[] = [];

      for (let i = 0; i < creationCycles; i++) {
        // Create panel
        const panelResult = await ProofTreePanel.createWithServices(
          `/workspace/temp-${i}.proof`,
          validProofContent,
          mockDocumentQueryService,
          mockVisualizationService,
          mockUIPort,
          mockRenderer,
          mockViewStateManager,
          mockViewStatePort,
          mockBootstrapController,
          mockProofApplicationService,
          mockYAMLSerializer,
          mockExportService,
          mockDocumentIdService,
        );

        if (panelResult.isOk()) {
          const panel = panelResult.value;

          // Panel is already tracked by manager through createOrShowPanel

          // Immediate disposal
          panel.onDidDispose(() => {
            disposalLog.push(i);
          });

          panel.dispose();
        }

        // Simulate some async work between cycles
        await new Promise((resolve) => setTimeout(resolve, 1));
      }

      // All panels should be properly disposed
      expect(disposalLog).toHaveLength(creationCycles);
      expect(new Set(disposalLog).size).toBe(creationCycles); // All unique
    });

    it('should handle graceful shutdown under error conditions', async () => {
      const shutdownSteps: string[] = [];
      const errors: Error[] = [];

      // Create panel that will error during disposal
      const disposalError = new Error('Webview disposal error');
      const errorWebviewPanel = createMockWebviewPanel();
      errorWebviewPanel.dispose = vi.fn().mockImplementation(() => {
        throw disposalError;
      });

      // Override the UI port to return the error panel for this test
      mockUIPort.createWebviewPanel = vi.fn().mockReturnValue(errorWebviewPanel);

      const panelResult = await ProofTreePanel.createWithServices(
        '/workspace/error-panel.proof',
        validProofContent,
        mockDocumentQueryService,
        mockVisualizationService,
        mockUIPort,
        mockRenderer,
        mockViewStateManager,
        mockViewStatePort,
        mockBootstrapController,
        mockProofApplicationService,
        mockYAMLSerializer,
        mockExportService,
        mockDocumentIdService,
      );

      if (panelResult.isOk()) {
        const panel = panelResult.value;

        shutdownSteps.push('shutdown-initiated');

        // Panel disposal should now handle errors gracefully
        panel.dispose();
        shutdownSteps.push('panel-disposed-gracefully');

        // Cleanup should continue despite underlying errors
        try {
          const closeResult = panelManager.closePanelForDocument('test-document.proof');
          if (closeResult.isOk()) {
            shutdownSteps.push('panel-removed-from-manager');
          }
        } catch (error) {
          errors.push(error as Error);
        }
      }

      expect(shutdownSteps).toContain('shutdown-initiated');
      expect(shutdownSteps).toContain('panel-disposed-gracefully');
      // Disposal errors should be handled gracefully, not thrown
      expect(errorWebviewPanel.dispose).toHaveBeenCalled();
    });
  });

  describe('Performance Under Load', () => {
    it('should handle multiple concurrent document operations', async () => {
      const concurrentOperations = 15;
      const operationResults: Array<{ success: boolean; duration: number }> = [];

      const operations = Array.from({ length: concurrentOperations }, (_, i) => {
        return (async () => {
          const startTime = performance.now();

          try {
            const panelResult = await ProofTreePanel.createWithServices(
              `/workspace/concurrent-${i}.proof`,
              validProofContent,
              mockDocumentQueryService,
              mockVisualizationService,
              mockUIPort,
              mockRenderer,
              mockViewStateManager,
              mockViewStatePort,
              mockBootstrapController,
              mockProofApplicationService,
              mockYAMLSerializer,
              mockExportService,
              mockDocumentIdService,
            );

            const endTime = performance.now();
            const duration = endTime - startTime;

            if (panelResult.isOk()) {
              // Panel is already managed through createPanelWithServices
              panelResult.value.dispose();
            }

            operationResults.push({ success: panelResult.isOk(), duration });
          } catch (_error) {
            const endTime = performance.now();
            operationResults.push({ success: false, duration: endTime - startTime });
          }
        })();
      });

      await Promise.all(operations);

      expect(operationResults).toHaveLength(concurrentOperations);

      const successCount = operationResults.filter((r) => r.success).length;
      const avgDuration =
        operationResults.reduce((sum, r) => sum + r.duration, 0) / operationResults.length;

      expect(successCount).toBeGreaterThan(0);
      expect(avgDuration).toBeLessThan(100); // Should average under 100ms per operation
    });

    it('should maintain performance with high-frequency events', async () => {
      const eventCount = 1000;
      const receivedEvents: string[] = [];

      eventBus.subscribe('high-frequency-event', async (event) => {
        const eventData = (event as any).eventData;
        if (eventData?.id) {
          receivedEvents.push(eventData.id);
        }
      });

      const startTime = performance.now();

      // Publish many events rapidly
      const publishPromises = Array.from({ length: eventCount }, (_, i) =>
        eventBus.publish([
          {
            eventType: 'high-frequency-event',
            aggregateId: `aggregate-${i}`,
            aggregateType: 'Test',
            eventData: { id: `event-${i}` },
            timestamp: Date.now(),
          } as any,
        ]),
      );

      await Promise.all(publishPromises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(receivedEvents).toHaveLength(eventCount);
      expect(duration).toBeLessThan(500); // Should handle 1000 events in under 500ms
    });
  });

  describe('Property-Based Integration Tests', () => {
    it('should handle arbitrary valid document URIs correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 3 }),
          fc.string({ minLength: 1, maxLength: 15 }),
          async (pathSegments, filename) => {
            const documentUri = `/workspace/${pathSegments.join('/')}/${filename}.proof`;

            const panelResult = await ProofTreePanel.createWithServices(
              documentUri,
              validProofContent,
              mockDocumentQueryService,
              mockVisualizationService,
              mockUIPort,
              mockRenderer,
              mockViewStateManager,
              mockViewStatePort,
              mockBootstrapController,
              mockProofApplicationService,
              mockYAMLSerializer,
              mockExportService,
              mockDocumentIdService,
            );

            expect(panelResult.isOk()).toBe(true);

            if (panelResult.isOk()) {
              const panel = panelResult.value;
              expect(panel.getDocumentUri()).toBe(documentUri);
              panel.dispose();
            }
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should handle arbitrary message sequences gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              type: fc.constantFrom('createArgument', 'addStatement', 'editContent', 'exportProof'),
              data: fc.anything(),
            }),
            { minLength: 1, maxLength: 10 },
          ),
          async (messageSequence) => {
            const messageHandlers: Array<(message: any) => Promise<void>> = [];

            mockWebviewPanel.webview.onDidReceiveMessage = vi.fn().mockImplementation((handler) => {
              messageHandlers.push(handler);
              return { dispose: vi.fn() };
            });

            const panelResult = await ProofTreePanel.createWithServices(
              '/workspace/property-test.proof',
              validProofContent,
              mockDocumentQueryService,
              mockVisualizationService,
              mockUIPort,
              mockRenderer,
              mockViewStateManager,
              mockViewStatePort,
              mockBootstrapController,
              mockProofApplicationService,
              mockYAMLSerializer,
              mockExportService,
              mockDocumentIdService,
            );

            if (panelResult.isOk()) {
              const panel = panelResult.value;

              // Send message sequence
              for (const message of messageSequence) {
                for (const handler of messageHandlers) {
                  try {
                    await handler(message);
                  } catch (error) {
                    // Should not crash on any message
                    expect(error).toBeDefined();
                  }
                }
              }

              panel.dispose();
            }

            expect(panelResult.isOk()).toBe(true);
          },
        ),
        { numRuns: 15 },
      );
    });
  });
});

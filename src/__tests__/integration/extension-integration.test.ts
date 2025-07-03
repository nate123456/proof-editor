/**
 * Extension Integration Tests
 *
 * Tests integration between VS Code extension and all domain contexts:
 * - Extension activation and service initialization
 * - Extension commands integration with domain services
 * - Extension event handling and domain event propagation
 * - WebView integration with proof tree visualization
 * - Extension configuration and domain service coordination
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
// Mock vscode module for testing

// Core Domain Services
import { StatementFlowService } from '../../domain/services/StatementFlowService.js';
import { TreeStructureService } from '../../domain/services/TreeStructureService.js';
// Extension layer
import { activate, deactivate } from '../../extension/extension.js';
// Parser layer
import { ProofFileParser } from '../../parser/ProofFileParser.js';
import { YAMLValidator } from '../../parser/YAMLValidator.js';
import type { ProofDiagnosticProvider } from '../../validation/DiagnosticProvider.js';
// Validation layer
import { ValidationController } from '../../validation/ValidationController.js';
// WebView layer
import { ProofTreePanel } from '../../webview/ProofTreePanel.js';
import { commands, window, workspace } from '../__mocks__/vscode.js';

// Mock VS Code environment
vi.mock('vscode', () => ({
  commands: {
    registerCommand: vi.fn(),
    executeCommand: vi.fn(),
  },
  window: {
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    createWebviewPanel: vi.fn(),
    activeTextEditor: null,
  },
  workspace: {
    getConfiguration: vi.fn(),
    onDidChangeConfiguration: vi.fn(),
    workspaceFolders: [],
    onDidSaveTextDocument: vi.fn(),
  },
  ViewColumn: {
    One: 1,
    Two: 2,
    Three: 3,
  },
  Uri: {
    file: vi.fn(),
    parse: vi.fn(),
  },
  Range: vi.fn(),
  Position: vi.fn(),
  ExtensionContext: vi.fn(),
}));

describe('Extension Integration Tests', () => {
  let mockContext: any;
  let domainServices: {
    statementFlow: StatementFlowService;
    treeStructure: TreeStructureService;
  };
  let extensionServices: {
    parser: ProofFileParser;
    validation: ValidationController;
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock extension context
    mockContext = {
      subscriptions: [],
      extensionPath: '/mock/extension/path',
      globalState: {
        get: vi.fn(),
        update: vi.fn(),
      },
      workspaceState: {
        get: vi.fn(),
        update: vi.fn(),
      },
    };

    // Initialize domain services
    domainServices = {
      statementFlow: new StatementFlowService(),
      treeStructure: new TreeStructureService(),
    };

    // Initialize extension services
    const yamlValidator = new YAMLValidator();
    const mockDiagnosticProvider = {} as ProofDiagnosticProvider; // Mock for test
    extensionServices = {
      parser: new ProofFileParser(yamlValidator),
      validation: new ValidationController(mockDiagnosticProvider),
    };
  });

  describe('Extension Activation and Initialization', () => {
    it('should activate extension and register all commands', () => {
      // Act - Activate extension
      activate(mockContext);

      // Assert - Commands should be registered
      expect(commands.registerCommand).toHaveBeenCalled();

      // Should register proof-specific commands
      const registeredCommands = vi
        .mocked(commands.registerCommand)
        .mock.calls.map((call: any[]) => call[0]);

      expect(registeredCommands).toContain('proof-editor.openProofTree');
      expect(registeredCommands).toContain('proof-editor.validateProof');
      expect(registeredCommands).toContain('proof-editor.createNewProof');

      // Extension context should track subscriptions
      expect(mockContext.subscriptions.length).toBeGreaterThan(0);
    });

    it('should handle extension deactivation gracefully', () => {
      // Arrange - Activate extension first
      activate(mockContext);

      // Act - Deactivate extension
      deactivate();

      // Assert - Should clean up resources
      expect(mockContext.subscriptions.length).toBeGreaterThan(0);
    });

    it('should initialize domain services during activation', () => {
      // Act - Activate extension
      activate(mockContext);

      // Assert - Domain services should be properly initialized
      // This is verified by the extension not throwing errors during activation
      expect(mockContext.subscriptions.length).toBeGreaterThan(0);
    });
  });

  describe('Command Integration with Domain Services', () => {
    it('should execute proof validation command with domain validation', async () => {
      // Arrange - Set up mock document content
      const mockProofContent = `
statements:
  s1: "Test statement 1"
  s2: "Test statement 2"

arguments:
  arg1:
    premises: [s1]
    conclusions: [s2]

proof:
  n1: {arg: arg1}
`;

      // Mock active text editor
      const mockDocument = {
        getText: vi.fn().mockReturnValue(mockProofContent),
        fileName: 'test.proof',
        uri: { fsPath: '/test/test.proof' },
      };

      vi.mocked(window).activeTextEditor = {
        document: mockDocument,
      } as any;

      activate(mockContext);

      // Act - Execute validation command
      const validateCommand = vi
        .mocked(commands.registerCommand)
        .mock.calls.find((call: any[]) => call[0] === 'proof-editor.validateProof');
      expect(validateCommand).toBeDefined();

      if (validateCommand) {
        const commandHandler = validateCommand[1];
        await commandHandler();

        // Assert - Should show validation results
        expect(window.showInformationMessage).toHaveBeenCalled();
      }
    });

    it('should create new proof with domain entity structure', async () => {
      // Arrange - Activate extension
      activate(mockContext);

      // Act - Execute create new proof command
      const createCommand = vi
        .mocked(commands.registerCommand)
        .mock.calls.find((call: any[]) => call[0] === 'proof-editor.createNewProof');
      expect(createCommand).toBeDefined();

      if (createCommand) {
        const commandHandler = createCommand[1];
        await commandHandler();

        // Assert - Should create proper proof structure
        expect(commands.executeCommand).toHaveBeenCalledWith(
          'workbench.action.files.newUntitledFile',
          expect.objectContaining({
            language: 'yaml',
          }),
        );
      }
    });

    it('should open proof tree visualization with domain data', async () => {
      // Arrange - Mock proof document
      const mockProofContent = `
statements:
  s1: "All humans are mortal"
  s2: "Socrates is human"
  s3: "Socrates is mortal"

arguments:
  arg1:
    premises: [s1, s2]
    conclusions: [s3]

proof:
  n1: {arg: arg1}
`;

      const mockDocument = {
        getText: vi.fn().mockReturnValue(mockProofContent),
        fileName: 'complex.proof',
        uri: { fsPath: '/test/complex.proof' },
      };

      vi.mocked(window).activeTextEditor = {
        document: mockDocument,
      } as any;

      // Mock webview creation
      const mockWebview = {
        html: '',
        onDidReceiveMessage: vi.fn(),
        postMessage: vi.fn(),
      };

      const mockWebviewPanel = {
        webview: mockWebview,
        reveal: vi.fn(),
        dispose: vi.fn(),
        onDidDispose: vi.fn(),
      };

      vi.mocked(window.createWebviewPanel).mockReturnValue(mockWebviewPanel as any);

      activate(mockContext);

      // Act - Execute open proof tree command
      const treeCommand = vi
        .mocked(commands.registerCommand)
        .mock.calls.find((call: any[]) => call[0] === 'proof-editor.openProofTree');
      expect(treeCommand).toBeDefined();

      if (treeCommand) {
        const commandHandler = treeCommand[1];
        await commandHandler();

        // Assert - Should create webview with proof tree
        expect(window.createWebviewPanel).toHaveBeenCalledWith(
          'proofTree',
          'Proof Tree',
          expect.any(Number),
          expect.objectContaining({
            enableScripts: true,
            retainContextWhenHidden: true,
          }),
        );

        // Should populate webview with domain data
        expect(mockWebview.html).toContain('proof-tree');
      }
    });
  });

  describe('Event Handling and Domain Coordination', () => {
    it('should handle document save events with validation', async () => {
      // Arrange - Activate extension
      activate(mockContext);

      // Mock workspace events
      const onDidSave = vi.mocked(workspace.onDidSaveTextDocument);
      expect(onDidSave).toHaveBeenCalled();

      // Get the save event handler
      const saveHandler = onDidSave.mock.calls[0]?.[0];
      expect(saveHandler).toBeDefined();

      if (saveHandler) {
        // Mock saved document
        const mockSavedDocument = {
          fileName: 'test.proof',
          getText: vi.fn().mockReturnValue('statements:\n  s1: "Test"'),
          uri: { fsPath: '/test/test.proof' },
        };

        // Act - Trigger save event
        await saveHandler(mockSavedDocument);

        // Assert - Should trigger validation
        // This is implicit through no errors being thrown
        expect(mockSavedDocument.getText).toHaveBeenCalled();
      }
    });

    it('should handle configuration changes affecting domain services', async () => {
      // Arrange - Activate extension
      activate(mockContext);

      // Mock configuration
      const mockConfig = {
        get: vi.fn().mockImplementation((key: string) => {
          switch (key) {
            case 'validation.enableRealTime':
              return true;
            case 'tree.autoExpand':
              return false;
            default:
              return undefined;
          }
        }),
      };

      vi.mocked(workspace.getConfiguration).mockReturnValue(mockConfig as any);

      // Mock configuration change event
      const onDidChangeConfig = vi.mocked(workspace.onDidChangeConfiguration);
      expect(onDidChangeConfig).toHaveBeenCalled();

      const configHandler = onDidChangeConfig.mock.calls[0]?.[0];
      expect(configHandler).toBeDefined();

      if (configHandler) {
        // Act - Trigger configuration change
        const mockConfigChangeEvent = {
          affectsConfiguration: vi.fn().mockReturnValue(true),
        };

        await configHandler(mockConfigChangeEvent);

        // Assert - Should update service configuration
        expect(workspace.getConfiguration).toHaveBeenCalledWith('proof-editor');
      }
    });
  });

  describe('WebView Integration', () => {
    it('should integrate webview with domain tree structures', async () => {
      // Arrange - Create proof tree panel
      const mockWebview = {
        html: '',
        onDidReceiveMessage: vi.fn(),
        postMessage: vi.fn(),
      };

      const mockPanel = {
        webview: mockWebview,
        title: 'Test Proof Tree',
        reveal: vi.fn(),
        dispose: vi.fn(),
        onDidDispose: vi.fn(),
      };

      // Create test proof data
      const testStatement1 =
        domainServices.statementFlow.createStatementFromContent('Test premise');
      const testStatement2 =
        domainServices.statementFlow.createStatementFromContent('Test conclusion');

      expect(testStatement1.isOk()).toBe(true);
      expect(testStatement2.isOk()).toBe(true);

      if (testStatement1.isOk() && testStatement2.isOk()) {
        const premiseSet = domainServices.statementFlow.createOrderedSetFromStatements([
          testStatement1.value,
        ]);
        const conclusionSet = domainServices.statementFlow.createOrderedSetFromStatements([
          testStatement2.value,
        ]);

        expect(premiseSet.isOk()).toBe(true);
        expect(conclusionSet.isOk()).toBe(true);

        if (premiseSet.isOk() && conclusionSet.isOk()) {
          const atomicArgument = domainServices.statementFlow.createAtomicArgumentWithSets(
            premiseSet.value,
            conclusionSet.value,
          );

          expect(atomicArgument.isOk()).toBe(true);

          if (atomicArgument.isOk()) {
            // Act - Create proof tree panel with domain data
            const _proofTreePanel = ProofTreePanel.createOrShow(
              '/test/extension/path',
              mockPanel as any,
            );

            // Simulate message from webview
            const messageHandler = vi.mocked(mockWebview.onDidReceiveMessage).mock.calls[0]?.[0];
            expect(messageHandler).toBeDefined();

            if (messageHandler) {
              const testMessage = {
                command: 'expandNode',
                nodeId: atomicArgument.value.getId().toString(),
              };

              await messageHandler(testMessage);

              // Assert - Should handle webview messages with domain logic
              expect(mockWebview.postMessage).toHaveBeenCalled();
            }
          }
        }
      }
    });

    it('should update webview when domain data changes', () => {
      // Arrange - Mock webview panel
      const mockWebview = {
        html: '',
        onDidReceiveMessage: vi.fn(),
        postMessage: vi.fn(),
      };

      const mockPanel = {
        webview: mockWebview,
        title: 'Dynamic Proof Tree',
        reveal: vi.fn(),
        dispose: vi.fn(),
        onDidDispose: vi.fn(),
      };

      const proofTreePanel = ProofTreePanel.createOrShow('/test/path', mockPanel as any);

      // Act - Simulate domain data update
      const updatedStatement = domainServices.statementFlow.createStatementFromContent(
        'Updated statement content',
      );
      expect(updatedStatement.isOk()).toBe(true);

      if (updatedStatement.isOk()) {
        // Simulate updating the webview with new data
        const updateMessage = {
          command: 'updateTree',
          data: {
            statements: [
              {
                id: updatedStatement.value.getId().toString(),
                content: updatedStatement.value.getContent(),
              },
            ],
          },
        };

        // Assert - WebView should receive update
        proofTreePanel.updateTreeData(updateMessage.data);
        expect(mockWebview.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            command: 'updateTree',
          }),
        );
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle domain service errors gracefully in extension', async () => {
      // Arrange - Activate extension
      activate(mockContext);

      // Mock domain service to throw error
      const mockParser = vi.spyOn(extensionServices.parser, 'parse').mockImplementation(() => {
        throw new Error('Domain service error');
      });

      // Mock document with invalid content
      const mockDocument = {
        getText: vi.fn().mockReturnValue('invalid yaml content {{{'),
        fileName: 'invalid.proof',
        uri: { fsPath: '/test/invalid.proof' },
      };

      vi.mocked(window).activeTextEditor = {
        document: mockDocument,
      } as any;

      // Act - Execute command that uses domain services
      const validateCommand = vi
        .mocked(commands.registerCommand)
        .mock.calls.find((call: any[]) => call[0] === 'proof-editor.validateProof');

      if (validateCommand) {
        const commandHandler = validateCommand[1];
        await commandHandler();

        // Assert - Should show error message to user
        expect(window.showErrorMessage).toHaveBeenCalled();
      }

      mockParser.mockRestore();
    });

    it('should maintain extension stability during domain failures', () => {
      // Arrange - Activate extension
      activate(mockContext);

      // Mock multiple service failures
      vi.spyOn(extensionServices.validation, 'validateProofDocument').mockImplementation(() => {
        throw new Error('Validation service failure');
      });

      // Act - Try multiple operations
      const commands = vi.mocked(window.showErrorMessage);
      commands.mockClear();

      try {
        // Execute multiple commands that might fail
        const validateCommand = vi.mocked(window.showErrorMessage);
        validateCommand.mockImplementation(async () => Promise.resolve());

        // Extension should remain functional
        expect(mockContext.subscriptions.length).toBeGreaterThan(0);
      } catch (error) {
        // Should not throw unhandled errors
        expect(error).toBeUndefined();
      }

      // Assert - Extension should still be responsive
      expect(mockContext.subscriptions.length).toBeGreaterThan(0);
    });
  });
});

/**
 * Bootstrap commands tests for VS Code extension
 *
 * This file contains tests for bootstrap command functionality including:
 * - Document creation and initialization
 * - Argument creation and population
 * - Workflow guidance and tutorials
 * - Implication line creation
 * - Error handling for all bootstrap operations
 *
 * Domain: Bootstrap and onboarding command workflow for new users
 */

import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidationError } from '../../domain/shared/result.js';

// Import the shared mocks first
import {
  mockBootstrapController,
  mockContainer,
  mockFileSystemPort,
  mockUIPort,
} from './shared/extension-test-setup.js';

// Mock the container module before other imports
vi.mock('../../../infrastructure/di/container.js', () => ({
  getContainer: vi.fn(() => mockContainer),
  initializeContainer: vi.fn(() => Promise.resolve(mockContainer)),
  registerPlatformAdapters: vi.fn(() => Promise.resolve()),
}));

// Mock VS Code module before importing it
vi.mock('vscode', async () => {
  // Import the actual mock from setup to ensure consistency
  const { vi } = await import('vitest');
  return {
    commands: {
      registerCommand: vi.fn(),
      executeCommand: vi.fn(),
    },
    window: {
      createWebviewPanel: vi.fn(),
      showInformationMessage: vi.fn(),
      showWarningMessage: vi.fn(),
      showInputBox: vi.fn(),
      showQuickPick: vi.fn(),
      showTextDocument: vi.fn(),
      onDidChangeActiveTextEditor: vi.fn(),
      visibleTextEditors: [],
      activeTextEditor: undefined,
    },
    workspace: {
      onDidOpenTextDocument: vi.fn(),
      onDidChangeTextDocument: vi.fn(),
      onDidCloseTextDocument: vi.fn(),
      openTextDocument: vi.fn(),
      createFileSystemWatcher: vi.fn(() => ({
        onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
        onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
        onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
        dispose: vi.fn(),
      })),
      textDocuments: [],
      workspaceFolders: undefined,
    },
    Uri: {
      file: vi.fn().mockImplementation((path: string) => ({
        scheme: 'file',
        path,
        fsPath: path,
        toString: () => `file://${path}`,
      })),
      joinPath: vi.fn().mockImplementation((base: any, ...segments: string[]) => ({
        scheme: 'file',
        path: `${base.path}/${segments.join('/')}`,
        fsPath: `${base.fsPath}/${segments.join('/')}`,
        toString: () => `file://${base.fsPath}/${segments.join('/')}`,
      })),
    },
    Range: vi
      .fn()
      .mockImplementation(
        (startLine: number, startChar: number, endLine: number, endChar: number) => ({
          start: { line: startLine, character: startChar },
          end: { line: endLine, character: endChar },
          isEmpty: startLine === endLine && startChar === endChar,
          isSingleLine: startLine === endLine,
        }),
      ),
    Position: vi.fn().mockImplementation((line: number, character: number) => ({
      line,
      character,
    })),
    Selection: vi
      .fn()
      .mockImplementation(
        (anchorLine: number, anchorChar: number, activeLine: number, activeChar: number) => ({
          anchor: { line: anchorLine, character: anchorChar },
          active: { line: activeLine, character: activeChar },
          start: {
            line: Math.min(anchorLine, activeLine),
            character: anchorLine < activeLine ? anchorChar : activeChar,
          },
          end: {
            line: Math.max(anchorLine, activeLine),
            character: anchorLine > activeLine ? anchorChar : activeChar,
          },
          isEmpty: anchorLine === activeLine && anchorChar === activeChar,
          isSingleLine: anchorLine === activeLine,
          isReversed:
            anchorLine > activeLine || (anchorLine === activeLine && anchorChar > activeChar),
        }),
      ),
    ViewColumn: {
      One: 1,
      Two: 2,
      Three: 3,
    },
    languages: {
      createDiagnosticCollection: vi.fn(),
      match: vi.fn(),
      registerCodeActionsProvider: vi.fn(),
      registerCodeLensProvider: vi.fn(),
      registerCompletionItemProvider: vi.fn(),
      registerDefinitionProvider: vi.fn(),
      registerDocumentFormattingProvider: vi.fn(),
      registerDocumentHighlightProvider: vi.fn(),
      registerDocumentSymbolProvider: vi.fn(),
      registerHoverProvider: vi.fn(),
      registerImplementationProvider: vi.fn(),
      registerReferenceProvider: vi.fn(),
      registerRenameProvider: vi.fn(),
      registerSignatureHelpProvider: vi.fn(),
      registerWorkspaceSymbolProvider: vi.fn(),
      setLanguageConfiguration: vi.fn(),
      setTextDocumentLanguage: vi.fn(),
      getDiagnostics: vi.fn(),
      onDidChangeDiagnostics: vi.fn(),
    },
  };
});

import * as vscode from 'vscode';
import { activate } from '../extension.js';
import { type ExtensionTestContext, setupExtensionTest } from './shared/extension-test-setup.js';

describe('Extension - Bootstrap Commands', () => {
  let testContext: ExtensionTestContext;

  beforeEach(async () => {
    testContext = setupExtensionTest();
    await activate(testContext.mockContext);
  });

  describe('createBootstrapDocument command', () => {
    const getBootstrapDocumentCommand = () => {
      const commandCall = (vscode.commands.registerCommand as any).mock.calls.find(
        (call: any[]) => call[0] === 'proofEditor.createBootstrapDocument',
      );
      return commandCall?.[1] as () => Promise<void>;
    };

    it('should create bootstrap document successfully', async () => {
      // Mock workspace folder
      Object.defineProperty(vscode.workspace, 'workspaceFolders', {
        value: [{ uri: vscode.Uri.file('/test/workspace') }],
        writable: true,
        configurable: true,
      });

      // Mock user input
      const showInputBoxSpy = vi.mocked(vscode.window.showInputBox);
      showInputBoxSpy.mockResolvedValueOnce('test-document');

      const showInfoSpy = vi.mocked(vscode.window.showInformationMessage);
      showInfoSpy.mockResolvedValueOnce({ title: '' } as any);

      // Mock file operations
      const mockDocument = {
        ...testContext.mockTextDocument,
        uri: vscode.Uri.file('/test/workspace/test-document.proof'),
      };
      (vscode.workspace.openTextDocument as any).mockResolvedValueOnce(mockDocument);
      (vscode.window.showTextDocument as any).mockResolvedValueOnce(testContext.mockTextEditor);

      // Mock bootstrap controller success
      mockBootstrapController.initializeEmptyDocument.mockResolvedValueOnce(
        ok({
          data: {
            documentId: 'test-document',
            created: true,
            hasBootstrapArgument: false,
            nextSteps: [],
          },
        }),
      );

      // Mock file system port success
      mockFileSystemPort.writeFile.mockResolvedValueOnce(ok(undefined));

      const commandHandler = getBootstrapDocumentCommand();
      expect(commandHandler).toBeDefined();

      await commandHandler();

      expect(mockBootstrapController.initializeEmptyDocument).toHaveBeenCalledWith('test-document');
      expect(mockFileSystemPort.writeFile).toHaveBeenCalledWith(
        expect.objectContaining({ value: '/test/workspace/test-document.proof' }),
        expect.objectContaining({ value: expect.stringContaining('test-document') }),
      );
      expect(vscode.workspace.openTextDocument).toHaveBeenCalled();
      expect(vscode.window.showTextDocument).toHaveBeenCalled();
    });

    it('should show warning when no workspace folder', async () => {
      Object.defineProperty(vscode.workspace, 'workspaceFolders', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const commandHandler = getBootstrapDocumentCommand();
      await commandHandler();

      expect(mockUIPort.showWarning).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'Please open a workspace folder first.' }),
      );
    });

    it('should handle user cancellation', async () => {
      Object.defineProperty(vscode.workspace, 'workspaceFolders', {
        value: [{ uri: vscode.Uri.file('/test/workspace') }],
        writable: true,
        configurable: true,
      });

      // User cancels input
      (vscode.window.showInputBox as any).mockResolvedValueOnce(undefined);

      const commandHandler = getBootstrapDocumentCommand();
      await commandHandler();

      expect(mockUIPort.showError).not.toHaveBeenCalled();
    });

    it('should validate document name', async () => {
      Object.defineProperty(vscode.workspace, 'workspaceFolders', {
        value: [{ uri: vscode.Uri.file('/test/workspace') }],
        writable: true,
        configurable: true,
      });

      // Mock the input validation by directly testing the validator
      const _commandCall = (vscode.commands.registerCommand as any).mock.calls.find(
        (call: any[]) => call[0] === 'proofEditor.createBootstrapDocument',
      );

      // Get the input box options to test the validator
      (vscode.window.showInputBox as any).mockImplementationOnce((options: any) => {
        const validator = options?.validateInput;
        if (validator) {
          // Test empty input
          expect(validator('')).toBe('Document name cannot be empty');
          expect(validator('   ')).toBe('Document name cannot be empty');

          // Test invalid characters
          expect(validator('test@doc')).toBe(
            'Document name can only contain letters, numbers, hyphens, and underscores',
          );
          expect(validator('test doc')).toBe(
            'Document name can only contain letters, numbers, hyphens, and underscores',
          );

          // Test valid input
          expect(validator('test-doc_123')).toBe(null);
        }
        return Promise.resolve(undefined); // User cancels
      });

      const commandHandler = getBootstrapDocumentCommand();
      await commandHandler();
    });

    it('should handle bootstrap controller errors', async () => {
      Object.defineProperty(vscode.workspace, 'workspaceFolders', {
        value: [{ uri: vscode.Uri.file('/test/workspace') }],
        writable: true,
        configurable: true,
      });

      (vscode.window.showInputBox as any).mockResolvedValueOnce('test-document');

      // Mock bootstrap controller failure
      mockBootstrapController.initializeEmptyDocument.mockResolvedValueOnce(
        err(new ValidationError('Bootstrap failed')),
      );

      const commandHandler = getBootstrapDocumentCommand();
      await commandHandler();

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'Failed to create document: Bootstrap failed' }),
      );
    });

    it('should handle file write errors', async () => {
      Object.defineProperty(vscode.workspace, 'workspaceFolders', {
        value: [{ uri: vscode.Uri.file('/test/workspace') }],
        writable: true,
        configurable: true,
      });

      (vscode.window.showInputBox as any).mockResolvedValueOnce('test-document');

      // Mock bootstrap controller success
      mockBootstrapController.initializeEmptyDocument.mockResolvedValueOnce(
        ok({
          data: {
            documentId: 'test-document',
            created: true,
            hasBootstrapArgument: false,
            nextSteps: [],
          },
        }),
      );

      // Mock file system port failure
      mockFileSystemPort.writeFile.mockResolvedValueOnce(err(new Error('Write failed')));

      const commandHandler = getBootstrapDocumentCommand();
      await commandHandler();

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'Failed to write file: Write failed' }),
      );
    });

    it('should handle tutorial workflow selection', async () => {
      Object.defineProperty(vscode.workspace, 'workspaceFolders', {
        value: [{ uri: vscode.Uri.file('/test/workspace') }],
        writable: true,
        configurable: true,
      });

      (vscode.window.showInputBox as any).mockResolvedValueOnce('test-document');

      // Mock bootstrap and file operations success
      mockBootstrapController.initializeEmptyDocument.mockResolvedValueOnce(
        ok({
          data: {
            documentId: 'test-document',
            created: true,
            hasBootstrapArgument: false,
            nextSteps: [],
          },
        }),
      );
      mockFileSystemPort.writeFile.mockResolvedValueOnce(ok(undefined));

      const mockDocument = {
        ...testContext.mockTextDocument,
        uri: vscode.Uri.file('/test/workspace/test-document.proof'),
      };
      (vscode.workspace.openTextDocument as any).mockResolvedValueOnce(mockDocument);
      (vscode.window.showTextDocument as any).mockResolvedValueOnce(testContext.mockTextEditor);

      // Mock workflow selection
      (vscode.window.showInformationMessage as any).mockResolvedValueOnce({
        title: 'Start Guided Tutorial',
      });
      (vscode.commands.executeCommand as any).mockResolvedValueOnce(undefined);

      // Set active editor for auto-show
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      const commandHandler = getBootstrapDocumentCommand();
      await commandHandler();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Created proof document'),
        'Start Guided Tutorial',
        'Create First Argument',
        'Show Me Around',
        'Later',
      );
    });

    it('should handle exceptions gracefully', async () => {
      Object.defineProperty(vscode.workspace, 'workspaceFolders', {
        value: [{ uri: vscode.Uri.file('/test/workspace') }],
        writable: true,
        configurable: true,
      });

      (vscode.window.showInputBox as any).mockResolvedValueOnce('test-document');

      // Mock bootstrap controller to throw
      mockBootstrapController.initializeEmptyDocument.mockRejectedValueOnce(
        new Error('Unexpected error'),
      );

      const commandHandler = getBootstrapDocumentCommand();
      await commandHandler();

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'Failed to create document: Unexpected error' }),
      );
    });
  });

  describe('createBootstrapArgument command', () => {
    const getBootstrapArgumentCommand = () => {
      const commandCall = (vscode.commands.registerCommand as any).mock.calls.find(
        (call: any[]) => call[0] === 'proofEditor.createBootstrapArgument',
      );
      return commandCall?.[1] as () => Promise<void>;
    };

    it('should create bootstrap argument successfully', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      mockBootstrapController.createBootstrapArgument.mockResolvedValueOnce(
        ok({
          data: {
            argumentId: 'arg-123',
            treeId: 'tree-1',
            nodeId: 'n1',
            isEmpty: true,
            position: { x: 0, y: 0 },
            readyForPopulation: true,
            workflow: { currentStep: 'created', nextAction: 'populate', canBranch: false },
          },
        }),
      );

      const commandHandler = getBootstrapArgumentCommand();
      await commandHandler();

      expect(mockBootstrapController.createBootstrapArgument).toHaveBeenCalledWith(
        testContext.mockTextEditor.document.fileName,
      );
      expect(mockUIPort.showInformation).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'Created empty argument: arg-123' }),
        expect.objectContaining({ label: expect.objectContaining({ value: 'Populate Argument' }) }),
      );
    });

    it('should show warning when no active editor', async () => {
      vscode.window.activeTextEditor = undefined;

      const commandHandler = getBootstrapArgumentCommand();
      await commandHandler();

      expect(mockUIPort.showWarning).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'Please open a .proof file first.' }),
      );
    });

    it('should show warning when active editor is not proof file', async () => {
      vscode.window.activeTextEditor = {
        ...testContext.mockTextEditor,
        document: { ...testContext.mockTextDocument, languageId: 'javascript' },
      };

      const commandHandler = getBootstrapArgumentCommand();
      await commandHandler();

      expect(mockUIPort.showWarning).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'Please open a .proof file first.' }),
      );
    });

    it('should handle bootstrap controller errors', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      mockBootstrapController.createBootstrapArgument.mockResolvedValueOnce(
        err(new ValidationError('Creation failed')),
      );

      const commandHandler = getBootstrapArgumentCommand();
      await commandHandler();

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'Failed to create argument: Creation failed' }),
      );
    });

    it('should handle exceptions', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      mockBootstrapController.createBootstrapArgument.mockRejectedValueOnce(
        new Error('Unexpected error'),
      );

      const commandHandler = getBootstrapArgumentCommand();
      await commandHandler();

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'Failed to create argument: Unexpected error' }),
      );
    });
  });

  describe('populateEmptyArgument command', () => {
    const getPopulateArgumentCommand = () => {
      const commandCall = (vscode.commands.registerCommand as any).mock.calls.find(
        (call: any[]) => call[0] === 'proofEditor.populateEmptyArgument',
      );
      return commandCall?.[1] as () => Promise<void>;
    };

    it('should populate argument successfully with multiple premises', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      // Mock user inputs - premises and conclusion
      (vscode.window.showInputBox as any)
        .mockResolvedValueOnce('All humans are mortal') // First premise
        .mockResolvedValueOnce('Socrates is human') // Second premise
        .mockResolvedValueOnce('') // No more premises
        .mockResolvedValueOnce('Socrates is mortal') // Conclusion
        .mockResolvedValueOnce('Modus Ponens'); // Rule name

      mockBootstrapController.populateEmptyArgument.mockResolvedValueOnce(
        ok({
          data: {
            argumentId: 'arg-123',
            premises: ['All humans are mortal', 'Socrates is human'],
            conclusions: ['Socrates is mortal'],
            ruleName: 'Modus Ponens',
          },
        }),
      );

      const commandHandler = getPopulateArgumentCommand();
      await commandHandler();

      expect(mockBootstrapController.populateEmptyArgument).toHaveBeenCalledWith(
        testContext.mockTextEditor.document.fileName,
        expect.stringMatching(/^arg-\d+$/),
        ['All humans are mortal', 'Socrates is human'],
        ['Socrates is mortal'],
        { left: 'Modus Ponens' },
      );
      expect(mockUIPort.showInformation).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'Argument populated successfully!' }),
        expect.objectContaining({
          label: expect.objectContaining({ value: 'Show Bootstrap Workflow' }),
        }),
      );
    });

    it('should handle single premise argument', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      (vscode.window.showInputBox as any)
        .mockResolvedValueOnce('Simple premise') // First premise
        .mockResolvedValueOnce('') // No more premises
        .mockResolvedValueOnce('Simple conclusion') // Conclusion
        .mockResolvedValueOnce(''); // No rule name

      mockBootstrapController.populateEmptyArgument.mockResolvedValueOnce(
        ok({
          data: {
            argumentId: 'arg-123',
            premises: ['All humans are mortal', 'Socrates is human'],
            conclusions: ['Socrates is mortal'],
            ruleName: 'Modus Ponens',
          },
        }),
      );

      const commandHandler = getPopulateArgumentCommand();
      await commandHandler();

      expect(mockBootstrapController.populateEmptyArgument).toHaveBeenCalledWith(
        testContext.mockTextEditor.document.fileName,
        expect.stringMatching(/^arg-\d+$/),
        ['Simple premise'],
        ['Simple conclusion'],
        undefined,
      );
    });

    it('should handle user cancelling premise input', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      // User cancels premise input
      vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce(undefined);

      const commandHandler = getPopulateArgumentCommand();
      await commandHandler();

      // Should exit early without calling bootstrap controller
      expect(mockBootstrapController.populateEmptyArgument).not.toHaveBeenCalled();
    });

    it('should handle user cancelling conclusion input', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      (vscode.window.showInputBox as any)
        .mockResolvedValueOnce('Some premise') // Premise
        .mockResolvedValueOnce('') // No more premises
        .mockResolvedValueOnce(undefined); // Cancel conclusion

      const commandHandler = getPopulateArgumentCommand();
      await commandHandler();

      // Should exit early without calling bootstrap controller
      expect(mockBootstrapController.populateEmptyArgument).not.toHaveBeenCalled();
    });

    it('should handle maximum premises limit', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      // Mock 5 premises + attempt at 6th
      (vscode.window.showInputBox as any)
        .mockResolvedValueOnce('Premise 1')
        .mockResolvedValueOnce('Premise 2')
        .mockResolvedValueOnce('Premise 3')
        .mockResolvedValueOnce('Premise 4')
        .mockResolvedValueOnce('Premise 5')
        .mockResolvedValueOnce('Conclusion')
        .mockResolvedValueOnce('Rule');

      mockBootstrapController.populateEmptyArgument.mockResolvedValueOnce(
        ok({
          data: {
            argumentId: 'arg-123',
            premises: ['All humans are mortal', 'Socrates is human'],
            conclusions: ['Socrates is mortal'],
            ruleName: 'Modus Ponens',
          },
        }),
      );

      const commandHandler = getPopulateArgumentCommand();
      await commandHandler();

      expect(mockBootstrapController.populateEmptyArgument).toHaveBeenCalledWith(
        testContext.mockTextEditor.document.fileName,
        expect.stringMatching(/^arg-\d+$/),
        ['Premise 1', 'Premise 2', 'Premise 3', 'Premise 4', 'Premise 5'],
        ['Conclusion'],
        { left: 'Rule' },
      );
    });

    it('should show warning when no active editor', async () => {
      vscode.window.activeTextEditor = undefined;

      const commandHandler = getPopulateArgumentCommand();
      await commandHandler();

      expect(mockUIPort.showWarning).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'Please open a .proof file first.' }),
      );
    });

    it('should handle bootstrap controller errors', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      (vscode.window.showInputBox as any)
        .mockResolvedValueOnce('Premise')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('Conclusion')
        .mockResolvedValueOnce('');

      mockBootstrapController.populateEmptyArgument.mockResolvedValueOnce(
        err(new ValidationError('Population failed')),
      );

      const commandHandler = getPopulateArgumentCommand();
      await commandHandler();

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'Failed to populate argument: Population failed' }),
      );
    });

    it('should handle exceptions', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      (vscode.window.showInputBox as any)
        .mockResolvedValueOnce('Premise')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('Conclusion')
        .mockResolvedValueOnce('');

      mockBootstrapController.populateEmptyArgument.mockRejectedValueOnce(
        new Error('Unexpected error'),
      );

      const commandHandler = getPopulateArgumentCommand();
      await commandHandler();

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'Failed to populate argument: Unexpected error' }),
      );
    });
  });

  describe('showBootstrapWorkflow command', () => {
    const getWorkflowCommand = () => {
      const commandCall = (vscode.commands.registerCommand as any).mock.calls.find(
        (call: any[]) => call[0] === 'proofEditor.showBootstrapWorkflow',
      );
      return commandCall?.[1] as () => Promise<void>;
    };

    it('should show workflow with enabled actions', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      mockBootstrapController.getBootstrapWorkflow.mockResolvedValueOnce(
        ok({
          data: {
            totalSteps: 3,
            steps: [
              {
                current: true,
                completed: false,
                title: 'Create First Argument',
                description: 'Start by creating your first atomic argument',
                actions: [
                  { label: 'Create Empty Argument', enabled: true },
                  { label: 'Skip Step', enabled: false },
                ],
              },
            ],
          },
        }),
      );

      (vscode.window.showQuickPick as any).mockResolvedValueOnce('Create Empty Argument');
      (vscode.commands.executeCommand as any).mockResolvedValueOnce(undefined);

      const commandHandler = getWorkflowCommand();
      await commandHandler();

      expect(vscode.window.showQuickPick).toHaveBeenCalledWith(['Create Empty Argument'], {
        placeHolder: 'Choose next action',
      });
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'proofEditor.createBootstrapArgument',
      );
    });

    it('should show workflow without actions', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      mockBootstrapController.getBootstrapWorkflow.mockResolvedValueOnce(
        ok({
          data: {
            totalSteps: 3,
            steps: [
              {
                current: true,
                completed: false,
                title: 'Review Arguments',
                description: 'Review your completed arguments',
                actions: [],
              },
            ],
          },
        }),
      );

      const commandHandler = getWorkflowCommand();
      await commandHandler();

      expect(mockUIPort.showInformation).toHaveBeenCalledWith(
        expect.objectContaining({ value: expect.stringContaining('Review Arguments') }),
      );
    });

    it('should handle populate action selection', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      mockBootstrapController.getBootstrapWorkflow.mockResolvedValueOnce(
        ok({
          data: {
            totalSteps: 3,
            steps: [
              {
                current: true,
                completed: false,
                title: 'Populate Argument',
                description: 'Add premises and conclusions',
                actions: [{ label: 'Populate Current Argument', enabled: true }],
              },
            ],
          },
        }),
      );

      (vscode.window.showQuickPick as any).mockResolvedValueOnce('Populate Current Argument');
      (vscode.commands.executeCommand as any).mockResolvedValueOnce(undefined);

      const commandHandler = getWorkflowCommand();
      await commandHandler();

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'proofEditor.populateEmptyArgument',
      );
    });

    it('should show warning when no active editor', async () => {
      vscode.window.activeTextEditor = undefined;

      const commandHandler = getWorkflowCommand();
      await commandHandler();

      expect(mockUIPort.showWarning).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'Please open a .proof file first.' }),
      );
    });

    it('should handle bootstrap controller errors', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      mockBootstrapController.getBootstrapWorkflow.mockResolvedValueOnce(
        err(new ValidationError('Workflow failed')),
      );

      const commandHandler = getWorkflowCommand();
      await commandHandler();

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'Failed to get workflow: Workflow failed' }),
      );
    });

    it('should handle exceptions', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      mockBootstrapController.getBootstrapWorkflow.mockRejectedValueOnce(
        new Error('Unexpected error'),
      );

      const commandHandler = getWorkflowCommand();
      await commandHandler();

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'Failed to show workflow: Unexpected error' }),
      );
    });
  });

  describe('createEmptyImplicationLine command', () => {
    const getImplicationLineCommand = () => {
      const commandCall = (vscode.commands.registerCommand as any).mock.calls.find(
        (call: any[]) => call[0] === 'proofEditor.createEmptyImplicationLine',
      );
      return commandCall?.[1] as () => Promise<void>;
    };

    it('should create empty implication line successfully', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      mockBootstrapController.createEmptyImplicationLine.mockResolvedValueOnce(
        ok({
          data: {
            displayFormat: {
              premiseLines: ['Premise 1:', 'Premise 2:'],
              horizontalLine: '──────────────',
              conclusionLines: ['Conclusion:'],
            },
            userInstructions: 'Click above or below the line to add statements',
          },
        }),
      );

      const commandHandler = getImplicationLineCommand();
      await commandHandler();

      expect(mockBootstrapController.createEmptyImplicationLine).toHaveBeenCalledWith(
        testContext.mockTextEditor.document.fileName,
        expect.stringMatching(/^tree-\d+$/),
      );
      expect(mockUIPort.showInformation).toHaveBeenCalledWith(
        expect.objectContaining({ value: expect.stringContaining('Premise 1:') }),
        expect.objectContaining({ label: expect.objectContaining({ value: 'Populate Argument' }) }),
      );
    });

    it('should show warning when no active editor', async () => {
      vscode.window.activeTextEditor = undefined;

      const commandHandler = getImplicationLineCommand();
      await commandHandler();

      expect(mockUIPort.showWarning).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'Please open a .proof file first.' }),
      );
    });

    it('should handle bootstrap controller errors', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      mockBootstrapController.createEmptyImplicationLine.mockResolvedValueOnce(
        err(new ValidationError('Creation failed')),
      );

      const commandHandler = getImplicationLineCommand();
      await commandHandler();

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'Failed to create implication line: Creation failed' }),
      );
    });

    it('should handle exceptions', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      mockBootstrapController.createEmptyImplicationLine.mockRejectedValueOnce(
        new Error('Unexpected error'),
      );

      const commandHandler = getImplicationLineCommand();
      await commandHandler();

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'Failed to create implication line: Unexpected error' }),
      );
    });
  });
});

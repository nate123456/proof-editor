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
import * as vscode from 'vscode';
import { ValidationError } from '../../domain/shared/result.js';
import { activate } from '../extension.js';
import {
  type ExtensionTestContext,
  mockContainer,
  mockUIPort,
  setupExtensionTest,
} from './shared/extension-test-setup.js';

describe('Extension - Bootstrap Commands', () => {
  let testContext: ExtensionTestContext;

  beforeEach(async () => {
    testContext = setupExtensionTest();
    await activate(testContext.mockContext);
  });

  describe('createBootstrapDocument command', () => {
    const getBootstrapDocumentCommand = () => {
      const commandCall = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.find((call) => call[0] === 'proofEditor.createBootstrapDocument');
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
      vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce('test-document');
      vi.mocked(vscode.window.showInformationMessage).mockResolvedValueOnce({ title: '' });

      // Mock file operations
      const mockDocument = {
        ...testContext.mockTextDocument,
        uri: vscode.Uri.file('/test/workspace/test-document.proof'),
      };
      vi.mocked(vscode.workspace.openTextDocument).mockResolvedValueOnce(mockDocument);
      vi.mocked(vscode.window.showTextDocument).mockResolvedValueOnce(testContext.mockTextEditor);

      // Mock bootstrap controller success
      const mockBootstrap = mockContainer.resolve('BootstrapController');
      mockBootstrap.initializeEmptyDocument.mockResolvedValueOnce(
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
      const mockFileSystem = mockContainer.resolve('IFileSystemPort');
      mockFileSystem.writeFile.mockResolvedValueOnce(ok(undefined));

      const commandHandler = getBootstrapDocumentCommand();
      await commandHandler();

      expect(mockBootstrap.initializeEmptyDocument).toHaveBeenCalledWith('test-document');
      expect(mockFileSystem.writeFile).toHaveBeenCalledWith(
        '/test/workspace/test-document.proof',
        expect.stringContaining('test-document'),
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

      expect(mockUIPort.showWarning).toHaveBeenCalledWith('Please open a workspace folder first.');
    });

    it('should handle user cancellation', async () => {
      Object.defineProperty(vscode.workspace, 'workspaceFolders', {
        value: [{ uri: vscode.Uri.file('/test/workspace') }],
        writable: true,
        configurable: true,
      });

      // User cancels input
      vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce(undefined);

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
      const _commandCall = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.find((call) => call[0] === 'proofEditor.createBootstrapDocument');

      // Get the input box options to test the validator
      vi.mocked(vscode.window.showInputBox).mockImplementationOnce((options) => {
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

      vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce('test-document');

      // Mock bootstrap controller failure
      const mockBootstrap = mockContainer.resolve('BootstrapController');
      vi.mocked(mockBootstrap.initializeEmptyDocument).mockResolvedValueOnce(
        err(new ValidationError('Bootstrap failed')),
      );

      const commandHandler = getBootstrapDocumentCommand();
      await commandHandler();

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        'Failed to create document: Bootstrap failed',
      );
    });

    it('should handle file write errors', async () => {
      Object.defineProperty(vscode.workspace, 'workspaceFolders', {
        value: [{ uri: vscode.Uri.file('/test/workspace') }],
        writable: true,
        configurable: true,
      });

      vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce('test-document');

      // Mock bootstrap controller success
      const mockBootstrap = mockContainer.resolve('BootstrapController');
      mockBootstrap.initializeEmptyDocument.mockResolvedValueOnce(
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
      const mockFileSystem = mockContainer.resolve('IFileSystemPort');
      vi.mocked(mockFileSystem.writeFile).mockResolvedValueOnce(err(new Error('Write failed')));

      const commandHandler = getBootstrapDocumentCommand();
      await commandHandler();

      expect(mockUIPort.showError).toHaveBeenCalledWith('Failed to write file: Write failed');
    });

    it('should handle tutorial workflow selection', async () => {
      Object.defineProperty(vscode.workspace, 'workspaceFolders', {
        value: [{ uri: vscode.Uri.file('/test/workspace') }],
        writable: true,
        configurable: true,
      });

      vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce('test-document');

      // Mock bootstrap and file operations success
      const mockBootstrap = mockContainer.resolve('BootstrapController');
      mockBootstrap.initializeEmptyDocument.mockResolvedValueOnce(
        ok({
          data: {
            documentId: 'test-document',
            created: true,
            hasBootstrapArgument: false,
            nextSteps: [],
          },
        }),
      );
      const mockFileSystem = mockContainer.resolve('IFileSystemPort');
      mockFileSystem.writeFile.mockResolvedValueOnce(ok(undefined));

      const mockDocument = {
        ...testContext.mockTextDocument,
        uri: vscode.Uri.file('/test/workspace/test-document.proof'),
      };
      vi.mocked(vscode.workspace.openTextDocument).mockResolvedValueOnce(mockDocument);
      vi.mocked(vscode.window.showTextDocument).mockResolvedValueOnce(testContext.mockTextEditor);

      // Mock workflow selection
      vi.mocked(vscode.window.showInformationMessage).mockResolvedValueOnce({
        title: 'Start Guided Tutorial',
      });
      vi.mocked(vscode.commands.executeCommand).mockResolvedValueOnce(undefined);

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

      vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce('test-document');

      // Mock bootstrap controller to throw
      const mockBootstrap = mockContainer.resolve('BootstrapController');
      vi.mocked(mockBootstrap.initializeEmptyDocument).mockRejectedValueOnce(
        new Error('Unexpected error'),
      );

      const commandHandler = getBootstrapDocumentCommand();
      await commandHandler();

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        'Failed to create document: Unexpected error',
      );
    });
  });

  describe('createBootstrapArgument command', () => {
    const getBootstrapArgumentCommand = () => {
      const commandCall = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.find((call) => call[0] === 'proofEditor.createBootstrapArgument');
      return commandCall?.[1] as () => Promise<void>;
    };

    it('should create bootstrap argument successfully', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      const mockBootstrap = mockContainer.resolve('BootstrapController');
      vi.mocked(mockBootstrap.createBootstrapArgument).mockResolvedValueOnce(
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

      expect(mockBootstrap.createBootstrapArgument).toHaveBeenCalledWith(
        testContext.mockTextEditor.document.fileName,
      );
      expect(mockUIPort.showInformation).toHaveBeenCalledWith(
        'Created empty argument: arg-123',
        expect.objectContaining({ label: 'Populate Argument' }),
      );
    });

    it('should show warning when no active editor', async () => {
      vscode.window.activeTextEditor = undefined;

      const commandHandler = getBootstrapArgumentCommand();
      await commandHandler();

      expect(mockUIPort.showWarning).toHaveBeenCalledWith('Please open a .proof file first.');
    });

    it('should show warning when active editor is not proof file', async () => {
      vscode.window.activeTextEditor = {
        ...testContext.mockTextEditor,
        document: { ...testContext.mockTextDocument, languageId: 'javascript' },
      };

      const commandHandler = getBootstrapArgumentCommand();
      await commandHandler();

      expect(mockUIPort.showWarning).toHaveBeenCalledWith('Please open a .proof file first.');
    });

    it('should handle bootstrap controller errors', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      const mockBootstrap = mockContainer.resolve('BootstrapController');
      vi.mocked(mockBootstrap.createBootstrapArgument).mockResolvedValueOnce(
        err(new ValidationError('Creation failed')),
      );

      const commandHandler = getBootstrapArgumentCommand();
      await commandHandler();

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        'Failed to create argument: Creation failed',
      );
    });

    it('should handle exceptions', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      const mockBootstrap = mockContainer.resolve('BootstrapController');
      vi.mocked(mockBootstrap.createBootstrapArgument).mockRejectedValueOnce(
        new Error('Unexpected error'),
      );

      const commandHandler = getBootstrapArgumentCommand();
      await commandHandler();

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        'Failed to create argument: Unexpected error',
      );
    });
  });

  describe('populateEmptyArgument command', () => {
    const getPopulateArgumentCommand = () => {
      const commandCall = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.find((call) => call[0] === 'proofEditor.populateEmptyArgument');
      return commandCall?.[1] as () => Promise<void>;
    };

    it('should populate argument successfully with multiple premises', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      // Mock user inputs - premises and conclusion
      vi.mocked(vscode.window.showInputBox)
        .mockResolvedValueOnce('All humans are mortal') // First premise
        .mockResolvedValueOnce('Socrates is human') // Second premise
        .mockResolvedValueOnce('') // No more premises
        .mockResolvedValueOnce('Socrates is mortal') // Conclusion
        .mockResolvedValueOnce('Modus Ponens'); // Rule name

      const mockBootstrap = mockContainer.resolve('BootstrapController');
      vi.mocked(mockBootstrap.populateEmptyArgument).mockResolvedValueOnce(
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

      expect(mockBootstrap.populateEmptyArgument).toHaveBeenCalledWith(
        testContext.mockTextEditor.document.fileName,
        expect.stringMatching(/^arg-\d+$/),
        ['All humans are mortal', 'Socrates is human'],
        ['Socrates is mortal'],
        { left: 'Modus Ponens' },
      );
      expect(mockUIPort.showInformation).toHaveBeenCalledWith(
        'Argument populated successfully!',
        expect.objectContaining({ label: 'Show Bootstrap Workflow' }),
      );
    });

    it('should handle single premise argument', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      vi.mocked(vscode.window.showInputBox)
        .mockResolvedValueOnce('Simple premise') // First premise
        .mockResolvedValueOnce('') // No more premises
        .mockResolvedValueOnce('Simple conclusion') // Conclusion
        .mockResolvedValueOnce(''); // No rule name

      const mockBootstrap = mockContainer.resolve('BootstrapController');
      vi.mocked(mockBootstrap.populateEmptyArgument).mockResolvedValueOnce(
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

      expect(mockBootstrap.populateEmptyArgument).toHaveBeenCalledWith(
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
      const mockBootstrap = mockContainer.resolve('BootstrapController');
      expect(mockBootstrap.populateEmptyArgument).not.toHaveBeenCalled();
    });

    it('should handle user cancelling conclusion input', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      vi.mocked(vscode.window.showInputBox)
        .mockResolvedValueOnce('Some premise') // Premise
        .mockResolvedValueOnce('') // No more premises
        .mockResolvedValueOnce(undefined); // Cancel conclusion

      const commandHandler = getPopulateArgumentCommand();
      await commandHandler();

      // Should exit early without calling bootstrap controller
      const mockBootstrap = mockContainer.resolve('BootstrapController');
      expect(mockBootstrap.populateEmptyArgument).not.toHaveBeenCalled();
    });

    it('should handle maximum premises limit', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      // Mock 5 premises + attempt at 6th
      vi.mocked(vscode.window.showInputBox)
        .mockResolvedValueOnce('Premise 1')
        .mockResolvedValueOnce('Premise 2')
        .mockResolvedValueOnce('Premise 3')
        .mockResolvedValueOnce('Premise 4')
        .mockResolvedValueOnce('Premise 5')
        .mockResolvedValueOnce('Conclusion')
        .mockResolvedValueOnce('Rule');

      const mockBootstrap = mockContainer.resolve('BootstrapController');
      vi.mocked(mockBootstrap.populateEmptyArgument).mockResolvedValueOnce(
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

      expect(mockBootstrap.populateEmptyArgument).toHaveBeenCalledWith(
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

      expect(mockUIPort.showWarning).toHaveBeenCalledWith('Please open a .proof file first.');
    });

    it('should handle bootstrap controller errors', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      vi.mocked(vscode.window.showInputBox)
        .mockResolvedValueOnce('Premise')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('Conclusion')
        .mockResolvedValueOnce('');

      const mockBootstrap = mockContainer.resolve('BootstrapController');
      vi.mocked(mockBootstrap.populateEmptyArgument).mockResolvedValueOnce(
        err(new ValidationError('Population failed')),
      );

      const commandHandler = getPopulateArgumentCommand();
      await commandHandler();

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        'Failed to populate argument: Population failed',
      );
    });

    it('should handle exceptions', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      vi.mocked(vscode.window.showInputBox)
        .mockResolvedValueOnce('Premise')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('Conclusion')
        .mockResolvedValueOnce('');

      const mockBootstrap = mockContainer.resolve('BootstrapController');
      vi.mocked(mockBootstrap.populateEmptyArgument).mockRejectedValueOnce(
        new Error('Unexpected error'),
      );

      const commandHandler = getPopulateArgumentCommand();
      await commandHandler();

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        'Failed to populate argument: Unexpected error',
      );
    });
  });

  describe('showBootstrapWorkflow command', () => {
    const getWorkflowCommand = () => {
      const commandCall = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.find((call) => call[0] === 'proofEditor.showBootstrapWorkflow');
      return commandCall?.[1] as () => Promise<void>;
    };

    it('should show workflow with enabled actions', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      const mockBootstrap = mockContainer.resolve('BootstrapController');
      vi.mocked(mockBootstrap.getBootstrapWorkflow).mockResolvedValueOnce(
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

      (vi.mocked(vscode.window.showQuickPick) as any).mockResolvedValueOnce(
        'Create Empty Argument',
      );
      vi.mocked(vscode.commands.executeCommand).mockResolvedValueOnce(undefined);

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

      const mockBootstrap = mockContainer.resolve('BootstrapController');
      vi.mocked(mockBootstrap.getBootstrapWorkflow).mockResolvedValueOnce(
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
        expect.stringContaining('Review Arguments'),
      );
    });

    it('should handle populate action selection', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      const mockBootstrap = mockContainer.resolve('BootstrapController');
      vi.mocked(mockBootstrap.getBootstrapWorkflow).mockResolvedValueOnce(
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

      (vi.mocked(vscode.window.showQuickPick) as any).mockResolvedValueOnce(
        'Populate Current Argument',
      );
      vi.mocked(vscode.commands.executeCommand).mockResolvedValueOnce(undefined);

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

      expect(mockUIPort.showWarning).toHaveBeenCalledWith('Please open a .proof file first.');
    });

    it('should handle bootstrap controller errors', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      const mockBootstrap = mockContainer.resolve('BootstrapController');
      vi.mocked(mockBootstrap.getBootstrapWorkflow).mockResolvedValueOnce(
        err(new ValidationError('Workflow failed')),
      );

      const commandHandler = getWorkflowCommand();
      await commandHandler();

      expect(mockUIPort.showError).toHaveBeenCalledWith('Failed to get workflow: Workflow failed');
    });

    it('should handle exceptions', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      const mockBootstrap = mockContainer.resolve('BootstrapController');
      vi.mocked(mockBootstrap.getBootstrapWorkflow).mockRejectedValueOnce(
        new Error('Unexpected error'),
      );

      const commandHandler = getWorkflowCommand();
      await commandHandler();

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        'Failed to show workflow: Unexpected error',
      );
    });
  });

  describe('createEmptyImplicationLine command', () => {
    const getImplicationLineCommand = () => {
      const commandCall = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.find((call) => call[0] === 'proofEditor.createEmptyImplicationLine');
      return commandCall?.[1] as () => Promise<void>;
    };

    it('should create empty implication line successfully', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      const mockBootstrap = mockContainer.resolve('BootstrapController');
      vi.mocked(mockBootstrap.createEmptyImplicationLine).mockResolvedValueOnce(
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

      expect(mockBootstrap.createEmptyImplicationLine).toHaveBeenCalledWith(
        testContext.mockTextEditor.document.fileName,
        expect.stringMatching(/^tree-\d+$/),
      );
      expect(mockUIPort.showInformation).toHaveBeenCalledWith(
        expect.stringContaining('Premise 1:'),
        expect.objectContaining({ label: 'Populate Argument' }),
      );
    });

    it('should show warning when no active editor', async () => {
      vscode.window.activeTextEditor = undefined;

      const commandHandler = getImplicationLineCommand();
      await commandHandler();

      expect(mockUIPort.showWarning).toHaveBeenCalledWith('Please open a .proof file first.');
    });

    it('should handle bootstrap controller errors', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      const mockBootstrap = mockContainer.resolve('BootstrapController');
      vi.mocked(mockBootstrap.createEmptyImplicationLine).mockResolvedValueOnce(
        err(new ValidationError('Creation failed')),
      );

      const commandHandler = getImplicationLineCommand();
      await commandHandler();

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        'Failed to create implication line: Creation failed',
      );
    });

    it('should handle exceptions', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      const mockBootstrap = mockContainer.resolve('BootstrapController');
      vi.mocked(mockBootstrap.createEmptyImplicationLine).mockRejectedValueOnce(
        new Error('Unexpected error'),
      );

      const commandHandler = getImplicationLineCommand();
      await commandHandler();

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        'Failed to create implication line: Unexpected error',
      );
    });
  });
});

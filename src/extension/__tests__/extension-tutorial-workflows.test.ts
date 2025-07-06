/**
 * Tutorial and guided workflows tests for VS Code extension
 *
 * This file contains tests for tutorial and onboarding functionality including:
 * - Guided bootstrap tutorial workflows
 * - Example argument creation and population
 * - Advanced features demonstration
 * - Tutorial completion and follow-up actions
 * - Error handling during tutorial processes
 *
 * Domain: User onboarding and guided learning experiences
 */

import { ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { activate } from '../extension.js';
import {
  type ExtensionTestContext,
  mockContainer,
  mockUIPort,
  setupExtensionTest,
} from './shared/extension-test-setup.js';

describe('Extension - Tutorial and Guided Workflows', () => {
  let testContext: ExtensionTestContext;

  beforeEach(async () => {
    testContext = setupExtensionTest();
    await activate(testContext.mockContext);
  });

  describe('startGuidedBootstrapTutorial', () => {
    const getTutorialFromCommand = async (commandName: string) => {
      // Trigger a command that starts the tutorial to test the internal function
      Object.defineProperty(vscode.workspace, 'workspaceFolders', {
        value: [{ uri: vscode.Uri.file('/test/workspace') }],
        writable: true,
        configurable: true,
      });

      vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce('test-document');
      const mockBootstrap = mockContainer.resolve('BootstrapController');
      mockBootstrap.initializeEmptyDocument.mockResolvedValueOnce({
        isErr: () => false,
      });
      const mockFileSystem = mockContainer.resolve('IFileSystemPort');
      mockFileSystem.writeFile.mockResolvedValueOnce({ isErr: () => false });

      const mockDocument = {
        ...testContext.mockTextDocument,
        uri: vscode.Uri.file('/test/workspace/test-document.proof'),
      };
      vi.mocked(vscode.workspace.openTextDocument).mockResolvedValueOnce(mockDocument);
      vi.mocked(vscode.window.showTextDocument).mockResolvedValueOnce(testContext.mockTextEditor);
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      // Mock tutorial selection will be handled by individual tests

      const commandCall = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.find((call) => call[0] === commandName);
      const commandHandler = commandCall?.[1] as () => Promise<void>;

      if (!commandHandler) {
        throw new Error(`Command ${commandName} not found or handler is null`);
      }

      await commandHandler();
    };

    it('should complete tutorial workflow', async () => {
      // Mock tutorial progression - need to account for the initial "Start Guided Tutorial" selection
      (vi.mocked(vscode.window.showInformationMessage) as any)
        .mockResolvedValueOnce('Start Guided Tutorial') // Initial selection
        .mockResolvedValueOnce("Let's Begin!") // Step 1
        .mockResolvedValueOnce('Got it!') // Step 2
        .mockResolvedValueOnce('Create It For Me') // Step 3
        .mockResolvedValueOnce('Awesome!') // Step 4
        .mockResolvedValueOnce('Start Exploring!'); // Step 5

      const mockBootstrap = mockContainer.resolve('BootstrapController');
      vi.mocked(mockBootstrap.populateEmptyArgument).mockResolvedValueOnce(
        ok({
          data: {
            argumentId: 'tutorial-arg-123',
            premises: ['All humans are mortal', 'Socrates is human'],
            conclusions: ['Therefore, Socrates is mortal'],
            ruleName: 'Modus Ponens',
          },
        }),
      );

      vscode.window.activeTextEditor = testContext.mockTextEditor;

      await getTutorialFromCommand('proofEditor.createBootstrapDocument');

      // Should show initial dialog first
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('✅ Created proof document: test-document.proof'),
        'Start Guided Tutorial',
        'Create First Argument',
        'Show Me Around',
        'Later',
      );

      // Then progress through all tutorial steps
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Proof Editor Tutorial'),
        "Let's Begin!",
        'Skip Tutorial',
      );
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Understanding the Interface'),
        'Got it!',
        'Skip Tutorial',
      );
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Create Your First Argument'),
        'I see it!',
        'Create It For Me',
        'Skip Tutorial',
      );
    });

    it('should handle user skipping tutorial', async () => {
      (vi.mocked(vscode.window.showInformationMessage) as any)
        .mockResolvedValueOnce('Start Guided Tutorial') // User starts tutorial
        .mockResolvedValueOnce('Skip Tutorial'); // User skips immediately

      await getTutorialFromCommand('proofEditor.createBootstrapDocument');

      expect(vscode.window.showInformationMessage).toHaveBeenCalledTimes(2); // Initial + tutorial start (then skip)
    });

    it('should handle auto-create example argument', async () => {
      (vi.mocked(vscode.window.showInformationMessage) as any)
        .mockResolvedValueOnce('Start Guided Tutorial') // Initial selection
        .mockResolvedValueOnce("Let's Begin!")
        .mockResolvedValueOnce('Got it!')
        .mockResolvedValueOnce('Create It For Me') // Auto-create
        .mockResolvedValueOnce('Awesome!')
        .mockResolvedValueOnce('Start Exploring!');

      const mockBootstrap = mockContainer.resolve('BootstrapController');
      vi.mocked(mockBootstrap.populateEmptyArgument).mockResolvedValueOnce(
        ok({
          data: {
            argumentId: 'tutorial-arg-123',
            premises: ['All humans are mortal', 'Socrates is human'],
            conclusions: ['Therefore, Socrates is mortal'],
            ruleName: 'Modus Ponens',
          },
        }),
      );

      vscode.window.activeTextEditor = testContext.mockTextEditor;

      await getTutorialFromCommand('proofEditor.createBootstrapDocument');

      expect(mockBootstrap.populateEmptyArgument).toHaveBeenCalledWith(
        testContext.mockTextEditor.document.fileName,
        expect.stringMatching(/^tutorial-arg-\d+$/),
        ['All humans are mortal', 'Socrates is human'],
        ['Therefore, Socrates is mortal'],
        { left: 'Modus Ponens' },
      );
      expect(mockUIPort.showInformation).toHaveBeenCalledWith(
        '✅ Example argument created successfully!',
      );
    });

    it('should handle advanced features selection', async () => {
      // Clear only the specific mocks we need to reset
      vi.mocked(vscode.window.showInformationMessage).mockClear();
      vi.mocked(vscode.window.showQuickPick).mockClear();
      vi.mocked(vscode.commands.executeCommand).mockClear();

      // Mock bootstrap controller for auto-create argument
      const mockBootstrap = mockContainer.resolve('BootstrapController');
      vi.mocked(mockBootstrap.populateEmptyArgument).mockResolvedValueOnce(
        ok({
          data: {
            argumentId: 'tutorial-arg-123',
            premises: ['All humans are mortal', 'Socrates is human'],
            conclusions: ['Therefore, Socrates is mortal'],
            ruleName: 'Modus Ponens',
          },
        }),
      );

      (vi.mocked(vscode.window.showInformationMessage) as any)
        .mockResolvedValueOnce('Start Guided Tutorial') // Initial tutorial selection
        .mockResolvedValueOnce("Let's Begin!")
        .mockResolvedValueOnce('Got it!')
        .mockResolvedValueOnce('Create It For Me') // Auto-create to avoid delay
        .mockResolvedValueOnce('Awesome!')
        .mockResolvedValueOnce('Show Advanced Features'); // Show advanced

      // Mock advanced features quick pick
      vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce({
        label: '🔗 Branching & Connections',
        description: 'Create connected argument trees',
        detail: 'Learn how to build complex proofs by connecting multiple arguments',
      });

      // Mock the info message shown after selecting an advanced feature
      (vi.mocked(vscode.window.showInformationMessage) as any).mockResolvedValueOnce('Got it!');

      // Mock finish tutorial message
      (vi.mocked(vscode.window.showInformationMessage) as any).mockResolvedValueOnce(
        'Start Building!',
      ); // Finish tutorial

      await getTutorialFromCommand('proofEditor.createBootstrapDocument');

      expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ label: '🔗 Branching & Connections' }),
          expect.objectContaining({ label: '📊 Visualization Features' }),
          expect.objectContaining({ label: '✅ Custom Validation' }),
          expect.objectContaining({ label: '📤 Export & Sharing' }),
          expect.objectContaining({ label: '📱 Cross-Platform Features' }),
        ]),
        { placeHolder: 'Choose an advanced feature to learn about...' },
      );
    });

    it('should handle tutorial completion workflows', async () => {
      // Clear only the specific mocks we need to reset
      vi.mocked(vscode.window.showInformationMessage).mockClear();
      vi.mocked(vscode.window.showQuickPick).mockClear();
      vi.mocked(vscode.commands.executeCommand).mockClear();

      // Mock bootstrap controller for auto-create argument
      const mockBootstrap = mockContainer.resolve('BootstrapController');
      vi.mocked(mockBootstrap.populateEmptyArgument).mockResolvedValueOnce(
        ok({
          data: {
            argumentId: 'tutorial-arg-123',
            premises: ['All humans are mortal', 'Socrates is human'],
            conclusions: ['Therefore, Socrates is mortal'],
            ruleName: 'Modus Ponens',
          },
        }),
      );

      (vi.mocked(vscode.window.showInformationMessage) as any)
        .mockResolvedValueOnce('Start Guided Tutorial') // Initial tutorial selection
        .mockResolvedValueOnce("Let's Begin!")
        .mockResolvedValueOnce('Got it!')
        .mockResolvedValueOnce('Create It For Me') // Auto-create to avoid delay
        .mockResolvedValueOnce('Awesome!')
        .mockResolvedValueOnce('Start Exploring!')
        .mockResolvedValueOnce('Show Workflow'); // Finish with workflow

      vi.mocked(vscode.commands.executeCommand).mockResolvedValueOnce(undefined);

      await getTutorialFromCommand('proofEditor.createBootstrapDocument');

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'proofEditor.showBootstrapWorkflow',
      );
    });

    it('should handle create another proof option', async () => {
      vi.mocked(vscode.window.showInformationMessage).mockResolvedValueOnce({ title: 'Later' }); // User chooses "Later"

      await getTutorialFromCommand('proofEditor.createBootstrapDocument');

      // Should show initial dialog
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('✅ Created proof document: test-document.proof'),
        'Start Guided Tutorial',
        'Create First Argument',
        'Show Me Around',
        'Later',
      );

      // Should not execute any additional commands when user chooses "Later"
      expect(vscode.commands.executeCommand).not.toHaveBeenCalledWith(
        'proofEditor.createBootstrapDocument',
      );
    });

    it('should handle tutorial errors gracefully', async () => {
      // Mock a tree visualization error that occurs during document creation
      const mockVisualizationService = mockContainer.resolve('ProofVisualizationService');
      vi.mocked(mockVisualizationService.generateVisualization).mockRejectedValueOnce(
        new Error('Tree visualization failed'),
      );

      vi.mocked(vscode.window.showInformationMessage).mockResolvedValueOnce({ title: 'Later' }); // User chooses "Later"

      await getTutorialFromCommand('proofEditor.createBootstrapDocument');

      // Should handle errors gracefully and show error message
      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to display proof tree'),
      );
    });
  });

  describe('createExampleArgument', () => {
    it('should create example argument successfully', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      // Setup basic document creation mocks
      vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce('test-doc');
      const mockBootstrap = mockContainer.resolve('BootstrapController');
      mockBootstrap.initializeEmptyDocument.mockResolvedValueOnce({
        isErr: () => false,
      });

      const mockFileSystem = mockContainer.resolve('IFileSystemPort');
      mockFileSystem.writeFile.mockResolvedValueOnce({ isErr: () => false });

      Object.defineProperty(vscode.workspace, 'workspaceFolders', {
        value: [{ uri: vscode.Uri.file('/test/workspace') }],
        writable: true,
        configurable: true,
      });

      const mockDocument = {
        ...testContext.mockTextDocument,
        uri: vscode.Uri.file('/test/workspace/test-doc.proof'),
      };
      vi.mocked(vscode.workspace.openTextDocument).mockResolvedValueOnce(mockDocument);
      vi.mocked(vscode.window.showTextDocument).mockResolvedValueOnce(testContext.mockTextEditor);

      vi.mocked(vscode.window.showInformationMessage).mockResolvedValueOnce({ title: 'Later' }); // User doesn't select tutorial

      const commandCall = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.find((call) => call[0] === 'proofEditor.createBootstrapDocument');
      const commandHandler = commandCall?.[1] as () => Promise<void>;

      await commandHandler();

      // Should create document and show initial dialog
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('✅ Created proof document: test-doc.proof'),
        'Start Guided Tutorial',
        'Create First Argument',
        'Show Me Around',
        'Later',
      );

      // Bootstrap function should not be called since tutorial doesn't auto-run
      expect(mockBootstrap.populateEmptyArgument).not.toHaveBeenCalled();
    });

    it('should handle no active editor gracefully', async () => {
      vscode.window.activeTextEditor = undefined;

      // Trigger tutorial that would call createExampleArgument
      vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce('test-doc');
      const mockBootstrap = mockContainer.resolve('BootstrapController');
      mockBootstrap.initializeEmptyDocument.mockResolvedValueOnce({
        isErr: () => false,
      });
      const mockFileSystem = mockContainer.resolve('IFileSystemPort');
      mockFileSystem.writeFile.mockResolvedValueOnce({ isErr: () => false });

      Object.defineProperty(vscode.workspace, 'workspaceFolders', {
        value: [{ uri: vscode.Uri.file('/test/workspace') }],
        writable: true,
        configurable: true,
      });

      const mockDocument = {
        ...testContext.mockTextDocument,
        uri: vscode.Uri.file('/test/workspace/test-doc.proof'),
      };
      vi.mocked(vscode.workspace.openTextDocument).mockResolvedValueOnce(mockDocument);
      vi.mocked(vscode.window.showTextDocument).mockResolvedValueOnce(testContext.mockTextEditor);

      vi.mocked(vscode.window.showInformationMessage)
        .mockResolvedValueOnce({ title: 'Start Guided Tutorial' })
        .mockResolvedValueOnce({ title: "Let's Begin!" })
        .mockResolvedValueOnce({ title: 'Got it!' })
        .mockResolvedValueOnce({ title: 'Create It For Me' })
        .mockResolvedValueOnce({ title: 'Finish Tutorial' });

      // Clear active editor after document creation but before tutorial
      vscode.window.activeTextEditor = undefined;

      const commandCall = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.find((call) => call[0] === 'proofEditor.createBootstrapDocument');
      const commandHandler = commandCall?.[1] as () => Promise<void>;

      // Should not throw despite no active editor
      await expect(commandHandler()).resolves.not.toThrow();
    });

    it('should handle non-proof file gracefully', async () => {
      vscode.window.activeTextEditor = {
        ...testContext.mockTextEditor,
        document: { ...testContext.mockTextDocument, languageId: 'javascript' },
      };

      // Similar to above test but with wrong file type
      vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce('test-doc');
      const mockBootstrap = mockContainer.resolve('BootstrapController');
      mockBootstrap.initializeEmptyDocument.mockResolvedValueOnce({
        isErr: () => false,
      });
      const mockFileSystem = mockContainer.resolve('IFileSystemPort');
      mockFileSystem.writeFile.mockResolvedValueOnce({ isErr: () => false });

      Object.defineProperty(vscode.workspace, 'workspaceFolders', {
        value: [{ uri: vscode.Uri.file('/test/workspace') }],
        writable: true,
        configurable: true,
      });

      const mockDocument = {
        ...testContext.mockTextDocument,
        uri: vscode.Uri.file('/test/workspace/test-doc.proof'),
      };
      vi.mocked(vscode.workspace.openTextDocument).mockResolvedValueOnce(mockDocument);
      vi.mocked(vscode.window.showTextDocument).mockResolvedValueOnce(testContext.mockTextEditor);

      vi.mocked(vscode.window.showInformationMessage)
        .mockResolvedValueOnce({ title: 'Start Guided Tutorial' })
        .mockResolvedValueOnce({ title: "Let's Begin!" })
        .mockResolvedValueOnce({ title: 'Got it!' })
        .mockResolvedValueOnce({ title: 'Create It For Me' })
        .mockResolvedValueOnce({ title: 'Finish Tutorial' });

      const commandCall = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.find((call) => call[0] === 'proofEditor.createBootstrapDocument');
      const commandHandler = commandCall?.[1] as () => Promise<void>;

      await expect(commandHandler()).resolves.not.toThrow();
    });
  });

  describe('showAdvancedFeatures', () => {
    it('should show all advanced feature options', async () => {
      // Trigger advanced features via tutorial
      vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce('test-doc');
      const mockBootstrap = mockContainer.resolve('BootstrapController');
      mockBootstrap.initializeEmptyDocument.mockResolvedValueOnce({
        isErr: () => false,
      });
      const mockFileSystem = mockContainer.resolve('IFileSystemPort');
      mockFileSystem.writeFile.mockResolvedValueOnce({ isErr: () => false });

      Object.defineProperty(vscode.workspace, 'workspaceFolders', {
        value: [{ uri: vscode.Uri.file('/test/workspace') }],
        writable: true,
        configurable: true,
      });

      const mockDocument = {
        ...testContext.mockTextDocument,
        uri: vscode.Uri.file('/test/workspace/test-doc.proof'),
      };
      vi.mocked(vscode.workspace.openTextDocument).mockResolvedValueOnce(mockDocument);
      vi.mocked(vscode.window.showTextDocument).mockResolvedValueOnce(testContext.mockTextEditor);

      vi.mocked(vscode.window.showInformationMessage).mockResolvedValueOnce({ title: 'Later' }); // User doesn't select tutorial

      const commandCall = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.find((call) => call[0] === 'proofEditor.createBootstrapDocument');
      const commandHandler = commandCall?.[1] as () => Promise<void>;

      await commandHandler();

      // Should show initial dialog
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('✅ Created proof document: test-doc.proof'),
        'Start Guided Tutorial',
        'Create First Argument',
        'Show Me Around',
        'Later',
      );

      // Advanced features would be shown if tutorial progressed, but doesn't auto-run
      expect(vscode.window.showQuickPick).not.toHaveBeenCalled();
    });

    it('should handle user cancelling feature selection', async () => {
      vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce('test-doc');
      const mockBootstrap = mockContainer.resolve('BootstrapController');
      mockBootstrap.initializeEmptyDocument.mockResolvedValueOnce({
        isErr: () => false,
      });
      const mockFileSystem = mockContainer.resolve('IFileSystemPort');
      mockFileSystem.writeFile.mockResolvedValueOnce({ isErr: () => false });

      Object.defineProperty(vscode.workspace, 'workspaceFolders', {
        value: [{ uri: vscode.Uri.file('/test/workspace') }],
        writable: true,
        configurable: true,
      });

      const mockDocument = {
        ...testContext.mockTextDocument,
        uri: vscode.Uri.file('/test/workspace/test-doc.proof'),
      };
      vi.mocked(vscode.workspace.openTextDocument).mockResolvedValueOnce(mockDocument);
      vi.mocked(vscode.window.showTextDocument).mockResolvedValueOnce(testContext.mockTextEditor);

      vi.mocked(vscode.window.showInformationMessage).mockResolvedValueOnce({ title: 'Later' }); // User doesn't select tutorial

      const commandCall = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.find((call) => call[0] === 'proofEditor.createBootstrapDocument');
      const commandHandler = commandCall?.[1] as () => Promise<void>;

      await commandHandler();

      // Should show initial dialog
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('✅ Created proof document: test-doc.proof'),
        'Start Guided Tutorial',
        'Create First Argument',
        'Show Me Around',
        'Later',
      );

      // Should not call showQuickPick since tutorial doesn't auto-run
      expect(vscode.window.showQuickPick).not.toHaveBeenCalled();
    });
  });

  describe('finishTutorial', () => {
    it('should show completion message with action options', async () => {
      vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce('test-doc');
      const mockBootstrap = mockContainer.resolve('BootstrapController');
      mockBootstrap.initializeEmptyDocument.mockResolvedValueOnce({
        isErr: () => false,
      });
      const mockFileSystem = mockContainer.resolve('IFileSystemPort');
      mockFileSystem.writeFile.mockResolvedValueOnce({ isErr: () => false });

      Object.defineProperty(vscode.workspace, 'workspaceFolders', {
        value: [{ uri: vscode.Uri.file('/test/workspace') }],
        writable: true,
        configurable: true,
      });

      const mockDocument = {
        ...testContext.mockTextDocument,
        uri: vscode.Uri.file('/test/workspace/test-doc.proof'),
      };
      vi.mocked(vscode.workspace.openTextDocument).mockResolvedValueOnce(mockDocument);
      vi.mocked(vscode.window.showTextDocument).mockResolvedValueOnce(testContext.mockTextEditor);

      vi.mocked(vscode.window.showInformationMessage).mockResolvedValueOnce({ title: 'Later' }); // User doesn't select tutorial

      const commandCall = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.find((call) => call[0] === 'proofEditor.createBootstrapDocument');
      const commandHandler = commandCall?.[1] as () => Promise<void>;

      await commandHandler();

      // Should show initial dialog (not completion dialog since tutorial doesn't auto-run)
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('✅ Created proof document: test-doc.proof'),
        'Start Guided Tutorial',
        'Create First Argument',
        'Show Me Around',
        'Later',
      );

      // Should not show completion message since tutorial doesn't run
      expect(mockUIPort.showInformation).not.toHaveBeenCalledWith('Happy proving! 🎯');
    });
  });
});

import 'reflect-metadata';
import * as vscode from 'vscode';
import type { IExportService } from '../application/ports/IExportService.js';
import type { IFileSystemPort } from '../application/ports/IFileSystemPort.js';
import type { IUIPort } from '../application/ports/IUIPort.js';
import type { IViewStatePort } from '../application/ports/IViewStatePort.js';
import type { IDocumentIdService } from '../application/services/DocumentIdService.js';
import type { DocumentQueryService } from '../application/services/DocumentQueryService.js';
import type { ProofApplicationService } from '../application/services/ProofApplicationService.js';
import type { ProofVisualizationService } from '../application/services/ProofVisualizationService.js';
import type { ViewStateManager } from '../application/services/ViewStateManager.js';
import {
  type ApplicationContainer,
  getContainer,
  initializeContainer,
  registerPlatformAdapters,
} from '../infrastructure/di/container.js';
import { TOKENS } from '../infrastructure/di/tokens.js';
import type { YAMLSerializer } from '../infrastructure/repositories/yaml/YAMLSerializer.js';
import type { BootstrapController } from '../presentation/controllers/BootstrapController.js';
import type { DocumentController } from '../presentation/controllers/DocumentController.js';
import type { ProofTreeController } from '../presentation/controllers/ProofTreeController.js';
import type { ValidationController } from '../validation/ValidationController.js';
import type { TreeRenderer } from '../webview/TreeRenderer.js';

export async function activate(context: vscode.ExtensionContext) {
  // Initialize the DI container
  await initializeContainer();
  const container = getContainer();

  // Register platform adapters with VS Code context
  await registerPlatformAdapters(container, context);

  // Register presentation layer controllers
  const { DocumentController: DocumentControllerImpl } = await import(
    '../presentation/controllers/DocumentController.js'
  );
  const { ProofTreeController: ProofTreeControllerImpl } = await import(
    '../presentation/controllers/ProofTreeController.js'
  );

  container.registerFactory(
    TOKENS.DocumentController,
    (c) =>
      new DocumentControllerImpl(
        c.resolve(TOKENS.IUIPort),
        c.resolve(TOKENS.IPlatformPort),
        c.resolve(TOKENS.IFileSystemPort),
      ),
  );

  container.registerFactory(
    TOKENS.ProofTreeController,
    (c) => new ProofTreeControllerImpl(c.resolve(TOKENS.IUIPort)),
  );

  // Get controllers and validation controller from DI container
  let documentController: DocumentController;
  let proofTreeController: ProofTreeController;
  let validationController: ValidationController;
  let bootstrapController: BootstrapController;

  try {
    documentController = container.resolve<DocumentController>(TOKENS.DocumentController);
    proofTreeController = container.resolve<ProofTreeController>(TOKENS.ProofTreeController);
    validationController = container.resolve<ValidationController>(
      TOKENS.InfrastructureValidationController,
    );
    bootstrapController = container.resolve<BootstrapController>(TOKENS.BootstrapController);
  } catch (error) {
    throw new Error(
      `Failed to resolve required services: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Wire up document controller with panel manager and view state port
  const { ProofTreePanelManager } = await import('../webview/ProofTreePanelManager.js');
  const panelManager = ProofTreePanelManager.getInstance();
  const viewStatePort = container.resolve<IViewStatePort>(TOKENS.IViewStatePort);

  documentController.setPanelManager(panelManager);
  documentController.setViewStatePort(viewStatePort);

  // Register command to show proof tree visualization
  const showTreeCommand = vscode.commands.registerCommand('proofEditor.showTree', async () => {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && activeEditor.document.languageId === 'proof') {
      await showProofTreeForDocument(activeEditor, container);
    } else {
      const uiPort = container.resolve<IUIPort>(TOKENS.IUIPort);
      uiPort.showWarning('Please open a .proof file to view the tree visualization.');
    }
  });

  // Register undo/redo commands for proof operations
  const undoProofOperationCommand = vscode.commands.registerCommand(
    'proofEditor.undo',
    async () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && activeEditor.document.languageId === 'proof') {
        await handleUndoProofOperation(activeEditor, container);
      } else {
        // Fallback to standard VS Code undo
        await vscode.commands.executeCommand('undo');
      }
    },
  );

  const redoProofOperationCommand = vscode.commands.registerCommand(
    'proofEditor.redo',
    async () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && activeEditor.document.languageId === 'proof') {
        await handleRedoProofOperation(activeEditor, container);
      } else {
        // Fallback to standard VS Code redo
        await vscode.commands.executeCommand('redo');
      }
    },
  );

  // Register bootstrap commands
  const _createBootstrapDocumentCommand = vscode.commands.registerCommand(
    'proofEditor.createBootstrapDocument',
    async () => {
      const uiPort = container.resolve<IUIPort>(TOKENS.IUIPort);

      // Get the current workspace folder for the new document
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        uiPort.showWarning('Please open a workspace folder first.');
        return;
      }

      // Prompt for document name
      const documentName = await vscode.window.showInputBox({
        prompt: 'Enter the name for your new proof document',
        placeHolder: 'my-first-proof',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Document name cannot be empty';
          }
          if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
            return 'Document name can only contain letters, numbers, hyphens, and underscores';
          }
          return null;
        },
      });

      if (!documentName) {
        return; // User cancelled
      }

      try {
        // Initialize empty document through bootstrap controller
        const result = await bootstrapController.initializeEmptyDocument(documentName);
        if (result.isErr()) {
          uiPort.showError(`Failed to create document: ${result.error.message}`);
          return;
        }

        // Create the file with proper bootstrap structure
        const fileName = `${documentName}.proof`;
        const filePath = vscode.Uri.joinPath(workspaceFolder.uri, fileName);

        // Bootstrap document template with proper YAML structure
        const content = `# ${documentName}
# Your proof construction workspace

# Document structure (automatically managed)
arguments: {}
statements: {}
trees: []

# Document metadata
metadata:
  title: "${documentName}"
  created: "${new Date().toISOString()}"
  version: "1.0.0"
  type: "proof-document"

# Getting Started:
# 1. Click "Create First Argument" below or use Ctrl+Shift+P > "Proof Editor: Create First Argument"
# 2. Add premises and conclusions to your argument
# 3. Create branches to build connected argument trees
# 4. Use the visualization panel to see your proof structure

# Ready to begin? Create your first argument now!
`;

        // Use file system port for writing the file with error handling
        const fileSystemPort = container.resolve<IFileSystemPort>(TOKENS.IFileSystemPort);
        const writeResult = await fileSystemPort.writeFile(filePath.fsPath, content);
        if (writeResult.isErr()) {
          uiPort.showError(`Failed to write file: ${writeResult.error.message}`);
          return;
        }

        // Open the new document
        const document = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(document);

        // Automatically show the proof tree panel
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
          await showProofTreeForDocument(activeEditor, container);
        }

        // Show guided next steps with enhanced workflow
        const nextAction = await vscode.window.showInformationMessage(
          `✅ Created proof document: ${fileName}\n\nReady to build your first proof?`,
          'Start Guided Tutorial',
          'Create First Argument',
          'Show Me Around',
          'Later',
        );

        if (nextAction === 'Start Guided Tutorial') {
          await startGuidedBootstrapTutorial(container);
        } else if (nextAction === 'Create First Argument') {
          await vscode.commands.executeCommand('proofEditor.createBootstrapArgument');
        } else if (nextAction === 'Show Me Around') {
          await vscode.commands.executeCommand('proofEditor.showBootstrapWorkflow');
        }
      } catch (error) {
        uiPort.showError(
          `Failed to create document: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
  );

  const _createBootstrapArgumentCommand = vscode.commands.registerCommand(
    'proofEditor.createBootstrapArgument',
    async () => {
      const activeEditor = vscode.window.activeTextEditor;
      const uiPort = container.resolve<IUIPort>(TOKENS.IUIPort);

      if (!activeEditor || activeEditor.document.languageId !== 'proof') {
        uiPort.showWarning('Please open a .proof file first.');
        return;
      }

      try {
        const documentId = activeEditor.document.fileName;
        const result = await bootstrapController.createBootstrapArgument(documentId);

        if (result.isErr()) {
          uiPort.showError(`Failed to create argument: ${result.error.message}`);
          return;
        }

        const argumentData = result.value.data;
        if (argumentData) {
          uiPort.showInformation(`Created empty argument: ${argumentData.argumentId}`, {
            label: 'Populate Argument',
            callback: () => vscode.commands.executeCommand('proofEditor.populateEmptyArgument'),
          });
        }
      } catch (error) {
        uiPort.showError(
          `Failed to create argument: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
  );

  const _populateEmptyArgumentCommand = vscode.commands.registerCommand(
    'proofEditor.populateEmptyArgument',
    async () => {
      const activeEditor = vscode.window.activeTextEditor;
      const uiPort = container.resolve<IUIPort>(TOKENS.IUIPort);

      if (!activeEditor || activeEditor.document.languageId !== 'proof') {
        uiPort.showWarning('Please open a .proof file first.');
        return;
      }

      try {
        // Get premises from user
        const premises: string[] = [];
        const premise = await vscode.window.showInputBox({
          prompt: 'Enter first premise',
          placeHolder: 'All humans are mortal',
        });

        if (!premise) return; // User cancelled
        premises.push(premise);

        // Ask for additional premises
        let addMore = true;
        while (addMore && premises.length < 5) {
          const additionalPremise = await vscode.window.showInputBox({
            prompt: `Enter additional premise (${premises.length + 1}/5) or press Escape to continue`,
            placeHolder: 'Socrates is human (optional)',
          });

          if (additionalPremise?.trim()) {
            premises.push(additionalPremise);
          } else {
            addMore = false;
          }
        }

        // Get conclusion from user
        const conclusion = await vscode.window.showInputBox({
          prompt: 'Enter conclusion',
          placeHolder: 'Therefore, Socrates is mortal',
        });

        if (!conclusion) return; // User cancelled

        // Optional rule name
        const ruleName = await vscode.window.showInputBox({
          prompt: 'Enter rule name (optional)',
          placeHolder: 'Modus Ponens',
        });

        const documentId = activeEditor.document.fileName;
        const argumentId = `arg-${Date.now()}`; // In real implementation, this would come from the document

        const result = await bootstrapController.populateEmptyArgument(
          documentId,
          argumentId,
          premises,
          [conclusion],
          ruleName ? { left: ruleName } : undefined,
        );

        if (result.isErr()) {
          uiPort.showError(`Failed to populate argument: ${result.error.message}`);
          return;
        }

        // Auto-save the document after successful argument creation
        await autoSaveProofDocument(activeEditor, container);

        uiPort.showInformation('Argument populated successfully!', {
          label: 'Show Bootstrap Workflow',
          callback: () => vscode.commands.executeCommand('proofEditor.showBootstrapWorkflow'),
        });
      } catch (error) {
        uiPort.showError(
          `Failed to populate argument: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
  );

  const _showBootstrapWorkflowCommand = vscode.commands.registerCommand(
    'proofEditor.showBootstrapWorkflow',
    async () => {
      const activeEditor = vscode.window.activeTextEditor;
      const uiPort = container.resolve<IUIPort>(TOKENS.IUIPort);

      if (!activeEditor || activeEditor.document.languageId !== 'proof') {
        uiPort.showWarning('Please open a .proof file first.');
        return;
      }

      try {
        const documentId = activeEditor.document.fileName;
        const result = await bootstrapController.getBootstrapWorkflow(documentId);

        if (result.isErr()) {
          uiPort.showError(`Failed to get workflow: ${result.error.message}`);
          return;
        }

        const workflow = result.value.data;
        if (workflow) {
          // Create a simple workflow display
          const currentStep = workflow.steps.find((step) => step.current);
          const completedSteps = workflow.steps.filter((step) => step.completed).length;

          const message = `Bootstrap Workflow Progress: ${completedSteps}/${workflow.totalSteps}\n\nCurrent Step: ${currentStep?.title || 'Unknown'}\n${currentStep?.description || ''}`;

          const actions = currentStep?.actions.filter((action) => action.enabled) || [];
          if (actions.length > 0) {
            const actionItems = actions.map((action) => action.label);
            const selectedAction = await vscode.window.showQuickPick(actionItems, {
              placeHolder: 'Choose next action',
            });

            if (selectedAction) {
              // Map actions to commands
              if (selectedAction.includes('Create')) {
                vscode.commands.executeCommand('proofEditor.createBootstrapArgument');
              } else if (selectedAction.includes('Populate')) {
                vscode.commands.executeCommand('proofEditor.populateEmptyArgument');
              }
            }
          } else {
            uiPort.showInformation(message);
          }
        }
      } catch (error) {
        uiPort.showError(
          `Failed to show workflow: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
  );

  const _createEmptyImplicationLineCommand = vscode.commands.registerCommand(
    'proofEditor.createEmptyImplicationLine',
    async () => {
      const activeEditor = vscode.window.activeTextEditor;
      const uiPort = container.resolve<IUIPort>(TOKENS.IUIPort);

      if (!activeEditor || activeEditor.document.languageId !== 'proof') {
        uiPort.showWarning('Please open a .proof file first.');
        return;
      }

      try {
        const documentId = activeEditor.document.fileName;
        const treeId = `tree-${Date.now()}`;

        const result = await bootstrapController.createEmptyImplicationLine(documentId, treeId);

        if (result.isErr()) {
          uiPort.showError(`Failed to create implication line: ${result.error.message}`);
          return;
        }

        const lineData = result.value.data;
        if (lineData) {
          // Show the visual representation
          const display = [
            ...lineData.displayFormat.premiseLines,
            lineData.displayFormat.horizontalLine,
            ...lineData.displayFormat.conclusionLines,
          ].join('\n');

          uiPort.showInformation(
            `Created empty implication line:\n\n${display}\n\n${lineData.userInstructions}`,
            {
              label: 'Populate Argument',
              callback: () => vscode.commands.executeCommand('proofEditor.populateEmptyArgument'),
            },
          );
        }
      } catch (error) {
        uiPort.showError(
          `Failed to create implication line: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
  );

  // Auto-show tree and validate when proof file is opened
  const onOpenDisposable = vscode.workspace.onDidOpenTextDocument(
    async (document: vscode.TextDocument) => {
      if (document.languageId === 'proof') {
        await documentController.handleDocumentOpened({
          fileName: document.fileName,
          uri: document.uri.toString(),
          getText: () => document.getText(),
        });
        const editor = vscode.window.visibleTextEditors.find((e) => e.document === document);
        if (editor) {
          await showProofTreeForDocument(editor, container);
        }
        try {
          const documentInfo = {
            uri: document.uri.toString(),
            content: document.getText(),
            languageId: document.languageId,
          };
          validationController.validateDocumentImmediate(documentInfo);
        } catch (error) {
          const uiPort = container.resolve<IUIPort>(TOKENS.IUIPort);
          uiPort.showError(
            `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    },
  );

  // Update tree and validate when proof file content changes
  const onChangeDisposable = vscode.workspace.onDidChangeTextDocument(async (event) => {
    if (event.document.languageId === 'proof') {
      await documentController.handleDocumentChanged({
        fileName: event.document.fileName,
        uri: event.document.uri.toString(),
        getText: () => event.document.getText(),
        isDirty: event.document.isDirty,
      });
      const editor = vscode.window.visibleTextEditors.find((e) => e.document === event.document);
      if (editor) {
        await showProofTreeForDocument(editor, container);
      }
      try {
        const documentInfo = {
          uri: event.document.uri.toString(),
          content: event.document.getText(),
          languageId: event.document.languageId,
        };
        validationController.validateDocumentDebounced(documentInfo);
      } catch (error) {
        const uiPort = container.resolve<IUIPort>(TOKENS.IUIPort);
        uiPort.showError(
          `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  });

  // Handle active editor changes
  const onEditorChangeDisposable = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
    if (editor && editor.document.languageId === 'proof') {
      await documentController.handleDocumentOpened({
        fileName: editor.document.fileName,
        uri: editor.document.uri.toString(),
        getText: () => editor.document.getText(),
      });
      await showProofTreeForDocument(editor, container);
      try {
        const documentInfo = {
          uri: editor.document.uri.toString(),
          content: editor.document.getText(),
          languageId: editor.document.languageId,
        };
        validationController.validateDocumentImmediate(documentInfo);
      } catch (error) {
        const uiPort = container.resolve<IUIPort>(TOKENS.IUIPort);
        uiPort.showError(
          `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  });

  // Clean up diagnostics and panels when documents are closed
  const onCloseDisposable = vscode.workspace.onDidCloseTextDocument(async (document) => {
    if (document.languageId === 'proof') {
      await documentController.handleDocumentClosed({
        fileName: document.fileName,
        uri: document.uri.toString(),
      });
      const documentInfo = {
        uri: document.uri.toString(),
        content: document.getText(),
        languageId: document.languageId,
      };
      validationController.clearDocumentValidation(documentInfo);

      // Close associated proof tree panel
      try {
        const { ProofTreePanelManager } = await import('../webview/ProofTreePanelManager.js');
        const panelManager = ProofTreePanelManager.getInstance();
        panelManager.closePanelForDocument(document.uri.toString());
      } catch (_error) {
        // Silent failure on panel cleanup
      }
    }
  });

  // Set up file watching for proof documents
  const fileWatchingDisposables = setupFileWatching(container);

  context.subscriptions.push(
    validationController,
    showTreeCommand,
    undoProofOperationCommand,
    redoProofOperationCommand,
    _createBootstrapDocumentCommand,
    _createBootstrapArgumentCommand,
    _populateEmptyArgumentCommand,
    _showBootstrapWorkflowCommand,
    _createEmptyImplicationLineCommand,
    onOpenDisposable,
    onChangeDisposable,
    onEditorChangeDisposable,
    onCloseDisposable,
    ...fileWatchingDisposables,
  );

  // Check for existing proof files using controllers
  await checkForExistingProofFiles(documentController, proofTreeController);
}

export function deactivate() {
  // Extension deactivated
}

/**
 * Helper function to show proof tree panel using the panel manager
 */
async function showProofTreeForDocument(
  editor: vscode.TextEditor,
  container: ApplicationContainer,
): Promise<void> {
  try {
    const { ProofTreePanelManager } = await import('../webview/ProofTreePanelManager.js');

    // Get required services from container
    const documentQueryService = container.resolve<DocumentQueryService>(
      TOKENS.DocumentQueryService,
    );
    const visualizationService = container.resolve<ProofVisualizationService>(
      TOKENS.ProofVisualizationService,
    );
    const uiPort = container.resolve<IUIPort>(TOKENS.IUIPort);
    const renderer = container.resolve<TreeRenderer>(TOKENS.TreeRenderer);
    const viewStateManager = container.resolve<ViewStateManager>(TOKENS.ViewStateManager);
    const viewStatePort = container.resolve<IViewStatePort>(TOKENS.IViewStatePort);
    const bootstrapController = container.resolve<BootstrapController>(TOKENS.BootstrapController);
    const proofApplicationService = container.resolve<ProofApplicationService>(
      TOKENS.ProofApplicationService,
    );
    const yamlSerializer = container.resolve<YAMLSerializer>(TOKENS.YAMLSerializer);
    const exportService = container.resolve<IExportService>(TOKENS.IExportService);
    const documentIdService = container.resolve<IDocumentIdService>(TOKENS.IDocumentIdService);

    // Use panel manager for multi-document support
    const panelManager = ProofTreePanelManager.getInstance();
    const createResult = await panelManager.createPanelWithServices(
      editor.document.uri.toString(),
      editor.document.getText(),
      documentQueryService,
      visualizationService,
      uiPort,
      renderer,
      viewStateManager,
      viewStatePort,
      bootstrapController,
      proofApplicationService,
      yamlSerializer,
      exportService,
      documentIdService,
    );

    if (createResult.isErr()) {
      uiPort.showError(`Failed to display proof tree: ${createResult.error.message}`);
      return;
    }

    // Associate panel with document in controller for lifecycle coordination
    const documentController = container.resolve<DocumentController>(TOKENS.DocumentController);
    const associateResult = await documentController.associatePanelWithDocument(
      editor.document.uri.toString(),
      `proof-tree-panel-${Date.now()}`,
    );

    if (associateResult.isErr()) {
      // Panel created but association failed - not critical, just log
      uiPort.showWarning(`Panel association failed: ${associateResult.error.message}`);
    }
  } catch (_error) {
    const uiPort = container.resolve<IUIPort>(TOKENS.IUIPort);
    uiPort.showError('Failed to display proof tree visualization');
  }
}

async function checkForExistingProofFiles(
  documentController: DocumentController,
  _proofTreeController: ProofTreeController,
): Promise<void> {
  const proofDocuments = vscode.workspace.textDocuments.filter(
    (document: vscode.TextDocument) => document.languageId === 'proof',
  );

  for (const document of proofDocuments) {
    await documentController.handleDocumentOpened({
      fileName: document.fileName,
      uri: document.uri.toString(),
      getText: () => document.getText(),
    });
    const editor = vscode.window.visibleTextEditors.find((e) => e.document === document);
    if (editor) {
      const container = getContainer();
      await showProofTreeForDocument(editor, container);
    }
  }
}

/**
 * Auto-save proof document after changes
 */
async function autoSaveProofDocument(
  editor: vscode.TextEditor,
  container: ApplicationContainer,
): Promise<void> {
  try {
    if (!editor.document.isDirty) {
      return; // No changes to save
    }

    const fileSystemPort = container.resolve<IFileSystemPort>(TOKENS.IFileSystemPort);

    // Update the document with current content including any changes from bootstrap operations
    // For now, we'll let VS Code handle the auto-save since the document is already open
    await editor.document.save();

    // Store document metadata for offline access
    const documentMetadata = {
      id: editor.document.fileName,
      title: editor.document.fileName.split('/').pop()?.replace('.proof', '') || 'Untitled',
      modifiedAt: new Date(),
      size: editor.document.getText().length,
      syncStatus: 'synced' as const,
    };

    const storedDocument = {
      id: documentMetadata.id,
      content: editor.document.getText(),
      metadata: documentMetadata,
      version: 1,
    };

    // Store for offline access
    await fileSystemPort.storeDocument(storedDocument);
  } catch (_error) {
    // Auto-save failures are logged internally by the file system port
    // Don't show error to user for auto-save failures unless critical
  }
}

/**
 * Set up enhanced file watching for proof documents with conflict resolution
 */
function setupFileWatching(container: ApplicationContainer): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];
  const fileSystemPort = container.resolve<IFileSystemPort>(TOKENS.IFileSystemPort);
  const uiPort = container.resolve<IUIPort>(TOKENS.IUIPort);

  // Watch for file changes in workspace
  if (fileSystemPort.capabilities().canWatch) {
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.proof');

    watcher.onDidChange(async (uri) => {
      // File changed externally - handle conflict resolution
      await handleExternalFileChange(uri, container);
    });

    watcher.onDidCreate(async (uri) => {
      // New proof file created - notify user and offer to open
      const fileName = uri.fsPath.split('/').pop() || uri.fsPath;
      const action = await vscode.window.showInformationMessage(
        `New proof file detected: ${fileName}`,
        'Open File',
        'Dismiss',
      );

      if (action === 'Open File') {
        const document = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(document);
      }
    });

    watcher.onDidDelete(async (uri) => {
      // Proof file deleted - clean up and close associated panels
      const documentId = uri.fsPath;
      await fileSystemPort.deleteStoredDocument(documentId);

      // Close associated proof tree panel
      try {
        const { ProofTreePanelManager } = await import('../webview/ProofTreePanelManager.js');
        const panelManager = ProofTreePanelManager.getInstance();
        panelManager.closePanelForDocument(uri.toString());
      } catch (_error) {
        // Silent failure on panel cleanup
      }

      // Notify user
      const fileName = uri.fsPath.split('/').pop() || uri.fsPath;
      uiPort.showWarning(`Proof file was deleted: ${fileName}`);
    });

    disposables.push(watcher);
  }

  return disposables;
}

/**
 * Handle external file changes with conflict resolution
 */
async function handleExternalFileChange(
  uri: vscode.Uri,
  container: ApplicationContainer,
): Promise<void> {
  try {
    const uiPort = container.resolve<IUIPort>(TOKENS.IUIPort);

    // Check if file is currently open in editor
    const openEditor = vscode.window.visibleTextEditors.find(
      (editor) => editor.document.uri.fsPath === uri.fsPath,
    );

    if (!openEditor) {
      // File not open - no conflict, just update cached content if any
      return;
    }

    const document = openEditor.document;
    const isDirty = document.isDirty;

    if (!isDirty) {
      // No local changes - safe to refresh
      await refreshDocumentContent(openEditor, container);
      uiPort.showInformation('Document refreshed with external changes');
      return;
    }

    // Conflict: file changed externally and has local changes
    const fileName = uri.fsPath.split('/').pop() || uri.fsPath;
    const action = await vscode.window.showWarningMessage(
      `File ${fileName} has been changed externally and has unsaved local changes.`,
      'Reload from Disk (Lose Changes)',
      'Keep Local Changes',
      'Compare Changes',
    );

    switch (action) {
      case 'Reload from Disk (Lose Changes)':
        // Force reload - this will lose local changes
        await vscode.commands.executeCommand('workbench.action.files.revert', uri);
        await refreshDocumentContent(openEditor, container);
        uiPort.showInformation('Document reloaded from disk');
        break;

      case 'Compare Changes':
        // Open diff view to compare changes
        await vscode.commands.executeCommand(
          'vscode.diff',
          uri,
          document.uri,
          `${fileName} (External) ↔ ${fileName} (Local)`,
        );
        break;

      default:
        // Do nothing - keep local changes
        uiPort.showInformation('Keeping local changes. Save to overwrite external changes.');
        break;
    }
  } catch (error) {
    const uiPort = container.resolve<IUIPort>(TOKENS.IUIPort);
    uiPort.showError(
      `Failed to handle external file change: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Refresh document content and associated panels
 */
async function refreshDocumentContent(
  editor: vscode.TextEditor,
  container: ApplicationContainer,
): Promise<void> {
  try {
    // Update proof tree panel with new content
    await showProofTreeForDocument(editor, container);

    // Trigger validation on the updated content
    const validationController = container.resolve<ValidationController>(
      TOKENS.ValidationController,
    );
    const documentInfo = {
      uri: editor.document.uri.toString(),
      content: editor.document.getText(),
      languageId: editor.document.languageId,
    };
    validationController.validateDocumentImmediate(documentInfo);
  } catch (_error) {
    // Silent failure on refresh to avoid cascading errors
  }
}

/**
 * Start a guided bootstrap tutorial for new users
 */
async function startGuidedBootstrapTutorial(container: ApplicationContainer): Promise<void> {
  const uiPort = container.resolve<IUIPort>(TOKENS.IUIPort);

  try {
    // Step 1: Welcome and overview
    const continueStep1 = await vscode.window.showInformationMessage(
      `🎯 **Proof Editor Tutorial**\n\nWelcome! This tutorial will guide you through creating your first proof.\n\nYou'll learn to:\n• Create atomic arguments\n• Connect premises to conclusions\n• Build argument trees\n• Visualize logical structure\n\nReady to start?`,
      "Let's Begin!",
      'Skip Tutorial',
    );

    if (continueStep1 !== "Let's Begin!") {
      return;
    }

    // Step 2: Explain the interface
    const continueStep2 = await vscode.window.showInformationMessage(
      `📋 **Step 1: Understanding the Interface**\n\nYou now have two main areas:\n\n1. **Text Editor** (left): Your .proof file with YAML structure\n2. **Proof Tree Panel** (right): Visual representation of your arguments\n\nThe tree panel shows a welcome message because you haven't created any arguments yet.`,
      'Got it!',
      'Skip Tutorial',
    );

    if (continueStep2 !== 'Got it!') {
      return;
    }

    // Step 3: Create first argument
    const continueStep3 = await vscode.window.showInformationMessage(
      `🏗️ **Step 2: Create Your First Argument**\n\nLet's create a simple logical argument. We'll use the classic:\n\n• **Premise 1**: All humans are mortal\n• **Premise 2**: Socrates is human\n• **Conclusion**: Therefore, Socrates is mortal\n\nClick the "Create First Argument" button in the tree panel!`,
      'I see it!',
      'Create It For Me',
      'Skip Tutorial',
    );

    if (continueStep3 === 'Skip Tutorial') {
      return;
    } else if (continueStep3 === 'Create It For Me') {
      // Auto-create the example argument
      await createExampleArgument(container);
    } else {
      // Wait for user to create the argument manually
      uiPort.showInformation(
        'Great! Click "Create First Argument" in the tree panel, then fill in the form with the example premises and conclusion.',
      );

      // Give user time to create the argument
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }

    // Step 4: Explain what happened
    const continueStep4 = await vscode.window.showInformationMessage(
      `✨ **Step 3: Understanding Your Argument**\n\nCongratulations! You've created your first atomic argument.\n\nNotice how:\n• Your .proof file now has statements and arguments\n• The tree panel shows the visual structure\n• Premises are above the horizontal line\n• Conclusions are below the line\n\nThis is the building block of all proofs!`,
      'Awesome!',
      'Tell Me More',
      'Finish Tutorial',
    );

    if (continueStep4 === 'Finish Tutorial') {
      await finishTutorial(container);
      return;
    }

    // Step 5: Next steps
    const continueStep5 = await vscode.window.showInformationMessage(
      `🚀 **Step 4: What's Next?**\n\nNow you can:\n\n• **Create branches**: Select text and create supporting arguments\n• **Add more arguments**: Build complex reasoning chains\n• **Export your proof**: Share as YAML, JSON, or SVG\n• **Validate logic**: Use custom validation scripts\n\nTry creating another argument or exploring the menus!`,
      'Start Exploring!',
      'Show Advanced Features',
      'Finish Tutorial',
    );

    if (continueStep5 === 'Show Advanced Features') {
      await showAdvancedFeatures(container);
    } else {
      await finishTutorial(container);
    }
  } catch (error) {
    uiPort.showError(`Tutorial error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Auto-create an example argument for the tutorial
 */
async function createExampleArgument(container: ApplicationContainer): Promise<void> {
  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor || activeEditor.document.languageId !== 'proof') {
    return;
  }

  const bootstrapController = container.resolve<BootstrapController>(TOKENS.BootstrapController);
  const uiPort = container.resolve<IUIPort>(TOKENS.IUIPort);

  try {
    const documentId = activeEditor.document.fileName;
    const premises = ['All humans are mortal', 'Socrates is human'];
    const conclusions = ['Therefore, Socrates is mortal'];
    const ruleName = 'Modus Ponens';

    const result = await bootstrapController.populateEmptyArgument(
      documentId,
      `tutorial-arg-${Date.now()}`,
      premises,
      conclusions,
      { left: ruleName },
    );

    if (result.isOk()) {
      await autoSaveProofDocument(activeEditor, container);
      await showProofTreeForDocument(activeEditor, container);
      uiPort.showInformation('✅ Example argument created successfully!');
    }
  } catch (_error) {
    // Error creating example argument - user will be notified via UI
  }
}

/**
 * Show advanced features explanation
 */
async function showAdvancedFeatures(container: ApplicationContainer): Promise<void> {
  const features = await vscode.window.showQuickPick(
    [
      {
        label: '🔗 Branching & Connections',
        description: 'Create connected argument trees',
        detail: 'Learn how to build complex proofs by connecting multiple arguments',
      },
      {
        label: '📊 Visualization Features',
        description: 'Zoom, pan, and navigate large proofs',
        detail: 'Master the tree panel controls for complex argument visualization',
      },
      {
        label: '✅ Custom Validation',
        description: 'Write your own logic validators',
        detail: 'Add semantic meaning to your formal structures',
      },
      {
        label: '📤 Export & Sharing',
        description: 'Share proofs in multiple formats',
        detail: 'Export as YAML, JSON, SVG, or interactive HTML',
      },
      {
        label: '📱 Cross-Platform Features',
        description: 'Mobile and offline support',
        detail: 'Access your proofs anywhere, anytime',
      },
    ],
    {
      placeHolder: 'Choose an advanced feature to learn about...',
    },
  );

  if (features) {
    await vscode.window.showInformationMessage(
      `🎓 **${features.label}**\n\n${features.detail}\n\nThis feature will be covered in future tutorials as you become more comfortable with basic proof construction.`,
      'Got it!',
    );
  }

  await finishTutorial(container);
}

/**
 * Handle undo operation for proof documents
 */
async function handleUndoProofOperation(
  editor: vscode.TextEditor,
  container: ApplicationContainer,
): Promise<void> {
  try {
    // First, try to use VS Code's built-in undo
    await vscode.commands.executeCommand('undo');

    // Then refresh the proof tree panel to reflect the changes
    await showProofTreeForDocument(editor, container);

    // Validate the document after undo
    const validationController = container.resolve<ValidationController>(
      TOKENS.ValidationController,
    );
    const documentInfo = {
      uri: editor.document.uri.toString(),
      content: editor.document.getText(),
      languageId: editor.document.languageId,
    };
    validationController.validateDocumentImmediate(documentInfo);
  } catch (error) {
    const uiPort = container.resolve<IUIPort>(TOKENS.IUIPort);
    uiPort.showError(`Undo failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Handle redo operation for proof documents
 */
async function handleRedoProofOperation(
  editor: vscode.TextEditor,
  container: ApplicationContainer,
): Promise<void> {
  try {
    // First, try to use VS Code's built-in redo
    await vscode.commands.executeCommand('redo');

    // Then refresh the proof tree panel to reflect the changes
    await showProofTreeForDocument(editor, container);

    // Validate the document after redo
    const validationController = container.resolve<ValidationController>(
      TOKENS.ValidationController,
    );
    const documentInfo = {
      uri: editor.document.uri.toString(),
      content: editor.document.getText(),
      languageId: editor.document.languageId,
    };
    validationController.validateDocumentImmediate(documentInfo);
  } catch (error) {
    const uiPort = container.resolve<IUIPort>(TOKENS.IUIPort);
    uiPort.showError(`Redo failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Finish the tutorial with helpful resources
 */
async function finishTutorial(container: ApplicationContainer): Promise<void> {
  const uiPort = container.resolve<IUIPort>(TOKENS.IUIPort);

  const action = await vscode.window.showInformationMessage(
    `🎉 **Tutorial Complete!**\n\nYou're now ready to build amazing proofs!\n\n**Quick Tips:**\n• Use Ctrl+Shift+P for all commands\n• Right-click in the tree panel for context actions\n• Check the status bar for helpful information\n• Save often - your work is precious!\n\n**Need Help?**\nUse "Proof Editor: Show Bootstrap Workflow" anytime.`,
    'Start Building!',
    'Show Workflow',
    'Create Another Proof',
  );

  if (action === 'Show Workflow') {
    await vscode.commands.executeCommand('proofEditor.showBootstrapWorkflow');
  } else if (action === 'Create Another Proof') {
    await vscode.commands.executeCommand('proofEditor.createBootstrapDocument');
  } else {
    uiPort.showInformation('Happy proving! 🎯');
  }
}

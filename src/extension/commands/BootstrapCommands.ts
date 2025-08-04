import { err, ok, type Result } from 'neverthrow';
import * as vscode from 'vscode';
import type { IFileSystemPort } from '../../application/ports/IFileSystemPort.js';
import type { IUIPort } from '../../application/ports/IUIPort.js';
import {
  ActionLabel,
  DocumentContent,
  FilePath,
  NotificationMessage,
} from '../../domain/shared/value-objects/index.js';
import type { ApplicationContainer } from '../../infrastructure/di/container.js';
import { TOKENS } from '../../infrastructure/di/tokens.js';
import type { BootstrapController } from '../../presentation/controllers/BootstrapController.js';
import { autoSaveProofDocument, showProofTreeForDocument } from '../helpers/ProofTreeHelper.js';
import { TutorialService } from '../tutorial/TutorialService.js';

export class BootstrapCommands {
  private disposables: vscode.Disposable[] = [];
  private tutorialService: TutorialService;

  constructor(private readonly container: ApplicationContainer) {
    this.tutorialService = new TutorialService(container);
  }

  public registerCommands(): Result<vscode.Disposable[], Error> {
    try {
      this.registerCreateBootstrapDocumentCommand();
      this.registerCreateBootstrapArgumentCommand();
      this.registerPopulateEmptyArgumentCommand();
      this.registerShowBootstrapWorkflowCommand();
      this.registerCreateEmptyImplicationLineCommand();

      return ok(this.disposables);
    } catch (error) {
      return err(
        new Error(
          `Failed to register bootstrap commands: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  private registerCreateBootstrapDocumentCommand(): void {
    const command = vscode.commands.registerCommand(
      'proofEditor.createBootstrapDocument',
      async () => {
        const uiPort = this.container.resolve<IUIPort>(TOKENS.IUIPort);

        // Get the current workspace folder for the new document
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
          const warningResult = NotificationMessage.create('Please open a workspace folder first.');
          if (warningResult.isOk()) {
            uiPort.showWarning(warningResult.value);
          }
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
          const bootstrapController = this.container.resolve<BootstrapController>(
            TOKENS.BootstrapController,
          );

          // Initialize empty document through bootstrap controller
          const result = await bootstrapController.initializeEmptyDocument(documentName);
          if (result.isErr()) {
            const errorResult = NotificationMessage.create(
              `Failed to create document: ${result.error.message}`,
            );
            if (errorResult.isOk()) {
              uiPort.showError(errorResult.value);
            }
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
          const fileSystemPort = this.container.resolve<IFileSystemPort>(TOKENS.IFileSystemPort);
          const filePathResult = FilePath.create(filePath.fsPath);
          if (filePathResult.isErr()) {
            const errorResult = NotificationMessage.create(`Invalid file path: ${filePath.fsPath}`);
            if (errorResult.isOk()) {
              uiPort.showError(errorResult.value);
            }
            return;
          }
          const contentResult = DocumentContent.create(content);
          if (contentResult.isErr()) {
            const errorResult = NotificationMessage.create(
              `Invalid content: ${contentResult.error.message}`,
            );
            if (errorResult.isOk()) {
              uiPort.showError(errorResult.value);
            }
            return;
          }
          const writeResult = await fileSystemPort.writeFile(
            filePathResult.value,
            contentResult.value,
          );
          if (writeResult.isErr()) {
            const errorResult = NotificationMessage.create(
              `Failed to write file: ${writeResult.error.message}`,
            );
            if (errorResult.isOk()) {
              uiPort.showError(errorResult.value);
            }
            return;
          }

          // Open the new document
          const document = await vscode.workspace.openTextDocument(filePath);
          await vscode.window.showTextDocument(document);

          // Automatically show the proof tree panel
          const activeEditor = vscode.window.activeTextEditor;
          if (activeEditor) {
            await showProofTreeForDocument(activeEditor, this.container);
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
            await this.tutorialService.startGuidedBootstrapTutorial();
          } else if (nextAction === 'Create First Argument') {
            await vscode.commands.executeCommand('proofEditor.createBootstrapArgument');
          } else if (nextAction === 'Show Me Around') {
            await vscode.commands.executeCommand('proofEditor.showBootstrapWorkflow');
          }
        } catch (error) {
          const errorResult = NotificationMessage.create(
            `Failed to create document: ${error instanceof Error ? error.message : String(error)}`,
          );
          if (errorResult.isOk()) {
            uiPort.showError(errorResult.value);
          }
        }
      },
    );

    this.disposables.push(command);
  }

  private registerCreateBootstrapArgumentCommand(): void {
    const command = vscode.commands.registerCommand(
      'proofEditor.createBootstrapArgument',
      async () => {
        const activeEditor = vscode.window.activeTextEditor;
        const uiPort = this.container.resolve<IUIPort>(TOKENS.IUIPort);

        if (!activeEditor || activeEditor.document.languageId !== 'proof') {
          const warningResult = NotificationMessage.create('Please open a .proof file first.');
          if (warningResult.isOk()) {
            uiPort.showWarning(warningResult.value);
          }
          return;
        }

        try {
          const bootstrapController = this.container.resolve<BootstrapController>(
            TOKENS.BootstrapController,
          );
          const documentId = activeEditor.document.fileName;
          const result = await bootstrapController.createBootstrapArgument(documentId);

          if (result.isErr()) {
            const errorResult = NotificationMessage.create(
              `Failed to create argument: ${result.error.message}`,
            );
            if (errorResult.isOk()) {
              uiPort.showError(errorResult.value);
            }
            return;
          }

          const argumentData = result.value.data;
          if (argumentData) {
            const infoResult = NotificationMessage.create(
              `Created empty argument: ${argumentData.argumentId}`,
            );
            if (infoResult.isOk()) {
              uiPort.showInformation(infoResult.value, {
                label: ActionLabel.create('Populate Argument').unwrapOr(undefined as any),
                callback: () => vscode.commands.executeCommand('proofEditor.populateEmptyArgument'),
              });
            }
          }
        } catch (error) {
          const errorResult = NotificationMessage.create(
            `Failed to create argument: ${error instanceof Error ? error.message : String(error)}`,
          );
          if (errorResult.isOk()) {
            uiPort.showError(errorResult.value);
          }
        }
      },
    );

    this.disposables.push(command);
  }

  private registerPopulateEmptyArgumentCommand(): void {
    const command = vscode.commands.registerCommand(
      'proofEditor.populateEmptyArgument',
      async () => {
        const activeEditor = vscode.window.activeTextEditor;
        const uiPort = this.container.resolve<IUIPort>(TOKENS.IUIPort);

        if (!activeEditor || activeEditor.document.languageId !== 'proof') {
          const warningResult = NotificationMessage.create('Please open a .proof file first.');
          if (warningResult.isOk()) {
            uiPort.showWarning(warningResult.value);
          }
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

          const bootstrapController = this.container.resolve<BootstrapController>(
            TOKENS.BootstrapController,
          );
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
            const errorResult = NotificationMessage.create(
              `Failed to populate argument: ${result.error.message}`,
            );
            if (errorResult.isOk()) {
              uiPort.showError(errorResult.value);
            }
            return;
          }

          // Auto-save the document after successful argument creation
          await autoSaveProofDocument(activeEditor, this.container);

          const infoResult = NotificationMessage.create('Argument populated successfully!');
          if (infoResult.isOk()) {
            uiPort.showInformation(infoResult.value, {
              label: ActionLabel.create('Show Bootstrap Workflow').unwrapOr(undefined as any),
              callback: () => vscode.commands.executeCommand('proofEditor.showBootstrapWorkflow'),
            });
          }
        } catch (error) {
          const errorResult = NotificationMessage.create(
            `Failed to populate argument: ${error instanceof Error ? error.message : String(error)}`,
          );
          if (errorResult.isOk()) {
            uiPort.showError(errorResult.value);
          }
        }
      },
    );

    this.disposables.push(command);
  }

  private registerShowBootstrapWorkflowCommand(): void {
    const command = vscode.commands.registerCommand(
      'proofEditor.showBootstrapWorkflow',
      async () => {
        const activeEditor = vscode.window.activeTextEditor;
        const uiPort = this.container.resolve<IUIPort>(TOKENS.IUIPort);

        if (!activeEditor || activeEditor.document.languageId !== 'proof') {
          const warningResult = NotificationMessage.create('Please open a .proof file first.');
          if (warningResult.isOk()) {
            uiPort.showWarning(warningResult.value);
          }
          return;
        }

        try {
          const bootstrapController = this.container.resolve<BootstrapController>(
            TOKENS.BootstrapController,
          );
          const documentId = activeEditor.document.fileName;
          const result = await bootstrapController.getBootstrapWorkflow(documentId);

          if (result.isErr()) {
            const errorResult = NotificationMessage.create(
              `Failed to get workflow: ${result.error.message}`,
            );
            if (errorResult.isOk()) {
              uiPort.showError(errorResult.value);
            }
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
              const infoResult = NotificationMessage.create(message);
              if (infoResult.isOk()) {
                uiPort.showInformation(infoResult.value);
              }
            }
          }
        } catch (error) {
          const errorResult = NotificationMessage.create(
            `Failed to show workflow: ${error instanceof Error ? error.message : String(error)}`,
          );
          if (errorResult.isOk()) {
            uiPort.showError(errorResult.value);
          }
        }
      },
    );

    this.disposables.push(command);
  }

  private registerCreateEmptyImplicationLineCommand(): void {
    const command = vscode.commands.registerCommand(
      'proofEditor.createEmptyImplicationLine',
      async () => {
        const activeEditor = vscode.window.activeTextEditor;
        const uiPort = this.container.resolve<IUIPort>(TOKENS.IUIPort);

        if (!activeEditor || activeEditor.document.languageId !== 'proof') {
          const warningResult = NotificationMessage.create('Please open a .proof file first.');
          if (warningResult.isOk()) {
            uiPort.showWarning(warningResult.value);
          }
          return;
        }

        try {
          const bootstrapController = this.container.resolve<BootstrapController>(
            TOKENS.BootstrapController,
          );
          const documentId = activeEditor.document.fileName;
          const treeId = `tree-${Date.now()}`;

          const result = await bootstrapController.createEmptyImplicationLine(documentId, treeId);

          if (result.isErr()) {
            const errorResult = NotificationMessage.create(
              `Failed to create implication line: ${result.error.message}`,
            );
            if (errorResult.isOk()) {
              uiPort.showError(errorResult.value);
            }
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

            const infoResult = NotificationMessage.create(
              `Created empty implication line:\n\n${display}\n\n${lineData.userInstructions}`,
            );
            if (infoResult.isOk()) {
              uiPort.showInformation(infoResult.value, {
                label: ActionLabel.create('Populate Argument').unwrapOr(undefined as any),
                callback: () => vscode.commands.executeCommand('proofEditor.populateEmptyArgument'),
              });
            }
          }
        } catch (error) {
          const errorResult = NotificationMessage.create(
            `Failed to create implication line: ${error instanceof Error ? error.message : String(error)}`,
          );
          if (errorResult.isOk()) {
            uiPort.showError(errorResult.value);
          }
        }
      },
    );

    this.disposables.push(command);
  }

  public dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
  }
}

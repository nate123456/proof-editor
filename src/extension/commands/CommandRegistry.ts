import { err, ok, type Result } from 'neverthrow';
import * as vscode from 'vscode';
import type { IUIPort } from '../../application/ports/IUIPort.js';
import type { ApplicationContainer } from '../../infrastructure/di/container.js';
import { TOKENS } from '../../infrastructure/di/tokens.js';
import type { ValidationController } from '../../validation/ValidationController.js';
import { showProofTreeForDocument } from '../helpers/ProofTreeHelper.js';
import { BootstrapCommands } from './BootstrapCommands.js';

export class CommandRegistry {
  private disposables: vscode.Disposable[] = [];

  constructor(
    private readonly container: ApplicationContainer,
    private readonly bootstrapCommands: BootstrapCommands,
  ) {}

  public registerCommands(context: vscode.ExtensionContext): Result<vscode.Disposable[], Error> {
    try {
      // Register show tree command
      this.registerShowTreeCommand();

      // Register undo/redo commands
      this.registerUndoRedoCommands();

      // Register bootstrap commands
      const bootstrapResult = this.bootstrapCommands.registerCommands();
      if (bootstrapResult.isErr()) {
        return err(bootstrapResult.error);
      }
      this.disposables.push(...bootstrapResult.value);

      // Add all disposables to extension context
      context.subscriptions.push(...this.disposables);

      return ok(this.disposables);
    } catch (error) {
      return err(
        new Error(
          `Failed to register commands: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  private registerShowTreeCommand(): void {
    const showTreeCommand = vscode.commands.registerCommand('proofEditor.showTree', async () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && activeEditor.document.languageId === 'proof') {
        await showProofTreeForDocument(activeEditor, this.container);
      } else {
        const uiPort = this.container.resolve<IUIPort>(TOKENS.IUIPort);
        uiPort.showWarning('Please open a .proof file to view the tree visualization.');
      }
    });

    this.disposables.push(showTreeCommand);
  }

  private registerUndoRedoCommands(): void {
    const undoProofOperationCommand = vscode.commands.registerCommand(
      'proofEditor.undo',
      async () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.languageId === 'proof') {
          await this.handleUndoProofOperation(activeEditor);
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
          await this.handleRedoProofOperation(activeEditor);
        } else {
          // Fallback to standard VS Code redo
          await vscode.commands.executeCommand('redo');
        }
      },
    );

    this.disposables.push(undoProofOperationCommand, redoProofOperationCommand);
  }

  private async handleUndoProofOperation(editor: vscode.TextEditor): Promise<void> {
    try {
      // First, try to use VS Code's built-in undo
      await vscode.commands.executeCommand('undo');

      // Then refresh the proof tree panel to reflect the changes
      await showProofTreeForDocument(editor, this.container);

      // Validate the document after undo
      const validationController = this.container.resolve<ValidationController>(
        TOKENS.ValidationController,
      );
      const documentInfo = {
        uri: editor.document.uri.toString(),
        content: editor.document.getText(),
        languageId: editor.document.languageId,
      };
      validationController.validateDocumentImmediate(documentInfo);
    } catch (error) {
      const uiPort = this.container.resolve<IUIPort>(TOKENS.IUIPort);
      uiPort.showError(`Undo failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleRedoProofOperation(editor: vscode.TextEditor): Promise<void> {
    try {
      // First, try to use VS Code's built-in redo
      await vscode.commands.executeCommand('redo');

      // Then refresh the proof tree panel to reflect the changes
      await showProofTreeForDocument(editor, this.container);

      // Validate the document after redo
      const validationController = this.container.resolve<ValidationController>(
        TOKENS.ValidationController,
      );
      const documentInfo = {
        uri: editor.document.uri.toString(),
        content: editor.document.getText(),
        languageId: editor.document.languageId,
      };
      validationController.validateDocumentImmediate(documentInfo);
    } catch (error) {
      const uiPort = this.container.resolve<IUIPort>(TOKENS.IUIPort);
      uiPort.showError(`Redo failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
  }
}

export function createCommandRegistry(
  container: ApplicationContainer,
  context: vscode.ExtensionContext,
): Result<CommandRegistry, Error> {
  try {
    const bootstrapCommands = new BootstrapCommands(container);
    const registry = new CommandRegistry(container, bootstrapCommands);
    const result = registry.registerCommands(context);

    if (result.isErr()) {
      return err(result.error);
    }

    return ok(registry);
  } catch (error) {
    return err(
      new Error(
        `Failed to create command registry: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
  }
}

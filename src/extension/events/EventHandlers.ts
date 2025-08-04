import { err, ok, type Result } from 'neverthrow';
import * as vscode from 'vscode';
import type { IUIPort } from '../../application/ports/IUIPort.js';
import { NotificationMessage } from '../../domain/shared/value-objects/index.js';
import type { ApplicationContainer } from '../../infrastructure/di/container.js';
import { TOKENS } from '../../infrastructure/di/tokens.js';
import type { DocumentController } from '../../presentation/controllers/DocumentController.js';
import type { ProofTreeController } from '../../presentation/controllers/ProofTreeController.js';
import type { ValidationController } from '../../validation/ValidationController.js';
import { showProofTreeForDocument } from '../helpers/ProofTreeHelper.js';

export class EventHandlers {
  private disposables: vscode.Disposable[] = [];

  constructor(
    private readonly container: ApplicationContainer,
    private readonly documentController: DocumentController,
    private readonly validationController: ValidationController,
  ) {}

  public registerEventHandlers(): Result<vscode.Disposable[], Error> {
    try {
      // Register document event handlers
      this.registerDocumentOpenHandler();
      this.registerDocumentChangeHandler();
      this.registerEditorChangeHandler();
      this.registerDocumentCloseHandler();

      return ok(this.disposables);
    } catch (error) {
      return err(
        new Error(
          `Failed to register event handlers: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  private registerDocumentOpenHandler(): void {
    const onOpenDisposable = vscode.workspace.onDidOpenTextDocument(
      async (document: vscode.TextDocument) => {
        if (document.languageId === 'proof') {
          await this.documentController.handleDocumentOpened({
            fileName: document.fileName,
            uri: document.uri.toString(),
            getText: () => document.getText(),
          });

          const editor = vscode.window.visibleTextEditors.find((e) => e.document === document);
          if (editor) {
            await showProofTreeForDocument(editor, this.container);
          }

          try {
            const documentInfo = {
              uri: document.uri.toString(),
              content: document.getText(),
              languageId: document.languageId,
            };
            this.validationController.validateDocumentImmediate(documentInfo);
          } catch (error) {
            const uiPort = this.container.resolve<IUIPort>(TOKENS.IUIPort);
            const errorResult = NotificationMessage.create(
              `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
            );
            if (errorResult.isOk()) {
              uiPort.showError(errorResult.value);
            }
          }
        }
      },
    );

    this.disposables.push(onOpenDisposable);
  }

  private registerDocumentChangeHandler(): void {
    const onChangeDisposable = vscode.workspace.onDidChangeTextDocument(async (event) => {
      if (event.document.languageId === 'proof') {
        await this.documentController.handleDocumentChanged({
          fileName: event.document.fileName,
          uri: event.document.uri.toString(),
          getText: () => event.document.getText(),
          isDirty: event.document.isDirty,
        });

        const editor = vscode.window.visibleTextEditors.find((e) => e.document === event.document);
        if (editor) {
          await showProofTreeForDocument(editor, this.container);
        }

        try {
          const documentInfo = {
            uri: event.document.uri.toString(),
            content: event.document.getText(),
            languageId: event.document.languageId,
          };
          this.validationController.validateDocumentDebounced(documentInfo);
        } catch (error) {
          const uiPort = this.container.resolve<IUIPort>(TOKENS.IUIPort);
          const errorResult = NotificationMessage.create(
            `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
          );
          if (errorResult.isOk()) {
            uiPort.showError(errorResult.value);
          }
        }
      }
    });

    this.disposables.push(onChangeDisposable);
  }

  private registerEditorChangeHandler(): void {
    const onEditorChangeDisposable = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      if (editor && editor.document.languageId === 'proof') {
        await this.documentController.handleDocumentOpened({
          fileName: editor.document.fileName,
          uri: editor.document.uri.toString(),
          getText: () => editor.document.getText(),
        });
        await showProofTreeForDocument(editor, this.container);

        try {
          const documentInfo = {
            uri: editor.document.uri.toString(),
            content: editor.document.getText(),
            languageId: editor.document.languageId,
          };
          this.validationController.validateDocumentImmediate(documentInfo);
        } catch (error) {
          const uiPort = this.container.resolve<IUIPort>(TOKENS.IUIPort);
          const errorResult = NotificationMessage.create(
            `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
          );
          if (errorResult.isOk()) {
            uiPort.showError(errorResult.value);
          }
        }
      }
    });

    this.disposables.push(onEditorChangeDisposable);
  }

  private registerDocumentCloseHandler(): void {
    const onCloseDisposable = vscode.workspace.onDidCloseTextDocument(async (document) => {
      if (document.languageId === 'proof') {
        await this.documentController.handleDocumentClosed({
          fileName: document.fileName,
          uri: document.uri.toString(),
        });

        const documentInfo = {
          uri: document.uri.toString(),
          content: document.getText(),
          languageId: document.languageId,
        };
        this.validationController.clearDocumentValidation(documentInfo);

        // Close associated proof tree panel
        try {
          const { ProofTreePanelManager } = await import('../../webview/ProofTreePanelManager.js');
          const panelManager = ProofTreePanelManager.getInstance();
          panelManager.closePanelForDocument(document.uri.toString());
        } catch (_error) {
          // Silent failure on panel cleanup
        }
      }
    });

    this.disposables.push(onCloseDisposable);
  }

  public async checkForExistingProofFiles(
    _proofTreeController: ProofTreeController,
  ): Promise<void> {
    const proofDocuments = vscode.workspace.textDocuments.filter(
      (document: vscode.TextDocument) => document.languageId === 'proof',
    );

    for (const document of proofDocuments) {
      await this.documentController.handleDocumentOpened({
        fileName: document.fileName,
        uri: document.uri.toString(),
        getText: () => document.getText(),
      });
      const editor = vscode.window.visibleTextEditors.find((e) => e.document === document);
      if (editor) {
        await showProofTreeForDocument(editor, this.container);
      }
    }
  }

  public dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
  }
}

export function createEventHandlers(
  container: ApplicationContainer,
  documentController: DocumentController,
  validationController: ValidationController,
): Result<EventHandlers, Error> {
  try {
    const handlers = new EventHandlers(container, documentController, validationController);
    const result = handlers.registerEventHandlers();

    if (result.isErr()) {
      return err(result.error);
    }

    return ok(handlers);
  } catch (error) {
    return err(
      new Error(
        `Failed to create event handlers: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
  }
}

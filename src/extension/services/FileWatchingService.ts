import { err, ok, type Result } from 'neverthrow';
import * as vscode from 'vscode';
import type { IFileSystemPort } from '../../application/ports/IFileSystemPort.js';
import type { IUIPort } from '../../application/ports/IUIPort.js';
import type { ApplicationContainer } from '../../infrastructure/di/container.js';
import { TOKENS } from '../../infrastructure/di/tokens.js';
import { refreshDocumentContent } from '../helpers/ProofTreeHelper.js';

export class FileWatchingService {
  private disposables: vscode.Disposable[] = [];
  private fileSystemPort: IFileSystemPort;
  private uiPort: IUIPort;

  constructor(private readonly container: ApplicationContainer) {
    this.fileSystemPort = container.resolve<IFileSystemPort>(TOKENS.IFileSystemPort);
    this.uiPort = container.resolve<IUIPort>(TOKENS.IUIPort);
  }

  public setupFileWatching(): Result<vscode.Disposable[], Error> {
    try {
      if (!this.fileSystemPort.capabilities().canWatch) {
        return ok([]); // No file watching capabilities
      }

      const watcher = vscode.workspace.createFileSystemWatcher('**/*.proof');

      watcher.onDidChange(async (uri) => {
        await this.handleExternalFileChange(uri);
      });

      watcher.onDidCreate(async (uri) => {
        await this.handleNewFileCreated(uri);
      });

      watcher.onDidDelete(async (uri) => {
        await this.handleFileDeleted(uri);
      });

      this.disposables.push(watcher);
      return ok(this.disposables);
    } catch (error) {
      return err(
        new Error(
          `Failed to setup file watching: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  private async handleExternalFileChange(uri: vscode.Uri): Promise<void> {
    try {
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
        await refreshDocumentContent(openEditor, this.container);
        this.uiPort.showInformation('Document refreshed with external changes');
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
          await refreshDocumentContent(openEditor, this.container);
          this.uiPort.showInformation('Document reloaded from disk');
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
          this.uiPort.showInformation('Keeping local changes. Save to overwrite external changes.');
          break;
      }
    } catch (error) {
      this.uiPort.showError(
        `Failed to handle external file change: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async handleNewFileCreated(uri: vscode.Uri): Promise<void> {
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
  }

  private async handleFileDeleted(uri: vscode.Uri): Promise<void> {
    // Proof file deleted - clean up and close associated panels
    const documentId = uri.fsPath;
    await this.fileSystemPort.deleteStoredDocument(documentId);

    // Close associated proof tree panel
    try {
      const { ProofTreePanelManager } = await import('../../webview/ProofTreePanelManager.js');
      const panelManager = ProofTreePanelManager.getInstance();
      panelManager.closePanelForDocument(uri.toString());
    } catch (_error) {
      // Silent failure on panel cleanup
    }

    // Notify user
    const fileName = uri.fsPath.split('/').pop() || uri.fsPath;
    this.uiPort.showWarning(`Proof file was deleted: ${fileName}`);
  }

  public dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
  }
}

export function createFileWatchingService(
  container: ApplicationContainer,
): Result<FileWatchingService, Error> {
  try {
    const service = new FileWatchingService(container);
    const result = service.setupFileWatching();

    if (result.isErr()) {
      return err(result.error);
    }

    return ok(service);
  } catch (error) {
    return err(
      new Error(
        `Failed to create file watching service: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
  }
}

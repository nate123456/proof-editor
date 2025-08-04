import type * as vscode from 'vscode';
import type { IExportService } from '../../application/ports/IExportService.js';
import type { IFileSystemPort, StoredDocument } from '../../application/ports/IFileSystemPort.js';
import type { IUIPort } from '../../application/ports/IUIPort.js';
import type { IViewStatePort } from '../../application/ports/IViewStatePort.js';
import type { IDocumentIdService } from '../../application/services/DocumentIdService.js';
import type { DocumentQueryService } from '../../application/services/DocumentQueryService.js';
import type { ProofApplicationService } from '../../application/services/ProofApplicationService.js';
import type { ProofVisualizationService } from '../../application/services/ProofVisualizationService.js';
import type { ViewStateManager } from '../../application/services/ViewStateManager.js';
import {
  DocumentContent,
  DocumentId,
  DocumentVersion,
  FileSize,
  NotificationMessage,
  Timestamp,
  Title,
} from '../../domain/shared/value-objects/index.js';
import type { ApplicationContainer } from '../../infrastructure/di/container.js';
import { TOKENS } from '../../infrastructure/di/tokens.js';
import type { YAMLSerializer } from '../../infrastructure/repositories/yaml/YAMLSerializer.js';
import type { BootstrapController } from '../../presentation/controllers/BootstrapController.js';
import type { DocumentController } from '../../presentation/controllers/DocumentController.js';
import type { ValidationController } from '../../validation/ValidationController.js';
import type { TreeRenderer } from '../../webview/TreeRenderer.js';

/**
 * Helper function to show proof tree panel using the panel manager
 */
export async function showProofTreeForDocument(
  editor: vscode.TextEditor,
  container: ApplicationContainer,
): Promise<void> {
  try {
    const { ProofTreePanelManager } = await import('../../webview/ProofTreePanelManager.js');

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
      const errorResult = NotificationMessage.create(
        `Failed to display proof tree: ${createResult.error.message}`,
      );
      if (errorResult.isOk()) {
        uiPort.showError(errorResult.value);
      }
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
      const warningResult = NotificationMessage.create(
        `Panel association failed: ${associateResult.error.message}`,
      );
      if (warningResult.isOk()) {
        uiPort.showWarning(warningResult.value);
      }
    }
  } catch (_error) {
    const uiPort = container.resolve<IUIPort>(TOKENS.IUIPort);
    const errorResult = NotificationMessage.create('Failed to display proof tree visualization');
    if (errorResult.isOk()) {
      uiPort.showError(errorResult.value);
    }
  }
}

/**
 * Auto-save proof document after changes
 */
export async function autoSaveProofDocument(
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

    // Create branded types for StoredDocument
    const documentIdResult = DocumentId.create(documentMetadata.id);
    const contentResult = DocumentContent.create(editor.document.getText());
    const titleResult = Title.create(documentMetadata.title);
    const timestampResult = Timestamp.create(documentMetadata.modifiedAt.getTime());
    const fileSizeResult = FileSize.create(documentMetadata.size);
    const versionResult = DocumentVersion.create(1);

    if (
      documentIdResult.isErr() ||
      contentResult.isErr() ||
      titleResult.isErr() ||
      timestampResult.isErr() ||
      fileSizeResult.isErr() ||
      versionResult.isErr()
    ) {
      // Auto-save failures are logged internally
      return;
    }

    const storedDocument: StoredDocument = {
      id: documentIdResult.value,
      content: contentResult.value,
      metadata: {
        id: documentIdResult.value,
        title: titleResult.value,
        modifiedAt: timestampResult.value,
        size: fileSizeResult.value,
        syncStatus: documentMetadata.syncStatus,
      },
      version: versionResult.value,
    };

    // Store for offline access
    await fileSystemPort.storeDocument(storedDocument);
  } catch (_error) {
    // Auto-save failures are logged internally by the file system port
    // Don't show error to user for auto-save failures unless critical
  }
}

/**
 * Refresh document content and associated panels
 */
export async function refreshDocumentContent(
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

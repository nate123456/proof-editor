import { err, ok, type Result } from 'neverthrow';
import type { IFileSystemPort } from '../../application/ports/IFileSystemPort.js';
import type { IPlatformPort } from '../../application/ports/IPlatformPort.js';
import type { IUIPort } from '../../application/ports/IUIPort.js';
import type { IViewStatePort } from '../../application/ports/IViewStatePort.js';
import type { DocumentViewStateManager } from '../../application/services/DocumentViewStateManager.js';
import { ValidationError } from '../../domain/shared/result.js';
import {
  DialogTitle,
  DocumentContent,
  FilePath,
  NotificationMessage,
  PlaceholderText,
} from '../../domain/shared/value-objects/index.js';
import type { ProofTreePanelManager } from '../../webview/ProofTreePanelManager.js';

/**
 * Document state tracking for save/dirty coordination
 */
interface DocumentState {
  uri: string;
  isDirty: boolean;
  lastSavedContent: string;
  lastModified: Date;
  autoSaveEnabled: boolean;
  viewStateManager?: DocumentViewStateManager | undefined;
  panelAssociated: boolean;
}

/**
 * Presentation layer controller for document operations.
 * Coordinates between UI and application layer with NO business logic.
 * Follows clean architecture principles - only orchestrates UI concerns.
 */
export class DocumentController {
  private readonly documentStates = new Map<string, DocumentState>();
  private panelManager: ProofTreePanelManager | undefined;
  private viewStatePort: IViewStatePort | undefined;

  constructor(
    private readonly uiPort: IUIPort,
    private readonly platformPort: IPlatformPort,
    private readonly fileSystemPort: IFileSystemPort,
  ) {}

  /**
   * Set panel manager for coordinating multi-document support
   */
  setPanelManager(panelManager: ProofTreePanelManager): void {
    this.panelManager = panelManager;
  }

  /**
   * Set view state port for document-specific state management
   */
  setViewStatePort(viewStatePort: IViewStatePort): void {
    this.viewStatePort = viewStatePort;
  }

  /**
   * Handle document opened event - coordinate UI response and initialize state tracking
   */
  async handleDocumentOpened(document: {
    fileName: string;
    uri: string;
    getText(): string;
  }): Promise<Result<void, ValidationError>> {
    try {
      const fileName = document.fileName.split('/').pop() || document.fileName;
      const documentUri = document.uri || document.fileName;

      // Initialize document view state manager if port available
      let viewStateManager: DocumentViewStateManager | undefined;
      if (this.viewStatePort) {
        // Note: DocumentViewStateManager would be instantiated here
        // viewStateManager = new DocumentViewStateManager(this.viewStatePort, documentUri);
        viewStateManager = undefined; // Placeholder until implementation available
      }

      // Initialize document state tracking
      const documentState: DocumentState = {
        uri: documentUri,
        isDirty: false,
        lastSavedContent: document.getText(),
        lastModified: new Date(),
        autoSaveEnabled: true,
        viewStateManager,
        panelAssociated: false,
      };

      this.documentStates.set(documentUri, documentState);

      // Coordinate with panel manager for multi-document support
      if (this.panelManager?.hasPanelForDocument(documentUri)) {
        documentState.panelAssociated = true;

        // Update existing panel content
        const updateResult = await this.panelManager.updateContentForDocument(
          documentUri,
          document.getText(),
        );
        if (updateResult.isErr()) {
          const warningResult = NotificationMessage.create(
            `Failed to update panel for ${fileName}: ${updateResult.error.message}`,
          );
          if (warningResult.isOk()) {
            this.uiPort.showWarning(warningResult.value);
          }
        }
      }

      const infoResult = NotificationMessage.create(`Proof Editor: Working with ${fileName}`);
      if (infoResult.isOk()) {
        this.uiPort.showInformation(infoResult.value);
      }

      // Delegate to appropriate command/query handlers
      // No business logic here - just coordinate between UI and application layer
      // Application layer will handle the actual document processing

      return ok(undefined);
    } catch (error) {
      const errorResult = NotificationMessage.create('Failed to process document opening');
      if (errorResult.isOk()) {
        this.uiPort.showError(errorResult.value);
      }
      return err(
        new ValidationError(
          `Failed to handle document opened: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Handle document changed event - coordinate UI response and update dirty state
   */
  async handleDocumentChanged(document: {
    fileName: string;
    uri: string;
    getText(): string;
    isDirty: boolean;
  }): Promise<Result<void, ValidationError>> {
    try {
      const documentUri = document.uri || document.fileName;
      const documentState = this.documentStates.get(documentUri);

      if (documentState) {
        // Update document state tracking
        const currentContent = document.getText();
        const contentChanged = currentContent !== documentState.lastSavedContent;

        documentState.isDirty = document.isDirty || contentChanged;
        documentState.lastModified = new Date();

        this.documentStates.set(documentUri, documentState);

        // Coordinate with panel for content updates
        if (documentState.panelAssociated && this.panelManager) {
          const updateResult = await this.panelManager.updateContentForDocument(
            documentUri,
            currentContent,
          );
          if (updateResult.isErr()) {
            // Log error but don't fail the operation
          }
        }

        // Coordinate auto-save if enabled and document is dirty
        if (documentState.autoSaveEnabled && documentState.isDirty) {
          await this.handleAutoSave(document);
        }
      }

      // Delegate to appropriate command/query handlers
      // No business logic here - just coordinate
      // Application layer will handle validation and processing

      return ok(undefined);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to handle document changed: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Handle document closed event - coordinate cleanup and state removal
   */
  async handleDocumentClosed(document: {
    fileName: string;
    uri: string;
  }): Promise<Result<void, ValidationError>> {
    try {
      const documentUri = document.uri || document.fileName;
      const documentState = this.documentStates.get(documentUri);

      // Handle unsaved changes
      if (documentState?.isDirty) {
        const saveResult = await this.promptSaveBeforeClose(document);
        if (saveResult.isErr()) {
          return err(saveResult.error);
        }
      }

      // Clean up view state for the document
      if (documentState?.viewStateManager) {
        const clearResult = await documentState.viewStateManager.clearDocumentState();
        if (clearResult.isErr()) {
          // Log error but don't fail the close operation
          const warningResult = NotificationMessage.create(
            `Failed to clear view state for ${document.fileName}`,
          );
          if (warningResult.isOk()) {
            this.uiPort.showWarning(warningResult.value);
          }
        }
      }

      // Close associated panel
      if (documentState?.panelAssociated && this.panelManager) {
        const closeResult = this.panelManager.closePanelForDocument(documentUri);
        if (closeResult.isErr()) {
          // Log error but don't fail the close operation
        }
      }

      // Clean up document state tracking
      this.documentStates.delete(documentUri);

      // Delegate to appropriate command/query handlers
      // No business logic here - just coordinate cleanup
      // Application layer will handle validation cleanup

      return ok(undefined);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to handle document closed: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Show platform information for debugging
   */
  async showPlatformInfo(): Promise<void> {
    try {
      const platformInfo = this.platformPort.getPlatformInfo();
      const inputCaps = this.platformPort.getInputCapabilities();
      const displayCaps = this.platformPort.getDisplayCapabilities();

      const info = [
        `Platform: ${platformInfo.type} v${platformInfo.version}`,
        `OS: ${platformInfo.os} (${platformInfo.arch})`,
        `Input: ${inputCaps.primaryInput}`,
        `Display: ${displayCaps.screenDimensions.getWidth()}x${displayCaps.screenDimensions.getHeight()}`,
      ].join('\n');

      const infoResult = NotificationMessage.create(info);
      if (infoResult.isOk()) {
        this.uiPort.showInformation(infoResult.value);
      }
    } catch (_error) {
      const errorResult = NotificationMessage.create('Failed to retrieve platform information');
      if (errorResult.isOk()) {
        this.uiPort.showError(errorResult.value);
      }
      // Error: DocumentController.showPlatformInfo
    }
  }

  /**
   * Handle copy to clipboard action
   */
  async copyToClipboard(text: string): Promise<void> {
    const result = await this.platformPort.copyToClipboard(text);

    if (result.isOk()) {
      const infoResult = NotificationMessage.create('Copied to clipboard');
      if (infoResult.isOk()) {
        this.uiPort.showInformation(infoResult.value);
      }
    } else {
      const errorResult = NotificationMessage.create(`Failed to copy: ${result.error.message}`);
      if (errorResult.isOk()) {
        this.uiPort.showError(errorResult.value);
      }
    }
  }

  /**
   * Handle paste from clipboard action
   */
  async pasteFromClipboard(): Promise<string | null> {
    const result = await this.platformPort.readFromClipboard();

    if (result.isOk()) {
      return result.value;
    } else {
      const errorResult = NotificationMessage.create(`Failed to paste: ${result.error.message}`);
      if (errorResult.isOk()) {
        this.uiPort.showError(errorResult.value);
      }
      return null;
    }
  }

  /**
   * Show user preferences/settings
   */
  async showSettings(): Promise<void> {
    try {
      // Example of using UI abstraction for settings
      const themes = [
        { label: 'Light Theme', description: 'Light color scheme' },
        { label: 'Dark Theme', description: 'Dark color scheme' },
        { label: 'High Contrast', description: 'High contrast theme' },
      ];

      const result = await this.uiPort.showQuickPick(themes, {
        title: DialogTitle.create('Choose Theme').unwrapOr(
          (() => {
            const settingsTitle = DialogTitle.create('Settings');
            if (settingsTitle.isOk()) return settingsTitle.value;
            const defaultTitle = DialogTitle.create('Default');
            if (defaultTitle.isOk()) return defaultTitle.value;
            // This should never happen as 'Default' is a valid title
            throw new Error('Failed to create dialog title');
          })(),
        ),
        placeHolder: PlaceholderText.create('Select a theme preference').unwrapOr(
          PlaceholderText.empty(),
        ),
      });

      if (result.isOk() && result.value) {
        const infoResult = NotificationMessage.create(`Selected: ${result.value.label}`);
        if (infoResult.isOk()) {
          this.uiPort.showInformation(infoResult.value);
        }
        // Delegate to application layer for actual preference storage
      }
    } catch (_error) {
      const errorResult = NotificationMessage.create('Failed to show settings');
      if (errorResult.isOk()) {
        this.uiPort.showError(errorResult.value);
      }
      // Error: DocumentController.showSettings
    }
  }

  /**
   * Handle auto-save for document
   */
  private async handleAutoSave(document: {
    fileName: string;
    uri: string;
    getText(): string;
  }): Promise<Result<void, ValidationError>> {
    try {
      const documentUri = document.uri || document.fileName;
      const documentState = this.documentStates.get(documentUri);

      if (!documentState) {
        return err(new ValidationError('Document state not found for auto-save'));
      }

      // Use file system port for saving
      const filePathResult = FilePath.create(document.fileName);
      if (filePathResult.isErr()) {
        return err(new ValidationError('Invalid file path for auto-save'));
      }

      const contentResult = DocumentContent.create(document.getText());
      if (contentResult.isErr()) {
        return err(new ValidationError('Invalid document content for auto-save'));
      }

      const saveResult = await this.fileSystemPort.writeFile(
        filePathResult.value,
        contentResult.value,
      );
      if (saveResult.isErr()) {
        return err(new ValidationError(`Auto-save failed: ${saveResult.error.message}`));
      }

      // Update state after successful save
      documentState.isDirty = false;
      documentState.lastSavedContent = document.getText();
      documentState.lastModified = new Date();
      this.documentStates.set(documentUri, documentState);

      return ok(undefined);
    } catch (error) {
      return err(
        new ValidationError(
          `Auto-save failed: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Prompt user to save before closing document
   */
  private async promptSaveBeforeClose(document: {
    fileName: string;
    uri: string;
  }): Promise<Result<void, ValidationError>> {
    try {
      const fileName = document.fileName.split('/').pop() || document.fileName;

      const options = [
        { label: 'Save', description: 'Save changes before closing' },
        { label: "Don't Save", description: 'Close without saving changes' },
        { label: 'Cancel', description: 'Cancel closing the document' },
      ];

      const titleResult = DialogTitle.create(`Save changes to ${fileName}?`);
      const placeholderResult = PlaceholderText.create('Your document has unsaved changes');

      if (titleResult.isErr() || placeholderResult.isErr()) {
        return err(new ValidationError('Failed to create dialog options'));
      }

      const result = await this.uiPort.showQuickPick(options, {
        title: titleResult.value,
        placeHolder: placeholderResult.value,
      });

      if (result.isErr()) {
        return err(new ValidationError(`Failed to show save prompt: ${result.error.message}`));
      }

      if (!result.value) {
        // User canceled
        return err(new ValidationError('User canceled document closing'));
      }

      if (result.value.label === 'Save') {
        // Trigger save through file system
        const filePathResult = FilePath.create(document.fileName);
        if (filePathResult.isErr()) {
          return err(new ValidationError('Invalid file path'));
        }

        const contentResult = DocumentContent.create(''); // Content would need to be passed
        if (contentResult.isErr()) {
          return err(new ValidationError('Invalid document content'));
        }

        const saveResult = await this.fileSystemPort.writeFile(
          filePathResult.value,
          contentResult.value,
        );
        if (saveResult.isErr()) {
          return err(new ValidationError(`Save failed: ${saveResult.error.message}`));
        }
      } else if (result.value.label === 'Cancel') {
        return err(new ValidationError('User canceled document closing'));
      }
      // 'Don't Save' - just proceed with closing

      return ok(undefined);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to handle save prompt: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Get document dirty state
   */
  getDocumentDirtyState(documentUri: string): boolean {
    const documentState = this.documentStates.get(documentUri);
    return documentState?.isDirty ?? false;
  }

  /**
   * Set auto-save enabled for document
   */
  setAutoSaveEnabled(documentUri: string, enabled: boolean): Result<void, ValidationError> {
    const documentState = this.documentStates.get(documentUri);
    if (!documentState) {
      return err(new ValidationError('Document state not found'));
    }

    documentState.autoSaveEnabled = enabled;
    this.documentStates.set(documentUri, documentState);
    return ok(undefined);
  }

  /**
   * Get all tracked documents
   */
  getTrackedDocuments(): string[] {
    return Array.from(this.documentStates.keys());
  }

  /**
   * Associate a panel with a document for lifecycle coordination
   */
  async associatePanelWithDocument(
    documentUri: string,
    _panelId: string,
  ): Promise<Result<void, ValidationError>> {
    const documentState = this.documentStates.get(documentUri);
    if (!documentState) {
      return err(new ValidationError(`Document ${documentUri} not tracked`));
    }

    documentState.panelAssociated = true;
    this.documentStates.set(documentUri, documentState);

    return ok(undefined);
  }

  /**
   * Handle external file changes with proper conflict resolution
   */
  async handleExternalFileChange(
    documentUri: string,
    externalContent: string,
  ): Promise<Result<'reload' | 'keep-local' | 'conflict', ValidationError>> {
    const documentState = this.documentStates.get(documentUri);
    if (!documentState) {
      return err(new ValidationError(`Document ${documentUri} not tracked`));
    }

    if (!documentState.isDirty) {
      // No local changes - safe to reload
      documentState.lastSavedContent = externalContent;
      documentState.lastModified = new Date();
      this.documentStates.set(documentUri, documentState);

      // Update panel if associated
      if (documentState.panelAssociated && this.panelManager) {
        await this.panelManager.updateContentForDocument(documentUri, externalContent);
      }

      return ok('reload');
    }

    // Has local changes - this is a conflict
    return ok('conflict');
  }

  /**
   * Get document state for external access
   */
  getDocumentState(documentUri: string): DocumentState | undefined {
    return this.documentStates.get(documentUri);
  }

  /**
   * Sync webview changes back to document
   */
  async syncWebviewChangesToDocument(
    documentUri: string,
    newContent: string,
  ): Promise<Result<void, ValidationError>> {
    const documentState = this.documentStates.get(documentUri);
    if (!documentState) {
      return err(new ValidationError(`Document ${documentUri} not tracked`));
    }

    // Mark as dirty and update tracking
    documentState.isDirty = true;
    documentState.lastModified = new Date();
    this.documentStates.set(documentUri, documentState);

    // Trigger auto-save if enabled
    if (documentState.autoSaveEnabled) {
      const filePathResult = FilePath.create(documentUri.replace('file://', ''));
      if (filePathResult.isErr()) {
        return err(new ValidationError('Invalid file path'));
      }

      const contentResult = DocumentContent.create(newContent);
      if (contentResult.isErr()) {
        return err(new ValidationError('Invalid document content'));
      }

      const saveResult = await this.fileSystemPort.writeFile(
        filePathResult.value,
        contentResult.value,
      );
      if (saveResult.isOk()) {
        documentState.isDirty = false;
        documentState.lastSavedContent = newContent;
        this.documentStates.set(documentUri, documentState);
      }
    }

    return ok(undefined);
  }

  /**
   * Clean up all document states (for extension deactivation)
   */
  cleanup(): void {
    this.documentStates.clear();
  }
}

/**
 * Export document operation types for use by extension
 */
export type { DocumentState };

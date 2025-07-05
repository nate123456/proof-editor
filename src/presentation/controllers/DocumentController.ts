import type { IPlatformPort } from '../../application/ports/IPlatformPort.js';
import type { IUIPort } from '../../application/ports/IUIPort.js';

/**
 * Presentation layer controller for document operations.
 * Coordinates between UI and application layer with NO business logic.
 * Follows clean architecture principles - only orchestrates UI concerns.
 */
export class DocumentController {
  constructor(
    private readonly uiPort: IUIPort,
    private readonly platformPort: IPlatformPort,
  ) {}

  /**
   * Handle document opened event - coordinate UI response
   */
  async handleDocumentOpened(document: { fileName: string }): Promise<void> {
    try {
      const fileName = document.fileName.split('/').pop() || document.fileName;
      this.uiPort.showInformation(`Proof Editor: Working with ${fileName}`);

      // Delegate to appropriate command/query handlers
      // No business logic here - just coordinate between UI and application layer
      // Application layer will handle the actual document processing
    } catch (_error) {
      this.uiPort.showError('Failed to process document opening');
      // Error: DocumentController.handleDocumentOpened
    }
  }

  /**
   * Handle document changed event - coordinate UI response
   */
  async handleDocumentChanged(_document: { fileName: string }): Promise<void> {
    // Delegate to appropriate command/query handlers
    // No business logic here - just coordinate
    // Application layer will handle validation and processing
    // Document changed: ${document.fileName}
  }

  /**
   * Handle document closed event - coordinate cleanup
   */
  async handleDocumentClosed(_document: { fileName: string }): Promise<void> {
    // Delegate to appropriate command/query handlers
    // No business logic here - just coordinate cleanup
    // Application layer will handle validation cleanup
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
        `Display: ${displayCaps.screenWidth}x${displayCaps.screenHeight}`,
      ].join('\n');

      this.uiPort.showInformation(info);
    } catch (_error) {
      this.uiPort.showError('Failed to retrieve platform information');
      // Error: DocumentController.showPlatformInfo
    }
  }

  /**
   * Handle copy to clipboard action
   */
  async copyToClipboard(text: string): Promise<void> {
    const result = await this.platformPort.copyToClipboard(text);

    if (result.isOk()) {
      this.uiPort.showInformation('Copied to clipboard');
    } else {
      this.uiPort.showError(`Failed to copy: ${result.error.message}`);
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
      this.uiPort.showError(`Failed to paste: ${result.error.message}`);
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
        title: 'Choose Theme',
        placeHolder: 'Select a theme preference',
      });

      if (result.isOk() && result.value) {
        this.uiPort.showInformation(`Selected: ${result.value.label}`);
        // Delegate to application layer for actual preference storage
      }
    } catch (_error) {
      this.uiPort.showError('Failed to show settings');
      // Error: DocumentController.showSettings
    }
  }
}

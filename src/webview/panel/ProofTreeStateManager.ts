import type { IUIPort } from '../../application/ports/IUIPort.js';
import type { IViewStatePort } from '../../application/ports/IViewStatePort.js';
import { DocumentViewStateManager } from '../../application/services/DocumentViewStateManager.js';
import type { ViewStateManager } from '../../application/services/ViewStateManager.js';

/**
 * Manages view state initialization and persistence for ProofTreePanel
 */
export class ProofTreeStateManager {
  private readonly documentViewStateManager: DocumentViewStateManager;

  constructor(
    private readonly viewStateManager: ViewStateManager,
    private readonly viewStatePort: IViewStatePort,
    private readonly documentUri: string,
    private readonly panelId: string,
    private readonly uiPort: IUIPort,
  ) {
    this.documentViewStateManager = new DocumentViewStateManager(viewStatePort, documentUri);
  }

  /**
   * Initialize and restore view state
   */
  async initializeViewState(): Promise<void> {
    try {
      // Restore document-specific viewport state
      const viewportResult = await this.documentViewStateManager.getViewportState();
      if (viewportResult.isOk()) {
        this.uiPort.postMessageToWebview(this.panelId, {
          type: 'restoreViewportState',
          viewport: viewportResult.value,
        });
      }

      // Restore document-specific panel state
      const panelResult = await this.documentViewStateManager.getPanelState();
      if (panelResult.isOk()) {
        this.uiPort.postMessageToWebview(this.panelId, {
          type: 'restorePanelState',
          panel: panelResult.value,
        });
      }

      // Restore document-specific selection state
      const selectionResult = await this.documentViewStateManager.getSelectionState();
      if (selectionResult.isOk()) {
        this.uiPort.postMessageToWebview(this.panelId, {
          type: 'restoreSelectionState',
          selection: selectionResult.value,
        });
      }

      // Restore global theme state
      const themeResult = await this.documentViewStateManager.getThemeState();
      if (themeResult.isOk()) {
        this.uiPort.postMessageToWebview(this.panelId, {
          type: 'restoreThemeState',
          theme: themeResult.value,
        });
      }
    } catch (_error) {
      // Initialization errors should not prevent panel creation
      if (process.env.NODE_ENV === 'development') {
        // Could add debug logging here in development
      }
    }
  }

  /**
   * Handle view state updates from the webview
   */
  async handleViewStateUpdate(type: string, data: unknown): Promise<void> {
    switch (type) {
      case 'viewportChanged': {
        const viewport = data as {
          zoom: number;
          pan: { x: number; y: number };
          center: { x: number; y: number };
        };
        await this.viewStateManager.updateViewportState(viewport);
        break;
      }
      case 'panelStateChanged': {
        const panel = data as {
          miniMapVisible: boolean;
          sideLabelsVisible: boolean;
          validationPanelVisible: boolean;
          panelSizes: Record<string, number>;
        };
        await this.viewStateManager.updatePanelState(panel);
        break;
      }
      case 'selectionChanged': {
        const selection = data as {
          selectedNodes: string[];
          selectedStatements: string[];
          selectedTrees: string[];
        };
        await this.viewStateManager.updateSelectionState(selection);
        break;
      }
    }
  }

  /**
   * Save current view state before disposal
   */
  async saveCurrentViewState(): Promise<void> {
    try {
      // Save current viewport state if available
      const viewportState = {
        zoom: 1.0,
        pan: { x: 0, y: 0 },
        center: { x: 0, y: 0 },
      };
      await this.viewStateManager.updateViewportState(viewportState);
    } catch (_error) {
      // Ignore state saving errors during disposal
      // Note: Viewport state save failure during disposal is non-critical
    }
  }

  /**
   * Get the document view state manager instance
   */
  getDocumentViewStateManager(): DocumentViewStateManager {
    return this.documentViewStateManager;
  }
}

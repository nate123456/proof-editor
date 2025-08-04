import {
  createPanelState,
  createSelectionState,
  createViewportState,
} from '../../application/dtos/view-dtos.js';
import type { IUIPort } from '../../application/ports/IUIPort.js';
import type { IViewStatePort } from '../../application/ports/IViewStatePort.js';
import { DocumentViewStateManager } from '../../application/services/DocumentViewStateManager.js';
import type { ViewStateManager } from '../../application/services/ViewStateManager.js';
import { EventData } from '../../domain/shared/value-objects/content.js';
import { MessageType } from '../../domain/shared/value-objects/enums.js';
import {
  NodeId,
  PanelSize,
  Position2D,
  TreeId,
  WebviewId,
  ZoomLevel,
} from '../../domain/shared/value-objects/index.js';

/**
 * Manages view state initialization and persistence for ProofTreePanel
 */
export class ProofTreeStateManager {
  private readonly documentViewStateManager: DocumentViewStateManager;
  private readonly webviewId: WebviewId;

  constructor(
    private readonly viewStateManager: ViewStateManager,
    private readonly viewStatePort: IViewStatePort,
    private readonly documentUri: string,
    panelId: string,
    private readonly uiPort: IUIPort,
  ) {
    this.documentViewStateManager = new DocumentViewStateManager(viewStatePort, documentUri);
    // Create WebviewId from panelId string
    const webviewIdResult = WebviewId.create(panelId);
    if (webviewIdResult.isErr()) {
      throw new Error(`Invalid panel ID: ${webviewIdResult.error.message}`);
    }
    this.webviewId = webviewIdResult.value;
  }

  /**
   * Initialize and restore view state
   */
  async initializeViewState(): Promise<void> {
    try {
      // Restore document-specific viewport state
      const viewportResult = await this.documentViewStateManager.getViewportState();
      if (viewportResult.isOk()) {
        const eventData = EventData.create({ viewport: viewportResult.value });
        if (eventData.isOk()) {
          this.uiPort.postMessageToWebview(this.webviewId, {
            type: MessageType.RESTORE_VIEWPORT_STATE,
            data: eventData.value,
          });
        }
      }

      // Restore document-specific panel state
      const panelResult = await this.documentViewStateManager.getPanelState();
      if (panelResult.isOk()) {
        const eventData = EventData.create({ panel: panelResult.value });
        if (eventData.isOk()) {
          this.uiPort.postMessageToWebview(this.webviewId, {
            type: MessageType.RESTORE_PANEL_STATE,
            data: eventData.value,
          });
        }
      }

      // Restore document-specific selection state
      const selectionResult = await this.documentViewStateManager.getSelectionState();
      if (selectionResult.isOk()) {
        const eventData = EventData.create({ selection: selectionResult.value });
        if (eventData.isOk()) {
          this.uiPort.postMessageToWebview(this.webviewId, {
            type: MessageType.RESTORE_SELECTION_STATE,
            data: eventData.value,
          });
        }
      }

      // Restore global theme state
      const themeResult = await this.documentViewStateManager.getThemeState();
      if (themeResult.isOk()) {
        const eventData = EventData.create({ theme: themeResult.value });
        if (eventData.isOk()) {
          this.uiPort.postMessageToWebview(this.webviewId, {
            type: MessageType.RESTORE_THEME_STATE,
            data: eventData.value,
          });
        }
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
        // Convert raw data to value objects
        const zoomResult = ZoomLevel.create(viewport.zoom);
        const panResult = Position2D.create(viewport.pan.x, viewport.pan.y);
        const centerResult = Position2D.create(viewport.center.x, viewport.center.y);

        if (zoomResult.isOk() && panResult.isOk() && centerResult.isOk()) {
          const viewportState = createViewportState(
            zoomResult.value,
            panResult.value,
            centerResult.value,
          );
          await this.viewStateManager.updateViewportState(viewportState);
        }
        break;
      }
      case 'panelStateChanged': {
        const panel = data as {
          miniMapVisible: boolean;
          sideLabelsVisible: boolean;
          validationPanelVisible: boolean;
          panelSizes: Record<string, number>;
        };
        // Convert raw panel sizes to value objects
        const panelSizesMap: Record<string, PanelSize> = {};
        for (const [key, value] of Object.entries(panel.panelSizes)) {
          const sizeResult = PanelSize.create(value);
          if (sizeResult.isOk()) {
            panelSizesMap[key] = sizeResult.value;
          }
        }

        const panelState = createPanelState(
          panel.miniMapVisible,
          panel.sideLabelsVisible,
          panel.validationPanelVisible,
          panelSizesMap,
        );
        await this.viewStateManager.updatePanelState(panelState);
        break;
      }
      case 'selectionChanged': {
        const selection = data as {
          selectedNodes: string[];
          selectedStatements: string[];
          selectedTrees: string[];
        };
        // Convert raw IDs to value objects
        const nodeIds: NodeId[] = [];
        for (const nodeId of selection.selectedNodes) {
          const result = NodeId.create(nodeId);
          if (result.isOk()) {
            nodeIds.push(result.value);
          }
        }

        const treeIds: TreeId[] = [];
        for (const treeId of selection.selectedTrees) {
          const result = TreeId.create(treeId);
          if (result.isOk()) {
            treeIds.push(result.value);
          }
        }

        const selectionState = createSelectionState(nodeIds, selection.selectedStatements, treeIds);
        await this.viewStateManager.updateSelectionState(selectionState);
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
      const viewportState = createViewportState(
        ZoomLevel.normal(),
        Position2D.origin(),
        Position2D.origin(),
      );
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

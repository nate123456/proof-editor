import { err, ok, type Result } from 'neverthrow';
import type { IExportService } from '../../application/ports/IExportService.js';
import type { IUIPort, WebviewPanel } from '../../application/ports/IUIPort.js';
import type { IViewStatePort } from '../../application/ports/IViewStatePort.js';
import type { IDocumentIdService } from '../../application/services/DocumentIdService.js';
import type { DocumentQueryService } from '../../application/services/DocumentQueryService.js';
import type { ProofApplicationService } from '../../application/services/ProofApplicationService.js';
import type { ProofVisualizationService } from '../../application/services/ProofVisualizationService.js';
import type { ViewStateManager } from '../../application/services/ViewStateManager.js';
import { ValidationError } from '../../domain/shared/result.js';
import { WebviewId } from '../../domain/shared/value-objects/identifiers.js';
import { DialogTitle, ViewType } from '../../domain/shared/value-objects/ui.js';
import { getContainer } from '../../infrastructure/di/container.js';
import { TOKENS } from '../../infrastructure/di/tokens.js';
import type { YAMLSerializer } from '../../infrastructure/repositories/yaml/YAMLSerializer.js';
import type { BootstrapController } from '../../presentation/controllers/BootstrapController.js';
import type { TreeRenderer } from '../TreeRenderer.js';
import { ArgumentOperations } from './operations/ArgumentOperations.js';
import { ProofTreeContentRenderer } from './ProofTreeContentRenderer.js';
import { ProofTreeMessageHandler } from './ProofTreeMessageHandler.js';
import { ProofTreeStateManager } from './ProofTreeStateManager.js';

/**
 * Core panel class for Proof Tree visualization with lifecycle management
 * Note: ProofTreePanel cannot use @injectable due to private constructor
 * It resolves dependencies manually through the DI container
 */
export class ProofTreePanel {
  private readonly panelId: string;
  private readonly documentUri: string;
  private readonly webviewPanel: WebviewPanel;
  private readonly contentRenderer: ProofTreeContentRenderer;
  private readonly messageHandler: ProofTreeMessageHandler;
  private readonly stateManager: ProofTreeStateManager;
  private readonly argumentOperations: ArgumentOperations;
  private isDisposed: boolean = false;

  private constructor(
    panelId: string,
    documentUri: string,
    webviewPanel: WebviewPanel,
    uiPort: IUIPort,
    visualizationService: ProofVisualizationService,
    documentQueryService: DocumentQueryService,
    renderer: TreeRenderer,
    viewStateManager: ViewStateManager,
    viewStatePort: IViewStatePort,
    bootstrapController: BootstrapController,
    proofApplicationService: ProofApplicationService,
    yamlSerializer: YAMLSerializer,
    exportService: IExportService,
    documentIdService: IDocumentIdService,
  ) {
    this.panelId = panelId;
    this.documentUri = documentUri;
    this.webviewPanel = webviewPanel;

    // Initialize components
    this.contentRenderer = new ProofTreeContentRenderer();

    this.stateManager = new ProofTreeStateManager(
      viewStateManager,
      viewStatePort,
      documentUri,
      panelId,
      uiPort,
    );

    this.argumentOperations = new ArgumentOperations(
      proofApplicationService,
      bootstrapController,
      exportService,
      documentIdService,
      uiPort,
      panelId,
      documentUri,
    );

    this.messageHandler = new ProofTreeMessageHandler(
      panelId,
      documentUri,
      uiPort,
      visualizationService,
      documentQueryService,
      renderer,
      this.stateManager,
      this.argumentOperations,
      proofApplicationService,
      yamlSerializer,
    );

    // Set up webview content and event handlers
    this.webviewPanel.webview.html = this.contentRenderer.getWebviewContent();
    this.webviewPanel.onDidDispose(() => {
      if (!this.isDisposed) {
        this.handleDisposal();
      }
    });

    // Set up message handling
    this.webviewPanel.webview.onDidReceiveMessage(async (message) => {
      await this.messageHandler.handleMessage(message);
    });

    // Initialize view state persistence
    this.initializeViewState();
  }

  /**
   * Create ProofTreePanel with explicit service dependencies (for testing and DI)
   */
  static async createWithServices(
    documentUri: string,
    content: string,
    documentQueryService: DocumentQueryService,
    visualizationService: ProofVisualizationService,
    uiPort: IUIPort,
    renderer: TreeRenderer,
    viewStateManager: ViewStateManager,
    viewStatePort: IViewStatePort,
    bootstrapController: BootstrapController,
    proofApplicationService: ProofApplicationService,
    yamlSerializer: YAMLSerializer,
    exportService: IExportService,
    documentIdService: IDocumentIdService,
  ): Promise<Result<ProofTreePanel, ValidationError>> {
    try {
      const panelId = `proof-tree-panel-${Date.now()}`;
      const documentName = documentUri.split('/').pop() || 'Unknown Document';

      // Create webview panel through platform abstraction
      const webviewIdResult = WebviewId.create(panelId);
      if (webviewIdResult.isErr()) {
        return err(webviewIdResult.error);
      }

      const titleResult = DialogTitle.create(`Proof Tree: ${documentName}`);
      if (titleResult.isErr()) {
        return err(titleResult.error);
      }

      const webviewPanel = uiPort.createWebviewPanel({
        id: webviewIdResult.value,
        title: titleResult.value,
        viewType: ViewType.proofTreeVisualization(),
        showOptions: {
          viewColumn: 1,
          preserveFocus: false,
        },
        retainContextWhenHidden: true,
        enableScripts: true,
      });

      // Create panel instance
      const panel = new ProofTreePanel(
        panelId,
        documentUri,
        webviewPanel,
        uiPort,
        visualizationService,
        documentQueryService,
        renderer,
        viewStateManager,
        viewStatePort,
        bootstrapController,
        proofApplicationService,
        yamlSerializer,
        exportService,
        documentIdService,
      );

      // Process initial content
      const updateResult = await panel.updateContent(content);
      if (updateResult.isErr()) {
        // If there's an error during content update, we still return the panel
        // but the error will have been handled (either shown in UI or propagated)
        return err(updateResult.error);
      }

      return ok(panel);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to create ProofTreePanel: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Safe DI resolution for IViewStatePort
   * @private
   */
  private static safeResolveViewStatePort(): Result<IViewStatePort, ValidationError> {
    try {
      const container = getContainer();
      if (!container.isRegistered(TOKENS.IViewStatePort)) {
        return err(new ValidationError('IViewStatePort not registered in DI container'));
      }
      const port = container.resolve<IViewStatePort>(TOKENS.IViewStatePort);
      return ok(port);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to resolve IViewStatePort: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Update content in the panel
   */
  public async updateContent(content: string): Promise<Result<void, ValidationError>> {
    return this.messageHandler.updateContent(content);
  }

  /**
   * Initialize view state
   */
  private async initializeViewState(): Promise<void> {
    await this.stateManager.initializeViewState();
  }

  /**
   * Reveal this panel (bring to front)
   */
  reveal(viewColumn?: number, preserveFocus?: boolean): void {
    this.webviewPanel.reveal(viewColumn, preserveFocus);
  }

  /**
   * Get the document URI this panel is associated with
   */
  getDocumentUri(): string {
    return this.documentUri;
  }

  /**
   * Get the panel ID
   */
  getPanelId(): string {
    return this.panelId;
  }

  /**
   * Set up disposal callback
   */
  onDidDispose(callback: () => void): void {
    this.webviewPanel.onDidDispose(callback);
  }

  /**
   * Handle internal disposal logic without triggering webview disposal
   */
  private handleDisposal(): void {
    if (this.isDisposed) {
      return;
    }

    this.isDisposed = true;

    // Perform cleanup operations here
    try {
      // Save any pending state before disposal (async, but don't wait)
      this.stateManager.saveCurrentViewState().catch(() => {
        // Ignore async errors during disposal
      });
    } catch (_error) {
      // Log error but don't prevent disposal
      // Note: View state save error during disposal is non-critical
    }
  }

  /**
   * Dispose of this panel
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this.handleDisposal();

    try {
      this.webviewPanel.dispose();
    } catch (_error) {
      // Log error but consider panel disposed
      // Note: Panel disposal error is non-critical, panel considered disposed
    }
  }
}

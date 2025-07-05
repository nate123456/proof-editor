import { err, ok, type Result } from 'neverthrow';
import type { IUIPort } from '../application/ports/IUIPort.js';
import type { IViewStatePort } from '../application/ports/IViewStatePort.js';
import type { DocumentQueryService } from '../application/services/DocumentQueryService.js';
import type { ProofVisualizationService } from '../application/services/ProofVisualizationService.js';
import type { ViewStateManager } from '../application/services/ViewStateManager.js';
import { ValidationError } from '../domain/shared/result.js';
import { getContainer } from '../infrastructure/di/container.js';
import { TOKENS } from '../infrastructure/di/tokens.js';
import { ProofTreePanel } from './ProofTreePanel.js';
import type { TreeRenderer } from './TreeRenderer.js';

/**
 * Manages multiple ProofTreePanel instances for multi-document support
 *
 * Provides document-centric panel management with proper lifecycle handling,
 * state isolation per document, and VS Code integration for seamless UX.
 */
export class ProofTreePanelManager {
  private static instance: ProofTreePanelManager | undefined;
  private readonly panels = new Map<string, ProofTreePanel>();

  private constructor() {}

  static getInstance(): ProofTreePanelManager {
    if (!ProofTreePanelManager.instance) {
      ProofTreePanelManager.instance = new ProofTreePanelManager();
    }
    return ProofTreePanelManager.instance;
  }

  /**
   * Create or show panel for a specific document
   */
  async createOrShowPanel(
    documentUri: string,
    content: string,
    uiPort: IUIPort,
  ): Promise<Result<ProofTreePanel, ValidationError>> {
    try {
      // Check if panel already exists for this document
      const existingPanel = this.panels.get(documentUri);
      if (existingPanel) {
        // Show existing panel and update content
        existingPanel.reveal();
        const updateResult = await existingPanel.updateContent(content);
        if (updateResult.isErr()) {
          return err(updateResult.error);
        }
        return ok(existingPanel);
      }

      // Create new panel for this document
      return await this.createNewPanel(documentUri, content, uiPort);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to create or show panel for ${documentUri}: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Create panel with explicit dependencies (for testing)
   */
  async createPanelWithServices(
    documentUri: string,
    content: string,
    documentQueryService: DocumentQueryService,
    visualizationService: ProofVisualizationService,
    uiPort: IUIPort,
    renderer: TreeRenderer,
    viewStateManager: ViewStateManager,
    viewStatePort: IViewStatePort,
  ): Promise<Result<ProofTreePanel, ValidationError>> {
    try {
      const existingPanel = this.panels.get(documentUri);
      if (existingPanel) {
        existingPanel.reveal();
        const updateResult = await existingPanel.updateContent(content);
        if (updateResult.isErr()) {
          return err(updateResult.error);
        }
        return ok(existingPanel);
      }

      const panelResult = await ProofTreePanel.createWithServices(
        documentUri,
        content,
        documentQueryService,
        visualizationService,
        uiPort,
        renderer,
        viewStateManager,
        viewStatePort,
      );

      if (panelResult.isErr()) {
        return err(panelResult.error);
      }

      const panel = panelResult.value;
      this.panels.set(documentUri, panel);

      // Set up panel disposal handling
      panel.onDidDispose(() => {
        this.panels.delete(documentUri);
      });

      return ok(panel);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to create panel with services for ${documentUri}: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Update content for all panels (useful for global changes)
   */
  async updateAllPanels(content: string): Promise<Result<void, ValidationError>> {
    try {
      const updateResults = await Promise.all(
        Array.from(this.panels.values()).map(async (panel) => {
          return await panel.updateContent(content);
        }),
      );

      // Check if any updates failed
      for (const result of updateResults) {
        if (result.isErr()) {
          return err(new ValidationError(`Failed to update panel: ${result.error.message}`));
        }
      }

      return ok(undefined);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to update all panels: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Update content for specific document panel
   */
  async updateContentForDocument(
    documentUri: string,
    content: string,
  ): Promise<Result<void, ValidationError>> {
    const panel = this.panels.get(documentUri);
    if (!panel) {
      return err(new ValidationError(`No panel found for document: ${documentUri}`));
    }

    return await panel.updateContent(content);
  }

  /**
   * Get panel for specific document
   */
  getPanelForDocument(documentUri: string): ProofTreePanel | undefined {
    return this.panels.get(documentUri);
  }

  /**
   * Check if panel exists for document
   */
  hasPanelForDocument(documentUri: string): boolean {
    return this.panels.has(documentUri);
  }

  /**
   * Get all active document URIs
   */
  getActiveDocumentUris(): string[] {
    return Array.from(this.panels.keys());
  }

  /**
   * Get active panel count
   */
  getActivePanelCount(): number {
    return this.panels.size;
  }

  /**
   * Close panel for specific document
   */
  closePanelForDocument(documentUri: string): Result<void, ValidationError> {
    const panel = this.panels.get(documentUri);
    if (!panel) {
      return err(new ValidationError(`No panel found for document: ${documentUri}`));
    }

    try {
      panel.dispose();
      this.panels.delete(documentUri);
      return ok(undefined);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to close panel for ${documentUri}: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Close all panels
   */
  closeAllPanels(): Result<void, ValidationError> {
    try {
      for (const panel of this.panels.values()) {
        panel.dispose();
      }
      this.panels.clear();
      return ok(undefined);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to close all panels: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Safe DI resolution for panel manager dependencies
   * @private
   */
  private static safeResolveDependencies(): Result<
    {
      documentQueryService: DocumentQueryService;
      visualizationService: ProofVisualizationService;
      renderer: TreeRenderer;
      viewStateManager: ViewStateManager;
      viewStatePort: IViewStatePort;
    },
    ValidationError
  > {
    try {
      const container = getContainer();

      // Check all required services are registered
      const requiredTokens = [
        TOKENS.DocumentQueryService,
        TOKENS.ProofVisualizationService,
        TOKENS.TreeRenderer,
        TOKENS.ViewStateManager,
        TOKENS.IViewStatePort,
      ];

      for (const token of requiredTokens) {
        if (!container.isRegistered(token)) {
          return err(new ValidationError(`Required service ${token} not registered`));
        }
      }

      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );
      const visualizationService = container.resolve<ProofVisualizationService>(
        TOKENS.ProofVisualizationService,
      );
      const renderer = container.resolve<TreeRenderer>(TOKENS.TreeRenderer);
      const viewStateManager = container.resolve<ViewStateManager>(TOKENS.ViewStateManager);
      const viewStatePort = container.resolve<IViewStatePort>(TOKENS.IViewStatePort);

      return ok({
        documentQueryService,
        visualizationService,
        renderer,
        viewStateManager,
        viewStatePort,
      });
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to resolve panel dependencies: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  private async createNewPanel(
    documentUri: string,
    content: string,
    uiPort: IUIPort,
  ): Promise<Result<ProofTreePanel, ValidationError>> {
    try {
      // Use safe DI resolution for dependencies
      const servicesResult = ProofTreePanelManager.safeResolveDependencies();
      if (servicesResult.isErr()) {
        return err(servicesResult.error);
      }

      const {
        documentQueryService,
        visualizationService,
        renderer,
        viewStateManager,
        viewStatePort,
      } = servicesResult.value;

      const panelResult = await ProofTreePanel.createWithServices(
        documentUri,
        content,
        documentQueryService,
        visualizationService,
        uiPort,
        renderer,
        viewStateManager,
        viewStatePort,
      );

      if (panelResult.isErr()) {
        return err(panelResult.error);
      }

      const panel = panelResult.value;
      this.panels.set(documentUri, panel);

      // Set up panel disposal handling
      panel.onDidDispose(() => {
        this.panels.delete(documentUri);
      });

      return ok(panel);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to create new panel for ${documentUri}: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }
}

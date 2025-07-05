import { err, ok, type Result } from 'neverthrow';
import * as vscode from 'vscode';
import type { IUIPort, WebviewPanel } from '../application/ports/IUIPort.js';
import type { IViewStatePort } from '../application/ports/IViewStatePort.js';
import type { DocumentQueryService } from '../application/services/DocumentQueryService.js';
import type { ProofApplicationService } from '../application/services/ProofApplicationService.js';
import type { ProofVisualizationService } from '../application/services/ProofVisualizationService.js';
import type { ViewStateManager } from '../application/services/ViewStateManager.js';
import { ValidationError } from '../domain/shared/result.js';
import { getContainer } from '../infrastructure/di/container.js';
import { TOKENS } from '../infrastructure/di/tokens.js';
import type { YAMLSerializer } from '../infrastructure/repositories/yaml/YAMLSerializer.js';
import type { BootstrapController } from '../presentation/controllers/BootstrapController.js';
import { ProofTreePanel } from './ProofTreePanel.js';
import type { TreeRenderer } from './TreeRenderer.js';

/**
 * Legacy VS Code compatibility layer for ProofTreePanel
 *
 * This module provides backward compatibility with the original VS Code-specific
 * API while maintaining platform abstraction in the core ProofTreePanel class.
 *
 * @deprecated Use ProofTreePanel.createWithServices() with proper dependency injection
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Legacy compatibility layer needs static methods
export class ProofTreePanelLegacy {
  private static currentPanel: ProofTreePanel | undefined;
  private static creationPromise: Promise<void> | undefined;

  /**
   * Test helper method to wait for panel creation to complete
   * @internal
   */
  public static async waitForCreation(): Promise<void> {
    if (ProofTreePanelLegacy.creationPromise) {
      await ProofTreePanelLegacy.creationPromise;
    }
  }

  /**
   * Test helper method to check if panel exists
   * @internal
   */
  public static hasCurrentPanel(): boolean {
    return ProofTreePanelLegacy.currentPanel !== undefined;
  }

  /**
   * Test helper method to get last creation error
   * @internal
   */
  public static getLastCreationError(): string | undefined {
    return ProofTreePanelLegacy.lastCreationError;
  }

  private static lastCreationError: string | undefined;

  /**
   * Safe DI resolution for legacy mode
   * @private
   */
  private static safeLegacyResolve(): Result<
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
      const bootstrapController = container.resolve<BootstrapController>(
        TOKENS.BootstrapController,
      );
      const proofApplicationService = container.resolve<ProofApplicationService>(
        TOKENS.ProofApplicationService,
      );
      const yamlSerializer = container.resolve<YAMLSerializer>(TOKENS.YAMLSerializer);

      return ok({
        documentQueryService,
        visualizationService,
        renderer,
        viewStateManager,
        viewStatePort,
        bootstrapController,
        proofApplicationService,
        yamlSerializer,
      });
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to resolve legacy dependencies: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Legacy method for backward compatibility with VS Code extension
   * @deprecated Use ProofTreePanel.createWithServices for proper dependency injection
   */
  public static createOrShow(extensionUri: vscode.Uri, content: string): void {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If panel exists, reveal it and update content
    if (ProofTreePanelLegacy.currentPanel) {
      ProofTreePanelLegacy.currentPanel.reveal();
      // Note: Legacy method doesn't handle Result pattern properly
      ProofTreePanelLegacy.currentPanel.updateContent(content).catch((_error) => {
        // Legacy mode error handling - errors are swallowed
      });
      return;
    }

    // If a panel is currently being created, wait for it and then reveal
    if (ProofTreePanelLegacy.creationPromise) {
      ProofTreePanelLegacy.creationPromise.then(() => {
        if (ProofTreePanelLegacy.currentPanel) {
          ProofTreePanelLegacy.currentPanel.reveal();
          ProofTreePanelLegacy.currentPanel.updateContent(content).catch((_error) => {
            // Legacy mode error handling - errors are swallowed
          });
        }
      });
      return;
    }

    // Use safe DI resolution for legacy compatibility
    const servicesResult = ProofTreePanelLegacy.safeLegacyResolve();
    if (servicesResult.isErr()) {
      vscode.window.showErrorMessage(
        `Failed to initialize proof tree panel: ${servicesResult.error.message}`,
      );
      return;
    }

    const {
      documentQueryService,
      visualizationService,
      renderer,
      viewStateManager,
      viewStatePort: _viewStatePort,
      bootstrapController,
      proofApplicationService,
      yamlSerializer,
    } = servicesResult.value;

    // Create VS Code webview panel directly (legacy mode)
    const panel = vscode.window.createWebviewPanel(
      'proofTreeVisualization',
      'Proof Tree Visualization',
      column ?? vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri],
      },
    );

    // Create legacy webview panel adapter with proper HTML forwarding
    const legacyWebviewPanel: WebviewPanel = {
      id: `legacy-panel-${Date.now()}`,
      webview: {
        get html() {
          return panel.webview.html;
        },
        set html(value: string) {
          panel.webview.html = value;
        },
        onDidReceiveMessage: (callback) => panel.webview.onDidReceiveMessage(callback),
      },
      onDidDispose: (callback) => panel.onDidDispose(callback),
      reveal: (viewColumn, preserveFocus) => panel.reveal(viewColumn, preserveFocus),
      dispose: () => panel.dispose(),
    };

    // Create legacy webview adapter for IUIPort
    const legacyUIPort: IUIPort = {
      createWebviewPanel: () => {
        // Return the legacy webview panel that forwards to VS Code
        return legacyWebviewPanel;
      },
      postMessageToWebview: (_panelId: string, message) => {
        panel.webview.postMessage(message);
      },
      showInformation: vscode.window.showInformationMessage,
      showWarning: vscode.window.showWarningMessage,
      showError: vscode.window.showErrorMessage,
      showInputBox: async () =>
        err({ code: 'NOT_SUPPORTED', message: 'Not supported in legacy mode' }),
      showQuickPick: async () =>
        err({ code: 'NOT_SUPPORTED', message: 'Not supported in legacy mode' }),
      showConfirmation: async () =>
        err({ code: 'NOT_SUPPORTED', message: 'Not supported in legacy mode' }),
      showOpenDialog: async () =>
        err({ code: 'NOT_SUPPORTED', message: 'Not supported in legacy mode' }),
      showSaveDialog: async () =>
        err({ code: 'NOT_SUPPORTED', message: 'Not supported in legacy mode' }),
      showProgress: async () => {
        throw new ValidationError('Progress not supported in legacy mode');
      },
      setStatusMessage: () => ({
        dispose: () => {
          /* No-op disposable */
        },
      }),
      getTheme: () => ({
        kind: 'dark' as const,
        colors: {},
        fonts: { default: '', monospace: '', size: 14 },
      }),
      onThemeChange: () => ({
        dispose: () => {
          /* No-op disposable */
        },
      }),
      capabilities: () => ({
        supportsFileDialogs: false,
        supportsNotificationActions: false,
        supportsProgress: false,
        supportsStatusBar: false,
        supportsWebviews: true,
        supportsThemes: false,
      }),
    };

    // Track panel creation promise for proper async handling
    ProofTreePanelLegacy.creationPromise = ProofTreePanel.createWithServices(
      'legacy-document',
      content,
      documentQueryService,
      visualizationService,
      legacyUIPort,
      renderer,
      viewStateManager,
      _viewStatePort,
    )
      .then((result) => {
        if (result.isOk()) {
          ProofTreePanelLegacy.currentPanel = result.value;
          ProofTreePanelLegacy.lastCreationError = undefined;

          // Set up disposal handling
          ProofTreePanelLegacy.currentPanel.onDidDispose(() => {
            ProofTreePanelLegacy.currentPanel = undefined;
            ProofTreePanelLegacy.creationPromise = undefined;
          });
        } else {
          ProofTreePanelLegacy.lastCreationError = result.error.message;
          vscode.window.showErrorMessage(
            `Failed to create proof tree panel: ${result.error.message}`,
          );
        }
      })
      .catch((error) => {
        ProofTreePanelLegacy.lastCreationError = `Unexpected error: ${error}`;
        vscode.window.showErrorMessage(`Failed to create proof tree panel: ${error}`);
      })
      .finally(() => {
        // Clear creation promise when done (success or failure)
        ProofTreePanelLegacy.creationPromise = undefined;
      });
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use updateContent directly on panel instance
   */
  public static updateContentIfExists(content: string): void {
    if (ProofTreePanelLegacy.currentPanel) {
      ProofTreePanelLegacy.currentPanel.updateContent(content).catch((_error) => {
        // Legacy mode error handling - errors are swallowed
      });
    } else if (ProofTreePanelLegacy.creationPromise) {
      // If panel is being created, wait for it then update
      ProofTreePanelLegacy.creationPromise.then(() => {
        if (ProofTreePanelLegacy.currentPanel) {
          ProofTreePanelLegacy.currentPanel.updateContent(content).catch((_error) => {
            // Legacy mode error handling - errors are swallowed
          });
        }
      });
    }
  }
}

/**
 * Legacy compatibility - maintains the original API
 * @deprecated Use ProofTreePanelManager.getInstance().createOrShowPanel() instead
 */
export function createOrShowProofTreePanel(
  extensionUri: vscode.Uri,
  content: string,
  documentUri?: string,
): void {
  // For compatibility, use the legacy single-panel approach if no document URI is provided
  if (!documentUri) {
    ProofTreePanelLegacy.createOrShow(extensionUri, content);
    return;
  }

  // Use the modern multi-panel manager for document-specific panels
  // Note: This would require creating a proper UIPort from the VS Code context
  // For now, fallback to legacy mode
  ProofTreePanelLegacy.createOrShow(extensionUri, content);
}

/**
 * Legacy compatibility for content updates
 * @deprecated Use ProofTreePanelManager.getInstance().updateContentForDocument() instead
 */
export function updateProofTreePanelContent(content: string, _documentUri?: string): void {
  // For compatibility, use the legacy single-panel approach
  ProofTreePanelLegacy.updateContentIfExists(content);
}

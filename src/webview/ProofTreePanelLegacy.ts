import * as vscode from 'vscode';
import type { DocumentQueryService } from '../application/services/DocumentQueryService.js';
import type { ProofVisualizationService } from '../application/services/ProofVisualizationService.js';
import { getContainer } from '../infrastructure/di/container.js';
import { TOKENS } from '../infrastructure/di/tokens.js';
import type { TreeRenderer } from './TreeRenderer.js';

/**
 * Legacy ProofTreePanel implementation for backward compatibility
 *
 * This class provides a singleton-style interface for managing proof tree panels
 * in VS Code. It maintains a single static instance and provides static methods
 * for creating, showing, and updating panels.
 */
export class ProofTreePanelLegacy {
  private static currentPanel: ProofTreePanelLegacy | undefined;
  private static creationPromise: Promise<void> | undefined;
  private static lastCreationError: Error | undefined;

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private readonly documentQueryService: DocumentQueryService;
  private readonly visualizationService: ProofVisualizationService;
  private readonly renderer: TreeRenderer;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    documentQueryService: DocumentQueryService,
    visualizationService: ProofVisualizationService,
    renderer: TreeRenderer,
  ) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.documentQueryService = documentQueryService;
    this.visualizationService = visualizationService;
    this.renderer = renderer;

    // Set up panel lifecycle
    this.panel.onDidDispose(() => {
      ProofTreePanelLegacy.currentPanel = undefined;
      ProofTreePanelLegacy.creationPromise = undefined;
    });

    // Set up initial HTML content
    this.panel.webview.html = this.getWebviewContent();
  }

  /**
   * Create or show the proof tree panel
   */
  static createOrShow(extensionUri: vscode.Uri, content: string): void {
    if (ProofTreePanelLegacy.currentPanel) {
      // Panel already exists, just reveal it
      ProofTreePanelLegacy.currentPanel.panel.reveal();
      // Update content
      ProofTreePanelLegacy.updateContentIfExists(content);
      return;
    }

    // Create new panel
    ProofTreePanelLegacy.creationPromise = ProofTreePanelLegacy.createNewPanel(
      extensionUri,
      content,
    );
  }

  /**
   * Update content if a panel exists
   */
  static updateContentIfExists(content: string): void {
    if (!ProofTreePanelLegacy.currentPanel) {
      return;
    }

    // Process content asynchronously
    ProofTreePanelLegacy.currentPanel.updateContent(content);
  }

  /**
   * Check if a current panel exists
   */
  static hasCurrentPanel(): boolean {
    return ProofTreePanelLegacy.currentPanel !== undefined;
  }

  /**
   * Wait for panel creation to complete
   */
  static async waitForCreation(): Promise<void> {
    if (ProofTreePanelLegacy.creationPromise) {
      await ProofTreePanelLegacy.creationPromise;
    }
  }

  /**
   * Get last creation error
   */
  static getLastCreationError(): Error | undefined {
    return ProofTreePanelLegacy.lastCreationError;
  }

  private static async createNewPanel(extensionUri: vscode.Uri, content: string): Promise<void> {
    try {
      ProofTreePanelLegacy.lastCreationError = undefined;

      // Create webview panel
      const panel = vscode.window.createWebviewPanel(
        'proofTreeVisualization',
        'Proof Tree Visualization',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [extensionUri],
        },
      );

      // Resolve dependencies
      const container = getContainer();
      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );
      const visualizationService = container.resolve<ProofVisualizationService>(
        TOKENS.ProofVisualizationService,
      );
      const renderer = container.resolve<TreeRenderer>(TOKENS.TreeRenderer);

      // Create panel instance
      ProofTreePanelLegacy.currentPanel = new ProofTreePanelLegacy(
        panel,
        extensionUri,
        documentQueryService,
        visualizationService,
        renderer,
      );

      // Update content
      await ProofTreePanelLegacy.currentPanel.updateContent(content);
    } catch (error) {
      ProofTreePanelLegacy.lastCreationError =
        error instanceof Error ? error : new Error(String(error));
      ProofTreePanelLegacy.currentPanel = undefined;
    }
  }

  private async updateContent(content: string): Promise<void> {
    try {
      // Parse content
      const parseResult = await this.documentQueryService.parseDocumentContent(content);
      if (parseResult.isErr()) {
        this.showError([{ message: parseResult.error.message }]);
        return;
      }

      // Generate visualization
      const visualizationResult = this.visualizationService.generateVisualization(
        parseResult.value,
      );
      if (visualizationResult.isErr()) {
        this.showError([{ message: visualizationResult.error.message }]);
        return;
      }

      // Render SVG
      const svgContent = this.renderer.generateSVG(visualizationResult.value);

      // Update webview
      this.panel.webview.postMessage({
        type: 'updateTree',
        content: svgContent,
      });
    } catch (error) {
      this.showError([{ message: error instanceof Error ? error.message : String(error) }]);
    }
  }

  private showError(errors: readonly { message: string; line?: number; section?: string }[]): void {
    const errorMessages = errors
      .map((error) => `${error.section ? `[${error.section}] ` : ''}${error.message}`)
      .join('\n');

    const errorContent = `
      <div class="error-container">
        <h3>Parse Errors</h3>
        <pre class="error-text">${this.escapeHtml(errorMessages)}</pre>
      </div>
    `;

    this.panel.webview.postMessage({
      type: 'showError',
      content: errorContent,
    });
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  private getWebviewContent(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Proof Tree Visualization</title>
        <style>
          body {
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            font-family: var(--vscode-editor-font-family);
            margin: 0;
            padding: 20px;
          }
          
          .tree-container {
            width: 100%;
            height: 100vh;
            overflow: auto;
          }
          
          .error-container {
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            color: var(--vscode-errorForeground);
            padding: 16px;
            border-radius: 4px;
            margin: 16px 0;
          }
          
          .error-text {
            margin: 8px 0 0 0;
            font-family: var(--vscode-editor-font-family);
            white-space: pre-wrap;
          }
          
          h3 {
            margin: 0 0 8px 0;
            color: var(--vscode-errorForeground);
          }
        </style>
      </head>
      <body>
        <div id="tree-container" class="tree-container">
          <p>Loading proof tree...</p>
        </div>
        
        <script>
          const vscode = acquireVsCodeApi();
          
          window.addEventListener('message', event => {
            const message = event.data;
            const container = document.getElementById('tree-container');
            
            switch (message.type) {
              case 'updateTree':
                container.innerHTML = message.content;
                break;
              case 'showError':
                container.innerHTML = message.content;
                break;
            }
          });
        </script>
      </body>
      </html>
    `;
  }
}

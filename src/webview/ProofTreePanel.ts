import * as vscode from 'vscode';

import { getContainer } from '../infrastructure/di/container.js';
import { TOKENS } from '../infrastructure/di/tokens.js';
import type { ProofFileParser } from '../parser/index.js';
import type { TreeRenderer } from './TreeRenderer.js';

// Note: ProofTreePanel cannot use @injectable due to private constructor
// It resolves dependencies manually through the DI container
export class ProofTreePanel {
  private static currentPanel: ProofTreePanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly parser: ProofFileParser;
  private readonly renderer: TreeRenderer;
  private readonly disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this.panel = panel;
    // Resolve dependencies through DI container
    const container = getContainer();
    this.parser = container.resolve<ProofFileParser>(TOKENS.ProofFileParser);
    this.renderer = container.resolve<TreeRenderer>(TOKENS.TreeRenderer);

    this.panel.onDidDispose(
      () => {
        this.dispose();
      },
      null,
      this.disposables,
    );
    this.panel.webview.html = this.getWebviewContent(extensionUri);
  }

  public static createOrShow(extensionUri: vscode.Uri, content: string): void {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (ProofTreePanel.currentPanel) {
      ProofTreePanel.currentPanel.panel.reveal(column);
      ProofTreePanel.currentPanel.updateContent(content);
      return;
    }

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

    ProofTreePanel.currentPanel = new ProofTreePanel(panel, extensionUri);
    ProofTreePanel.currentPanel.updateContent(content);
  }

  public static updateContentIfExists(content: string): void {
    if (ProofTreePanel.currentPanel) {
      ProofTreePanel.currentPanel.updateContent(content);
    }
  }

  public updateContent(content: string): void {
    const parseResult = this.parser.parseProofFile(content);

    if (parseResult.isErr()) {
      this.showParseErrors(parseResult.error.errors);
      return;
    }

    const svgContent = this.renderer.generateSVG(parseResult.value);
    this.panel.webview.postMessage({
      type: 'updateTree',
      content: svgContent,
    });
  }

  private showParseErrors(
    errors: readonly { message: string; line?: number; section?: string }[],
  ): void {
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

  private getWebviewContent(_extensionUri: vscode.Uri): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Proof Tree Visualization</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
          }
          
          .tree-container {
            overflow: auto;
            min-height: 100vh;
            width: 100%;
          }
          
          .error-container {
            background: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            border-radius: 4px;
            padding: 16px;
            margin: 16px 0;
          }
          
          .error-container h3 {
            margin: 0 0 12px 0;
            color: var(--vscode-errorForeground);
          }
          
          .error-text {
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            white-space: pre-wrap;
            margin: 0;
            color: var(--vscode-errorForeground);
          }
          
          .argument-node {
            stroke: var(--vscode-panel-border);
            stroke-width: 1;
            fill: var(--vscode-editor-background);
            filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.1));
          }
          
          .statement-text {
            font-size: 12px;
            fill: var(--vscode-editor-foreground);
            text-anchor: middle;
            font-family: var(--vscode-editor-font-family);
          }
          
          .side-label {
            font-size: 10px;
            fill: var(--vscode-descriptionForeground);
            text-anchor: start;
            font-style: italic;
          }
          
          .implication-line {
            stroke: var(--vscode-editor-foreground);
            stroke-width: 2;
          }
          
          .connection-line {
            stroke: var(--vscode-textLink-foreground);
            stroke-width: 2;
            marker-end: url(#arrowhead);
            stroke-dasharray: 5,5;
          }
          
          .premise-section {
            fill: var(--vscode-editor-background);
          }
          
          .conclusion-section {
            fill: var(--vscode-editor-background);
          }
        </style>
      </head>
      <body>
        <div id="tree-container" class="tree-container">
          <!-- Tree content will be populated here -->
        </div>
        
        <script>
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

  private dispose(): void {
    ProofTreePanel.currentPanel = undefined;
    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}

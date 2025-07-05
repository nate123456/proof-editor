import { err, ok, type Result } from 'neverthrow';
import type { CreateStatementCommand } from '../application/commands/statement-commands.js';
import type { IUIPort, WebviewPanel } from '../application/ports/IUIPort.js';
import type { IViewStatePort } from '../application/ports/IViewStatePort.js';
import type { DocumentQueryService } from '../application/services/DocumentQueryService.js';
import { DocumentViewStateManager } from '../application/services/DocumentViewStateManager.js';
import type { ProofApplicationService } from '../application/services/ProofApplicationService.js';
import type { ProofVisualizationService } from '../application/services/ProofVisualizationService.js';
import type { ViewStateManager } from '../application/services/ViewStateManager.js';
import { ValidationError } from '../domain/shared/result.js';
import { getContainer } from '../infrastructure/di/container.js';
import { TOKENS } from '../infrastructure/di/tokens.js';
import type { YAMLSerializer } from '../infrastructure/repositories/yaml/YAMLSerializer.js';
import type { BootstrapController } from '../presentation/controllers/BootstrapController.js';
import type { TreeRenderer } from './TreeRenderer.js';

// Note: ProofTreePanel cannot use @injectable due to private constructor
// It resolves dependencies manually through the DI container
export class ProofTreePanel {
  private readonly panelId: string;
  private readonly documentUri: string;
  private readonly uiPort: IUIPort;
  private readonly visualizationService: ProofVisualizationService;
  private readonly documentQueryService: DocumentQueryService;
  private readonly renderer: TreeRenderer;
  private readonly webviewPanel: WebviewPanel;
  private readonly viewStateManager: ViewStateManager;
  private readonly documentViewStateManager: DocumentViewStateManager;
  private readonly bootstrapController: BootstrapController;
  private readonly proofApplicationService: ProofApplicationService;
  private readonly yamlSerializer: YAMLSerializer;

  private constructor(
    panelId: string,
    documentUri: string,
    webviewPanel: WebviewPanel,
    uiPort: IUIPort,
    visualizationService: ProofVisualizationService,
    documentQueryService: DocumentQueryService,
    renderer: TreeRenderer,
    viewStateManager: ViewStateManager,
    documentViewStateManager: DocumentViewStateManager,
    bootstrapController: BootstrapController,
    proofApplicationService: ProofApplicationService,
    yamlSerializer: YAMLSerializer,
  ) {
    this.panelId = panelId;
    this.documentUri = documentUri;
    this.webviewPanel = webviewPanel;
    this.uiPort = uiPort;
    this.visualizationService = visualizationService;
    this.documentQueryService = documentQueryService;
    this.renderer = renderer;
    this.viewStateManager = viewStateManager;
    this.documentViewStateManager = documentViewStateManager;
    this.bootstrapController = bootstrapController;
    this.proofApplicationService = proofApplicationService;
    this.yamlSerializer = yamlSerializer;

    // Set up webview content and event handlers
    this.webviewPanel.webview.html = this.getWebviewContent();
    this.webviewPanel.onDidDispose(() => this.dispose());

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
  ): Promise<Result<ProofTreePanel, ValidationError>> {
    try {
      const panelId = `proof-tree-panel-${Date.now()}`;
      const documentName = documentUri.split('/').pop() || 'Unknown Document';

      // Create webview panel through platform abstraction
      const webviewPanel = uiPort.createWebviewPanel({
        id: panelId,
        title: `Proof Tree: ${documentName}`,
        viewType: 'proofTreeVisualization',
        showOptions: {
          viewColumn: 1,
          preserveFocus: false,
        },
        retainContextWhenHidden: true,
        enableScripts: true,
      });

      // Create document-specific view state manager with injected port
      const documentViewStateManager = new DocumentViewStateManager(viewStatePort, documentUri);

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
        documentViewStateManager,
        bootstrapController,
        proofApplicationService,
        yamlSerializer,
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

  public async updateContent(content: string): Promise<Result<void, ValidationError>> {
    try {
      // Parse content through application service
      const parseResult = await this.documentQueryService.parseDocumentContent(content);
      if (parseResult.isErr()) {
        const errorResult = this.showParseErrors([{ message: parseResult.error.message }]);
        if (errorResult.isErr()) {
          return err(errorResult.error);
        }
        return ok(undefined);
      }

      // Generate visualization through application service
      const visualizationResult = this.visualizationService.generateVisualization(
        parseResult.value,
      );
      if (visualizationResult.isErr()) {
        const errorResult = this.showParseErrors([{ message: visualizationResult.error.message }]);
        if (errorResult.isErr()) {
          return err(errorResult.error);
        }
        return ok(undefined);
      }

      // Render visualization (view-only operation)
      const svgContent = this.renderer.generateSVG(visualizationResult.value);

      // Send update through platform abstraction
      this.uiPort.postMessageToWebview(this.panelId, {
        type: 'updateTree',
        content: svgContent,
      });

      return ok(undefined);
    } catch (error) {
      // For unexpected errors, we return an error Result instead of just showing it
      return err(
        new ValidationError(
          `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  private showParseErrors(
    errors: readonly { message: string; line?: number; section?: string }[],
  ): Result<void, ValidationError> {
    try {
      const errorMessages = errors
        .map((error) => `${error.section ? `[${error.section}] ` : ''}${error.message}`)
        .join('\n');

      const errorContent = `
        <div class="error-container">
          <h3>Parse Errors</h3>
          <pre class="error-text">${this.escapeHtml(errorMessages)}</pre>
        </div>
      `;

      // Send error through platform abstraction
      this.uiPort.postMessageToWebview(this.panelId, {
        type: 'showError',
        content: errorContent,
      });

      return ok(undefined);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to show parse errors: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
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
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            darkMode: 'class',
            theme: {
              extend: {
                colors: {
                  vscode: {
                    'editor-bg': 'var(--vscode-editor-background)',
                    'editor-fg': 'var(--vscode-editor-foreground)',
                    'panel-bg': 'var(--vscode-panel-background)',
                    'panel-border': 'var(--vscode-panel-border)',
                    'button-bg': 'var(--vscode-button-background)',
                    'button-fg': 'var(--vscode-button-foreground)',
                    'button-hover': 'var(--vscode-button-hoverBackground)',
                    'button-secondary-bg': 'var(--vscode-button-secondaryBackground)',
                    'button-secondary-fg': 'var(--vscode-button-secondaryForeground)',
                    'button-secondary-hover': 'var(--vscode-button-secondaryHoverBackground)',
                    'input-bg': 'var(--vscode-input-background)',
                    'input-fg': 'var(--vscode-input-foreground)',
                    'input-border': 'var(--vscode-input-border)',
                    'sidebar-bg': 'var(--vscode-sideBar-background)',
                    'description-fg': 'var(--vscode-descriptionForeground)',
                    'error-bg': 'var(--vscode-inputValidation-errorBackground)',
                    'error-border': 'var(--vscode-inputValidation-errorBorder)',
                    'error-fg': 'var(--vscode-errorForeground)',
                    'textlink-fg': 'var(--vscode-textLink-foreground)',
                    'textlink-active': 'var(--vscode-textLink-activeForeground)',
                    'success-fg': 'var(--vscode-gitDecoration-addedResourceForeground)',
                  }
                },
                fontFamily: {
                  'vscode': ['var(--vscode-editor-font-family)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
                }
              }
            }
          }
        </script>
        <style>
          /* Custom styles for SVG elements that can't use Tailwind */
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
          
          .empty-argument {
            stroke: var(--vscode-textLink-foreground);
            stroke-width: 2;
            stroke-dasharray: 5,5;
            fill: none;
            cursor: pointer;
          }
          
          .empty-argument:hover {
            stroke: var(--vscode-textLink-activeForeground);
            stroke-width: 3;
          }
        </style>
      </head>
      <body class="bg-vscode-editor-bg text-vscode-editor-fg font-vscode m-0 p-0 flex flex-col h-screen">
        <!-- Toolbar -->
        <div class="bg-vscode-panel-bg border-b border-vscode-panel-border px-4 py-2 flex gap-2 items-center">
          <button id="create-argument-btn" onclick="showCreateArgumentForm()" 
                  class="bg-vscode-button-bg text-vscode-button-fg hover:bg-vscode-button-hover disabled:bg-vscode-button-secondary-bg disabled:text-vscode-button-secondary-fg disabled:cursor-not-allowed border-none px-3 py-1.5 rounded text-xs cursor-pointer transition-colors">
            Create First Argument
          </button>
          <button id="add-premise-btn" onclick="showAddStatementForm('premise')" disabled
                  class="bg-vscode-button-bg text-vscode-button-fg hover:bg-vscode-button-hover disabled:bg-vscode-button-secondary-bg disabled:text-vscode-button-secondary-fg disabled:cursor-not-allowed border-none px-3 py-1.5 rounded text-xs cursor-pointer transition-colors">
            Add Premise
          </button>
          <button id="add-conclusion-btn" onclick="showAddStatementForm('conclusion')" disabled
                  class="bg-vscode-button-bg text-vscode-button-fg hover:bg-vscode-button-hover disabled:bg-vscode-button-secondary-bg disabled:text-vscode-button-secondary-fg disabled:cursor-not-allowed border-none px-3 py-1.5 rounded text-xs cursor-pointer transition-colors">
            Add Conclusion
          </button>
          
          <!-- Separator -->
          <div class="w-px h-5 bg-vscode-panel-border mx-1"></div>
          
          <button id="zoom-in-btn" onclick="zoomIn()"
                  class="bg-vscode-button-bg text-vscode-button-fg hover:bg-vscode-button-hover border-none px-3 py-1.5 rounded text-xs cursor-pointer transition-colors">
            Zoom In
          </button>
          <button id="zoom-out-btn" onclick="zoomOut()"
                  class="bg-vscode-button-bg text-vscode-button-fg hover:bg-vscode-button-hover border-none px-3 py-1.5 rounded text-xs cursor-pointer transition-colors">
            Zoom Out
          </button>
          <button id="reset-view-btn" onclick="resetView()"
                  class="bg-vscode-button-bg text-vscode-button-fg hover:bg-vscode-button-hover border-none px-3 py-1.5 rounded text-xs cursor-pointer transition-colors">
            Reset View
          </button>
          
          <!-- Separator -->
          <div class="w-px h-5 bg-vscode-panel-border mx-1"></div>
          
          <button id="export-btn" onclick="exportProof()" disabled
                  class="bg-vscode-button-bg text-vscode-button-fg hover:bg-vscode-button-hover disabled:bg-vscode-button-secondary-bg disabled:text-vscode-button-secondary-fg disabled:cursor-not-allowed border-none px-3 py-1.5 rounded text-xs cursor-pointer transition-colors">
            Export
          </button>
        </div>
        
        <!-- Main Content -->
        <div class="flex-1 flex relative overflow-hidden">
          <!-- Tree Container -->
          <div id="tree-container" class="flex-1 overflow-auto relative">
            <!-- Bootstrap Overlay -->
            <div id="bootstrap-overlay" class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-vscode-editor-bg border-2 border-dashed border-vscode-panel-border rounded-lg p-8 text-center max-w-sm z-50">
              <h2 class="text-lg font-semibold text-vscode-editor-fg mb-4 mt-0">Welcome to Proof Editor!</h2>
              <p class="text-vscode-description-fg leading-relaxed mb-6 mt-0">You're ready to build your first proof. Follow these steps to get started:</p>
              
              <div class="text-left mb-6">
                <ol class="list-decimal list-inside text-vscode-description-fg space-y-2 m-0 pl-0">
                  <li>Click "Create First Argument" to add an empty argument</li>
                  <li>Add premises (what you're starting with)</li>
                  <li>Add conclusions (what follows from the premises)</li>
                  <li>Create branches to build complex argument trees</li>
                </ol>
              </div>
              
              <button onclick="showCreateArgumentForm()"
                      class="bg-vscode-button-bg text-vscode-button-fg hover:bg-vscode-button-hover border-none px-4 py-2 rounded text-sm cursor-pointer transition-colors">
                Create First Argument
              </button>
            </div>
          </div>
          
          <!-- Sidebar -->
          <div id="sidebar" class="w-75 bg-vscode-sidebar-bg border-l border-vscode-panel-border overflow-y-auto hidden">
            <div class="p-4">
              <!-- Create Argument Form -->
              <div id="create-argument-form" class="hidden">
                <h3 class="text-sm font-medium text-vscode-editor-fg mb-4 mt-0">Create New Argument</h3>
                
                <div class="mb-4">
                  <label for="premise-input" class="block mb-1 text-xs text-vscode-description-fg">Premises (one per line):</label>
                  <textarea id="premise-input" 
                            placeholder="All humans are mortal&#10;Socrates is human"
                            class="w-full bg-vscode-input-bg text-vscode-input-fg border border-vscode-input-border px-2 py-1.5 rounded text-xs font-vscode resize-vertical min-h-15 box-border"></textarea>
                </div>
                
                <div class="mb-4">
                  <label for="conclusion-input" class="block mb-1 text-xs text-vscode-description-fg">Conclusions (one per line):</label>
                  <textarea id="conclusion-input" 
                            placeholder="Therefore, Socrates is mortal"
                            class="w-full bg-vscode-input-bg text-vscode-input-fg border border-vscode-input-border px-2 py-1.5 rounded text-xs font-vscode resize-vertical min-h-15 box-border"></textarea>
                </div>
                
                <div class="mb-4">
                  <label for="rule-input" class="block mb-1 text-xs text-vscode-description-fg">Rule Name (optional):</label>
                  <input type="text" id="rule-input" 
                         placeholder="Modus Ponens"
                         class="w-full bg-vscode-input-bg text-vscode-input-fg border border-vscode-input-border px-2 py-1.5 rounded text-xs font-vscode box-border">
                </div>
                
                <div class="flex gap-2 mt-4">
                  <button onclick="createArgument()"
                          class="flex-1 bg-vscode-button-bg text-vscode-button-fg hover:bg-vscode-button-hover border-none px-3 py-2 rounded text-xs cursor-pointer">
                    Create
                  </button>
                  <button onclick="hideSidebar()"
                          class="flex-1 bg-vscode-button-secondary-bg text-vscode-button-secondary-fg hover:bg-vscode-button-secondary-hover border-none px-3 py-2 rounded text-xs cursor-pointer">
                    Cancel
                  </button>
                </div>
              </div>
              
              <!-- Add Statement Form -->
              <div id="add-statement-form" class="hidden">
                <h3 id="statement-form-title" class="text-sm font-medium text-vscode-editor-fg mb-4 mt-0">Add Statement</h3>
                
                <div class="mb-4">
                  <label for="statement-content" class="block mb-1 text-xs text-vscode-description-fg">Statement:</label>
                  <textarea id="statement-content" 
                            placeholder="Enter your statement here..."
                            class="w-full bg-vscode-input-bg text-vscode-input-fg border border-vscode-input-border px-2 py-1.5 rounded text-xs font-vscode resize-vertical min-h-15 box-border"></textarea>
                </div>
                
                <div class="flex gap-2 mt-4">
                  <button onclick="addStatement()"
                          class="flex-1 bg-vscode-button-bg text-vscode-button-fg hover:bg-vscode-button-hover border-none px-3 py-2 rounded text-xs cursor-pointer">
                    Add
                  </button>
                  <button onclick="hideSidebar()"
                          class="flex-1 bg-vscode-button-secondary-bg text-vscode-button-secondary-fg hover:bg-vscode-button-secondary-hover border-none px-3 py-2 rounded text-xs cursor-pointer">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <script>
          const vscode = acquireVsCodeApi();
          let currentZoom = 1;
          let hasArguments = false;
          let currentStatementType = 'premise';
          
          window.addEventListener('message', event => {
            const message = event.data;
            const container = document.getElementById('tree-container');
            const overlay = document.getElementById('bootstrap-overlay');
            
            switch (message.type) {
              case 'updateTree':
                container.innerHTML = message.content;
                if (message.content && message.content.trim().length > 0) {
                  overlay.style.display = 'none';
                  hasArguments = true;
                  updateToolbarState();
                }
                break;
              case 'showError':
                container.innerHTML = message.content;
                break;
              case 'showBootstrapGuide':
                overlay.style.display = 'block';
                hasArguments = false;
                updateToolbarState();
                break;
              case 'argumentCreated':
                hideSidebar();
                overlay.style.display = 'none';
                hasArguments = true;
                updateToolbarState();
                showSuccessMessage('Argument created successfully!');
                break;
              case 'restoreViewportState':
              case 'restorePanelState':
              case 'restoreSelectionState':
              case 'restoreThemeState':
                // Handle view state restoration
                break;
            }
          });
          
          function updateToolbarState() {
            document.getElementById('create-argument-btn').disabled = hasArguments;
            document.getElementById('add-premise-btn').disabled = !hasArguments;
            document.getElementById('add-conclusion-btn').disabled = !hasArguments;
            document.getElementById('export-btn').disabled = !hasArguments;
            
            if (hasArguments) {
              document.getElementById('create-argument-btn').textContent = 'Create Another Argument';
              document.getElementById('create-argument-btn').disabled = false;
            }
          }
          
          function showCreateArgumentForm() {
            showSidebar();
            hideAllForms();
            document.getElementById('create-argument-form').classList.remove('hidden');
            document.getElementById('create-argument-form').classList.add('block');
          }
          
          function showAddStatementForm(type) {
            currentStatementType = type;
            showSidebar();
            hideAllForms();
            document.getElementById('add-statement-form').classList.remove('hidden');
            document.getElementById('add-statement-form').classList.add('block');
            document.getElementById('statement-form-title').textContent = 
              type === 'premise' ? 'Add Premise' : 'Add Conclusion';
          }
          
          function showSidebar() {
            document.getElementById('sidebar').classList.remove('hidden');
            document.getElementById('sidebar').classList.add('block');
          }
          
          function hideSidebar() {
            document.getElementById('sidebar').classList.add('hidden');
            document.getElementById('sidebar').classList.remove('block');
            hideAllForms();
          }
          
          function hideAllForms() {
            document.getElementById('create-argument-form').classList.add('hidden');
            document.getElementById('create-argument-form').classList.remove('block');
            document.getElementById('add-statement-form').classList.add('hidden');
            document.getElementById('add-statement-form').classList.remove('block');
          }
          
          function createArgument() {
            const premises = document.getElementById('premise-input').value
              .split('\\n')
              .map(p => p.trim())
              .filter(p => p.length > 0);
            const conclusions = document.getElementById('conclusion-input').value
              .split('\\n')
              .map(c => c.trim())
              .filter(c => c.length > 0);
            const ruleName = document.getElementById('rule-input').value.trim();
            
            if (premises.length === 0) {
              showErrorMessage('At least one premise is required');
              return;
            }
            
            if (conclusions.length === 0) {
              showErrorMessage('At least one conclusion is required');
              return;
            }
            
            vscode.postMessage({
              type: 'createArgument',
              premises,
              conclusions,
              ruleName: ruleName || undefined
            });
            
            // Clear form
            document.getElementById('premise-input').value = '';
            document.getElementById('conclusion-input').value = '';
            document.getElementById('rule-input').value = '';
          }
          
          function addStatement() {
            const content = document.getElementById('statement-content').value.trim();
            
            if (!content) {
              showErrorMessage('Statement content cannot be empty');
              return;
            }
            
            vscode.postMessage({
              type: 'addStatement',
              statementType: currentStatementType,
              content
            });
            
            // Clear form
            document.getElementById('statement-content').value = '';
          }
          
          function zoomIn() {
            currentZoom = Math.min(currentZoom * 1.2, 3);
            applyZoom();
          }
          
          function zoomOut() {
            currentZoom = Math.max(currentZoom / 1.2, 0.5);
            applyZoom();
          }
          
          function resetView() {
            currentZoom = 1;
            applyZoom();
          }
          
          function applyZoom() {
            const container = document.getElementById('tree-container');
            container.style.transform = \`scale(\${currentZoom})\`;
            container.style.transformOrigin = 'top left';
            
            vscode.postMessage({
              type: 'viewportChanged',
              viewport: { zoom: currentZoom, pan: { x: 0, y: 0 }, center: { x: 0, y: 0 } }
            });
          }
          
          function exportProof() {
            vscode.postMessage({
              type: 'exportProof'
            });
          }
          
          function showErrorMessage(message) {
            vscode.postMessage({
              type: 'showError',
              message
            });
          }
          
          function showSuccessMessage(message) {
            // Could implement a toast notification system here
            console.log('Success:', message);
          }
          
          // Initialize
          updateToolbarState();
        </script>
      </body>
      </html>
    `;
  }

  private async initializeViewState(): Promise<void> {
    try {
      // Restore document-specific viewport state
      const viewportResult = await this.documentViewStateManager.getViewportState();
      if (viewportResult.isOk()) {
        // Send viewport state to webview for restoration
        this.uiPort.postMessageToWebview(this.panelId, {
          type: 'restoreViewportState',
          viewport: viewportResult.value,
        });
      }

      // Restore document-specific panel state
      const panelResult = await this.documentViewStateManager.getPanelState();
      if (panelResult.isOk()) {
        // Send panel state to webview
        this.uiPort.postMessageToWebview(this.panelId, {
          type: 'restorePanelState',
          panel: panelResult.value,
        });
      }

      // Restore document-specific selection state
      const selectionResult = await this.documentViewStateManager.getSelectionState();
      if (selectionResult.isOk()) {
        // Send selection state to webview
        this.uiPort.postMessageToWebview(this.panelId, {
          type: 'restoreSelectionState',
          selection: selectionResult.value,
        });
      }

      // Restore global theme state
      const themeResult = await this.documentViewStateManager.getThemeState();
      if (themeResult.isOk()) {
        // Send theme state to webview
        this.uiPort.postMessageToWebview(this.panelId, {
          type: 'restoreThemeState',
          theme: themeResult.value,
        });
      }

      // Set up message handling for viewport changes from webview
      this.webviewPanel.webview.onDidReceiveMessage(async (message) => {
        await this.handleWebviewMessage(message);
      });
    } catch (_error) {
      // Initialization errors should not prevent panel creation
      if (process.env.NODE_ENV === 'development') {
        // Could add debug logging here in development
      }
    }
  }

  private async handleWebviewMessage(message: unknown): Promise<void> {
    try {
      const msg = message as { type: string; [key: string]: unknown };

      switch (msg.type) {
        case 'viewportChanged': {
          const viewport = msg.viewport as {
            zoom: number;
            pan: { x: number; y: number };
            center: { x: number; y: number };
          };
          await this.viewStateManager.updateViewportState(viewport);
          break;
        }
        case 'panelStateChanged': {
          const panel = msg.panel as {
            miniMapVisible: boolean;
            sideLabelsVisible: boolean;
            validationPanelVisible: boolean;
            panelSizes: Record<string, number>;
          };
          await this.viewStateManager.updatePanelState(panel);
          break;
        }
        case 'selectionChanged': {
          const selection = msg.selection as {
            selectedNodes: string[];
            selectedStatements: string[];
            selectedTrees: string[];
          };
          await this.viewStateManager.updateSelectionState(selection);
          break;
        }
        case 'createArgument': {
          await this.handleCreateArgument(msg);
          break;
        }
        case 'addStatement': {
          await this.handleAddStatement(msg);
          break;
        }
        case 'exportProof': {
          await this.handleExportProof();
          break;
        }
        case 'showError': {
          const errorMessage = msg.message as string;
          this.uiPort.showError(errorMessage);
          break;
        }
      }
    } catch (_error) {
      // Message handling errors should not crash the panel
      if (process.env.NODE_ENV === 'development') {
        // Could add debug logging here in development
      }
    }
  }

  private async handleCreateArgument(msg: { [key: string]: unknown }): Promise<void> {
    try {
      const premises = msg.premises as string[];
      const conclusions = msg.conclusions as string[];
      const ruleName = msg.ruleName as string | undefined;

      if (!premises || !Array.isArray(premises) || premises.length === 0) {
        this.uiPort.showError('At least one premise is required');
        return;
      }

      if (!conclusions || !Array.isArray(conclusions) || conclusions.length === 0) {
        this.uiPort.showError('At least one conclusion is required');
        return;
      }

      // Extract document ID from URI
      const documentId = this.extractDocumentIdFromUri();
      if (!documentId) {
        this.uiPort.showError('Could not determine document ID');
        return;
      }

      // First create an empty bootstrap argument
      const createResult = await this.bootstrapController.createBootstrapArgument(documentId);
      if (createResult.isErr()) {
        this.uiPort.showError(createResult.error.message);
        return;
      }

      const argumentId = createResult.value.data?.argumentId;
      if (!argumentId) {
        this.uiPort.showError('Failed to get argument ID from created argument');
        return;
      }

      // Then populate it with the provided premises and conclusions
      const result = await this.bootstrapController.populateEmptyArgument(
        documentId,
        argumentId,
        premises,
        conclusions,
        ruleName ? { left: ruleName } : undefined,
      );

      if (result.isErr()) {
        this.uiPort.showError(result.error.message);
        return;
      }

      // Notify webview of success
      this.uiPort.postMessageToWebview(this.panelId, {
        type: 'argumentCreated',
        argumentId: result.value.data?.argumentId,
      });

      // Refresh the content to show the new argument
      await this.refreshContent();
    } catch (error) {
      this.uiPort.showError(
        `Failed to create argument: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async handleAddStatement(msg: { [key: string]: unknown }): Promise<void> {
    try {
      const statementType = msg.statementType as 'premise' | 'conclusion';
      const content = msg.content as string;

      if (!content || content.trim().length === 0) {
        this.uiPort.showError('Statement content cannot be empty');
        return;
      }

      // Extract document ID from URI
      const documentId = this.extractDocumentIdFromUri();
      if (!documentId) {
        this.uiPort.showError('Could not determine document ID');
        return;
      }

      // Create statement command
      const command: CreateStatementCommand = {
        documentId,
        content: content.trim(),
      };

      // Execute command through ProofApplicationService
      const result = await this.proofApplicationService.createStatement(command);

      if (result.isErr()) {
        this.uiPort.showError(result.error.message);
        return;
      }

      // Notify webview of success
      this.uiPort.postMessageToWebview(this.panelId, {
        type: 'statementAdded',
        statementType,
        statementId: result.value.id,
        content: result.value.content,
      });

      // Show success message
      this.uiPort.showInformation(
        `${statementType === 'premise' ? 'Premise' : 'Conclusion'} added successfully`,
      );

      // Refresh the content to show the new statement
      await this.refreshContent();
    } catch (error) {
      this.uiPort.showError(
        `Failed to add statement: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async handleExportProof(): Promise<void> {
    try {
      // Extract document ID from URI
      const documentId = this.extractDocumentIdFromUri();
      if (!documentId) {
        this.uiPort.showError('Could not determine document ID');
        return;
      }

      // Get document info for summary
      const documentResult = await this.documentQueryService.getDocumentById(documentId);
      if (documentResult.isErr()) {
        this.uiPort.showError(`Failed to load document: ${documentResult.error.message}`);
        return;
      }

      const documentInfo = documentResult.value;

      // Create export summary for user feedback
      const exportSummary = `Document Export Summary:
- Document ID: ${documentInfo.id}
- Statements: ${Object.keys(documentInfo.statements).length}
- Arguments: ${Object.keys(documentInfo.atomicArguments).length}
- Trees: ${Object.keys(documentInfo.trees).length}

Export functionality is available but requires direct repository access.
For now, displaying the document structure above.`;

      // Show export information
      this.uiPort.showInformation('Export data prepared - see details in panel');

      // Post export data to webview
      this.uiPort.postMessageToWebview(this.panelId, {
        type: 'exportCompleted',
        summary: exportSummary,
        documentId,
        documentData: documentInfo,
      });
    } catch (error) {
      this.uiPort.showError(
        `Failed to export proof: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private extractDocumentIdFromUri(): string | null {
    try {
      // Extract filename from URI and use as document ID
      const uri = this.documentUri;
      // Handle both Unix and Windows path separators
      const parts = uri.split(/[/\\]/);
      const fileName = parts[parts.length - 1];
      if (!fileName || fileName.length === 0) {
        return null;
      }
      return fileName.replace('.proof', '');
    } catch (_error) {
      return null;
    }
  }

  private async refreshContent(): Promise<void> {
    try {
      // Extract document ID from URI
      const documentId = this.extractDocumentIdFromUri();
      if (!documentId) {
        // Silently fail if we can't determine document ID during refresh
        return;
      }

      // Get updated document content
      const documentResult = await this.documentQueryService.getDocumentById(documentId);
      if (documentResult.isErr()) {
        // Silently fail during refresh to avoid disrupting user experience
        return;
      }

      // Generate updated visualization
      const visualizationResult = this.visualizationService.generateVisualization(
        documentResult.value,
      );

      if (visualizationResult.isErr()) {
        // Silently fail during refresh
        return;
      }

      const svgContent = this.renderer.generateSVG(visualizationResult.value);

      // Update webview content
      this.uiPort.postMessageToWebview(this.panelId, {
        type: 'updateTree',
        content: svgContent,
      });
    } catch (_error) {
      // Ignore refresh errors to avoid disrupting user experience
    }
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
   * Dispose of this panel
   */
  dispose(): void {
    this.webviewPanel.dispose();
  }
}

import { err, ok, type Result } from 'neverthrow';
import type { CreateStatementCommand } from '../application/commands/statement-commands.js';
import type { IExportService } from '../application/ports/IExportService.js';
import type { IUIPort, WebviewPanel } from '../application/ports/IUIPort.js';
import type { IViewStatePort } from '../application/ports/IViewStatePort.js';
import type { DocumentDTO } from '../application/queries/document-queries.js';
import type { IDocumentIdService } from '../application/services/DocumentIdService.js';
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
  private readonly exportService: IExportService;
  private readonly documentIdService: IDocumentIdService;
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
    documentViewStateManager: DocumentViewStateManager,
    bootstrapController: BootstrapController,
    proofApplicationService: ProofApplicationService,
    yamlSerializer: YAMLSerializer,
    exportService: IExportService,
    documentIdService: IDocumentIdService,
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
    this.exportService = exportService;
    this.documentIdService = documentIdService;

    // Set up webview content and event handlers
    this.webviewPanel.webview.html = this.getWebviewContent();
    this.webviewPanel.onDidDispose(() => {
      if (!this.isDisposed) {
        this.handleDisposal();
      }
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
          
          .interactive-node {
            cursor: pointer;
            transition: stroke-width 0.2s ease;
          }
          
          .interactive-node:hover {
            stroke: var(--vscode-textLink-foreground);
            stroke-width: 2;
          }
          
          .statement-text {
            font-size: 12px;
            fill: var(--vscode-editor-foreground);
            text-anchor: middle;
            font-family: var(--vscode-editor-font-family);
          }
          
          .editable-statement {
            cursor: text;
            transition: fill 0.2s ease;
          }
          
          .editable-statement:hover {
            fill: var(--vscode-textLink-foreground);
          }
          
          .statement-background {
            transition: fill 0.2s ease;
          }
          
          .statement-background:hover {
            fill: var(--vscode-button-secondaryBackground);
            opacity: 0.3;
          }
          
          .side-label {
            font-size: 10px;
            fill: var(--vscode-descriptionForeground);
            text-anchor: start;
            font-style: italic;
          }
          
          .editable-label {
            cursor: text;
          }
          
          .editable-label:hover {
            fill: var(--vscode-textLink-foreground);
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
            transition: stroke-width 0.2s ease;
          }
          
          .interactive-connection:hover {
            stroke: var(--vscode-textLink-activeForeground);
            stroke-width: 3;
          }
          
          .connection-hit-area {
            cursor: pointer;
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
          
          /* Drag and Drop Styles */
          .drag-handle {
            cursor: grab;
            transition: opacity 0.2s ease;
          }
          
          .drag-handle:hover {
            opacity: 0.6 !important;
          }
          
          .dragging {
            opacity: 0.5;
            cursor: grabbing;
          }
          
          .drop-zone {
            transition: opacity 0.2s ease;
            pointer-events: none;
          }
          
          .drop-zone.active {
            opacity: 0.3 !important;
            stroke: var(--vscode-button-background);
            stroke-width: 2;
            stroke-dasharray: 5,5;
          }
          
          .drop-zone.valid {
            fill: var(--vscode-gitDecoration-addedResourceForeground) !important;
          }
          
          .drop-zone.invalid {
            fill: var(--vscode-errorForeground) !important;
          }
          
          /* Connection Highlights */
          .connection-highlighted {
            stroke: var(--vscode-textLink-activeForeground) !important;
            stroke-width: 4 !important;
            filter: drop-shadow(0 0 3px var(--vscode-textLink-activeForeground));
          }
          
          .statement-highlighted {
            fill: var(--vscode-textLink-activeForeground) !important;
            filter: drop-shadow(0 0 2px var(--vscode-textLink-activeForeground));
          }
          
          /* Editing States */
          .editing-active {
            outline: 2px solid var(--vscode-focusBorder);
            outline-offset: 2px;
            background: var(--vscode-input-background);
          }
          
          .proof-tree-svg {
            user-select: none;
          }
          
          /* Inline Editor */
          .inline-editor {
            position: absolute;
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 2px;
            padding: 4px 8px;
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
            color: var(--vscode-input-foreground);
            z-index: 1000;
            min-width: 100px;
            resize: none;
            overflow: hidden;
          }
          
          .inline-editor:focus {
            outline: 1px solid var(--vscode-focusBorder);
            border-color: var(--vscode-focusBorder);
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
                  // Initialize interactive features after content update
                  initializeInteractiveFeatures();
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
              case 'branchCreated':
                showSuccessMessage('Branch created successfully!');
                // Re-initialize interactive features after content update
                initializeInteractiveFeatures();
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
          
          // =============================================================================
          // ENHANCED INTERACTIVE FEATURES
          // =============================================================================
          
          // State for interactive features
          let currentEditor = null;
          let dragState = {
            isDragging: false,
            element: null,
            startX: 0,
            startY: 0,
            type: null // 'statement' or 'node'
          };
          
          /**
           * Initialize all interactive features after content update
           */
          function initializeInteractiveFeatures() {
            try {
              setupInlineEditing();
              setupDragAndDrop();
              setupHoverHighlights();
              setupConnectionHighlights();
              setupBranchingInteractions();
            } catch (error) {
              console.warn('Error initializing interactive features:', error);
            }
          }
          
          // =============================================================================
          // INLINE EDITING FUNCTIONALITY
          // =============================================================================
          
          /**
           * Set up click-to-edit functionality for statements and labels
           */
          function setupInlineEditing() {
            // Statement editing
            document.querySelectorAll('.editable-statement').forEach(element => {
              element.addEventListener('click', handleStatementEdit);
            });
            
            // Side label editing
            document.querySelectorAll('.editable-label').forEach(element => {
              element.addEventListener('click', handleLabelEdit);
            });
            
            // Close editor on outside clicks
            document.addEventListener('click', handleOutsideClick);
            
            // Handle escape key to cancel editing
            document.addEventListener('keydown', handleEditingKeydown);
          }
          
          /**
           * Handle statement text editing
           */
          function handleStatementEdit(event) {
            event.stopPropagation();
            
            if (currentEditor) {
              finishEditing();
            }
            
            const element = event.target;
            const statementId = element.getAttribute('data-statement-id');
            const originalContent = element.getAttribute('data-original-content');
            const nodeId = element.getAttribute('data-node-id');
            const statementType = element.getAttribute('data-statement-type');
            
            if (!statementId || !originalContent) return;
            
            startInlineEdit(element, originalContent, {
              type: 'statement',
              statementId,
              nodeId,
              statementType
            });
          }
          
          /**
           * Handle side label editing
           */
          function handleLabelEdit(event) {
            event.stopPropagation();
            
            if (currentEditor) {
              finishEditing();
            }
            
            const element = event.target;
            const nodeId = element.getAttribute('data-node-id');
            const labelType = element.getAttribute('data-label-type');
            const originalContent = element.textContent.trim();
            
            if (!nodeId || !labelType) return;
            
            startInlineEdit(element, originalContent, {
              type: 'label',
              nodeId,
              labelType
            });
          }
          
          /**
           * Start inline editing for an element
           */
          function startInlineEdit(targetElement, originalContent, metadata) {
            // Get position relative to tree container
            const container = document.getElementById('tree-container');
            const containerRect = container.getBoundingClientRect();
            const elementRect = targetElement.getBoundingClientRect();
            
            // Create textarea for editing
            const editor = document.createElement('textarea');
            editor.className = 'inline-editor';
            editor.value = originalContent;
            
            // Position the editor
            editor.style.left = (elementRect.left - containerRect.left + container.scrollLeft) + 'px';
            editor.style.top = (elementRect.top - containerRect.top + container.scrollTop) + 'px';
            editor.style.width = Math.max(elementRect.width, 100) + 'px';
            
            // Add to container
            container.appendChild(editor);
            
            // Store current editing state
            currentEditor = {
              element: editor,
              target: targetElement,
              originalContent,
              metadata
            };
            
            // Focus and select content
            editor.focus();
            editor.select();
            
            // Adjust height to content
            adjustEditorHeight(editor);
            
            // Handle input changes
            editor.addEventListener('input', () => adjustEditorHeight(editor));
            editor.addEventListener('keydown', handleEditorKeydown);
            
            // Mark target as being edited
            targetElement.classList.add('editing-active');
          }
          
          /**
           * Adjust editor height to fit content
           */
          function adjustEditorHeight(editor) {
            editor.style.height = 'auto';
            editor.style.height = Math.max(editor.scrollHeight, 20) + 'px';
          }
          
          /**
           * Handle keydown events in editor
           */
          function handleEditorKeydown(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              finishEditing(true);
            } else if (event.key === 'Escape') {
              event.preventDefault();
              finishEditing(false);
            }
          }
          
          /**
           * Handle global keydown events during editing
           */
          function handleEditingKeydown(event) {
            if (currentEditor && event.key === 'Escape') {
              event.preventDefault();
              finishEditing(false);
            }
          }
          
          /**
           * Handle clicks outside the editor
           */
          function handleOutsideClick(event) {
            if (currentEditor && !currentEditor.element.contains(event.target)) {
              finishEditing(true);
            }
          }
          
          /**
           * Finish editing and save/cancel changes
           */
          function finishEditing(save = true) {
            if (!currentEditor) return;
            
            const { element, target, originalContent, metadata } = currentEditor;
            
            if (save && element.value.trim() !== originalContent) {
              // Save the changes
              saveEditedContent(element.value.trim(), metadata);
            }
            
            // Clean up
            target.classList.remove('editing-active');
            element.remove();
            currentEditor = null;
          }
          
          /**
           * Save edited content back to the model
           */
          function saveEditedContent(newContent, metadata) {
            vscode.postMessage({
              type: 'editContent',
              metadata,
              newContent
            });
          }
          
          // =============================================================================
          // DRAG AND DROP FUNCTIONALITY
          // =============================================================================
          
          /**
           * Set up drag and drop functionality
           */
          function setupDragAndDrop() {
            // Make statements draggable
            document.querySelectorAll('.statement-group').forEach(setupStatementDrag);
            
            // Make nodes draggable via drag handles
            document.querySelectorAll('.drag-handle').forEach(setupNodeDrag);
            
            // Set up drop zones
            document.querySelectorAll('.drop-zone').forEach(setupDropZone);
            
            // Global drag event handlers
            document.addEventListener('dragover', handleDragOver);
            document.addEventListener('drop', handleDrop);
          }
          
          /**
           * Set up dragging for statement elements
           */
          function setupStatementDrag(element) {
            element.draggable = true;
            element.addEventListener('dragstart', handleStatementDragStart);
            element.addEventListener('dragend', handleDragEnd);
          }
          
          /**
           * Set up dragging for node drag handles
           */
          function setupNodeDrag(handle) {
            handle.addEventListener('mousedown', handleNodeDragStart);
          }
          
          /**
           * Set up drop zones
           */
          function setupDropZone(zone) {
            zone.addEventListener('dragenter', handleDragEnter);
            zone.addEventListener('dragleave', handleDragLeave);
          }
          
          /**
           * Handle start of statement drag
           */
          function handleStatementDragStart(event) {
            const element = event.currentTarget;
            const statementId = element.getAttribute('data-statement-id');
            const statementType = element.getAttribute('data-statement-type');
            const nodeId = element.getAttribute('data-node-id');
            
            dragState = {
              isDragging: true,
              element,
              type: 'statement',
              data: { statementId, statementType, nodeId }
            };
            
            // Set drag data
            event.dataTransfer.setData('text/plain', JSON.stringify(dragState.data));
            event.dataTransfer.effectAllowed = 'move';
            
            // Add visual feedback
            element.classList.add('dragging');
            
            // Show drop zones
            showCompatibleDropZones(statementType);
          }
          
          /**
           * Handle start of node drag (via drag handle)
           */
          function handleNodeDragStart(event) {
            event.preventDefault();
            
            const handle = event.currentTarget;
            const nodeId = handle.getAttribute('data-node-id');
            const nodeElement = document.querySelector(\`[data-node-id="\${nodeId}"].argument-node-group\`);
            
            if (!nodeElement) return;
            
            dragState = {
              isDragging: true,
              element: nodeElement,
              type: 'node',
              startX: event.clientX,
              startY: event.clientY,
              data: { nodeId }
            };
            
            // Add visual feedback
            nodeElement.classList.add('dragging');
            
            // Add mouse move and up listeners
            document.addEventListener('mousemove', handleNodeDrag);
            document.addEventListener('mouseup', handleNodeDragEnd);
          }
          
          /**
           * Handle node dragging (mouse move)
           */
          function handleNodeDrag(event) {
            if (!dragState.isDragging || dragState.type !== 'node') return;
            
            const deltaX = event.clientX - dragState.startX;
            const deltaY = event.clientY - dragState.startY;
            
            // Update visual position (this is just visual feedback)
            dragState.element.style.transform = \`translate(\${deltaX}px, \${deltaY}px)\`;
          }
          
          /**
           * Handle end of node drag
           */
          function handleNodeDragEnd(event) {
            if (!dragState.isDragging || dragState.type !== 'node') return;
            
            // Calculate final position
            const deltaX = event.clientX - dragState.startX;
            const deltaY = event.clientY - dragState.startY;
            
            // Send position update to backend
            if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
              vscode.postMessage({
                type: 'moveNode',
                nodeId: dragState.data.nodeId,
                deltaX,
                deltaY
              });
            }
            
            // Clean up
            dragState.element.classList.remove('dragging');
            dragState.element.style.transform = '';
            document.removeEventListener('mousemove', handleNodeDrag);
            document.removeEventListener('mouseup', handleNodeDragEnd);
            
            dragState = { isDragging: false, element: null, type: null };
          }
          
          /**
           * Handle drag over (required for drop to work)
           */
          function handleDragOver(event) {
            if (dragState.isDragging && dragState.type === 'statement') {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
            }
          }
          
          /**
           * Handle drop
           */
          function handleDrop(event) {
            if (!dragState.isDragging || dragState.type !== 'statement') return;
            
            event.preventDefault();
            const dropZone = event.target.closest('.drop-zone');
            
            if (dropZone) {
              const dropType = dropZone.getAttribute('data-drop-type');
              const targetStatementId = dropZone.getAttribute('data-statement-id');
              
              // Send move statement message
              vscode.postMessage({
                type: 'moveStatement',
                sourceData: dragState.data,
                targetStatementId,
                dropType
              });
            }
            
            handleDragEnd();
          }
          
          /**
           * Handle drag enter on drop zones
           */
          function handleDragEnter(event) {
            if (dragState.isDragging && dragState.type === 'statement') {
              const zone = event.currentTarget;
              zone.classList.add('active');
              
              // Determine if this is a valid drop
              const dropType = zone.getAttribute('data-drop-type');
              const isValid = isValidDrop(dragState.data.statementType, dropType);
              zone.classList.add(isValid ? 'valid' : 'invalid');
            }
          }
          
          /**
           * Handle drag leave on drop zones
           */
          function handleDragLeave(event) {
            const zone = event.currentTarget;
            zone.classList.remove('active', 'valid', 'invalid');
          }
          
          /**
           * Handle end of drag
           */
          function handleDragEnd(event) {
            if (dragState.element) {
              dragState.element.classList.remove('dragging');
            }
            
            // Hide all drop zones
            document.querySelectorAll('.drop-zone').forEach(zone => {
              zone.classList.remove('active', 'valid', 'invalid');
              zone.style.pointerEvents = 'none';
            });
            
            dragState = { isDragging: false, element: null, type: null };
          }
          
          /**
           * Show compatible drop zones for the given statement type
           */
          function showCompatibleDropZones(statementType) {
            document.querySelectorAll('.drop-zone').forEach(zone => {
              zone.style.pointerEvents = 'auto';
              zone.style.opacity = '0.1';
            });
          }
          
          /**
           * Check if a drop is valid
           */
          function isValidDrop(sourceType, targetType) {
            // Premises can be dropped on premise zones, conclusions on conclusion zones
            return sourceType === targetType;
          }
          
          // =============================================================================
          // HOVER HIGHLIGHTS AND VISUAL FEEDBACK
          // =============================================================================
          
          /**
           * Set up hover highlight effects
           */
          function setupHoverHighlights() {
            // Statement hover effects
            document.querySelectorAll('.statement-group').forEach(setupStatementHover);
            
            // Connection hover effects
            document.querySelectorAll('.connection-group').forEach(setupConnectionHover);
            
            // Node hover effects
            document.querySelectorAll('.argument-node-group').forEach(setupNodeHover);
          }
          
          /**
           * Set up hover effects for statements
           */
          function setupStatementHover(element) {
            element.addEventListener('mouseenter', handleStatementHover);
            element.addEventListener('mouseleave', handleStatementLeave);
          }
          
          /**
           * Set up hover effects for connections
           */
          function setupConnectionHover(element) {
            element.addEventListener('mouseenter', handleConnectionHover);
            element.addEventListener('mouseleave', handleConnectionLeave);
          }
          
          /**
           * Set up hover effects for nodes
           */
          function setupNodeHover(element) {
            element.addEventListener('mouseenter', handleNodeHover);
            element.addEventListener('mouseleave', handleNodeLeave);
          }
          
          /**
           * Handle statement hover - highlight related statements
           */
          function handleStatementHover(event) {
            const element = event.currentTarget;
            const statementId = element.getAttribute('data-statement-id');
            
            if (statementId) {
              // Highlight all instances of this statement
              document.querySelectorAll(\`[data-statement-id="\${statementId}"] .statement-text\`).forEach(text => {
                text.classList.add('statement-highlighted');
              });
              
              // Show tooltip with statement metadata
              showStatementTooltip(element, statementId);
            }
          }
          
          /**
           * Handle statement leave
           */
          function handleStatementLeave(event) {
            // Remove all statement highlights
            document.querySelectorAll('.statement-highlighted').forEach(element => {
              element.classList.remove('statement-highlighted');
            });
            
            hideTooltip();
          }
          
          /**
           * Handle connection hover - highlight connection path
           */
          function handleConnectionHover(event) {
            const element = event.currentTarget;
            const fromNode = element.getAttribute('data-from-node');
            const toNode = element.getAttribute('data-to-node');
            
            // Highlight the connection
            element.querySelector('.connection-line').classList.add('connection-highlighted');
            
            // Highlight connected nodes
            if (fromNode) {
              const fromElement = document.querySelector(\`[data-node-id="\${fromNode}"].argument-node\`);
              if (fromElement) fromElement.classList.add('interactive-node');
            }
            
            if (toNode) {
              const toElement = document.querySelector(\`[data-node-id="\${toNode}"].argument-node\`);
              if (toElement) toElement.classList.add('interactive-node');
            }
            
            // Show connection tooltip
            showConnectionTooltip(element, fromNode, toNode);
          }
          
          /**
           * Handle connection leave
           */
          function handleConnectionLeave(event) {
            // Remove connection highlights
            document.querySelectorAll('.connection-highlighted').forEach(element => {
              element.classList.remove('connection-highlighted');
            });
            
            hideTooltip();
          }
          
          /**
           * Handle node hover
           */
          function handleNodeHover(event) {
            const element = event.currentTarget;
            const nodeId = element.getAttribute('data-node-id');
            const argumentId = element.getAttribute('data-argument-id');
            
            // Show node tooltip
            showNodeTooltip(element, nodeId, argumentId);
          }
          
          /**
           * Handle node leave
           */
          function handleNodeLeave(event) {
            hideTooltip();
          }
          
          // =============================================================================
          // CONNECTION HIGHLIGHTING
          // =============================================================================
          
          /**
           * Set up connection path highlighting
           */
          function setupConnectionHighlights() {
            // This will highlight connection paths when hovering over statements
            // that are connected across multiple arguments
          }
          
          // =============================================================================
          // BRANCHING INTERACTIONS
          // =============================================================================
          
          /**
           * Set up text selection and branching functionality
           */
          function setupBranchingInteractions() {
            // Add context menu for text selection
            document.querySelectorAll('.statement-text').forEach(setupStatementBranching);
          }
          
          /**
           * Set up branching interactions for a statement element
           */
          function setupStatementBranching(element) {
            element.addEventListener('contextmenu', handleStatementContextMenu);
            element.addEventListener('mouseup', handleStatementSelection);
          }
          
          /**
           * Handle right-click context menu on statements
           */
          function handleStatementContextMenu(event) {
            event.preventDefault();
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();
            
            if (!selectedText) {
              return;
            }
            
            const element = event.currentTarget;
            const argumentId = element.getAttribute('data-argument-id');
            const statementType = element.getAttribute('data-statement-type');
            
            if (!argumentId || !statementType) {
              return;
            }
            
            showBranchingContextMenu(event.pageX, event.pageY, {
              argumentId,
              selectedText,
              statementType
            });
          }
          
          /**
           * Handle text selection for potential branching
           */
          function handleStatementSelection(event) {
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();
            
            if (!selectedText) {
              hideBranchingTooltip();
              return;
            }
            
            const element = event.currentTarget;
            const argumentId = element.getAttribute('data-argument-id');
            const statementType = element.getAttribute('data-statement-type');
            
            if (!argumentId || !statementType) {
              return;
            }
            
            showBranchingTooltip(event.pageX, event.pageY, {
              argumentId,
              selectedText,
              statementType
            });
          }
          
          /**
           * Show context menu for branching options
           */
          function showBranchingContextMenu(x, y, branchData) {
            hideBranchingContextMenu();
            
            const menu = document.createElement('div');
            menu.id = 'branching-context-menu';
            menu.className = 'absolute bg-vscode-editor-background border border-vscode-panel-border rounded shadow-lg z-50 p-2';
            menu.style.left = x + 'px';
            menu.style.top = y + 'px';
            
            const branchType = branchData.statementType === 'premise' ? 'backward' : 'forward';
            const branchLabel = branchData.statementType === 'premise' 
              ? 'Create Supporting Argument' 
              : 'Create Following Argument';
            
            menu.innerHTML = \`
              <div class="text-xs text-vscode-description-fg mb-2">Selected: "\${branchData.selectedText}"</div>
              <button onclick="createBranch('\${branchData.argumentId}', '\${branchData.selectedText}', '\${branchData.statementType}')" 
                      class="w-full text-left bg-vscode-button-bg text-vscode-button-fg hover:bg-vscode-button-hover border-none px-2 py-1 rounded text-xs cursor-pointer">
                \${branchLabel}
              </button>
              <button onclick="hideBranchingContextMenu()" 
                      class="w-full text-left bg-vscode-button-secondary-bg text-vscode-button-secondary-fg hover:bg-vscode-button-secondary-hover border-none px-2 py-1 rounded text-xs cursor-pointer mt-1">
                Cancel
              </button>
            \`;
            
            document.body.appendChild(menu);
            
            // Close menu on outside click
            document.addEventListener('click', function closeMenu(e) {
              if (!menu.contains(e.target)) {
                hideBranchingContextMenu();
                document.removeEventListener('click', closeMenu);
              }
            });
          }
          
          /**
           * Show tooltip for quick branching
           */
          function showBranchingTooltip(x, y, branchData) {
            hideBranchingTooltip();
            
            const tooltip = document.createElement('div');
            tooltip.id = 'branching-tooltip';
            tooltip.className = 'absolute bg-vscode-editor-background border border-vscode-panel-border rounded px-2 py-1 text-xs text-vscode-editor-foreground z-40 pointer-events-none';
            tooltip.style.left = (x + 10) + 'px';
            tooltip.style.top = (y - 30) + 'px';
            
            const branchType = branchData.statementType === 'premise' ? 'backward' : 'forward';
            tooltip.textContent = \`Right-click to create \${branchType} branch\`;
            
            document.body.appendChild(tooltip);
            
            // Auto-hide after 3 seconds
            setTimeout(hideBranchingTooltip, 3000);
          }
          
          /**
           * Hide context menu
           */
          function hideBranchingContextMenu() {
            const menu = document.getElementById('branching-context-menu');
            if (menu) {
              menu.remove();
            }
          }
          
          /**
           * Hide tooltip
           */
          function hideBranchingTooltip() {
            const tooltip = document.getElementById('branching-tooltip');
            if (tooltip) {
              tooltip.remove();
            }
          }
          
          /**
           * Create a branch from selected text
           */
          function createBranch(sourceArgumentId, selectedText, position) {
            hideBranchingContextMenu();
            
            vscode.postMessage({
              type: 'createBranchFromSelection',
              sourceArgumentId,
              selectedText,
              position
            });
            
            showSuccessMessage('Creating branch...');
          }
          
          // =============================================================================
          // TOOLTIP SYSTEM
          // =============================================================================
          
          let currentTooltip = null;
          
          /**
           * Show statement tooltip
           */
          function showStatementTooltip(element, statementId) {
            const tooltip = createTooltip(\`Statement: \${statementId}\`);
            positionTooltip(tooltip, element);
          }
          
          /**
           * Show connection tooltip
           */
          function showConnectionTooltip(element, fromNode, toNode) {
            const tooltip = createTooltip(\`Connection: \${fromNode} → \${toNode}\`);
            positionTooltip(tooltip, element);
          }
          
          /**
           * Show node tooltip
           */
          function showNodeTooltip(element, nodeId, argumentId) {
            const tooltip = createTooltip(\`Node: \${nodeId} (Argument: \${argumentId})\`);
            positionTooltip(tooltip, element);
          }
          
          /**
           * Create tooltip element
           */
          function createTooltip(text) {
            const tooltip = document.createElement('div');
            tooltip.className = 'absolute bg-vscode-editor-background border border-vscode-panel-border rounded px-2 py-1 text-xs text-vscode-editor-foreground z-50 pointer-events-none';
            tooltip.textContent = text;
            tooltip.style.backgroundColor = 'var(--vscode-editor-background)';
            tooltip.style.borderColor = 'var(--vscode-panel-border)';
            tooltip.style.color = 'var(--vscode-editor-foreground)';
            
            currentTooltip = tooltip;
            document.body.appendChild(tooltip);
            
            return tooltip;
          }
          
          /**
           * Position tooltip relative to element
           */
          function positionTooltip(tooltip, element) {
            const rect = element.getBoundingClientRect();
            tooltip.style.left = (rect.left + rect.width / 2) + 'px';
            tooltip.style.top = (rect.bottom + 5) + 'px';
            tooltip.style.transform = 'translateX(-50%)';
          }
          
          /**
           * Hide current tooltip
           */
          function hideTooltip() {
            if (currentTooltip) {
              currentTooltip.remove();
              currentTooltip = null;
            }
          }
          
          // =============================================================================
          // EXPOSE FUNCTIONS TO WINDOW
          // =============================================================================
          
          // Expose functions that need to be accessible from tests or inline handlers
          window.zoomIn = zoomIn;
          window.zoomOut = zoomOut;
          window.resetView = resetView;
          window.applyZoom = applyZoom;
          window.showCreateArgumentForm = showCreateArgumentForm;
          window.createArgument = createArgument;
          window.showAddStatementForm = showAddStatementForm;
          window.addStatement = addStatement;
          window.hideSidebar = hideSidebar;
          window.exportProof = exportProof;
          window.updateToolbarState = updateToolbarState;
          window.initializeInteractiveFeatures = initializeInteractiveFeatures;
          window.createBranch = createBranch;
          window.hideBranchingContextMenu = hideBranchingContextMenu;
          
          // =============================================================================
          // INITIALIZATION
          // =============================================================================
          
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

  /**
   * Validate input for creating arguments
   */
  private validateCreateArgumentInput(
    premises: unknown,
    conclusions: unknown,
  ): Result<{ premises: string[]; conclusions: string[] }, ValidationError> {
    if (!premises || !Array.isArray(premises) || premises.length === 0) {
      return err(new ValidationError('At least one premise is required'));
    }

    if (!conclusions || !Array.isArray(conclusions) || conclusions.length === 0) {
      return err(new ValidationError('At least one conclusion is required'));
    }

    return ok({ premises, conclusions });
  }

  /**
   * Validate statement content input
   */
  private validateStatementContent(content: unknown): Result<string, ValidationError> {
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return err(new ValidationError('Statement content cannot be empty'));
    }

    return ok(content.trim());
  }

  /**
   * Validate edit content metadata
   */
  private validateEditContentMetadata(
    metadata: unknown,
    newContent: unknown,
  ): Result<
    {
      metadata: {
        type: 'statement' | 'label';
        statementId?: string;
        nodeId?: string;
        statementType?: 'premise' | 'conclusion';
        labelType?: string;
      };
      newContent: string;
    },
    ValidationError
  > {
    if (
      !metadata ||
      typeof metadata !== 'object' ||
      !newContent ||
      typeof newContent !== 'string'
    ) {
      return err(new ValidationError('Invalid edit content request'));
    }

    const meta = metadata as {
      type?: string;
      statementId?: string;
      nodeId?: string;
      statementType?: string;
      labelType?: string;
    };

    if (!meta.type || (meta.type !== 'statement' && meta.type !== 'label')) {
      return err(new ValidationError('Invalid edit content request'));
    }

    if (meta.type === 'statement' && !meta.statementId) {
      return err(new ValidationError('Invalid edit content request'));
    }

    if (meta.type === 'label' && !meta.nodeId) {
      return err(new ValidationError('Invalid edit content request'));
    }

    return ok({
      metadata: meta as {
        type: 'statement' | 'label';
        statementId?: string;
        nodeId?: string;
        statementType?: 'premise' | 'conclusion';
        labelType?: string;
      },
      newContent,
    });
  }

  /**
   * Validate move statement input
   */
  private validateMoveStatementInput(
    sourceData: unknown,
    targetStatementId: unknown,
    dropType: unknown,
  ): Result<
    {
      sourceData: { statementId: string; statementType: string; nodeId: string };
      targetStatementId: string;
      dropType: 'premise' | 'conclusion';
    },
    ValidationError
  > {
    if (
      !sourceData ||
      typeof sourceData !== 'object' ||
      !targetStatementId ||
      typeof targetStatementId !== 'string' ||
      !dropType ||
      typeof dropType !== 'string'
    ) {
      return err(new ValidationError('Invalid move statement request'));
    }

    const source = sourceData as { statementId?: string; statementType?: string; nodeId?: string };
    if (!source.statementId || !source.statementType || !source.nodeId) {
      return err(new ValidationError('Invalid move statement request'));
    }

    return ok({
      sourceData: source as { statementId: string; statementType: string; nodeId: string },
      targetStatementId,
      dropType: dropType as 'premise' | 'conclusion',
    });
  }

  /**
   * Validate move node input
   */
  private validateMoveNodeInput(
    nodeId: unknown,
    deltaX: unknown,
    deltaY: unknown,
  ): Result<{ nodeId: string; deltaX: number; deltaY: number }, ValidationError> {
    if (
      !nodeId ||
      typeof nodeId !== 'string' ||
      typeof deltaX !== 'number' ||
      typeof deltaY !== 'number'
    ) {
      return err(new ValidationError('Invalid move node request'));
    }

    return ok({ nodeId, deltaX, deltaY });
  }

  /**
   * Validate branch creation input
   */
  private validateBranchInput(
    sourceArgumentId: unknown,
    selectedText: unknown,
    position: unknown,
  ): Result<
    {
      sourceArgumentId: string;
      selectedText: string;
      position: 'premise' | 'conclusion';
    },
    ValidationError
  > {
    if (
      !sourceArgumentId ||
      typeof sourceArgumentId !== 'string' ||
      !selectedText ||
      typeof selectedText !== 'string' ||
      !position ||
      typeof position !== 'string'
    ) {
      return err(new ValidationError('Invalid branch creation request'));
    }

    if (position !== 'premise' && position !== 'conclusion') {
      return err(new ValidationError('Position must be premise or conclusion'));
    }

    return ok({
      sourceArgumentId,
      selectedText,
      position: position as 'premise' | 'conclusion',
    });
  }

  private async handleWebviewMessage(message: unknown): Promise<void> {
    try {
      if (!message || typeof message !== 'object') {
        return;
      }

      const msg = message as { type?: string; [key: string]: unknown };

      if (!msg.type) {
        return;
      }

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
        case 'editContent': {
          await this.handleEditContent(msg);
          break;
        }
        case 'moveStatement': {
          await this.handleMoveStatement(msg);
          break;
        }
        case 'moveNode': {
          await this.handleMoveNode(msg);
          break;
        }
        case 'createBranchFromSelection': {
          await this.handleCreateBranchFromSelection(msg);
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

      const validationResult = this.validateCreateArgumentInput(premises, conclusions);
      if (validationResult.isErr()) {
        this.uiPort.showError(validationResult.error.message);
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

      const contentValidation = this.validateStatementContent(content);
      if (contentValidation.isErr()) {
        this.uiPort.showError(contentValidation.error.message);
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
        content: contentValidation.value,
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

      // Show export format selection dialog
      const formatResult = await this.uiPort.showQuickPick(
        [
          { label: 'YAML (.proof)', description: 'Export as YAML proof file' },
          { label: 'JSON (.json)', description: 'Export as structured JSON data' },
          { label: 'PDF (.pdf)', description: 'Export as printable PDF document' },
          { label: 'SVG (.svg)', description: 'Export as vector graphics diagram' },
        ],
        {
          title: 'Select Export Format',
          placeHolder: 'Choose the format for exporting your proof',
        },
      );

      if (formatResult.isErr() || !formatResult.value) {
        return; // User cancelled
      }

      // Determine export format from selection
      const formatMap: Record<string, 'yaml' | 'json' | 'pdf' | 'svg'> = {
        'YAML (.proof)': 'yaml',
        'JSON (.json)': 'json',
        'PDF (.pdf)': 'pdf',
        'SVG (.svg)': 'svg',
      };

      const selectedFormat = formatMap[formatResult.value.label];
      if (!selectedFormat) {
        this.uiPort.showError('Invalid export format selected');
        return;
      }

      // Export and save the document
      const exportResult = await this.exportService.saveToFile(documentId, {
        format: selectedFormat,
        includeMetadata: true,
        includeVisualization: selectedFormat === 'pdf' || selectedFormat === 'svg',
      });

      if (exportResult.isErr()) {
        this.uiPort.showError(`Export failed: ${exportResult.error.message}`);
        return;
      }

      // Show success message
      this.uiPort.showInformation(`Successfully exported proof to ${exportResult.value.filePath}`);

      // Post export completion message to webview
      this.uiPort.postMessageToWebview(this.panelId, {
        type: 'exportCompleted',
        format: selectedFormat,
        filePath: exportResult.value.filePath,
        success: exportResult.value.savedSuccessfully,
      });
    } catch (error) {
      this.uiPort.showError(
        `Failed to export proof: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private extractDocumentIdFromUri(): string | null {
    const result = this.documentIdService.extractFromUriWithFallback(this.documentUri);
    return result.isOk() ? result.value : null;
  }

  /**
   * Find which ordered set contains a specific statement
   */
  private findOrderedSetForStatement(document: DocumentDTO, statementId: string): string | null {
    for (const [orderedSetId, orderedSet] of Object.entries(document.orderedSets)) {
      if (orderedSet.statementIds.includes(statementId)) {
        return orderedSetId;
      }
    }
    return null;
  }

  /**
   * Find which tree contains a specific node
   * Note: This is a simplified implementation that assumes nodeId format includes tree information
   * In a full implementation, this would query the tree structure or node repository
   */
  private findTreeForNode(document: DocumentDTO, nodeId: string): string | null {
    // For now, we'll use a simple heuristic based on tree root nodes
    // In a real implementation, this would involve traversing the tree structure
    for (const [treeId, tree] of Object.entries(document.trees)) {
      // Check if this node is one of the root nodes
      if (tree.rootNodeIds.includes(nodeId)) {
        return treeId;
      }
    }

    // If not found in root nodes, we need a different approach
    // For now, we'll assume the first tree if we can't determine the exact tree
    const treeIds = Object.keys(document.trees);
    if (treeIds.length === 1) {
      const firstTreeId = treeIds[0];
      return firstTreeId ?? null;
    }

    // In a more sophisticated implementation, we would:
    // 1. Query the tree structure service to find which tree contains the node
    // 2. Or maintain a node-to-tree mapping in the document structure
    return null;
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
   * Handle content editing from inline editor
   */
  private async handleEditContent(msg: { [key: string]: unknown }): Promise<void> {
    try {
      const validationResult = this.validateEditContentMetadata(msg.metadata, msg.newContent);
      if (validationResult.isErr()) {
        this.uiPort.showError(validationResult.error.message);
        return;
      }

      const { metadata, newContent } = validationResult.value;

      const documentId = this.extractDocumentIdFromUri();
      if (!documentId) {
        this.uiPort.showError('Could not determine document ID');
        return;
      }

      if (metadata.type === 'statement' && metadata.statementId) {
        // Handle statement content editing
        const result = await this.proofApplicationService.updateStatement({
          documentId,
          statementId: metadata.statementId,
          content: newContent,
        });

        if (result.isErr()) {
          this.uiPort.showError(`Failed to update statement: ${result.error.message}`);
          return;
        }

        this.uiPort.showInformation('Statement updated successfully');
      } else if (metadata.type === 'label' && metadata.nodeId) {
        // Handle side label editing
        const result = await this.proofApplicationService.updateArgumentLabel({
          documentId,
          argumentId: metadata.nodeId,
          sideLabels: {
            [metadata.labelType || 'left']: newContent,
          },
        });

        if (result.isErr()) {
          this.uiPort.showError(`Failed to update label: ${result.error.message}`);
          return;
        }

        this.uiPort.showInformation('Label updated successfully');
      }

      // Refresh content to show changes
      await this.refreshContent();
    } catch (error) {
      this.uiPort.showError(
        `Failed to edit content: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Handle statement movement via drag and drop
   */
  private async handleMoveStatement(msg: { [key: string]: unknown }): Promise<void> {
    try {
      const validationResult = this.validateMoveStatementInput(
        msg.sourceData,
        msg.targetStatementId,
        msg.dropType,
      );
      if (validationResult.isErr()) {
        this.uiPort.showError(validationResult.error.message);
        return;
      }

      const { sourceData, targetStatementId } = validationResult.value;

      const documentId = this.extractDocumentIdFromUri();
      if (!documentId) {
        this.uiPort.showError('Could not determine document ID');
        return;
      }

      // Get the current document to find ordered sets
      const document = await this.documentQueryService.getDocumentById(documentId);
      if (document.isErr()) {
        this.uiPort.showError(`Failed to get document: ${document.error.message}`);
        return;
      }

      // Find the ordered sets for source and target statements
      const sourceOrderedSetId = this.findOrderedSetForStatement(
        document.value,
        sourceData.statementId,
      );
      const targetOrderedSetId = this.findOrderedSetForStatement(document.value, targetStatementId);

      if (!sourceOrderedSetId) {
        this.uiPort.showError('Could not find source statement in any ordered set');
        return;
      }

      if (!targetOrderedSetId) {
        this.uiPort.showError('Could not find target statement in any ordered set');
        return;
      }

      // If they're in the same ordered set, we're reordering within the set
      if (sourceOrderedSetId === targetOrderedSetId) {
        this.uiPort.showInformation(
          'Statement reordering within the same ordered set is not yet implemented',
        );
        await this.refreshContent();
        return;
      }

      // Move the statement between ordered sets
      const moveResult = await this.proofApplicationService.moveStatement({
        documentId,
        statementId: sourceData.statementId,
        sourceOrderedSetId,
        targetOrderedSetId,
        // For now, append to the end of the target set (omit undefined)
      });

      if (moveResult.isErr()) {
        this.uiPort.showError(`Failed to move statement: ${moveResult.error.message}`);
        return;
      }

      this.uiPort.showInformation('Statement moved successfully');

      // Refresh content to show changes
      await this.refreshContent();
    } catch (error) {
      this.uiPort.showError(
        `Failed to move statement: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Handle node movement via drag handles
   */
  private async handleMoveNode(msg: { [key: string]: unknown }): Promise<void> {
    try {
      const validationResult = this.validateMoveNodeInput(msg.nodeId, msg.deltaX, msg.deltaY);
      if (validationResult.isErr()) {
        this.uiPort.showError(validationResult.error.message);
        return;
      }

      const { nodeId, deltaX, deltaY } = validationResult.value;

      const documentId = this.extractDocumentIdFromUri();
      if (!documentId) {
        this.uiPort.showError('Could not determine document ID');
        return;
      }

      // Get the current document to find which tree contains the node
      const document = await this.documentQueryService.getDocumentById(documentId);
      if (document.isErr()) {
        this.uiPort.showError(`Failed to get document: ${document.error.message}`);
        return;
      }

      // Find the tree that contains this node
      const treeId = this.findTreeForNode(document.value, nodeId);
      if (!treeId) {
        this.uiPort.showError('Could not find tree containing the node');
        return;
      }

      const tree = document.value.trees[treeId];
      if (!tree) {
        this.uiPort.showError('Tree not found');
        return;
      }

      // Calculate new position by adding delta to current position
      const newPosition = {
        x: tree.position.x + deltaX,
        y: tree.position.y + deltaY,
      };

      // Move the tree to the new position
      const moveResult = await this.proofApplicationService.moveTree({
        documentId,
        treeId,
        position: newPosition,
      });

      if (moveResult.isErr()) {
        this.uiPort.showError(`Failed to move tree: ${moveResult.error.message}`);
        return;
      }

      this.uiPort.showInformation('Node position updated successfully');

      // Refresh content to show changes
      await this.refreshContent();
    } catch (error) {
      this.uiPort.showError(
        `Failed to move node: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Handle branching from selected text
   */
  private async handleCreateBranchFromSelection(msg: { [key: string]: unknown }): Promise<void> {
    try {
      const validationResult = this.validateBranchInput(
        msg.sourceArgumentId,
        msg.selectedText,
        msg.position,
      );
      if (validationResult.isErr()) {
        this.uiPort.showError(validationResult.error.message);
        return;
      }

      const { sourceArgumentId, selectedText, position } = validationResult.value;

      const documentId = this.extractDocumentIdFromUri();
      if (!documentId) {
        this.uiPort.showError('Could not determine document ID');
        return;
      }

      // Create the branch through application service
      const branchResult = await this.proofApplicationService.createBranchFromSelection({
        documentId,
        sourceArgumentId,
        selectedText,
        position,
      });

      if (branchResult.isErr()) {
        this.uiPort.showError(`Failed to create branch: ${branchResult.error.message}`);
        return;
      }

      const newArgument = branchResult.value;

      // Notify webview of successful branch creation
      this.uiPort.postMessageToWebview(this.panelId, {
        type: 'branchCreated',
        newArgumentId: newArgument.id,
        sourceArgumentId,
        selectedText,
        position,
        premises: newArgument.premises,
        conclusions: newArgument.conclusions,
      });

      this.uiPort.showInformation(
        `Successfully created ${position === 'conclusion' ? 'forward' : 'backward'} branch`,
      );

      // Refresh content to show the new branch
      await this.refreshContent();
    } catch (error) {
      this.uiPort.showError(
        `Failed to create branch: ${error instanceof Error ? error.message : String(error)}`,
      );
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
   * Save current view state before disposal
   */
  private async saveCurrentViewState(): Promise<void> {
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
      this.saveCurrentViewState().catch(() => {
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

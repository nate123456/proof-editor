/**
 * Handles HTML/CSS generation and template management for ProofTreePanel
 */
export class ProofTreeContentRenderer {
  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * Generate the main webview HTML content
   */
  getWebviewContent(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Proof Tree Visualization</title>
        <script src="https://cdn.tailwindcss.com"></script>
        ${this.getTailwindConfig()}
        ${this.getCustomStyles()}
      </head>
      <body class="bg-vscode-editor-bg text-vscode-editor-fg font-vscode m-0 p-0 flex flex-col h-screen">
        ${this.getToolbar()}
        ${this.getMainContent()}
        ${this.getInteractiveScript()}
      </body>
      </html>
    `;
  }

  /**
   * Generate Tailwind configuration
   */
  private getTailwindConfig(): string {
    return `
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
    `;
  }

  /**
   * Generate custom CSS styles
   */
  private getCustomStyles(): string {
    return `
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
    `;
  }

  /**
   * Generate toolbar HTML
   */
  private getToolbar(): string {
    return `
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
    `;
  }

  /**
   * Generate main content area HTML
   */
  private getMainContent(): string {
    return `
      <!-- Main Content -->
      <div class="flex-1 flex relative overflow-hidden">
        <!-- Tree Container -->
        <div id="tree-container" class="flex-1 overflow-auto relative">
          ${this.getBootstrapOverlay()}
        </div>
        
        ${this.getSidebar()}
      </div>
    `;
  }

  /**
   * Generate bootstrap overlay HTML
   */
  private getBootstrapOverlay(): string {
    return `
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
    `;
  }

  /**
   * Generate sidebar HTML
   */
  private getSidebar(): string {
    return `
      <!-- Sidebar -->
      <div id="sidebar" class="w-75 bg-vscode-sidebar-bg border-l border-vscode-panel-border overflow-y-auto hidden">
        <div class="p-4">
          ${this.getCreateArgumentForm()}
          ${this.getAddStatementForm()}
        </div>
      </div>
    `;
  }

  /**
   * Generate create argument form HTML
   */
  private getCreateArgumentForm(): string {
    return `
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
    `;
  }

  /**
   * Generate add statement form HTML
   */
  private getAddStatementForm(): string {
    return `
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
    `;
  }

  /**
   * Generate error display HTML
   */
  renderError(errors: readonly { message: string; line?: number; section?: string }[]): string {
    const errorMessages = errors
      .map((error) => `${error.section ? `[${error.section}] ` : ''}${error.message}`)
      .join('\n');

    return `
      <div class="error-container">
        <h3>Parse Errors</h3>
        <pre class="error-text">${this.escapeHtml(errorMessages)}</pre>
      </div>
    `;
  }

  /**
   * Get the inline interactive features script
   * In production, this would be loaded from a separate file
   */
  private getInteractiveScript(): string {
    // For now, we'll inline the script content
    // In a production setup, this would load from a compiled JS file
    return `<script>${this.getInteractiveScriptContent()}</script>`;
  }

  /**
   * Get the interactive script content
   * This is a simplified version - the full script is in interactive-features.ts
   */
  private getInteractiveScriptContent(): string {
    return `
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
            initializeInteractiveFeatures();
            break;
          case 'restoreViewportState':
          case 'restorePanelState':
          case 'restoreSelectionState':
          case 'restoreThemeState':
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
        console.log('Success:', message);
      }
      
      // Initialize interactive features
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
      
      // Placeholder functions for interactive features
      // The full implementation is in interactive-features.ts
      function setupInlineEditing() {}
      function setupDragAndDrop() {}
      function setupHoverHighlights() {}
      function setupConnectionHighlights() {}
      function setupBranchingInteractions() {}
      
      // Initialize
      updateToolbarState();
    `;
  }
}

import 'reflect-metadata';

import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock JSDOM implementation for testing
interface MockJSDOM {
  window: Window & typeof globalThis;
}

class MockJSDOMImpl implements MockJSDOM {
  window: Window & typeof globalThis;

  constructor(_html?: string, _options?: any) {
    // Create a mock window object with necessary DOM APIs
    this.window = {
      document: {
        createElement: vi.fn(),
        getElementById: vi.fn(),
        querySelector: vi.fn(),
        querySelectorAll: vi.fn().mockReturnValue([]),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        body: { click: vi.fn(), appendChild: vi.fn() },
        dispatchEvent: vi.fn(),
      },
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      MessageEvent: class MockMessageEvent {
        constructor(
          public type: string,
          public data: any,
        ) {}
      },
      MouseEvent: class MockMouseEvent {
        constructor(
          public type: string,
          public options: any = {},
        ) {
          Object.assign(this, options);
        }
      },
      KeyboardEvent: class MockKeyboardEvent {
        constructor(
          public type: string,
          public options: any = {},
        ) {
          Object.assign(this, options);
        }
      },
      DragEvent: class MockDragEvent {
        constructor(
          public type: string,
          public options: any = {},
        ) {
          Object.assign(this, options);
        }
      },
      HTMLElement: class MockHTMLElement {},
      SVGElement: class MockSVGElement {},
      Event: class MockEvent {
        constructor(
          public type: string,
          public options: any = {},
        ) {}
      },
      eval: vi.fn(),
      close: vi.fn(),
    } as any;
  }
}

const JSDOM = MockJSDOMImpl;

// Extend Window interface to include VS Code API
declare global {
  interface Window {
    acquireVsCodeApi(): {
      postMessage(message: any): void;
      setState(state: any): void;
      getState(): any;
    };
  }
}

describe('ProofTreePanel Webview JavaScript Behavior - Comprehensive Coverage', () => {
  let dom: MockJSDOMImpl;
  let window: Window & typeof globalThis;
  let document: Document;
  let mockVSCode: any;

  // Store original console methods to restore later
  const originalConsole = { ...console };

  beforeEach(() => {
    // Create JSDOM environment with complete HTML
    dom = new JSDOM(
      `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Proof Tree Visualization</title>
        <style>
          /* Essential styles for testing */
          .inline-editor {
            position: absolute;
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            z-index: 1000;
          }
          .editing-active { outline: 2px solid var(--vscode-focusBorder); }
          .dragging { opacity: 0.5; cursor: grabbing; }
          .drop-zone { transition: opacity 0.2s ease; pointer-events: none; }
          .drop-zone.active { opacity: 0.3 !important; }
          .drop-zone.valid { fill: var(--vscode-gitDecoration-addedResourceForeground) !important; }
          .drop-zone.invalid { fill: var(--vscode-errorForeground) !important; }
        </style>
      </head>
      <body>
        <!-- Toolbar -->
        <div class="toolbar">
          <button id="create-argument-btn">Create First Argument</button>
          <button id="add-premise-btn" disabled>Add Premise</button>
          <button id="add-conclusion-btn" disabled>Add Conclusion</button>
          <button id="zoom-in-btn">Zoom In</button>
          <button id="zoom-out-btn">Zoom Out</button>
          <button id="reset-view-btn">Reset View</button>
          <button id="export-btn" disabled>Export</button>
        </div>
        
        <!-- Main Content -->
        <div class="main-content">
          <!-- Tree Container -->
          <div id="tree-container" class="tree-container">
            <!-- Bootstrap Overlay -->
            <div id="bootstrap-overlay" class="bootstrap-overlay">
              <h2>Welcome to Proof Editor!</h2>
              <button onclick="showCreateArgumentForm()">Create First Argument</button>
            </div>
          </div>
          
          <!-- Sidebar -->
          <div id="sidebar" class="sidebar hidden">
            <div class="sidebar-content">
              <!-- Create Argument Form -->
              <div id="create-argument-form" class="hidden">
                <h3>Create New Argument</h3>
                <textarea id="premise-input" placeholder="All humans are mortal"></textarea>
                <textarea id="conclusion-input" placeholder="Therefore, Socrates is mortal"></textarea>
                <input type="text" id="rule-input" placeholder="Modus Ponens">
                <button onclick="createArgument()">Create</button>
                <button onclick="hideSidebar()">Cancel</button>
              </div>
              
              <!-- Add Statement Form -->
              <div id="add-statement-form" class="hidden">
                <h3 id="statement-form-title">Add Statement</h3>
                <textarea id="statement-content" placeholder="Enter your statement here..."></textarea>
                <button onclick="addStatement()">Add</button>
                <button onclick="hideSidebar()">Cancel</button>
              </div>
            </div>
          </div>
        </div>
        
        <script>
          // Mock VS Code API
          const vscode = acquireVsCodeApi();
          
          // Global state variables
          let currentZoom = 1;
          let hasArguments = false;
          let currentStatementType = 'premise';
          let currentEditor = null;
          let dragState = {
            isDragging: false,
            element: null,
            startX: 0,
            startY: 0,
            type: null
          };
          
          // Message handling
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
            }
          });
          
          // Toolbar state management
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
          
          // Form management
          function showCreateArgumentForm() {
            showSidebar();
            hideAllForms();
            document.getElementById('create-argument-form').classList.remove('hidden');
          }
          
          function showAddStatementForm(type) {
            currentStatementType = type;
            showSidebar();
            hideAllForms();
            document.getElementById('add-statement-form').classList.remove('hidden');
            document.getElementById('statement-form-title').textContent = 
              type === 'premise' ? 'Add Premise' : 'Add Conclusion';
          }
          
          function showSidebar() {
            document.getElementById('sidebar').classList.remove('hidden');
          }
          
          function hideSidebar() {
            document.getElementById('sidebar').classList.add('hidden');
            hideAllForms();
          }
          
          function hideAllForms() {
            document.getElementById('create-argument-form').classList.add('hidden');
            document.getElementById('add-statement-form').classList.add('hidden');
          }
          
          // Argument creation
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
            
            document.getElementById('statement-content').value = '';
          }
          
          // Zoom controls
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
            vscode.postMessage({ type: 'exportProof' });
          }
          
          function showErrorMessage(message) {
            vscode.postMessage({ type: 'showError', message });
          }
          
          function showSuccessMessage(message) {
            console.log('Success:', message);
          }
          
          // =============================================================================
          // INTERACTIVE FEATURES
          // =============================================================================
          
          function initializeInteractiveFeatures() {
            try {
              setupInlineEditing();
              setupDragAndDrop();
              setupHoverHighlights();
              setupConnectionHighlights();
            } catch (error) {
              console.warn('Error initializing interactive features:', error);
            }
          }
          
          // =============================================================================
          // INLINE EDITING
          // =============================================================================
          
          function setupInlineEditing() {
            document.querySelectorAll('.editable-statement').forEach(element => {
              element.addEventListener('click', handleStatementEdit);
            });
            
            document.querySelectorAll('.editable-label').forEach(element => {
              element.addEventListener('click', handleLabelEdit);
            });
            
            document.addEventListener('click', handleOutsideClick);
            document.addEventListener('keydown', handleEditingKeydown);
          }
          
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
          
          function startInlineEdit(targetElement, originalContent, metadata) {
            const container = document.getElementById('tree-container');
            const containerRect = container.getBoundingClientRect();
            const elementRect = targetElement.getBoundingClientRect();
            
            const editor = document.createElement('textarea');
            editor.className = 'inline-editor';
            editor.value = originalContent;
            
            editor.style.left = (elementRect.left - containerRect.left + container.scrollLeft) + 'px';
            editor.style.top = (elementRect.top - containerRect.top + container.scrollTop) + 'px';
            editor.style.width = Math.max(elementRect.width, 100) + 'px';
            
            container.appendChild(editor);
            
            currentEditor = {
              element: editor,
              target: targetElement,
              originalContent,
              metadata
            };
            
            editor.focus();
            editor.select();
            
            adjustEditorHeight(editor);
            
            editor.addEventListener('input', () => adjustEditorHeight(editor));
            editor.addEventListener('keydown', handleEditorKeydown);
            
            targetElement.classList.add('editing-active');
          }
          
          function adjustEditorHeight(editor) {
            editor.style.height = 'auto';
            editor.style.height = Math.max(editor.scrollHeight, 20) + 'px';
          }
          
          function handleEditorKeydown(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              finishEditing(true);
            } else if (event.key === 'Escape') {
              event.preventDefault();
              finishEditing(false);
            }
          }
          
          function handleEditingKeydown(event) {
            if (currentEditor && event.key === 'Escape') {
              event.preventDefault();
              finishEditing(false);
            }
          }
          
          function handleOutsideClick(event) {
            if (currentEditor && !currentEditor.element.contains(event.target)) {
              finishEditing(true);
            }
          }
          
          function finishEditing(save = true) {
            if (!currentEditor) return;
            
            const { element, target, originalContent, metadata } = currentEditor;
            
            if (save && element.value.trim() !== originalContent) {
              saveEditedContent(element.value.trim(), metadata);
            }
            
            target.classList.remove('editing-active');
            element.remove();
            currentEditor = null;
          }
          
          function saveEditedContent(newContent, metadata) {
            vscode.postMessage({
              type: 'editContent',
              metadata,
              newContent
            });
          }
          
          // =============================================================================
          // DRAG AND DROP
          // =============================================================================
          
          function setupDragAndDrop() {
            document.querySelectorAll('.statement-group').forEach(setupStatementDrag);
            document.querySelectorAll('.drag-handle').forEach(setupNodeDrag);
            document.querySelectorAll('.drop-zone').forEach(setupDropZone);
            
            document.addEventListener('dragover', handleDragOver);
            document.addEventListener('drop', handleDrop);
          }
          
          function setupStatementDrag(element) {
            element.draggable = true;
            element.addEventListener('dragstart', handleStatementDragStart);
            element.addEventListener('dragend', handleDragEnd);
          }
          
          function setupNodeDrag(handle) {
            handle.addEventListener('mousedown', handleNodeDragStart);
          }
          
          function setupDropZone(zone) {
            zone.addEventListener('dragenter', handleDragEnter);
            zone.addEventListener('dragleave', handleDragLeave);
          }
          
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
            
            event.dataTransfer.setData('text/plain', JSON.stringify(dragState.data));
            event.dataTransfer.effectAllowed = 'move';
            
            element.classList.add('dragging');
            showCompatibleDropZones(statementType);
          }
          
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
            
            nodeElement.classList.add('dragging');
            
            document.addEventListener('mousemove', handleNodeDrag);
            document.addEventListener('mouseup', handleNodeDragEnd);
          }
          
          function handleNodeDrag(event) {
            if (!dragState.isDragging || dragState.type !== 'node') return;
            
            const deltaX = event.clientX - dragState.startX;
            const deltaY = event.clientY - dragState.startY;
            
            dragState.element.style.transform = \`translate(\${deltaX}px, \${deltaY}px)\`;
          }
          
          function handleNodeDragEnd(event) {
            if (!dragState.isDragging || dragState.type !== 'node') return;
            
            const deltaX = event.clientX - dragState.startX;
            const deltaY = event.clientY - dragState.startY;
            
            if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
              vscode.postMessage({
                type: 'moveNode',
                nodeId: dragState.data.nodeId,
                deltaX,
                deltaY
              });
            }
            
            dragState.element.classList.remove('dragging');
            dragState.element.style.transform = '';
            document.removeEventListener('mousemove', handleNodeDrag);
            document.removeEventListener('mouseup', handleNodeDragEnd);
            
            dragState = { isDragging: false, element: null, type: null };
          }
          
          function handleDragOver(event) {
            if (dragState.isDragging && dragState.type === 'statement') {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
            }
          }
          
          function handleDrop(event) {
            if (!dragState.isDragging || dragState.type !== 'statement') return;
            
            event.preventDefault();
            const dropZone = event.target.closest('.drop-zone');
            
            if (dropZone) {
              const dropType = dropZone.getAttribute('data-drop-type');
              const targetStatementId = dropZone.getAttribute('data-statement-id');
              
              vscode.postMessage({
                type: 'moveStatement',
                sourceData: dragState.data,
                targetStatementId,
                dropType
              });
            }
            
            handleDragEnd();
          }
          
          function handleDragEnter(event) {
            if (dragState.isDragging && dragState.type === 'statement') {
              const zone = event.currentTarget;
              zone.classList.add('active');
              
              const dropType = zone.getAttribute('data-drop-type');
              const isValid = isValidDrop(dragState.data.statementType, dropType);
              zone.classList.add(isValid ? 'valid' : 'invalid');
            }
          }
          
          function handleDragLeave(event) {
            const zone = event.currentTarget;
            zone.classList.remove('active', 'valid', 'invalid');
          }
          
          function handleDragEnd(event) {
            if (dragState.element) {
              dragState.element.classList.remove('dragging');
            }
            
            document.querySelectorAll('.drop-zone').forEach(zone => {
              zone.classList.remove('active', 'valid', 'invalid');
              zone.style.pointerEvents = 'none';
            });
            
            dragState = { isDragging: false, element: null, type: null };
          }
          
          function showCompatibleDropZones(statementType) {
            document.querySelectorAll('.drop-zone').forEach(zone => {
              zone.style.pointerEvents = 'auto';
              zone.style.opacity = '0.1';
            });
          }
          
          function isValidDrop(sourceType, targetType) {
            return sourceType === targetType;
          }
          
          // =============================================================================
          // HOVER HIGHLIGHTS
          // =============================================================================
          
          function setupHoverHighlights() {
            document.querySelectorAll('.statement-group').forEach(setupStatementHover);
            document.querySelectorAll('.connection-group').forEach(setupConnectionHover);
            document.querySelectorAll('.argument-node-group').forEach(setupNodeHover);
          }
          
          function setupStatementHover(element) {
            element.addEventListener('mouseenter', handleStatementHover);
            element.addEventListener('mouseleave', handleStatementLeave);
          }
          
          function setupConnectionHover(element) {
            element.addEventListener('mouseenter', handleConnectionHover);
            element.addEventListener('mouseleave', handleConnectionLeave);
          }
          
          function setupNodeHover(element) {
            element.addEventListener('mouseenter', handleNodeHover);
            element.addEventListener('mouseleave', handleNodeLeave);
          }
          
          function handleStatementHover(event) {
            const element = event.currentTarget;
            const statementId = element.getAttribute('data-statement-id');
            
            if (statementId) {
              document.querySelectorAll(\`[data-statement-id="\${statementId}"] .statement-text\`).forEach(text => {
                text.classList.add('statement-highlighted');
              });
              
              showStatementTooltip(element, statementId);
            }
          }
          
          function handleStatementLeave(event) {
            document.querySelectorAll('.statement-highlighted').forEach(element => {
              element.classList.remove('statement-highlighted');
            });
            
            hideTooltip();
          }
          
          function handleConnectionHover(event) {
            const element = event.currentTarget;
            const fromNode = element.getAttribute('data-from-node');
            const toNode = element.getAttribute('data-to-node');
            
            element.querySelector('.connection-line').classList.add('connection-highlighted');
            
            showConnectionTooltip(element, fromNode, toNode);
          }
          
          function handleConnectionLeave(event) {
            document.querySelectorAll('.connection-highlighted').forEach(element => {
              element.classList.remove('connection-highlighted');
            });
            
            hideTooltip();
          }
          
          function handleNodeHover(event) {
            const element = event.currentTarget;
            const nodeId = element.getAttribute('data-node-id');
            const argumentId = element.getAttribute('data-argument-id');
            
            showNodeTooltip(element, nodeId, argumentId);
          }
          
          function handleNodeLeave(event) {
            hideTooltip();
          }
          
          function setupConnectionHighlights() {
            // Connection path highlighting logic
          }
          
          // =============================================================================
          // TOOLTIP SYSTEM
          // =============================================================================
          
          let currentTooltip = null;
          
          function showStatementTooltip(element, statementId) {
            const tooltip = createTooltip(\`Statement: \${statementId}\`);
            positionTooltip(tooltip, element);
          }
          
          function showConnectionTooltip(element, fromNode, toNode) {
            const tooltip = createTooltip(\`Connection: \${fromNode} → \${toNode}\`);
            positionTooltip(tooltip, element);
          }
          
          function showNodeTooltip(element, nodeId, argumentId) {
            const tooltip = createTooltip(\`Node: \${nodeId} (Argument: \${argumentId})\`);
            positionTooltip(tooltip, element);
          }
          
          function createTooltip(text) {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = text;
            tooltip.style.position = 'absolute';
            tooltip.style.background = 'var(--vscode-editor-background)';
            tooltip.style.border = '1px solid var(--vscode-panel-border)';
            tooltip.style.padding = '4px 8px';
            tooltip.style.fontSize = '12px';
            tooltip.style.zIndex = '1000';
            tooltip.style.pointerEvents = 'none';
            
            currentTooltip = tooltip;
            document.body.appendChild(tooltip);
            
            return tooltip;
          }
          
          function positionTooltip(tooltip, element) {
            const rect = element.getBoundingClientRect();
            tooltip.style.left = (rect.left + rect.width / 2) + 'px';
            tooltip.style.top = (rect.bottom + 5) + 'px';
            tooltip.style.transform = 'translateX(-50%)';
          }
          
          function hideTooltip() {
            if (currentTooltip) {
              currentTooltip.remove();
              currentTooltip = null;
            }
          }
          
          // Initialize on load
          updateToolbarState();
        </script>
      </body>
      </html>
    `,
      {
        url: 'http://localhost',
        pretendToBeVisual: true,
        resources: 'usable',
        runScripts: 'dangerously',
      },
    );

    window = dom.window as any;
    document = window.document;

    // Setup global mocks
    global.window = window;
    global.document = document;
    global.HTMLElement = window.HTMLElement;
    global.SVGElement = window.SVGElement;
    global.Event = window.Event;
    global.MouseEvent = window.MouseEvent;
    global.KeyboardEvent = window.KeyboardEvent;
    global.DragEvent = window.DragEvent;

    // Mock VS Code API
    mockVSCode = {
      postMessage: vi.fn(),
      setState: vi.fn(),
      getState: vi.fn(),
    };

    // Add to window
    window.acquireVsCodeApi = vi.fn().mockReturnValue(mockVSCode);

    // Mock console to prevent noise during tests
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();

    // Execute the inline script
    const scripts = document.querySelectorAll('script');
    scripts.forEach((script) => {
      if (script.textContent) {
        // Execute in window context
        window.eval(script.textContent);
      }
    });
  });

  afterEach(() => {
    dom.window.close();
    // Restore console
    Object.assign(console, originalConsole);
  });

  describe('Toolbar State Management', () => {
    it('should initialize toolbar with correct default state', () => {
      const createBtn = document.getElementById('create-argument-btn') as HTMLButtonElement;
      const addPremiseBtn = document.getElementById('add-premise-btn') as HTMLButtonElement;
      const addConclusionBtn = document.getElementById('add-conclusion-btn') as HTMLButtonElement;
      const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;

      expect(createBtn.disabled).toBe(false);
      expect(addPremiseBtn.disabled).toBe(true);
      expect(addConclusionBtn.disabled).toBe(true);
      expect(exportBtn.disabled).toBe(true);
    });

    it('should update toolbar state when arguments are created', () => {
      // Simulate argument creation message
      window.dispatchEvent(
        new window.MessageEvent('message', {
          data: { type: 'argumentCreated' },
        }),
      );

      const createBtn = document.getElementById('create-argument-btn') as HTMLButtonElement;
      const addPremiseBtn = document.getElementById('add-premise-btn') as HTMLButtonElement;
      const addConclusionBtn = document.getElementById('add-conclusion-btn') as HTMLButtonElement;
      const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;

      expect(createBtn.disabled).toBe(false);
      expect(createBtn.textContent).toBe('Create Another Argument');
      expect(addPremiseBtn.disabled).toBe(false);
      expect(addConclusionBtn.disabled).toBe(false);
      expect(exportBtn.disabled).toBe(false);
    });

    it('should handle zoom controls correctly', () => {
      const zoomInBtn = document.getElementById('zoom-in-btn') as HTMLButtonElement;
      const zoomOutBtn = document.getElementById('zoom-out-btn') as HTMLButtonElement;
      const resetViewBtn = document.getElementById('reset-view-btn') as HTMLButtonElement;

      // Test zoom in
      zoomInBtn.click();
      expect(mockVSCode.postMessage).toHaveBeenCalledWith({
        type: 'viewportChanged',
        viewport: { zoom: 1.2, pan: { x: 0, y: 0 }, center: { x: 0, y: 0 } },
      });

      // Test zoom out
      zoomOutBtn.click();
      expect(mockVSCode.postMessage).toHaveBeenCalledWith({
        type: 'viewportChanged',
        viewport: { zoom: 1, pan: { x: 0, y: 0 }, center: { x: 0, y: 0 } },
      });

      // Test reset view
      resetViewBtn.click();
      expect(mockVSCode.postMessage).toHaveBeenCalledWith({
        type: 'viewportChanged',
        viewport: { zoom: 1, pan: { x: 0, y: 0 }, center: { x: 0, y: 0 } },
      });
    });

    it('should handle export button correctly', () => {
      // Enable export button
      window.dispatchEvent(
        new window.MessageEvent('message', {
          data: { type: 'argumentCreated' },
        }),
      );

      const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
      exportBtn.click();

      expect(mockVSCode.postMessage).toHaveBeenCalledWith({
        type: 'exportProof',
      });
    });
  });

  describe('Form Management and Validation', () => {
    it('should show and hide sidebar correctly', () => {
      const sidebar = document.getElementById('sidebar') as HTMLElement;

      // Show create argument form
      const createBtn = document.getElementById('create-argument-btn') as HTMLButtonElement;
      createBtn.click();

      expect(sidebar.classList.contains('hidden')).toBe(false);
      expect(document.getElementById('create-argument-form')?.classList.contains('hidden')).toBe(
        false,
      );
    });

    it('should validate argument creation form', () => {
      // Show form
      const createBtn = document.getElementById('create-argument-btn') as HTMLButtonElement;
      createBtn.click();

      // Try to create with empty premises
      const createButton = document.querySelector(
        '#create-argument-form button[onclick="createArgument()"]',
      ) as HTMLButtonElement;
      createButton.click();

      expect(mockVSCode.postMessage).toHaveBeenCalledWith({
        type: 'showError',
        message: 'At least one premise is required',
      });
    });

    it('should handle valid argument creation', () => {
      // Show form
      const createBtn = document.getElementById('create-argument-btn') as HTMLButtonElement;
      createBtn.click();

      // Fill form
      const premiseInput = document.getElementById('premise-input') as HTMLTextAreaElement;
      const conclusionInput = document.getElementById('conclusion-input') as HTMLTextAreaElement;
      const ruleInput = document.getElementById('rule-input') as HTMLInputElement;

      premiseInput.value = 'All men are mortal\\nSocrates is a man';
      conclusionInput.value = 'Socrates is mortal';
      ruleInput.value = 'Modus Ponens';

      // Submit
      const createButton = document.querySelector(
        '#create-argument-form button[onclick="createArgument()"]',
      ) as HTMLButtonElement;
      createButton.click();

      expect(mockVSCode.postMessage).toHaveBeenCalledWith({
        type: 'createArgument',
        premises: ['All men are mortal', 'Socrates is a man'],
        conclusions: ['Socrates is mortal'],
        ruleName: 'Modus Ponens',
      });

      // Form should be cleared
      expect(premiseInput.value).toBe('');
      expect(conclusionInput.value).toBe('');
      expect(ruleInput.value).toBe('');
    });

    it('should handle statement addition form', () => {
      // Enable statement buttons
      window.dispatchEvent(
        new window.MessageEvent('message', {
          data: { type: 'argumentCreated' },
        }),
      );

      // Show add premise form
      const addPremiseBtn = document.getElementById('add-premise-btn') as HTMLButtonElement;
      addPremiseBtn.click();

      const formTitle = document.getElementById('statement-form-title') as HTMLElement;
      expect(formTitle.textContent).toBe('Add Premise');

      // Fill and submit
      const contentInput = document.getElementById('statement-content') as HTMLTextAreaElement;
      contentInput.value = 'New premise statement';

      const addButton = document.querySelector(
        '#add-statement-form button[onclick="addStatement()"]',
      ) as HTMLButtonElement;
      addButton.click();

      expect(mockVSCode.postMessage).toHaveBeenCalledWith({
        type: 'addStatement',
        statementType: 'premise',
        content: 'New premise statement',
      });

      expect(contentInput.value).toBe('');
    });

    it('should validate statement content', () => {
      // Enable and show statement form
      window.dispatchEvent(
        new window.MessageEvent('message', {
          data: { type: 'argumentCreated' },
        }),
      );

      const addPremiseBtn = document.getElementById('add-premise-btn') as HTMLButtonElement;
      addPremiseBtn.click();

      // Try to add empty statement
      const addButton = document.querySelector(
        '#add-statement-form button[onclick="addStatement()"]',
      ) as HTMLButtonElement;
      addButton.click();

      expect(mockVSCode.postMessage).toHaveBeenCalledWith({
        type: 'showError',
        message: 'Statement content cannot be empty',
      });
    });
  });

  describe('Message Handling and Content Updates', () => {
    it('should handle updateTree messages', () => {
      const container = document.getElementById('tree-container') as HTMLElement;
      const overlay = document.getElementById('bootstrap-overlay') as HTMLElement;

      window.dispatchEvent(
        new window.MessageEvent('message', {
          data: {
            type: 'updateTree',
            content: '<svg>test tree content</svg>',
          },
        }),
      );

      expect(container.innerHTML).toBe('<svg>test tree content</svg>');
      expect(overlay.style.display).toBe('none');
    });

    it('should handle showError messages', () => {
      const container = document.getElementById('tree-container') as HTMLElement;

      window.dispatchEvent(
        new window.MessageEvent('message', {
          data: {
            type: 'showError',
            content: '<div class="error">Error content</div>',
          },
        }),
      );

      expect(container.innerHTML).toBe('<div class="error">Error content</div>');
    });

    it('should handle showBootstrapGuide messages', () => {
      const overlay = document.getElementById('bootstrap-overlay') as HTMLElement;

      window.dispatchEvent(
        new window.MessageEvent('message', {
          data: { type: 'showBootstrapGuide' },
        }),
      );

      expect(overlay.style.display).toBe('block');
    });

    it('should handle unknown message types gracefully', () => {
      // Should not throw
      expect(() => {
        window.dispatchEvent(
          new window.MessageEvent('message', {
            data: { type: 'unknownType', data: 'test' },
          }),
        );
      }).not.toThrow();
    });
  });

  describe('Interactive Editing Features', () => {
    beforeEach(() => {
      // Setup tree content with editable elements
      const container = document.getElementById('tree-container') as HTMLElement;
      container.innerHTML = `
        <svg class="proof-tree-svg">
          <g class="statement-group" data-statement-id="stmt1" data-node-id="node1" data-statement-type="premise">
            <text class="statement-text editable-statement" 
                  data-statement-id="stmt1" 
                  data-node-id="node1" 
                  data-statement-type="premise"
                  data-original-content="Original statement">
              Original statement
            </text>
          </g>
          <text class="side-label editable-label" 
                data-node-id="node1" 
                data-label-type="side">
            Rule Name
          </text>
        </svg>
      `;

      // Initialize interactive features
      window.eval('initializeInteractiveFeatures()');
    });

    it('should start inline editing on statement click', () => {
      const statement = document.querySelector('.editable-statement') as HTMLElement;
      statement.click();

      const editor = document.querySelector('.inline-editor') as HTMLTextAreaElement;
      expect(editor).toBeTruthy();
      expect(editor.value).toBe('Original statement');
      expect(statement.classList.contains('editing-active')).toBe(true);
    });

    it('should finish editing on Enter key', () => {
      const statement = document.querySelector('.editable-statement') as HTMLElement;
      statement.click();

      const editor = document.querySelector('.inline-editor') as HTMLTextAreaElement;
      editor.value = 'Updated statement';

      const enterEvent = new window.KeyboardEvent('keydown', { key: 'Enter' });
      editor.dispatchEvent(enterEvent);

      expect(mockVSCode.postMessage).toHaveBeenCalledWith({
        type: 'editContent',
        metadata: {
          type: 'statement',
          statementId: 'stmt1',
          nodeId: 'node1',
          statementType: 'premise',
        },
        newContent: 'Updated statement',
      });

      expect(document.querySelector('.inline-editor')).toBeFalsy();
      expect(statement.classList.contains('editing-active')).toBe(false);
    });

    it('should cancel editing on Escape key', () => {
      const statement = document.querySelector('.editable-statement') as HTMLElement;
      statement.click();

      const editor = document.querySelector('.inline-editor') as HTMLTextAreaElement;
      editor.value = 'Changed but cancelled';

      const escapeEvent = new window.KeyboardEvent('keydown', { key: 'Escape' });
      editor.dispatchEvent(escapeEvent);

      expect(mockVSCode.postMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'editContent' }),
      );

      expect(document.querySelector('.inline-editor')).toBeFalsy();
    });

    it('should finish editing on outside click', () => {
      const statement = document.querySelector('.editable-statement') as HTMLElement;
      statement.click();

      const editor = document.querySelector('.inline-editor') as HTMLTextAreaElement;
      editor.value = 'Updated via outside click';

      // Click outside
      document.body.click();

      expect(mockVSCode.postMessage).toHaveBeenCalledWith({
        type: 'editContent',
        metadata: expect.any(Object),
        newContent: 'Updated via outside click',
      });
    });

    it('should handle label editing', () => {
      const label = document.querySelector('.editable-label') as HTMLElement;
      label.click();

      const editor = document.querySelector('.inline-editor') as HTMLTextAreaElement;
      expect(editor.value).toBe('Rule Name');

      editor.value = 'Updated Rule';
      const enterEvent = new window.KeyboardEvent('keydown', { key: 'Enter' });
      editor.dispatchEvent(enterEvent);

      expect(mockVSCode.postMessage).toHaveBeenCalledWith({
        type: 'editContent',
        metadata: {
          type: 'label',
          nodeId: 'node1',
          labelType: 'side',
        },
        newContent: 'Updated Rule',
      });
    });
  });

  describe('Drag and Drop Features', () => {
    beforeEach(() => {
      // Setup draggable elements
      const container = document.getElementById('tree-container') as HTMLElement;
      container.innerHTML = `
        <svg class="proof-tree-svg">
          <g class="statement-group" 
             data-statement-id="stmt1" 
             data-node-id="node1" 
             data-statement-type="premise"
             draggable="true">
            Statement 1
          </g>
          <g class="argument-node-group" data-node-id="node1">
            <rect class="drag-handle" data-node-id="node1"></rect>
          </g>
          <rect class="drop-zone" 
                data-statement-id="stmt2" 
                data-drop-type="premise"></rect>
        </svg>
      `;

      window.eval('initializeInteractiveFeatures()');
    });

    it('should handle statement drag start', () => {
      const statement = document.querySelector('.statement-group') as HTMLElement;

      const dragEvent = new window.DragEvent('dragstart');
      Object.defineProperty(dragEvent, 'dataTransfer', {
        value: {
          setData: vi.fn(),
          effectAllowed: '',
        },
      });

      statement.dispatchEvent(dragEvent);

      expect(statement.classList.contains('dragging')).toBe(true);
      expect(dragEvent.dataTransfer?.setData).toHaveBeenCalledWith(
        'text/plain',
        JSON.stringify({
          statementId: 'stmt1',
          statementType: 'premise',
          nodeId: 'node1',
        }),
      );
    });

    it('should handle node drag start', () => {
      const handle = document.querySelector('.drag-handle') as HTMLElement;

      const mouseEvent = new window.MouseEvent('mousedown', {
        clientX: 100,
        clientY: 200,
      });

      handle.dispatchEvent(mouseEvent);

      const nodeGroup = document.querySelector('.argument-node-group') as HTMLElement;
      expect(nodeGroup.classList.contains('dragging')).toBe(true);
    });

    it('should handle node drag movement', () => {
      const handle = document.querySelector('.drag-handle') as HTMLElement;

      // Start drag
      const mouseDown = new window.MouseEvent('mousedown', {
        clientX: 100,
        clientY: 200,
      });
      handle.dispatchEvent(mouseDown);

      // Move mouse
      const mouseMove = new window.MouseEvent('mousemove', {
        clientX: 150,
        clientY: 250,
      });
      document.dispatchEvent(mouseMove);

      const nodeGroup = document.querySelector('.argument-node-group') as HTMLElement;
      expect(nodeGroup.style.transform).toBe('translate(50px, 50px)');
    });

    it('should handle node drag end with position update', () => {
      const handle = document.querySelector('.drag-handle') as HTMLElement;

      // Start drag
      const mouseDown = new window.MouseEvent('mousedown', {
        clientX: 100,
        clientY: 200,
      });
      handle.dispatchEvent(mouseDown);

      // End drag with significant movement
      const mouseUp = new window.MouseEvent('mouseup', {
        clientX: 160,
        clientY: 270,
      });
      document.dispatchEvent(mouseUp);

      expect(mockVSCode.postMessage).toHaveBeenCalledWith({
        type: 'moveNode',
        nodeId: 'node1',
        deltaX: 60,
        deltaY: 70,
      });

      const nodeGroup = document.querySelector('.argument-node-group') as HTMLElement;
      expect(nodeGroup.classList.contains('dragging')).toBe(false);
      expect(nodeGroup.style.transform).toBe('');
    });

    it('should handle drop zone interactions', () => {
      const dropZone = document.querySelector('.drop-zone') as HTMLElement;

      // Simulate drag state
      window.eval(`
        dragState = {
          isDragging: true,
          type: 'statement',
          data: { statementType: 'premise' }
        };
      `);

      const dragEnter = new window.DragEvent('dragenter');
      dropZone.dispatchEvent(dragEnter);

      expect(dropZone.classList.contains('active')).toBe(true);
      expect(dropZone.classList.contains('valid')).toBe(true);
    });

    it('should handle statement drop', () => {
      const statement = document.querySelector('.statement-group') as HTMLElement;
      const dropZone = document.querySelector('.drop-zone') as HTMLElement;

      // Start drag
      const dragStart = new window.DragEvent('dragstart');
      Object.defineProperty(dragStart, 'dataTransfer', {
        value: { setData: vi.fn(), effectAllowed: '' },
      });
      statement.dispatchEvent(dragStart);

      // Drop on zone
      const dropEvent = new window.DragEvent('drop');
      Object.defineProperty(dropEvent, 'target', {
        value: dropZone,
      });
      document.dispatchEvent(dropEvent);

      expect(mockVSCode.postMessage).toHaveBeenCalledWith({
        type: 'moveStatement',
        sourceData: {
          statementId: 'stmt1',
          statementType: 'premise',
          nodeId: 'node1',
        },
        targetStatementId: 'stmt2',
        dropType: 'premise',
      });
    });
  });

  describe('Hover and Tooltip Features', () => {
    beforeEach(() => {
      const container = document.getElementById('tree-container') as HTMLElement;
      container.innerHTML = `
        <svg class="proof-tree-svg">
          <g class="statement-group" data-statement-id="stmt1">
            <text class="statement-text">Statement 1</text>
          </g>
          <g class="connection-group" data-from-node="node1" data-to-node="node2">
            <line class="connection-line"></line>
          </g>
          <g class="argument-node-group" data-node-id="node1" data-argument-id="arg1">
            Node 1
          </g>
        </svg>
      `;

      window.eval('initializeInteractiveFeatures()');
    });

    it('should highlight statements on hover', () => {
      const statementGroup = document.querySelector('.statement-group') as HTMLElement;

      const mouseEnter = new window.MouseEvent('mouseenter');
      statementGroup.dispatchEvent(mouseEnter);

      const statementText = document.querySelector('.statement-text') as HTMLElement;
      expect(statementText.classList.contains('statement-highlighted')).toBe(true);

      // Should create tooltip
      const tooltip = document.querySelector('.tooltip') as HTMLElement;
      expect(tooltip).toBeTruthy();
      expect(tooltip.textContent).toBe('Statement: stmt1');
    });

    it('should remove highlights on mouse leave', () => {
      const statementGroup = document.querySelector('.statement-group') as HTMLElement;

      // Enter
      statementGroup.dispatchEvent(new window.MouseEvent('mouseenter'));

      // Leave
      statementGroup.dispatchEvent(new window.MouseEvent('mouseleave'));

      const statementText = document.querySelector('.statement-text') as HTMLElement;
      expect(statementText.classList.contains('statement-highlighted')).toBe(false);

      // Tooltip should be removed
      expect(document.querySelector('.tooltip')).toBeFalsy();
    });

    it('should highlight connections on hover', () => {
      const connectionGroup = document.querySelector('.connection-group') as HTMLElement;

      const mouseEnter = new window.MouseEvent('mouseenter');
      connectionGroup.dispatchEvent(mouseEnter);

      const connectionLine = document.querySelector('.connection-line') as HTMLElement;
      expect(connectionLine.classList.contains('connection-highlighted')).toBe(true);

      const tooltip = document.querySelector('.tooltip') as HTMLElement;
      expect(tooltip.textContent).toBe('Connection: node1 → node2');
    });

    it('should show node tooltips', () => {
      const nodeGroup = document.querySelector('.argument-node-group') as HTMLElement;

      const mouseEnter = new window.MouseEvent('mouseenter');
      nodeGroup.dispatchEvent(mouseEnter);

      const tooltip = document.querySelector('.tooltip') as HTMLElement;
      expect(tooltip.textContent).toBe('Node: node1 (Argument: arg1)');
    });
  });

  describe('Property-Based Testing with Fast-Check', () => {
    it('should handle arbitrary zoom values safely', async () => {
      await fc.assert(
        fc.property(fc.float({ min: 0.1, max: 5.0 }), (zoomValue) => {
          // Manually set zoom and apply
          window.eval(`currentZoom = ${zoomValue}; applyZoom();`);

          expect(mockVSCode.postMessage).toHaveBeenCalledWith({
            type: 'viewportChanged',
            viewport: { zoom: zoomValue, pan: { x: 0, y: 0 }, center: { x: 0, y: 0 } },
          });
        }),
        { numRuns: 25 },
      );
    });

    it('should handle arbitrary form input safely', async () => {
      await fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 1000 }),
          fc.string({ minLength: 1, maxLength: 1000 }),
          (premiseText, conclusionText) => {
            // Fill form
            const premiseInput = document.getElementById('premise-input') as HTMLTextAreaElement;
            const conclusionInput = document.getElementById(
              'conclusion-input',
            ) as HTMLTextAreaElement;

            premiseInput.value = premiseText;
            conclusionInput.value = conclusionText;

            // Submit
            window.eval('createArgument()');

            // Should call VS Code API with processed text
            expect(mockVSCode.postMessage).toHaveBeenCalledWith({
              type: 'createArgument',
              premises: [premiseText.trim()],
              conclusions: [conclusionText.trim()],
              ruleName: undefined,
            });
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should handle arbitrary mouse coordinates for drag operations', async () => {
      await fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 2000 }),
          fc.integer({ min: 0, max: 2000 }),
          fc.integer({ min: 0, max: 2000 }),
          fc.integer({ min: 0, max: 2000 }),
          (startX, startY, endX, endY) => {
            // Setup draggable element
            const container = document.getElementById('tree-container') as HTMLElement;
            container.innerHTML = `
              <g class="argument-node-group" data-node-id="test-node">
                <rect class="drag-handle" data-node-id="test-node"></rect>
              </g>
            `;
            window.eval('initializeInteractiveFeatures()');

            const handle = document.querySelector('.drag-handle') as HTMLElement;

            // Start drag
            const mouseDown = new window.MouseEvent('mousedown', {
              clientX: startX,
              clientY: startY,
            });
            handle.dispatchEvent(mouseDown);

            // End drag
            const mouseUp = new window.MouseEvent('mouseup', {
              clientX: endX,
              clientY: endY,
            });
            document.dispatchEvent(mouseUp);

            const deltaX = endX - startX;
            const deltaY = endY - startY;

            // Should handle any coordinate values without crashing
            if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
              expect(mockVSCode.postMessage).toHaveBeenCalledWith({
                type: 'moveNode',
                nodeId: 'test-node',
                deltaX,
                deltaY,
              });
            }
          },
        ),
        { numRuns: 15 },
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing DOM elements gracefully', () => {
      // Remove critical elements
      document.getElementById('tree-container')?.remove();
      document.getElementById('sidebar')?.remove();

      // Should not crash
      expect(() => {
        window.eval('updateToolbarState()');
        window.eval('showCreateArgumentForm()');
        window.eval('initializeInteractiveFeatures()');
      }).not.toThrow();
    });

    it('should handle malformed SVG content', () => {
      const container = document.getElementById('tree-container') as HTMLElement;
      container.innerHTML = 'Invalid SVG content <not-closed>';

      expect(() => {
        window.eval('initializeInteractiveFeatures()');
      }).not.toThrow();
    });

    it('should handle events on removed elements', () => {
      const container = document.getElementById('tree-container') as HTMLElement;
      container.innerHTML = `
        <svg>
          <g class="statement-group editable-statement" data-statement-id="stmt1">Test</g>
        </svg>
      `;

      window.eval('initializeInteractiveFeatures()');

      const statement = document.querySelector('.statement-group') as HTMLElement;

      // Start editing
      statement.click();

      // Remove element while editing
      statement.remove();

      // Should handle gracefully
      expect(() => {
        document.body.click(); // Try to finish editing
      }).not.toThrow();
    });

    it('should handle memory cleanup during intensive interactions', () => {
      // Create many elements and interact with them
      const container = document.getElementById('tree-container') as HTMLElement;
      let elementsHTML = '<svg>';

      for (let i = 0; i < 100; i++) {
        elementsHTML += `
          <g class="statement-group" data-statement-id="stmt${i}">
            <text class="statement-text">Statement ${i}</text>
          </g>
        `;
      }
      elementsHTML += '</svg>';

      container.innerHTML = elementsHTML;
      window.eval('initializeInteractiveFeatures()');

      // Hover over many elements rapidly
      const statements = document.querySelectorAll('.statement-group');
      statements.forEach((statement, index) => {
        if (index < 20) {
          // Limit to prevent test timeout
          statement.dispatchEvent(new window.MouseEvent('mouseenter'));
          statement.dispatchEvent(new window.MouseEvent('mouseleave'));
        }
      });

      // Should complete without memory issues
      expect(statements.length).toBe(100);
    });
  });

  describe('Accessibility and Keyboard Navigation', () => {
    it('should handle keyboard navigation for forms', () => {
      // Show form
      const createBtn = document.getElementById('create-argument-btn') as HTMLButtonElement;
      createBtn.click();

      const premiseInput = document.getElementById('premise-input') as HTMLTextAreaElement;
      premiseInput.focus();

      // Tab navigation should work
      const tabEvent = new window.KeyboardEvent('keydown', { key: 'Tab' });
      premiseInput.dispatchEvent(tabEvent);

      // Focus should remain manageable
      expect(document.activeElement).toBeTruthy();
    });

    it('should handle Escape key for global actions', () => {
      // Start editing
      const container = document.getElementById('tree-container') as HTMLElement;
      container.innerHTML = `
        <svg>
          <text class="editable-statement" 
                data-statement-id="stmt1" 
                data-original-content="Test">Test</text>
        </svg>
      `;

      window.eval('initializeInteractiveFeatures()');

      const statement = document.querySelector('.editable-statement') as HTMLElement;
      statement.click();

      // Press escape
      const escapeEvent = new window.KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      // Should close editor
      expect(document.querySelector('.inline-editor')).toBeFalsy();
    });

    it('should provide proper focus management during editing', () => {
      const container = document.getElementById('tree-container') as HTMLElement;
      container.innerHTML = `
        <svg>
          <text class="editable-statement" 
                data-statement-id="stmt1" 
                data-original-content="Test">Test</text>
        </svg>
      `;

      window.eval('initializeInteractiveFeatures()');

      const statement = document.querySelector('.editable-statement') as HTMLElement;
      statement.click();

      const editor = document.querySelector('.inline-editor') as HTMLTextAreaElement;
      expect(document.activeElement).toBe(editor);
      expect(editor.selectionStart).toBe(0);
      expect(editor.selectionEnd).toBe(editor.value.length);
    });
  });
});

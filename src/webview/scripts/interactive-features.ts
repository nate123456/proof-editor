// =============================================================================
// PROOF TREE INTERACTIVE FEATURES
// =============================================================================

// VS Code API
declare const acquireVsCodeApi: () => {
  postMessage: (message: unknown) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
};

const vscode = acquireVsCodeApi();

// Global state
let currentZoom = 1;
let hasArguments = false;
let currentStatementType: 'premise' | 'conclusion' = 'premise';

// State for interactive features
interface EditorMetadata {
  type: 'statement' | 'label';
  statementId?: string;
  nodeId?: string;
  statementType?: string;
  labelType?: string;
}

let currentEditor: {
  element: HTMLTextAreaElement;
  target: Element;
  originalContent: string;
  metadata: EditorMetadata;
} | null = null;

interface DragData {
  statementId?: string | null;
  statementType?: string | null;
  nodeId?: string | null;
}

let dragState: {
  isDragging: boolean;
  element: Element | null;
  startX: number;
  startY: number;
  type: 'statement' | 'node' | null;
  data?: DragData;
} = {
  isDragging: false,
  element: null,
  startX: 0,
  startY: 0,
  type: null,
};

let currentTooltip: HTMLDivElement | null = null;

// =============================================================================
// MESSAGE HANDLING
// =============================================================================

window.addEventListener('message', (event) => {
  const message = event.data;
  const container = document.getElementById('tree-container');
  const overlay = document.getElementById('bootstrap-overlay');

  switch (message.type) {
    case 'updateTree':
      if (container) {
        container.innerHTML = message.content;
        if (message.content && message.content.trim().length > 0) {
          if (overlay) overlay.style.display = 'none';
          hasArguments = true;
          updateToolbarState();
          // Initialize interactive features after content update
          initializeInteractiveFeatures();
        }
      }
      break;
    case 'showError':
      if (container) container.innerHTML = message.content;
      break;
    case 'showBootstrapGuide':
      if (overlay) overlay.style.display = 'block';
      hasArguments = false;
      updateToolbarState();
      break;
    case 'argumentCreated':
      hideSidebar();
      if (overlay) overlay.style.display = 'none';
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

// =============================================================================
// TOOLBAR AND UI FUNCTIONS
// =============================================================================

function updateToolbarState(): void {
  const createBtn = document.getElementById('create-argument-btn') as HTMLButtonElement;
  const addPremiseBtn = document.getElementById('add-premise-btn') as HTMLButtonElement;
  const addConclusionBtn = document.getElementById('add-conclusion-btn') as HTMLButtonElement;
  const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;

  if (createBtn) createBtn.disabled = hasArguments;
  if (addPremiseBtn) addPremiseBtn.disabled = !hasArguments;
  if (addConclusionBtn) addConclusionBtn.disabled = !hasArguments;
  if (exportBtn) exportBtn.disabled = !hasArguments;

  if (hasArguments && createBtn) {
    createBtn.textContent = 'Create Another Argument';
    createBtn.disabled = false;
  }
}

function showCreateArgumentForm(): void {
  showSidebar();
  hideAllForms();
  const form = document.getElementById('create-argument-form');
  if (form) {
    form.classList.remove('hidden');
    form.classList.add('block');
  }
}

function showAddStatementForm(type: 'premise' | 'conclusion'): void {
  currentStatementType = type;
  showSidebar();
  hideAllForms();
  const form = document.getElementById('add-statement-form');
  const title = document.getElementById('statement-form-title');
  if (form) {
    form.classList.remove('hidden');
    form.classList.add('block');
  }
  if (title) {
    title.textContent = type === 'premise' ? 'Add Premise' : 'Add Conclusion';
  }
}

function showSidebar(): void {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.remove('hidden');
    sidebar.classList.add('block');
  }
}

function hideSidebar(): void {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.add('hidden');
    sidebar.classList.remove('block');
  }
  hideAllForms();
}

function hideAllForms(): void {
  const createForm = document.getElementById('create-argument-form');
  const addForm = document.getElementById('add-statement-form');
  if (createForm) {
    createForm.classList.add('hidden');
    createForm.classList.remove('block');
  }
  if (addForm) {
    addForm.classList.add('hidden');
    addForm.classList.remove('block');
  }
}

function createArgument(): void {
  const premiseInput = document.getElementById('premise-input') as HTMLTextAreaElement;
  const conclusionInput = document.getElementById('conclusion-input') as HTMLTextAreaElement;
  const ruleInput = document.getElementById('rule-input') as HTMLInputElement;

  if (!premiseInput || !conclusionInput) return;

  const premises = premiseInput.value
    .split('\n')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  const conclusions = conclusionInput.value
    .split('\n')
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
  const ruleName = ruleInput?.value.trim();

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
    ruleName: ruleName || undefined,
  });

  // Clear form
  premiseInput.value = '';
  conclusionInput.value = '';
  if (ruleInput) ruleInput.value = '';
}

function addStatement(): void {
  const contentInput = document.getElementById('statement-content') as HTMLTextAreaElement;
  if (!contentInput) return;

  const content = contentInput.value.trim();

  if (!content) {
    showErrorMessage('Statement content cannot be empty');
    return;
  }

  vscode.postMessage({
    type: 'addStatement',
    statementType: currentStatementType,
    content,
  });

  // Clear form
  contentInput.value = '';
}

// =============================================================================
// ZOOM AND VIEW FUNCTIONS
// =============================================================================

function zoomIn(): void {
  currentZoom = Math.min(currentZoom * 1.2, 3);
  applyZoom();
}

function zoomOut(): void {
  currentZoom = Math.max(currentZoom / 1.2, 0.5);
  applyZoom();
}

function resetView(): void {
  currentZoom = 1;
  applyZoom();
}

function applyZoom(): void {
  const container = document.getElementById('tree-container');
  if (container) {
    container.style.transform = `scale(${currentZoom})`;
    container.style.transformOrigin = 'top left';

    vscode.postMessage({
      type: 'viewportChanged',
      viewport: { zoom: currentZoom, pan: { x: 0, y: 0 }, center: { x: 0, y: 0 } },
    });
  }
}

function exportProof(): void {
  vscode.postMessage({
    type: 'exportProof',
  });
}

function showErrorMessage(message: string): void {
  vscode.postMessage({
    type: 'showError',
    message,
  });
}

function showSuccessMessage(_message: string): void {
  // TODO: Implement success message display
}

// =============================================================================
// ENHANCED INTERACTIVE FEATURES
// =============================================================================

/**
 * Initialize all interactive features after content update
 */
function initializeInteractiveFeatures(): void {
  try {
    setupInlineEditing();
    setupDragAndDrop();
    setupHoverHighlights();
    setupConnectionHighlights();
    setupBranchingInteractions();
  } catch (_error) {
    // TODO: Handle initialization errors
  }
}

// =============================================================================
// INLINE EDITING FUNCTIONALITY
// =============================================================================

/**
 * Set up click-to-edit functionality for statements and labels
 */
function setupInlineEditing(): void {
  // Statement editing
  document.querySelectorAll('.editable-statement').forEach((element) => {
    element.addEventListener('click', handleStatementEdit);
  });

  // Side label editing
  document.querySelectorAll('.editable-label').forEach((element) => {
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
function handleStatementEdit(event: Event): void {
  event.stopPropagation();

  if (currentEditor) {
    finishEditing();
  }

  const element = event.target as Element;
  const statementId = element.getAttribute('data-statement-id');
  const originalContent = element.getAttribute('data-original-content');
  const nodeId = element.getAttribute('data-node-id');
  const statementType = element.getAttribute('data-statement-type');

  if (!statementId || !originalContent) return;

  const metadata: EditorMetadata = {
    type: 'statement',
    statementId,
  };
  if (nodeId) metadata.nodeId = nodeId;
  if (statementType) metadata.statementType = statementType;

  startInlineEdit(element, originalContent, metadata);
}

/**
 * Handle side label editing
 */
function handleLabelEdit(event: Event): void {
  event.stopPropagation();

  if (currentEditor) {
    finishEditing();
  }

  const element = event.target as Element;
  const nodeId = element.getAttribute('data-node-id');
  const labelType = element.getAttribute('data-label-type');
  const originalContent = element.textContent?.trim() || '';

  if (!nodeId || !labelType) return;

  startInlineEdit(element, originalContent, {
    type: 'label',
    nodeId,
    labelType,
  });
}

/**
 * Start inline editing for an element
 */
function startInlineEdit(
  targetElement: Element,
  originalContent: string,
  metadata: EditorMetadata,
): void {
  // Get position relative to tree container
  const container = document.getElementById('tree-container');
  if (!container) return;

  const containerRect = container.getBoundingClientRect();
  const elementRect = targetElement.getBoundingClientRect();

  // Create textarea for editing
  const editor = document.createElement('textarea');
  editor.className = 'inline-editor';
  editor.value = originalContent;

  // Position the editor
  editor.style.left = `${elementRect.left - containerRect.left + container.scrollLeft}px`;
  editor.style.top = `${elementRect.top - containerRect.top + container.scrollTop}px`;
  editor.style.width = `${Math.max(elementRect.width, 100)}px`;

  // Add to container
  container.appendChild(editor);

  // Store current editing state
  currentEditor = {
    element: editor,
    target: targetElement,
    originalContent,
    metadata,
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
function adjustEditorHeight(editor: HTMLTextAreaElement): void {
  editor.style.height = 'auto';
  editor.style.height = `${Math.max(editor.scrollHeight, 20)}px`;
}

/**
 * Handle keydown events in editor
 */
function handleEditorKeydown(event: KeyboardEvent): void {
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
function handleEditingKeydown(event: KeyboardEvent): void {
  if (currentEditor && event.key === 'Escape') {
    event.preventDefault();
    finishEditing(false);
  }
}

/**
 * Handle clicks outside the editor
 */
function handleOutsideClick(event: Event): void {
  if (currentEditor && !currentEditor.element.contains(event.target as Node)) {
    finishEditing(true);
  }
}

/**
 * Finish editing and save/cancel changes
 */
function finishEditing(save = true): void {
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
function saveEditedContent(newContent: string, metadata: EditorMetadata): void {
  vscode.postMessage({
    type: 'editContent',
    metadata,
    newContent,
  });
}

// =============================================================================
// DRAG AND DROP FUNCTIONALITY
// =============================================================================

/**
 * Set up drag and drop functionality
 */
function setupDragAndDrop(): void {
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
function setupStatementDrag(element: Element): void {
  const htmlElement = element as HTMLElement;
  htmlElement.draggable = true;
  htmlElement.addEventListener('dragstart', handleStatementDragStart);
  htmlElement.addEventListener('dragend', handleDragEnd);
}

/**
 * Set up dragging for node drag handles
 */
function setupNodeDrag(handle: Element): void {
  const htmlHandle = handle as HTMLElement;
  htmlHandle.addEventListener('mousedown', handleNodeDragStart);
}

/**
 * Set up drop zones
 */
function setupDropZone(zone: Element): void {
  const htmlZone = zone as HTMLElement;
  htmlZone.addEventListener('dragenter', handleDragEnter);
  htmlZone.addEventListener('dragleave', handleDragLeave);
}

/**
 * Handle start of statement drag
 */
function handleStatementDragStart(event: DragEvent): void {
  const element = event.currentTarget as Element;
  const statementId = element.getAttribute('data-statement-id');
  const statementType = element.getAttribute('data-statement-type');
  const nodeId = element.getAttribute('data-node-id');

  dragState = {
    isDragging: true,
    element,
    type: 'statement',
    startX: 0,
    startY: 0,
    data: { statementId, statementType, nodeId },
  };

  // Set drag data
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', JSON.stringify(dragState.data));
    event.dataTransfer.effectAllowed = 'move';
  }

  // Add visual feedback
  element.classList.add('dragging');

  // Show drop zones
  showCompatibleDropZones(statementType || '');
}

/**
 * Handle start of node drag (via drag handle)
 */
function handleNodeDragStart(event: MouseEvent): void {
  event.preventDefault();

  const handle = event.currentTarget as Element;
  const nodeId = handle.getAttribute('data-node-id');
  const nodeElement = document.querySelector(`[data-node-id="${nodeId}"].argument-node-group`);

  if (!nodeElement) return;

  dragState = {
    isDragging: true,
    element: nodeElement,
    type: 'node',
    startX: event.clientX,
    startY: event.clientY,
    data: { nodeId },
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
function handleNodeDrag(event: MouseEvent): void {
  if (!dragState.isDragging || dragState.type !== 'node' || !dragState.element) return;

  const deltaX = event.clientX - dragState.startX;
  const deltaY = event.clientY - dragState.startY;

  // Update visual position (this is just visual feedback)
  (dragState.element as HTMLElement).style.transform = `translate(${deltaX}px, ${deltaY}px)`;
}

/**
 * Handle end of node drag
 */
function handleNodeDragEnd(event: MouseEvent): void {
  if (!dragState.isDragging || dragState.type !== 'node' || !dragState.element) return;

  // Calculate final position
  const deltaX = event.clientX - dragState.startX;
  const deltaY = event.clientY - dragState.startY;

  // Send position update to backend
  if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
    vscode.postMessage({
      type: 'moveNode',
      nodeId: dragState.data?.nodeId,
      deltaX,
      deltaY,
    });
  }

  // Clean up
  dragState.element.classList.remove('dragging');
  (dragState.element as HTMLElement).style.transform = '';
  document.removeEventListener('mousemove', handleNodeDrag);
  document.removeEventListener('mouseup', handleNodeDragEnd);

  dragState = { isDragging: false, element: null, type: null, startX: 0, startY: 0 };
}

/**
 * Handle drag over (required for drop to work)
 */
function handleDragOver(event: DragEvent): void {
  if (dragState.isDragging && dragState.type === 'statement') {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }
}

/**
 * Handle drop
 */
function handleDrop(event: DragEvent): void {
  if (!dragState.isDragging || dragState.type !== 'statement') return;

  event.preventDefault();
  const dropZone = (event.target as Element).closest('.drop-zone');

  if (dropZone) {
    const dropType = dropZone.getAttribute('data-drop-type');
    const targetStatementId = dropZone.getAttribute('data-statement-id');

    // Send move statement message
    vscode.postMessage({
      type: 'moveStatement',
      sourceData: dragState.data,
      targetStatementId,
      dropType,
    });
  }

  handleDragEnd();
}

/**
 * Handle drag enter on drop zones
 */
function handleDragEnter(event: DragEvent): void {
  if (dragState.isDragging && dragState.type === 'statement') {
    const zone = event.currentTarget as Element;
    zone.classList.add('active');

    // Determine if this is a valid drop
    const dropType = zone.getAttribute('data-drop-type');
    const isValid = isValidDrop(dragState.data?.statementType || undefined, dropType);
    zone.classList.add(isValid ? 'valid' : 'invalid');
  }
}

/**
 * Handle drag leave on drop zones
 */
function handleDragLeave(event: DragEvent): void {
  const zone = event.currentTarget as Element;
  zone.classList.remove('active', 'valid', 'invalid');
}

/**
 * Handle end of drag
 */
function handleDragEnd(_event?: DragEvent): void {
  if (dragState.element) {
    dragState.element.classList.remove('dragging');
  }

  // Hide all drop zones
  document.querySelectorAll('.drop-zone').forEach((zone) => {
    zone.classList.remove('active', 'valid', 'invalid');
    (zone as HTMLElement).style.pointerEvents = 'none';
  });

  dragState = { isDragging: false, element: null, type: null, startX: 0, startY: 0 };
}

/**
 * Show compatible drop zones for the given statement type
 */
function showCompatibleDropZones(_statementType: string): void {
  document.querySelectorAll('.drop-zone').forEach((zone) => {
    (zone as HTMLElement).style.pointerEvents = 'auto';
    (zone as HTMLElement).style.opacity = '0.1';
  });
}

/**
 * Check if a drop is valid
 */
function isValidDrop(
  sourceType: string | undefined,
  targetType: string | null | undefined,
): boolean {
  // Premises can be dropped on premise zones, conclusions on conclusion zones
  return sourceType === targetType;
}

// =============================================================================
// HOVER HIGHLIGHTS AND VISUAL FEEDBACK
// =============================================================================

/**
 * Set up hover highlight effects
 */
function setupHoverHighlights(): void {
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
function setupStatementHover(element: Element): void {
  element.addEventListener('mouseenter', handleStatementHover);
  element.addEventListener('mouseleave', handleStatementLeave);
}

/**
 * Set up hover effects for connections
 */
function setupConnectionHover(element: Element): void {
  element.addEventListener('mouseenter', handleConnectionHover);
  element.addEventListener('mouseleave', handleConnectionLeave);
}

/**
 * Set up hover effects for nodes
 */
function setupNodeHover(element: Element): void {
  element.addEventListener('mouseenter', handleNodeHover);
  element.addEventListener('mouseleave', handleNodeLeave);
}

/**
 * Handle statement hover - highlight related statements
 */
function handleStatementHover(event: Event): void {
  const element = event.currentTarget as Element;
  const statementId = element.getAttribute('data-statement-id');

  if (statementId) {
    // Highlight all instances of this statement
    document
      .querySelectorAll(`[data-statement-id="${statementId}"] .statement-text`)
      .forEach((text) => {
        text.classList.add('statement-highlighted');
      });

    // Show tooltip with statement metadata
    showStatementTooltip(element, statementId);
  }
}

/**
 * Handle statement leave
 */
function handleStatementLeave(_event: Event): void {
  // Remove all statement highlights
  document.querySelectorAll('.statement-highlighted').forEach((element) => {
    element.classList.remove('statement-highlighted');
  });

  hideTooltip();
}

/**
 * Handle connection hover - highlight connection path
 */
function handleConnectionHover(event: Event): void {
  const element = event.currentTarget as Element;
  const fromNode = element.getAttribute('data-from-node');
  const toNode = element.getAttribute('data-to-node');

  // Highlight the connection
  const connectionLine = element.querySelector('.connection-line');
  if (connectionLine) {
    connectionLine.classList.add('connection-highlighted');
  }

  // Highlight connected nodes
  if (fromNode) {
    const fromElement = document.querySelector(`[data-node-id="${fromNode}"].argument-node`);
    if (fromElement) fromElement.classList.add('interactive-node');
  }

  if (toNode) {
    const toElement = document.querySelector(`[data-node-id="${toNode}"].argument-node`);
    if (toElement) toElement.classList.add('interactive-node');
  }

  // Show connection tooltip
  showConnectionTooltip(element, fromNode, toNode);
}

/**
 * Handle connection leave
 */
function handleConnectionLeave(_event: Event): void {
  // Remove connection highlights
  document.querySelectorAll('.connection-highlighted').forEach((element) => {
    element.classList.remove('connection-highlighted');
  });

  hideTooltip();
}

/**
 * Handle node hover
 */
function handleNodeHover(event: Event): void {
  const element = event.currentTarget as Element;
  const nodeId = element.getAttribute('data-node-id');
  const argumentId = element.getAttribute('data-argument-id');

  // Show node tooltip
  showNodeTooltip(element, nodeId, argumentId);
}

/**
 * Handle node leave
 */
function handleNodeLeave(_event: Event): void {
  hideTooltip();
}

// =============================================================================
// CONNECTION HIGHLIGHTING
// =============================================================================

/**
 * Set up connection path highlighting
 */
function setupConnectionHighlights(): void {
  // This will highlight connection paths when hovering over statements
  // that are connected across multiple arguments
}

// =============================================================================
// BRANCHING INTERACTIONS
// =============================================================================

/**
 * Set up text selection and branching functionality
 */
function setupBranchingInteractions(): void {
  // Add context menu for text selection
  document.querySelectorAll('.statement-text').forEach(setupStatementBranching);
}

/**
 * Set up branching interactions for a statement element
 */
function setupStatementBranching(element: Element): void {
  const htmlElement = element as HTMLElement;
  htmlElement.addEventListener('contextmenu', handleStatementContextMenu);
  htmlElement.addEventListener('mouseup', handleStatementSelection);
}

/**
 * Handle right-click context menu on statements
 */
function handleStatementContextMenu(event: MouseEvent): void {
  event.preventDefault();
  const selection = window.getSelection();
  const selectedText = selection?.toString().trim() || '';

  if (!selectedText) {
    return;
  }

  const element = event.currentTarget as Element;
  const argumentId = element.getAttribute('data-argument-id');
  const statementType = element.getAttribute('data-statement-type');

  if (!argumentId || !statementType) {
    return;
  }

  showBranchingContextMenu(event.pageX, event.pageY, {
    argumentId,
    selectedText,
    statementType,
  });
}

/**
 * Handle text selection for potential branching
 */
function handleStatementSelection(event: MouseEvent): void {
  const selection = window.getSelection();
  const selectedText = selection?.toString().trim() || '';

  if (!selectedText) {
    hideBranchingTooltip();
    return;
  }

  const element = event.currentTarget as Element;
  const argumentId = element.getAttribute('data-argument-id');
  const statementType = element.getAttribute('data-statement-type');

  if (!argumentId || !statementType) {
    return;
  }

  showBranchingTooltip(event.pageX, event.pageY, {
    argumentId,
    selectedText,
    statementType,
  });
}

interface BranchData {
  argumentId: string;
  selectedText: string;
  statementType: string;
}

/**
 * Show context menu for branching options
 */
function showBranchingContextMenu(x: number, y: number, branchData: BranchData): void {
  hideBranchingContextMenu();

  const menu = document.createElement('div');
  menu.id = 'branching-context-menu';
  menu.className =
    'absolute bg-vscode-editor-background border border-vscode-panel-border rounded shadow-lg z-50 p-2';
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;

  const _branchType = branchData.statementType === 'premise' ? 'backward' : 'forward';
  const branchLabel =
    branchData.statementType === 'premise'
      ? 'Create Supporting Argument'
      : 'Create Following Argument';

  menu.innerHTML = `
    <div class="text-xs text-vscode-description-fg mb-2">Selected: "${branchData.selectedText}"</div>
    <button onclick="createBranch('${branchData.argumentId}', '${branchData.selectedText}', '${branchData.statementType}')" 
            class="w-full text-left bg-vscode-button-bg text-vscode-button-fg hover:bg-vscode-button-hover border-none px-2 py-1 rounded text-xs cursor-pointer">
      ${branchLabel}
    </button>
    <button onclick="hideBranchingContextMenu()" 
            class="w-full text-left bg-vscode-button-secondary-bg text-vscode-button-secondary-fg hover:bg-vscode-button-secondary-hover border-none px-2 py-1 rounded text-xs cursor-pointer mt-1">
      Cancel
    </button>
  `;

  document.body.appendChild(menu);

  // Close menu on outside click
  document.addEventListener('click', function closeMenu(e) {
    if (!menu.contains(e.target as Node)) {
      hideBranchingContextMenu();
      document.removeEventListener('click', closeMenu);
    }
  });
}

/**
 * Show tooltip for quick branching
 */
function showBranchingTooltip(x: number, y: number, branchData: BranchData): void {
  hideBranchingTooltip();

  const tooltip = document.createElement('div');
  tooltip.id = 'branching-tooltip';
  tooltip.className =
    'absolute bg-vscode-editor-background border border-vscode-panel-border rounded px-2 py-1 text-xs text-vscode-editor-foreground z-40 pointer-events-none';
  tooltip.style.left = `${x + 10}px`;
  tooltip.style.top = `${y - 30}px`;

  const branchType = branchData.statementType === 'premise' ? 'backward' : 'forward';
  tooltip.textContent = `Right-click to create ${branchType} branch`;

  document.body.appendChild(tooltip);

  // Auto-hide after 3 seconds
  setTimeout(hideBranchingTooltip, 3000);
}

/**
 * Hide context menu
 */
function hideBranchingContextMenu(): void {
  const menu = document.getElementById('branching-context-menu');
  if (menu) {
    menu.remove();
  }
}

/**
 * Hide tooltip
 */
function hideBranchingTooltip(): void {
  const tooltip = document.getElementById('branching-tooltip');
  if (tooltip) {
    tooltip.remove();
  }
}

/**
 * Create a branch from selected text
 */
function createBranch(sourceArgumentId: string, selectedText: string, position: string): void {
  hideBranchingContextMenu();

  vscode.postMessage({
    type: 'createBranchFromSelection',
    sourceArgumentId,
    selectedText,
    position,
  });

  showSuccessMessage('Creating branch...');
}

// =============================================================================
// TOOLTIP SYSTEM
// =============================================================================

/**
 * Show statement tooltip
 */
function showStatementTooltip(element: Element, statementId: string): void {
  const tooltip = createTooltip(`Statement: ${statementId}`);
  positionTooltip(tooltip, element);
}

/**
 * Show connection tooltip
 */
function showConnectionTooltip(
  element: Element,
  fromNode: string | null,
  toNode: string | null,
): void {
  const tooltip = createTooltip(`Connection: ${fromNode} → ${toNode}`);
  positionTooltip(tooltip, element);
}

/**
 * Show node tooltip
 */
function showNodeTooltip(element: Element, nodeId: string | null, argumentId: string | null): void {
  const tooltip = createTooltip(`Node: ${nodeId} (Argument: ${argumentId})`);
  positionTooltip(tooltip, element);
}

/**
 * Create tooltip element
 */
function createTooltip(text: string): HTMLDivElement {
  const tooltip = document.createElement('div');
  tooltip.className =
    'absolute bg-vscode-editor-background border border-vscode-panel-border rounded px-2 py-1 text-xs text-vscode-editor-foreground z-50 pointer-events-none';
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
function positionTooltip(tooltip: HTMLDivElement, element: Element): void {
  const rect = element.getBoundingClientRect();
  tooltip.style.left = `${rect.left + rect.width / 2}px`;
  tooltip.style.top = `${rect.bottom + 5}px`;
  tooltip.style.transform = 'translateX(-50%)';
}

/**
 * Hide current tooltip
 */
function hideTooltip(): void {
  if (currentTooltip) {
    currentTooltip.remove();
    currentTooltip = null;
  }
}

// =============================================================================
// EXPOSE FUNCTIONS TO WINDOW
// =============================================================================

// Expose functions that need to be accessible from tests or inline handlers
interface ProofTreeWindow extends Window {
  zoomIn: typeof zoomIn;
  zoomOut: typeof zoomOut;
  resetView: typeof resetView;
  applyZoom: typeof applyZoom;
  showCreateArgumentForm: typeof showCreateArgumentForm;
  createArgument: typeof createArgument;
  showAddStatementForm: typeof showAddStatementForm;
  addStatement: typeof addStatement;
  hideSidebar: typeof hideSidebar;
  exportProof: typeof exportProof;
  updateToolbarState: typeof updateToolbarState;
  initializeInteractiveFeatures: typeof initializeInteractiveFeatures;
  createBranch: typeof createBranch;
  hideBranchingContextMenu: typeof hideBranchingContextMenu;
}

const proofWindow = window as unknown as ProofTreeWindow;
proofWindow.zoomIn = zoomIn;
proofWindow.zoomOut = zoomOut;
proofWindow.resetView = resetView;
proofWindow.applyZoom = applyZoom;
proofWindow.showCreateArgumentForm = showCreateArgumentForm;
proofWindow.createArgument = createArgument;
proofWindow.showAddStatementForm = showAddStatementForm;
proofWindow.addStatement = addStatement;
proofWindow.hideSidebar = hideSidebar;
proofWindow.exportProof = exportProof;
proofWindow.updateToolbarState = updateToolbarState;
proofWindow.initializeInteractiveFeatures = initializeInteractiveFeatures;
proofWindow.createBranch = createBranch;
proofWindow.hideBranchingContextMenu = hideBranchingContextMenu;

// =============================================================================
// INITIALIZATION
// =============================================================================

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  updateToolbarState();
});

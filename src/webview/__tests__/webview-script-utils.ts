// Webview script utilities for testing
// This script runs inside the webview's browser context

export const webviewScript = `
console.log('SCRIPT EXECUTION STARTED');
// Mock VS Code API
const vscode = acquireVsCodeApi();
console.log('vscode API acquired:', typeof vscode);

// Global state variables
let currentZoom = 1;
window.currentZoom = currentZoom;
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

// Define all functions first to avoid reference errors

// Form management functions
window.showCreateArgumentForm = function() {
  window.showSidebar();
  window.hideAllForms();
  document.getElementById('create-argument-form').classList.remove('hidden');
}

window.showAddStatementForm = function(type) {
  currentStatementType = type;
  window.showSidebar();
  window.hideAllForms();
  document.getElementById('add-statement-form').classList.remove('hidden');
  document.getElementById('statement-form-title').textContent = 
    type === 'premise' ? 'Add Premise' : 'Add Conclusion';
}

window.showSidebar = function() {
  document.getElementById('sidebar').classList.remove('hidden');
}

window.hideSidebar = function() {
  console.log('hideSidebar called');
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.add('hidden');
  }
  window.hideAllForms();
}

window.hideAllForms = function() {
  document.getElementById('create-argument-form').classList.add('hidden');
  document.getElementById('add-statement-form').classList.add('hidden');
}

window.showErrorMessage = function(message) {
  vscode.postMessage({ type: 'showError', message });
}

window.showSuccessMessage = function(message) {
  console.log('Success:', message);
}

// Toolbar functions
window.updateToolbarState = function() {
  const createBtn = document.getElementById('create-argument-btn');
  const addPremiseBtn = document.getElementById('add-premise-btn');
  const addConclusionBtn = document.getElementById('add-conclusion-btn');
  const exportBtn = document.getElementById('export-btn');
  
  if (hasArguments) {
    createBtn.textContent = 'Create Another Argument';
    addPremiseBtn.disabled = false;
    addConclusionBtn.disabled = false;
    exportBtn.disabled = false;
  }
}

window.createArgument = function() {
  const premiseInput = document.getElementById('premise-input');
  const conclusionInput = document.getElementById('conclusion-input');
  const ruleInput = document.getElementById('rule-input');
  
  const premiseLines = premiseInput.value.trim().split('\\n').filter(line => line.trim());
  const conclusionLines = conclusionInput.value.trim().split('\\n').filter(line => line.trim());
  
  if (premiseLines.length === 0) {
    window.showErrorMessage('At least one premise is required');
    return;
  }
  
  if (conclusionLines.length === 0) {
    window.showErrorMessage('At least one conclusion is required');
    return;
  }
  
  vscode.postMessage({
    type: 'createArgument',
    premises: premiseLines,
    conclusions: conclusionLines,
    ruleName: ruleInput.value.trim() || undefined
  });
  
  // Clear form
  premiseInput.value = '';
  conclusionInput.value = '';
  ruleInput.value = '';
  
  window.hideSidebar();
}

window.addStatement = function() {
  const contentInput = document.getElementById('statement-content');
  const content = contentInput.value.trim();
  
  if (!content) {
    window.showErrorMessage('Statement content cannot be empty');
    return;
  }
  
  vscode.postMessage({
    type: 'addStatement',
    statementType: currentStatementType,
    content: content
  });
  
  contentInput.value = '';
  window.hideSidebar();
}

// Zoom functions
window.zoomIn = function() {
  currentZoom *= 1.2;
  applyZoom();
}

window.zoomOut = function() {
  currentZoom /= 1.2;
  applyZoom();
}

window.resetView = function() {
  currentZoom = 1;
  applyZoom();
}

window.applyZoom = function() {
  const container = document.getElementById('tree-container');
  if (container) {
    container.style.transform = 'scale(' + currentZoom + ')';
  }
  
  vscode.postMessage({
    type: 'viewportChanged',
    viewport: { zoom: currentZoom, pan: { x: 0, y: 0 }, center: { x: 0, y: 0 } }
  });
}

window.exportProof = function() {
  vscode.postMessage({ type: 'exportProof' });
}

// =============================================================================
// INLINE EDITING FUNCTIONS
// =============================================================================

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
  
  window.currentEditor = currentEditor = {
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
  window.currentEditor = currentEditor = null;
}

function saveEditedContent(newContent, metadata) {
  vscode.postMessage({
    type: 'editContent',
    metadata,
    newContent
  });
}

// Finish editing function
window.finishEditing = function(save) {
  finishEditing(save);
}

// =============================================================================
// DRAG AND DROP FUNCTIONS
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
  
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', JSON.stringify(dragState.data));
    event.dataTransfer.effectAllowed = 'move';
  }
  
  element.classList.add('dragging');
  showCompatibleDropZones(statementType);
}

function handleNodeDragStart(event) {
  event.preventDefault();
  
  const handle = event.currentTarget;
  const nodeId = handle.getAttribute('data-node-id');
  const nodeElement = document.querySelector('[data-node-id="' + nodeId + '"].argument-node-group');
  
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
  
  dragState.element.style.transform = 'translate(' + deltaX + 'px, ' + deltaY + 'px)';
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
// HOVER EFFECTS FUNCTIONS
// =============================================================================

function setupHoverEffects() {
  // Setup statement hover
  document.querySelectorAll('.statement-group').forEach(element => {
    element.addEventListener('mouseenter', handleStatementHover);
    element.addEventListener('mouseleave', handleStatementLeave);
  });
  
  // Setup connection hover
  document.querySelectorAll('.connection-group').forEach(element => {
    element.addEventListener('mouseenter', handleConnectionHover);
    element.addEventListener('mouseleave', handleConnectionLeave);
  });
  
  // Setup node hover
  document.querySelectorAll('.argument-node-group').forEach(element => {
    element.addEventListener('mouseenter', handleNodeHover);
    element.addEventListener('mouseleave', handleNodeLeave);
  });
}

function handleStatementHover(event) {
  const statementId = this.getAttribute('data-statement-id');
  document.querySelectorAll('[data-statement-id="' + statementId + '"] .statement-text').forEach(text => {
    text.classList.add('statement-highlighted');
  });
  
  // Create tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.textContent = 'Statement: ' + statementId;
  document.body.appendChild(tooltip);
}

function handleStatementLeave() {
  document.querySelectorAll('.statement-highlighted').forEach(el => {
    el.classList.remove('statement-highlighted');
  });
  document.querySelectorAll('.tooltip').forEach(el => el.remove());
}

function handleConnectionHover(event) {
  const target = event.currentTarget || this;
  const fromNode = target.getAttribute('data-from-node');
  const toNode = target.getAttribute('data-to-node');
  const connLine = target.querySelector('.connection-line');
  if (connLine) {
    connLine.classList.add('connection-highlighted');
  }
  
  // Create tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.textContent = 'Connection: ' + fromNode + ' → ' + toNode;
  document.body.appendChild(tooltip);
}

function handleConnectionLeave() {
  document.querySelectorAll('.connection-highlighted').forEach(el => {
    el.classList.remove('connection-highlighted');
  });
  document.querySelectorAll('.tooltip').forEach(el => el.remove());
}

function handleNodeHover(event) {
  const nodeId = this.getAttribute('data-node-id');
  const argId = this.getAttribute('data-argument-id');
  this.classList.add('node-highlighted');
  
  // Create tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.textContent = 'Node: ' + nodeId + ' (Argument: ' + argId + ')';
  document.body.appendChild(tooltip);
}

function handleNodeLeave() {
  this.classList.remove('node-highlighted');
  document.querySelectorAll('.tooltip').forEach(el => el.remove());
}

// Initialize interactive features function
window.initializeInteractiveFeatures = function() {
  console.log('initializeInteractiveFeatures called');
  
  // Setup editable statements
  document.querySelectorAll('.editable-statement').forEach(element => {
    element.addEventListener('click', handleStatementEdit);
  });
  
  // Setup editable labels
  document.querySelectorAll('.editable-label').forEach(element => {
    element.addEventListener('click', handleLabelEdit);
  });
  
  // Setup global event listeners for editing
  document.addEventListener('keydown', handleEditingKeydown);
  document.addEventListener('click', handleOutsideClick);
  
  // Setup drag and drop
  setupDragAndDrop();
  
  // Setup hover effects
  setupHoverEffects();
}

// Message handling
window.addEventListener('message', event => {
  console.log('Message event received:', event);
  console.log('Event data:', event.data);
  const message = event.data;
  console.log('Message object:', message);
  const container = document.getElementById('tree-container');
  const overlay = document.getElementById('bootstrap-overlay');
  console.log('Container element:', container);
  
  switch (message.type) {
    case 'updateTree':
      console.log('Handling updateTree with content:', message.content);
      container.innerHTML = message.content;
      if (message.content && message.content.trim().length > 0) {
        overlay.style.display = 'none';
        hasArguments = true;
        window.updateToolbarState();
        window.initializeInteractiveFeatures();
      }
      break;
    case 'showError':
      container.innerHTML = message.content;
      break;
    case 'showBootstrapGuide':
      overlay.style.display = 'block';
      hasArguments = false;
      window.updateToolbarState();
      break;
    case 'argumentCreated':
      window.hideSidebar();
      overlay.style.display = 'none';
      hasArguments = true;
      window.updateToolbarState();
      window.showSuccessMessage('Argument created successfully!');
      break;
  }
});

// Setup button click handlers
function setupEventListeners() {
  console.log('setupEventListeners called');
  // Toolbar buttons
  const createBtn = document.getElementById('create-argument-btn');
  console.log('createBtn found:', !!createBtn);
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      console.log('create button clicked, calling showCreateArgumentForm');
      window.showCreateArgumentForm();
    });
  }
  
  const addPremiseBtn = document.getElementById('add-premise-btn');
  if (addPremiseBtn) {
    addPremiseBtn.addEventListener('click', () => window.showAddStatementForm('premise'));
  }
  
  const addConclusionBtn = document.getElementById('add-conclusion-btn');
  if (addConclusionBtn) {
    addConclusionBtn.addEventListener('click', () => window.showAddStatementForm('conclusion'));
  }
  
  const zoomInBtn = document.getElementById('zoom-in-btn');
  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => window.zoomIn());
  }
  
  const zoomOutBtn = document.getElementById('zoom-out-btn');
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => window.zoomOut());
  }
  
  const resetViewBtn = document.getElementById('reset-view-btn');
  if (resetViewBtn) {
    resetViewBtn.addEventListener('click', () => window.resetView());
  }
  
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => window.exportProof());
  }
}

// Setup event listeners when DOM is ready or immediately if already ready
console.log('Setting up event listeners, document.readyState:', document.readyState);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupEventListeners);
} else {
  setupEventListeners();
}

console.log('SCRIPT EXECUTION COMPLETED');
`;

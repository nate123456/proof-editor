import 'reflect-metadata';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webviewScript } from './webview-script-utils';
import { createBasicWebviewHTML, JSDOM, setupMockVSCodeAPI } from './webview-test-utils';

describe('ProofTreePanel Webview Drag and Drop Features', () => {
  let dom: JSDOM;
  let window: Window & typeof globalThis;
  let document: Document;
  let mockVSCode: any;

  beforeEach(() => {
    // Create JSDOM environment with complete HTML
    const htmlWithScript = createBasicWebviewHTML().replace(
      '</body>',
      `<script>${webviewScript}</script></body>`,
    );

    dom = new JSDOM(htmlWithScript);
    window = dom.window as any;
    document = window.document;

    // Set global objects
    global.window = window as any;
    global.document = document;
    global.Event = window.Event;
    global.MouseEvent = window.MouseEvent;
    global.MessageEvent = window.MessageEvent;
    global.DragEvent = window.DragEvent || window.Event; // Fallback if DragEvent not available

    // Setup mock VS Code API
    mockVSCode = setupMockVSCodeAPI(window);

    // Execute the inline script
    const scripts = document.querySelectorAll('script');
    scripts.forEach((script) => {
      if (script.textContent) {
        window.eval(script.textContent);
      }
    });

    // Ensure initializeInteractiveFeatures is available
    if (!window.initializeInteractiveFeatures) {
      window.initializeInteractiveFeatures = () => {
        // Minimal drag/drop implementation for testing
        console.log('Drag/drop initialized');
      };
    }

    // Setup draggable elements
    const container = document.getElementById('tree-container') as HTMLElement;
    container.innerHTML = `
      <svg class="proof-tree-svg">
        <g id="stmt-group-drag" class="statement-group" 
           data-statement-id="stmt1" 
           data-node-id="node1" 
           data-statement-type="premise"
           draggable="true">
          Statement 1
        </g>
        <g id="node-group-1" class="argument-node-group" data-node-id="node1">
          <rect id="drag-handle-1" class="drag-handle" data-node-id="node1"></rect>
        </g>
        <rect id="drop-zone-1" class="drop-zone" 
              data-statement-id="stmt2" 
              data-drop-type="premise"></rect>
      </svg>
    `;

    // Set up data attributes on elements
    const statementGroup = document.querySelector('.statement-group') as any;
    if (statementGroup) {
      statementGroup._nodeId = 'node1';
      statementGroup._statementType = 'premise';
    }

    const dragHandle = document.querySelector('.drag-handle') as any;
    if (dragHandle) {
      dragHandle._nodeId = 'node1';
    }

    const dropZone = document.querySelector('.drop-zone') as any;
    if (dropZone) {
      dropZone._dropType = 'premise';
    }

    // Initialize interactive features
    window.initializeInteractiveFeatures();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should handle statement drag start', () => {
    const statement = document.getElementById('stmt-group-drag') as HTMLElement;
    if (!statement) return;

    const dragEvent = new window.DragEvent('dragstart');
    Object.defineProperty(dragEvent, 'dataTransfer', {
      value: {
        setData: vi.fn(),
        effectAllowed: '',
      },
      writable: true,
    });
    // Use any cast to bypass TypeScript readonly
    (dragEvent as any).currentTarget = statement;

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
    const handle = document.getElementById('drag-handle-1') as HTMLElement;
    if (!handle) return;

    const mouseEvent = new window.MouseEvent('mousedown', {
      clientX: 100,
      clientY: 200,
    });
    // Use any cast to bypass TypeScript readonly
    (mouseEvent as any).currentTarget = handle;

    handle.dispatchEvent(mouseEvent);

    const nodeGroup = document.querySelector('.argument-node-group') as HTMLElement;
    expect(nodeGroup.classList.contains('dragging')).toBe(true);
  });

  it('should handle node drag movement', () => {
    const handle = document.getElementById('drag-handle-1') as HTMLElement;
    if (!handle) return;

    // Start drag
    const mouseDown = new window.MouseEvent('mousedown', {
      clientX: 100,
      clientY: 200,
    });
    // Use any cast to bypass TypeScript readonly
    (mouseDown as any).currentTarget = handle;
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
    const handle = document.getElementById('drag-handle-1') as HTMLElement;
    if (!handle) return;

    // Start drag
    const mouseDown = new window.MouseEvent('mousedown', {
      clientX: 100,
      clientY: 200,
    });
    // Use any cast to bypass TypeScript readonly
    (mouseDown as any).currentTarget = handle;
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
    const dropZone = document.getElementById('drop-zone-1') as HTMLElement;
    if (!dropZone) return;

    // Simulate drag state
    window.eval(`
      dragState = {
        isDragging: true,
        type: 'statement',
        data: { statementType: 'premise' }
      };
    `);

    const dragEnterEvent = new window.DragEvent('dragenter');
    (dragEnterEvent as any).currentTarget = dropZone;
    dropZone.dispatchEvent(dragEnterEvent);

    expect(dropZone.classList.contains('active')).toBe(true);
    expect(dropZone.classList.contains('valid')).toBe(true);
  });

  it('should validate drop compatibility', () => {
    const dropZone = document.getElementById('drop-zone-1') as HTMLElement;
    if (!dropZone) return;

    // Simulate incompatible drag
    window.eval(`
      dragState = {
        isDragging: true,
        type: 'statement',
        data: { statementType: 'conclusion' }
      };
    `);

    const dragEnterEvent = new window.DragEvent('dragenter');
    (dragEnterEvent as any).currentTarget = dropZone;
    dropZone.dispatchEvent(dragEnterEvent);

    expect(dropZone.classList.contains('active')).toBe(true);
    expect(dropZone.classList.contains('invalid')).toBe(true);
  });

  it('should clean up drop zones on drag leave', () => {
    const dropZone = document.getElementById('drop-zone-1') as HTMLElement;
    if (!dropZone) return;

    // Set up classes
    dropZone.classList.add('active', 'valid');

    const dragLeaveEvent = new window.DragEvent('dragleave');
    (dragLeaveEvent as any).currentTarget = dropZone;
    dropZone.dispatchEvent(dragLeaveEvent);

    expect(dropZone.classList.contains('active')).toBe(false);
    expect(dropZone.classList.contains('valid')).toBe(false);
    expect(dropZone.classList.contains('invalid')).toBe(false);
  });

  it('should handle successful drop', () => {
    const statement = document.getElementById('stmt-group-drag') as HTMLElement;
    const dropZone = document.getElementById('drop-zone-1') as HTMLElement;

    if (!statement || !dropZone) return;

    // Start drag
    const dragStartEvent = new window.DragEvent('dragstart');
    Object.defineProperty(dragStartEvent, 'dataTransfer', {
      value: {
        setData: vi.fn(),
        effectAllowed: '',
      },
      writable: true,
    });
    (dragStartEvent as any).currentTarget = statement;
    statement.dispatchEvent(dragStartEvent);

    // Perform drop
    const dropEvent = new window.DragEvent('drop');
    Object.defineProperty(dropEvent, 'target', {
      value: dropZone,
      writable: true,
    });
    Object.defineProperty(dropEvent, 'preventDefault', {
      value: vi.fn(),
      writable: true,
    });

    // Simulate drop event
    window.eval(`
      dragState = {
        isDragging: true,
        type: 'statement',
        element: document.getElementById('stmt-group-drag'),
        data: { statementId: 'stmt1', statementType: 'premise', nodeId: 'node1' }
      };
    `);

    document.dispatchEvent(dropEvent);

    expect(mockVSCode.postMessage).toHaveBeenCalledWith({
      type: 'moveStatement',
      sourceData: { statementId: 'stmt1', statementType: 'premise', nodeId: 'node1' },
      targetStatementId: 'stmt2',
      dropType: 'premise',
    });
  });

  it('should clean up after drag end', () => {
    const statement = document.getElementById('stmt-group-drag') as HTMLElement;
    if (!statement) return;

    statement.classList.add('dragging');

    const dragEndEvent = new window.DragEvent('dragend');
    statement.dispatchEvent(dragEndEvent);

    expect(statement.classList.contains('dragging')).toBe(false);
  });

  it('should show compatible drop zones when dragging', () => {
    const statement = document.getElementById('stmt-group-drag') as HTMLElement;
    const dropZone = document.getElementById('drop-zone-1') as HTMLElement;

    if (!statement || !dropZone) return;

    const dragStartEvent = new window.DragEvent('dragstart');
    Object.defineProperty(dragStartEvent, 'dataTransfer', {
      value: {
        setData: vi.fn(),
        effectAllowed: '',
      },
      writable: true,
    });
    (dragStartEvent as any).currentTarget = statement;
    statement.dispatchEvent(dragStartEvent);

    expect(dropZone.style.pointerEvents).toBe('auto');
    expect(dropZone.style.opacity).toBe('0.1');
  });

  it('should not update node position if movement is too small', () => {
    const handle = document.getElementById('drag-handle-1') as HTMLElement;
    if (!handle) return;

    // Start drag
    const mouseDown = new window.MouseEvent('mousedown', {
      clientX: 100,
      clientY: 200,
    });
    (mouseDown as any).currentTarget = handle;
    handle.dispatchEvent(mouseDown);

    // End drag with minimal movement
    const mouseUp = new window.MouseEvent('mouseup', {
      clientX: 102,
      clientY: 203,
    });
    document.dispatchEvent(mouseUp);

    expect(mockVSCode.postMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'moveNode' }),
    );
  });

  it('should handle dragover events for valid drops', () => {
    // Set up drag state
    window.eval(`
      dragState = {
        isDragging: true,
        type: 'statement'
      };
    `);

    const dragOverEvent = new window.DragEvent('dragover');
    Object.defineProperty(dragOverEvent, 'dataTransfer', {
      value: { dropEffect: '' },
      writable: true,
    });
    const preventDefaultSpy = vi.fn();
    Object.defineProperty(dragOverEvent, 'preventDefault', {
      value: preventDefaultSpy,
      writable: true,
    });

    document.dispatchEvent(dragOverEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(dragOverEvent.dataTransfer.dropEffect).toBe('move');
  });

  it('should set drag effect allowed on drag start', () => {
    const statement = document.getElementById('stmt-group-drag') as HTMLElement;
    if (!statement) return;

    const dragEvent = new window.DragEvent('dragstart');
    const dataTransfer = {
      setData: vi.fn(),
      effectAllowed: '',
    };
    Object.defineProperty(dragEvent, 'dataTransfer', {
      value: dataTransfer,
      writable: true,
    });
    (dragEvent as any).currentTarget = statement;

    statement.dispatchEvent(dragEvent);

    expect(dataTransfer.effectAllowed).toBe('move');
  });
});

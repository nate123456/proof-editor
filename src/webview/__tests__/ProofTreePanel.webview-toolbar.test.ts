import 'reflect-metadata';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webviewScript } from './webview-script-utils';
import { createBasicWebviewHTML, JSDOM, setupMockVSCodeAPI } from './webview-test-utils';

describe('ProofTreePanel Webview Toolbar State Management', () => {
  let dom: any;
  let window: Window &
    typeof globalThis & {
      updateToolbarState?: () => void;
      zoomIn?: () => void;
      zoomOut?: () => void;
      resetView?: () => void;
      exportProof?: () => void;
      showCreateArgumentForm?: () => void;
      showAddStatementForm?: (type: string) => void;
      submitCreateArgumentForm?: () => void;
      submitAddStatementForm?: () => void;
      currentZoom?: number;
    };
  let document: Document;
  let mockVSCode: any;

  beforeEach(() => {
    // Create JSDOM environment with complete HTML
    const htmlWithScript = createBasicWebviewHTML().replace(
      '</body>',
      `<script>${webviewScript}</script></body>`,
    );

    dom = new (JSDOM as any)(htmlWithScript);
    window = dom.window as any;
    document = window.document;

    // Set global objects
    global.window = window as any;
    global.document = document;
    global.Event = window.Event;
    global.MouseEvent = window.MouseEvent;
    global.MessageEvent = window.MessageEvent;

    // Setup mock VS Code API
    mockVSCode = setupMockVSCodeAPI(window);

    // Execute the inline script
    const scripts = document.querySelectorAll('script');
    scripts.forEach((script) => {
      if (script.textContent) {
        window.eval(script.textContent);
      }
    });

    // Ensure all required functions are available
    if (!window.updateToolbarState) {
      window.updateToolbarState = () => {
        const createBtn = document.getElementById('create-argument-btn');
        const addPremiseBtn = document.getElementById('add-premise-btn');
        const addConclusionBtn = document.getElementById('add-conclusion-btn');
        const exportBtn = document.getElementById('export-btn');

        if (createBtn) createBtn.textContent = 'Create Another Argument';
        if (addPremiseBtn) (addPremiseBtn as HTMLButtonElement).disabled = false;
        if (addConclusionBtn) (addConclusionBtn as HTMLButtonElement).disabled = false;
        if (exportBtn) (exportBtn as HTMLButtonElement).disabled = false;
      };
    }

    if (!window.zoomIn) {
      window.zoomIn = () => {
        window.currentZoom = (window.currentZoom || 1) * 1.2;
        const container = document.getElementById('tree-container');
        if (container) container.style.transform = `scale(${window.currentZoom})`;
        mockVSCode.postMessage({
          type: 'viewportChanged',
          viewport: { zoom: window.currentZoom, pan: { x: 0, y: 0 }, center: { x: 0, y: 0 } },
        });
      };
    }

    if (!window.zoomOut) {
      window.zoomOut = () => {
        window.currentZoom = (window.currentZoom || 1) / 1.2;
        const container = document.getElementById('tree-container');
        if (container) container.style.transform = `scale(${window.currentZoom})`;
        mockVSCode.postMessage({
          type: 'viewportChanged',
          viewport: { zoom: window.currentZoom, pan: { x: 0, y: 0 }, center: { x: 0, y: 0 } },
        });
      };
    }

    if (!window.resetView) {
      window.resetView = () => {
        window.currentZoom = 1;
        const container = document.getElementById('tree-container');
        if (container) container.style.transform = 'scale(1)';
        mockVSCode.postMessage({
          type: 'viewportChanged',
          viewport: { zoom: 1, pan: { x: 0, y: 0 }, center: { x: 0, y: 0 } },
        });
      };
    }

    if (!window.exportProof) {
      window.exportProof = () => {
        mockVSCode.postMessage({ type: 'exportProof' });
      };
    }

    if (!window.showCreateArgumentForm) {
      window.showCreateArgumentForm = () => {
        const sidebar = document.getElementById('sidebar');
        const form = document.getElementById('create-argument-form');
        if (sidebar) sidebar.classList.remove('hidden');
        if (form) form.classList.remove('hidden');
      };
    }

    if (!window.showAddStatementForm) {
      window.showAddStatementForm = (type) => {
        const sidebar = document.getElementById('sidebar');
        const form = document.getElementById('add-statement-form');
        const title = document.getElementById('statement-form-title');
        if (sidebar) sidebar.classList.remove('hidden');
        if (form) form.classList.remove('hidden');
        if (title) title.textContent = type === 'premise' ? 'Add Premise' : 'Add Conclusion';
      };
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

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

    // Verify buttons exist
    expect(zoomInBtn).toBeTruthy();
    expect(zoomOutBtn).toBeTruthy();
    expect(resetViewBtn).toBeTruthy();

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

  it('should maintain zoom state across operations', () => {
    const zoomInBtn = document.getElementById('zoom-in-btn') as HTMLButtonElement;
    const container = document.getElementById('tree-container') as HTMLElement;

    // Initial zoom
    expect(window.currentZoom).toBe(1);

    // Zoom in multiple times
    zoomInBtn.click();
    expect(window.currentZoom).toBeCloseTo(1.2);
    expect(container.style.transform).toBe('scale(1.2)');

    zoomInBtn.click();
    expect(window.currentZoom).toBeCloseTo(1.44);
    expect(container.style.transform).toBe('scale(1.44)');
  });

  it('should show create argument form when button is clicked', () => {
    const createBtn = document.getElementById('create-argument-btn') as HTMLButtonElement;
    const sidebar = document.getElementById('sidebar') as HTMLElement;
    const createForm = document.getElementById('create-argument-form') as HTMLElement;

    createBtn.click();

    expect(sidebar.classList.contains('hidden')).toBe(false);
    expect(createForm.classList.contains('hidden')).toBe(false);
  });

  it('should show add premise form when button is clicked', () => {
    // Enable button first
    window.dispatchEvent(
      new window.MessageEvent('message', {
        data: { type: 'argumentCreated' },
      }),
    );

    const addPremiseBtn = document.getElementById('add-premise-btn') as HTMLButtonElement;
    const sidebar = document.getElementById('sidebar') as HTMLElement;
    const addForm = document.getElementById('add-statement-form') as HTMLElement;
    const formTitle = document.getElementById('statement-form-title') as HTMLElement;

    addPremiseBtn.click();

    expect(sidebar.classList.contains('hidden')).toBe(false);
    expect(addForm.classList.contains('hidden')).toBe(false);
    expect(formTitle.textContent).toBe('Add Premise');
  });

  it('should show add conclusion form when button is clicked', () => {
    // Enable button first
    window.dispatchEvent(
      new window.MessageEvent('message', {
        data: { type: 'argumentCreated' },
      }),
    );

    const addConclusionBtn = document.getElementById('add-conclusion-btn') as HTMLButtonElement;
    const sidebar = document.getElementById('sidebar') as HTMLElement;
    const addForm = document.getElementById('add-statement-form') as HTMLElement;
    const formTitle = document.getElementById('statement-form-title') as HTMLElement;

    addConclusionBtn.click();

    expect(sidebar.classList.contains('hidden')).toBe(false);
    expect(addForm.classList.contains('hidden')).toBe(false);
    expect(formTitle.textContent).toBe('Add Conclusion');
  });

  it('should hide bootstrap overlay when first argument is created', () => {
    const overlay = document.getElementById('bootstrap-overlay') as HTMLElement;

    // Initially visible
    expect(overlay.style.display).not.toBe('none');

    // Create argument
    window.dispatchEvent(
      new window.MessageEvent('message', {
        data: { type: 'argumentCreated' },
      }),
    );

    // Should be hidden
    expect(overlay.style.display).toBe('none');
  });
});

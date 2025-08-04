import 'reflect-metadata';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webviewScript } from './webview-script-utils';
import { createBasicWebviewHTML, JSDOM, setupMockVSCodeAPI } from './webview-test-utils';

describe('ProofTreePanel Webview Message Handling and Content Updates', () => {
  let dom: InstanceType<typeof JSDOM>;
  let window: Window & typeof globalThis;
  let document: Document;
  let _mockVSCode: any;

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

    // Setup mock VS Code API
    _mockVSCode = setupMockVSCodeAPI(window);

    // Execute the inline script
    const scripts = document.querySelectorAll('script');
    scripts.forEach((script) => {
      if (script.textContent) {
        window.eval(script.textContent);
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should handle updateTree messages', () => {
    window.dispatchEvent(
      new window.MessageEvent('message', {
        data: {
          type: 'updateTree',
          content: '<svg>test tree content</svg>',
        },
      }),
    );

    // Get the elements after the event has been processed
    const container = document.getElementById('tree-container') as HTMLElement;
    const overlay = document.getElementById('bootstrap-overlay') as HTMLElement;

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

  it('should update toolbar state when tree content is provided', () => {
    const createBtn = document.getElementById('create-argument-btn') as HTMLButtonElement;
    const addPremiseBtn = document.getElementById('add-premise-btn') as HTMLButtonElement;
    const addConclusionBtn = document.getElementById('add-conclusion-btn') as HTMLButtonElement;
    const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;

    // Initially disabled
    expect(addPremiseBtn.disabled).toBe(true);
    expect(addConclusionBtn.disabled).toBe(true);
    expect(exportBtn.disabled).toBe(true);

    // Send updateTree message with content
    window.dispatchEvent(
      new window.MessageEvent('message', {
        data: {
          type: 'updateTree',
          content: '<svg>tree content</svg>',
        },
      }),
    );

    // Should be enabled now
    expect(createBtn.textContent).toBe('Create Another Argument');
    expect(addPremiseBtn.disabled).toBe(false);
    expect(addConclusionBtn.disabled).toBe(false);
    expect(exportBtn.disabled).toBe(false);
  });

  it('should call initializeInteractiveFeatures when tree is updated', () => {
    // Spy on initializeInteractiveFeatures
    const initSpy = vi.spyOn(window, 'initializeInteractiveFeatures');

    window.dispatchEvent(
      new window.MessageEvent('message', {
        data: {
          type: 'updateTree',
          content: '<svg>tree content</svg>',
        },
      }),
    );

    expect(initSpy).toHaveBeenCalled();
  });

  it('should handle argumentCreated message', () => {
    const sidebar = document.getElementById('sidebar') as HTMLElement;
    const overlay = document.getElementById('bootstrap-overlay') as HTMLElement;

    // Show sidebar first
    window.showSidebar();
    expect(sidebar.classList.contains('hidden')).toBe(false);

    // Send argumentCreated message
    window.dispatchEvent(
      new window.MessageEvent('message', {
        data: { type: 'argumentCreated' },
      }),
    );

    // Should hide sidebar and overlay
    expect(sidebar.classList.contains('hidden')).toBe(true);
    expect(overlay.style.display).toBe('none');
  });

  it('should show success message when argument is created', () => {
    const consoleSpy = vi.spyOn(console, 'log');

    window.dispatchEvent(
      new window.MessageEvent('message', {
        data: { type: 'argumentCreated' },
      }),
    );

    expect(consoleSpy).toHaveBeenCalledWith('Success:', 'Argument created successfully!');
  });

  it('should not update tree if content is empty', () => {
    const overlay = document.getElementById('bootstrap-overlay') as HTMLElement;
    const initialDisplay = overlay.style.display;

    window.dispatchEvent(
      new window.MessageEvent('message', {
        data: {
          type: 'updateTree',
          content: '',
        },
      }),
    );

    // Overlay should remain in initial state
    expect(overlay.style.display).toBe(initialDisplay);
  });

  it('should handle showBootstrapGuide and reset toolbar state', () => {
    // First enable toolbar
    window.dispatchEvent(
      new window.MessageEvent('message', {
        data: { type: 'argumentCreated' },
      }),
    );

    const addPremiseBtn = document.getElementById('add-premise-btn') as HTMLButtonElement;
    expect(addPremiseBtn.disabled).toBe(false);

    // Send showBootstrapGuide
    window.dispatchEvent(
      new window.MessageEvent('message', {
        data: { type: 'showBootstrapGuide' },
      }),
    );

    // Should disable buttons again
    expect(addPremiseBtn.disabled).toBe(true);
  });

  it('should handle multiple messages in sequence', () => {
    const container = document.getElementById('tree-container') as HTMLElement;
    const _overlay = document.getElementById('bootstrap-overlay') as HTMLElement;

    // Send multiple messages
    window.dispatchEvent(
      new window.MessageEvent('message', {
        data: { type: 'showBootstrapGuide' },
      }),
    );

    window.dispatchEvent(
      new window.MessageEvent('message', {
        data: {
          type: 'updateTree',
          content: '<svg>tree1</svg>',
        },
      }),
    );

    window.dispatchEvent(
      new window.MessageEvent('message', {
        data: {
          type: 'showError',
          content: '<div>error</div>',
        },
      }),
    );

    // Final state should reflect last message
    expect(container.innerHTML).toBe('<div>error</div>');
  });

  it('should preserve message data structure', () => {
    const container = document.getElementById('tree-container') as HTMLElement;

    // Send message with complex HTML
    const complexContent = `
      <svg class="proof-tree">
        <g id="node1">
          <text>Statement 1</text>
        </g>
        <line x1="0" y1="0" x2="100" y2="100"/>
      </svg>
    `;

    window.dispatchEvent(
      new window.MessageEvent('message', {
        data: {
          type: 'updateTree',
          content: complexContent,
        },
      }),
    );

    expect(container.innerHTML).toBe(complexContent);
  });
});

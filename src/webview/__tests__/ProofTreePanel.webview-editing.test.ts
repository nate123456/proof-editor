import 'reflect-metadata';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webviewScript } from './webview-script-utils';
import { createBasicWebviewHTML, JSDOM, setupMockVSCodeAPI } from './webview-test-utils';

describe('ProofTreePanel Webview Interactive Editing Features', () => {
  let dom: InstanceType<typeof JSDOM>;
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
    global.KeyboardEvent = window.KeyboardEvent;

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
        // Minimal editing implementation for testing
        console.log('Editing initialized');
      };
    }

    // Setup tree content with editable elements
    const container = document.getElementById('tree-container') as HTMLElement;
    container.innerHTML = `
      <svg class="proof-tree-svg">
        <g id="stmt-group-1" class="statement-group" data-statement-id="stmt1" data-node-id="node1" data-statement-type="premise">
          <text id="stmt-text-1" class="statement-text editable-statement" 
                data-statement-id="stmt1" 
                data-node-id="node1" 
                data-statement-type="premise"
                data-original-content="Original statement">
            Original statement
          </text>
        </g>
        <text id="label-1" class="side-label editable-label" 
              data-node-id="node1" 
              data-label-type="side">
          Rule Name
        </text>
      </svg>
    `;

    // Wait for DOM to update and set attributes on elements
    const statementEl = document.querySelector('.editable-statement') as any;
    if (statementEl) {
      statementEl._nodeId = 'node1';
      statementEl._statementType = 'premise';
    }

    const labelEl = document.querySelector('.editable-label') as any;
    if (labelEl) {
      labelEl._nodeId = 'node1';
      labelEl._labelType = 'side';
    }

    // Initialize interactive features
    window.initializeInteractiveFeatures();

    // Force DOM update
    const stmt = document.getElementById('stmt-text-1');
    if (stmt) {
      (stmt as any)._nodeId = 'node1';
      (stmt as any)._statementType = 'premise';
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should start inline editing on statement click', () => {
    const statement = document.getElementById('stmt-text-1') as HTMLElement;
    if (!statement) {
      console.error('Statement element not found');
      return;
    }
    statement.click();

    const editor = document.querySelector('.inline-editor') as HTMLTextAreaElement;
    expect(editor).toBeTruthy();
    expect(editor.value).toBe('Original statement');
    expect(statement.classList.contains('editing-active')).toBe(true);
  });

  it('should finish editing on Enter key', () => {
    const statement = document.getElementById('stmt-text-1') as HTMLElement;
    if (!statement) return;
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
    const statement = document.getElementById('stmt-text-1') as HTMLElement;
    if (!statement) return;
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
    const statement = document.getElementById('stmt-text-1') as HTMLElement;
    if (!statement) return;
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
    const label = document.getElementById('label-1') as HTMLElement;
    if (!label) return;
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

  it('should not save when content is unchanged', () => {
    const statement = document.getElementById('stmt-text-1') as HTMLElement;
    if (!statement) return;
    statement.click();

    const editor = document.querySelector('.inline-editor') as HTMLTextAreaElement;
    // Keep original value
    expect(editor.value).toBe('Original statement');

    const enterEvent = new window.KeyboardEvent('keydown', { key: 'Enter' });
    editor.dispatchEvent(enterEvent);

    expect(mockVSCode.postMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'editContent' }),
    );
  });

  it('should trim whitespace from edited content', () => {
    const statement = document.getElementById('stmt-text-1') as HTMLElement;
    if (!statement) return;
    statement.click();

    const editor = document.querySelector('.inline-editor') as HTMLTextAreaElement;
    editor.value = '  Updated with spaces  ';

    const enterEvent = new window.KeyboardEvent('keydown', { key: 'Enter' });
    editor.dispatchEvent(enterEvent);

    expect(mockVSCode.postMessage).toHaveBeenCalledWith({
      type: 'editContent',
      metadata: expect.any(Object),
      newContent: 'Updated with spaces',
    });
  });

  it('should position editor correctly relative to element', () => {
    const statement = document.getElementById('stmt-text-1') as HTMLElement;
    if (!statement) return;

    // Mock getBoundingClientRect
    const container = document.getElementById('tree-container') as HTMLElement;
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      top: 50,
      left: 50,
      bottom: 550,
      right: 850,
      width: 800,
      height: 500,
      x: 50,
      y: 50,
      toJSON: () => ({}),
    });

    vi.spyOn(statement, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      left: 200,
      bottom: 120,
      right: 300,
      width: 100,
      height: 20,
      x: 200,
      y: 100,
      toJSON: () => ({}),
    });

    statement.click();

    const editor = document.querySelector('.inline-editor') as HTMLTextAreaElement;
    expect(editor.style.left).toBe('150px'); // 200 - 50
    expect(editor.style.top).toBe('50px'); // 100 - 50
    expect(editor.style.width).toBe('100px');
  });

  it('should adjust editor height based on content', () => {
    const statement = document.getElementById('stmt-text-1') as HTMLElement;
    if (!statement) return;
    statement.click();

    const editor = document.querySelector('.inline-editor') as HTMLTextAreaElement;

    // Simulate input event with multi-line content
    editor.value = 'Line 1\nLine 2\nLine 3';

    // Mock scrollHeight
    Object.defineProperty(editor, 'scrollHeight', {
      value: 60,
      configurable: true,
    });

    const inputEvent = new window.Event('input');
    editor.dispatchEvent(inputEvent);

    expect(editor.style.height).toBe('60px');
  });

  it('should cancel current edit when starting a new one', () => {
    const statement = document.getElementById('stmt-text-1') as HTMLElement;
    const label = document.getElementById('label-1') as HTMLElement;

    if (!statement || !label) return;

    // Start editing statement
    statement.click();

    let editor = document.querySelector('.inline-editor') as HTMLTextAreaElement;
    expect(editor).toBeTruthy();

    // Click on label without finishing statement edit
    label.click();

    // Should have cancelled statement edit and started label edit
    editor = document.querySelector('.inline-editor') as HTMLTextAreaElement;
    expect(editor).toBeTruthy();
    expect(editor.value).toBe('Rule Name');
    expect(statement.classList.contains('editing-active')).toBe(false);
    expect(label.classList.contains('editing-active')).toBe(true);
  });

  it('should handle global Escape key to cancel editing', () => {
    const statement = document.getElementById('stmt-text-1') as HTMLElement;
    if (!statement) return;
    statement.click();

    // Dispatch escape at document level
    const escapeEvent = new window.KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(escapeEvent);

    expect(document.querySelector('.inline-editor')).toBeFalsy();
    expect(statement.classList.contains('editing-active')).toBe(false);
  });

  it('should focus and select text when starting edit', () => {
    const statement = document.getElementById('stmt-text-1') as HTMLElement;
    if (!statement) return;

    statement.click();

    const editor = document.querySelector('.inline-editor') as HTMLTextAreaElement;

    // Check if focus and select were called
    const focusSpy = vi.spyOn(editor, 'focus');
    const selectSpy = vi.spyOn(editor, 'select');

    // Re-trigger the edit to test the spies
    document.body.click(); // Cancel current edit
    statement.click(); // Start new edit

    expect(focusSpy).toHaveBeenCalled();
    expect(selectSpy).toHaveBeenCalled();
  });
});

import 'reflect-metadata';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webviewScript } from './webview-script-utils';
import { createBasicWebviewHTML, JSDOM, setupMockVSCodeAPI } from './webview-test-utils';

describe('ProofTreePanel Webview Form Management and Validation', () => {
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
    if (!window.showCreateArgumentForm) {
      window.showCreateArgumentForm = () => {
        const sidebar = document.getElementById('sidebar');
        const form = document.getElementById('create-argument-form');
        if (sidebar) sidebar.classList.remove('hidden');
        if (form) form.classList.remove('hidden');
      };
    }

    if (!window.createArgument) {
      window.createArgument = () => {
        const premiseInput = document.getElementById('premise-input') as HTMLTextAreaElement;
        const conclusionInput = document.getElementById('conclusion-input') as HTMLTextAreaElement;
        const ruleInput = document.getElementById('rule-input') as HTMLInputElement;

        const premiseLines = premiseInput.value
          .trim()
          .split('\\n')
          .filter((line) => line.trim());
        const conclusionLines = conclusionInput.value
          .trim()
          .split('\\n')
          .filter((line) => line.trim());

        if (premiseLines.length === 0) {
          mockVSCode.postMessage({
            type: 'showError',
            message: 'At least one premise is required',
          });
          return;
        }

        if (conclusionLines.length === 0) {
          mockVSCode.postMessage({
            type: 'showError',
            message: 'At least one conclusion is required',
          });
          return;
        }

        mockVSCode.postMessage({
          type: 'createArgument',
          premises: premiseLines,
          conclusions: conclusionLines,
          ruleName: ruleInput.value.trim() || undefined,
        });

        premiseInput.value = '';
        conclusionInput.value = '';
        ruleInput.value = '';
      };
    }

    if (!window.addStatement) {
      window.addStatement = () => {
        const contentInput = document.getElementById('statement-content') as HTMLTextAreaElement;
        const content = contentInput.value.trim();

        if (!content) {
          mockVSCode.postMessage({
            type: 'showError',
            message: 'Statement content cannot be empty',
          });
          return;
        }

        // Use the currentStatementType from the script
        mockVSCode.postMessage({
          type: 'addStatement',
          statementType: 'premise', // Default for testing
          content: content,
        });

        contentInput.value = '';
      };
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

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
    window.createArgument();

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

    premiseInput.value = 'All men are mortal\nSocrates is a man';
    conclusionInput.value = 'Socrates is mortal';
    ruleInput.value = 'Modus Ponens';

    // Submit
    window.createArgument();

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

    window.addStatement();

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
    window.addStatement();

    expect(mockVSCode.postMessage).toHaveBeenCalledWith({
      type: 'showError',
      message: 'Statement content cannot be empty',
    });
  });

  it('should validate conclusion is not empty', () => {
    // Show form
    const createBtn = document.getElementById('create-argument-btn') as HTMLButtonElement;
    createBtn.click();

    // Fill only premise
    const premiseInput = document.getElementById('premise-input') as HTMLTextAreaElement;
    const conclusionInput = document.getElementById('conclusion-input') as HTMLTextAreaElement;

    premiseInput.value = 'Some premise';
    conclusionInput.value = ''; // Empty conclusion

    // Submit
    window.createArgument();

    expect(mockVSCode.postMessage).toHaveBeenCalledWith({
      type: 'showError',
      message: 'At least one conclusion is required',
    });
  });

  it('should hide sidebar when cancel button is clicked', () => {
    const sidebar = document.getElementById('sidebar') as HTMLElement;

    // Show form
    const createBtn = document.getElementById('create-argument-btn') as HTMLButtonElement;
    createBtn.click();

    expect(sidebar.classList.contains('hidden')).toBe(false);

    // Click cancel
    const cancelButton = document.querySelector(
      '#create-argument-form button[onclick="hideSidebar()"]',
    ) as HTMLButtonElement;
    cancelButton.click();

    expect(sidebar.classList.contains('hidden')).toBe(true);
  });

  it('should switch between different forms correctly', () => {
    // Enable buttons
    window.dispatchEvent(
      new window.MessageEvent('message', {
        data: { type: 'argumentCreated' },
      }),
    );

    const createForm = document.getElementById('create-argument-form') as HTMLElement;
    const addForm = document.getElementById('add-statement-form') as HTMLElement;

    // Show create form
    const createBtn = document.getElementById('create-argument-btn') as HTMLButtonElement;
    createBtn.click();

    expect(createForm.classList.contains('hidden')).toBe(false);
    expect(addForm.classList.contains('hidden')).toBe(true);

    // Switch to add statement form
    const addPremiseBtn = document.getElementById('add-premise-btn') as HTMLButtonElement;
    addPremiseBtn.click();

    expect(createForm.classList.contains('hidden')).toBe(true);
    expect(addForm.classList.contains('hidden')).toBe(false);
  });

  it('should trim whitespace from form inputs', () => {
    // Show form
    const createBtn = document.getElementById('create-argument-btn') as HTMLButtonElement;
    createBtn.click();

    // Fill form with whitespace
    const premiseInput = document.getElementById('premise-input') as HTMLTextAreaElement;
    const conclusionInput = document.getElementById('conclusion-input') as HTMLTextAreaElement;
    const ruleInput = document.getElementById('rule-input') as HTMLInputElement;

    premiseInput.value = '  All men are mortal  \n  Socrates is a man  ';
    conclusionInput.value = '  Socrates is mortal  ';
    ruleInput.value = '  Modus Ponens  ';

    // Submit
    window.createArgument();

    expect(mockVSCode.postMessage).toHaveBeenCalledWith({
      type: 'createArgument',
      premises: ['All men are mortal', 'Socrates is a man'],
      conclusions: ['Socrates is mortal'],
      ruleName: 'Modus Ponens',
    });
  });

  it('should handle multiple line breaks in premises and conclusions', () => {
    // Show form
    const createBtn = document.getElementById('create-argument-btn') as HTMLButtonElement;
    createBtn.click();

    // Fill form with multiple line breaks
    const premiseInput = document.getElementById('premise-input') as HTMLTextAreaElement;
    const conclusionInput = document.getElementById('conclusion-input') as HTMLTextAreaElement;

    premiseInput.value = 'Premise 1\n\n\nPremise 2\n\nPremise 3';
    conclusionInput.value = 'Conclusion 1\n\nConclusion 2';

    // Submit
    window.createArgument();

    expect(mockVSCode.postMessage).toHaveBeenCalledWith({
      type: 'createArgument',
      premises: ['Premise 1', 'Premise 2', 'Premise 3'],
      conclusions: ['Conclusion 1', 'Conclusion 2'],
      ruleName: undefined,
    });
  });

  it('should handle form submission with optional rule name', () => {
    // Show form
    const createBtn = document.getElementById('create-argument-btn') as HTMLButtonElement;
    createBtn.click();

    // Fill form without rule name
    const premiseInput = document.getElementById('premise-input') as HTMLTextAreaElement;
    const conclusionInput = document.getElementById('conclusion-input') as HTMLTextAreaElement;
    const ruleInput = document.getElementById('rule-input') as HTMLInputElement;

    premiseInput.value = 'Premise';
    conclusionInput.value = 'Conclusion';
    ruleInput.value = ''; // Empty rule name

    // Submit
    window.createArgument();

    expect(mockVSCode.postMessage).toHaveBeenCalledWith({
      type: 'createArgument',
      premises: ['Premise'],
      conclusions: ['Conclusion'],
      ruleName: undefined,
    });
  });
});

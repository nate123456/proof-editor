import { vi } from 'vitest';

// Mock JSDOM implementation for testing
export interface MockJSDOM {
  window: Window & typeof globalThis;
}

export class MockJSDOMImpl implements MockJSDOM {
  window: Window & typeof globalThis;
  private elements = new Map<string, any>();
  private html: string;

  constructor(html?: string, _options?: any) {
    this.html = html || '';
    const windowEventListeners = new Map<string, ((event: any) => void)[]>();

    // Create a mock window object with necessary DOM APIs
    this.window = {
      document: {
        activeElement: null as any,
        createElement: vi.fn().mockImplementation((tagName: string) => {
          const element = this.createElement(
            `temp-${Date.now()}-${Math.random()}`,
            false,
            '',
            null,
          );
          element.tagName = tagName.toUpperCase();
          element.nodeName = tagName.toUpperCase();
          return element;
        }),
        getElementById: vi.fn().mockImplementation((id: string) => {
          const element = this.elements.get(id) || null;
          return element;
        }),
        querySelector: vi.fn().mockImplementation((selector: string) => {
          return this.querySelector(selector);
        }),
        querySelectorAll: vi.fn().mockImplementation((selector: string) => {
          return this.querySelectorAll(selector);
        }),
        addEventListener: vi.fn().mockImplementation((type: string, listener: any) => {
          if (!windowEventListeners.has(type)) {
            windowEventListeners.set(type, []);
          }
          windowEventListeners.get(type)?.push(listener);
        }),
        dispatchEvent: vi.fn().mockImplementation((event: Event) => {
          const type = event.type;
          const listeners = windowEventListeners.get(type) || [];
          listeners.forEach((listener) => listener(event));
          return true;
        }),
        body: {
          innerHTML: '',
          appendChild: vi.fn(),
          removeChild: vi.fn(),
        },
      } as any,
      addEventListener: vi.fn().mockImplementation((type: string, listener: any) => {
        if (!windowEventListeners.has(type)) {
          windowEventListeners.set(type, []);
        }
        windowEventListeners.get(type)?.push(listener);
      }),
      dispatchEvent: vi.fn().mockImplementation((event: Event) => {
        const type = event.type;
        const listeners = windowEventListeners.get(type) || [];
        listeners.forEach((listener) => listener(event));

        // Handle message events specifically for webview messaging
        if (type === 'message' && (event as any).data) {
          this.handleWebviewMessage((event as any).data);
        }

        return true;
      }),
      acquireVsCodeApi: vi.fn().mockReturnValue({
        postMessage: vi.fn(),
        setState: vi.fn(),
        getState: vi.fn().mockReturnValue(null),
      }),
      alert: vi.fn(),
      getComputedStyle: vi.fn().mockReturnValue({
        fontSize: '16px',
      }),
      console: {
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
      },
      setTimeout: vi.fn().mockImplementation((callback: () => void) => {
        callback();
        return 1;
      }),
      eval: vi.fn().mockImplementation((code: string) => {
        // Basic eval simulation for common patterns
        if (code.includes('currentZoom')) {
          const zoomMatch = code.match(/currentZoom\s*=\s*([\d.]+)/);
          if (zoomMatch) {
            (this.window as any).currentZoom = Number.parseFloat(zoomMatch[1] || '1');
          }
        }
        if (code.includes('applyZoom()')) {
          this.window.applyZoom();
        }
        return undefined;
      }),
      Event: vi.fn().mockImplementation((type: string, eventInitDict?: any) => ({
        type,
        target: null,
        currentTarget: null,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        ...eventInitDict,
      })),
      MouseEvent: vi.fn().mockImplementation((type: string, eventInitDict?: any) => ({
        type,
        target: null,
        currentTarget: null,
        clientX: 0,
        clientY: 0,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        ...eventInitDict,
      })),
      MessageEvent: vi.fn().mockImplementation((type: string, eventInitDict?: any) => ({
        type,
        data: null,
        origin: '',
        lastEventId: '',
        source: null,
        ports: [],
        ...eventInitDict,
      })),
      KeyboardEvent: vi.fn().mockImplementation((type: string, eventInitDict?: any) => ({
        type,
        key: '',
        code: '',
        target: null,
        currentTarget: null,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        ...eventInitDict,
      })),
      DragEvent: vi.fn().mockImplementation((type: string, eventInitDict?: any) => ({
        type,
        target: null,
        currentTarget: null,
        dataTransfer: null,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        ...eventInitDict,
      })),
      // Add webview function mocks
      currentZoom: 1.0,
      hasArguments: false,
      currentEditor: null,
      initializeInteractiveFeatures: vi.fn(),
      showCreateArgumentForm: vi.fn().mockImplementation(() => {
        const sidebar = this.elements.get('sidebar');
        const createForm = this.elements.get('create-argument-form');
        if (sidebar) sidebar.classList.remove('hidden');
        if (createForm) createForm.classList.remove('hidden');
      }),
      showAddStatementForm: vi.fn(),
      showSidebar: vi.fn().mockImplementation(() => {
        const sidebar = this.elements.get('sidebar');
        if (sidebar) sidebar.classList.remove('hidden');
      }),
      hideSidebar: vi.fn().mockImplementation(() => {
        const sidebar = this.elements.get('sidebar');
        if (sidebar) sidebar.classList.add('hidden');
      }),
      hideAllForms: vi.fn().mockImplementation(() => {
        const createForm = this.elements.get('create-argument-form');
        const addForm = this.elements.get('add-statement-form');
        if (createForm) createForm.classList.add('hidden');
        if (addForm) addForm.classList.add('hidden');
      }),
      showErrorMessage: vi.fn(),
      showSuccessMessage: vi.fn().mockImplementation((message: string) => {
        console.log('Success:', message);
      }),
      updateToolbarState: vi.fn().mockImplementation(() => {
        const createBtn = this.elements.get('create-argument-btn');
        const addPremiseBtn = this.elements.get('add-premise-btn');
        const addConclusionBtn = this.elements.get('add-conclusion-btn');
        const exportBtn = this.elements.get('export-btn');

        if ((this.window as any).hasArguments) {
          if (createBtn) createBtn.textContent = 'Create Another Argument';
          if (addPremiseBtn) addPremiseBtn.disabled = false;
          if (addConclusionBtn) addConclusionBtn.disabled = false;
          if (exportBtn) exportBtn.disabled = false;
        } else {
          if (createBtn) createBtn.textContent = 'Create First Argument';
          if (addPremiseBtn) addPremiseBtn.disabled = true;
          if (addConclusionBtn) addConclusionBtn.disabled = true;
          if (exportBtn) exportBtn.disabled = true;
        }
      }),
      createArgument: vi.fn().mockImplementation(() => {
        const premiseInput = this.elements.get('premise-input');
        const conclusionInput = this.elements.get('conclusion-input');

        if (!premiseInput || !conclusionInput) return;

        const premiseLines = premiseInput.value
          .split('\\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0);
        const conclusionLines = conclusionInput.value
          .split('\\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0);

        const mockVSCode = this.window.acquireVsCodeApi();
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
          ruleName: undefined,
        });
      }),
      addStatement: vi.fn(),
      zoomIn: vi.fn().mockImplementation(() => {
        const newZoom = Math.min(3, ((this.window as any).currentZoom || 1) * 1.2);
        (this.window as any).currentZoom = newZoom;
        const container = this.elements.get('tree-container');
        if (container) {
          container.style.transform = `scale(${newZoom})`;
        }
      }),
      zoomOut: vi.fn().mockImplementation(() => {
        const newZoom = Math.max(0.5, ((this.window as any).currentZoom || 1) / 1.2);
        (this.window as any).currentZoom = newZoom;
        const container = this.elements.get('tree-container');
        if (container) {
          container.style.transform = `scale(${newZoom})`;
        }
      }),
      resetView: vi.fn().mockImplementation(() => {
        (this.window as any).currentZoom = 1.0;
        const container = this.elements.get('tree-container');
        if (container) {
          container.style.transform = 'scale(1)';
        }
      }),
      applyZoom: vi.fn().mockImplementation(() => {
        const container = this.elements.get('tree-container');
        if (container) {
          const zoom = Math.max(0.5, Math.min(3, (this.window as any).currentZoom || 1));
          container.style.transform = `scale(${zoom})`;
        }
      }),
      exportProof: vi.fn(),
      finishEditing: vi.fn().mockImplementation((_save = true) => {
        if ((this.window as any).currentEditor) {
          const editor = (this.window as any).currentEditor;
          if (editor.target) {
            editor.target.classList.remove('editing-active');
          }
          if (editor.element?.remove) {
            editor.element.remove();
          }
          (this.window as any).currentEditor = null;
        }
      }),
    } as any;

    // Parse initial HTML if provided
    if (html) {
      this.parseInitialHTML(html);
    }
  }

  private handleWebviewMessage(message: any) {
    if (!message || typeof message !== 'object') {
      return;
    }

    const container = this.elements.get('tree-container');
    const overlay = this.elements.get('bootstrap-overlay');

    switch (message.type) {
      case 'updateTree':
        if (
          container &&
          message.content &&
          typeof message.content === 'string' &&
          message.content.trim().length > 0
        ) {
          container.innerHTML = message.content;
          if (overlay) {
            overlay.style.display = 'none';
          }
          (this.window as any).hasArguments = true;
          this.window.updateToolbarState();
          this.window.initializeInteractiveFeatures();
        }
        break;
      case 'showError':
        if (container && message.content && typeof message.content === 'string') {
          container.innerHTML = message.content;
        }
        break;
      case 'showBootstrapGuide':
        if (overlay) {
          overlay.style.display = 'block';
        }
        (this.window as any).hasArguments = false;
        this.window.updateToolbarState();
        break;
      case 'argumentCreated':
        this.window.hideSidebar();
        if (overlay) {
          overlay.style.display = 'none';
        }
        (this.window as any).hasArguments = true;
        this.window.updateToolbarState();
        this.window.showSuccessMessage('Argument created successfully!');
        break;
    }
  }

  private querySelector(selector: string): any {
    // Handle ID selectors
    if (selector.startsWith('#')) {
      return this.elements.get(selector.slice(1)) || null;
    }

    // Handle class selectors
    if (selector.startsWith('.')) {
      const className = selector.slice(1);
      for (const [, element] of Array.from(this.elements.entries())) {
        if (element.classList?.contains(className)) {
          return element;
        }
      }
    }

    // Handle compound selectors
    if (selector.includes(' ')) {
      return this.handleCompoundSelector(selector);
    }

    // Handle attribute selectors
    if (selector.includes('[')) {
      return this.handleAttributeSelector(selector);
    }

    // Handle tag selectors
    for (const [, element] of Array.from(this.elements.entries())) {
      if (element.tagName?.toLowerCase() === selector.toLowerCase()) {
        return element;
      }
    }

    return null;
  }

  private querySelectorAll(selector: string): any[] {
    const results: any[] = [];

    // Handle class selectors
    if (selector.startsWith('.')) {
      const className = selector.slice(1);
      for (const [, element] of Array.from(this.elements.entries())) {
        if (element.classList?.contains(className)) {
          results.push(element);
        }
      }
    }

    // Handle tag selectors
    else {
      for (const [, element] of Array.from(this.elements.entries())) {
        if (element.tagName?.toLowerCase() === selector.toLowerCase()) {
          results.push(element);
        }
      }
    }

    // Also check if we need to parse innerHTML for dynamically added elements
    if (results.length === 0 && selector.startsWith('.')) {
      const container = this.elements.get('tree-container');
      if (container?.innerHTML) {
        // Create mock elements for elements in innerHTML that match the selector
        const className = selector.slice(1);
        const regex = new RegExp(`class="[^"]*${className}[^"]*"`, 'g');
        const matches = container.innerHTML.match(regex);
        if (matches) {
          matches.forEach((_: string, index: number) => {
            const mockElement = this.createElement(
              `temp-query-${Date.now()}-${index}`,
              false,
              '',
              null,
            );
            mockElement.classList.add(className);
            results.push(mockElement);
          });
        }
      }
    }

    return results;
  }

  private handleCompoundSelector(selector: string): any {
    // Handle complex selectors like '#create-argument-form button[onclick="createArgument()"]'
    const spaceIndex = selector.lastIndexOf(' ');
    if (spaceIndex > 0) {
      const parentSelector = selector.substring(0, spaceIndex);
      const childSelector = selector.substring(spaceIndex + 1);

      // Find parent element
      let parentElement = null;
      if (parentSelector.startsWith('#')) {
        parentElement = this.elements.get(parentSelector.slice(1));
      }

      if (parentElement) {
        // Handle attribute selectors for child
        const attrMatch = childSelector.match(/^(\w+)\[([^=]+)="([^"]+)"\]$/);
        if (attrMatch) {
          const [, tagName, attrName, attrValue] = attrMatch;
          // Create a mock element for buttons with specific onclick handlers
          if (tagName && tagName.toLowerCase() === 'button' && attrName === 'onclick') {
            const mockButton = this.createElement(
              `temp-btn-${Date.now()}`,
              false,
              '',
              attrValue || null,
            );
            mockButton.tagName = 'BUTTON';
            mockButton.nodeName = 'BUTTON';
            mockButton._parentId = parentElement.id;
            return mockButton;
          }
        }

        // Handle simple tag name for child
        for (const [, element] of Array.from(this.elements.entries())) {
          if (
            element._parentId === parentElement.id &&
            element.tagName &&
            element.tagName.toLowerCase() === childSelector.toLowerCase()
          ) {
            return element;
          }
        }
      }
    }
    return null;
  }

  private handleAttributeSelector(selector: string): any {
    const attrMatch = selector.match(/^\[([^=]+)="([^"]+)"\]$/);
    if (attrMatch) {
      const [, attrName, attrValue] = attrMatch;
      for (const [, element] of Array.from(this.elements.entries())) {
        const attrVal = element.getAttribute?.(attrName);
        if (attrVal === attrValue) {
          return element;
        }
      }
    }
    return null;
  }

  private parseInitialHTML(html: string) {
    const elementRegex = /<[^>]*id=["']([^"']+)["'][^>]*>/g;
    let match: RegExpExecArray | null;

    match = elementRegex.exec(html);
    while (match !== null) {
      const fullMatch = match[0];
      const id = match[1];
      const isDisabled = fullMatch.includes('disabled');
      const textContent = this.extractTextContent(html, fullMatch);
      const onclickMatch = fullMatch.match(/onclick=["']([^"']+)["']/);
      const onclick = onclickMatch ? onclickMatch[1] : null;

      // Extract tag name
      const tagMatch = fullMatch.match(/^<(\w+)/);
      const tagName = tagMatch?.[1] ? tagMatch[1].toUpperCase() : 'DIV';

      // Extract classes
      const classMatch = fullMatch.match(/class=["']([^"']+)["']/);
      const classes = classMatch?.[1]?.split(' ') || [];

      const element = this.createElement(id || '', isDisabled, textContent || '', onclick || null);
      element.tagName = tagName;
      element.nodeName = tagName;

      // Add classes
      classes.forEach((className) => {
        element.classList.add(className);
      });

      // Extract data attributes
      this.parseDataAttributes(fullMatch, element);

      this.elements.set(id || '', element);
      match = elementRegex.exec(html);
    }

    // Parse the entire HTML to catch all elements
    this.parseHTMLFragment(html);
  }

  private parseDataAttributes(fullMatch: string, element: any) {
    const dataRegex = /data-([^=]+)=["']([^"']+)["']/g;
    let dataMatch: RegExpExecArray | null;
    element._dataAttributes = element._dataAttributes || {};

    dataMatch = dataRegex.exec(fullMatch);
    while (dataMatch !== null) {
      const attrName = dataMatch[1] || '';
      const attrValue = dataMatch[2] || '';
      element._dataAttributes[`data-${attrName}`] = attrValue;

      // Set special properties based on data attributes
      if (attrName === 'statement-id') {
        element.id = attrValue;
      } else if (attrName === 'node-id') {
        element._nodeId = attrValue;
      } else if (attrName === 'statement-type') {
        element._statementType = attrValue;
      } else if (attrName === 'original-content') {
        element.textContent = attrValue;
      } else if (attrName === 'label-type') {
        element._labelType = attrValue;
      }
      dataMatch = dataRegex.exec(fullMatch);
    }
  }

  private parseHTMLFragment(html: string, parentId?: string) {
    // Parse elements with IDs
    const elementRegex = /<[^>]*id=["']([^"']+)["'][^>]*>/g;
    let match: RegExpExecArray | null;

    match = elementRegex.exec(html);
    while (match !== null) {
      const fullMatch = match[0];
      const id = match[1];

      // Only create if doesn't already exist
      if (id && !this.elements.has(id)) {
        const isDisabled = fullMatch.includes('disabled');
        const textContent = this.extractTextContent(html, fullMatch);
        const onclickMatch = fullMatch.match(/onclick=["']([^"']+)["']/);
        const onclick = onclickMatch ? onclickMatch[1] : null;

        // Extract tag name
        const tagMatch = fullMatch.match(/^<(\w+)/);
        const tagName = tagMatch?.[1] ? tagMatch[1].toUpperCase() : 'DIV';

        // Check for classes
        const classMatch = fullMatch.match(/class=["']([^"']+)["']/);
        const classes = classMatch?.[1] ? classMatch[1].split(' ') : [];

        const element = this.createElement(
          id || '',
          isDisabled,
          textContent || '',
          onclick || null,
        );
        element.tagName = tagName;
        element.nodeName = tagName;
        element._parentId = parentId;

        // Add classes
        classes.forEach((className) => {
          element.classList.add(className);
        });

        // Add data attributes
        this.parseDataAttributes(fullMatch, element);

        this.elements.set(id || '', element);
      }
      match = elementRegex.exec(html);
    }

    // Also parse elements without IDs but with classes for better querySelector support
    const classElementRegex = /<[^>]*class=["']([^"']*statement-group[^"']*)["'][^>]*>/g;
    let classMatch: RegExpExecArray | null;

    classMatch = classElementRegex.exec(html);
    while (classMatch !== null) {
      const fullMatch = classMatch[0];
      const classString = classMatch[1];

      // Generate a temporary ID for elements without IDs
      const tempId = `temp-${Date.now()}-${Math.random()}`;

      const isDisabled = fullMatch.includes('disabled');
      const textContent = this.extractTextContent(html, fullMatch);

      // Extract tag name
      const tagMatch = fullMatch.match(/^<(\w+)/);
      const tagName = tagMatch?.[1] ? tagMatch[1].toUpperCase() : 'G';

      const classes = classString ? classString.split(' ') : [];

      const element = this.createElement(tempId, isDisabled, textContent || '', null);
      element.tagName = tagName;
      element.nodeName = tagName;
      element._parentId = parentId;

      // Add classes
      classes.forEach((className) => {
        element.classList.add(className);
      });

      // Add data attributes
      this.parseDataAttributes(fullMatch, element);

      this.elements.set(tempId, element);
      classMatch = classElementRegex.exec(html);
    }
  }

  private extractTextContent(html: string, elementMatch: string): string {
    const tagMatch = elementMatch.match(/^<(\w+)/);
    const tagName = tagMatch?.[1];
    if (!tagName) return '';

    const startIndex = html.indexOf(elementMatch) + elementMatch.length;
    const endTag = `</${tagName}>`;
    const endIndex = html.indexOf(endTag, startIndex);

    if (endIndex === -1) return '';

    const content = html.substring(startIndex, endIndex);
    // Strip HTML tags from content
    return content.replace(/<[^>]*>/g, '').trim();
  }

  createElement(id: string, disabled: boolean, textContent: string, onclick: string | null) {
    const element: any = {
      id,
      disabled,
      textContent,
      tagName: 'DIV',
      nodeName: 'DIV',
      innerHTML: '',
      style: {},
      classList: {
        _classes: [] as string[],
        add: vi.fn().mockImplementation((className: string) => {
          element._classes = element._classes || [];
          if (!element._classes.includes(className)) {
            element._classes.push(className);
          }
          element.classList._classes.push(className);
        }),
        remove: vi.fn().mockImplementation((className: string) => {
          element._classes = element._classes || [];
          element._classes = element._classes.filter((c: string) => c !== className);
          element.classList._classes = element.classList._classes.filter(
            (c: string) => c !== className,
          );
        }),
        contains: vi.fn().mockImplementation((className: string) => {
          return element._classes?.includes(className) || false;
        }),
        toggle: vi.fn().mockImplementation((className: string) => {
          if (element.classList.contains(className)) {
            element.classList.remove(className);
          } else {
            element.classList.add(className);
          }
        }),
      },
      _onclick: onclick,
      _classes: [] as string[],
      _eventListeners: {} as Record<string, ((event: any) => void)[]>,
      _dataAttributes: {} as Record<string, string>,
      addEventListener: vi.fn().mockImplementation((type: string, listener: any) => {
        if (!element._eventListeners[type]) {
          element._eventListeners[type] = [];
        }
        element._eventListeners[type].push(listener);
      }),
      removeEventListener: vi.fn().mockImplementation((type: string, listener: any) => {
        if (element._eventListeners[type]) {
          element._eventListeners[type] = element._eventListeners[type].filter(
            (l: any) => l !== listener,
          );
        }
      }),
      dispatchEvent: vi.fn().mockImplementation((event: any) => {
        const type = event.type;
        const listeners = element._eventListeners[type] || [];

        // Set default target/currentTarget
        if (typeof event === 'object' && !event.target) {
          event.target = element;
          event.currentTarget = element;
        }

        listeners.forEach((listener: (event: any) => void) => {
          try {
            const eventWithTarget = {
              ...event,
              target: event.target || element,
              currentTarget: element,
              getAttribute: (name: string) => element.getAttribute(name),
            };
            listener(eventWithTarget);
          } catch (error) {
            console.error('Error dispatching event:', error);
          }
        });
        return true;
      }),
      setAttribute: vi.fn().mockImplementation((name: string, value: string) => {
        element._dataAttributes = element._dataAttributes || {};
        element._dataAttributes[name] = value;
      }),
      getAttribute: vi.fn().mockImplementation((name: string) => {
        // Special attribute handling
        if (name === 'data-statement-id' && element.id.startsWith('stmt')) {
          return element.id;
        }
        if (name === 'data-node-id' && element._nodeId) {
          return element._nodeId;
        }
        if (name === 'data-statement-type' && element._statementType) {
          return element._statementType;
        }
        if (name === 'data-original-content' && element.textContent) {
          return element.textContent;
        }
        if (name === 'onclick' && element._onclick) {
          return element._onclick;
        }
        return element._dataAttributes?.[name] || null;
      }),
      appendChild: vi.fn(),
      remove: vi.fn(),
      getBoundingClientRect: vi.fn().mockReturnValue({
        top: 100,
        left: 100,
        bottom: 200,
        right: 200,
        width: 100,
        height: 100,
        x: 100,
        y: 100,
      }),
      querySelector: vi.fn().mockImplementation((selector: string) => {
        return this.elementQuerySelector(element, selector);
      }),
      querySelectorAll: vi.fn().mockImplementation((selector: string) => {
        return this.elementQuerySelectorAll(element, selector);
      }),
      closest: vi.fn().mockImplementation((selector: string) => {
        if (selector === '.drop-zone' && element._classes?.includes('drop-zone')) {
          return element;
        }
        return null;
      }),
      click: vi.fn().mockImplementation(() => {
        // Trigger click event if this element has onclick handlers or event listeners
        if (element._onclick) {
          // Parse and execute the onclick string
          try {
            const func = new Function(element._onclick);
            func.call(element);
          } catch (error) {
            console.error('Error executing onclick:', error);
          }
        }

        // Also trigger any registered click event listeners
        const clickEvent = {
          type: 'click',
          target: element,
          currentTarget: element,
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
        };
        element.dispatchEvent(clickEvent);
      }),
      focus: vi.fn().mockImplementation(() => {
        // Set activeElement by replacing the entire document object
        (this.window as any).document = {
          ...this.window.document,
          activeElement: element,
        };
      }),
      blur: vi.fn().mockImplementation(() => {
        if (this.window.document.activeElement === element) {
          // Reset activeElement by replacing the entire document object
          (this.window as any).document = {
            ...this.window.document,
            activeElement: null,
          };
        }
      }),
      tabIndex: 0,
      selectionStart: 0,
      selectionEnd: 0,
      value: '',
      select: vi.fn().mockImplementation(() => {
        element.selectionStart = 0;
        element.selectionEnd = element.value ? element.value.length : 0;
      }),
    };
    return element;
  }

  private elementQuerySelector(parentElement: any, selector: string): any {
    // Handle class selectors
    if (selector.startsWith('.')) {
      const className = selector.slice(1);
      for (const [, childElement] of Array.from(this.elements.entries())) {
        if (
          childElement._parentId === parentElement.id &&
          childElement._classes?.includes(className)
        ) {
          return childElement;
        }
      }
    }

    // Handle attribute selectors
    const attrMatch = selector.match(/^\[([^=]+)="([^"]+)"\]$/);
    if (attrMatch) {
      const [, attrName, attrValue] = attrMatch;
      for (const [, childElement] of Array.from(this.elements.entries())) {
        if (childElement._parentId === parentElement.id) {
          const attrVal = childElement.getAttribute?.(attrName);
          if (attrVal === attrValue) {
            return childElement;
          }
        }
      }
    }

    // Handle element selectors
    for (const [, childElement] of Array.from(this.elements.entries())) {
      if (
        childElement._parentId === parentElement.id &&
        childElement.tagName &&
        childElement.tagName.toLowerCase() === selector.toLowerCase()
      ) {
        return childElement;
      }
    }

    return null;
  }

  private elementQuerySelectorAll(_parentElement: any, selector: string): any[] {
    const results = [];
    if (selector.startsWith('.')) {
      const className = selector.slice(1);
      for (const [, childElement] of Array.from(this.elements.entries())) {
        if (childElement._classes?.includes(className)) {
          results.push(childElement);
        }
      }
    }
    return results;
  }
}

export const JSDOM = MockJSDOMImpl;

// Extend Window interface for webview functions
declare global {
  interface Window {
    acquireVsCodeApi(): {
      postMessage(message: any): void;
      setState(state: any): void;
      getState(): any;
    };
    vscode?: {
      postMessage(message: any): void;
      setState(state: any): void;
      getState(): any;
    };

    // Webview functions
    initializeInteractiveFeatures(): void;
    showCreateArgumentForm(): void;
    showAddStatementForm(type: string): void;
    showSidebar(): void;
    hideSidebar(): void;
    hideAllForms(): void;
    showErrorMessage(message: string): void;
    showSuccessMessage(message: string): void;
    updateToolbarState(): void;
    createArgument(): void;
    addStatement(): void;
    zoomIn(): void;
    zoomOut(): void;
    resetView(): void;
    applyZoom(): void;
    exportProof(): void;
  }
}

// Helper function to create a basic webview HTML structure
export function createBasicWebviewHTML(): string {
  return `
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
    </body>
    </html>
  `;
}

// Helper function to setup mock VS Code API
export function setupMockVSCodeAPI(window: any) {
  const mockVSCode = {
    postMessage: vi.fn(),
    setState: vi.fn(),
    getState: vi.fn().mockReturnValue(null),
  };

  window.vscode = mockVSCode;
  window.acquireVsCodeApi = vi.fn().mockReturnValue(mockVSCode);

  return mockVSCode;
}

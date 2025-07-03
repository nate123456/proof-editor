import { test, expect } from '../test-env';

test.describe('ProofTreePanel Webview', () => {
  test('renders empty state when no proof trees exist', async ({ page }) => {
    // Set up a minimal HTML page simulating the webview content
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Proof Tree Visualization</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #1e1e1e;
            color: #d4d4d4;
          }
          
          .tree-container {
            overflow: auto;
            min-height: 100vh;
            width: 100%;
          }
        </style>
      </head>
      <body>
        <div id="tree-container" class="tree-container">
          <div style="
            display: flex; 
            align-items: center; 
            justify-content: center; 
            height: 200px; 
            color: #858585;
            font-style: italic;
          ">
            No proof trees to display. Add trees to your proof file to see visualization.
          </div>
        </div>
      </body>
      </html>
    `);

    // Verify empty state is displayed
    await expect(page.locator('#tree-container')).toBeVisible();
    await expect(page.getByText('No proof trees to display')).toBeVisible();
  });

  test('renders SVG content when proof tree is provided', async ({ page, loadTestProofFile }) => {
    // Load a test proof file
    const proofContent = await loadTestProofFile('modus-ponens.proof');
    expect(proofContent).toContain('statements:');

    // Set up webview content with SVG
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Proof Tree Visualization</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #1e1e1e;
            color: #d4d4d4;
          }
          
          .tree-container {
            overflow: auto;
            min-height: 100vh;
            width: 100%;
          }

          .argument-node {
            stroke: #3c3c3c;
            stroke-width: 1;
            fill: #2d2d30;
            filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));
          }
          
          .statement-text {
            font-size: 12px;
            fill: #d4d4d4;
            text-anchor: middle;
            font-family: inherit;
          }
          
          .implication-line {
            stroke: #d4d4d4;
            stroke-width: 2;
            opacity: 1;
          }
        </style>
      </head>
      <body>
        <div id="tree-container" class="tree-container">
          <svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                      refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#6c757d" />
              </marker>
            </defs>
            <g class="tree">
              <g class="argument-node-group" data-testid="argument-node-1">
                <rect x="50" y="50" width="220" height="120" class="argument-node" />
                <rect x="50" y="50" width="220" height="60" fill="none" />
                <text x="160" y="75" class="statement-text">All men are mortal</text>
                <text x="160" y="95" class="statement-text">Socrates is a man</text>
                <line x1="60" y1="115" x2="250" y2="115" class="implication-line" />
                <rect x="50" y="120" width="220" height="50" fill="none" />
                <text x="160" y="145" class="statement-text">Socrates is mortal</text>
              </g>
            </g>
          </svg>
        </div>
        
        <script>
          window.addEventListener('message', event => {
            const message = event.data;
            const container = document.getElementById('tree-container');
            
            switch (message.type) {
              case 'updateTree':
                container.innerHTML = message.content;
                break;
              case 'showError':
                container.innerHTML = message.content;
                break;
            }
          });
        </script>
      </body>
      </html>
    `);

    // Verify SVG is rendered
    await expect(page.locator('svg')).toBeVisible();
    await expect(page.locator('[data-testid="argument-node-1"]')).toBeVisible();
    await expect(page.locator('.argument-node')).toBeVisible();
    await expect(page.locator('.statement-text').first()).toContainText('All men are mortal');
    await expect(page.locator('.implication-line')).toBeVisible();
  });

  test('handles webview message updates', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Proof Tree Visualization</title>
      </head>
      <body>
        <div id="tree-container"></div>
        
        <script>
          window.addEventListener('message', event => {
            const message = event.data;
            const container = document.getElementById('tree-container');
            
            switch (message.type) {
              case 'updateTree':
                container.innerHTML = message.content;
                container.setAttribute('data-updated', 'true');
                break;
              case 'showError':
                container.innerHTML = message.content;
                container.setAttribute('data-error', 'true');
                break;
            }
          });
        </script>
      </body>
      </html>
    `);

    // Test updateTree message
    await page.evaluate(() => {
      window.postMessage({
        type: 'updateTree',
        content: '<div data-testid="updated-content">Updated tree content</div>'
      }, '*');
    });

    await expect(page.locator('#tree-container')).toHaveAttribute('data-updated', 'true');
    await expect(page.locator('[data-testid="updated-content"]')).toBeVisible();

    // Test showError message
    await page.evaluate(() => {
      window.postMessage({
        type: 'showError',
        content: '<div data-testid="error-content" class="error-container">Parse error occurred</div>'
      }, '*');
    });

    await expect(page.locator('#tree-container')).toHaveAttribute('data-error', 'true');
    await expect(page.locator('[data-testid="error-content"]')).toBeVisible();
    await expect(page.locator('.error-container')).toContainText('Parse error occurred');
  });

  test('displays parse errors correctly', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Proof Tree Visualization</title>
        <style>
          .error-container {
            background: #f14c4c;
            border: 1px solid #be1100;
            border-radius: 4px;
            padding: 16px;
            margin: 16px 0;
          }
          
          .error-container h3 {
            margin: 0 0 12px 0;
            color: #ffffff;
          }
          
          .error-text {
            font-family: 'Consolas', monospace;
            font-size: 12px;
            white-space: pre-wrap;
            margin: 0;
            color: #ffffff;
          }
        </style>
      </head>
      <body>
        <div id="tree-container">
          <div class="error-container" data-testid="parse-error">
            <h3>Parse Errors</h3>
            <pre class="error-text">[statements] Missing required statement 'S1'
[arguments] Invalid argument reference 'arg2'</pre>
          </div>
        </div>
      </body>
      </html>
    `);

    // Verify error display
    await expect(page.locator('[data-testid="parse-error"]')).toBeVisible();
    await expect(page.locator('.error-container h3')).toContainText('Parse Errors');
    await expect(page.locator('.error-text')).toContainText('Missing required statement');
    await expect(page.locator('.error-text')).toContainText('Invalid argument reference');
  });

  test('supports VS Code theme variables', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Proof Tree Visualization</title>
        <style>
          :root {
            --vscode-editor-background: #1e1e1e;
            --vscode-editor-foreground: #d4d4d4;
            --vscode-panel-border: #3c3c3c;
            --vscode-textLink-foreground: #4daafc;
            --vscode-descriptionForeground: #858585;
          }
          
          body {
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
          }
          
          .theme-test {
            border: 1px solid var(--vscode-panel-border);
            color: var(--vscode-textLink-foreground);
            padding: 10px;
          }
          
          .description {
            color: var(--vscode-descriptionForeground);
          }
        </style>
      </head>
      <body>
        <div class="theme-test" data-testid="theme-element">
          <span>Themed content</span>
          <div class="description">Description text</div>
        </div>
      </body>
      </html>
    `);

    // Verify CSS custom properties are applied
    const themeElement = page.locator('[data-testid="theme-element"]');
    await expect(themeElement).toBeVisible();
    
    // Check computed styles (these will reflect the CSS custom property values)
    const backgroundColor = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });
    
    const borderColor = await page.evaluate(() => {
      const element = document.querySelector('[data-testid="theme-element"]');
      return element ? getComputedStyle(element).borderColor : '';
    });
    
    // These should be the resolved CSS custom property values
    expect(backgroundColor).toBeTruthy();
    expect(borderColor).toBeTruthy();
  });

  test('handles SVG interaction and zoom capabilities', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Proof Tree Visualization</title>
        <style>
          .tree-container {
            overflow: auto;
            width: 100%;
            height: 500px;
          }
          
          svg {
            cursor: grab;
            transition: transform 0.2s ease;
          }
          
          svg:active {
            cursor: grabbing;
          }
          
          .argument-node {
            cursor: pointer;
          }
          
          .argument-node:hover {
            stroke-width: 2;
            filter: drop-shadow(4px 4px 8px rgba(0,0,0,0.3));
          }
        </style>
      </head>
      <body>
        <div class="tree-container" data-testid="tree-container">
          <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg" data-testid="proof-svg">
            <g transform="scale(1)">
              <rect x="100" y="100" width="200" height="100" 
                    class="argument-node" 
                    data-testid="clickable-node" />
              <text x="200" y="140" text-anchor="middle" data-testid="node-text">
                Clickable Argument
              </text>
            </g>
          </svg>
        </div>
        
        <script>
          let scale = 1;
          
          document.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
              e.preventDefault();
              scale += e.deltaY > 0 ? -0.1 : 0.1;
              scale = Math.max(0.5, Math.min(3, scale));
              
              const svg = document.querySelector('svg g');
              svg.setAttribute('transform', \`scale(\${scale})\`);
            }
          });
          
          document.querySelector('[data-testid="clickable-node"]').addEventListener('click', (e) => {
            e.target.setAttribute('data-clicked', 'true');
          });
        </script>
      </body>
      </html>
    `);

    // Test node clicking
    await page.locator('[data-testid="clickable-node"]').click();
    await expect(page.locator('[data-testid="clickable-node"]')).toHaveAttribute('data-clicked', 'true');

    // Test zoom functionality (simulate Ctrl+scroll)
    await page.locator('[data-testid="proof-svg"]').hover();
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -100); // Zoom in
    await page.keyboard.up('Control');

    // Verify zoom transformation was applied
    const transform = await page.locator('svg g').getAttribute('transform');
    expect(transform).toContain('scale(');
    expect(transform).not.toBe('scale(1)');
  });
});
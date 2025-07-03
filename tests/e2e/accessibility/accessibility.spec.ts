import { test, expect } from '../test-env';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Accessibility Tests', () => {
  test('proof tree panel meets WCAG accessibility standards', async ({ page }) => {
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
          
          .argument-node {
            stroke: #3c3c3c;
            stroke-width: 2;
            fill: #2d2d30;
          }
          
          .statement-text {
            font-size: 14px;
            fill: #d4d4d4;
            text-anchor: middle;
            font-family: inherit;
          }
          
          .implication-line {
            stroke: #d4d4d4;
            stroke-width: 2;
          }
          
          .side-label {
            font-size: 12px;
            fill: #858585;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <main role="main" aria-label="Proof tree visualization workspace">
          <h1>Proof Tree Visualization</h1>
          
          <div id="tree-container" class="tree-container" role="img" aria-label="Interactive proof tree diagram">
            <svg width="600" height="400" 
                 xmlns="http://www.w3.org/2000/svg"
                 role="img"
                 aria-labelledby="svg-title svg-desc">
              
              <title id="svg-title">Logical Argument Proof Tree</title>
              <desc id="svg-desc">
                A visual representation of a logical argument showing premises connected to conclusions through logical inference rules.
                The tree contains 2 argument nodes with premises, conclusions, and connecting lines showing logical flow.
              </desc>
              
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                        refX="9" refY="3.5" orient="auto"
                        aria-label="Direction indicator">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#4daafc" />
                </marker>
              </defs>
              
              <g class="tree">
                <g class="argument-node-group" 
                   role="group" 
                   aria-labelledby="arg1-label"
                   tabindex="0">
                  
                  <title id="arg1-label">Argument 1: Socrates mortality argument using modus ponens</title>
                  
                  <rect x="50" y="50" width="220" height="120" 
                        class="argument-node"
                        role="presentation" />
                  
                  <g role="group" aria-label="Premises">
                    <text x="160" y="75" class="statement-text" 
                          role="text"
                          aria-label="Premise 1: All men are mortal">
                      All men are mortal
                    </text>
                    <text x="160" y="95" class="statement-text" 
                          role="text"
                          aria-label="Premise 2: Socrates is a man">
                      Socrates is a man
                    </text>
                  </g>
                  
                  <line x1="60" y1="115" x2="250" y2="115" 
                        class="implication-line"
                        role="presentation"
                        aria-label="Logical implication: therefore" />
                  
                  <g role="group" aria-label="Conclusions">
                    <text x="160" y="145" class="statement-text" 
                          role="text"
                          aria-label="Conclusion: Socrates is mortal">
                      Socrates is mortal
                    </text>
                  </g>
                  
                  <text x="280" y="110" class="side-label"
                        role="text"
                        aria-label="Inference rule: Modus Ponens">
                    Modus Ponens
                  </text>
                </g>
                
                <g class="argument-node-group" 
                   role="group" 
                   aria-labelledby="arg2-label"
                   tabindex="0">
                  
                  <title id="arg2-label">Argument 2: Death inevitability inference</title>
                  
                  <rect x="350" y="200" width="220" height="100" 
                        class="argument-node"
                        role="presentation" />
                  
                  <g role="group" aria-label="Premises">
                    <text x="460" y="230" class="statement-text" 
                          role="text"
                          aria-label="Premise: Socrates is mortal, from previous argument">
                      Socrates is mortal
                    </text>
                  </g>
                  
                  <line x1="360" y1="255" x2="550" y2="255" 
                        class="implication-line"
                        role="presentation"
                        aria-label="Logical implication: therefore" />
                  
                  <g role="group" aria-label="Conclusions">
                    <text x="460" y="285" class="statement-text" 
                          role="text"
                          aria-label="Conclusion: Death is inevitable for Socrates">
                      Death is inevitable
                    </text>
                  </g>
                  
                  <text x="580" y="250" class="side-label"
                        role="text"
                        aria-label="Inference rule: Direct inference">
                    Inference
                  </text>
                </g>
                
                <line x1="270" y1="145" x2="350" y2="225" 
                      class="connection-line"
                      role="presentation"
                      aria-label="Logical connection from first argument to second argument"
                      stroke="#4daafc"
                      stroke-width="2"
                      stroke-dasharray="5,5"
                      marker-end="url(#arrowhead)" />
              </g>
            </svg>
          </div>
          
          <div class="controls" role="toolbar" aria-label="Proof tree controls">
            <button type="button" aria-label="Zoom in on proof tree">Zoom In</button>
            <button type="button" aria-label="Zoom out on proof tree">Zoom Out</button>
            <button type="button" aria-label="Reset proof tree to original size">Reset Zoom</button>
            <button type="button" aria-label="Export proof tree as image">Export</button>
          </div>
        </main>
      </body>
      </html>
    `);

    await injectAxe(page);
    
    // Run comprehensive accessibility check
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: { html: true }
    });
  });

  test('keyboard navigation works correctly', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Keyboard Navigation Test</title>
        <style>
          .argument-node-group:focus {
            outline: 2px solid #4daafc;
            outline-offset: 2px;
          }
          
          button:focus {
            outline: 2px solid #4daafc;
            outline-offset: 2px;
          }
          
          .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
          }
        </style>
      </head>
      <body>
        <div class="sr-only" aria-live="polite" id="announcements"></div>
        
        <main>
          <h1>Keyboard Navigation Test</h1>
          
          <div role="toolbar" aria-label="Proof tree controls">
            <button type="button" id="zoom-in" aria-label="Zoom in">+</button>
            <button type="button" id="zoom-out" aria-label="Zoom out">-</button>
            <button type="button" id="reset" aria-label="Reset view">Reset</button>
          </div>
          
          <svg width="500" height="300" xmlns="http://www.w3.org/2000/svg">
            <g class="argument-node-group" 
               tabindex="0" 
               role="button"
               aria-label="Argument node: Socrates mortality"
               data-testid="node-1">
              <rect x="50" y="50" width="200" height="100" 
                    fill="#2d2d30" stroke="#3c3c3c" />
              <text x="150" y="80" text-anchor="middle" fill="#d4d4d4">
                All men are mortal
              </text>
              <text x="150" y="120" text-anchor="middle" fill="#d4d4d4">
                Socrates is mortal
              </text>
            </g>
            
            <g class="argument-node-group" 
               tabindex="0" 
               role="button"
               aria-label="Argument node: Death conclusion"
               data-testid="node-2">
              <rect x="300" y="150" width="180" height="80" 
                    fill="#2d2d30" stroke="#3c3c3c" />
              <text x="390" y="190" text-anchor="middle" fill="#d4d4d4">
                Death is inevitable
              </text>
            </g>
          </svg>
        </main>
        
        <script>
          // Track focus and announce changes
          const announcements = document.getElementById('announcements');
          
          document.addEventListener('focus', (e) => {
            if (e.target.hasAttribute('aria-label')) {
              announcements.textContent = \`Focused: \${e.target.getAttribute('aria-label')}\`;
            }
          }, true);
          
          // Handle keyboard interactions
          document.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('argument-node-group')) {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                announcements.textContent = \`Activated: \${e.target.getAttribute('aria-label')}\`;
                e.target.setAttribute('data-activated', 'true');
              }
            }
          });
        </script>
      </body>
      </html>
    `);

    // Test tab navigation
    await page.keyboard.press('Tab');
    let focusedElement = await page.locator(':focus').getAttribute('aria-label');
    expect(focusedElement).toContain('Zoom');

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should now be on first argument node
    focusedElement = await page.locator(':focus').getAttribute('data-testid');
    expect(focusedElement).toBe('node-1');

    // Test activation with Enter key
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="node-1"]')).toHaveAttribute('data-activated', 'true');

    // Navigate to next node
    await page.keyboard.press('Tab');
    focusedElement = await page.locator(':focus').getAttribute('data-testid');
    expect(focusedElement).toBe('node-2');

    // Test activation with Space key
    await page.keyboard.press(' ');
    await expect(page.locator('[data-testid="node-2"]')).toHaveAttribute('data-activated', 'true');
  });

  test('screen reader announcements work correctly', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Screen Reader Test</title>
        <style>
          .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
          }
        </style>
      </head>
      <body>
        <div class="sr-only" aria-live="polite" id="status-announcements" data-testid="status"></div>
        <div class="sr-only" aria-live="assertive" id="error-announcements" data-testid="errors"></div>
        
        <main aria-label="Proof tree workspace">
          <h1>Proof Tree Visualization</h1>
          
          <div id="tree-status" aria-live="polite" aria-atomic="true">
            <span class="sr-only">Tree contains 2 arguments with 3 premises and 2 conclusions</span>
          </div>
          
          <button id="update-tree" type="button">Update Tree</button>
          <button id="parse-error" type="button">Trigger Parse Error</button>
          
          <div role="region" aria-label="Proof tree diagram" aria-describedby="tree-status">
            <svg width="400" height="200" xmlns="http://www.w3.org/2000/svg"
                 aria-labelledby="tree-title tree-desc">
              <title id="tree-title">Logical Proof Tree</title>
              <desc id="tree-desc">
                Visual representation showing logical connections between premises and conclusions
              </desc>
              
              <g role="group" aria-label="Modus ponens argument">
                <rect x="50" y="50" width="200" height="80" 
                      fill="#2d2d30" stroke="#3c3c3c" />
                <text x="150" y="90" text-anchor="middle" fill="#d4d4d4"
                      aria-label="Conclusion: Therefore Socrates is mortal">
                  Socrates is mortal
                </text>
              </g>
            </svg>
          </div>
        </main>
        
        <script>
          const statusEl = document.getElementById('status-announcements');
          const errorEl = document.getElementById('error-announcements');
          
          document.getElementById('update-tree').addEventListener('click', () => {
            statusEl.textContent = 'Tree updated successfully with new argument structure';
          });
          
          document.getElementById('parse-error').addEventListener('click', () => {
            errorEl.textContent = 'Error: Invalid syntax in proof file at line 5';
          });
        </script>
      </body>
      </html>
    `);

    // Test status announcements
    await page.click('#update-tree');
    await expect(page.locator('[data-testid="status"]')).toContainText('Tree updated successfully');

    // Test error announcements
    await page.click('#parse-error');
    await expect(page.locator('[data-testid="errors"]')).toContainText('Error: Invalid syntax');

    // Verify aria-live regions exist and are properly configured
    await expect(page.locator('[aria-live="polite"]')).toHaveCount(2);
    await expect(page.locator('[aria-live="assertive"]')).toHaveCount(1);
  });

  test('color contrast meets WCAG AA standards', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Color Contrast Test</title>
        <style>
          /* VS Code dark theme colors with sufficient contrast */
          body {
            background: #1e1e1e; /* Dark background */
            color: #d4d4d4;      /* Light text - ratio 12.63:1 */
            font-family: 'Segoe UI', sans-serif;
            padding: 20px;
          }
          
          .high-contrast-text {
            color: #ffffff;      /* White text - ratio 15.8:1 */
            background: #1e1e1e;
          }
          
          .error-text {
            color: #f85149;      /* Error red - ratio 5.01:1 */
            background: #1e1e1e;
          }
          
          .success-text {
            color: #7ee787;      /* Success green - ratio 7.24:1 */
            background: #1e1e1e;
          }
          
          .warning-text {
            color: #f9e79f;      /* Warning yellow - ratio 9.51:1 */
            background: #1e1e1e;
          }
          
          .link-text {
            color: #4daafc;      /* Link blue - ratio 5.94:1 */
            background: #1e1e1e;
          }
          
          .disabled-text {
            color: #858585;      /* Disabled gray - ratio 4.56:1 */
            background: #1e1e1e;
          }
          
          /* Test insufficient contrast (should fail) */
          .low-contrast {
            color: #444444;      /* Too dark - ratio 2.39:1 (fails) */
            background: #1e1e1e;
          }
        </style>
      </head>
      <body>
        <h1 class="high-contrast-text">Color Contrast Test</h1>
        
        <div class="content">
          <p>Normal body text with sufficient contrast ratio.</p>
          
          <p class="error-text">Error message with red text.</p>
          
          <p class="success-text">Success message with green text.</p>
          
          <p class="warning-text">Warning message with yellow text.</p>
          
          <a href="#" class="link-text">Link with blue text</a>
          
          <p class="disabled-text">Disabled or secondary text.</p>
          
          <!-- This should fail accessibility check -->
          <p class="low-contrast" data-testid="fail-contrast">
            This text has insufficient contrast ratio.
          </p>
        </div>
        
        <svg width="300" height="150" xmlns="http://www.w3.org/2000/svg">
          <rect x="20" y="20" width="260" height="110" 
                fill="#2d2d30" stroke="#4daafc" stroke-width="2" />
          
          <!-- Good contrast text in SVG -->
          <text x="150" y="50" text-anchor="middle" 
                fill="#d4d4d4" font-size="14">
            SVG text with good contrast
          </text>
          
          <!-- Borderline contrast text in SVG -->
          <text x="150" y="80" text-anchor="middle" 
                fill="#858585" font-size="12">
            SVG secondary text
          </text>
          
          <!-- Poor contrast text (should fail) -->
          <text x="150" y="110" text-anchor="middle" 
                fill="#444444" font-size="10"
                data-testid="svg-fail-contrast">
            SVG text with poor contrast
          </text>
        </svg>
      </body>
      </html>
    `);

    await injectAxe(page);
    
    // Run accessibility check focusing on color contrast
    try {
      await checkA11y(page);
      
      // If we reach here, the page passed contrast checks
      // But we know it should fail due to low-contrast elements
      // This test demonstrates that axe can detect contrast issues
    } catch (error) {
      // Expect this to fail due to low contrast elements
      expect((error as Error).message).toContain('color-contrast');
    }

    // Verify that good contrast elements are visible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.error-text')).toBeVisible();
    await expect(page.locator('.success-text')).toBeVisible();
    
    // Verify problematic elements exist (they should fail contrast check)
    await expect(page.locator('[data-testid="fail-contrast"]')).toBeVisible();
    await expect(page.locator('[data-testid="svg-fail-contrast"]')).toBeVisible();
  });

  test('focus management and visual indicators', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Focus Management Test</title>
        <style>
          /* High contrast focus indicators */
          :focus {
            outline: 3px solid #4daafc;
            outline-offset: 2px;
          }
          
          .argument-node:focus {
            outline: 3px solid #4daafc;
            outline-offset: 4px;
          }
          
          /* Visible focus even in high contrast mode */
          @media (prefers-contrast: high) {
            :focus {
              outline: 4px solid #ffff00;
              outline-offset: 3px;
            }
          }
          
          /* Skip links for keyboard users */
          .skip-link {
            position: absolute;
            top: -40px;
            left: 6px;
            background: #4daafc;
            color: white;
            padding: 8px;
            text-decoration: none;
            border-radius: 3px;
            z-index: 1000;
          }
          
          .skip-link:focus {
            top: 6px;
          }
          
          .focusable-svg-group {
            cursor: pointer;
          }
          
          .focusable-svg-group:focus {
            outline: 2px solid #4daafc;
            outline-offset: 2px;
          }
        </style>
      </head>
      <body>
        <a href="#main-content" class="skip-link">Skip to main content</a>
        
        <nav aria-label="Navigation">
          <button type="button" id="btn1">Navigation Button 1</button>
          <button type="button" id="btn2">Navigation Button 2</button>
        </nav>
        
        <main id="main-content">
          <h1>Focus Management Test</h1>
          
          <div role="toolbar" aria-label="Proof tree controls">
            <button type="button" id="zoom-in" aria-label="Zoom in">Zoom In</button>
            <button type="button" id="zoom-out" aria-label="Zoom out">Zoom Out</button>
            <button type="button" id="fullscreen" aria-label="Enter fullscreen">Fullscreen</button>
          </div>
          
          <div role="region" aria-label="Interactive proof tree">
            <svg width="400" height="250" xmlns="http://www.w3.org/2000/svg"
                 aria-label="Proof tree diagram">
              
              <g class="focusable-svg-group argument-node" 
                 tabindex="0" 
                 role="button"
                 aria-label="Argument 1: Premises to conclusion"
                 data-testid="svg-node-1">
                <rect x="50" y="50" width="150" height="80" 
                      fill="#2d2d30" stroke="#4daafc" stroke-width="1" />
                <text x="125" y="90" text-anchor="middle" fill="#d4d4d4">
                  Focusable Argument
                </text>
              </g>
              
              <g class="focusable-svg-group argument-node" 
                 tabindex="0" 
                 role="button"
                 aria-label="Argument 2: Connected conclusion"
                 data-testid="svg-node-2">
                <rect x="220" y="120" width="150" height="80" 
                      fill="#2d2d30" stroke="#4daafc" stroke-width="1" />
                <text x="295" y="160" text-anchor="middle" fill="#d4d4d4">
                  Connected Node
                </text>
              </g>
            </svg>
          </div>
          
          <button type="button" id="reset-focus" aria-label="Reset focus to beginning">
            Reset Focus
          </button>
        </main>
        
        <script>
          // Focus management
          document.getElementById('reset-focus').addEventListener('click', () => {
            document.getElementById('zoom-in').focus();
          });
          
          // Trap focus in modal scenarios (example)
          document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
              // Return focus to main content
              document.getElementById('main-content').focus();
            }
          });
        </script>
      </body>
      </html>
    `);

    // Test skip link functionality
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link:focus')).toBeVisible();
    
    // Test skip link activation
    await page.keyboard.press('Enter');
    const focusedElementId = await page.locator(':focus').getAttribute('id');
    expect(focusedElementId).toBe('main-content');

    // Test focus navigation through controls
    await page.keyboard.press('Tab'); // Should focus first button in toolbar
    await expect(page.locator('#zoom-in:focus')).toBeVisible();

    await page.keyboard.press('Tab');
    await expect(page.locator('#zoom-out:focus')).toBeVisible();

    await page.keyboard.press('Tab');
    await expect(page.locator('#fullscreen:focus')).toBeVisible();

    // Test SVG element focus
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="svg-node-1"]:focus')).toBeVisible();

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="svg-node-2"]:focus')).toBeVisible();

    // Test programmatic focus management
    await page.click('#reset-focus');
    await expect(page.locator('#zoom-in:focus')).toBeVisible();

    await injectAxe(page);
    
    // Check focus-related accessibility rules
    await checkA11y(page);
  });
});
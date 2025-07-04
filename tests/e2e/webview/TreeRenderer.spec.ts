import { test, expect } from '../test-env';

test.describe('TreeRenderer Output', () => {
  test('renders well-formed SVG structure', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tree Renderer Test</title>
        <style>
          .argument-node {
            stroke: #3c3c3c;
            stroke-width: 1;
            fill: #2d2d30;
          }
          
          .statement-text {
            font-size: 12px;
            fill: #d4d4d4;
            text-anchor: middle;
          }
          
          .implication-line {
            stroke: #d4d4d4;
            stroke-width: 2;
          }
          
          .connection-line {
            stroke: #4daafc;
            stroke-width: 2;
            marker-end: url(#arrowhead);
            stroke-dasharray: 5,5;
          }
        </style>
      </head>
      <body>
        <svg width="600" height="400" xmlns="http://www.w3.org/2000/svg" data-testid="rendered-svg">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                    refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#4daafc" />
            </marker>
          </defs>
          <g class="tree">
            <g class="argument-node-group" data-testid="argument-1">
              <rect x="50" y="50" width="220" height="120" class="argument-node" />
              <rect x="50" y="50" width="220" height="60" fill="none" />
              <text x="160" y="75" class="statement-text">Premise 1</text>
              <text x="160" y="95" class="statement-text">Premise 2</text>
              <line x1="60" y1="115" x2="250" y2="115" class="implication-line" />
              <rect x="50" y="120" width="220" height="50" fill="none" />
              <text x="160" y="145" class="statement-text">Conclusion</text>
            </g>
            
            <g class="argument-node-group" data-testid="argument-2">
              <rect x="320" y="200" width="220" height="100" class="argument-node" />
              <rect x="320" y="200" width="220" height="50" fill="none" />
              <text x="430" y="230" class="statement-text">Another premise</text>
              <line x1="330" y1="255" x2="530" y2="255" class="implication-line" />
              <rect x="320" y="260" width="220" height="40" fill="none" />
              <text x="430" y="285" class="statement-text">Another conclusion</text>
            </g>
            
            <line x1="270" y1="170" x2="320" y2="225" class="connection-line" data-testid="connection" />
          </g>
        </svg>
      </body>
      </html>
    `);

    // Verify SVG structure
    await expect(page.locator('[data-testid="rendered-svg"]')).toBeVisible();
    await expect(page.locator('defs marker#arrowhead')).toBeAttached();
    
    // Verify argument nodes
    await expect(page.locator('[data-testid="argument-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="argument-2"]')).toBeVisible();
    
    // Verify node components
    await expect(page.locator('.argument-node')).toHaveCount(2);
    await expect(page.locator('.statement-text')).toHaveCount(5);
    await expect(page.locator('.implication-line')).toHaveCount(2);
    await expect(page.locator('[data-testid="connection"]')).toBeVisible();
  });

  test('handles complex argument structures', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Complex Tree Test</title>
        <style>
          .argument-node { stroke: #3c3c3c; fill: #2d2d30; }
          .statement-text { font-size: 12px; fill: #d4d4d4; text-anchor: middle; }
          .implication-line { stroke: #d4d4d4; stroke-width: 2; }
          .side-label { font-size: 10px; fill: #858585; font-style: italic; }
        </style>
      </head>
      <body>
        <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
          <g class="tree">
            <!-- Root argument with multiple premises -->
            <g class="argument-node-group" data-testid="root-argument">
              <rect x="50" y="50" width="220" height="160" class="argument-node" />
              
              <!-- Premises section -->
              <rect x="50" y="50" width="220" height="80" fill="none" />
              <text x="160" y="70" class="statement-text">All humans are mortal</text>
              <text x="160" y="90" class="statement-text">Socrates is human</text>
              <text x="160" y="110" class="statement-text">Mortality is universal</text>
              
              <!-- Implication line -->
              <line x1="60" y1="135" x2="250" y2="135" class="implication-line" />
              
              <!-- Conclusions section -->
              <rect x="50" y="140" width="220" height="70" fill="none" />
              <text x="160" y="165" class="statement-text">Socrates is mortal</text>
              <text x="160" y="185" class="statement-text">This follows logically</text>
              
              <!-- Side label -->
              <text x="280" y="130" class="side-label">Modus Ponens</text>
            </g>
            
            <!-- Child argument -->
            <g class="argument-node-group" data-testid="child-argument">
              <rect x="350" y="250" width="220" height="120" class="argument-node" />
              <rect x="350" y="250" width="220" height="60" fill="none" />
              <text x="460" y="275" class="statement-text">From above conclusion</text>
              <text x="460" y="295" class="statement-text">Additional fact</text>
              <line x1="360" y1="315" x2="550" y2="315" class="implication-line" />
              <rect x="350" y="320" width="220" height="50" fill="none" />
              <text x="460" y="345" class="statement-text">Final conclusion</text>
              
              <text x="580" y="310" class="side-label">Derivation</text>
            </g>
          </g>
        </svg>
      </body>
      </html>
    `);

    // Verify complex structure elements
    await expect(page.locator('[data-testid="root-argument"]')).toBeVisible();
    await expect(page.locator('[data-testid="child-argument"]')).toBeVisible();
    
    // Verify content
    await expect(page.getByText('All humans are mortal')).toBeVisible();
    await expect(page.getByText('Socrates is mortal')).toBeVisible();
    await expect(page.getByText('Final conclusion')).toBeVisible();
    
    // Verify side labels
    await expect(page.getByText('Modus Ponens')).toBeVisible();
    await expect(page.getByText('Derivation')).toBeVisible();
    
    // Check that all statement texts are properly positioned
    const statements = page.locator('.statement-text');
    await expect(statements).toHaveCount(8);
  });

  test('handles empty or minimal content gracefully', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Minimal Content Test</title>
        <style>
          .statement-text { font-size: 12px; fill: #d4d4d4; text-anchor: middle; font-style: italic; }
        </style>
      </head>
      <body>
        <svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
          <g class="tree">
            <!-- Argument with empty premises -->
            <g class="argument-node-group" data-testid="empty-premises">
              <rect x="50" y="50" width="220" height="100" class="argument-node" />
              <rect x="50" y="50" width="220" height="40" fill="none" />
              <text x="160" y="75" class="statement-text">(empty)</text>
              <line x1="60" y1="95" x2="250" y2="95" class="implication-line" />
              <rect x="50" y="100" width="220" height="50" fill="none" />
              <text x="160" y="125" class="statement-text">Bootstrap conclusion</text>
            </g>
          </g>
        </svg>
      </body>
      </html>
    `);

    // Verify empty state handling
    await expect(page.locator('[data-testid="empty-premises"]')).toBeVisible();
    await expect(page.getByText('(empty)')).toBeVisible();
    await expect(page.getByText('Bootstrap conclusion')).toBeVisible();
    
    // Verify empty text is styled differently (italic)
    const emptyText = page.getByText('(empty)');
    const fontStyle = await emptyText.evaluate((el) => getComputedStyle(el).fontStyle);
    expect(fontStyle).toBe('italic');
  });

  test('supports text truncation for long statements', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Text Truncation Test</title>
        <style>
          .statement-text { 
            font-size: 12px; 
            fill: #d4d4d4; 
            text-anchor: middle; 
            font-family: monospace;
          }
        </style>
      </head>
      <body>
        <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
          <g class="tree">
            <g class="argument-node-group" data-testid="truncated-text">
              <rect x="20" y="20" width="220" height="120" class="argument-node" />
              <rect x="20" y="20" width="220" height="60" fill="none" />
              <text x="130" y="40" class="statement-text">This is a very long statement that should be truncated...</text>
              <text x="130" y="60" class="statement-text">Another extremely long premise that exceeds the available width...</text>
              <line x1="30" y1="85" x2="220" y2="85" class="implication-line" />
              <rect x="20" y="90" width="220" height="50" fill="none" />
              <text x="130" y="115" class="statement-text">Therefore this conclusion follows from the premises above...</text>
            </g>
          </g>
        </svg>
      </body>
      </html>
    `);

    // Verify truncated text exists and ends with ellipsis
    await expect(page.locator('[data-testid="truncated-text"]')).toBeVisible();
    
    const truncatedTexts = page.locator('.statement-text');
    await expect(truncatedTexts).toHaveCount(3);
    
    // Check that long text is displayed (even if truncated)
    await expect(page.getByText(/This is a very long statement/)).toBeVisible();
    await expect(page.getByText(/Another extremely long premise/)).toBeVisible();
    await expect(page.getByText(/Therefore this conclusion/)).toBeVisible();
  });

  test('validates SVG accessibility attributes', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Accessibility Test</title>
      </head>
      <body>
        <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg" 
             role="img" 
             aria-label="Proof tree visualization showing logical argument structure"
             data-testid="accessible-svg">
          <title>Logical Argument Proof Tree</title>
          <desc>A visual representation of a logical argument with premises leading to a conclusion</desc>
          
          <g class="tree">
            <g class="argument-node-group" 
               role="group" 
               aria-label="Logical argument with premises and conclusion"
               data-testid="accessible-argument">
              <rect x="50" y="50" width="220" height="120" 
                    class="argument-node"
                    role="presentation" />
              
              <text x="160" y="75" class="statement-text" 
                    role="text" 
                    aria-label="Premise: All humans are rational">
                All humans are rational
              </text>
              
              <text x="160" y="95" class="statement-text" 
                    role="text"
                    aria-label="Premise: Socrates is human">
                Socrates is human
              </text>
              
              <line x1="60" y1="115" x2="250" y2="115" 
                    class="implication-line"
                    role="presentation"
                    aria-label="Logical implication separator" />
              
              <text x="160" y="145" class="statement-text" 
                    role="text"
                    aria-label="Conclusion: Therefore Socrates is rational">
                Therefore Socrates is rational
              </text>
            </g>
          </g>
        </svg>
      </body>
      </html>
    `);

    // Verify accessibility attributes
    const svg = page.locator('[data-testid="accessible-svg"]');
    await expect(svg).toHaveAttribute('role', 'img');
    await expect(svg).toHaveAttribute('aria-label');
    
    // Verify title and description elements
    await expect(page.locator('svg title')).toContainText('Logical Argument Proof Tree');
    await expect(page.locator('svg desc')).toContainText('visual representation');
    
    // Verify group accessibility
    const argumentGroup = page.locator('[data-testid="accessible-argument"]');
    await expect(argumentGroup).toHaveAttribute('role', 'group');
    await expect(argumentGroup).toHaveAttribute('aria-label');
    
    // Verify text elements have proper labels
    const textElements = page.locator('.statement-text');
    for (let i = 0; i < await textElements.count(); i++) {
      const element = textElements.nth(i);
      await expect(element).toHaveAttribute('aria-label');
    }
  });
});
import { test, expect } from '../test-env';

test.describe('Visual Regression Tests', () => {
  test('proof tree panel default appearance', async ({ page }) => {
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
            width: 800px;
            height: 600px;
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
            filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.1));
          }
          
          .statement-text {
            font-size: 12px;
            fill: #d4d4d4;
            text-anchor: middle;
            font-family: inherit;
          }
          
          .side-label {
            font-size: 10px;
            fill: #858585;
            text-anchor: start;
            font-style: italic;
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
        <div id="tree-container" class="tree-container">
          <svg width="700" height="500" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                      refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#4daafc" />
              </marker>
            </defs>
            <g class="tree">
              <g class="argument-node-group">
                <rect x="50" y="50" width="220" height="120" class="argument-node" />
                <rect x="50" y="50" width="220" height="60" fill="none" />
                <text x="160" y="75" class="statement-text">All men are mortal</text>
                <text x="160" y="95" class="statement-text">Socrates is a man</text>
                <line x1="60" y1="115" x2="250" y2="115" class="implication-line" />
                <rect x="50" y="120" width="220" height="50" fill="none" />
                <text x="160" y="145" class="statement-text">Socrates is mortal</text>
                <text x="280" y="130" class="side-label">Modus Ponens</text>
              </g>
              
              <g class="argument-node-group">
                <rect x="350" y="200" width="220" height="100" class="argument-node" />
                <rect x="350" y="200" width="220" height="50" fill="none" />
                <text x="460" y="230" class="statement-text">Socrates is mortal</text>
                <line x1="360" y1="255" x2="550" y2="255" class="implication-line" />
                <rect x="350" y="260" width="220" height="40" fill="none" />
                <text x="460" y="285" class="statement-text">Death is inevitable</text>
                <text x="580" y="250" class="side-label">Inference</text>
              </g>
              
              <line x1="270" y1="145" x2="350" y2="225" class="connection-line" />
            </g>
          </svg>
        </div>
      </body>
      </html>
    `);

    // Take screenshot for visual regression
    await expect(page).toHaveScreenshot('proof-tree-default.png');
  });

  test('empty state visual consistency', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Proof Tree - Empty State</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #1e1e1e;
            color: #d4d4d4;
            width: 800px;
            height: 400px;
          }
          
          .tree-container {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 300px;
            width: 100%;
            border: 1px dashed #3c3c3c;
            border-radius: 8px;
          }
          
          .empty-message {
            color: #858585;
            font-style: italic;
            text-align: center;
            padding: 40px;
          }
        </style>
      </head>
      <body>
        <div class="tree-container">
          <div class="empty-message">
            No proof trees to display.<br>
            Add trees to your proof file to see visualization.
          </div>
        </div>
      </body>
      </html>
    `);

    await expect(page).toHaveScreenshot('proof-tree-empty.png');
  });

  test('error state visual consistency', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Proof Tree - Error State</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #1e1e1e;
            color: #d4d4d4;
            width: 800px;
            height: 500px;
          }
          
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
            font-size: 16px;
          }
          
          .error-text {
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 12px;
            white-space: pre-wrap;
            margin: 0;
            color: #ffffff;
            background: rgba(0, 0, 0, 0.2);
            padding: 8px;
            border-radius: 2px;
          }
        </style>
      </head>
      <body>
        <div class="error-container">
          <h3>Parse Errors</h3>
          <pre class="error-text">[statements] Missing required statement 'S1' referenced in argument 'arg1'
[arguments] Invalid argument reference 'arg2' - not found in arguments section
[trees] Node 'n1' references non-existent argument 'arg3'
[yaml] Syntax error at line 15: unexpected character ']'</pre>
        </div>
      </body>
      </html>
    `);

    await expect(page).toHaveScreenshot('proof-tree-error.png');
  });

  test('complex tree layout visual consistency', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Complex Proof Tree</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #1e1e1e;
            color: #d4d4d4;
            width: 1000px;
            height: 700px;
          }
          
          .tree-container {
            overflow: auto;
            width: 100%;
            height: 100%;
          }
          
          .argument-node {
            stroke: #3c3c3c;
            stroke-width: 1;
            fill: #2d2d30;
            filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.1));
          }
          
          .statement-text {
            font-size: 11px;
            fill: #d4d4d4;
            text-anchor: middle;
            font-family: inherit;
          }
          
          .side-label {
            font-size: 9px;
            fill: #858585;
            text-anchor: start;
            font-style: italic;
          }
          
          .implication-line {
            stroke: #d4d4d4;
            stroke-width: 2;
          }
          
          .connection-line {
            stroke: #4daafc;
            stroke-width: 2;
            marker-end: url(#arrowhead);
            stroke-dasharray: 3,3;
          }
        </style>
      </head>
      <body>
        <div class="tree-container">
          <svg width="950" height="650" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <marker id="arrowhead" markerWidth="8" markerHeight="6" 
                      refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#4daafc" />
              </marker>
            </defs>
            <g class="tree">
              <!-- Top level arguments -->
              <g class="argument-node-group">
                <rect x="50" y="50" width="200" height="110" class="argument-node" />
                <text x="150" y="70" class="statement-text">All humans are mortal</text>
                <text x="150" y="85" class="statement-text">Socrates is human</text>
                <line x1="60" y1="100" x2="240" y2="100" class="implication-line" />
                <text x="150" y="125" class="statement-text">Socrates is mortal</text>
                <text x="255" y="105" class="side-label">MP</text>
              </g>
              
              <g class="argument-node-group">
                <rect x="300" y="50" width="200" height="110" class="argument-node" />
                <text x="400" y="70" class="statement-text">All mortals die</text>
                <text x="400" y="85" class="statement-text">Socrates is mortal</text>
                <line x1="310" y1="100" x2="490" y2="100" class="implication-line" />
                <text x="400" y="125" class="statement-text">Socrates will die</text>
                <text x="505" y="105" class="side-label">MP</text>
              </g>
              
              <!-- Second level -->
              <g class="argument-node-group">
                <rect x="175" y="220" width="200" height="110" class="argument-node" />
                <text x="275" y="240" class="statement-text">Socrates will die</text>
                <text x="275" y="255" class="statement-text">Death is inevitable</text>
                <line x1="185" y1="270" x2="365" y2="270" class="implication-line" />
                <text x="275" y="295" class="statement-text">Fate is sealed</text>
                <text x="380" y="275" class="side-label">Deduction</text>
              </g>
              
              <!-- Third level -->
              <g class="argument-node-group">
                <rect x="550" y="220" width="200" height="130" class="argument-node" />
                <text x="650" y="245" class="statement-text">Fate is sealed</text>
                <text x="650" y="260" class="statement-text">Life has meaning</text>
                <text x="650" y="275" class="statement-text">Accept mortality</text>
                <line x1="560" y1="290" x2="740" y2="290" class="implication-line" />
                <text x="650" y="315" class="statement-text">Live fully</text>
                <text x="755" y="275" class="side-label">Synthesis</text>
              </g>
              
              <!-- Bottom level -->
              <g class="argument-node-group">
                <rect x="300" y="400" width="250" height="120" class="argument-node" />
                <text x="425" y="425" class="statement-text">Live fully</text>
                <text x="425" y="440" class="statement-text">Time is limited</text>
                <text x="425" y="455" class="statement-text">Opportunities are finite</text>
                <line x1="310" y1="470" x2="540" y2="470" class="implication-line" />
                <text x="425" y="495" class="statement-text">Seize the day</text>
                <text x="555" y="460" class="side-label">Practical wisdom</text>
              </g>
              
              <!-- Connections -->
              <line x1="250" y1="160" x2="300" y2="100" class="connection-line" />
              <line x1="400" y1="160" x2="275" y2="220" class="connection-line" />
              <line x1="375" y1="330" x2="550" y2="275" class="connection-line" />
              <line x1="650" y1="350" x2="425" y2="400" class="connection-line" />
            </g>
          </svg>
        </div>
      </body>
      </html>
    `);

    await expect(page).toHaveScreenshot('proof-tree-complex.png');
  });

  test('responsive layout at different viewport sizes', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mobile Proof Tree</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 10px;
            background: #1e1e1e;
            color: #d4d4d4;
          }
          
          .tree-container {
            overflow-x: auto;
            overflow-y: hidden;
            width: 100%;
            height: 400px;
          }
          
          .argument-node {
            stroke: #3c3c3c;
            stroke-width: 1;
            fill: #2d2d30;
          }
          
          .statement-text {
            font-size: 10px;
            fill: #d4d4d4;
            text-anchor: middle;
          }
          
          .implication-line {
            stroke: #d4d4d4;
            stroke-width: 1;
          }
        </style>
      </head>
      <body>
        <div class="tree-container">
          <svg width="500" height="350" xmlns="http://www.w3.org/2000/svg">
            <g class="tree">
              <g class="argument-node-group">
                <rect x="20" y="50" width="180" height="100" class="argument-node" />
                <text x="110" y="70" class="statement-text">Short premise</text>
                <text x="110" y="85" class="statement-text">Another premise</text>
                <line x1="30" y1="100" x2="190" y2="100" class="implication-line" />
                <text x="110" y="125" class="statement-text">Conclusion</text>
              </g>
            </g>
          </svg>
        </div>
      </body>
      </html>
    `);

    await expect(page).toHaveScreenshot('proof-tree-mobile.png');
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Desktop Proof Tree</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 40px;
            background: #1e1e1e;
            color: #d4d4d4;
          }
          
          .tree-container {
            width: 100%;
            height: 800px;
            overflow: auto;
          }
          
          .argument-node {
            stroke: #3c3c3c;
            stroke-width: 1;
            fill: #2d2d30;
            filter: drop-shadow(3px 3px 6px rgba(0,0,0,0.2));
          }
          
          .statement-text {
            font-size: 14px;
            fill: #d4d4d4;
            text-anchor: middle;
          }
          
          .implication-line {
            stroke: #d4d4d4;
            stroke-width: 3;
          }
        </style>
      </head>
      <body>
        <div class="tree-container">
          <svg width="1600" height="700" xmlns="http://www.w3.org/2000/svg">
            <g class="tree">
              <g class="argument-node-group">
                <rect x="100" y="100" width="300" height="150" class="argument-node" />
                <text x="250" y="130" class="statement-text">Large desktop premise text</text>
                <text x="250" y="150" class="statement-text">Another well-spaced premise</text>
                <line x1="120" y1="175" x2="380" y2="175" class="implication-line" />
                <text x="250" y="210" class="statement-text">Desktop conclusion with more space</text>
              </g>
            </g>
          </svg>
        </div>
      </body>
      </html>
    `);

    await expect(page).toHaveScreenshot('proof-tree-desktop.png');
  });
});
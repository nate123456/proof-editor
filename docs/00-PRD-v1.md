# Product Requirements Document: Proof Editor V1

## Executive Summary

Proof Editor is a visual tool for constructing and analyzing formal logical arguments. V1 follows a two-phase development approach:
- **Phase 1**: Standalone web application with 90% of features, developed using test-driven development
- **Phase 2**: VS Code extension wrapper for IDE integration

This approach enables comprehensive automated testing, faster iteration, and higher code quality through TDD practices.

### Key Innovation
Unlike traditional proof assistants that require specific logical syntax, Proof Editor is semantically neutral - it provides the structure for organizing logical arguments while allowing users (through language layers) to define what constitutes valid logic.

### Development Philosophy
- **Test-Driven Development**: Every feature has automated tests before implementation
- **Modular Architecture**: Core logic separate from UI, both separate from VS Code
- **Automated Everything**: Unit tests, integration tests, E2E tests with Cypress
- **Fast Iteration**: Develop and test without VS Code overhead

### Target Users
- Logic students learning formal proof construction
- Researchers documenting logical arguments
- Philosophers developing complex reasoning chains
- Anyone needing to visualize logical relationships

## Core Concepts

### Statement
A reusable piece of text (like "All men are mortal") that can function as either a premise or conclusion. Each Statement has a unique ID that persists across edits.

### Atomic Argument
A logical inference consisting of:
- Zero or more premises (ordered list of Statements)
- Zero or more conclusions (ordered list of Statements)
- Optional metadata (rule name, side labels)

### Connection
An implicit relationship that exists when the same Statement appears as a conclusion in one atomic argument and as a premise in another. No separate connection entity needed - connections emerge from shared Statement references.

### Argument Tree
A collection of atomic arguments connected through shared Statements, forming a tree-like structure of logical dependencies. While users conceptualize these as trees, the implementation allows premises to have multiple parents (graph structure).

## Phase 1: Standalone Web Application

### User Stories with Test Requirements

#### 1. Creating a First Proof
**As a** logic student  
**I want to** create a simple modus ponens proof  
**So that** I can visualize the logical structure

**Acceptance Criteria:**
- Can create new proof document
- Can create atomic argument with two premises and one conclusion
- Can type logical statements using keyboard
- Can save and reload the proof

**Test Specifications:**
```typescript
describe('Statement', () => {
  it('generates unique IDs for identical text', () => {
    const stmt1 = new Statement('All men are mortal');
    const stmt2 = new Statement('All men are mortal');
    expect(stmt1.id).not.toBe(stmt2.id);
  });
});

describe('AtomicArgument', () => {
  it('resolves Statement references correctly', () => {
    const arg = new AtomicArgument({
      premises: [stmt1.id, stmt2.id],
      conclusions: [stmt3.id]
    });
    expect(arg.getPremiseStatements()).toEqual([stmt1, stmt2]);
  });
});

describe('Proof Construction', () => {
  it('creates modus ponens proof through UI', () => {
    cy.visit('/');
    cy.get('[data-testid="canvas"]').click();
    cy.keyboard('n');
    cy.type('All men are mortal');
    cy.keyboard('{tab}');
    cy.type('Socrates is a man');
    cy.keyboard('{enter}');
    cy.keyboard('{tab}');
    cy.type('Socrates is mortal');
    
    cy.get('[data-testid="argument-node"]').should('have.length', 1);
    cy.get('[data-testid="statement"]').should('have.length', 3);
  });
});
```

#### 2. Building Complex Arguments
**As a** researcher  
**I want to** branch from existing conclusions to create deeper proofs  
**So that** I can build complex logical chains

**Acceptance Criteria:**
- Can select a specific Statement using Tab key
- Can press 'b' to create new atomic argument using that Statement
- New argument appears visually connected to parent
- Can navigate between connected arguments with keyboard

**Test Specifications:**
```typescript
describe('Branching', () => {
  it('creates connection with shared Statement', () => {
    const connection = branchFromConclusion(parent.id, 0);
    expect(connection.childArgument.premises[0]).toBe(parent.conclusions[0]);
  });
});

describe('Branching UI', () => {
  it('branches from selected conclusion', () => {
    cy.createArgument(['P1', 'P2'], ['C1']);
    
    cy.keyboard('{tab}{tab}{tab}');
    cy.keyboard('b');
    
    cy.get('[data-testid="argument-node"]').should('have.length', 2);
    cy.get('[data-testid="connection-line"]').should('exist');
    cy.get('[data-testid="argument-node"]').last()
      .find('[data-testid="premise"]').first()
      .should('contain', 'C1');
  });
});
```

#### 3. Navigating Large Proofs
**As a** user working with complex proofs  
**I want to** pan, zoom, and jump between arguments  
**So that** I can understand the overall structure

**Acceptance Criteria:**
- Can pan canvas with mouse drag or keyboard
- Can zoom in/out with mouse wheel or keyboard
- Can navigate to connected arguments with Ctrl+Arrow keys
- Visual feedback shows current selection

**Test Specifications:**
```typescript
describe('NavigationManager', () => {
  it('updates selection when navigating to child', () => {
    const nav = new NavigationManager(canvas);
    nav.selectArgument(arg1.id);
    nav.navigateToChild();
    expect(nav.selectedId).toBe(arg2.id);
  });
});

describe('Keyboard Navigation', () => {
  it('navigates between connected arguments', () => {
    cy.createConnectedArguments(3);
    
    cy.keyboard('{ctrl}{rightarrow}');
    cy.get('[data-testid="selected-argument"]')
      .should('have.attr', 'data-argument-id', 'arg2');
      
    cy.keyboard('{ctrl}{rightarrow}');
    cy.get('[data-testid="selected-argument"]')
      .should('have.attr', 'data-argument-id', 'arg3');
  });
});
```

#### 4. Editing and Refining
**As a** user developing a proof  
**I want to** edit Statements and rearrange arguments  
**So that** I can refine my logical reasoning

**Acceptance Criteria:**
- Can edit Statement text without breaking connections
- Can reorder premises within an atomic argument
- Can delete atomic arguments with smart focus management
- Changes reflected immediately in visual display

**Test Specifications:**
```typescript
describe('Statement Editing', () => {
  it('preserves connections when text changes', () => {
    const stmt = new Statement('Original text');
    const arg1 = new AtomicArgument({ conclusions: [stmt.id] });
    const arg2 = new AtomicArgument({ premises: [stmt.id] });
    
    stmt.updateText('Updated text');
    
    expect(getConnections(arg1, arg2)).toHaveLength(1);
    expect(stmt.text).toBe('Updated text');
  });
});

describe('Inline Editing', () => {
  it('edits statement text inline', () => {
    cy.createArgument(['Premise'], ['Conclusion']);
    cy.get('[data-testid="statement"]').first().click();
    cy.keyboard('{enter}');
    cy.focused().clear().type('Updated Premise');
    cy.keyboard('{enter}');
    
    cy.get('[data-testid="statement"]').first()
      .should('contain', 'Updated Premise');
  });
});
```

### Phase 1 Functional Requirements

#### Core Logic Module
- Statement management with UUID generation
- Atomic argument CRUD operations
- Connection discovery algorithm
- Tree traversal and path computation
- YAML serialization/deserialization
- Undo/redo system

#### Visual Editor Module  
- Canvas rendering with Konva.js and React
- Atomic argument node components
- Connection line rendering
- Selection management
- Keyboard event handling
- Mouse interaction (pan, zoom, click)
- Layout algorithms (tree positioning)

#### File System Abstraction
- In-memory file storage for testing
- Local storage persistence
- Import/export YAML files
- Auto-save functionality

#### Testing Infrastructure
- Jest for unit and integration tests
- Cypress for E2E tests
- Visual regression testing
- Performance benchmarks
- Code coverage > 90%

### Phase 1 Architecture

```
proof-editor/
├── packages/
│   ├── core/                      # Business logic (no UI)
│   │   ├── models/
│   │   │   ├── Statement.ts
│   │   │   ├── AtomicArgument.ts
│   │   │   └── Document.ts
│   │   ├── services/
│   │   │   ├── ConnectionDiscovery.ts
│   │   │   ├── TreeLayout.ts
│   │   │   └── YamlSerializer.ts
│   │   └── __tests__/
│   │
│   ├── web-ui/                    # React UI components
│   │   ├── components/
│   │   │   ├── Canvas.tsx
│   │   │   ├── AtomicArgumentNode.tsx
│   │   │   └── ConnectionLine.tsx
│   │   ├── hooks/
│   │   │   ├── useKeyboardNavigation.ts
│   │   │   └── useSelection.ts
│   │   └── __tests__/
│   │
│   └── standalone-app/            # Web app shell
│       ├── public/
│       │   └── index.html
│       ├── src/
│       │   ├── App.tsx
│       │   ├── FileSystemMock.ts
│       │   └── main.tsx
│       └── cypress/
│           ├── e2e/
│           ├── fixtures/
│           └── support/
```

### Phase 1 Testing Strategy

#### Test-Driven Development Process
1. Write E2E test for user story
2. Write integration tests for components
3. Write unit tests for logic
4. Implement minimal code to pass
5. Refactor with confidence

#### Test Pyramid
- **Unit Tests** (70%): Core logic, models, algorithms
- **Integration Tests** (20%): Component interactions, services
- **E2E Tests** (10%): User workflows, visual regression

#### Cypress Test Patterns
```typescript
Cypress.Commands.add('createArgument', (premises, conclusions) => {
  cy.get('[data-testid="canvas"]').click();
  cy.keyboard('n');
  premises.forEach((p, i) => {
    cy.type(p);
    if (i < premises.length - 1) cy.keyboard('{tab}');
  });
  cy.keyboard('{enter}');
  conclusions.forEach((c, i) => {
    cy.type(c);
    if (i < conclusions.length - 1) cy.keyboard('{tab}');
  });
});

describe('Visual Regression', () => {
  it('renders complex proof correctly', () => {
    cy.loadFixture('socrates-proof.yaml');
    cy.get('[data-testid="canvas"]').matchImageSnapshot();
  });
});

describe('Performance', () => {
  it('handles 100 arguments without lag', () => {
    cy.createManyArguments(100);
    cy.measurePerformance('navigation', () => {
      cy.keyboard('{ctrl}{rightarrow}'.repeat(50));
    }).should('be.below', 1000);
  });
});
```

## Phase 2: VS Code Integration

### Additional User Stories

#### 5. VS Code File Management
**As a** VS Code user  
**I want to** manage .proof files like any other code file  
**So that** I can use familiar workflows

**Acceptance Criteria:**
- .proof files appear in explorer with custom icon
- Double-click opens visual editor
- Supports multiple editor tabs
- Integrates with source control

#### 6. Command Palette Integration
**As a** power user  
**I want to** access proof commands via command palette  
**So that** I can work efficiently

**Acceptance Criteria:**
- All major operations available as commands
- Keyboard shortcuts registered
- Commands show in palette with descriptions

### Phase 2 Architecture

```typescript
export function activate(context: vscode.ExtensionContext) {
  const provider = new ProofEditorProvider(context);
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      'proofEditor.editor',
      provider
    )
  );
  
  registerCommands(context);
}

class ProofEditorProvider implements vscode.CustomTextEditorProvider {
  resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel
  ) {
    webviewPanel.webview.html = getWebviewContent();
    
    webviewPanel.webview.onDidReceiveMessage(msg => {
      if (msg.type === 'save') {
        document.save();
      }
    });
  }
}
```

### File Format

```yaml
version: "1.0"

statements:
  s1: "All men are mortal"
  s2: "Socrates is a man"  
  s3: "Socrates is mortal"

arguments:
  arg1:
    premises: [s1, s2]
    conclusions: [s3]
    rule: "Modus Ponens"

trees:
  main: arg1  # Simplified format (defaults to position [0, 0])
```

## Non-Functional Requirements

### Performance
- Handle proofs with 100-500 atomic arguments smoothly
- Sub-100ms response time for user interactions
- 60 FPS canvas rendering
- < 50MB memory footprint for typical proofs

### Quality
- 90%+ test coverage
- Zero critical bugs in production
- All user interactions tested automatically
- Visual regression tests for all states

### Developer Experience  
- Hot module reloading in < 2s
- Run all tests in < 30s
- Single command to run standalone app
- Clear separation of concerns

## Success Criteria

### Phase 1 Completion
- All user stories implemented with passing tests
- Cypress E2E suite covers all workflows
- Performance benchmarks met
- Standalone app deployable to web

### Phase 2 Completion
- VS Code extension published
- Seamless integration with VS Code workflows
- No regressions from Phase 1
- User documentation complete

## Development Timeline

### Phase 1: Standalone App (8 weeks)
- Week 1-2: Core logic with TDD
- Week 3-4: UI components with tests
- Week 5-6: Integration and polish
- Week 7-8: Performance optimization

### Phase 2: VS Code Integration (2 weeks)
- Week 1: Extension wrapper
- Week 2: Testing and polish

## Development Principles

The engineering values, coding standards, and architectural patterns for this project are documented separately to keep the PRD focused on product requirements.

See [Development Principles](./dev-principles.md) for:
- Core engineering values (DDD, TDD, SOLID)
- Modern TypeScript practices
- Code quality standards
- Architecture patterns
- Testing standards
- Performance guidelines

## Appendix: Key Design Decisions

### Why Two-Phase Approach?
- 90% of features testable without VS Code
- Faster development iteration
- Better test coverage possible
- Cleaner architecture

### Why TDD?
- Ensures every feature is testable
- Catches bugs early
- Enables confident refactoring
- Documents intended behavior

### Why Cypress?
- Real browser testing
- Visual regression support
- Great developer experience
- Extensive plugin ecosystem
/**
 * Basic User Workflow Integration Tests
 *
 * Tests covering complete user journeys for different persona types
 * from initial setup through proof construction workflows.
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type { DocumentQueryService } from '../../application/services/DocumentQueryService.js';
import type { ProofApplicationService } from '../../application/services/ProofApplicationService.js';
import { activate, deactivate } from '../../extension/extension.js';
import {
  type ApplicationContainer,
  getContainer,
  initializeContainer,
} from '../../infrastructure/di/container.js';
import { TOKENS } from '../../infrastructure/di/tokens.js';
import type { YAMLSerializer } from '../../infrastructure/repositories/yaml/YAMLSerializer.js';

// User persona definitions for realistic testing
interface UserPersona {
  name: string;
  skill_level: 'beginner' | 'intermediate' | 'expert';
  primary_use_case: string;
  typical_document_size: 'small' | 'medium' | 'large';
  collaboration_frequency: 'never' | 'occasional' | 'frequent';
}

const USER_PERSONAS: UserPersona[] = [
  {
    name: 'Philosophy Student',
    skill_level: 'beginner',
    primary_use_case: 'learning logical reasoning',
    typical_document_size: 'small',
    collaboration_frequency: 'occasional',
  },
  {
    name: 'Logic Professor',
    skill_level: 'expert',
    primary_use_case: 'teaching and research',
    typical_document_size: 'large',
    collaboration_frequency: 'frequent',
  },
  {
    name: 'Software Architect',
    skill_level: 'intermediate',
    primary_use_case: 'documenting system design decisions',
    typical_document_size: 'medium',
    collaboration_frequency: 'frequent',
  },
  {
    name: 'Legal Researcher',
    skill_level: 'intermediate',
    primary_use_case: 'structuring legal arguments',
    typical_document_size: 'large',
    collaboration_frequency: 'occasional',
  },
];

// Mock VS Code environment with enhanced user interaction simulation
const createUserInteractionMocks = () => {
  const userInputQueue: string[] = [];
  let inputIndex = 0;

  const mockUserInput = (inputs: string[]) => {
    userInputQueue.push(...inputs);
    inputIndex = 0;
  };

  const getNextInput = () => {
    if (inputIndex < userInputQueue.length) {
      return userInputQueue[inputIndex++];
    }
    return 'default-input';
  };

  const mockDocument = {
    fileName: '/test/user-workflow.proof',
    languageId: 'proof',
    version: 1,
    isDirty: false,
    isClosed: false,
    isUntitled: false,
    uri: {
      scheme: 'file',
      authority: '',
      path: '/test/user-workflow.proof',
      query: '',
      fragment: '',
      fsPath: '/test/user-workflow.proof',
      toString: () => 'file:///test/user-workflow.proof',
      toJSON: () => ({ scheme: 'file', path: '/test/user-workflow.proof' }),
      with: vi.fn(),
    },
    getText: vi.fn(() => ''),
    save: vi.fn().mockResolvedValue(true),
    lineAt: vi.fn(),
    lineCount: 1,
    offsetAt: vi.fn().mockReturnValue(0),
    positionAt: vi.fn(),
    getWordRangeAtPosition: vi.fn(),
    validateRange: vi.fn(),
    validatePosition: vi.fn(),
    eol: 1,
  };

  const mockTextEditor = {
    document: mockDocument,
    viewColumn: vscode.ViewColumn.One,
    selection: { active: { line: 0, character: 0 }, anchor: { line: 0, character: 0 } },
    selections: [],
    visibleRanges: [],
    options: { tabSize: 2, insertSpaces: true },
    edit: vi.fn().mockResolvedValue(true),
    insertSnippet: vi.fn().mockResolvedValue(true),
    setDecorations: vi.fn(),
    revealRange: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
  };

  const mockWebviewPanel = {
    webview: {
      html: '',
      options: { enableScripts: true },
      onDidReceiveMessage: vi.fn(() => ({ dispose: vi.fn() })),
      postMessage: vi.fn().mockResolvedValue(true),
      asWebviewUri: vi.fn(),
      cspSource: 'vscode-webview:',
    },
    title: 'User Workflow Test',
    viewType: 'proofTreeVisualization',
    viewColumn: vscode.ViewColumn.Two,
    active: true,
    visible: true,
    options: { retainContextWhenHidden: true },
    reveal: vi.fn(),
    dispose: vi.fn(),
    onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
    onDidChangeViewState: vi.fn(() => ({ dispose: vi.fn() })),
  };

  return {
    mockUserInput,
    getNextInput,
    mockDocument,
    mockTextEditor,
    mockWebviewPanel,
  };
};

// Generate content for different user persona scenarios
const generatePersonaContent = (persona: UserPersona): string => {
  const templates = {
    'Philosophy Student': `
# Introduction to Logical Arguments
# Student practice exercise

statements:
  p1: "All humans are mortal"
  p2: "Socrates is human"
  c1: "Therefore, Socrates is mortal"

arguments:
  syllogism:
    premises: [p1, p2]
    conclusions: [c1]
    metadata:
      rule: "Universal Instantiation"
      difficulty: "beginner"

trees:
- id: first_argument
  offset: { x: 50, y: 50 }
  nodes:
    n1: {arg: syllogism}

metadata:
  title: "My First Logic Exercise"
  course: "PHIL 101"
  assignment: "Homework 3"
`,
    'Logic Professor': `
# Advanced Modal Logic Proof
# Research paper supporting material

statements:
  axiom_k: "□(p → q) → (□p → □q)"
  axiom_t: "□p → p"
  rule_gen: "If ⊢ p, then ⊢ □p"
  theorem_1: "□(p ∧ q) ↔ (□p ∧ □q)"
  lemma_1: "□(p → q) ∧ □p → □q"
  proof_step_1: "Assume □(p ∧ q)"
  proof_step_2: "By distribution: □p ∧ □q"
  
arguments:
  modal_dist_forward:
    premises: [axiom_k, proof_step_1]
    conclusions: [proof_step_2]
    metadata:
      rule: "Modal Distribution"
      complexity: "advanced"
      
  modal_dist_backward:
    premises: [axiom_k, proof_step_2]
    conclusions: [proof_step_1]
    metadata:
      rule: "Modal Distribution (Converse)"
      complexity: "advanced"

trees:
- id: modal_proof_tree
  offset: { x: 0, y: 0 }
  nodes:
    n1: {arg: modal_dist_forward}
    n2: {arg: modal_dist_backward}
    n3: {n1: modal_dist_backward, on: 0}

metadata:
  title: "Modal Logic Distribution Theorem"
  journal: "Journal of Symbolic Logic"
  complexity: "research_level"
`,
    'Software Architect': `
# System Design Decision: Microservices vs Monolith
# Architecture documentation

statements:
  req_scalability: "System must handle 10M+ requests/day"
  req_team_size: "Development team has 50+ engineers"
  req_deployment: "Need independent deployment cycles"
  benefit_micro_scale: "Microservices enable horizontal scaling"
  benefit_micro_teams: "Microservices support autonomous teams"
  benefit_mono_simple: "Monolith reduces operational complexity"
  cost_micro_ops: "Microservices increase operational overhead"
  decision: "Choose microservices architecture"

arguments:
  scalability_arg:
    premises: [req_scalability, benefit_micro_scale]
    conclusions: [decision]
    metadata:
      weight: 0.8
      source: "Performance Analysis"
      
  team_arg:
    premises: [req_team_size, benefit_micro_teams]
    conclusions: [decision]
    metadata:
      weight: 0.7
      source: "Conway's Law"
      
  complexity_counter:
    premises: [cost_micro_ops, benefit_mono_simple]
    conclusions: ["Consider monolith"]
    metadata:
      weight: 0.6
      source: "Operational Experience"

trees:
- id: architecture_decision
  offset: { x: 100, y: 100 }
  nodes:
    n1: {arg: scalability_arg}
    n2: {arg: team_arg}
    n3: {arg: complexity_counter}

metadata:
  title: "Architecture Decision Record 001"
  date: "2024-01-15"
  decision_type: "architectural"
  status: "approved"
`,
    'Legal Researcher': `
# Contract Interpretation Precedent Analysis
# Legal brief supporting argument

statements:
  contract_clause: "Party shall use 'best efforts' to complete delivery"
  precedent_1: "Bloor v. Falstaff (1979): 'best efforts' requires extraordinary measures"
  precedent_2: "UCC § 2-306: 'best efforts' bounded by commercial reasonableness"
  fact_scenario: "Defendant ceased production due to supply chain disruption"
  legal_standard: "Contract interpretation requires good faith efforts"
  conclusion_breach: "Defendant breached best efforts obligation"
  conclusion_no_breach: "Defendant met best efforts standard"

arguments:
  strict_interpretation:
    premises: [contract_clause, precedent_1, fact_scenario]
    conclusions: [conclusion_breach]
    metadata:
      jurisdiction: "California"
      strength: "strong"
      
  reasonable_interpretation:
    premises: [contract_clause, precedent_2, legal_standard]
    conclusions: [conclusion_no_breach]
    metadata:
      jurisdiction: "Federal"
      strength: "moderate"

trees:
- id: legal_argument_tree
  offset: { x: 0, y: 0 }
  nodes:
    n1: {arg: strict_interpretation}
    n2: {arg: reasonable_interpretation}

metadata:
  title: "Best Efforts Contract Analysis"
  case_number: "CV-2024-001234"
  court: "Superior Court of California"
  attorney: "Jane Smith, Esq."
`,
  };

  const content = templates[persona.name as keyof typeof templates];
  return content || templates['Philosophy Student'];
};

describe('Basic User Workflow Integration Tests', () => {
  let container: ApplicationContainer;
  let mockContext: any;
  let userMocks: ReturnType<typeof createUserInteractionMocks>;

  beforeAll(async () => {
    // Set up VS Code mocks
    vi.mock('vscode', () => ({
      commands: {
        registerCommand: vi.fn(() => ({ dispose: vi.fn() })),
        executeCommand: vi.fn().mockResolvedValue(undefined),
      },
      window: {
        showInformationMessage: vi.fn().mockImplementation((_message, ...options) => {
          return Promise.resolve(options[0] || 'OK');
        }),
        showErrorMessage: vi.fn().mockResolvedValue('OK'),
        showWarningMessage: vi.fn().mockResolvedValue('OK'),
        showInputBox: vi.fn().mockImplementation(() => {
          return Promise.resolve('test-input');
        }),
        showQuickPick: vi.fn().mockImplementation((items) => {
          return Promise.resolve(Array.isArray(items) ? items[0] : 'test-choice');
        }),
        createWebviewPanel: vi.fn(() => ({
          webview: {
            html: '',
            options: { enableScripts: true },
            onDidReceiveMessage: vi.fn(() => ({ dispose: vi.fn() })),
            postMessage: vi.fn().mockResolvedValue(true),
            asWebviewUri: vi.fn(),
            cspSource: 'vscode-webview:',
          },
          title: 'User Workflow Test',
          viewType: 'proofTreeVisualization',
          viewColumn: 2,
          active: true,
          visible: true,
          options: { retainContextWhenHidden: true },
          reveal: vi.fn(),
          dispose: vi.fn(),
          onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
          onDidChangeViewState: vi.fn(() => ({ dispose: vi.fn() })),
        })),
        activeTextEditor: null, // Will be set per test
        onDidChangeActiveTextEditor: vi.fn(() => ({ dispose: vi.fn() })),
        visibleTextEditors: [],
      },
      workspace: {
        getConfiguration: vi.fn(() => ({
          get: vi.fn(),
          has: vi.fn(),
          inspect: vi.fn(),
          update: vi.fn(),
        })),
        onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
        onDidSaveTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
        onDidOpenTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
        onDidChangeTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
        onDidCloseTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
        createFileSystemWatcher: vi.fn(() => ({
          onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
          onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
          onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
          dispose: vi.fn(),
        })),
        workspaceFolders: [
          {
            uri: { scheme: 'file', path: '/test/workspace' },
            name: 'test-workspace',
            index: 0,
          },
        ],
        textDocuments: [],
        openTextDocument: vi.fn(),
      },
      ViewColumn: { One: 1, Two: 2, Three: 3 },
      Uri: {
        file: vi.fn((path) => ({
          scheme: 'file',
          path,
          fsPath: path,
          toString: () => `file://${path}`,
        })),
        parse: vi.fn(),
        joinPath: vi.fn((base, ...parts) => ({
          scheme: base.scheme,
          path: `${base.path}/${parts.join('/')}`,
          fsPath: `${base.path}/${parts.join('/')}`,
        })),
      },
      languages: {
        createDiagnosticCollection: vi.fn(() => ({
          set: vi.fn(),
          delete: vi.fn(),
          clear: vi.fn(),
          dispose: vi.fn(),
        })),
        registerDocumentSymbolProvider: vi.fn(() => ({ dispose: vi.fn() })),
        registerDefinitionProvider: vi.fn(() => ({ dispose: vi.fn() })),
        registerHoverProvider: vi.fn(() => ({ dispose: vi.fn() })),
        registerCompletionItemProvider: vi.fn(() => ({ dispose: vi.fn() })),
      },
    }));
  });

  beforeEach(async () => {
    userMocks = createUserInteractionMocks();

    // Create extension context
    mockContext = {
      subscriptions: [],
      extensionPath: '/mock/extension/path',
      extensionUri: { scheme: 'file', path: '/mock/extension/path' },
      globalState: {
        get: vi.fn(),
        update: vi.fn().mockResolvedValue(undefined),
        keys: vi.fn().mockReturnValue([]),
      },
      workspaceState: {
        get: vi.fn(),
        update: vi.fn().mockResolvedValue(undefined),
        keys: vi.fn().mockReturnValue([]),
      },
      storageUri: { scheme: 'file', path: '/mock/storage' },
      globalStorageUri: { scheme: 'file', path: '/mock/global-storage' },
      logUri: { scheme: 'file', path: '/mock/logs' },
      asAbsolutePath: vi.fn((path) => `/mock/extension/path/${path}`),
    };

    // Initialize container and activate extension
    await initializeContainer();
    container = getContainer();
    await activate(mockContext);

    // Set active editor
    (vi.mocked(vscode.window) as any).activeTextEditor = userMocks.mockTextEditor;
  });

  afterEach(() => {
    try {
      deactivate();
    } catch {
      // Ignore deactivation errors in tests
    }
  });

  describe('Complete User Journey Tests', () => {
    USER_PERSONAS.forEach((persona) => {
      it(`should complete ${persona.name.toLowerCase()} workflow successfully`, async () => {
        const startTime = Date.now();

        // Simulate user opening VS Code and creating new proof
        userMocks.mockUserInput([
          `${persona.name.toLowerCase().replace(' ', '-')}-proof`, // Document name
          'All humans are mortal', // First premise
          'Socrates is human', // Second premise
          'Therefore, Socrates is mortal', // Conclusion
          'Modus Ponens', // Rule name
        ]);

        // Step 1: Create new proof document
        const createDocumentCommand = vi
          .mocked(vscode.commands.registerCommand)
          .mock.calls.find((call) => call[0] === 'proofEditor.createBootstrapDocument');

        expect(createDocumentCommand).toBeDefined();

        if (createDocumentCommand) {
          const handler = createDocumentCommand[1] as (...args: unknown[]) => Promise<void>;
          await handler();

          // Verify document creation workflow
          expect(vscode.window.showInputBox).toHaveBeenCalled();
          expect(vscode.window.showInformationMessage).toHaveBeenCalled();
        }

        // Step 2: Populate document with persona-specific content
        const personaContent = generatePersonaContent(persona);
        userMocks.mockDocument.getText.mockReturnValue(personaContent);

        // Step 3: Parse and validate content
        const documentQueryService = container.resolve<DocumentQueryService>(
          TOKENS.DocumentQueryService,
        );
        const parseResult = await documentQueryService.parseDocumentContent(personaContent);

        expect(parseResult.isOk()).toBe(true);

        if (parseResult.isOk()) {
          const proofData = parseResult.value;

          // Verify persona-specific content is parsed correctly
          expect(proofData.statements).toBeDefined();
          expect(proofData.atomicArguments).toBeDefined();
          expect(proofData.id).toContain(
            persona.name.includes('Student')
              ? 'Logic Exercise'
              : persona.name.includes('Professor')
                ? 'Modal Logic'
                : persona.name.includes('Architect')
                  ? 'Architecture'
                  : 'Contract',
          );
        }

        // Step 4: Open proof tree visualization
        const showTreeCommand = vi
          .mocked(vscode.commands.registerCommand)
          .mock.calls.find((call) => call[0] === 'proofEditor.showTree');

        if (showTreeCommand) {
          const handler = showTreeCommand[1] as (...args: unknown[]) => Promise<void>;
          await handler();

          // Verify webview creation
          expect(vscode.window.createWebviewPanel).toHaveBeenCalled();
        }

        // Step 5: Perform persona-specific actions
        if (persona.skill_level === 'beginner') {
          // Beginner: Use bootstrap workflow
          const bootstrapCommand = vi
            .mocked(vscode.commands.registerCommand)
            .mock.calls.find((call) => call[0] === 'proofEditor.showBootstrapWorkflow');

          if (bootstrapCommand) {
            const handler = bootstrapCommand[1] as (...args: unknown[]) => Promise<void>;
            await handler();
          }
        } else if (persona.skill_level === 'expert') {
          // Expert: Direct manipulation and advanced features
          const proofApplicationService = container.resolve<ProofApplicationService>(
            TOKENS.ProofApplicationService,
          );

          // Simulate creating complex statements
          const createResult = await proofApplicationService.createStatement({
            documentId: 'test-document',
            content: 'Complex expert-level statement for advanced reasoning',
          });

          expect(createResult.isOk()).toBe(true);
        }

        // Step 6: Save and export (if applicable)
        if (persona.collaboration_frequency !== 'never') {
          const yamlSerializer = container.resolve<YAMLSerializer>(TOKENS.YAMLSerializer);

          if (parseResult.isOk()) {
            const serializeResult = await yamlSerializer.serialize(parseResult.value as any);
            expect(serializeResult.isOk()).toBe(true);
          }
        }

        const totalTime = Date.now() - startTime;

        // Performance expectations based on user skill level
        const expectedMaxTime =
          persona.skill_level === 'beginner'
            ? 10000
            : persona.skill_level === 'intermediate'
              ? 8000
              : 6000;

        expect(totalTime).toBeLessThan(expectedMaxTime);
      });
    });
  });
});

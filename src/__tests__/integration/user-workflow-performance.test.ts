/**
 * User Workflow Performance Integration Tests
 *
 * Tests covering performance expectations, responsive user experience,
 * and workflow interruption handling for different user personas.
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type { IFileSystemPort } from '../../application/ports/IFileSystemPort.js';
import type { DocumentQueryService } from '../../application/services/DocumentQueryService.js';
import {
  DocumentContent,
  DocumentId,
  DocumentVersion,
  FileSize,
  Timestamp,
  Title,
} from '../../domain/shared/value-objects/index.js';
import { activate, deactivate } from '../../extension/extension.js';
import {
  type ApplicationContainer,
  getContainer,
  initializeContainer,
} from '../../infrastructure/di/container.js';
import { TOKENS } from '../../infrastructure/di/tokens.js';
import type { DocumentController } from '../../presentation/controllers/DocumentController.js';
import type { ValidationController } from '../../validation/ValidationController.js';

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

describe('User Workflow Performance Tests', () => {
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
          return Promise.resolve(userMocks?.getNextInput() || 'test-input');
        }),
        showQuickPick: vi.fn().mockImplementation((items) => {
          return Promise.resolve(Array.isArray(items) ? items[0] : 'test-choice');
        }),
        createWebviewPanel: vi.fn(() => userMocks?.mockWebviewPanel),
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

  describe('Performance User Experience', () => {
    it('should provide responsive experience for typical user workflows', async () => {
      const workflows = [
        { persona: 'Philosophy Student', maxTime: 3000 },
        { persona: 'Logic Professor', maxTime: 5000 },
        { persona: 'Software Architect', maxTime: 4000 },
        { persona: 'Legal Researcher', maxTime: 4000 },
      ];

      for (const workflow of workflows) {
        const persona = USER_PERSONAS.find((p) => p.name === workflow.persona);
        if (!persona) {
          throw new Error(`Persona ${workflow.persona} not found`);
        }
        const startTime = Date.now();

        // Simulate typical workflow: create -> edit -> visualize -> save
        const content = generatePersonaContent(persona);
        userMocks.mockDocument.getText.mockReturnValue(content);

        // Parse document
        const documentQueryService = container.resolve<DocumentQueryService>(
          TOKENS.DocumentQueryService,
        );
        const parseResult = await documentQueryService.parseDocumentContent(content);
        expect(parseResult.isOk()).toBe(true);

        // Generate visualization
        if (parseResult.isOk()) {
          const visualizationService = container.resolve<any>(TOKENS.ProofVisualizationService);
          const vizResult = visualizationService.generateVisualization(parseResult.value);
          expect(vizResult.isOk()).toBe(true);
        }

        // Save document
        const fileSystemPort = container.resolve<IFileSystemPort>(TOKENS.IFileSystemPort);
        const docId = `perf-test-${workflow.persona.toLowerCase().replace(' ', '-')}`;
        const saveDoc = {
          id: DocumentId.create(docId)._unsafeUnwrap(),
          content: DocumentContent.create(content)._unsafeUnwrap(),
          metadata: {
            id: DocumentId.create(docId)._unsafeUnwrap(),
            title: Title.create(`Performance Test - ${workflow.persona}`)._unsafeUnwrap(),
            modifiedAt: Timestamp.fromDate(new Date()),
            size: FileSize.create(content.length)._unsafeUnwrap(),
            syncStatus: 'synced' as const,
          },
          version: DocumentVersion.create(1)._unsafeUnwrap(),
        };

        const saveResult = await fileSystemPort.storeDocument(saveDoc);
        expect(saveResult.isOk()).toBe(true);

        const totalTime = Date.now() - startTime;
        expect(totalTime).toBeLessThan(workflow.maxTime);
      }
    });

    it('should handle user workflow interruptions gracefully', async () => {
      const persona = USER_PERSONAS.find((p) => p.name === 'Software Architect');
      if (!persona) {
        throw new Error('Software Architect persona not found');
      }
      const content = generatePersonaContent(persona);

      userMocks.mockDocument.getText.mockReturnValue(content);

      // Simulate user starting workflow
      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );
      const parsePromise = documentQueryService.parseDocumentContent(content);

      // Simulate user interruption (e.g., closing document)
      const documentController = container.resolve<DocumentController>(TOKENS.DocumentController);
      await documentController.handleDocumentClosed({
        fileName: '/test/interrupted-workflow.proof',
        uri: 'file:///test/interrupted-workflow.proof',
      });

      // Original operation should still complete successfully
      const parseResult = await parsePromise;
      expect(parseResult.isOk()).toBe(true);

      // System should remain in consistent state
      const validationController = container.resolve<ValidationController>(
        TOKENS.ValidationController,
      );
      expect(validationController).toBeDefined();
    });

    it('should handle large document performance efficiently', async () => {
      const largePersona = USER_PERSONAS.find((p) => p.typical_document_size === 'large');
      if (!largePersona) {
        throw new Error('Large document persona not found');
      }

      // Generate larger content by duplicating structures
      const baseContent = generatePersonaContent(largePersona);

      // Add multiple additional statements and arguments
      const additionalContent = `
  extra_statement_1: "Additional complex reasoning step 1"
  extra_statement_2: "Additional complex reasoning step 2"
  extra_statement_3: "Additional complex reasoning step 3"
  extra_statement_4: "Additional complex reasoning step 4"
  extra_statement_5: "Additional complex reasoning step 5"

arguments:
  complex_reasoning_1:
    premises: [extra_statement_1, extra_statement_2]
    conclusions: [extra_statement_3]
    metadata:
      complexity: "high"
      source: "Performance Testing"
      
  complex_reasoning_2:
    premises: [extra_statement_3, extra_statement_4]
    conclusions: [extra_statement_5]
    metadata:
      complexity: "high"
      source: "Performance Testing"

trees:
- id: large_proof_tree_1
  offset: { x: 200, y: 200 }
  nodes:
    n10: {arg: complex_reasoning_1}
    n11: {n10: complex_reasoning_2, on: 0}
    
- id: large_proof_tree_2
  offset: { x: 400, y: 400 }
  nodes:
    n20: {arg: complex_reasoning_1}
    n21: {arg: complex_reasoning_2}
`;

      const largeContent = baseContent.replace('statements:', `statements:${additionalContent}`);
      userMocks.mockDocument.getText.mockReturnValue(largeContent);

      const startTime = Date.now();

      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );
      const parseResult = await documentQueryService.parseDocumentContent(largeContent);

      const parseTime = Date.now() - startTime;

      // Should handle large documents within reasonable time
      expect(parseTime).toBeLessThan(8000); // 8 seconds max for large documents
      expect(parseResult.isOk()).toBe(true);

      if (parseResult.isOk()) {
        // Verify all content was parsed correctly
        const proofData = parseResult.value;
        expect(Object.keys(proofData.statements).length).toBeGreaterThan(5);
        expect(Object.keys(proofData.atomicArguments).length).toBeGreaterThan(2);
      }
    });

    it('should maintain responsiveness during concurrent operations', async () => {
      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );
      const fileSystemPort = container.resolve<IFileSystemPort>(TOKENS.IFileSystemPort);

      // Create multiple documents to process concurrently
      const concurrentTasks = USER_PERSONAS.map(async (persona, index) => {
        const content = generatePersonaContent(persona);
        userMocks.mockDocument.getText.mockReturnValue(content);

        const startTime = Date.now();

        // Parse document
        const parseResult = await documentQueryService.parseDocumentContent(content);
        expect(parseResult.isOk()).toBe(true);

        // Store document
        const docId = `concurrent-test-${index}`;
        const doc = {
          id: DocumentId.create(docId)._unsafeUnwrap(),
          content: DocumentContent.create(content)._unsafeUnwrap(),
          metadata: {
            id: DocumentId.create(docId)._unsafeUnwrap(),
            title: Title.create(`Concurrent Test ${persona.name}`)._unsafeUnwrap(),
            modifiedAt: Timestamp.fromDate(new Date()),
            size: FileSize.create(content.length)._unsafeUnwrap(),
            syncStatus: 'synced' as const,
          },
          version: DocumentVersion.create(1)._unsafeUnwrap(),
        };

        const storeResult = await fileSystemPort.storeDocument(doc);
        expect(storeResult.isOk()).toBe(true);

        const totalTime = Date.now() - startTime;

        // Each operation should complete within reasonable time even when concurrent
        const maxTimePerPersona = persona.skill_level === 'expert' ? 6000 : 4000;
        expect(totalTime).toBeLessThan(maxTimePerPersona);

        return { persona: persona.name, time: totalTime };
      });

      // Wait for all concurrent operations to complete
      const results = await Promise.all(concurrentTasks);

      // All operations should have completed successfully
      expect(results).toHaveLength(USER_PERSONAS.length);
      results.forEach((result) => {
        expect(result.time).toBeLessThan(6000);
      });
    });

    it('should handle memory efficiently during extended sessions', async () => {
      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );

      // Simulate extended session with multiple document operations
      for (let i = 0; i < 10; i++) {
        const personaIndex = i % USER_PERSONAS.length;
        const persona = USER_PERSONAS[personaIndex];
        if (!persona) {
          throw new Error(`No persona found at index ${personaIndex}`);
        }
        const content = generatePersonaContent(persona);
        userMocks.mockDocument.getText.mockReturnValue(content);

        const parseResult = await documentQueryService.parseDocumentContent(content);
        expect(parseResult.isOk()).toBe(true);

        // Small delay to simulate user interaction
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // After extended session, operations should still be responsive
      const firstPersona = USER_PERSONAS[0];
      if (!firstPersona) {
        throw new Error('No user personas available');
      }
      const finalContent = generatePersonaContent(firstPersona);
      userMocks.mockDocument.getText.mockReturnValue(finalContent);

      const startTime = Date.now();
      const finalResult = await documentQueryService.parseDocumentContent(finalContent);
      const finalTime = Date.now() - startTime;

      expect(finalResult.isOk()).toBe(true);
      expect(finalTime).toBeLessThan(3000); // Should still be fast after extended session
    });

    it('should provide progressive performance for complex operations', async () => {
      const complexPersona = USER_PERSONAS.find((p) => p.skill_level === 'expert');
      if (!complexPersona) {
        throw new Error('Expert persona not found');
      }

      const content = generatePersonaContent(complexPersona);
      userMocks.mockDocument.getText.mockReturnValue(content);

      // Track performance of different operation phases
      const phases = {
        parse: 0,
        validation: 0,
        visualization: 0,
      };

      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );

      // Phase 1: Parse
      let startTime = Date.now();
      const parseResult = await documentQueryService.parseDocumentContent(content);
      phases.parse = Date.now() - startTime;

      expect(parseResult.isOk()).toBe(true);

      // Phase 2: Validation (simulated via re-parsing)
      if (parseResult.isOk()) {
        startTime = Date.now();
        const validationResult = await documentQueryService.parseDocumentContent(content);
        phases.validation = Date.now() - startTime;
        expect(validationResult.isOk()).toBe(true);
      }

      // Phase 3: Visualization
      if (parseResult.isOk()) {
        startTime = Date.now();
        const visualizationService = container.resolve<any>(TOKENS.ProofVisualizationService);
        const vizResult = visualizationService.generateVisualization(parseResult.value);
        phases.visualization = Date.now() - startTime;
        expect(vizResult.isOk()).toBe(true);
      }

      // Performance expectations for each phase
      expect(phases.parse).toBeLessThan(2000); // Parse should be fast
      expect(phases.validation).toBeLessThan(1500); // Validation should be faster (cached)
      expect(phases.visualization).toBeLessThan(1000); // Visualization should be fastest

      // Total time should be reasonable
      const totalTime = phases.parse + phases.validation + phases.visualization;
      expect(totalTime).toBeLessThan(4000);
    });
  });
});

/**
 * User Workflow Integration Tests
 *
 * Comprehensive tests covering realistic user interactions and workflows
 * from initial setup through complex proof construction and collaboration.
 */

import { err } from 'neverthrow';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type { IFileSystemPort } from '../../application/ports/IFileSystemPort.js';
import type { DocumentQueryService } from '../../application/services/DocumentQueryService.js';
import type { ProofApplicationService } from '../../application/services/ProofApplicationService.js';
import { ValidationError } from '../../domain/shared/result.js';
import { activate, deactivate } from '../../extension/extension.js';
import {
  type ApplicationContainer,
  getContainer,
  initializeContainer,
} from '../../infrastructure/di/container.js';
import { TOKENS } from '../../infrastructure/di/tokens.js';
import type { YAMLSerializer } from '../../infrastructure/repositories/yaml/YAMLSerializer.js';
import type { BootstrapController } from '../../presentation/controllers/BootstrapController.js';
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

describe('User Workflow Integration Tests', () => {
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

  describe('Workflow Error Recovery', () => {
    it('should handle beginner user making common mistakes', async () => {
      const _persona = USER_PERSONAS.find((p) => p.skill_level === 'beginner');
      if (!_persona) {
        throw new Error('Beginner persona not found');
      }

      // Simulate common beginner mistakes
      userMocks.mockUserInput([
        '', // Empty document name (should be rejected)
        'my-proof!@#', // Invalid characters (should be rejected)
        'my-first-proof', // Valid name
        '', // Empty premise (should be handled gracefully)
        'Valid premise',
        'Valid conclusion',
      ]);

      const createDocumentCommand = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.find((call) => call[0] === 'proofEditor.createBootstrapDocument');

      if (createDocumentCommand) {
        const handler = createDocumentCommand[1] as (...args: unknown[]) => Promise<void>;

        // Should handle invalid inputs gracefully
        await expect(handler()).resolves.not.toThrow();

        // Should eventually succeed with valid input
        expect(vscode.window.showInputBox).toHaveBeenCalled();
      }

      // Test invalid YAML content handling
      const invalidContent = 'invalid yaml content {{{';
      userMocks.mockDocument.getText.mockReturnValue(invalidContent);

      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );
      const parseResult = await documentQueryService.parseDocumentContent(invalidContent);

      // Should fail gracefully with helpful error
      expect(parseResult.isErr()).toBe(true);
      if (parseResult.isErr()) {
        expect(parseResult.error).toBeInstanceOf(ValidationError);
      }
    });

    it('should handle expert user recovering from system errors', async () => {
      const persona = USER_PERSONAS.find((p) => p.skill_level === 'expert');
      if (!persona) {
        throw new Error('Expert persona not found');
      }
      const personaContent = generatePersonaContent(persona);

      // Simulate system error during parsing
      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );
      const originalParse = documentQueryService.parseDocumentContent;

      // Mock intermittent failure
      let attemptCount = 0;
      documentQueryService.parseDocumentContent = vi.fn().mockImplementation(async (content) => {
        attemptCount++;
        if (attemptCount === 1) {
          return err(new ValidationError('Temporary system error'));
        }
        return originalParse.call(documentQueryService, content);
      });

      userMocks.mockDocument.getText.mockReturnValue(personaContent);

      // First attempt should fail
      const firstResult = await documentQueryService.parseDocumentContent(personaContent);
      expect(firstResult.isErr()).toBe(true);

      // Second attempt should succeed (expert users retry)
      const secondResult = await documentQueryService.parseDocumentContent(personaContent);
      expect(secondResult.isOk()).toBe(true);

      // Restore original function
      documentQueryService.parseDocumentContent = originalParse;
    });
  });

  describe('Collaboration Workflows', () => {
    it('should handle multi-user editing scenario', async () => {
      const professor = USER_PERSONAS.find((p) => p.name === 'Logic Professor');
      if (!professor) {
        throw new Error('Logic Professor persona not found');
      }
      const _student = USER_PERSONAS.find((p) => p.name === 'Philosophy Student');
      if (!_student) {
        throw new Error('Philosophy Student persona not found');
      }

      // Simulate professor creating initial document
      const professorContent = generatePersonaContent(professor);
      userMocks.mockDocument.getText.mockReturnValue(professorContent);

      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );
      const professorParseResult =
        await documentQueryService.parseDocumentContent(professorContent);

      expect(professorParseResult.isOk()).toBe(true);

      // Store professor's document
      const fileSystemPort = container.resolve<IFileSystemPort>(TOKENS.IFileSystemPort);
      const professorDoc = {
        id: 'collaborative-proof',
        content: professorContent,
        metadata: {
          id: 'collaborative-proof',
          title: 'Collaborative Modal Logic Proof',
          modifiedAt: new Date(Date.now() - 3600000), // 1 hour ago
          size: professorContent.length,
          syncStatus: 'synced' as const,
        },
        version: 1,
      };

      const storeProfResult = await fileSystemPort.storeDocument(professorDoc);
      expect(storeProfResult.isOk()).toBe(true);

      // Simulate student opening and modifying the document
      const studentAddition = `
  student_question: "Why does this modal logic principle hold?"
  student_note: "Need to verify this step in the proof"
`;

      const modifiedContent = professorContent + studentAddition;
      userMocks.mockDocument.getText.mockReturnValue(modifiedContent);

      const studentParseResult = await documentQueryService.parseDocumentContent(modifiedContent);
      expect(studentParseResult.isOk()).toBe(true);

      // Store student's version
      const studentDoc = {
        ...professorDoc,
        content: modifiedContent,
        metadata: {
          ...professorDoc.metadata,
          modifiedAt: new Date(),
        },
        version: 2,
      };

      const storeStudentResult = await fileSystemPort.storeDocument(studentDoc);
      expect(storeStudentResult.isOk()).toBe(true);

      // Verify version management
      const retrieveResult = await fileSystemPort.getStoredDocument('collaborative-proof');
      expect(retrieveResult.isOk()).toBe(true);

      if (retrieveResult.isOk() && retrieveResult.value) {
        expect(retrieveResult.value.version).toBe(2);
        expect(retrieveResult.value.content).toContain('student_question');
      }
    });

    it('should handle real-time collaboration simulation', async () => {
      const architect = USER_PERSONAS.find((p) => p.name === 'Software Architect');
      if (!architect) {
        throw new Error('Software Architect persona not found');
      }
      const baseContent = generatePersonaContent(architect);

      // Simulate multiple simultaneous edits
      const collaboratorEdits = [
        { user: 'architect', addition: '\n  performance_req: "System must respond within 100ms"' },
        { user: 'teammate1', addition: '\n  security_req: "All data must be encrypted at rest"' },
        { user: 'teammate2', addition: '\n  compliance_req: "Must meet GDPR requirements"' },
      ];

      const fileSystemPort = container.resolve<IFileSystemPort>(TOKENS.IFileSystemPort);
      const documentController = container.resolve<DocumentController>(TOKENS.DocumentController);

      // Simulate concurrent document modifications
      const savePromises = collaboratorEdits.map(async (edit, index) => {
        const modifiedContent = baseContent + edit.addition;

        const collaborativeDoc = {
          id: `collab-doc-${edit.user}`,
          content: modifiedContent,
          metadata: {
            id: `collab-doc-${edit.user}`,
            title: `Architecture Decision - ${edit.user}`,
            modifiedAt: new Date(Date.now() + index * 1000), // Stagger timestamps
            size: modifiedContent.length,
            syncStatus: 'synced' as const,
          },
          version: 1,
        };

        return fileSystemPort.storeDocument(collaborativeDoc);
      });

      const results = await Promise.all(savePromises);

      // All saves should succeed
      results.forEach((result) => {
        expect(result.isOk()).toBe(true);
      });

      // Simulate conflict resolution
      const finalContent = baseContent + collaboratorEdits.map((e) => e.addition).join('');
      userMocks.mockDocument.getText.mockReturnValue(finalContent);

      await documentController.handleDocumentChanged({
        fileName: '/test/architecture-decision.proof',
        uri: 'file:///test/architecture-decision.proof',
        getText: () => finalContent,
        isDirty: true,
      });

      // Should handle merged content successfully
      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );
      const mergedResult = await documentQueryService.parseDocumentContent(finalContent);
      expect(mergedResult.isOk()).toBe(true);
    });
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
        const saveDoc = {
          id: `perf-test-${workflow.persona.toLowerCase().replace(' ', '-')}`,
          content,
          metadata: {
            id: `perf-test-${workflow.persona.toLowerCase().replace(' ', '-')}`,
            title: `Performance Test - ${workflow.persona}`,
            modifiedAt: new Date(),
            size: content.length,
            syncStatus: 'synced' as const,
          },
          version: 1,
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
  });

  describe('Accessibility and Usability', () => {
    it('should provide helpful error messages for common user mistakes', async () => {
      const commonMistakes = [
        { content: 'statements:\n  invalid syntax here', expectedError: 'parsing' },
        {
          content: 'arguments:\n  missing_premises: {conclusions: [c1]}',
          expectedError: 'validation',
        },
        { content: 'trees:\n- invalid_node_reference', expectedError: 'reference' },
      ];

      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );

      for (const mistake of commonMistakes) {
        userMocks.mockDocument.getText.mockReturnValue(mistake.content);

        const parseResult = await documentQueryService.parseDocumentContent(mistake.content);

        // Should fail with helpful error message
        expect(parseResult.isErr()).toBe(true);

        if (parseResult.isErr()) {
          expect(parseResult.error.message).toBeTruthy();
          expect(parseResult.error.message.length).toBeGreaterThan(10); // Meaningful error message
        }
      }
    });

    it('should provide progressive disclosure for complex features', async () => {
      const beginnerPersona = USER_PERSONAS.find((p) => p.skill_level === 'beginner');
      if (!beginnerPersona) {
        throw new Error('Beginner persona not found');
      }

      // Test bootstrap workflow provides guided experience
      const bootstrapController = container.resolve<BootstrapController>(
        TOKENS.BootstrapController,
      );

      const workflowResult = await bootstrapController.getBootstrapWorkflow('test-doc');
      expect(workflowResult.isOk()).toBe(true);

      if (workflowResult.isOk()) {
        const workflow = workflowResult.value.data;
        expect(workflow).toBeDefined();

        if (workflow) {
          // Should provide step-by-step guidance
          expect(workflow.steps).toBeDefined();
          expect(workflow.totalSteps).toBeGreaterThan(0);

          // Should have clear actions for each step
          workflow.steps.forEach((step) => {
            expect(step.title).toBeTruthy();
            expect(step.description).toBeTruthy();
            expect(step.actions).toBeDefined();
          });
        }
      }
    });
  });
});

/**
 * User Workflow Collaboration Integration Tests
 *
 * Tests covering multi-user collaboration scenarios,
 * document sharing, version management, and real-time editing.
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
    default: `
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
  };

  const content = templates[persona.name as keyof typeof templates];
  return content || templates.default;
};

describe('User Workflow Collaboration Tests', () => {
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

      const profDocIdResult = DocumentId.create('collaborative-proof');
      const profContentResult = DocumentContent.create(professorContent);
      const profTitleResult = Title.create('Collaborative Modal Logic Proof');
      const profVersionResult = DocumentVersion.create(1);

      if (
        !profDocIdResult.isOk() ||
        !profContentResult.isOk() ||
        !profTitleResult.isOk() ||
        !profVersionResult.isOk()
      ) {
        throw new Error('Failed to create value objects for professor document');
      }

      const professorDoc = {
        id: profDocIdResult.value,
        content: profContentResult.value,
        metadata: {
          id: profDocIdResult.value,
          title: profTitleResult.value,
          modifiedAt: Timestamp.fromDate(new Date(Date.now() - 3600000)), // 1 hour ago
          size: FileSize.fromNumber(professorContent.length).unwrapOr(FileSize.zero()),
          syncStatus: 'synced' as const,
        },
        version: profVersionResult.value,
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
      const studentContentResult = DocumentContent.create(modifiedContent);
      const studentVersionResult = DocumentVersion.create(2);

      if (!studentContentResult.isOk() || !studentVersionResult.isOk()) {
        throw new Error('Failed to create value objects for student document');
      }

      const studentDoc = {
        ...professorDoc,
        content: studentContentResult.value,
        metadata: {
          ...professorDoc.metadata,
          modifiedAt: Timestamp.now(),
        },
        version: studentVersionResult.value,
      };

      const storeStudentResult = await fileSystemPort.storeDocument(studentDoc);
      expect(storeStudentResult.isOk()).toBe(true);

      // Verify version management
      const docIdResult = DocumentId.create('collaborative-proof');
      if (docIdResult.isOk()) {
        const retrieveResult = await fileSystemPort.getStoredDocument(docIdResult.value);
        expect(retrieveResult.isOk()).toBe(true);

        if (retrieveResult.isOk() && retrieveResult.value) {
          expect(retrieveResult.value.version).toBe(2);
          expect(retrieveResult.value.content).toContain('student_question');
        }
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

        const docIdResult = DocumentId.create(`collab-doc-${edit.user}`);
        const contentResult = DocumentContent.create(modifiedContent);
        const titleResult = Title.create(`Architecture Decision - ${edit.user}`);
        const versionResult = DocumentVersion.create(1);

        if (
          !docIdResult.isOk() ||
          !contentResult.isOk() ||
          !titleResult.isOk() ||
          !versionResult.isOk()
        ) {
          throw new Error('Failed to create value objects');
        }

        const collaborativeDoc = {
          id: docIdResult.value,
          content: contentResult.value,
          metadata: {
            id: docIdResult.value,
            title: titleResult.value,
            modifiedAt: Timestamp.fromDate(new Date(Date.now() + index * 1000)), // Stagger timestamps
            size: FileSize.fromNumber(modifiedContent.length).unwrapOr(FileSize.zero()),
            syncStatus: 'synced' as const,
          },
          version: versionResult.value,
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

    it('should handle version conflicts in collaborative editing', async () => {
      const firstPersona = USER_PERSONAS[0];
      if (!firstPersona) {
        throw new Error('No user personas available');
      }
      const baseContent = generatePersonaContent(firstPersona);
      const fileSystemPort = container.resolve<IFileSystemPort>(TOKENS.IFileSystemPort);

      // Create initial document
      const originalDocIdResult = DocumentId.create('conflict-test');
      const originalContentResult = DocumentContent.create(baseContent);
      const originalTitleResult = Title.create('Conflict Test Document');
      const originalVersionResult = DocumentVersion.create(1);

      if (
        !originalDocIdResult.isOk() ||
        !originalContentResult.isOk() ||
        !originalTitleResult.isOk() ||
        !originalVersionResult.isOk()
      ) {
        throw new Error('Failed to create value objects for original document');
      }

      const originalDoc = {
        id: originalDocIdResult.value,
        content: originalContentResult.value,
        metadata: {
          id: originalDocIdResult.value,
          title: originalTitleResult.value,
          modifiedAt: Timestamp.now(),
          size: FileSize.fromNumber(baseContent.length).unwrapOr(FileSize.zero()),
          syncStatus: 'synced' as const,
        },
        version: originalVersionResult.value,
      };

      const storeOriginalResult = await fileSystemPort.storeDocument(originalDoc);
      expect(storeOriginalResult.isOk()).toBe(true);

      // Simulate two users making conflicting changes
      const user1Content = `${baseContent}\n  user1_addition: "First user edit"`;
      const user2Content = `${baseContent}\n  user2_addition: "Second user edit"`;

      const user1ContentResult = DocumentContent.create(user1Content);
      const user1VersionResult = DocumentVersion.create(2);
      const user2ContentResult = DocumentContent.create(user2Content);
      const user2VersionResult = DocumentVersion.create(2);

      if (
        !user1ContentResult.isOk() ||
        !user1VersionResult.isOk() ||
        !user2ContentResult.isOk() ||
        !user2VersionResult.isOk()
      ) {
        throw new Error('Failed to create value objects for user documents');
      }

      const user1Doc = {
        ...originalDoc,
        content: user1ContentResult.value,
        version: user1VersionResult.value,
        metadata: {
          ...originalDoc.metadata,
          modifiedAt: Timestamp.fromDate(new Date(Date.now() + 1000)),
        },
      };

      const user2Doc = {
        ...originalDoc,
        content: user2ContentResult.value,
        version: user2VersionResult.value, // Same version - conflict!
        metadata: {
          ...originalDoc.metadata,
          modifiedAt: Timestamp.fromDate(new Date(Date.now() + 2000)),
        },
      };

      // Store user1's changes
      const storeUser1Result = await fileSystemPort.storeDocument(user1Doc);
      expect(storeUser1Result.isOk()).toBe(true);

      // Store user2's changes (should handle conflict)
      const storeUser2Result = await fileSystemPort.storeDocument(user2Doc);
      expect(storeUser2Result.isOk()).toBe(true);

      // Retrieve final document
      const finalDocId = DocumentId.create('conflict-test');
      if (finalDocId.isOk()) {
        const finalResult = await fileSystemPort.getStoredDocument(finalDocId.value);
        expect(finalResult.isOk()).toBe(true);

        if (finalResult.isOk() && finalResult.value) {
          // Last write should win or system should increment version
          expect(finalResult.value.version).toBeGreaterThanOrEqual(2);
          expect(finalResult.value.content).toBeTruthy();
        }
      }
    });

    it('should support document sharing and permissions', async () => {
      const professor = USER_PERSONAS.find((p) => p.name === 'Logic Professor');
      if (!professor) {
        throw new Error('Logic Professor persona not found');
      }
      const content = generatePersonaContent(professor);
      const fileSystemPort = container.resolve<IFileSystemPort>(TOKENS.IFileSystemPort);

      // Create shared document
      const sharedDocIdResult = DocumentId.create('shared-logic-proof');
      const sharedContentResult = DocumentContent.create(content);
      const sharedTitleResult = Title.create('Shared Logic Proof for Class');
      const sharedVersionResult = DocumentVersion.create(1);

      if (
        !sharedDocIdResult.isOk() ||
        !sharedContentResult.isOk() ||
        !sharedTitleResult.isOk() ||
        !sharedVersionResult.isOk()
      ) {
        throw new Error('Failed to create value objects for shared document');
      }

      const sharedDoc = {
        id: sharedDocIdResult.value,
        content: sharedContentResult.value,
        metadata: {
          id: sharedDocIdResult.value,
          title: sharedTitleResult.value,
          modifiedAt: Timestamp.now(),
          size: FileSize.fromNumber(content.length).unwrapOr(FileSize.zero()),
          syncStatus: 'synced' as const,
        },
        version: sharedVersionResult.value,
      };

      const storeResult = await fileSystemPort.storeDocument(sharedDoc);
      expect(storeResult.isOk()).toBe(true);

      // Verify document can be retrieved by collaborators
      const retrieveDocIdResult = DocumentId.create('shared-logic-proof');
      if (!retrieveDocIdResult.isOk()) {
        throw new Error('Failed to create DocumentId for retrieval');
      }
      const retrieveResult = await fileSystemPort.getStoredDocument(retrieveDocIdResult.value);
      expect(retrieveResult.isOk()).toBe(true);

      if (retrieveResult.isOk() && retrieveResult.value) {
        // Document metadata verified - permissions would be handled at application layer
        expect(retrieveResult.value.metadata.title).toEqual(sharedTitleResult.value);
      }
    });

    it('should handle collaborative validation workflows', async () => {
      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );

      // Create document with validation issues
      const contentWithIssues = `
statements:
  p1: "All humans are mortal"
  p2: "Socrates is human"
  c1: "Therefore, Socrates is mortal"

arguments:
  invalid_arg:
    premises: [p1, nonexistent_statement]  # This will cause validation error
    conclusions: [c1]

trees:
- id: problematic_tree
  nodes:
    n1: {arg: invalid_arg}

metadata:
  title: "Collaborative Validation Test"
  status: "needs_review"
`;

      userMocks.mockDocument.getText.mockReturnValue(contentWithIssues);

      // First collaborator identifies issues
      const parseResult = await documentQueryService.parseDocumentContent(contentWithIssues);
      expect(parseResult.isErr()).toBe(true);

      // Second collaborator fixes the issues
      const fixedContent = contentWithIssues.replace(
        'premises: [p1, nonexistent_statement]',
        'premises: [p1, p2]',
      );

      userMocks.mockDocument.getText.mockReturnValue(fixedContent);

      const fixedParseResult = await documentQueryService.parseDocumentContent(fixedContent);
      expect(fixedParseResult.isOk()).toBe(true);

      // Verify the fix preserves document structure
      if (fixedParseResult.isOk()) {
        expect(fixedParseResult.value.statements).toBeDefined();
        expect(fixedParseResult.value.atomicArguments).toBeDefined();
        expect(Object.keys(fixedParseResult.value.statements)).toContain('p1');
        expect(Object.keys(fixedParseResult.value.statements)).toContain('p2');
      }
    });
  });
});

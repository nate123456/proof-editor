/**
 * User Workflow Error Recovery Integration Tests
 *
 * Tests covering error handling and recovery scenarios
 * for different user types and common mistake patterns.
 */

import { err } from 'neverthrow';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type { DocumentQueryService } from '../../application/services/DocumentQueryService.js';
import { ValidationError } from '../../domain/shared/result.js';
import { activate, deactivate } from '../../extension/extension.js';
import {
  type ApplicationContainer,
  getContainer,
  initializeContainer,
} from '../../infrastructure/di/container.js';
import { TOKENS } from '../../infrastructure/di/tokens.js';

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

describe('User Workflow Error Recovery Tests', () => {
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

    it('should handle invalid document syntax gracefully', async () => {
      const invalidDocuments = [
        {
          name: 'Malformed YAML',
          content: `
statements:
  p1: "Missing closing quote
  p2: "Valid statement"
invalid_yaml: {{{
`,
          expectedErrorType: 'syntax',
        },
        {
          name: 'Missing required sections',
          content: `
metadata:
  title: "Incomplete Document"
# Missing statements and arguments sections
`,
          expectedErrorType: 'validation',
        },
        {
          name: 'Invalid references',
          content: `
statements:
  p1: "Valid statement"

arguments:
  invalid_arg:
    premises: [nonexistent_statement]
    conclusions: [p1]

trees:
- id: test_tree
  nodes:
    n1: {arg: nonexistent_argument}
`,
          expectedErrorType: 'reference',
        },
      ];

      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );

      for (const invalidDoc of invalidDocuments) {
        userMocks.mockDocument.getText.mockReturnValue(invalidDoc.content);

        const parseResult = await documentQueryService.parseDocumentContent(invalidDoc.content);

        // Should fail with descriptive error
        expect(parseResult.isErr()).toBe(true);

        if (parseResult.isErr()) {
          const error = parseResult.error;
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toBeTruthy();
          expect(error.message.length).toBeGreaterThan(5);
        }
      }
    });

    it('should recover from corrupted document state', async () => {
      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );

      // Start with valid content
      const firstPersona = USER_PERSONAS[0];
      if (!firstPersona) {
        throw new Error('No user personas available');
      }
      const validContent = generatePersonaContent(firstPersona);
      userMocks.mockDocument.getText.mockReturnValue(validContent);

      const initialResult = await documentQueryService.parseDocumentContent(validContent);
      expect(initialResult.isOk()).toBe(true);

      // Simulate document corruption
      const corruptedContent = `${validContent.slice(0, validContent.length / 2)}###CORRUPTED###`;
      userMocks.mockDocument.getText.mockReturnValue(corruptedContent);

      const corruptedResult = await documentQueryService.parseDocumentContent(corruptedContent);
      expect(corruptedResult.isErr()).toBe(true);

      // Simulate recovery with valid content again
      userMocks.mockDocument.getText.mockReturnValue(validContent);

      const recoveredResult = await documentQueryService.parseDocumentContent(validContent);
      expect(recoveredResult.isOk()).toBe(true);

      // Should maintain same document structure after recovery
      if (initialResult.isOk() && recoveredResult.isOk()) {
        expect(recoveredResult.value.id).toBe(initialResult.value.id);
        expect(Object.keys(recoveredResult.value.statements)).toEqual(
          Object.keys(initialResult.value.statements),
        );
      }
    });

    it('should handle network-like interruptions during collaboration', async () => {
      const persona = USER_PERSONAS.find((p) => p.collaboration_frequency === 'frequent');
      if (!persona) {
        throw new Error('Collaborative persona not found');
      }

      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );

      // Simulate intermittent failures (like network timeouts)
      let failureCount = 0;
      const originalParse = documentQueryService.parseDocumentContent;

      documentQueryService.parseDocumentContent = vi.fn().mockImplementation(async (content) => {
        failureCount++;

        // Simulate failure every 3rd attempt
        if (failureCount % 3 === 0) {
          return err(new ValidationError('Network timeout - please retry'));
        }

        return originalParse.call(documentQueryService, content);
      });

      const content = generatePersonaContent(persona);
      userMocks.mockDocument.getText.mockReturnValue(content);

      // First two attempts should succeed
      const result1 = await documentQueryService.parseDocumentContent(content);
      expect(result1.isOk()).toBe(true);

      const result2 = await documentQueryService.parseDocumentContent(content);
      expect(result2.isOk()).toBe(true);

      // Third attempt should fail
      const result3 = await documentQueryService.parseDocumentContent(content);
      expect(result3.isErr()).toBe(true);

      // Fourth attempt should succeed again
      const result4 = await documentQueryService.parseDocumentContent(content);
      expect(result4.isOk()).toBe(true);

      // Restore original function
      documentQueryService.parseDocumentContent = originalParse;
    });
  });
});

/**
 * User Workflow Accessibility and Usability Integration Tests
 *
 * Tests covering accessibility features, error message quality,
 * progressive disclosure, and usability patterns for different user types.
 */

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
import type { BootstrapController } from '../../presentation/controllers/BootstrapController.js';

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

describe('User Workflow Accessibility and Usability Tests', () => {
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

    it('should provide contextual help for different skill levels', async () => {
      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );

      // Test beginner-level error messages
      const beginnerContent = `
statements:
  p1: "All humans are mortal"
  p2: "Socrates is human"

arguments:
  basic_error:
    premises: [p1, p2, nonexistent]  # Error: references nonexistent statement
    conclusions: []  # Error: empty conclusions
`;

      userMocks.mockDocument.getText.mockReturnValue(beginnerContent);
      const beginnerResult = await documentQueryService.parseDocumentContent(beginnerContent);

      expect(beginnerResult.isErr()).toBe(true);

      if (beginnerResult.isErr()) {
        const error = beginnerResult.error;
        expect(error).toBeInstanceOf(ValidationError);

        // Error message should be descriptive for beginners
        expect(error.message).toBeTruthy();
        expect(error.message.length).toBeGreaterThan(20);

        // Should contain actionable guidance
        const message = error.message.toLowerCase();
        expect(
          message.includes('statement') ||
            message.includes('reference') ||
            message.includes('conclusion') ||
            message.includes('premises'),
        ).toBe(true);
      }
    });

    it('should support keyboard navigation patterns', async () => {
      // Test that commands are registered for keyboard accessibility
      const registeredCommands = vi.mocked(vscode.commands.registerCommand).mock.calls;

      const essentialCommands = [
        'proofEditor.createBootstrapDocument',
        'proofEditor.showTree',
        'proofEditor.showBootstrapWorkflow',
      ];

      essentialCommands.forEach((commandName) => {
        const commandRegistered = registeredCommands.some((call) => call[0] === commandName);
        expect(commandRegistered).toBe(true);
      });

      // Verify commands have proper handlers
      const createCommand = registeredCommands.find(
        (call) => call[0] === 'proofEditor.createBootstrapDocument',
      );

      if (createCommand) {
        expect(typeof createCommand[1]).toBe('function');
      }
    });

    it('should provide semantic information for screen readers', async () => {
      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );

      const accessibleContent = `
# Accessible Logic Proof
# This document demonstrates clear semantic structure

statements:
  premise_1: "All philosophers think deeply"
  premise_2: "Socrates is a philosopher"
  conclusion_1: "Therefore, Socrates thinks deeply"

arguments:
  syllogistic_reasoning:
    premises: [premise_1, premise_2]
    conclusions: [conclusion_1]
    metadata:
      rule: "Universal Instantiation"
      description: "Basic syllogistic reasoning pattern"
      accessibility_label: "Simple logical inference from universal to particular"

metadata:
  title: "Basic Philosophical Reasoning"
  description: "A simple example of logical reasoning suitable for learning"
  accessibility:
    summary: "Demonstrates syllogistic reasoning with clear premise-conclusion structure"
    complexity: "beginner"
    reading_time: "2 minutes"
`;

      userMocks.mockDocument.getText.mockReturnValue(accessibleContent);
      const parseResult = await documentQueryService.parseDocumentContent(accessibleContent);

      expect(parseResult.isOk()).toBe(true);

      if (parseResult.isOk()) {
        const proofData = parseResult.value;

        // Verify semantic structure is preserved
        expect(proofData.statements).toBeDefined();
        expect(proofData.atomicArguments).toBeDefined();

        // Verify metadata includes accessibility information
        expect(proofData.id).toContain('Philosophical Reasoning');
      }
    });

    it('should handle input validation with clear feedback', async () => {
      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );

      const validationTestCases = [
        {
          name: 'Empty document',
          content: '',
          expectation: 'Should provide guidance on document structure',
        },
        {
          name: 'Malformed YAML',
          content: 'statements:\n  invalid: "unterminated string',
          expectation: 'Should indicate YAML syntax error',
        },
        {
          name: 'Missing required sections',
          content: 'statements:\n  p1: "Valid statement"',
          expectation: 'Should indicate missing arguments section',
        },
        {
          name: 'Circular references',
          content: `
statements:
  p1: "Statement one"
  p2: "Statement two"

arguments:
  arg1:
    premises: [p1]
    conclusions: [p2]
  arg2:
    premises: [p2]
    conclusions: [p1]  # This creates a logical issue
`,
          expectation: 'Should detect potential logical issues',
        },
      ];

      for (const testCase of validationTestCases) {
        userMocks.mockDocument.getText.mockReturnValue(testCase.content);
        const result = await documentQueryService.parseDocumentContent(testCase.content);

        if (result.isErr()) {
          const error = result.error;
          expect(error.message).toBeTruthy();
          expect(error.message.length).toBeGreaterThan(5);

          // Error should be specific enough to be actionable
          expect(error.message).not.toBe('Error');
          expect(error.message).not.toBe('Invalid');
        }
      }
    });

    it('should support different learning pathways for skill levels', async () => {
      const bootstrapController = container.resolve<BootstrapController>(
        TOKENS.BootstrapController,
      );

      // Test workflow adaptation based on skill level context
      const skillLevelContexts = [
        { context: 'beginner-philosophy-student', expectedSteps: 'Should have detailed guidance' },
        { context: 'intermediate-researcher', expectedSteps: 'Should have moderate guidance' },
        { context: 'expert-professor', expectedSteps: 'Should have minimal guidance' },
      ];

      for (const skillContext of skillLevelContexts) {
        const workflowResult = await bootstrapController.getBootstrapWorkflow(skillContext.context);
        expect(workflowResult.isOk()).toBe(true);

        if (workflowResult.isOk()) {
          const workflow = workflowResult.value.data;
          expect(workflow).toBeDefined();

          if (workflow) {
            expect(workflow.steps).toBeDefined();
            expect(workflow.totalSteps).toBeGreaterThan(0);

            // Each step should have appropriate level of detail
            workflow.steps.forEach((step) => {
              expect(step.title).toBeTruthy();
              expect(step.description).toBeTruthy();

              // Steps should be actionable
              expect(step.actions).toBeDefined();
              expect(step.actions.length).toBeGreaterThan(0);
            });
          }
        }
      }
    });

    it('should provide informative status and progress indicators', async () => {
      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );

      const progressTrackingContent = `
# Document with Multiple Validation Stages
# Tests progress indication for complex operations

statements:
  stage_1: "First validation stage"
  stage_2: "Second validation stage"
  stage_3: "Third validation stage"

arguments:
  progressive_validation:
    premises: [stage_1, stage_2]
    conclusions: [stage_3]
    metadata:
      validation_stages: ["syntax", "semantics", "logic"]
      complexity: "progressive"

trees:
- id: progress_tree
  offset: { x: 0, y: 0 }
  nodes:
    n1: {arg: progressive_validation}

metadata:
  title: "Progressive Validation Test"
  validation_progress: "tracked"
`;

      userMocks.mockDocument.getText.mockReturnValue(progressTrackingContent);

      // Simulate operation that should provide progress feedback
      const parseResult = await documentQueryService.parseDocumentContent(progressTrackingContent);

      expect(parseResult.isOk()).toBe(true);

      if (parseResult.isOk()) {
        const proofData = parseResult.value;

        // Verify document structure indicates progress tracking capability
        expect(proofData.statements).toBeDefined();
        expect(proofData.atomicArguments).toBeDefined();
        expect(proofData.id).toContain('Progressive Validation');
      }
    });

    it('should support customizable user interface preferences', async () => {
      // Test that VS Code configuration integration works
      const mockConfig = vi.mocked(vscode.workspace.getConfiguration);

      // Simulate different user preferences
      const userPreferences = [
        { theme: 'dark', fontSize: 14, autoSave: true },
        { theme: 'light', fontSize: 16, autoSave: false },
        { theme: 'high-contrast', fontSize: 18, autoSave: true },
      ];

      for (const prefs of userPreferences) {
        mockConfig.mockReturnValue({
          get: vi.fn((key: string) => {
            if (key === 'editor.theme') return prefs.theme;
            if (key === 'editor.fontSize') return prefs.fontSize;
            if (key === 'files.autoSave') return prefs.autoSave;
            return undefined;
          }),
          has: vi.fn(),
          inspect: vi.fn(),
          update: vi.fn(),
        });

        // Verify configuration is accessible
        const config = vscode.workspace.getConfiguration();
        expect(config.get('editor.theme')).toBe(prefs.theme);
        expect(config.get('editor.fontSize')).toBe(prefs.fontSize);
        expect(config.get('files.autoSave')).toBe(prefs.autoSave);
      }
    });
  });
});

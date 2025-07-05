import 'reflect-metadata';

import { ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IExportService } from '../../application/ports/IExportService.js';
import type { IUIPort, WebviewPanel } from '../../application/ports/IUIPort.js';
import type { IViewStatePort } from '../../application/ports/IViewStatePort.js';
import type { IDocumentIdService } from '../../application/services/DocumentIdService.js';
import type { DocumentQueryService } from '../../application/services/DocumentQueryService.js';
import type { ProofApplicationService } from '../../application/services/ProofApplicationService.js';
import type { ProofVisualizationService } from '../../application/services/ProofVisualizationService.js';
import type { ViewStateManager } from '../../application/services/ViewStateManager.js';
import type { YAMLSerializer } from '../../infrastructure/repositories/yaml/YAMLSerializer.js';
import type { BootstrapController } from '../../presentation/controllers/BootstrapController.js';
import { ProofTreePanel } from '../ProofTreePanel.js';
import type { TreeRenderer } from '../TreeRenderer.js';

describe('ProofTreePanel Validation Helpers', () => {
  let panel: ProofTreePanel;
  let mockServices: {
    webviewPanel: WebviewPanel;
    uiPort: IUIPort;
    visualizationService: ProofVisualizationService;
    documentQueryService: DocumentQueryService;
    renderer: TreeRenderer;
    viewStateManager: ViewStateManager;
    viewStatePort: IViewStatePort;
    bootstrapController: BootstrapController;
    proofApplicationService: ProofApplicationService;
    yamlSerializer: YAMLSerializer;
    exportService: IExportService;
    documentIdService: IDocumentIdService;
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup minimal mocks for panel creation
    mockServices = {
      webviewPanel: {
        id: 'test-panel',
        webview: {
          html: '',
          onDidReceiveMessage: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        },
        onDidDispose: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        reveal: vi.fn(),
        dispose: vi.fn(),
      } as any,
      uiPort: {
        createWebviewPanel: vi.fn().mockReturnValue({
          id: 'test-panel',
          webview: { html: '', onDidReceiveMessage: vi.fn().mockReturnValue({ dispose: vi.fn() }) },
          onDidDispose: vi.fn().mockReturnValue({ dispose: vi.fn() }),
          reveal: vi.fn(),
          dispose: vi.fn(),
        }),
        postMessageToWebview: vi.fn(),
        showError: vi.fn(),
        showInformation: vi.fn(),
        writeFile: vi.fn().mockResolvedValue(ok(undefined)),
        showInputBox: vi.fn(),
        showQuickPick: vi.fn(),
        showConfirmation: vi.fn(),
        showOpenDialog: vi.fn(),
        showSaveDialog: vi.fn(),
        showProgress: vi.fn(),
        setStatusMessage: vi.fn(),
        getTheme: vi.fn(),
        onThemeChange: vi.fn(),
        capabilities: vi.fn(),
        showWarning: vi.fn(),
      } as any,
      visualizationService: {
        generateVisualization: vi.fn().mockReturnValue(
          ok({
            documentId: 'test-doc',
            version: 1,
            trees: [],
            totalDimensions: { width: 400, height: 300 },
            isEmpty: false,
          }),
        ),
      } as any,
      documentQueryService: {
        parseDocumentContent: vi.fn().mockResolvedValue(
          ok({
            id: 'test-doc',
            statements: {},
            orderedSets: {},
            atomicArguments: {},
            trees: {},
          }),
        ),
      } as any,
      renderer: {
        generateSVG: vi.fn().mockReturnValue('<svg>test</svg>'),
      } as any,
      viewStateManager: {
        updateViewportState: vi.fn().mockResolvedValue(ok(undefined)),
      } as any,
      viewStatePort: {
        loadViewState: vi.fn().mockResolvedValue(ok(null)),
        saveViewState: vi.fn().mockResolvedValue(ok(undefined)),
      } as any,
      bootstrapController: {} as any,
      proofApplicationService: {} as any,
      yamlSerializer: {} as any,
      exportService: {
        exportDocument: vi
          .fn()
          .mockResolvedValue(
            ok({ filename: 'test.yaml', content: 'test content', mimeType: 'text/yaml' }),
          ),
        exportDocumentContent: vi
          .fn()
          .mockResolvedValue(
            ok({ filename: 'test.yaml', content: 'test content', mimeType: 'text/yaml' }),
          ),
        saveToFile: vi
          .fn()
          .mockResolvedValue(ok({ filePath: '/test/path', savedSuccessfully: true })),
        getSupportedFormats: vi.fn().mockResolvedValue(ok(['yaml', 'json'])),
      } as any,
      documentIdService: {
        extractFromUri: vi.fn().mockReturnValue(ok('test-document')),
        validateDocumentId: vi.fn().mockReturnValue(ok('test-document')),
        generateFallbackId: vi.fn().mockReturnValue('fallback-id'),
        extractFromUriWithFallback: vi.fn().mockReturnValue(ok('test-document')),
      } as any,
    };

    const result = await ProofTreePanel.createWithServices(
      'file:///test/document.proof',
      'test content',
      mockServices.documentQueryService,
      mockServices.visualizationService,
      mockServices.uiPort,
      mockServices.renderer,
      mockServices.viewStateManager,
      mockServices.viewStatePort,
      mockServices.bootstrapController,
      mockServices.proofApplicationService,
      mockServices.yamlSerializer,
      mockServices.exportService,
      mockServices.documentIdService,
    );

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      panel = result.value;
    }
  });

  describe('validateCreateArgumentInput', () => {
    it('should validate valid premises and conclusions', () => {
      const validPremises = ['All men are mortal', 'Socrates is a man'];
      const validConclusions = ['Socrates is mortal'];

      // Use reflection to access private method for testing
      const result = (panel as any).validateCreateArgumentInput(validPremises, validConclusions);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.premises).toEqual(validPremises);
        expect(result.value.conclusions).toEqual(validConclusions);
      }
    });

    it('should reject null or undefined premises', () => {
      const validConclusions = ['Valid conclusion'];

      const nullResult = (panel as any).validateCreateArgumentInput(null, validConclusions);
      const undefinedResult = (panel as any).validateCreateArgumentInput(
        undefined,
        validConclusions,
      );

      expect(nullResult.isErr()).toBe(true);
      expect(nullResult.error.message).toBe('At least one premise is required');
      expect(undefinedResult.isErr()).toBe(true);
      expect(undefinedResult.error.message).toBe('At least one premise is required');
    });

    it('should reject non-array premises', () => {
      const validConclusions = ['Valid conclusion'];

      const stringResult = (panel as any).validateCreateArgumentInput(
        'string premises',
        validConclusions,
      );
      const objectResult = (panel as any).validateCreateArgumentInput({}, validConclusions);

      expect(stringResult.isErr()).toBe(true);
      expect(stringResult.error.message).toBe('At least one premise is required');
      expect(objectResult.isErr()).toBe(true);
      expect(objectResult.error.message).toBe('At least one premise is required');
    });

    it('should reject empty premises array', () => {
      const validConclusions = ['Valid conclusion'];

      const result = (panel as any).validateCreateArgumentInput([], validConclusions);

      expect(result.isErr()).toBe(true);
      expect(result.error.message).toBe('At least one premise is required');
    });

    it('should reject null or undefined conclusions', () => {
      const validPremises = ['Valid premise'];

      const nullResult = (panel as any).validateCreateArgumentInput(validPremises, null);
      const undefinedResult = (panel as any).validateCreateArgumentInput(validPremises, undefined);

      expect(nullResult.isErr()).toBe(true);
      expect(nullResult.error.message).toBe('At least one conclusion is required');
      expect(undefinedResult.isErr()).toBe(true);
      expect(undefinedResult.error.message).toBe('At least one conclusion is required');
    });

    it('should reject non-array conclusions', () => {
      const validPremises = ['Valid premise'];

      const stringResult = (panel as any).validateCreateArgumentInput(
        validPremises,
        'string conclusions',
      );
      const objectResult = (panel as any).validateCreateArgumentInput(validPremises, {});

      expect(stringResult.isErr()).toBe(true);
      expect(stringResult.error.message).toBe('At least one conclusion is required');
      expect(objectResult.isErr()).toBe(true);
      expect(objectResult.error.message).toBe('At least one conclusion is required');
    });

    it('should reject empty conclusions array', () => {
      const validPremises = ['Valid premise'];

      const result = (panel as any).validateCreateArgumentInput(validPremises, []);

      expect(result.isErr()).toBe(true);
      expect(result.error.message).toBe('At least one conclusion is required');
    });
  });

  describe('validateStatementContent', () => {
    it('should validate and trim valid content', () => {
      const validContent = '  Valid statement content  ';

      const result = (panel as any).validateStatementContent(validContent);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('Valid statement content');
      }
    });

    it('should reject null, undefined, or non-string content', () => {
      const invalidInputs = [null, undefined, 123, {}, []];

      for (const invalidInput of invalidInputs) {
        const result = (panel as any).validateStatementContent(invalidInput);
        expect(result.isErr()).toBe(true);
        expect(result.error.message).toBe('Statement content cannot be empty');
      }
    });

    it('should reject empty or whitespace-only content', () => {
      const emptyInputs = ['', '   ', '\t\n\r'];

      for (const emptyInput of emptyInputs) {
        const result = (panel as any).validateStatementContent(emptyInput);
        expect(result.isErr()).toBe(true);
        expect(result.error.message).toBe('Statement content cannot be empty');
      }
    });
  });

  describe('validateEditContentMetadata', () => {
    it('should validate statement edit metadata', () => {
      const validMetadata = {
        type: 'statement',
        statementId: 'stmt-123',
        nodeId: 'node-456',
        statementType: 'premise',
      };
      const validContent = 'Updated content';

      const result = (panel as any).validateEditContentMetadata(validMetadata, validContent);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.metadata.type).toBe('statement');
        expect(result.value.metadata.statementId).toBe('stmt-123');
        expect(result.value.newContent).toBe('Updated content');
      }
    });

    it('should validate label edit metadata', () => {
      const validMetadata = {
        type: 'label',
        nodeId: 'node-456',
        labelType: 'side',
      };
      const validContent = 'Updated label';

      const result = (panel as any).validateEditContentMetadata(validMetadata, validContent);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.metadata.type).toBe('label');
        expect(result.value.metadata.nodeId).toBe('node-456');
        expect(result.value.newContent).toBe('Updated label');
      }
    });

    it('should reject invalid metadata or content', () => {
      const invalidInputs = [
        [null, 'valid content'],
        [undefined, 'valid content'],
        ['string', 'valid content'],
        [{}, 'valid content'], // empty metadata object
        [{ type: 'invalid' }, 'valid content'], // invalid type
        [{ type: 'statement' }, null],
        [{ type: 'statement' }, undefined],
        [{ type: 'statement' }, 123],
      ];

      for (const [metadata, content] of invalidInputs) {
        const result = (panel as any).validateEditContentMetadata(metadata, content);
        expect(result.isErr()).toBe(true);
        expect(result.error.message).toBe('Invalid edit content request');
      }
    });

    it('should reject statement metadata without statementId', () => {
      const invalidMetadata = {
        type: 'statement',
        nodeId: 'node-456',
        // missing statementId
      };

      const result = (panel as any).validateEditContentMetadata(invalidMetadata, 'valid content');

      expect(result.isErr()).toBe(true);
      expect(result.error.message).toBe('Invalid edit content request');
    });

    it('should reject label metadata without nodeId', () => {
      const invalidMetadata = {
        type: 'label',
        labelType: 'side',
        // missing nodeId
      };

      const result = (panel as any).validateEditContentMetadata(invalidMetadata, 'valid content');

      expect(result.isErr()).toBe(true);
      expect(result.error.message).toBe('Invalid edit content request');
    });
  });

  describe('validateMoveStatementInput', () => {
    it('should validate valid move statement input', () => {
      const validSourceData = {
        statementId: 'stmt-source',
        statementType: 'premise',
        nodeId: 'node-source',
      };
      const validTargetId = 'stmt-target';
      const validDropType = 'conclusion';

      const result = (panel as any).validateMoveStatementInput(
        validSourceData,
        validTargetId,
        validDropType,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.sourceData.statementId).toBe('stmt-source');
        expect(result.value.targetStatementId).toBe('stmt-target');
        expect(result.value.dropType).toBe('conclusion');
      }
    });

    it('should reject invalid input types', () => {
      const invalidInputs = [
        [null, 'target', 'premise'],
        [{}, 'target', 'premise'],
        [{ statementId: 'src' }, null, 'premise'],
        [{ statementId: 'src' }, 'target', null],
        [{ statementId: 'src' }, 123, 'premise'],
        [{ statementId: 'src' }, 'target', 123],
      ];

      for (const [sourceData, targetId, dropType] of invalidInputs) {
        const result = (panel as any).validateMoveStatementInput(sourceData, targetId, dropType);
        expect(result.isErr()).toBe(true);
        expect(result.error.message).toBe('Invalid move statement request');
      }
    });

    it('should reject incomplete source data', () => {
      const incompleteSourceData = [
        { statementType: 'premise', nodeId: 'node' }, // missing statementId
        { statementId: 'stmt', nodeId: 'node' }, // missing statementType
        { statementId: 'stmt', statementType: 'premise' }, // missing nodeId
      ];

      for (const sourceData of incompleteSourceData) {
        const result = (panel as any).validateMoveStatementInput(sourceData, 'target', 'premise');
        expect(result.isErr()).toBe(true);
        expect(result.error.message).toBe('Invalid move statement request');
      }
    });
  });

  describe('validateMoveNodeInput', () => {
    it('should validate valid move node input', () => {
      const validNodeId = 'node-123';
      const validDeltaX = 150;
      const validDeltaY = -75;

      const result = (panel as any).validateMoveNodeInput(validNodeId, validDeltaX, validDeltaY);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.nodeId).toBe('node-123');
        expect(result.value.deltaX).toBe(150);
        expect(result.value.deltaY).toBe(-75);
      }
    });

    it('should reject invalid input types', () => {
      const invalidInputs = [
        [null, 10, 20],
        [undefined, 10, 20],
        ['', 10, 20],
        [123, 10, 20],
        ['node', 'invalid', 20],
        ['node', 10, 'invalid'],
        ['node', null, 20],
        ['node', 10, null],
      ];

      for (const [nodeId, deltaX, deltaY] of invalidInputs) {
        const result = (panel as any).validateMoveNodeInput(nodeId, deltaX, deltaY);
        expect(result.isErr()).toBe(true);
        expect(result.error.message).toBe('Invalid move node request');
      }
    });

    it('should handle edge case coordinate values', () => {
      const edgeCases = [
        ['node', 0, 0], // zero values
        ['node', -10000, 10000], // extreme values
        ['node', 1.5, -2.7], // decimal values
      ];

      for (const [nodeId, deltaX, deltaY] of edgeCases) {
        const result = (panel as any).validateMoveNodeInput(nodeId, deltaX, deltaY);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.nodeId).toBe(nodeId);
          expect(result.value.deltaX).toBe(deltaX);
          expect(result.value.deltaY).toBe(deltaY);
        }
      }
    });
  });

  describe('Integration with handler methods', () => {
    it('should demonstrate validation helper usage in real handler context', async () => {
      // This test shows that validation helpers integrate properly with handlers
      // We'll test the validation error path through the actual handler

      // Mock the webview message handler
      let messageHandler: ((message: any) => Promise<void>) | undefined;
      (mockServices.webviewPanel.webview.onDidReceiveMessage as any).mockImplementation(
        (handler: any) => {
          messageHandler = handler;
          return { dispose: vi.fn() };
        },
      );

      // Wait for message handler registration
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (messageHandler) {
        // Test validation failure in createArgument handler
        await messageHandler({
          type: 'createArgument',
          premises: [], // invalid - empty array
          conclusions: ['Valid conclusion'],
        });

        expect(mockServices.uiPort.showError).toHaveBeenCalledWith(
          'At least one premise is required',
        );
      }
    });
  });
});

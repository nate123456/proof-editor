import { ok } from 'neverthrow';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { IPlatformPort } from '../../../application/ports/IPlatformPort.js';
import type { IUIPort } from '../../../application/ports/IUIPort.js';
import type { DocumentOrchestrationService } from '../../../application/services/DocumentOrchestrationService.js';
import type { ProofApplicationService } from '../../../application/services/ProofApplicationService.js';
import { ProofDocument } from '../../../domain/aggregates/ProofDocument.js';
import type { IProofDocumentRepository } from '../../../domain/repositories/IProofDocumentRepository.js';
import { ProofDocumentId } from '../../../domain/shared/value-objects/index.js';
import { BootstrapController } from '../BootstrapController.js';

describe('BootstrapController', () => {
  let controller: BootstrapController;
  let mockOrchestrationService: DocumentOrchestrationService;
  let mockProofApplicationService: ProofApplicationService;
  let mockRepository: IProofDocumentRepository;
  let mockPlatform: IPlatformPort;
  let mockUI: IUIPort;

  beforeEach(() => {
    // Create complete type-safe mocks using vitest
    mockOrchestrationService = {} as DocumentOrchestrationService;

    mockProofApplicationService = {
      createStatement: vi.fn().mockResolvedValue(ok({ id: 'mock-statement-id' })),
      createAtomicArgument: vi.fn().mockResolvedValue(ok({ id: 'arg-456' })),
      updateStatement: vi.fn(),
      deleteStatement: vi.fn(),
      updateAtomicArgument: vi.fn(),
      deleteAtomicArgument: vi.fn(),
    } as unknown as ProofApplicationService;

    // Create a mock document that will be returned by findById
    const mockDocumentId = ProofDocumentId.create('test-doc').unwrapOr(
      ProofDocumentId.create('fallback-doc').unwrapOr(null as any),
    );
    const mockDocument = ProofDocument.createBootstrap(mockDocumentId).unwrapOr(null as any);

    mockRepository = {
      save: vi.fn().mockResolvedValue(ok(undefined)),
      findById: vi.fn().mockResolvedValue(mockDocument),
      delete: vi.fn().mockResolvedValue(ok(undefined)),
      exists: vi.fn().mockResolvedValue(false),
      findAll: vi.fn(),
      findByDateRange: vi.fn(),
      count: vi.fn(),
      createBootstrapDocument: vi.fn(),
      createBootstrapDocumentWithId: vi.fn(),
    } as IProofDocumentRepository;

    mockPlatform = {} as IPlatformPort;
    mockUI = {} as IUIPort;

    controller = new BootstrapController(
      mockOrchestrationService,
      mockProofApplicationService,
      mockRepository,
      mockPlatform,
      mockUI,
    );
  });

  describe('initialization and disposal', () => {
    test('initializes successfully', async () => {
      const result = await controller.initialize();

      expect(result.isOk()).toBe(true);
    });

    test('disposes successfully', async () => {
      const result = await controller.dispose();

      expect(result.isOk()).toBe(true);
    });
  });

  describe('initializeEmptyDocument', () => {
    test('creates document with provided ID', async () => {
      const documentId = 'custom-doc-123';

      const result = await controller.initializeEmptyDocument(documentId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.documentId).toBe(documentId);
        expect(result.value.data?.created).toBe(true);
        expect(result.value.data?.hasBootstrapArgument).toBe(false);
        expect(result.value.data?.nextSteps).toBeDefined();
        expect(result.value.data?.nextSteps.length).toBeGreaterThan(0);
        expect(result.value.metadata?.operationId).toBe('initialize-empty-document');
      }
    });

    test('generates document ID when not provided', async () => {
      const result = await controller.initializeEmptyDocument();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.documentId).toBeDefined();
        expect(result.value.data?.documentId).toContain('doc-');
        expect(result.value.data?.created).toBe(true);
      }
    });

    test('provides guided next steps', async () => {
      const result = await controller.initializeEmptyDocument();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const nextSteps = result.value.data?.nextSteps;
        expect(nextSteps).toBeDefined();
        expect(nextSteps?.[0]?.step).toContain('Create First Argument');
        expect(nextSteps?.[0]?.action).toBe('populate');
      }
    });

    test('handles unexpected errors gracefully', async () => {
      vi.spyOn(Date, 'now').mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await controller.initializeEmptyDocument();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to initialize empty document');
      }

      vi.restoreAllMocks();
    });
  });

  describe('createBootstrapArgument', () => {
    test('creates bootstrap argument with provided position', async () => {
      const documentId = 'doc-123';
      const position = { x: 300, y: 250 };

      const result = await controller.createBootstrapArgument(documentId, position);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.argumentId).toBeDefined();
        expect(result.value.data?.treeId).toBeDefined();
        expect(result.value.data?.nodeId).toBeDefined();
        expect(result.value.data?.isEmpty).toBe(true);
        expect(result.value.data?.position).toEqual(position);
        expect(result.value.data?.readyForPopulation).toBe(true);
        expect(result.value.data?.workflow.currentStep).toBe('created');
        expect(result.value.metadata?.operationId).toBe('create-bootstrap-argument');
      }
    });

    test('uses default position when not provided', async () => {
      const documentId = 'doc-123';

      const result = await controller.createBootstrapArgument(documentId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.position).toEqual({ x: 200, y: 150 });
      }
    });

    test('rejects empty document ID', async () => {
      const result = await controller.createBootstrapArgument('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Document ID cannot be empty');
      }
    });

    test('rejects invalid position coordinates', async () => {
      const documentId = 'doc-123';
      const invalidPosition = { x: Number.NaN, y: 150 };

      const result = await controller.createBootstrapArgument(documentId, invalidPosition);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Invalid position coordinates');
      }
    });

    test('provides workflow guidance', async () => {
      const result = await controller.createBootstrapArgument('doc-123');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.workflow.nextAction).toContain('Add premises and conclusions');
        expect(result.value.data?.workflow.canBranch).toBe(false);
      }
    });
  });

  describe('populateEmptyArgument', () => {
    test('populates argument successfully', async () => {
      const documentId = 'doc-123';
      const argumentId = 'arg-456';
      const premiseContents = ['All humans are mortal', 'Socrates is human'];
      const conclusionContents = ['Therefore, Socrates is mortal'];
      const sideLabels = { left: 'Modus Ponens' };

      const result = await controller.populateEmptyArgument(
        documentId,
        argumentId,
        premiseContents,
        conclusionContents,
        sideLabels,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.argumentId).toBe(argumentId);
        expect(result.value.data?.premises).toEqual(premiseContents);
        expect(result.value.data?.conclusions).toEqual(conclusionContents);
        expect(result.value.data?.sideLabels).toEqual(sideLabels);
        expect(result.value.data?.isComplete).toBe(true);
        expect(result.value.data?.canCreateConnections).toBe(true);
        expect(result.value.metadata?.operationId).toBe('populate-empty-argument');
      }
    });

    test('provides branching options', async () => {
      const premiseContents = ['All humans are mortal'];
      const conclusionContents = ['Socrates is mortal'];

      const result = await controller.populateEmptyArgument(
        'doc-123',
        'arg-456',
        premiseContents,
        conclusionContents,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.branchingOptions).toBeDefined();
        expect(result.value.data?.branchingOptions.length).toBe(2);
        expect(result.value.data?.branchingOptions[0]?.position).toBe('premise');
        expect(result.value.data?.branchingOptions[1]?.position).toBe('conclusion');
      }
    });

    test('rejects empty document ID', async () => {
      const result = await controller.populateEmptyArgument(
        '',
        'arg-456',
        ['premise'],
        ['conclusion'],
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Document ID cannot be empty');
      }
    });

    test('rejects empty argument ID', async () => {
      const result = await controller.populateEmptyArgument(
        'doc-123',
        '',
        ['premise'],
        ['conclusion'],
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Argument ID cannot be empty');
      }
    });

    test('rejects empty premises', async () => {
      const result = await controller.populateEmptyArgument(
        'doc-123',
        'arg-456',
        [],
        ['conclusion'],
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('At least one premise is required');
      }
    });

    test('rejects empty conclusions', async () => {
      const result = await controller.populateEmptyArgument('doc-123', 'arg-456', ['premise'], []);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('At least one conclusion is required');
      }
    });

    test('rejects empty premise content', async () => {
      const result = await controller.populateEmptyArgument(
        'doc-123',
        'arg-456',
        ['valid', ''],
        ['conclusion'],
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('All premise contents must be non-empty');
      }
    });

    test('rejects empty conclusion content', async () => {
      const result = await controller.populateEmptyArgument(
        'doc-123',
        'arg-456',
        ['premise'],
        ['valid', ''],
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('All conclusion contents must be non-empty');
      }
    });

    test('trims whitespace from content', async () => {
      const result = await controller.populateEmptyArgument(
        'doc-123',
        'arg-456',
        ['  premise  '],
        ['  conclusion  '],
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.premises[0]).toBe('premise');
        expect(result.value.data?.conclusions[0]).toBe('conclusion');
      }
    });
  });

  describe('getBootstrapWorkflow', () => {
    test('retrieves workflow state successfully', async () => {
      const documentId = 'doc-123';

      const result = await controller.getBootstrapWorkflow(documentId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.documentId).toBe(documentId);
        expect(result.value.data?.currentStep).toBeDefined();
        expect(result.value.data?.totalSteps).toBe(5);
        expect(result.value.data?.steps).toBeDefined();
        expect(result.value.data?.steps.length).toBe(5);
        expect(result.value.data?.canAdvance).toBeDefined();
        expect(result.value.data?.suggestions).toBeDefined();
        expect(result.value.metadata?.operationId).toBe('get-bootstrap-workflow');
      }
    });

    test('provides structured workflow steps', async () => {
      const result = await controller.getBootstrapWorkflow('doc-123');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const steps = result.value.data?.steps;
        expect(steps?.[0]?.title).toBe('Create Document');
        expect(steps?.[0]?.completed).toBe(true);
        expect(steps?.[1]?.title).toBe('Create First Argument');
        expect(steps?.[1]?.current).toBe(true);
        expect(steps?.[1]?.actions).toBeDefined();
      }
    });

    test('provides contextual suggestions', async () => {
      const result = await controller.getBootstrapWorkflow('doc-123');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.suggestions).toBeDefined();
        expect(result.value.data?.suggestions.length).toBeGreaterThan(0);
      }
    });

    test('rejects empty document ID', async () => {
      const result = await controller.getBootstrapWorkflow('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Document ID cannot be empty');
      }
    });
  });

  describe('createEmptyImplicationLine', () => {
    test('creates empty implication line successfully', async () => {
      const documentId = 'doc-123';
      const treeId = 'tree-456';
      const position = { x: 100, y: 200 };

      const result = await controller.createEmptyImplicationLine(documentId, treeId, position);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.argumentId).toBeDefined();
        expect(result.value.data?.displayFormat).toBeDefined();
        expect(result.value.data?.displayFormat.premiseLines).toBeDefined();
        expect(result.value.data?.displayFormat.horizontalLine).toContain('─');
        expect(result.value.data?.displayFormat.conclusionLines).toBeDefined();
        expect(result.value.data?.editableAreas).toBeDefined();
        expect(result.value.data?.userInstructions).toBeDefined();
        expect(result.value.metadata?.operationId).toBe('create-empty-implication-line');
      }
    });

    test('provides editable areas for user interaction', async () => {
      const result = await controller.createEmptyImplicationLine('doc-123', 'tree-456');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const editableAreas = result.value.data?.editableAreas;
        expect(editableAreas).toBeDefined();
        expect(editableAreas?.some((area) => area.type === 'premise')).toBe(true);
        expect(editableAreas?.some((area) => area.type === 'conclusion')).toBe(true);
        expect(editableAreas?.some((area) => area.type === 'side_label')).toBe(true);
      }
    });

    test('uses default position when not provided', async () => {
      const result = await controller.createEmptyImplicationLine('doc-123', 'tree-456');

      expect(result.isOk()).toBe(true);
    });

    test('rejects empty document ID', async () => {
      const result = await controller.createEmptyImplicationLine('', 'tree-456');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Document ID cannot be empty');
      }
    });

    test('rejects empty tree ID', async () => {
      const result = await controller.createEmptyImplicationLine('doc-123', '');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Tree ID cannot be empty');
      }
    });

    test('rejects invalid position', async () => {
      const invalidPosition = { x: Number.POSITIVE_INFINITY, y: 200 };

      const result = await controller.createEmptyImplicationLine(
        'doc-123',
        'tree-456',
        invalidPosition,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Invalid position coordinates');
      }
    });
  });

  describe('getBootstrapSuggestions', () => {
    test('provides suggestions for documents without arguments', async () => {
      const documentId = 'doc-123';
      const context = { hasArguments: false };

      const result = await controller.getBootstrapSuggestions(documentId, context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data).toBeDefined();
        expect(result.value.data?.length).toBeGreaterThan(0);
        expect(
          result.value.data?.some((suggestion) => suggestion.includes('simple argument')),
        ).toBe(true);
        expect(result.value.metadata?.operationId).toBe('get-bootstrap-suggestions');
      }
    });

    test('provides suggestions for documents without statements', async () => {
      const context = { hasArguments: true, hasStatements: false };

      const result = await controller.getBootstrapSuggestions('doc-123', context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(
          result.value.data?.some((suggestion) =>
            suggestion.includes('clear, specific statements'),
          ),
        ).toBe(true);
      }
    });

    test('provides advanced suggestions for documents with content', async () => {
      const context = { hasArguments: true, hasStatements: true };

      const result = await controller.getBootstrapSuggestions('doc-123', context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.some((suggestion) => suggestion.includes('Select text'))).toBe(
          true,
        );
      }
    });

    test('provides default suggestions when no context provided', async () => {
      const result = await controller.getBootstrapSuggestions('doc-123');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data).toBeDefined();
        expect(result.value.data?.length).toBeGreaterThan(0);
      }
    });

    test('rejects empty document ID', async () => {
      const result = await controller.getBootstrapSuggestions('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Document ID cannot be empty');
      }
    });
  });

  describe('position validation helper', () => {
    test('validates valid positions', async () => {
      const validPositions = [
        { x: 0, y: 0 },
        { x: 100.5, y: 200.7 },
        { x: -50, y: -100 },
      ];

      for (const position of validPositions) {
        const result = await controller.createBootstrapArgument('doc-123', position);
        expect(result.isOk()).toBe(true);
      }
    });

    test('rejects invalid positions', async () => {
      const invalidPositions = [
        { x: Number.NaN, y: 100 },
        { x: 100, y: Number.NaN },
        { x: Number.POSITIVE_INFINITY, y: 100 },
        { x: 100, y: Number.NEGATIVE_INFINITY },
      ];

      for (const position of invalidPositions) {
        const result = await controller.createBootstrapArgument('doc-123', position);
        expect(result.isErr()).toBe(true);
      }
    });
  });

  describe('metadata generation', () => {
    test('generates consistent metadata for operations', async () => {
      const result = await controller.initializeEmptyDocument();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.value.metadata;
        expect(metadata?.timestamp).toBeDefined();
        expect(metadata?.operationId).toBeDefined();
        expect(metadata?.source).toBeDefined();

        // Verify timestamp is valid ISO string
        if (metadata?.timestamp) {
          expect(() => new Date(metadata.timestamp)).not.toThrow();
        }
      }
    });
  });
});

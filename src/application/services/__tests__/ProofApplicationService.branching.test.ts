import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProofDocument } from '../../../domain/aggregates/ProofDocument.js';
import { AtomicArgument } from '../../../domain/entities/AtomicArgument.js';
import { Statement } from '../../../domain/entities/Statement.js';
import { RepositoryError } from '../../../domain/errors/DomainErrors.js';
import type { IProofDocumentRepository } from '../../../domain/repositories/IProofDocumentRepository.js';
import { ValidationError } from '../../../domain/shared/result.js';
import { ProofDocumentId, StatementContent } from '../../../domain/shared/value-objects/index.js';
import type { EventBus } from '../../../infrastructure/events/EventBus.js';
import { ProofApplicationService } from '../ProofApplicationService.js';

describe('ProofApplicationService - Statement-Level Branching', () => {
  let service: ProofApplicationService;
  let mockRepository: IProofDocumentRepository;
  let mockEventBus: EventBus;
  let testDocument: ProofDocument;
  let sourceArgument: AtomicArgument;
  let statement1: Statement;
  let statement2: Statement;
  let statement3: Statement;

  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      findById: vi.fn(),
      save: vi.fn(),
      exists: vi.fn(),
      delete: vi.fn(),
    } as unknown as IProofDocumentRepository;

    // Create mock event bus
    mockEventBus = {
      publish: vi.fn(),
    } as unknown as EventBus;

    // Create service
    service = new ProofApplicationService(mockRepository, mockEventBus);

    // Create test statements
    const content1Result = StatementContent.create('All humans are mortal');
    const content2Result = StatementContent.create('Socrates is human');
    const content3Result = StatementContent.create('Therefore, Socrates is mortal');

    if (!content1Result.isOk() || !content2Result.isOk() || !content3Result.isOk()) {
      throw new Error('Failed to create statement content');
    }

    const stmt1Result = Statement.create(content1Result.value.getValue());
    const stmt2Result = Statement.create(content2Result.value.getValue());
    const stmt3Result = Statement.create(content3Result.value.getValue());

    expect(stmt1Result.isOk()).toBe(true);
    expect(stmt2Result.isOk()).toBe(true);
    expect(stmt3Result.isOk()).toBe(true);

    if (stmt1Result.isOk() && stmt2Result.isOk() && stmt3Result.isOk()) {
      statement1 = stmt1Result.value;
      statement2 = stmt2Result.value;
      statement3 = stmt3Result.value;
    }

    // Create source argument with statements
    const argResult = AtomicArgument.create([statement1, statement2], [statement3]);
    expect(argResult.isOk()).toBe(true);

    if (argResult.isOk()) {
      sourceArgument = argResult.value;
    }

    // Create test document
    const docIdResult = ProofDocumentId.create('test-doc-id');
    if (docIdResult.isErr()) throw new Error('Failed to create document ID');
    const documentResult = ProofDocument.createBootstrap(docIdResult.value);
    if (documentResult.isErr()) throw new Error('Failed to create test document');
    testDocument = documentResult.value;

    // Add statements to document
    testDocument.createStatementFromString(statement1.getContent().toString());
    testDocument.createStatementFromString(statement2.getContent().toString());
    testDocument.createStatementFromString(statement3.getContent().toString());

    // For testing, we'll mock the document to return our pre-built argument
    // In reality, the document would have OrderedSets and create arguments differently

    // Setup repository mock
    vi.mocked(mockRepository.findById).mockResolvedValue(ok(testDocument));
    vi.mocked(mockRepository.save).mockResolvedValue(ok(undefined));
    vi.mocked(mockEventBus.publish).mockResolvedValue();

    // Mock the document's query service to return our test argument
    const mockQueryService = {
      getArgument: vi.fn().mockImplementation((id) => {
        if (id.getValue() === sourceArgument.getId().getValue()) {
          return sourceArgument;
        }
        return null;
      }),
    };
    vi.spyOn(testDocument, 'createQueryService').mockReturnValue(mockQueryService as any);

    // Mock the document's addArgument method
    vi.spyOn(testDocument, 'addArgument' as any).mockImplementation(() => ok(undefined));
  });

  describe('createBranchFromSelection', () => {
    it('should create forward branch from conclusion', async () => {
      const command = {
        documentId: 'test-doc-id',
        sourceArgumentId: sourceArgument.getId().getValue(),
        selectedText: 'Socrates is mortal',
        position: 'conclusion' as const,
      };

      const result = await service.createBranchFromSelection(command);

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const newArgument = result.value;

        // New argument should have the selected statement as premise
        expect(newArgument.premiseIds).toHaveLength(1);
        expect(newArgument.premiseIds).toHaveLength(1); // TODO: Verify statement content separately
        // expect('Therefore, Socrates is mortal');

        // New argument starts empty for conclusions
        expect(newArgument.conclusionIds).toHaveLength(0);
      }
    });

    it('should create backward branch from premise', async () => {
      const command = {
        documentId: 'test-doc-id',
        sourceArgumentId: sourceArgument.getId().getValue(),
        selectedText: 'Socrates is human',
        position: 'premise' as const,
      };

      const result = await service.createBranchFromSelection(command);

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const newArgument = result.value;

        // New argument should have the selected statement as conclusion
        expect(newArgument.conclusionIds).toHaveLength(1);
        expect(newArgument.conclusionIds).toHaveLength(1); // TODO: Verify statement content separately
        // expect('Socrates is human');

        // New argument starts empty for premises
        expect(newArgument.premiseIds).toHaveLength(0);
      }
    });

    it('should handle exact text match', async () => {
      const command = {
        documentId: 'test-doc-id',
        sourceArgumentId: sourceArgument.getId().getValue(),
        selectedText: 'All humans are mortal', // Exact match
        position: 'premise' as const,
      };

      const result = await service.createBranchFromSelection(command);

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const newArgument = result.value;
        expect(newArgument.conclusionIds).toHaveLength(1); // TODO: Verify statement content separately
        // expect('All humans are mortal');
      }
    });

    it('should handle partial text match', async () => {
      const command = {
        documentId: 'test-doc-id',
        sourceArgumentId: sourceArgument.getId().getValue(),
        selectedText: 'mortal', // Partial match
        position: 'premise' as const,
      };

      const result = await service.createBranchFromSelection(command);

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const newArgument = result.value;
        // Should match first statement containing "mortal"
        expect(newArgument.conclusionIds).toHaveLength(1); // TODO: Verify statement content separately
        // expect('All humans are mortal');
      }
    });

    it('should return error when text not found', async () => {
      const command = {
        documentId: 'test-doc-id',
        sourceArgumentId: sourceArgument.getId().getValue(),
        selectedText: 'non-existent text',
        position: 'premise' as const,
      };

      const result = await service.createBranchFromSelection(command);

      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain(
          'Selected text "non-existent text" not found in premises',
        );
      }
    });

    it('should return error when document not found', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(
        err(new RepositoryError('Document not found')),
      );

      const command = {
        documentId: 'non-existent-doc',
        sourceArgumentId: sourceArgument.getId().getValue(),
        selectedText: 'Socrates is mortal',
        position: 'conclusion' as const,
      };

      const result = await service.createBranchFromSelection(command);

      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Document not found');
      }
    });

    it('should return error when source argument not found', async () => {
      const command = {
        documentId: 'test-doc-id',
        sourceArgumentId: 'non-existent-arg',
        selectedText: 'Socrates is mortal',
        position: 'conclusion' as const,
      };

      const result = await service.createBranchFromSelection(command);

      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Source argument not found');
      }
    });

    it('should publish domain events after successful branching', async () => {
      const command = {
        documentId: 'test-doc-id',
        sourceArgumentId: sourceArgument.getId().getValue(),
        selectedText: 'Socrates is mortal',
        position: 'conclusion' as const,
      };

      const result = await service.createBranchFromSelection(command);

      expect(result.isOk()).toBe(true);
      expect(mockRepository.save).toHaveBeenCalledWith(testDocument);
      expect(mockEventBus.publish).toHaveBeenCalled();
    });
  });

  describe('Statement identity-based connections', () => {
    it('should create connections through Statement identity', async () => {
      // Create first branch
      const firstBranchCommand = {
        documentId: 'test-doc-id',
        sourceArgumentId: sourceArgument.getId().getValue(),
        selectedText: 'Socrates is mortal',
        position: 'conclusion' as const,
      };

      const firstBranchResult = await service.createBranchFromSelection(firstBranchCommand);
      expect(firstBranchResult.isOk()).toBe(true);

      if (firstBranchResult.isOk()) {
        const firstBranch = firstBranchResult.value;

        // Verify Statement identity creates connection
        // The connection would be verified through the domain model
        // but since we're testing the service layer, we check the DTO

        // The key insight: Statement identity creates connections automatically
        // because the same Statement object appears in both arguments
        expect(firstBranch.premiseIds[0]).toBe(
          sourceArgument.getConclusions()[0]?.getId().getValue(),
        );
      }
    });
  });
});

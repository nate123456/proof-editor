import { ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProofDocument } from '../../../domain/aggregates/ProofDocument.js';
import { AtomicArgument } from '../../../domain/entities/AtomicArgument.js';
import { Statement } from '../../../domain/entities/Statement.js';
import type { IProofDocumentRepository } from '../../../domain/repositories/IProofDocumentRepository.js';
import { ValidationError } from '../../../domain/shared/result.js';
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
    const stmt1Result = Statement.create('All humans are mortal');
    const stmt2Result = Statement.create('Socrates is human');
    const stmt3Result = Statement.create('Therefore, Socrates is mortal');

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
    testDocument = ProofDocument.create();

    // Add statements to document
    testDocument.createStatement(statement1.getContent());
    testDocument.createStatement(statement2.getContent());
    testDocument.createStatement(statement3.getContent());

    // For testing, we'll mock the document to return our pre-built argument
    // In reality, the document would have OrderedSets and create arguments differently

    // Setup repository mock
    vi.mocked(mockRepository.findById).mockResolvedValue(testDocument);
    vi.mocked(mockRepository.save).mockResolvedValue(ok(undefined));
    vi.mocked(mockEventBus.publish).mockResolvedValue();

    // Mock the document's getArgument method to return our test argument
    vi.spyOn(testDocument, 'getArgument').mockImplementation((id) => {
      if (id.getValue() === sourceArgument.getId().getValue()) {
        return sourceArgument;
      }
      return null;
    });

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
        expect(newArgument.premises).toHaveLength(1);
        expect(newArgument.premises[0]?.content).toBe('Therefore, Socrates is mortal');

        // New argument starts empty for conclusions
        expect(newArgument.conclusions).toHaveLength(0);
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
        expect(newArgument.conclusions).toHaveLength(1);
        expect(newArgument.conclusions[0]?.content).toBe('Socrates is human');

        // New argument starts empty for premises
        expect(newArgument.premises).toHaveLength(0);
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
        expect(newArgument.conclusions[0]?.content).toBe('All humans are mortal');
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
        expect(newArgument.conclusions[0]?.content).toBe('All humans are mortal');
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
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

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
        const _connectionFound =
          sourceArgument.isDirectlyConnectedTo(
            // We need to reconstruct the AtomicArgument since the service returns DTO
            // In real usage, this would be handled by the domain model
          );

        // The key insight: Statement identity creates connections automatically
        // because the same Statement object appears in both arguments
        expect(firstBranch.premises[0]?.getId().getValue()).toBe(
          sourceArgument.getConclusions()[0]?.getId().getValue(),
        );
      }
    });
  });
});

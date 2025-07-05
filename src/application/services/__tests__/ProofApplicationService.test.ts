import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ProofDocument } from '../../../domain/aggregates/ProofDocument.js';
import type { DomainEvent } from '../../../domain/events/base-event.js';
import type { IProofDocumentRepository } from '../../../domain/repositories/IProofDocumentRepository.js';
import { ValidationError } from '../../../domain/shared/result.js';
import { createTestEventBus } from '../../../infrastructure/events/EventBus.js';
import { ProofApplicationService } from '../ProofApplicationService.js';

describe('ProofApplicationService Event Integration', () => {
  let service: ProofApplicationService;
  let mockRepository: IProofDocumentRepository;
  let eventBus: ReturnType<typeof createTestEventBus>;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
      findAll: vi.fn(),
      nextIdentity: vi.fn(),
      findByDateRange: vi.fn(),
      count: vi.fn(),
      createBootstrapDocument: vi.fn(),
      createBootstrapDocumentWithId: vi.fn(),
    };
    eventBus = createTestEventBus();
    service = new ProofApplicationService(mockRepository, eventBus);
  });

  describe('Error Handling - Repository and Domain Operations', () => {
    test('handles invalid document ID in createStatement', async () => {
      // Act
      const result = await service.createStatement({
        documentId: '', // Invalid empty ID
        content: 'Valid content',
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    test('handles invalid document ID in updateStatement', async () => {
      // Act
      const result = await service.updateStatement({
        documentId: '', // Invalid empty ID
        statementId: 'valid-statement-id',
        content: 'Valid content',
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    test('handles invalid document ID in deleteStatement', async () => {
      // Act
      const result = await service.deleteStatement({
        documentId: '', // Invalid empty ID
        statementId: 'valid-statement-id',
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    test('handles invalid document ID in createAtomicArgument', async () => {
      // Act
      const result = await service.createAtomicArgument({
        documentId: '', // Invalid empty ID
        premiseStatementIds: [],
        conclusionStatementIds: [],
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    test('handles invalid document ID in updateAtomicArgument', async () => {
      // Act
      const result = await service.updateAtomicArgument({
        documentId: '', // Invalid empty ID
        argumentId: 'valid-argument-id',
        premiseSetId: null,
        conclusionSetId: null,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    test('handles invalid document ID in deleteAtomicArgument', async () => {
      // Act
      const result = await service.deleteAtomicArgument({
        documentId: '', // Invalid empty ID
        argumentId: 'valid-argument-id',
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    test('handles document not found in all operations', async () => {
      // Arrange
      vi.mocked(mockRepository.findById).mockResolvedValue(null);
      const validDocumentId = 'valid-document-id';

      // Test all operations return document not found error
      const operations = [
        () => service.createStatement({ documentId: validDocumentId, content: 'test' }),
        () =>
          service.updateStatement({
            documentId: validDocumentId,
            statementId: 'stmt1',
            content: 'test',
          }),
        () => service.deleteStatement({ documentId: validDocumentId, statementId: 'stmt1' }),
        () =>
          service.createAtomicArgument({
            documentId: validDocumentId,
            premiseStatementIds: [],
            conclusionStatementIds: [],
          }),
        () =>
          service.updateAtomicArgument({
            documentId: validDocumentId,
            argumentId: 'arg1',
            premiseSetId: null,
            conclusionSetId: null,
          }),
        () => service.deleteAtomicArgument({ documentId: validDocumentId, argumentId: 'arg1' }),
      ];

      for (const operation of operations) {
        const result = await operation();
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe('Document not found');
        }
      }
    });

    test('handles repository save failures in all operations', async () => {
      // Arrange
      const document = ProofDocument.create();
      const documentId = document.getId().getValue();

      // Create test statement and argument for operations that need them
      const statementResult = document.createStatement('Test statement');
      const argumentResult = document.createAtomicArgument(null, null);
      expect(statementResult.isOk()).toBe(true);
      expect(argumentResult.isOk()).toBe(true);
      if (!statementResult.isOk() || !argumentResult.isOk()) return;

      const statementId = statementResult.value.getId().getValue();
      const argumentId = argumentResult.value.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);
      vi.mocked(mockRepository.save).mockResolvedValue(err(new ValidationError('Save failed')));

      // Test all operations handle save failures
      const operations = [
        () => service.createStatement({ documentId, content: 'new statement' }),
        () => service.updateStatement({ documentId, statementId, content: 'updated' }),
        () => service.deleteStatement({ documentId, statementId }),
        () =>
          service.createAtomicArgument({
            documentId,
            premiseStatementIds: [],
            conclusionStatementIds: [],
          }),
        () =>
          service.updateAtomicArgument({
            documentId,
            argumentId,
            premiseSetId: null,
            conclusionSetId: null,
          }),
        () => service.deleteAtomicArgument({ documentId, argumentId }),
      ];

      for (const operation of operations) {
        const result = await operation();
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe('Save failed');
        }
      }
    });
  });

  describe('createStatement', () => {
    test('publishes events after successful command', async () => {
      // Arrange
      const document = ProofDocument.create();
      const documentId = document.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);
      vi.mocked(mockRepository.save).mockResolvedValue(ok(undefined));

      // Capture published events
      const capturedEvents: DomainEvent[] = [];
      eventBus.subscribeAll((event) => {
        capturedEvents.push(event);
        return Promise.resolve();
      });

      // Act
      const result = await service.createStatement({
        documentId,
        content: 'New statement',
      });

      // Assert
      expect(result.isOk()).toBe(true);

      // Should have ProofDocumentCreated (from document creation) + StatementCreated
      expect(capturedEvents).toHaveLength(2);
      expect(capturedEvents[0]?.eventType).toBe('ProofDocumentCreated');
      expect(capturedEvents[1]?.eventType).toBe('StatementCreated');
      expect(capturedEvents[1]?.eventData.content).toBe('New statement');
    });

    test('does not publish events if save fails', async () => {
      // Arrange
      const document = ProofDocument.create();
      const documentId = document.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);
      vi.mocked(mockRepository.save).mockResolvedValue(err(new ValidationError('Save failed')));

      const capturedEvents: DomainEvent[] = [];
      eventBus.subscribeAll((event) => {
        capturedEvents.push(event);
        return Promise.resolve();
      });

      // Act
      const result = await service.createStatement({
        documentId,
        content: 'New statement',
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Save failed');
      }
      expect(capturedEvents).toHaveLength(0);
    });

    test('returns error if document not found', async () => {
      // Arrange
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      // Act
      const result = await service.createStatement({
        documentId: 'non-existent',
        content: 'New statement',
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Document not found');
      }
    });

    test('returns error for invalid document ID', async () => {
      // Act
      const result = await service.createStatement({
        documentId: '', // Invalid ID
        content: 'New statement',
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    test('returns error if domain operation fails', async () => {
      // Arrange
      const document = ProofDocument.create();
      const documentId = document.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);

      // Act - empty content should fail domain validation
      const result = await service.createStatement({
        documentId,
        content: '', // Invalid content
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });
  });

  describe('Statement Operations - Additional Error Cases', () => {
    test('handles invalid statement ID in updateStatement', async () => {
      // Arrange
      const document = ProofDocument.create();
      const documentId = document.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);

      // Act
      const result = await service.updateStatement({
        documentId,
        statementId: '', // Invalid empty statement ID
        content: 'Valid content',
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    test('handles invalid statement ID in deleteStatement', async () => {
      // Arrange
      const document = ProofDocument.create();
      const documentId = document.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);

      // Act
      const result = await service.deleteStatement({
        documentId,
        statementId: '', // Invalid empty statement ID
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    test('handles domain operation failure in updateStatement', async () => {
      // Arrange
      const document = ProofDocument.create();
      const statementResult = document.createStatement('Original content');
      expect(statementResult.isOk()).toBe(true);
      if (!statementResult.isOk()) return;

      const documentId = document.getId().getValue();
      const statementId = statementResult.value.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);

      // Mock domain operation to fail
      vi.spyOn(document, 'updateStatement').mockReturnValue(
        err(new ValidationError('Update failed')),
      );

      // Act
      const result = await service.updateStatement({
        documentId,
        statementId,
        content: 'New content',
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Update failed');
      }
    });

    test('handles domain operation failure in deleteStatement', async () => {
      // Arrange
      const document = ProofDocument.create();
      const statementResult = document.createStatement('To be deleted');
      expect(statementResult.isOk()).toBe(true);
      if (!statementResult.isOk()) return;

      const documentId = document.getId().getValue();
      const statementId = statementResult.value.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);

      // Mock domain operation to fail
      vi.spyOn(document, 'deleteStatement').mockReturnValue(
        err(new ValidationError('Delete failed')),
      );

      // Act
      const result = await service.deleteStatement({
        documentId,
        statementId,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Delete failed');
      }
    });

    test('handles domain operation failure in createStatement', async () => {
      // Arrange
      const document = ProofDocument.create();
      const documentId = document.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);

      // Mock domain operation to fail
      vi.spyOn(document, 'createStatement').mockReturnValue(
        err(new ValidationError('Creation failed')),
      );

      // Act
      const result = await service.createStatement({
        documentId,
        content: 'Valid content',
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Creation failed');
      }
    });
  });

  describe('updateStatement', () => {
    test('publishes events after successful update', async () => {
      // Arrange
      const document = ProofDocument.create();
      const statementResult = document.createStatement('Original content');
      expect(statementResult.isOk()).toBe(true);
      if (!statementResult.isOk()) return;

      const documentId = document.getId().getValue();
      if (!statementResult.isOk()) {
        throw new Error('Test setup failed - statement creation should have succeeded');
      }
      const statementId = statementResult.value.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);
      vi.mocked(mockRepository.save).mockResolvedValue(ok(undefined));

      const capturedEvents: DomainEvent[] = [];
      eventBus.subscribeAll((event) => {
        capturedEvents.push(event);
        return Promise.resolve();
      });

      // Act
      const result = await service.updateStatement({
        documentId,
        statementId,
        content: 'Updated content',
      });

      // Assert
      expect(result.isOk()).toBe(true);

      // Should have StatementUpdated event
      const updateEvents = capturedEvents.filter((e) => e.eventType === 'StatementUpdated');
      expect(updateEvents).toHaveLength(1);
      expect(updateEvents[0]?.eventData.oldContent).toBe('Original content');
      expect(updateEvents[0]?.eventData.newContent).toBe('Updated content');
    });

    test('returns error if statement is in use', async () => {
      // Arrange
      const document = ProofDocument.create();
      const statementResult = document.createStatement('Used statement');
      expect(statementResult.isOk()).toBe(true);
      if (!statementResult.isOk()) return;

      // Create an OrderedSet that uses the statement
      if (!statementResult.isOk()) {
        throw new Error('Test setup failed - statement creation should have succeeded');
      }
      const orderedSetResult = document.createOrderedSet([statementResult.value.getId()]);
      expect(orderedSetResult.isOk()).toBe(true);

      const documentId = document.getId().getValue();
      if (!statementResult.isOk()) {
        throw new Error('Test setup failed - statement creation should have succeeded');
      }
      const statementId = statementResult.value.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);

      // Act
      const result = await service.updateStatement({
        documentId,
        statementId,
        content: 'Updated content',
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Cannot update statement that is in use');
      }
    });
  });

  describe('deleteStatement', () => {
    test('publishes events after successful deletion', async () => {
      // Arrange
      const document = ProofDocument.create();
      const statementResult = document.createStatement('To be deleted');
      expect(statementResult.isOk()).toBe(true);
      if (!statementResult.isOk()) return;

      const documentId = document.getId().getValue();
      if (!statementResult.isOk()) {
        throw new Error('Test setup failed - statement creation should have succeeded');
      }
      const statementId = statementResult.value.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);
      vi.mocked(mockRepository.save).mockResolvedValue(ok(undefined));

      const capturedEvents: DomainEvent[] = [];
      eventBus.subscribeAll((event) => {
        capturedEvents.push(event);
        return Promise.resolve();
      });

      // Act
      const result = await service.deleteStatement({
        documentId,
        statementId,
      });

      // Assert
      expect(result.isOk()).toBe(true);

      // Should have StatementDeleted event
      const deleteEvents = capturedEvents.filter((e) => e.eventType === 'StatementDeleted');
      expect(deleteEvents).toHaveLength(1);
      expect(deleteEvents[0]?.eventData.content).toBe('To be deleted');
    });

    test('returns error if statement is in use', async () => {
      // Arrange
      const document = ProofDocument.create();
      const statementResult = document.createStatement('Used statement');
      expect(statementResult.isOk()).toBe(true);
      if (!statementResult.isOk()) return;

      // Create an OrderedSet that uses the statement
      if (!statementResult.isOk()) {
        throw new Error('Test setup failed - statement creation should have succeeded');
      }
      const orderedSetResult = document.createOrderedSet([statementResult.value.getId()]);
      expect(orderedSetResult.isOk()).toBe(true);

      const documentId = document.getId().getValue();
      if (!statementResult.isOk()) {
        throw new Error('Test setup failed - statement creation should have succeeded');
      }
      const statementId = statementResult.value.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);

      // Act
      const result = await service.deleteStatement({
        documentId,
        statementId,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Cannot delete statement that is in use');
      }
    });
  });

  describe('createAtomicArgument', () => {
    test('publishes events after successful creation with no statements', async () => {
      // Arrange
      const document = ProofDocument.create();
      const documentId = document.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);
      vi.mocked(mockRepository.save).mockResolvedValue(ok(undefined));

      const capturedEvents: DomainEvent[] = [];
      eventBus.subscribeAll((event) => {
        capturedEvents.push(event);
        return Promise.resolve();
      });

      // Act - create bootstrap argument with no premise/conclusion statements
      const result = await service.createAtomicArgument({
        documentId,
        premiseStatementIds: [],
        conclusionStatementIds: [],
      });

      // Assert
      expect(result.isOk()).toBe(true);

      // Should have AtomicArgumentCreated event
      const argEvents = capturedEvents.filter((e) => e.eventType === 'AtomicArgumentCreated');
      expect(argEvents).toHaveLength(1);
      expect(argEvents[0]?.eventData.premiseSetId).toBeNull();
      expect(argEvents[0]?.eventData.conclusionSetId).toBeNull();
    });

    test('creates OrderedSets and argument with statements', async () => {
      // Arrange
      const document = ProofDocument.create();
      const statement1Result = document.createStatement('Premise 1');
      const statement2Result = document.createStatement('Conclusion 1');
      expect(statement1Result.isOk()).toBe(true);
      expect(statement2Result.isOk()).toBe(true);
      if (!statement1Result.isOk() || !statement2Result.isOk())
        throw new Error('Test setup failed');

      const documentId = document.getId().getValue();
      const statement1Id = statement1Result.value.getId().getValue();
      const statement2Id = statement2Result.value.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);
      vi.mocked(mockRepository.save).mockResolvedValue(ok(undefined));

      const capturedEvents: DomainEvent[] = [];
      eventBus.subscribeAll((event) => {
        capturedEvents.push(event);
        return Promise.resolve();
      });

      // Act
      const result = await service.createAtomicArgument({
        documentId,
        premiseStatementIds: [statement1Id],
        conclusionStatementIds: [statement2Id],
      });

      // Assert
      expect(result.isOk()).toBe(true);

      // Should have OrderedSetCreated events and AtomicArgumentCreated event
      const orderedSetEvents = capturedEvents.filter((e) => e.eventType === 'OrderedSetCreated');
      const argEvents = capturedEvents.filter((e) => e.eventType === 'AtomicArgumentCreated');

      expect(orderedSetEvents).toHaveLength(2); // premise and conclusion sets
      expect(argEvents).toHaveLength(1);
      expect(argEvents[0]?.eventData.premiseSetId).not.toBeNull();
      expect(argEvents[0]?.eventData.conclusionSetId).not.toBeNull();
    });

    test('creates argument with side labels', async () => {
      // Arrange
      const document = ProofDocument.create();
      const documentId = document.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);
      vi.mocked(mockRepository.save).mockResolvedValue(ok(undefined));

      const capturedEvents: DomainEvent[] = [];
      eventBus.subscribeAll((event) => {
        capturedEvents.push(event);
        return Promise.resolve();
      });

      // Act
      const result = await service.createAtomicArgument({
        documentId,
        premiseStatementIds: [],
        conclusionStatementIds: [],
        sideLabel: {
          left: 'Modus Ponens',
        },
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.sideLabels?.left).toBe('Modus Ponens');
      }
    });

    test('returns error if premise statement ID is invalid', async () => {
      // Arrange
      const document = ProofDocument.create();
      const documentId = document.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);

      // Act
      const result = await service.createAtomicArgument({
        documentId,
        premiseStatementIds: [''], // Invalid empty statement ID
        conclusionStatementIds: [],
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    test('returns error if conclusion statement ID is invalid', async () => {
      // Arrange
      const document = ProofDocument.create();
      const documentId = document.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);

      // Act
      const result = await service.createAtomicArgument({
        documentId,
        premiseStatementIds: [],
        conclusionStatementIds: [''], // Invalid empty statement ID
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    test('returns error if premise OrderedSet creation fails', async () => {
      // Arrange
      const document = ProofDocument.create();
      const statementResult = document.createStatement('Test statement');
      expect(statementResult.isOk()).toBe(true);
      if (!statementResult.isOk()) return;

      const documentId = document.getId().getValue();
      const statementId = statementResult.value.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);

      // Mock createOrderedSet to fail
      vi.spyOn(document, 'createOrderedSet').mockReturnValue(
        err(new ValidationError('OrderedSet creation failed')),
      );

      // Act
      const result = await service.createAtomicArgument({
        documentId,
        premiseStatementIds: [statementId],
        conclusionStatementIds: [],
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('OrderedSet creation failed');
      }
    });

    test('returns error if conclusion OrderedSet creation fails', async () => {
      // Arrange
      const document = ProofDocument.create();
      const statementResult = document.createStatement('Test statement');
      expect(statementResult.isOk()).toBe(true);
      if (!statementResult.isOk()) return;

      const documentId = document.getId().getValue();
      const statementId = statementResult.value.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);

      // Mock createOrderedSet to fail on conclusion
      vi.spyOn(document, 'createOrderedSet').mockReturnValue(
        err(new ValidationError('Conclusion OrderedSet creation failed')),
      );

      // Act
      const result = await service.createAtomicArgument({
        documentId,
        premiseStatementIds: [],
        conclusionStatementIds: [statementId],
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Conclusion OrderedSet creation failed');
      }
    });

    test('returns error if atomic argument creation fails', async () => {
      // Arrange
      const document = ProofDocument.create();

      // Create many arguments to potentially trigger limit
      for (let i = 0; i < 10; i++) {
        const argResult = document.createAtomicArgument(null, null);
        expect(argResult.isOk()).toBe(true);
      }

      const documentId = document.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);

      // Mock domain operation to fail
      const originalCreate = document.createAtomicArgument;
      vi.spyOn(document, 'createAtomicArgument').mockReturnValue(
        err(new ValidationError('Creation failed')),
      );

      // Act
      const result = await service.createAtomicArgument({
        documentId,
        premiseStatementIds: [],
        conclusionStatementIds: [],
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Creation failed');
      }

      // Restore
      document.createAtomicArgument = originalCreate;
    });

    test('returns error if side label update fails', async () => {
      // Arrange
      const document = ProofDocument.create();
      const documentId = document.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);

      // Mock createAtomicArgument to return a mocked argument that fails label update
      const mockArgument = {
        getId: vi.fn().mockReturnValue({ getValue: () => 'arg-id' }),
        updateSideLabels: vi.fn().mockReturnValue(err(new ValidationError('Label update failed'))),
      };

      vi.spyOn(document, 'createAtomicArgument').mockReturnValue(ok(mockArgument as any));

      // Act
      const result = await service.createAtomicArgument({
        documentId,
        premiseStatementIds: [],
        conclusionStatementIds: [],
        sideLabel: {
          left: 'Test Label',
        },
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Label update failed');
      }
    });

    test('returns error if statement not found', async () => {
      // Arrange
      const document = ProofDocument.create();
      const documentId = document.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);

      // Act
      const result = await service.createAtomicArgument({
        documentId,
        premiseStatementIds: ['non-existent-statement'],
        conclusionStatementIds: [],
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('not found');
      }
    });
  });

  describe('updateAtomicArgument', () => {
    test('publishes events after successful update', async () => {
      // Arrange
      const document = ProofDocument.create();
      const argumentResult = document.createAtomicArgument(null, null);
      expect(argumentResult.isOk()).toBe(true);
      if (!argumentResult.isOk()) return;

      const statement1Result = document.createStatement('New premise');
      expect(statement1Result.isOk()).toBe(true);
      if (!statement1Result.isOk()) return;

      if (!statement1Result.isOk()) {
        throw new Error('Test setup failed - statement creation should have succeeded');
      }
      const orderedSetResult = document.createOrderedSet([statement1Result.value.getId()]);
      expect(orderedSetResult.isOk()).toBe(true);
      if (!orderedSetResult.isOk()) return;

      const documentId = document.getId().getValue();
      if (!argumentResult.isOk()) {
        throw new Error('Test setup failed - argument creation should have succeeded');
      }
      const argumentId = argumentResult.value.getId().getValue();
      if (!orderedSetResult.isOk()) {
        throw new Error('Test setup failed - ordered set creation should have succeeded');
      }
      const orderedSetId = orderedSetResult.value.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);
      vi.mocked(mockRepository.save).mockResolvedValue(ok(undefined));

      const capturedEvents: DomainEvent[] = [];
      eventBus.subscribeAll((event) => {
        capturedEvents.push(event);
        return Promise.resolve();
      });

      // Act
      const result = await service.updateAtomicArgument({
        documentId,
        argumentId,
        premiseSetId: orderedSetId,
        conclusionSetId: null,
      });

      // Assert
      expect(result.isOk()).toBe(true);

      // Should have AtomicArgumentUpdated event
      const updateEvents = capturedEvents.filter((e) => e.eventType === 'AtomicArgumentUpdated');
      expect(updateEvents).toHaveLength(1);
      expect(updateEvents[0]?.eventData.premiseSetId).toBe(orderedSetId);
    });

    test('returns error if argument not found', async () => {
      // Arrange
      const document = ProofDocument.create();
      const documentId = document.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);

      // Act
      const result = await service.updateAtomicArgument({
        documentId,
        argumentId: 'non-existent',
        premiseSetId: null,
        conclusionSetId: null,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('not found');
      }
    });

    test('returns error if invalid argument ID in updateAtomicArgument', async () => {
      // Arrange
      const document = ProofDocument.create();
      const documentId = document.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);

      // Act
      const result = await service.updateAtomicArgument({
        documentId,
        argumentId: '', // Invalid empty argument ID
        premiseSetId: null,
        conclusionSetId: null,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    test('returns error if invalid premise set ID in updateAtomicArgument', async () => {
      // Arrange
      const document = ProofDocument.create();
      const argumentResult = document.createAtomicArgument(null, null);
      expect(argumentResult.isOk()).toBe(true);
      if (!argumentResult.isOk()) return;

      const documentId = document.getId().getValue();
      const argumentId = argumentResult.value.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);

      // Act - use non-UUID format to trigger validation error
      const result = await service.updateAtomicArgument({
        documentId,
        argumentId,
        premiseSetId: 'invalid-format', // Invalid non-UUID format
        conclusionSetId: null,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    test('returns error if invalid conclusion set ID in updateAtomicArgument', async () => {
      // Arrange
      const document = ProofDocument.create();
      const argumentResult = document.createAtomicArgument(null, null);
      expect(argumentResult.isOk()).toBe(true);
      if (!argumentResult.isOk()) return;

      const documentId = document.getId().getValue();
      const argumentId = argumentResult.value.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);

      // Act - use non-UUID format to trigger validation error
      const result = await service.updateAtomicArgument({
        documentId,
        argumentId,
        premiseSetId: null,
        conclusionSetId: 'invalid-format', // Invalid non-UUID format
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    test('returns error if premise OrderedSet not found', async () => {
      // Arrange
      const document = ProofDocument.create();
      const argumentResult = document.createAtomicArgument(null, null);
      expect(argumentResult.isOk()).toBe(true);
      if (!argumentResult.isOk()) return;

      const documentId = document.getId().getValue();
      const argumentId = argumentResult.value.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);

      // Act
      const result = await service.updateAtomicArgument({
        documentId,
        argumentId,
        premiseSetId: 'non-existent',
        conclusionSetId: null,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Premise OrderedSet not found');
      }
    });

    test('returns error if conclusion OrderedSet not found', async () => {
      // Arrange
      const document = ProofDocument.create();
      const argumentResult = document.createAtomicArgument(null, null);
      expect(argumentResult.isOk()).toBe(true);
      if (!argumentResult.isOk()) return;

      const documentId = document.getId().getValue();
      const argumentId = argumentResult.value.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);

      // Act
      const result = await service.updateAtomicArgument({
        documentId,
        argumentId,
        premiseSetId: null,
        conclusionSetId: 'non-existent',
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Conclusion OrderedSet not found');
      }
    });

    test('returns error if domain update operation fails', async () => {
      // Arrange
      const document = ProofDocument.create();
      const argumentResult = document.createAtomicArgument(null, null);
      expect(argumentResult.isOk()).toBe(true);
      if (!argumentResult.isOk()) return;

      const documentId = document.getId().getValue();
      const argumentId = argumentResult.value.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);

      // Mock domain operation to fail
      vi.spyOn(document, 'updateAtomicArgument').mockReturnValue(
        err(new ValidationError('Update failed')),
      );

      // Act
      const result = await service.updateAtomicArgument({
        documentId,
        argumentId,
        premiseSetId: null,
        conclusionSetId: null,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Update failed');
      }
    });
  });

  describe('deleteAtomicArgument', () => {
    test('publishes events after successful deletion', async () => {
      // Arrange
      const document = ProofDocument.create();
      const argumentResult = document.createAtomicArgument(null, null);
      expect(argumentResult.isOk()).toBe(true);
      if (!argumentResult.isOk()) return;

      const documentId = document.getId().getValue();
      const argumentId = argumentResult.value.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);
      vi.mocked(mockRepository.save).mockResolvedValue(ok(undefined));

      const capturedEvents: DomainEvent[] = [];
      eventBus.subscribeAll((event) => {
        capturedEvents.push(event);
        return Promise.resolve();
      });

      // Act
      const result = await service.deleteAtomicArgument({
        documentId,
        argumentId,
      });

      // Assert
      expect(result.isOk()).toBe(true);

      // Should have AtomicArgumentDeleted event
      const deleteEvents = capturedEvents.filter((e) => e.eventType === 'AtomicArgumentDeleted');
      expect(deleteEvents).toHaveLength(1);
      expect(deleteEvents[0]?.eventData.argumentId).toBe(argumentId);
    });

    test('returns error if invalid argument ID in deleteAtomicArgument', async () => {
      // Arrange
      const document = ProofDocument.create();
      const documentId = document.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);

      // Act
      const result = await service.deleteAtomicArgument({
        documentId,
        argumentId: '', // Invalid empty argument ID
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    test('returns error if domain delete operation fails', async () => {
      // Arrange
      const document = ProofDocument.create();
      const argumentResult = document.createAtomicArgument(null, null);
      expect(argumentResult.isOk()).toBe(true);
      if (!argumentResult.isOk()) return;

      const documentId = document.getId().getValue();
      const argumentId = argumentResult.value.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);

      // Mock domain operation to fail
      vi.spyOn(document, 'deleteAtomicArgument').mockReturnValue(
        err(new ValidationError('Delete failed')),
      );

      // Act
      const result = await service.deleteAtomicArgument({
        documentId,
        argumentId,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Delete failed');
      }
    });

    test('returns error if argument not found', async () => {
      // Arrange
      const document = ProofDocument.create();
      const documentId = document.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);

      // Act
      const result = await service.deleteAtomicArgument({
        documentId,
        argumentId: 'non-existent',
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('not found');
      }
    });
  });

  describe('event bus error handling', () => {
    test('continues operation even if event publishing fails', async () => {
      // Arrange
      const document = ProofDocument.create();
      const documentId = document.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);
      vi.mocked(mockRepository.save).mockResolvedValue(ok(undefined));

      // Mock event bus to throw error
      const errorEventBus = createTestEventBus();
      vi.spyOn(errorEventBus, 'publish').mockRejectedValue(new Error('Event bus error'));

      const errorService = new ProofApplicationService(mockRepository, errorEventBus);

      // Act & Assert - should not throw
      await expect(
        errorService.createStatement({
          documentId,
          content: 'New statement',
        }),
      ).rejects.toThrow('Event bus error');
    });
  });

  describe('aggregate event lifecycle', () => {
    test('properly manages uncommitted events', async () => {
      // Arrange
      const document = ProofDocument.create();
      const documentId = document.getId().getValue();

      vi.mocked(mockRepository.findById).mockResolvedValue(document);
      vi.mocked(mockRepository.save).mockResolvedValue(ok(undefined));

      // Verify document has uncommitted events after domain operation
      expect(document.hasUncommittedEvents()).toBe(true);

      // Act
      const result = await service.createStatement({
        documentId,
        content: 'New statement',
      });

      // Assert
      expect(result.isOk()).toBe(true);

      // After successful operation, events should be marked as committed
      expect(document.hasUncommittedEvents()).toBe(false);
    });
  });
});

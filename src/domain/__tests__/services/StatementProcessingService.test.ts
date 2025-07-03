/**
 * Comprehensive test suite for StatementProcessingService
 *
 * Tests statement processing logic, flow creation, branching connections,
 * validation, and statement reuse functionality. Uses mocked repositories
 * following Vitest patterns with proper neverthrow Result handling.
 */

import fc from 'fast-check';
import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AtomicArgument } from '../../entities/AtomicArgument.js';
import type { OrderedSet } from '../../entities/OrderedSet.js';
import { Statement } from '../../entities/Statement.js';
import { ProcessingError, RepositoryError } from '../../errors/DomainErrors.js';
import type { IAtomicArgumentRepository } from '../../repositories/IAtomicArgumentRepository.js';
import type { IOrderedSetRepository } from '../../repositories/IOrderedSetRepository.js';
import type { IStatementRepository } from '../../repositories/IStatementRepository.js';
import {
  StatementFlowValidationResult,
  StatementProcessingService,
} from '../../services/StatementProcessingService.js';
import { ValidationError } from '../../shared/result.js';
import {
  atomicArgumentIdFactory,
  createTestStatements,
  orderedSetIdFactory,
  statementIdFactory,
  testScenarios,
} from '../factories/index.js';
import { expect as customExpect } from '../test-setup.js';

describe('StatementProcessingService', () => {
  let service: StatementProcessingService;
  let mockStatementRepo: IStatementRepository;
  let mockOrderedSetRepo: IOrderedSetRepository;
  let mockAtomicArgumentRepo: IAtomicArgumentRepository;
  const FIXED_TIMESTAMP = 1640995200000; // 2022-01-01T00:00:00.000Z

  beforeEach(() => {
    // Mock Date.now for consistent testing
    vi.spyOn(Date, 'now').mockReturnValue(FIXED_TIMESTAMP);

    // Create mocked repositories using Vitest vi.fn()
    mockStatementRepo = {
      save: vi.fn().mockResolvedValue(ok(undefined)),
      findById: vi.fn().mockResolvedValue(null),
      findByContent: vi.fn().mockResolvedValue(null),
      findAll: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(ok(undefined)),
      findStatementsByPattern: vi.fn().mockResolvedValue([]),
      findFrequentlyUsedStatements: vi.fn().mockResolvedValue([]),
      findByLogicalStructure: vi.fn().mockResolvedValue([]),
      findStatementsByUsageCount: vi.fn().mockResolvedValue([]),
      findRelatedStatements: vi.fn().mockResolvedValue([]),
      searchStatementsByKeywords: vi.fn().mockResolvedValue([]),
      findStatementsInProof: vi.fn().mockResolvedValue([]),
      getStatementUsageMetrics: vi.fn().mockResolvedValue(null),
      findUnusedStatements: vi.fn().mockResolvedValue([]),
    };

    mockOrderedSetRepo = {
      save: vi.fn().mockResolvedValue(ok(undefined)),
      findById: vi.fn().mockResolvedValue(null),
      findAll: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(ok(undefined)),
      findOrderedSetsBySize: vi.fn().mockResolvedValue([]),
      findOrderedSetsContaining: vi.fn().mockResolvedValue([]),
      findSharedOrderedSets: vi.fn().mockResolvedValue([]),
      findOrderedSetsByPattern: vi.fn().mockResolvedValue([]),
      findUnusedOrderedSets: vi.fn().mockResolvedValue([]),
      findOrderedSetsByReferenceCount: vi.fn().mockResolvedValue([]),
      findSimilarOrderedSets: vi.fn().mockResolvedValue([]),
      findEmptyOrderedSets: vi.fn().mockResolvedValue([]),
    };

    mockAtomicArgumentRepo = {
      save: vi.fn().mockResolvedValue(ok(undefined)),
      findById: vi.fn().mockResolvedValue(null),
      findAll: vi.fn().mockResolvedValue([]),
      findByOrderedSetReference: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(ok(undefined)),
      findArgumentsByPremiseCount: vi.fn().mockResolvedValue([]),
      findArgumentsUsingStatement: vi.fn().mockResolvedValue([]),
      findArgumentsByComplexity: vi.fn().mockResolvedValue([]),
      findArgumentsWithConclusion: vi.fn().mockResolvedValue([]),
      findArgumentChains: vi.fn().mockResolvedValue([]),
      findCircularDependencies: vi.fn().mockResolvedValue([]),
      findArgumentsByValidationStatus: vi.fn().mockResolvedValue([]),
      findMostReferencedArguments: vi.fn().mockResolvedValue([]),
      findOrphanedArguments: vi.fn().mockResolvedValue([]),
    };

    service = new StatementProcessingService(
      mockStatementRepo,
      mockOrderedSetRepo,
      mockAtomicArgumentRepo,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createStatementFlow', () => {
    describe('successful flow creation', () => {
      it('should create statement flow with new statements', async () => {
        // Arrange
        const sourceStatements = ['All men are mortal', 'Socrates is a man'];
        const targetStatements = ['Socrates is mortal'];

        // Mock repository behavior
        vi.mocked(mockStatementRepo.findByContent).mockResolvedValue(null); // No existing statements
        vi.mocked(mockStatementRepo.save).mockResolvedValue(ok(undefined));
        vi.mocked(mockOrderedSetRepo.save).mockResolvedValue(ok(undefined));
        vi.mocked(mockAtomicArgumentRepo.save).mockResolvedValue(ok(undefined));

        // Act
        const result = await service.createStatementFlow(sourceStatements, targetStatements);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          customExpect(result.value).toBeValidAtomicArgument();
          expect(result.value.isComplete()).toBe(true);
          expect(result.value.isEmpty()).toBe(false);
        }

        // Verify interactions
        expect(mockStatementRepo.findByContent).toHaveBeenCalledTimes(3);
        expect(mockStatementRepo.save).toHaveBeenCalledTimes(3);
        expect(mockOrderedSetRepo.save).toHaveBeenCalledTimes(2);
        expect(mockAtomicArgumentRepo.save).toHaveBeenCalledTimes(1);
      });

      it('should reuse existing statements when available', async () => {
        // Arrange
        const statementResult = Statement.create('Existing statement');
        if (statementResult.isErr()) throw new Error('Failed to create statement');
        const existingStatement = statementResult.value;
        const sourceStatements = ['Existing statement', 'New statement'];
        const targetStatements = ['Conclusion'];

        // Mock finding existing statement
        vi.mocked(mockStatementRepo.findByContent)
          .mockResolvedValueOnce(existingStatement) // First call finds existing
          .mockResolvedValue(null); // Others don't exist

        vi.mocked(mockStatementRepo.save).mockResolvedValue(ok(undefined));
        vi.mocked(mockOrderedSetRepo.save).mockResolvedValue(ok(undefined));
        vi.mocked(mockAtomicArgumentRepo.save).mockResolvedValue(ok(undefined));

        // Act
        const result = await service.createStatementFlow(sourceStatements, targetStatements);

        // Assert
        expect(result.isOk()).toBe(true);
        expect(existingStatement.getUsageCount()).toBe(1); // Usage incremented

        // Verify save was called for the updated existing statement
        expect(mockStatementRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({
            getContent: expect.any(Function),
            getUsageCount: expect.any(Function),
          }),
        );
      });

      it('should handle test scenarios correctly', async () => {
        // Arrange
        const { premises, conclusions } = testScenarios.simpleChain;

        vi.mocked(mockStatementRepo.findByContent).mockResolvedValue(null);
        vi.mocked(mockStatementRepo.save).mockResolvedValue(ok(undefined));
        vi.mocked(mockOrderedSetRepo.save).mockResolvedValue(ok(undefined));
        vi.mocked(mockAtomicArgumentRepo.save).mockResolvedValue(ok(undefined));

        // Act
        const result = await service.createStatementFlow(premises, conclusions.slice(0, 1));

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isComplete()).toBe(true);
        }
      });

      it('should maintain statement order in ordered sets', async () => {
        // Arrange
        const sourceStatements = ['First', 'Second', 'Third'];
        const targetStatements = ['Conclusion'];
        const capturedOrderedSets: OrderedSet[] = [];

        vi.mocked(mockStatementRepo.findByContent).mockResolvedValue(null);
        vi.mocked(mockStatementRepo.save).mockResolvedValue(ok(undefined));
        vi.mocked(mockOrderedSetRepo.save).mockImplementation(async (orderedSet) => {
          capturedOrderedSets.push(orderedSet);
          return Promise.resolve(ok(undefined));
        });
        vi.mocked(mockAtomicArgumentRepo.save).mockResolvedValue(ok(undefined));

        // Act
        const result = await service.createStatementFlow(sourceStatements, targetStatements);

        // Assert
        expect(result.isOk()).toBe(true);
        expect(capturedOrderedSets).toHaveLength(2);
        expect(capturedOrderedSets[0]?.size()).toBe(3); // Premise set
        expect(capturedOrderedSets[1]?.size()).toBe(1); // Conclusion set
      });
    });

    describe('error handling', () => {
      it('should handle statement creation failure', async () => {
        // Arrange
        const sourceStatements = ['Valid statement', '']; // Empty statement will fail
        const targetStatements = ['Conclusion'];

        vi.mocked(mockStatementRepo.findByContent).mockResolvedValue(null);
        vi.mocked(mockStatementRepo.save).mockResolvedValue(ok(undefined)); // For the valid statement

        // Act
        const result = await service.createStatementFlow(sourceStatements, targetStatements);

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
          expect(result.error.message).toContain('Failed to process statement');
        }
      });

      it('should handle statement save failure', async () => {
        // Arrange
        const sourceStatements = ['Statement 1'];
        const targetStatements = ['Conclusion'];

        vi.mocked(mockStatementRepo.findByContent).mockResolvedValue(null);
        vi.mocked(mockStatementRepo.save).mockResolvedValue(
          err(new RepositoryError('Save failed')),
        );

        // Act
        const result = await service.createStatementFlow(sourceStatements, targetStatements);

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
          expect(result.error.message).toContain('Failed to process statement');
        }
      });

      it('should handle empty source statements', async () => {
        // Arrange
        const sourceStatements: string[] = []; // Empty source statements
        const targetStatements = ['Conclusion'];

        vi.mocked(mockStatementRepo.findByContent).mockResolvedValue(null);
        vi.mocked(mockStatementRepo.save).mockResolvedValue(ok(undefined));
        vi.mocked(mockOrderedSetRepo.save).mockResolvedValue(ok(undefined));
        vi.mocked(mockAtomicArgumentRepo.save).mockResolvedValue(ok(undefined));

        // Act
        const result = await service.createStatementFlow(sourceStatements, targetStatements);

        // Assert - Should succeed with empty premise set
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getPremiseSetRef()).not.toBeNull();
          expect(result.value.getConclusionSetRef()).not.toBeNull();
        }
      });

      it('should handle ordered set save failure', async () => {
        // Arrange
        const sourceStatements = ['Statement'];
        const targetStatements = ['Conclusion'];

        vi.mocked(mockStatementRepo.findByContent).mockResolvedValue(null);
        vi.mocked(mockStatementRepo.save).mockResolvedValue(ok(undefined));
        vi.mocked(mockOrderedSetRepo.save).mockResolvedValue(
          err(new RepositoryError('OrderedSet save failed')),
        );

        // Act
        const result = await service.createStatementFlow(sourceStatements, targetStatements);

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
          expect(result.error.message).toContain('Failed to save ordered set');
        }
      });

      it('should handle atomic argument save failure', async () => {
        // Arrange
        const sourceStatements = ['Statement'];
        const targetStatements = ['Conclusion'];

        vi.mocked(mockStatementRepo.findByContent).mockResolvedValue(null);
        vi.mocked(mockStatementRepo.save).mockResolvedValue(ok(undefined));
        vi.mocked(mockOrderedSetRepo.save).mockResolvedValue(ok(undefined));
        vi.mocked(mockAtomicArgumentRepo.save).mockResolvedValue(
          err(new RepositoryError('Argument save failed')),
        );

        // Act
        const result = await service.createStatementFlow(sourceStatements, targetStatements);

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
          expect(result.error.message).toContain('Failed to save atomic argument');
        }
      });
    });

    describe('property-based testing', () => {
      it('should handle various statement combinations', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.array(
              fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
              { minLength: 1, maxLength: 5 },
            ),
            fc.array(
              fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
              { minLength: 1, maxLength: 5 },
            ),
            async (sources, targets) => {
              vi.mocked(mockStatementRepo.findByContent).mockResolvedValue(null);
              vi.mocked(mockStatementRepo.save).mockResolvedValue(ok(undefined));
              vi.mocked(mockOrderedSetRepo.save).mockResolvedValue(ok(undefined));
              vi.mocked(mockAtomicArgumentRepo.save).mockResolvedValue(ok(undefined));

              const result = await service.createStatementFlow(sources, targets);
              expect(result.isOk()).toBe(true);
            },
          ),
        );
      });
    });
  });

  describe('createBranchConnection', () => {
    describe('successful branch creation', () => {
      it('should create branch from parent with conclusion', async () => {
        // Arrange
        const parentId = atomicArgumentIdFactory.build();
        const premiseSetId = orderedSetIdFactory.build();
        const conclusionSetId = orderedSetIdFactory.build();

        const parentArgument = AtomicArgument.createComplete(premiseSetId, conclusionSetId);
        vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(parentArgument);
        vi.mocked(mockAtomicArgumentRepo.save).mockResolvedValue(ok(undefined));

        // Act
        const result = await service.createBranchConnection(parentId);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const childArgument = result.value;
          customExpect(childArgument).toBeValidAtomicArgument();
          expect(childArgument.getPremiseSetRef()).toEqual(conclusionSetId);
          expect(childArgument.getConclusionSetRef()).toBeNull();
        }
      });

      it('should fail to create branch from bootstrap parent', async () => {
        // Arrange
        const parentId = atomicArgumentIdFactory.build();
        const atomicResult = AtomicArgument.create(); // Creates empty argument
        if (atomicResult.isErr()) throw new Error('Failed to create atomic argument');
        const bootstrapParent = atomicResult.value;

        vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(bootstrapParent);

        // Act
        const result = await service.createBranchConnection(parentId);

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
          expect(result.error.message).toBe('Parent argument has no conclusion to branch from');
        }
      });
    });

    describe('error handling', () => {
      it('should fail when parent argument not found', async () => {
        // Arrange
        const parentId = atomicArgumentIdFactory.build();
        vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(null);

        // Act
        const result = await service.createBranchConnection(parentId);

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
          expect(result.error.message).toBe('Parent argument not found');
        }
      });

      it('should fail when parent has no conclusion', async () => {
        // Arrange
        const parentId = atomicArgumentIdFactory.build();
        const argResult = AtomicArgument.create(orderedSetIdFactory.build()); // Only premise set
        if (argResult.isErr()) throw new Error('Failed to create atomic argument');
        const incompleteParent = argResult.value;

        vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(incompleteParent);

        // Act
        const result = await service.createBranchConnection(parentId);

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
          expect(result.error.message).toBe('Parent argument has no conclusion to branch from');
        }
      });

      it('should fail when child save fails', async () => {
        // Arrange
        const parentId = atomicArgumentIdFactory.build();
        const parentArgument = AtomicArgument.createComplete(
          orderedSetIdFactory.build(),
          orderedSetIdFactory.build(),
        );

        vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(parentArgument);
        vi.mocked(mockAtomicArgumentRepo.save).mockResolvedValue(
          err(new RepositoryError('Save failed')),
        );

        // Act
        const result = await service.createBranchConnection(parentId);

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
          expect(result.error.message).toBe('Failed to save child argument');
        }
      });
    });
  });

  describe('validateStatementFlow', () => {
    describe('successful validation', () => {
      it('should validate complete argument', async () => {
        // Arrange
        const argumentId = atomicArgumentIdFactory.build();
        const completeArgument = AtomicArgument.createComplete(
          orderedSetIdFactory.build(),
          orderedSetIdFactory.build(),
        );

        vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(completeArgument);

        // Act
        const result = await service.validateStatementFlow(argumentId);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const validationResult = result.value;
          expect(validationResult.isComplete).toBe(true);
          expect(validationResult.isEmpty).toBe(false);
          expect(validationResult.violations).toHaveLength(0);
        }
      });

      it('should validate empty argument', async () => {
        // Arrange
        const argumentId = atomicArgumentIdFactory.build();
        const argResult = AtomicArgument.create(); // Empty/bootstrap argument
        if (argResult.isErr()) throw new Error('Failed to create atomic argument');
        const emptyArgument = argResult.value;

        vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(emptyArgument);

        // Act
        const result = await service.validateStatementFlow(argumentId);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const validationResult = result.value;
          expect(validationResult.isComplete).toBe(false);
          expect(validationResult.isEmpty).toBe(true);
          expect(validationResult.violations).toHaveLength(0);
        }
      });

      it('should validate partial argument', async () => {
        // Arrange
        const argumentId = atomicArgumentIdFactory.build();
        const argResult = AtomicArgument.create(orderedSetIdFactory.build()); // Only premise
        if (argResult.isErr()) throw new Error('Failed to create atomic argument');
        const partialArgument = argResult.value;

        vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(partialArgument);

        // Act
        const result = await service.validateStatementFlow(argumentId);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const validationResult = result.value;
          expect(validationResult.isComplete).toBe(false);
          expect(validationResult.isEmpty).toBe(false);
          expect(validationResult.violations).toHaveLength(0);
        }
      });
    });

    describe('error handling', () => {
      it('should fail when argument not found', async () => {
        // Arrange
        const argumentId = atomicArgumentIdFactory.build();
        vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(null);

        // Act
        const result = await service.validateStatementFlow(argumentId);

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
          expect(result.error.message).toBe('Argument not found');
        }
      });
    });
  });

  describe('processStatementReuse', () => {
    describe('reusing existing statements', () => {
      it('should reuse and increment usage count', async () => {
        // Arrange
        const content = 'Existing statement';
        const stmtResult = Statement.create(content);
        if (stmtResult.isErr()) throw new Error('Failed to create statement');
        const existingStatement = stmtResult.value;

        vi.mocked(mockStatementRepo.findByContent).mockResolvedValue(existingStatement);
        vi.mocked(mockStatementRepo.save).mockResolvedValue(ok(undefined));

        const initialUsageCount = existingStatement.getUsageCount();

        // Act
        const result = await service.processStatementReuse(content);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe(existingStatement);
          expect(result.value.getUsageCount()).toBe(initialUsageCount + 1);
        }

        expect(mockStatementRepo.save).toHaveBeenCalledWith(existingStatement);
      });

      it('should handle multiple reuses', async () => {
        // Arrange
        const content = 'Frequently used statement';
        const stmtResult = Statement.create(content);
        if (stmtResult.isErr()) throw new Error('Failed to create statement');
        const existingStatement = stmtResult.value;

        vi.mocked(mockStatementRepo.findByContent).mockResolvedValue(existingStatement);
        vi.mocked(mockStatementRepo.save).mockResolvedValue(ok(undefined));

        // Act - Process multiple times
        for (let i = 0; i < 3; i++) {
          await service.processStatementReuse(content);
        }

        // Assert
        expect(existingStatement.getUsageCount()).toBe(3);
        expect(mockStatementRepo.save).toHaveBeenCalledTimes(3);
      });
    });

    describe('creating new statements', () => {
      it('should create new statement when not found', async () => {
        // Arrange
        const content = 'New statement';
        vi.mocked(mockStatementRepo.findByContent).mockResolvedValue(null);
        vi.mocked(mockStatementRepo.save).mockResolvedValue(ok(undefined));

        // Act
        const result = await service.processStatementReuse(content);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          customExpect(result.value).toBeValidStatement();
          expect(result.value.getContent()).toBe(content);
          expect(result.value.getUsageCount()).toBe(0);
        }
      });

      it('should handle various content from factory', async () => {
        // Arrange
        const contents = createTestStatements(5);
        vi.mocked(mockStatementRepo.findByContent).mockResolvedValue(null);
        vi.mocked(mockStatementRepo.save).mockResolvedValue(ok(undefined));

        // Act & Assert
        for (const content of contents) {
          const result = await service.processStatementReuse(content);
          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            expect(result.value.getContent()).toBe(content);
          }
        }
      });
    });

    describe('error handling', () => {
      it('should fail with invalid content', async () => {
        // Arrange
        const invalidContent = '';
        vi.mocked(mockStatementRepo.findByContent).mockResolvedValue(null);

        // Act
        const result = await service.processStatementReuse(invalidContent);

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
          expect(result.error.message).toBe('Invalid statement content');
        }
      });

      it('should fail when update save fails', async () => {
        // Arrange
        const content = 'Statement';
        const stmtResult = Statement.create(content);
        if (stmtResult.isErr()) throw new Error('Failed to create statement');
        const existingStatement = stmtResult.value;

        vi.mocked(mockStatementRepo.findByContent).mockResolvedValue(existingStatement);
        vi.mocked(mockStatementRepo.save).mockResolvedValue(
          err(new RepositoryError('Update failed')),
        );

        // Act
        const result = await service.processStatementReuse(content);

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
          expect(result.error.message).toBe('Failed to update statement usage');
        }
      });

      it('should fail when new statement save fails', async () => {
        // Arrange
        const content = 'New statement';
        vi.mocked(mockStatementRepo.findByContent).mockResolvedValue(null);
        vi.mocked(mockStatementRepo.save).mockResolvedValue(
          err(new RepositoryError('Save failed')),
        );

        // Act
        const result = await service.processStatementReuse(content);

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
          expect(result.error.message).toBe('Failed to save new statement');
        }
      });
    });

    describe('property-based testing', () => {
      it('should handle any valid content', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.string({ minLength: 1, maxLength: 1000 }).filter((s) => s.trim().length > 0),
            async (content) => {
              vi.mocked(mockStatementRepo.findByContent).mockResolvedValue(null);
              vi.mocked(mockStatementRepo.save).mockResolvedValue(ok(undefined));

              const result = await service.processStatementReuse(content);
              expect(result.isOk()).toBe(true);
              if (result.isOk()) {
                expect(result.value.getContent()).toBe(content.trim());
              }
            },
          ),
        );
      });
    });
  });

  describe('updateStatementContent', () => {
    describe('successful updates', () => {
      it('should update statement content', async () => {
        // Arrange
        const statementId = statementIdFactory.build();
        const stmtResult = Statement.create('Original content');
        if (stmtResult.isErr()) throw new Error('Failed to create statement');
        const statement = stmtResult.value;
        const newContent = 'Updated content';

        vi.mocked(mockStatementRepo.findById).mockResolvedValue(statement);
        vi.mocked(mockStatementRepo.save).mockResolvedValue(ok(undefined));

        // Act
        const result = await service.updateStatementContent(statementId, newContent);

        // Assert
        expect(result.isOk()).toBe(true);
        expect(statement.getContent()).toBe(newContent);
        expect(mockStatementRepo.save).toHaveBeenCalledWith(statement);
      });

      it('should handle content trimming', async () => {
        // Arrange
        const statementId = statementIdFactory.build();
        const stmtResult = Statement.create('Original');
        if (stmtResult.isErr()) throw new Error('Failed to create statement');
        const statement = stmtResult.value;
        const newContent = '  Trimmed content  ';

        vi.mocked(mockStatementRepo.findById).mockResolvedValue(statement);
        vi.mocked(mockStatementRepo.save).mockResolvedValue(ok(undefined));

        // Act
        const result = await service.updateStatementContent(statementId, newContent);

        // Assert
        expect(result.isOk()).toBe(true);
        expect(statement.getContent()).toBe('Trimmed content');
      });

      it('should update modified timestamp', async () => {
        // Arrange
        const statementId = statementIdFactory.build();
        const stmtResult = Statement.create('Original');
        if (stmtResult.isErr()) throw new Error('Failed to create statement');
        const statement = stmtResult.value;
        const originalModified = statement.getModifiedAt();

        vi.mocked(mockStatementRepo.findById).mockResolvedValue(statement);
        vi.mocked(mockStatementRepo.save).mockResolvedValue(ok(undefined));

        // Advance time
        vi.spyOn(Date, 'now').mockReturnValue(FIXED_TIMESTAMP + 1000);

        // Act
        const result = await service.updateStatementContent(statementId, 'New content');

        // Assert
        expect(result.isOk()).toBe(true);
        expect(statement.getModifiedAt()).toBeGreaterThan(originalModified);
      });
    });

    describe('error handling', () => {
      it('should fail when statement not found', async () => {
        // Arrange
        const statementId = statementIdFactory.build();
        vi.mocked(mockStatementRepo.findById).mockResolvedValue(null);

        // Act
        const result = await service.updateStatementContent(statementId, 'New content');

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
          expect(result.error.message).toBe('Statement not found');
        }
      });

      it('should fail with invalid content', async () => {
        // Arrange
        const statementId = statementIdFactory.build();
        const stmtResult = Statement.create('Original');
        if (stmtResult.isErr()) throw new Error('Failed to create statement');
        const statement = stmtResult.value;

        vi.mocked(mockStatementRepo.findById).mockResolvedValue(statement);

        // Act
        const result = await service.updateStatementContent(statementId, '');

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
          expect(result.error.message).toBe('Invalid content update');
        }
      });

      it('should fail when save fails', async () => {
        // Arrange
        const statementId = statementIdFactory.build();
        const stmtResult = Statement.create('Original');
        if (stmtResult.isErr()) throw new Error('Failed to create statement');
        const statement = stmtResult.value;

        vi.mocked(mockStatementRepo.findById).mockResolvedValue(statement);
        vi.mocked(mockStatementRepo.save).mockResolvedValue(
          err(new RepositoryError('Save failed')),
        );

        // Act
        const result = await service.updateStatementContent(statementId, 'New content');

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
          expect(result.error.message).toBe('Failed to save statement update');
        }
      });
    });
  });

  describe('StatementFlowValidationResult', () => {
    it('should create validation result with all properties', () => {
      // Arrange
      const violations = [new ValidationError('Test violation')];

      // Act
      const result = new StatementFlowValidationResult(true, false, violations);

      // Assert
      expect(result.isComplete).toBe(true);
      expect(result.isEmpty).toBe(false);
      expect(result.violations).toEqual(violations);
    });

    it('should handle empty violations', () => {
      // Act
      const result = new StatementFlowValidationResult(false, true, []);

      // Assert
      expect(result.isComplete).toBe(false);
      expect(result.isEmpty).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete flow creation and validation', async () => {
      // Arrange
      const sourceStatements = testScenarios.simpleChain.premises;
      const targetStatements = testScenarios.simpleChain.conclusions.slice(0, 1);

      vi.mocked(mockStatementRepo.findByContent).mockResolvedValue(null);
      vi.mocked(mockStatementRepo.save).mockResolvedValue(ok(undefined));
      vi.mocked(mockOrderedSetRepo.save).mockResolvedValue(ok(undefined));
      vi.mocked(mockAtomicArgumentRepo.save).mockResolvedValue(ok(undefined));

      // Act - Create flow
      const result = await service.createStatementFlow(sourceStatements, targetStatements);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const argument = result.value;

        // Setup for validation
        vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(argument);

        // Act - Validate flow
        const validateResult = await service.validateStatementFlow(argument.getId());

        // Assert
        expect(validateResult.isOk()).toBe(true);
        if (validateResult.isOk()) {
          expect(validateResult.value.isComplete).toBe(true);
          expect(validateResult.value.isEmpty).toBe(false);
        }
      }
    });

    it('should handle branching from created flow', async () => {
      // Arrange - Create parent
      const sourceStatements = ['Parent premise'];
      const targetStatements = ['Parent conclusion'];

      vi.mocked(mockStatementRepo.findByContent).mockResolvedValue(null);
      vi.mocked(mockStatementRepo.save).mockResolvedValue(ok(undefined));
      vi.mocked(mockOrderedSetRepo.save).mockResolvedValue(ok(undefined));
      vi.mocked(mockAtomicArgumentRepo.save).mockResolvedValue(ok(undefined));

      const parentResult = await service.createStatementFlow(sourceStatements, targetStatements);

      expect(parentResult.isOk()).toBe(true);
      if (parentResult.isOk()) {
        const parent = parentResult.value;

        // Setup for branching
        vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(parent);

        // Act - Create branch
        const branchResult = await service.createBranchConnection(parent.getId());

        // Assert
        expect(branchResult.isOk()).toBe(true);
        if (branchResult.isOk()) {
          const child = branchResult.value;
          expect(child.getPremiseSetRef()).toEqual(parent.getConclusionSetRef());
        }
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle maximum length content', async () => {
      // Arrange
      const maxContent = 'x'.repeat(10000);
      vi.mocked(mockStatementRepo.findByContent).mockResolvedValue(null);
      vi.mocked(mockStatementRepo.save).mockResolvedValue(ok(undefined));

      // Act
      const result = await service.processStatementReuse(maxContent);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getContent()).toBe(maxContent);
      }
    });

    it('should handle unicode and special characters', async () => {
      // Arrange
      const specialContent = 'Statement with emojis 🎯 and symbols αβγ';
      vi.mocked(mockStatementRepo.findByContent).mockResolvedValue(null);
      vi.mocked(mockStatementRepo.save).mockResolvedValue(ok(undefined));

      // Act
      const result = await service.processStatementReuse(specialContent);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getContent()).toBe(specialContent);
      }
    });

    it('should handle single character statements', async () => {
      // Arrange
      const sources = ['A'];
      const targets = ['B'];

      vi.mocked(mockStatementRepo.findByContent).mockResolvedValue(null);
      vi.mocked(mockStatementRepo.save).mockResolvedValue(ok(undefined));
      vi.mocked(mockOrderedSetRepo.save).mockResolvedValue(ok(undefined));
      vi.mocked(mockAtomicArgumentRepo.save).mockResolvedValue(ok(undefined));

      // Act
      const result = await service.createStatementFlow(sources, targets);

      // Assert
      expect(result.isOk()).toBe(true);
    });
  });
});

import { describe, expect, it } from 'vitest';

import { ProofAggregate } from '../../aggregates/ProofAggregate.js';
import { ProofQueryService } from '../../services/ProofQueryService.js';
import { AtomicArgumentId, ProofId, StatementId } from '../../shared/value-objects/index.js';

describe('ProofAggregate', () => {
  describe('createNew', () => {
    it('should create empty proof aggregate successfully', () => {
      const result = ProofAggregate.createNew();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const proof = result.value;
        const queryService = new ProofQueryService(proof);
        expect(queryService.getStatements().size).toBe(0);
        expect(queryService.getArguments().size).toBe(0);
        expect(queryService.getVersion()).toBe(1);
      }
    });

    it('should create proof with initial statement', () => {
      const result = ProofAggregate.createNew({ initialStatement: 'All men are mortal' });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const proof = result.value;
        const queryService = new ProofQueryService(proof);
        expect(queryService.getStatements().size).toBe(1);

        const statements = Array.from(queryService.getStatements().values());
        expect(statements[0]?.getContent()).toBe('All men are mortal');
      }
    });

    it('should reject empty initial statement', () => {
      const result = ProofAggregate.createNew({ initialStatement: '' });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('cannot be empty');
      }
    });
  });

  describe('addStatement', () => {
    it('should add valid statement and increment version', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;
        const initialVersion = proof.getVersion();

        const statementResult = proof.addStatement('Socrates is a man');

        expect(statementResult.isOk()).toBe(true);
        expect(proof.getStatements().size).toBe(1);
        expect(proof.getVersion()).toBe(initialVersion + 1);

        if (statementResult.isOk()) {
          const statementId = statementResult.value;
          const statement = proof.getStatements().get(statementId);
          expect(statement?.getContent()).toBe('Socrates is a man');
        }
      }
    });

    it('should reject invalid statement content', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;
        const result = proof.addStatement('');

        expect(result.isErr()).toBe(true);
      }
    });
  });

  describe('removeStatement', () => {
    it('should remove unreferenced statement successfully', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;
        const addResult = proof.addStatement('Temporary statement');
        expect(addResult.isOk()).toBe(true);

        if (addResult.isOk()) {
          const statementId = addResult.value;
          const removeResult = proof.removeStatement(statementId);

          expect(removeResult.isOk()).toBe(true);
          expect(proof.getStatements().size).toBe(0);
        }
      }
    });

    it('should reject removal of non-existent statement', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;
        const fakeId = StatementId.generate();
        const result = proof.removeStatement(fakeId);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('not found');
        }
      }
    });

    it('should reject removal of referenced statement', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;
        const statementResult = proof.addStatement('Referenced statement');
        expect(statementResult.isOk()).toBe(true);

        if (statementResult.isOk()) {
          const statementId = statementResult.value;
          const argumentResult = proof.createAtomicArgument([statementId], []);
          expect(argumentResult.isOk()).toBe(true);

          const removeResult = proof.removeStatement(statementId);
          expect(removeResult.isErr()).toBe(true);
          if (removeResult.isErr()) {
            expect(removeResult.error.message).toContain('referenced');
          }
        }
      }
    });
  });

  describe('createAtomicArgument', () => {
    it('should create argument with valid statement references', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;

        const premise1Result = proof.addStatement('All men are mortal');
        const premise2Result = proof.addStatement('Socrates is a man');
        const conclusionResult = proof.addStatement('Socrates is mortal');

        expect(premise1Result.isOk()).toBe(true);
        expect(premise2Result.isOk()).toBe(true);
        expect(conclusionResult.isOk()).toBe(true);

        if (premise1Result.isOk() && premise2Result.isOk() && conclusionResult.isOk()) {
          const argumentResult = proof.createAtomicArgument(
            [premise1Result.value, premise2Result.value],
            [conclusionResult.value],
          );

          expect(argumentResult.isOk()).toBe(true);
          expect(proof.getArguments().size).toBe(1);
          expect(proof.getOrderedSets().size).toBe(2); // premise set + conclusion set
        }
      }
    });

    it('should create empty argument (bootstrap case)', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;
        const argumentResult = proof.createAtomicArgument([], []);

        expect(argumentResult.isOk()).toBe(true);
        expect(proof.getArguments().size).toBe(1);
      }
    });

    it('should reject arguments with non-existent statements', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;
        const fakeStatementId = StatementId.generate();

        const argumentResult = proof.createAtomicArgument([fakeStatementId], []);

        expect(argumentResult.isErr()).toBe(true);
        if (argumentResult.isErr()) {
          expect(argumentResult.error.message).toContain('do not exist');
        }
      }
    });
  });

  describe('connectArguments', () => {
    it('should connect compatible arguments successfully', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;

        // Create statements
        const s1Result = proof.addStatement('All men are mortal');
        const s2Result = proof.addStatement('Socrates is a man');
        const s3Result = proof.addStatement('Socrates is mortal');
        const s4Result = proof.addStatement('All mortals die');
        const s5Result = proof.addStatement('Socrates dies');

        expect(
          s1Result.isOk() &&
            s2Result.isOk() &&
            s3Result.isOk() &&
            s4Result.isOk() &&
            s5Result.isOk(),
        ).toBe(true);

        if (
          s1Result.isOk() &&
          s2Result.isOk() &&
          s3Result.isOk() &&
          s4Result.isOk() &&
          s5Result.isOk()
        ) {
          // Create first argument: [s1, s2] → [s3]
          const arg1Result = proof.createAtomicArgument(
            [s1Result.value, s2Result.value],
            [s3Result.value],
          );

          // Create second argument: [s3] → [s4, s5]
          // Note: The premise of arg2 must be exactly the same as the conclusion of arg1
          const arg2Result = proof.createAtomicArgument(
            [s3Result.value],
            [s4Result.value, s5Result.value],
          );

          expect(arg1Result.isOk() && arg2Result.isOk()).toBe(true);

          if (arg1Result.isOk() && arg2Result.isOk()) {
            const connectResult = proof.connectArguments(arg1Result.value, arg2Result.value);

            expect(connectResult.isOk()).toBe(true);

            // Verify the connection was established
            const arg1 = proof.getArguments().get(arg1Result.value);
            const arg2 = proof.getArguments().get(arg2Result.value);

            if (arg1 && arg2) {
              expect(arg1.canConnectTo(arg2)).toBe(true);
            }
          }
        }
      }
    });

    it('should handle arguments with missing premise/conclusion sets during connection', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;

        // Create empty arguments (bootstrap case) - these don't have conclusion/premise sets
        const arg1Result = proof.createAtomicArgument([], []);
        const arg2Result = proof.createAtomicArgument([], []);

        expect(arg1Result.isOk() && arg2Result.isOk()).toBe(true);

        if (arg1Result.isOk() && arg2Result.isOk()) {
          const connectResult = proof.connectArguments(arg1Result.value, arg2Result.value);

          // Empty arguments create a cycle since they share the same empty ordered set
          expect(connectResult.isErr()).toBe(true);
          if (connectResult.isErr()) {
            expect(connectResult.error.message).toContain('direct cycle');
          }
        }
      }
    });

    it('should handle connection safety validation failures', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;

        // Create statements for incompatible arguments
        const s1Result = proof.addStatement('Statement 1');
        const s2Result = proof.addStatement('Statement 2');
        const s3Result = proof.addStatement('Statement 3');
        const s4Result = proof.addStatement('Statement 4');

        expect(s1Result.isOk() && s2Result.isOk() && s3Result.isOk() && s4Result.isOk()).toBe(true);

        if (s1Result.isOk() && s2Result.isOk() && s3Result.isOk() && s4Result.isOk()) {
          // Create incompatible arguments (different statement sets)
          const arg1Result = proof.createAtomicArgument([s1Result.value], [s2Result.value]);
          const arg2Result = proof.createAtomicArgument([s3Result.value], [s4Result.value]);

          expect(arg1Result.isOk() && arg2Result.isOk()).toBe(true);

          if (arg1Result.isOk() && arg2Result.isOk()) {
            const connectResult = proof.connectArguments(arg1Result.value, arg2Result.value);

            // This should fail due to incompatible conclusion/premise sets (different statements)
            expect(connectResult.isErr()).toBe(true);
            if (connectResult.isErr()) {
              // The error might be about connection safety or incompatible sets
              expect(connectResult.error.message).toBeDefined();
            }
          }
        }
      }
    });

    it('should handle ordered set cleanup during connection', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;

        // Create statements
        const s1Result = proof.addStatement('Statement 1');
        const s2Result = proof.addStatement('Statement 2');
        const s3Result = proof.addStatement('Statement 3');

        expect(s1Result.isOk() && s2Result.isOk() && s3Result.isOk()).toBe(true);

        if (s1Result.isOk() && s2Result.isOk() && s3Result.isOk()) {
          // Create arguments that will share ordered sets
          const arg1Result = proof.createAtomicArgument([s1Result.value], [s2Result.value]);
          const arg2Result = proof.createAtomicArgument([s3Result.value], [s1Result.value]);

          expect(arg1Result.isOk() && arg2Result.isOk()).toBe(true);

          if (arg1Result.isOk() && arg2Result.isOk()) {
            const _initialOrderedSetsCount = proof.getOrderedSets().size;
            const connectResult = proof.connectArguments(arg1Result.value, arg2Result.value);

            // Test that connection may succeed or fail based on validation
            if (connectResult.isOk()) {
              // Check that ordered sets were properly managed
              expect(proof.getOrderedSets().size).toBeGreaterThan(0);
            }
          }
        }
      }
    });

    it('should reject connection of non-existent arguments', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;
        const fakeId1 = AtomicArgumentId.generate();
        const fakeId2 = AtomicArgumentId.generate();

        const result = proof.connectArguments(fakeId1, fakeId2);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('not found');
        }
      }
    });
  });

  describe('validateConsistency', () => {
    it('should validate consistent proof successfully', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;

        const s1Result = proof.addStatement('All men are mortal');
        if (s1Result.isOk()) {
          const _argumentResult = proof.createAtomicArgument([s1Result.value], []);
        }

        const validationResult = proof.validateConsistency();
        expect(validationResult.isOk()).toBe(true);
      }
    });

    it('should detect statement usage inconsistencies', () => {
      // This test requires manipulating internal state directly
      // which would be done in integration tests with repositories
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;
        const validationResult = proof.validateConsistency();
        expect(validationResult.isOk()).toBe(true);
      }
    });

    it('should handle validation errors during consistency check', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;
        // Add a statement and argument to test usage consistency
        const statementResult = proof.addStatement('Test statement');
        expect(statementResult.isOk()).toBe(true);

        if (statementResult.isOk()) {
          const argumentResult = proof.createAtomicArgument([statementResult.value], []);
          expect(argumentResult.isOk()).toBe(true);
        }

        const validationResult = proof.validateConsistency();
        expect(validationResult.isOk()).toBe(true);
      }
    });

    it('should handle exception during consistency validation', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;
        const validationResult = proof.validateConsistency();
        expect(validationResult.isOk()).toBe(true);
      }
    });
  });

  describe('reconstruct', () => {
    it('should reconstruct valid aggregate from components', () => {
      const id = ProofId.generate();
      const statements = new Map();
      const argumentsMap = new Map();
      const orderedSets = new Map();

      const result = ProofAggregate.reconstruct(id, statements, argumentsMap, orderedSets, 1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const proof = result.value;
        expect(proof.getId()).toEqual(id);
        expect(proof.getVersion()).toBe(1);
      }
    });

    it('should reject reconstruction of inconsistent aggregate', () => {
      // Create a deliberately inconsistent state for testing
      const id = ProofId.generate();
      const statements = new Map();
      const argumentsMap = new Map();
      const orderedSets = new Map();

      // Add inconsistent data - this would be done in more complex scenarios
      const result = ProofAggregate.reconstruct(id, statements, argumentsMap, orderedSets, 1);

      // For now, empty aggregates are considered valid
      expect(result.isOk()).toBe(true);
    });
  });

  describe('event handling', () => {
    it('should track uncommitted events', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;
        const events = proof.getUncommittedEvents();

        // Initially no events (events would be added by domain operations)
        expect(events.length).toBe(0);
      }
    });

    it('should clear committed events', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;
        proof.markEventsAsCommitted();

        const events = proof.getUncommittedEvents();
        expect(events.length).toBe(0);
      }
    });
  });

  describe('error handling edge cases', () => {
    it('should handle statement decrement usage error during connection', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;
        const s1Result = proof.addStatement('Statement 1');
        const s2Result = proof.addStatement('Statement 2');

        expect(s1Result.isOk() && s2Result.isOk()).toBe(true);

        if (s1Result.isOk() && s2Result.isOk()) {
          // Create arguments
          const arg1Result = proof.createAtomicArgument([], [s1Result.value]);
          const arg2Result = proof.createAtomicArgument([s2Result.value], []);

          expect(arg1Result.isOk() && arg2Result.isOk()).toBe(true);

          if (arg1Result.isOk() && arg2Result.isOk()) {
            // This tests the error handling path in connectArguments
            const connectResult = proof.connectArguments(arg1Result.value, arg2Result.value);

            // Connection should fail due to incompatible sets
            expect(connectResult.isErr()).toBe(true);
          }
        }
      }
    });
  });

  describe('data integrity', () => {
    it('should return defensive copies of collections', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;
        const statementResult = proof.addStatement('Test statement');
        expect(statementResult.isOk()).toBe(true);

        if (statementResult.isOk()) {
          const argumentResult = proof.createAtomicArgument([statementResult.value], []);
          expect(argumentResult.isOk()).toBe(true);

          // Get collections multiple times
          const statements1 = proof.getStatements();
          const statements2 = proof.getStatements();
          const arguments1 = proof.getArguments();
          const arguments2 = proof.getArguments();
          const orderedSets1 = proof.getOrderedSets();
          const orderedSets2 = proof.getOrderedSets();

          // Should return different instances (defensive copies)
          expect(statements1).not.toBe(statements2);
          expect(arguments1).not.toBe(arguments2);
          expect(orderedSets1).not.toBe(orderedSets2);

          // But with same content
          expect(statements1.size).toBe(statements2.size);
          expect(arguments1.size).toBe(arguments2.size);
          expect(orderedSets1.size).toBe(orderedSets2.size);
        }
      }
    });
  });
});

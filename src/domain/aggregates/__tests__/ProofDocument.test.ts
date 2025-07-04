import { beforeEach, describe, expect, test } from 'vitest';
import { OrderedSet } from '../../entities/OrderedSet.js';
import { ValidationError } from '../../shared/result.js';
import { StatementId } from '../../shared/value-objects.js';
import { ProofDocument } from '../ProofDocument.js';

describe('ProofDocument Aggregate', () => {
  let document: ProofDocument;

  beforeEach(() => {
    document = ProofDocument.create();
  });

  describe('Creation and Basic Properties', () => {
    test('creates document with valid ID and version', () => {
      expect(document.getId()).toBeDefined();
      expect(document.getVersion()).toBe(0);
    });

    test('emits ProofDocumentCreated event on creation', () => {
      const events = document.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]?.eventType).toBe('ProofDocumentCreated');
    });

    test('provides basic stats for empty document', () => {
      const stats = document.getStats();
      expect(stats).toEqual({
        statementCount: 0,
        orderedSetCount: 0,
        argumentCount: 0,
        sharedOrderedSetCount: 0,
      });
    });
  });

  describe('Statement Operations', () => {
    test('creates statement successfully', () => {
      const result = document.createStatement('All men are mortal');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const statement = result.value;
        expect(statement.getContent()).toBe('All men are mortal');
        expect(document.getStatement(statement.getId())).toBe(statement);
      }
    });

    test('increments version when creating statement', () => {
      const initialVersion = document.getVersion();
      document.createStatement('Test statement');
      expect(document.getVersion()).toBe(initialVersion + 1);
    });

    test('emits StatementCreated event', () => {
      document.markEventsAsCommitted(); // Clear creation event

      const result = document.createStatement('Test statement');
      expect(result.isOk()).toBe(true);

      const events = document.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]?.eventType).toBe('StatementCreated');
    });

    test('fails to create statement with invalid content', () => {
      const result = document.createStatement('');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    test('updates statement successfully when not in use', () => {
      const createResult = document.createStatement('Original content');
      expect(createResult.isOk()).toBe(true);
      if (createResult.isOk()) {
        const statement = createResult.value;

        const updateResult = document.updateStatement(statement.getId(), 'Updated content');
        expect(updateResult.isOk()).toBe(true);
        if (updateResult.isOk()) {
          expect(updateResult.value.getContent()).toBe('Updated content');
        }
      }
    });

    test('fails to update statement that is in use', () => {
      // Create statement and use it in an OrderedSet
      const stmtResult = document.createStatement('Used statement');
      expect(stmtResult.isOk()).toBe(true);
      if (stmtResult.isOk()) {
        const statement = stmtResult.value;

        const setResult = document.createOrderedSet([statement.getId()]);
        expect(setResult.isOk()).toBe(true);

        // Now try to update the statement
        const updateResult = document.updateStatement(statement.getId(), 'New content');
        expect(updateResult.isErr()).toBe(true);
        if (updateResult.isErr()) {
          expect(updateResult.error.message).toContain('in use');
        }
      }
    });

    test('deletes statement successfully when not in use', () => {
      const createResult = document.createStatement('To be deleted');
      expect(createResult.isOk()).toBe(true);
      if (createResult.isOk()) {
        const statement = createResult.value;
        const statementId = statement.getId();

        const deleteResult = document.deleteStatement(statementId);
        expect(deleteResult.isOk()).toBe(true);
        expect(document.getStatement(statementId)).toBeNull();
      }
    });

    test('fails to delete statement that is in use', () => {
      const stmtResult = document.createStatement('Used statement');
      expect(stmtResult.isOk()).toBe(true);
      if (stmtResult.isOk()) {
        const statement = stmtResult.value;

        document.createOrderedSet([statement.getId()]);

        const deleteResult = document.deleteStatement(statement.getId());
        expect(deleteResult.isErr()).toBe(true);
        if (deleteResult.isErr()) {
          expect(deleteResult.error.message).toContain('in use');
        }
      }
    });
  });

  describe('OrderedSet Operations', () => {
    test('creates OrderedSet with valid statements', () => {
      const stmt1Result = document.createStatement('Statement 1');
      const stmt2Result = document.createStatement('Statement 2');

      expect(stmt1Result.isOk() && stmt2Result.isOk()).toBe(true);
      if (stmt1Result.isOk() && stmt2Result.isOk()) {
        const setResult = document.createOrderedSet([
          stmt1Result.value.getId(),
          stmt2Result.value.getId(),
        ]);

        expect(setResult.isOk()).toBe(true);
        if (setResult.isOk()) {
          const orderedSet = setResult.value;
          expect(orderedSet.size()).toBe(2);
          expect(document.getOrderedSet(orderedSet.getId())).toBe(orderedSet);
        }
      }
    });

    test('returns existing OrderedSet for identical content', () => {
      const stmt1Result = document.createStatement('Statement 1');
      const stmt2Result = document.createStatement('Statement 2');

      expect(stmt1Result.isOk() && stmt2Result.isOk()).toBe(true);
      if (stmt1Result.isOk() && stmt2Result.isOk()) {
        const statementIds = [stmt1Result.value.getId(), stmt2Result.value.getId()];

        const set1Result = document.createOrderedSet(statementIds);
        const set2Result = document.createOrderedSet(statementIds);

        expect(set1Result.isOk() && set2Result.isOk()).toBe(true);
        if (set1Result.isOk() && set2Result.isOk()) {
          // Should return the same object (identity preservation)
          expect(set1Result.value).toBe(set2Result.value);
        }
      }
    });

    test('fails to create OrderedSet with non-existent statements', () => {
      const fakeId = StatementId.generate();
      const result = document.createOrderedSet([fakeId]);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('not found');
      }
    });

    test('deletes OrderedSet when not referenced', () => {
      const stmtResult = document.createStatement('Statement');
      expect(stmtResult.isOk()).toBe(true);
      if (stmtResult.isOk()) {
        const setResult = document.createOrderedSet([stmtResult.value.getId()]);
        expect(setResult.isOk()).toBe(true);
        if (setResult.isOk()) {
          const orderedSet = setResult.value;
          const setId = orderedSet.getId();

          const deleteResult = document.deleteOrderedSet(setId);
          expect(deleteResult.isOk()).toBe(true);
          expect(document.getOrderedSet(setId)).toBeNull();
        }
      }
    });
  });

  describe('AtomicArgument Operations', () => {
    test('creates atomic argument with premise and conclusion sets', () => {
      const stmt1Result = document.createStatement('Premise');
      const stmt2Result = document.createStatement('Conclusion');

      expect(stmt1Result.isOk() && stmt2Result.isOk()).toBe(true);
      if (stmt1Result.isOk() && stmt2Result.isOk()) {
        const premiseSetResult = document.createOrderedSet([stmt1Result.value.getId()]);
        const conclusionSetResult = document.createOrderedSet([stmt2Result.value.getId()]);

        expect(premiseSetResult.isOk() && conclusionSetResult.isOk()).toBe(true);
        if (premiseSetResult.isOk() && conclusionSetResult.isOk()) {
          const argResult = document.createAtomicArgument(
            premiseSetResult.value,
            conclusionSetResult.value,
          );

          expect(argResult.isOk()).toBe(true);
          if (argResult.isOk()) {
            const argument = argResult.value;
            expect(argument.getPremiseSet()).toEqual(premiseSetResult.value.getId());
            expect(argument.getConclusionSet()).toEqual(conclusionSetResult.value.getId());
            expect(document.getArgument(argument.getId())).toBe(argument);
          }
        }
      }
    });

    test('creates bootstrap atomic argument with null sets', () => {
      const argResult = document.createAtomicArgument(null, null);

      expect(argResult.isOk()).toBe(true);
      if (argResult.isOk()) {
        const argument = argResult.value;
        expect(argument.isBootstrap()).toBe(true);
        expect(argument.getPremiseSet()).toBeNull();
        expect(argument.getConclusionSet()).toBeNull();
      }
    });

    test('fails to create argument with OrderedSet not in document', () => {
      // Create an OrderedSet outside the document
      const externalSet = OrderedSet.create([]);
      expect(externalSet.isOk()).toBe(true);
      if (externalSet.isOk()) {
        const argResult = document.createAtomicArgument(externalSet.value, null);

        expect(argResult.isErr()).toBe(true);
        if (argResult.isErr()) {
          expect(argResult.error.message).toContain('not in document');
        }
      }
    });

    test('updates atomic argument successfully', () => {
      const argResult = document.createAtomicArgument(null, null);
      expect(argResult.isOk()).toBe(true);
      if (argResult.isOk()) {
        const argument = argResult.value;

        // Create new sets
        const stmtResult = document.createStatement('New premise');
        expect(stmtResult.isOk()).toBe(true);
        if (stmtResult.isOk()) {
          const setResult = document.createOrderedSet([stmtResult.value.getId()]);
          expect(setResult.isOk()).toBe(true);
          if (setResult.isOk()) {
            const updateResult = document.updateAtomicArgument(
              argument.getId(),
              setResult.value,
              null,
            );

            expect(updateResult.isOk()).toBe(true);
            if (updateResult.isOk()) {
              expect(updateResult.value.getPremiseSet()).toEqual(setResult.value.getId());
            }
          }
        }
      }
    });

    test('deletes atomic argument successfully', () => {
      const argResult = document.createAtomicArgument(null, null);
      expect(argResult.isOk()).toBe(true);
      if (argResult.isOk()) {
        const argument = argResult.value;
        const argumentId = argument.getId();

        const deleteResult = document.deleteAtomicArgument(argumentId);
        expect(deleteResult.isOk()).toBe(true);
        expect(document.getArgument(argumentId)).toBeNull();
      }
    });
  });

  describe('OrderedSet Sharing and Connection Discovery', () => {
    test('tracks OrderedSet sharing between arguments', () => {
      const s1Result = document.createStatement('A');
      const s2Result = document.createStatement('B');
      const s3Result = document.createStatement('C');

      expect(s1Result.isOk() && s2Result.isOk() && s3Result.isOk()).toBe(true);
      if (s1Result.isOk() && s2Result.isOk() && s3Result.isOk()) {
        // Create shared OrderedSet
        const sharedSetResult = document.createOrderedSet([s2Result.value.getId()]);
        const set1Result = document.createOrderedSet([s1Result.value.getId()]);
        const set3Result = document.createOrderedSet([s3Result.value.getId()]);

        expect(sharedSetResult.isOk() && set1Result.isOk() && set3Result.isOk()).toBe(true);
        if (sharedSetResult.isOk() && set1Result.isOk() && set3Result.isOk()) {
          // Create two arguments that share the same OrderedSet
          const arg1Result = document.createAtomicArgument(set1Result.value, sharedSetResult.value);
          const arg2Result = document.createAtomicArgument(sharedSetResult.value, set3Result.value);

          expect(arg1Result.isOk() && arg2Result.isOk()).toBe(true);
          if (arg1Result.isOk() && arg2Result.isOk()) {
            // Check shared OrderedSets
            const shared = document.findSharedOrderedSets();
            expect(shared).toHaveLength(1);
            expect(shared[0]?.orderedSet).toBe(sharedSetResult.value);
            expect(shared[0]?.usages).toHaveLength(2);

            const usageRoles = shared[0]?.usages.map((u) => u.role) ?? [];
            expect(usageRoles).toContain('conclusion');
            expect(usageRoles).toContain('premise');
          }
        }
      }
    });

    test('emits OrderedSetBecameShared event when set becomes shared', () => {
      const stmt1Result = document.createStatement('Statement 1');
      const stmt2Result = document.createStatement('Statement 2');

      expect(stmt1Result.isOk() && stmt2Result.isOk()).toBe(true);
      if (stmt1Result.isOk() && stmt2Result.isOk()) {
        const set1Result = document.createOrderedSet([stmt1Result.value.getId()]);
        const sharedSetResult = document.createOrderedSet([stmt2Result.value.getId()]);

        expect(set1Result.isOk() && sharedSetResult.isOk()).toBe(true);
        if (set1Result.isOk() && sharedSetResult.isOk()) {
          document.markEventsAsCommitted(); // Clear existing events

          // Create first argument using the set
          document.createAtomicArgument(set1Result.value, sharedSetResult.value);

          let events = document.getUncommittedEvents();
          const sharedEvents = events.filter((e) => e.eventType === 'OrderedSetBecameShared');
          expect(sharedEvents).toHaveLength(0); // Not shared yet

          document.markEventsAsCommitted();

          // Create second argument using the same set - now it becomes shared
          document.createAtomicArgument(sharedSetResult.value, null);

          events = document.getUncommittedEvents();
          const newSharedEvents = events.filter((e) => e.eventType === 'OrderedSetBecameShared');
          expect(newSharedEvents).toHaveLength(1);
        }
      }
    });

    test('finds connections between arguments through shared OrderedSets', () => {
      const s1Result = document.createStatement('A');
      const s2Result = document.createStatement('B');
      const s3Result = document.createStatement('C');

      expect(s1Result.isOk() && s2Result.isOk() && s3Result.isOk()).toBe(true);
      if (s1Result.isOk() && s2Result.isOk() && s3Result.isOk()) {
        const set1Result = document.createOrderedSet([s1Result.value.getId()]);
        const set2Result = document.createOrderedSet([s2Result.value.getId()]);
        const set3Result = document.createOrderedSet([s3Result.value.getId()]);

        expect(set1Result.isOk() && set2Result.isOk() && set3Result.isOk()).toBe(true);
        if (set1Result.isOk() && set2Result.isOk() && set3Result.isOk()) {
          // Create connected arguments: arg1 produces set2, arg2 consumes set2
          const arg1Result = document.createAtomicArgument(set1Result.value, set2Result.value);
          const arg2Result = document.createAtomicArgument(set2Result.value, set3Result.value);

          expect(arg1Result.isOk() && arg2Result.isOk()).toBe(true);
          if (arg1Result.isOk() && arg2Result.isOk()) {
            // Find connections for arg1
            const connections1 = document.findConnectionsForArgument(arg1Result.value.getId());
            expect(connections1).toHaveLength(1);
            expect(connections1[0]?.type).toBe('provides');
            expect(connections1[0]?.fromId).toEqual(arg1Result.value.getId());
            expect(connections1[0]?.toId).toEqual(arg2Result.value.getId());
            expect(connections1[0]?.viaOrderedSetId).toEqual(set2Result.value.getId());

            // Find connections for arg2
            const connections2 = document.findConnectionsForArgument(arg2Result.value.getId());
            expect(connections2).toHaveLength(1);
            expect(connections2[0]?.type).toBe('consumes');
            expect(connections2[0]?.fromId).toEqual(arg1Result.value.getId());
            expect(connections2[0]?.toId).toEqual(arg2Result.value.getId());
          }
        }
      }
    });
  });

  describe('Connection Validation', () => {
    test('detects orphaned arguments', () => {
      const stmtResult = document.createStatement('Orphan');
      expect(stmtResult.isOk()).toBe(true);
      if (stmtResult.isOk()) {
        const setResult = document.createOrderedSet([stmtResult.value.getId()]);
        expect(setResult.isOk()).toBe(true);
        if (setResult.isOk()) {
          const argResult = document.createAtomicArgument(setResult.value, null);
          expect(argResult.isOk()).toBe(true);
          if (argResult.isOk()) {
            const validation = document.validateConnections();
            expect(validation.orphans).toContain(argResult.value.getId());
          }
        }
      }
    });

    test('does not consider bootstrap arguments as orphans', () => {
      const argResult = document.createAtomicArgument(null, null);
      expect(argResult.isOk()).toBe(true);
      if (argResult.isOk()) {
        const validation = document.validateConnections();
        expect(validation.orphans).not.toContain(argResult.value.getId());
      }
    });

    test('detects cycles in argument connections', () => {
      // Create statements
      const s1Result = document.createStatement('A');
      const s2Result = document.createStatement('B');

      expect(s1Result.isOk() && s2Result.isOk()).toBe(true);
      if (s1Result.isOk() && s2Result.isOk()) {
        const set1Result = document.createOrderedSet([s1Result.value.getId()]);
        const set2Result = document.createOrderedSet([s2Result.value.getId()]);

        expect(set1Result.isOk() && set2Result.isOk()).toBe(true);
        if (set1Result.isOk() && set2Result.isOk()) {
          // Create cyclic connection: arg1 -> arg2 -> arg1
          const arg1Result = document.createAtomicArgument(set1Result.value, set2Result.value);
          const arg2Result = document.createAtomicArgument(set2Result.value, set1Result.value);

          expect(arg1Result.isOk() && arg2Result.isOk()).toBe(true);
          if (arg1Result.isOk() && arg2Result.isOk()) {
            const validation = document.validateConnections();
            expect(validation.cycles.length).toBeGreaterThan(0);
            expect(validation.isValid).toBe(false);
          }
        }
      }
    });

    test('detects inconsistent connections', () => {
      const stmtResult = document.createStatement('Test');
      expect(stmtResult.isOk()).toBe(true);
      if (stmtResult.isOk()) {
        // Create empty OrderedSet
        const emptySetResult = document.createOrderedSet([]);
        expect(emptySetResult.isOk()).toBe(true);
        if (emptySetResult.isOk()) {
          const argResult = document.createAtomicArgument(emptySetResult.value, null);
          expect(argResult.isOk()).toBe(true);
          if (argResult.isOk()) {
            const validation = document.validateConnections();
            expect(validation.inconsistencies.length).toBeGreaterThan(0);
            expect(validation.inconsistencies[0]?.type).toBe('missing_premise');
          }
        }
      }
    });
  });

  describe('Document Statistics', () => {
    test('provides accurate statistics', () => {
      // Start with empty stats
      let stats = document.getStats();
      expect(stats.statementCount).toBe(0);
      expect(stats.orderedSetCount).toBe(0);
      expect(stats.argumentCount).toBe(0);
      expect(stats.sharedOrderedSetCount).toBe(0);

      // Create some content
      const stmt1Result = document.createStatement('Statement 1');
      const stmt2Result = document.createStatement('Statement 2');

      expect(stmt1Result.isOk() && stmt2Result.isOk()).toBe(true);
      if (stmt1Result.isOk() && stmt2Result.isOk()) {
        const set1Result = document.createOrderedSet([stmt1Result.value.getId()]);
        const set2Result = document.createOrderedSet([stmt2Result.value.getId()]);

        expect(set1Result.isOk() && set2Result.isOk()).toBe(true);
        if (set1Result.isOk() && set2Result.isOk()) {
          const arg1Result = document.createAtomicArgument(set1Result.value, set2Result.value);
          const arg2Result = document.createAtomicArgument(set2Result.value, null);

          expect(arg1Result.isOk() && arg2Result.isOk()).toBe(true);

          // Check updated stats
          stats = document.getStats();
          expect(stats.statementCount).toBe(2);
          expect(stats.orderedSetCount).toBe(2);
          expect(stats.argumentCount).toBe(2);
          expect(stats.sharedOrderedSetCount).toBe(1); // set2 is shared
        }
      }
    });
  });

  describe('Collection Getters', () => {
    test('returns all statements', () => {
      const stmt1Result = document.createStatement('Statement 1');
      const stmt2Result = document.createStatement('Statement 2');

      expect(stmt1Result.isOk() && stmt2Result.isOk()).toBe(true);

      const allStatements = document.getAllStatements();
      expect(allStatements).toHaveLength(2);
      expect(allStatements.map((s) => s.getContent())).toContain('Statement 1');
      expect(allStatements.map((s) => s.getContent())).toContain('Statement 2');
    });

    test('returns all ordered sets', () => {
      const stmt1Result = document.createStatement('Statement 1');
      const stmt2Result = document.createStatement('Statement 2');

      expect(stmt1Result.isOk() && stmt2Result.isOk()).toBe(true);
      if (stmt1Result.isOk() && stmt2Result.isOk()) {
        document.createOrderedSet([stmt1Result.value.getId()]);
        document.createOrderedSet([stmt2Result.value.getId()]);

        const allOrderedSets = document.getAllOrderedSets();
        expect(allOrderedSets).toHaveLength(2);
      }
    });

    test('returns all atomic arguments', () => {
      document.createAtomicArgument(null, null);
      document.createAtomicArgument(null, null);

      const allArguments = document.getAllAtomicArguments();
      expect(allArguments).toHaveLength(2);
      expect(allArguments.every((arg) => arg.isBootstrap())).toBe(true);
    });
  });

  describe('Domain Events', () => {
    test('emits appropriate events for all operations', () => {
      document.markEventsAsCommitted(); // Clear creation event

      // Statement operations
      const stmtResult = document.createStatement('Test statement');
      expect(stmtResult.isOk()).toBe(true);
      if (stmtResult.isOk()) {
        const statement = stmtResult.value;

        document.updateStatement(statement.getId(), 'Updated statement');

        // OrderedSet operations
        const setResult = document.createOrderedSet([statement.getId()]);
        expect(setResult.isOk()).toBe(true);
        if (setResult.isOk()) {
          const orderedSet = setResult.value;

          // AtomicArgument operations
          const argResult = document.createAtomicArgument(orderedSet, null);
          expect(argResult.isOk()).toBe(true);
          if (argResult.isOk()) {
            const argument = argResult.value;

            document.updateAtomicArgument(argument.getId(), null, orderedSet);

            const events = document.getUncommittedEvents();
            const eventTypes = events.map((e) => e.eventType);

            expect(eventTypes).toContain('StatementCreated');
            expect(eventTypes).toContain('StatementUpdated');
            expect(eventTypes).toContain('OrderedSetCreated');
            expect(eventTypes).toContain('AtomicArgumentCreated');
            expect(eventTypes).toContain('AtomicArgumentUpdated');
          }
        }
      }
    });

    test('provides event data in correct format', () => {
      document.markEventsAsCommitted(); // Clear creation event

      const stmtResult = document.createStatement('Test statement');
      expect(stmtResult.isOk()).toBe(true);
      if (stmtResult.isOk()) {
        const statement = stmtResult.value;

        const events = document.getUncommittedEvents();
        const statementEvent = events.find((e) => e.eventType === 'StatementCreated');

        expect(statementEvent).toBeDefined();
        expect(statementEvent?.aggregateId).toBe(document.getId().getValue());
        expect(statementEvent?.aggregateType).toBe('ProofDocument');
        expect(statementEvent?.eventData.statementId).toBe(statement.getId().getValue());
        expect(statementEvent?.eventData.content).toBe('Test statement');
      }
    });
  });
});

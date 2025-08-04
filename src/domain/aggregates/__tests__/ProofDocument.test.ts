import { beforeEach, describe, expect, test } from 'vitest';
import type { ProofDocumentQueryService } from '../../queries/ProofDocumentQueryService.js';
import { ValidationError } from '../../shared/result.js';
import { StatementContent, StatementId } from '../../shared/value-objects/index.js';
import { ProofDocument } from '../ProofDocument.js';

describe('ProofDocument Aggregate', () => {
  let document: ProofDocument;
  let queryService: ProofDocumentQueryService;

  beforeEach(() => {
    document = ProofDocument.create();
    queryService = document.createQueryService();
  });

  describe('Creation and Basic Properties', () => {
    test('creates document with valid ID and version', () => {
      expect(queryService.getId()).toBeDefined();
      expect(queryService.getVersion()).toBe(0);
    });

    test('emits ProofDocumentCreated event on creation', () => {
      const events = document.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]?.eventType).toBe('ProofDocumentCreated');
    });

    test('provides basic stats for empty document', () => {
      // Stats would be calculated from query service data
      expect(queryService.getAllStatements()).toHaveLength(0);
      expect(queryService.getAllAtomicArguments()).toHaveLength(0);
    });
  });

  describe('Statement Operations', () => {
    test('creates statement successfully', () => {
      const contentResult = StatementContent.create('All men are mortal');
      expect(contentResult.isOk()).toBe(true);
      if (!contentResult.isOk()) return;

      const result = document.createStatement(contentResult.value);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const statement = result.value;
        expect(statement.getContent()).toBe('All men are mortal');
        const updatedQueryService = document.createQueryService();
        expect(updatedQueryService.getStatement(statement.getId())).toBe(statement);
      }
    });

    test('increments version when creating statement', () => {
      const initialVersion = queryService.getVersion();
      const contentResult = StatementContent.create('Test statement');
      expect(contentResult.isOk()).toBe(true);
      if (!contentResult.isOk()) return;
      document.createStatement(contentResult.value);
      const updatedQueryService = document.createQueryService();
      expect(updatedQueryService.getVersion()).toBe(initialVersion + 1);
    });

    test('emits StatementCreated event', () => {
      document.markEventsAsCommitted(); // Clear creation event

      const contentResult = StatementContent.create('Test statement');
      expect(contentResult.isOk()).toBe(true);
      if (!contentResult.isOk()) return;
      const result = document.createStatement(contentResult.value);
      expect(result.isOk()).toBe(true);

      const events = document.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]?.eventType).toBe('StatementCreated');
    });

    test('fails to create statement with invalid content', () => {
      const contentResult = StatementContent.create('');
      expect(contentResult.isErr()).toBe(true);
      if (!contentResult.isErr()) return;
      const result = document.createStatementFromString('');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    test('updates statement successfully when not in use', () => {
      const createResult = document.createStatementFromString('Original content');
      expect(createResult.isOk()).toBe(true);
      if (createResult.isOk()) {
        const statement = createResult.value;

        const updateResult = document.updateStatementFromString(
          statement.getId(),
          'Updated content',
        );
        expect(updateResult.isOk()).toBe(true);
        if (updateResult.isOk()) {
          expect(updateResult.value.getContent()).toBe('Updated content');
        }
      }
    });

    test('fails to update statement that is in use', () => {
      // Create statement and use it in an OrderedSet
      // Create statement
      const stmtResult = document.createStatementFromString('Used statement');
      expect(stmtResult.isOk()).toBe(true);
      if (stmtResult.isOk()) {
        const statement = stmtResult.value;

        // Use it in an atomic argument
        const argResult = document.createAtomicArgument([statement], []);
        expect(argResult.isOk()).toBe(true);

        // Now try to update the statement
        const updateResult = document.updateStatementFromString(statement.getId(), 'New content');
        expect(updateResult.isErr()).toBe(true);
        if (updateResult.isErr()) {
          expect(updateResult.error.message).toContain('in use');
        }
      }
    });

    test('deletes statement successfully when not in use', () => {
      const createResult = document.createStatementFromString('To be deleted');
      expect(createResult.isOk()).toBe(true);
      if (createResult.isOk()) {
        const statement = createResult.value;
        const statementId = statement.getId();

        const deleteResult = document.deleteStatement(statementId);
        expect(deleteResult.isOk()).toBe(true);
        const updatedQueryService = document.createQueryService();
        expect(updatedQueryService.getStatement(statementId)).toBeNull();
      }
    });

    test('fails to delete statement that is in use', () => {
      const stmtResult = document.createStatementFromString('Used statement');
      expect(stmtResult.isOk()).toBe(true);
      if (stmtResult.isOk()) {
        const statement = stmtResult.value;

        // Use it in an atomic argument
        document.createAtomicArgument([statement], []);

        const deleteResult = document.deleteStatement(statement.getId());
        expect(deleteResult.isErr()).toBe(true);
        if (deleteResult.isErr()) {
          expect(deleteResult.error.message).toContain('in use');
        }
      }
    });
  });

  // OrderedSet operations are no longer part of the public API

  describe('AtomicArgument Operations', () => {
    test('creates atomic argument with premise and conclusion sets', () => {
      const stmt1Result = document.createStatementFromString('Premise');
      const stmt2Result = document.createStatementFromString('Conclusion');

      expect(stmt1Result.isOk() && stmt2Result.isOk()).toBe(true);
      if (stmt1Result.isOk() && stmt2Result.isOk()) {
        const argResult = document.createAtomicArgument([stmt1Result.value], [stmt2Result.value]);

        expect(argResult.isOk()).toBe(true);
        if (argResult.isOk()) {
          const argument = argResult.value;
          expect(argument.getPremises()).toHaveLength(1);
          expect(argument.getConclusions()).toHaveLength(1);
          const updatedQueryService = document.createQueryService();
          expect(updatedQueryService.getArgument(argument.getId())).toBe(argument);
        }
      }
    });

    test('creates bootstrap atomic argument with empty arrays', () => {
      const argResult = document.createAtomicArgument([], []);

      expect(argResult.isOk()).toBe(true);
      if (argResult.isOk()) {
        const argument = argResult.value;
        expect(argument.isBootstrap()).toBe(true);
        expect(argument.getPremises()).toHaveLength(0);
        expect(argument.getConclusions()).toHaveLength(0);
      }
    });

    test('fails to create argument with non-existent statement', () => {
      // Try to create argument with fake statement ID
      const fakeStatement = { getId: () => StatementId.generate() } as any;
      const argResult = document.createAtomicArgument([fakeStatement], []);

      expect(argResult.isErr()).toBe(true);
      if (argResult.isErr()) {
        expect(argResult.error.message).toContain('not in document');
      }
    });

    test('updates atomic argument successfully', () => {
      const argResult = document.createAtomicArgument([], []);
      expect(argResult.isOk()).toBe(true);
      if (argResult.isOk()) {
        const argument = argResult.value;

        // Create new statement
        const stmtResult = document.createStatementFromString('New premise');
        expect(stmtResult.isOk()).toBe(true);
        if (stmtResult.isOk()) {
          const updateResult = document.updateAtomicArgument(
            argument.getId(),
            [stmtResult.value],
            [],
          );

          expect(updateResult.isOk()).toBe(true);
          if (updateResult.isOk()) {
            expect(updateResult.value.getPremises()).toHaveLength(1);
          }
        }
      }
    });

    test('deletes atomic argument successfully', () => {
      const argResult = document.createAtomicArgument([], []);
      expect(argResult.isOk()).toBe(true);
      if (argResult.isOk()) {
        const argument = argResult.value;
        const argumentId = argument.getId();

        const deleteResult = document.deleteAtomicArgument(argumentId);
        expect(deleteResult.isOk()).toBe(true);
        const updatedQueryService = document.createQueryService();
        expect(updatedQueryService.getArgument(argumentId)).toBeNull();
      }
    });
  });

  describe('Statement Sharing and Connection Discovery', () => {
    test('tracks statement sharing between arguments', () => {
      const s1Result = document.createStatementFromString('A');
      const s2Result = document.createStatementFromString('B');
      const s3Result = document.createStatementFromString('C');

      expect(s1Result.isOk() && s2Result.isOk() && s3Result.isOk()).toBe(true);
      if (s1Result.isOk() && s2Result.isOk() && s3Result.isOk()) {
        // Create two arguments that share a statement (which creates implicit connection)
        const arg1Result = document.createAtomicArgument([s1Result.value], [s2Result.value]);
        const arg2Result = document.createAtomicArgument([s2Result.value], [s3Result.value]);

        expect(arg1Result.isOk() && arg2Result.isOk()).toBe(true);
        if (arg1Result.isOk() && arg2Result.isOk()) {
          // Check that both arguments exist
          const updatedQueryService = document.createQueryService();
          expect(updatedQueryService.getArgument(arg1Result.value.getId())).toBe(arg1Result.value);
          expect(updatedQueryService.getArgument(arg2Result.value.getId())).toBe(arg2Result.value);

          // Verify connection through shared statement
          expect(arg1Result.value.getConclusions()[0]).toBe(s2Result.value);
          expect(arg2Result.value.getPremises()[0]).toBe(s2Result.value);
        }
      }
    });

    test('creates arguments with shared statements', () => {
      const stmt1Result = document.createStatementFromString('Statement 1');
      const stmt2Result = document.createStatementFromString('Statement 2');
      const stmt3Result = document.createStatementFromString('Statement 3');

      expect(stmt1Result.isOk() && stmt2Result.isOk() && stmt3Result.isOk()).toBe(true);
      if (stmt1Result.isOk() && stmt2Result.isOk() && stmt3Result.isOk()) {
        // Create first argument: [stmt1] -> [stmt2]
        const arg1Result = document.createAtomicArgument([stmt1Result.value], [stmt2Result.value]);

        // Create second argument: [stmt2] -> [stmt3] (shares stmt2)
        const arg2Result = document.createAtomicArgument([stmt2Result.value], [stmt3Result.value]);

        expect(arg1Result.isOk() && arg2Result.isOk()).toBe(true);
        if (arg1Result.isOk() && arg2Result.isOk()) {
          // Verify both arguments are created
          const updatedQueryService = document.createQueryService();
          expect(updatedQueryService.getAllAtomicArguments()).toHaveLength(2);

          // Verify stmt2 is shared between the arguments
          expect(updatedQueryService.isStatementInUse(stmt2Result.value.getId())).toBe(true);
        }
      }
    });

    test('creates chain of connected arguments', () => {
      const s1Result = document.createStatementFromString('A');
      const s2Result = document.createStatementFromString('B');
      const s3Result = document.createStatementFromString('C');

      expect(s1Result.isOk() && s2Result.isOk() && s3Result.isOk()).toBe(true);
      if (s1Result.isOk() && s2Result.isOk() && s3Result.isOk()) {
        // Create connected arguments: arg1 produces B, arg2 consumes B
        const arg1Result = document.createAtomicArgument([s1Result.value], [s2Result.value]);
        const arg2Result = document.createAtomicArgument([s2Result.value], [s3Result.value]);

        expect(arg1Result.isOk() && arg2Result.isOk()).toBe(true);
        if (arg1Result.isOk() && arg2Result.isOk()) {
          // Verify the chain is created correctly
          expect(arg1Result.value.getConclusions()[0]).toBe(s2Result.value);
          expect(arg2Result.value.getPremises()[0]).toBe(s2Result.value);

          // Both arguments share the same Statement object for B
          expect(arg1Result.value.getConclusions()[0]).toBe(arg2Result.value.getPremises()[0]);
        }
      }
    });
  });

  describe('Argument Relationships', () => {
    test('creates orphaned arguments', () => {
      const stmtResult = document.createStatementFromString('Orphan');
      expect(stmtResult.isOk()).toBe(true);
      if (stmtResult.isOk()) {
        const argResult = document.createAtomicArgument([stmtResult.value], []);
        expect(argResult.isOk()).toBe(true);
        if (argResult.isOk()) {
          // This argument has no connections to other arguments
          const updatedQueryService = document.createQueryService();
          expect(updatedQueryService.getAllAtomicArguments()).toHaveLength(1);
        }
      }
    });

    test('creates bootstrap arguments', () => {
      const argResult = document.createAtomicArgument([], []);
      expect(argResult.isOk()).toBe(true);
      if (argResult.isOk()) {
        expect(argResult.value.isBootstrap()).toBe(true);
      }
    });

    test('creates potential cycles in argument connections', () => {
      // Create statements
      const s1Result = document.createStatementFromString('A');
      const s2Result = document.createStatementFromString('B');

      expect(s1Result.isOk() && s2Result.isOk()).toBe(true);
      if (s1Result.isOk() && s2Result.isOk()) {
        // Create cyclic connection: arg1 -> arg2 -> arg1
        const arg1Result = document.createAtomicArgument([s1Result.value], [s2Result.value]);
        const arg2Result = document.createAtomicArgument([s2Result.value], [s1Result.value]);

        expect(arg1Result.isOk() && arg2Result.isOk()).toBe(true);
        if (arg1Result.isOk() && arg2Result.isOk()) {
          // Both arguments are created (cycle detection would be done at a higher level)
          const updatedQueryService = document.createQueryService();
          expect(updatedQueryService.getAllAtomicArguments()).toHaveLength(2);
        }
      }
    });
  });

  describe('Document Statistics', () => {
    test('provides accurate statistics', () => {
      // Start with empty stats
      let queryService = document.createQueryService();
      expect(queryService.getAllStatements()).toHaveLength(0);
      expect(queryService.getAllAtomicArguments()).toHaveLength(0);

      // Create some content
      const stmt1Result = document.createStatementFromString('Statement 1');
      const stmt2Result = document.createStatementFromString('Statement 2');

      expect(stmt1Result.isOk() && stmt2Result.isOk()).toBe(true);
      if (stmt1Result.isOk() && stmt2Result.isOk()) {
        const arg1Result = document.createAtomicArgument([stmt1Result.value], [stmt2Result.value]);
        const arg2Result = document.createAtomicArgument([stmt2Result.value], []);

        expect(arg1Result.isOk() && arg2Result.isOk()).toBe(true);

        // Check updated stats
        queryService = document.createQueryService();
        expect(queryService.getAllStatements()).toHaveLength(2);
        expect(queryService.getAllAtomicArguments()).toHaveLength(2);
      }
    });
  });

  describe('Collection Getters', () => {
    test('returns all statements', () => {
      const stmt1Result = document.createStatementFromString('Statement 1');
      const stmt2Result = document.createStatementFromString('Statement 2');

      expect(stmt1Result.isOk() && stmt2Result.isOk()).toBe(true);

      const queryService = document.createQueryService();
      const allStatements = queryService.getAllStatements();
      expect(allStatements).toHaveLength(2);
      expect(allStatements.map((s) => s.getContent())).toContain('Statement 1');
      expect(allStatements.map((s) => s.getContent())).toContain('Statement 2');
    });

    test('returns all atomic arguments', () => {
      document.createAtomicArgument([], []);
      document.createAtomicArgument([], []);

      const queryService = document.createQueryService();
      const allArguments = queryService.getAllAtomicArguments();
      expect(allArguments).toHaveLength(2);
      expect(allArguments.every((arg) => arg.isBootstrap())).toBe(true);
    });
  });

  describe('Domain Events', () => {
    test('emits appropriate events for all operations', () => {
      document.markEventsAsCommitted(); // Clear creation event

      // Statement operations
      const stmtResult = document.createStatementFromString('Test statement');
      expect(stmtResult.isOk()).toBe(true);
      if (stmtResult.isOk()) {
        const statement = stmtResult.value;

        document.updateStatementFromString(statement.getId(), 'Updated statement');

        // AtomicArgument operations
        const argResult = document.createAtomicArgument([statement], []);
        expect(argResult.isOk()).toBe(true);
        if (argResult.isOk()) {
          const argument = argResult.value;

          document.updateAtomicArgument(argument.getId(), [], [statement]);

          const events = document.getUncommittedEvents();
          const eventTypes = events.map((e) => e.eventType);

          expect(eventTypes).toContain('StatementCreated');
          expect(eventTypes).toContain('StatementUpdated');
          expect(eventTypes).toContain('AtomicArgumentCreated');
          expect(eventTypes).toContain('AtomicArgumentUpdated');
        }
      }
    });

    test('provides event data in correct format', () => {
      document.markEventsAsCommitted(); // Clear creation event

      const stmtResult = document.createStatementFromString('Test statement');
      expect(stmtResult.isOk()).toBe(true);
      if (stmtResult.isOk()) {
        const statement = stmtResult.value;

        const events = document.getUncommittedEvents();
        const statementEvent = events.find((e) => e.eventType === 'StatementCreated');

        expect(statementEvent).toBeDefined();
        const queryService = document.createQueryService();
        expect(statementEvent?.aggregateId).toBe(queryService.getId().getValue());
        expect(statementEvent?.aggregateType).toBe('ProofDocument');
        if (statementEvent) {
          const eventData = statementEvent.eventData as {
            statementId: StatementId;
            content: StatementContent;
          };
          expect(eventData.statementId).toBe(statement.getId());
          expect(eventData.content.getValue()).toBe('Test statement');
        }
      }
    });
  });
});

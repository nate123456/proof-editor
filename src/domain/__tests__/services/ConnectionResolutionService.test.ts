import fc from 'fast-check';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AtomicArgument } from '../../entities/AtomicArgument.js';
import { Statement } from '../../entities/Statement.js';
import type { IAtomicArgumentRepository } from '../../repositories/IAtomicArgumentRepository.js';
import type { IStatementRepository } from '../../repositories/IStatementRepository.js';
import { ConnectionResolutionService } from '../../services/ConnectionResolutionService.js';

describe('ConnectionResolutionService', () => {
  let service: ConnectionResolutionService;
  let mockAtomicArgumentRepo: IAtomicArgumentRepository;
  let mockStatementRepo: IStatementRepository;

  beforeEach(() => {
    mockAtomicArgumentRepo = {
      save: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByOrderedSetReference: vi.fn(),
      delete: vi.fn(),
      findArgumentsByPremiseCount: vi.fn(),
      findArgumentsUsingStatement: vi.fn(),
      findArgumentsByComplexity: vi.fn(),
      findArgumentsWithConclusion: vi.fn(),
      findArgumentChains: vi.fn(),
      findCircularDependencies: vi.fn(),
      findArgumentsByValidationStatus: vi.fn(),
      findMostReferencedArguments: vi.fn(),
      findOrphanedArguments: vi.fn(),
    };

    mockStatementRepo = {
      save: vi.fn(),
      findById: vi.fn(),
      findByContent: vi.fn(),
      findAll: vi.fn(),
      delete: vi.fn(),
      findStatementsByPattern: vi.fn(),
      findFrequentlyUsedStatements: vi.fn(),
      findByLogicalStructure: vi.fn(),
      findStatementsByUsageCount: vi.fn(),
      findRelatedStatements: vi.fn(),
      searchStatementsByKeywords: vi.fn(),
      findStatementsInProof: vi.fn(),
      getStatementUsageMetrics: vi.fn(),
      findUnusedStatements: vi.fn(),
    };

    service = new ConnectionResolutionService(mockAtomicArgumentRepo, mockStatementRepo);
  });

  describe('findArgumentsConnectedToPremises', () => {
    it('should find arguments whose conclusions match the given arguments premises', async () => {
      const statement1 = Statement.create('All humans are mortal');
      const statement2 = Statement.create('Socrates is human');
      const statement3 = Statement.create('Therefore, Socrates is mortal');

      if (statement1.isErr() || statement2.isErr() || statement3.isErr()) {
        throw new Error('Failed to create statements');
      }

      const targetArg = AtomicArgument.create(
        [statement1.value, statement2.value],
        [statement3.value],
      );
      const sourceArg = AtomicArgument.create([], [statement1.value]);

      if (targetArg.isErr() || sourceArg.isErr()) {
        throw new Error('Failed to create arguments');
      }

      vi.mocked(mockAtomicArgumentRepo.findArgumentsUsingStatement).mockImplementation(
        async (statementId) => {
          if (statementId.equals(statement1.value.getId())) {
            return [targetArg.value, sourceArg.value];
          }
          if (statementId.equals(statement2.value.getId())) {
            return [targetArg.value];
          }
          return [];
        },
      );

      const result = await service.findArgumentsConnectedToPremises(targetArg.value);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].connectedArgument).toBe(sourceArg.value);
        expect(result.value[0].statement).toBe(statement1.value);
        expect(result.value[0].fromPosition).toBe(0);
        expect(result.value[0].toPosition).toBe(0);
        expect(result.value[0].direction).toBe('incoming');
      }
    });

    it('should return empty array when argument has no premises', async () => {
      const statement = Statement.create('Initial statement');
      if (statement.isErr()) throw new Error('Failed to create statement');

      const arg = AtomicArgument.create([], [statement.value]);
      if (arg.isErr()) throw new Error('Failed to create argument');

      // No need to mock findArgumentsUsingStatement since the argument has no premises
      const result = await service.findArgumentsConnectedToPremises(arg.value);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(0);
      }
    });

    it('should handle multiple connections at different positions', async () => {
      const s1 = Statement.create('P1');
      const s2 = Statement.create('P2');
      const s3 = Statement.create('C1');

      if (s1.isErr() || s2.isErr() || s3.isErr()) {
        throw new Error('Failed to create statements');
      }

      const targetArg = AtomicArgument.create([s1.value, s2.value], [s3.value]);
      const sourceArg1 = AtomicArgument.create([], [s1.value]);
      const sourceArg2 = AtomicArgument.create([], [s2.value]);

      if (targetArg.isErr() || sourceArg1.isErr() || sourceArg2.isErr()) {
        throw new Error('Failed to create arguments');
      }

      vi.mocked(mockAtomicArgumentRepo.findArgumentsUsingStatement).mockImplementation(
        async (statementId) => {
          if (statementId.equals(s1.value.getId())) {
            return [targetArg.value, sourceArg1.value];
          }
          if (statementId.equals(s2.value.getId())) {
            return [targetArg.value, sourceArg2.value];
          }
          return [];
        },
      );

      const result = await service.findArgumentsConnectedToPremises(targetArg.value);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(2);
        const connection1 = result.value.find((c) => c.toPosition === 0);
        const connection2 = result.value.find((c) => c.toPosition === 1);
        expect(connection1?.statement).toBe(s1.value);
        expect(connection2?.statement).toBe(s2.value);
      }
    });
  });

  describe('findArgumentsConnectedToConclusions', () => {
    it('should find arguments whose premises match the given arguments conclusions', async () => {
      const statement1 = Statement.create('All humans are mortal');
      const statement2 = Statement.create('Socrates is human');
      const statement3 = Statement.create('Therefore, Socrates is mortal');

      if (statement1.isErr() || statement2.isErr() || statement3.isErr()) {
        throw new Error('Failed to create statements');
      }

      const sourceArg = AtomicArgument.create(
        [statement1.value, statement2.value],
        [statement3.value],
      );
      const targetArg = AtomicArgument.create([statement3.value], []);

      if (sourceArg.isErr() || targetArg.isErr()) {
        throw new Error('Failed to create arguments');
      }

      vi.mocked(mockAtomicArgumentRepo.findArgumentsUsingStatement).mockImplementation(
        async (statementId) => {
          if (statementId.equals(statement3.value.getId())) {
            return [sourceArg.value, targetArg.value];
          }
          return [];
        },
      );

      const result = await service.findArgumentsConnectedToConclusions(sourceArg.value);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].connectedArgument).toBe(targetArg.value);
        expect(result.value[0].statement).toBe(statement3.value);
        expect(result.value[0].fromPosition).toBe(0);
        expect(result.value[0].toPosition).toBe(0);
        expect(result.value[0].direction).toBe('outgoing');
      }
    });

    it('should return empty array when argument has no conclusions', async () => {
      const statement = Statement.create('Initial statement');
      if (statement.isErr()) throw new Error('Failed to create statement');

      const arg = AtomicArgument.create([statement.value], []);
      if (arg.isErr()) throw new Error('Failed to create argument');

      // No need to mock findArgumentsUsingStatement since the argument has no conclusions
      const result = await service.findArgumentsConnectedToConclusions(arg.value);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(0);
      }
    });
  });

  describe('findAllConnectionsForArgument', () => {
    it('should return both incoming and outgoing connections', async () => {
      const s1 = Statement.create('P1');
      const s2 = Statement.create('C1');
      const s3 = Statement.create('C2');

      if (s1.isErr() || s2.isErr() || s3.isErr()) {
        throw new Error('Failed to create statements');
      }

      const centerArg = AtomicArgument.create([s1.value], [s2.value, s3.value]);
      const sourceArg = AtomicArgument.create([], [s1.value]);
      const targetArg = AtomicArgument.create([s2.value], []);

      if (centerArg.isErr() || sourceArg.isErr() || targetArg.isErr()) {
        throw new Error('Failed to create arguments');
      }

      vi.mocked(mockAtomicArgumentRepo.findArgumentsUsingStatement).mockImplementation(
        async (statementId) => {
          if (statementId.equals(s1.value.getId())) {
            return [centerArg.value, sourceArg.value];
          }
          if (statementId.equals(s2.value.getId())) {
            return [centerArg.value, targetArg.value];
          }
          return [];
        },
      );

      const result = await service.findAllConnectionsForArgument(centerArg.value);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.incomingConnections).toHaveLength(1);
        expect(result.value.outgoingConnections).toHaveLength(1);
        expect(result.value.incomingConnections[0].direction).toBe('incoming');
        expect(result.value.outgoingConnections[0].direction).toBe('outgoing');
      }
    });
  });

  describe('canArgumentsConnect', () => {
    it('should return true when source conclusions match target premises', async () => {
      const sharedStatement = Statement.create('Shared statement');
      if (sharedStatement.isErr()) throw new Error('Failed to create statement');

      const sourceArg = AtomicArgument.create([], [sharedStatement.value]);
      const targetArg = AtomicArgument.create([sharedStatement.value], []);

      if (sourceArg.isErr() || targetArg.isErr()) {
        throw new Error('Failed to create arguments');
      }

      const result = await service.canArgumentsConnect(sourceArg.value, targetArg.value);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(true);
      }
    });

    it('should return false when arguments cannot connect', async () => {
      const s1 = Statement.create('Statement 1');
      const s2 = Statement.create('Statement 2');

      if (s1.isErr() || s2.isErr()) {
        throw new Error('Failed to create statements');
      }

      const sourceArg = AtomicArgument.create([], [s1.value]);
      const targetArg = AtomicArgument.create([s2.value], []);

      if (sourceArg.isErr() || targetArg.isErr()) {
        throw new Error('Failed to create arguments');
      }

      const result = await service.canArgumentsConnect(sourceArg.value, targetArg.value);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(false);
      }
    });

    it('should return false when comparing argument to itself', async () => {
      const arg = AtomicArgument.create([], []);
      if (arg.isErr()) throw new Error('Failed to create argument');

      const result = await service.canArgumentsConnect(arg.value, arg.value);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(false);
      }
    });

    it('should return false when source has no conclusions', async () => {
      const statement = Statement.create('Statement');
      if (statement.isErr()) throw new Error('Failed to create statement');

      const sourceArg = AtomicArgument.create([statement.value], []);
      const targetArg = AtomicArgument.create([statement.value], []);

      if (sourceArg.isErr() || targetArg.isErr()) {
        throw new Error('Failed to create arguments');
      }

      const result = await service.canArgumentsConnect(sourceArg.value, targetArg.value);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(false);
      }
    });

    it('should return false when target has no premises', async () => {
      const statement = Statement.create('Statement');
      if (statement.isErr()) throw new Error('Failed to create statement');

      const sourceArg = AtomicArgument.create([], [statement.value]);
      const targetArg = AtomicArgument.create([], [statement.value]);

      if (sourceArg.isErr() || targetArg.isErr()) {
        throw new Error('Failed to create arguments');
      }

      const result = await service.canArgumentsConnect(sourceArg.value, targetArg.value);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(false);
      }
    });
  });

  describe('findArgumentsConnectedToStatement', () => {
    it('should find all arguments that contain the given statement', async () => {
      const targetStatement = Statement.create('Target statement');
      const otherStatement = Statement.create('Other statement');

      if (targetStatement.isErr() || otherStatement.isErr()) {
        throw new Error('Failed to create statements');
      }

      const arg1 = AtomicArgument.create([targetStatement.value], [otherStatement.value]);
      const arg2 = AtomicArgument.create([otherStatement.value], [targetStatement.value]);
      const arg3 = AtomicArgument.create([otherStatement.value], []);

      if (arg1.isErr() || arg2.isErr() || arg3.isErr()) {
        throw new Error('Failed to create arguments');
      }

      vi.mocked(mockAtomicArgumentRepo.findArgumentsUsingStatement).mockImplementation(
        async (statementId) => {
          if (statementId.equals(targetStatement.value.getId())) {
            return [arg1.value, arg2.value];
          }
          return [];
        },
      );

      const result = await service.findArgumentsConnectedToStatement(targetStatement.value);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(2);
        expect(result.value).toContain(arg1.value);
        expect(result.value).toContain(arg2.value);
        expect(result.value).not.toContain(arg3.value);
      }
    });
  });

  describe('findStatementConnectionsInArgument', () => {
    it('should find all positions where statement appears in argument', async () => {
      const targetStatement = Statement.create('Target statement');
      const otherStatement = Statement.create('Other statement');

      if (targetStatement.isErr() || otherStatement.isErr()) {
        throw new Error('Failed to create statements');
      }

      const arg = AtomicArgument.create(
        [targetStatement.value, otherStatement.value],
        [targetStatement.value],
      );

      if (arg.isErr()) throw new Error('Failed to create argument');

      const result = await service.findStatementConnectionsInArgument(
        arg.value,
        targetStatement.value,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.premisePositions).toEqual([0]);
        expect(result.value.conclusionPositions).toEqual([0]);
      }
    });

    it('should return empty arrays when statement not found', async () => {
      const targetStatement = Statement.create('Target statement');
      const otherStatement = Statement.create('Other statement');

      if (targetStatement.isErr() || otherStatement.isErr()) {
        throw new Error('Failed to create statements');
      }

      const arg = AtomicArgument.create([otherStatement.value], [otherStatement.value]);

      if (arg.isErr()) throw new Error('Failed to create argument');

      const result = await service.findStatementConnectionsInArgument(
        arg.value,
        targetStatement.value,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.premisePositions).toEqual([]);
        expect(result.value.conclusionPositions).toEqual([]);
      }
    });
  });

  describe('validateArgumentConnections', () => {
    it('should validate connections and detect issues', async () => {
      const statement = Statement.create('Statement');
      if (statement.isErr()) throw new Error('Failed to create statement');

      const isolatedArg = AtomicArgument.create([statement.value], [statement.value]);
      if (isolatedArg.isErr()) throw new Error('Failed to create argument');

      vi.mocked(mockAtomicArgumentRepo.findArgumentsUsingStatement).mockImplementation(
        async (statementId) => {
          if (statementId.equals(statement.value.getId())) {
            return [isolatedArg.value];
          }
          return [];
        },
      );

      const result = await service.validateArgumentConnections(isolatedArg.value);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.incomingConnectionCount).toBe(0);
        expect(result.value.outgoingConnectionCount).toBe(0);
        expect(result.value.issues).toHaveLength(1);
        expect(result.value.issues[0].type).toBe('isolated');
        expect(result.value.issues[0].severity).toBe('warning');
        expect(result.value.isValid).toBe(true);
      }
    });

    it('should not flag bootstrap arguments as isolated', async () => {
      const bootstrapArg = AtomicArgument.createBootstrap();
      // Bootstrap arg has no statements, so no mock needed for findArgumentsUsingStatement

      const result = await service.validateArgumentConnections(bootstrapArg);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.issues).toHaveLength(0);
        expect(result.value.isValid).toBe(true);
      }
    });
  });

  describe('property-based testing', () => {
    it('should maintain connection symmetry', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          async (content1, content2) => {
            const s1 = Statement.create(content1);
            const s2 = Statement.create(content2);

            if (s1.isErr() || s2.isErr()) return;

            const arg1 = AtomicArgument.create([], [s1.value]);
            const arg2 = AtomicArgument.create([s1.value], [s2.value]);

            if (arg1.isErr() || arg2.isErr()) return;

            vi.mocked(mockAtomicArgumentRepo.findArgumentsUsingStatement).mockImplementation(
              async (statementId) => {
                if (statementId.equals(s1.value.getId())) {
                  return [arg1.value, arg2.value];
                }
                if (statementId.equals(s2.value.getId())) {
                  return [arg2.value];
                }
                return [];
              },
            );

            const canConnect = await service.canArgumentsConnect(arg1.value, arg2.value);
            const connections = await service.findArgumentsConnectedToConclusions(arg1.value);

            expect(canConnect.isOk()).toBe(true);
            expect(connections.isOk()).toBe(true);

            if (canConnect.isOk() && connections.isOk()) {
              if (canConnect.value) {
                expect(connections.value.length).toBeGreaterThan(0);
              }
            }
          },
        ),
      );
    });
  });
});

import { describe, expect, test } from 'vitest';
import { AtomicArgument } from '../../entities/AtomicArgument.js';
import { Statement } from '../../entities/Statement.js';
import { AtomicArgumentId } from '../../shared/value-objects/index.js';
import { CycleDetectionService } from '../CycleDetectionService.js';

describe('CycleDetectionService', () => {
  test('detects logical cycles in argument connections', () => {
    const service = new CycleDetectionService();

    // Create statements
    const stmt1Result = Statement.create('A');
    const stmt2Result = Statement.create('B');
    const stmt3Result = Statement.create('C');

    expect(stmt1Result.isOk()).toBe(true);
    expect(stmt2Result.isOk()).toBe(true);
    expect(stmt3Result.isOk()).toBe(true);

    if (!stmt1Result.isOk() || !stmt2Result.isOk() || !stmt3Result.isOk()) {
      throw new Error('Failed to create statements');
    }

    const stmt1 = stmt1Result.value;
    const stmt2 = stmt2Result.value;
    const stmt3 = stmt3Result.value;

    // Create arguments that would form a cycle:
    // arg1: [stmt1] -> [stmt2]
    // arg2: [stmt2] -> [stmt3]
    // arg3: [stmt3] -> [stmt1] (closes the cycle)
    const arg1Result = AtomicArgument.create([stmt1], [stmt2]);
    const arg2Result = AtomicArgument.create([stmt2], [stmt3]);
    const arg3Result = AtomicArgument.create([stmt3], [stmt1]);

    expect(arg1Result.isOk()).toBe(true);
    expect(arg2Result.isOk()).toBe(true);
    expect(arg3Result.isOk()).toBe(true);

    if (!arg1Result.isOk() || !arg2Result.isOk() || !arg3Result.isOk()) {
      throw new Error('Failed to create arguments');
    }

    const arg1 = arg1Result.value;
    const arg2 = arg2Result.value;
    const arg3 = arg3Result.value;

    const argumentMap = new Map([
      [arg1.getId().getValue(), arg1],
      [arg2.getId().getValue(), arg2],
      [arg3.getId().getValue(), arg3],
    ]);

    // Check if connecting arg3 to arg1 would create cycle
    const result = service.wouldCreateCycle(arg3, arg1, argumentMap);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.hasCycle).toBe(true);
      expect(result.value.cyclePath).toBeDefined();
      expect(result.value.cyclePath?.length).toBe(3);
      expect(result.value.description).toContain('Logical cycle detected');
    }
  });

  test('does not detect cycle in valid chain', () => {
    const service = new CycleDetectionService();

    // Create statements
    const stmt1Result = Statement.create('P');
    const stmt2Result = Statement.create('Q');
    const stmt3Result = Statement.create('R');

    expect(stmt1Result.isOk()).toBe(true);
    expect(stmt2Result.isOk()).toBe(true);
    expect(stmt3Result.isOk()).toBe(true);

    if (!stmt1Result.isOk() || !stmt2Result.isOk() || !stmt3Result.isOk()) {
      throw new Error('Failed to create statements');
    }

    const stmt1 = stmt1Result.value;
    const stmt2 = stmt2Result.value;
    const stmt3 = stmt3Result.value;

    // Create linear chain: arg1 (P -> Q), arg2 (Q -> R)
    const arg1Result = AtomicArgument.create([stmt1], [stmt2]);
    const arg2Result = AtomicArgument.create([stmt2], [stmt3]);

    expect(arg1Result.isOk()).toBe(true);
    expect(arg2Result.isOk()).toBe(true);

    if (!arg1Result.isOk() || !arg2Result.isOk()) {
      throw new Error('Failed to create arguments');
    }

    const arg1 = arg1Result.value;
    const arg2 = arg2Result.value;

    const argumentMap = new Map([
      [arg1.getId().getValue(), arg1],
      [arg2.getId().getValue(), arg2],
    ]);

    // Check if connecting arg1 to arg2 would create cycle (it shouldn't)
    const result = service.wouldCreateCycle(arg1, arg2, argumentMap);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.hasCycle).toBe(false);
      expect(result.value.cyclePath).toBeUndefined();
      expect(result.value.description).toBeUndefined();
    }
  });

  test('finds all cycles in argument graph', () => {
    const service = new CycleDetectionService();

    // Create statements for cycle
    const stmt1Result = Statement.create('X');
    const stmt2Result = Statement.create('Y');

    expect(stmt1Result.isOk()).toBe(true);
    expect(stmt2Result.isOk()).toBe(true);

    if (!stmt1Result.isOk() || !stmt2Result.isOk()) {
      throw new Error('Failed to create statements');
    }

    const stmt1 = stmt1Result.value;
    const stmt2 = stmt2Result.value;

    // Create cycle: arg1 (X -> Y), arg2 (Y -> X)
    const arg1Result = AtomicArgument.create([stmt1], [stmt2]);
    const arg2Result = AtomicArgument.create([stmt2], [stmt1]);

    expect(arg1Result.isOk()).toBe(true);
    expect(arg2Result.isOk()).toBe(true);

    if (!arg1Result.isOk() || !arg2Result.isOk()) {
      throw new Error('Failed to create arguments');
    }

    const arg1 = arg1Result.value;
    const arg2 = arg2Result.value;

    const argumentMap = new Map([
      [arg1.getId().getValue(), arg1],
      [arg2.getId().getValue(), arg2],
    ]);

    const cycles = service.findAllCycles(argumentMap);

    expect(cycles.isOk()).toBe(true);
    if (cycles.isOk()) {
      expect(cycles.value.length).toBeGreaterThan(0);
      if (cycles.value[0]) {
        expect(cycles.value[0].argumentIds.length).toBe(2);
        expect(cycles.value[0].sharedStatements).toBeDefined();
        expect(cycles.value[0].sharedStatements.length).toBeGreaterThan(0);
      }
    }
  });

  test('analyzes cycle severity correctly', () => {
    const service = new CycleDetectionService();

    // Create statements
    const stmt1Result = Statement.create('Definition A');
    const stmt2Result = Statement.create('Definition B');

    expect(stmt1Result.isOk()).toBe(true);
    expect(stmt2Result.isOk()).toBe(true);

    if (!stmt1Result.isOk() || !stmt2Result.isOk()) {
      throw new Error('Failed to create statements');
    }

    const stmt1 = stmt1Result.value;
    const stmt2 = stmt2Result.value;

    // Create definitional arguments (no premises - bootstrap style)
    const arg1Result = AtomicArgument.create([], [stmt1]);
    const arg2Result = AtomicArgument.create([], [stmt2]);

    expect(arg1Result.isOk()).toBe(true);
    expect(arg2Result.isOk()).toBe(true);

    if (!arg1Result.isOk() || !arg2Result.isOk()) {
      throw new Error('Failed to create arguments');
    }

    const arg1 = arg1Result.value;
    const arg2 = arg2Result.value;

    const cycle = {
      argumentIds: [arg1.getId(), arg2.getId()],
      length: 2,
      sharedStatements: [stmt1.getId(), stmt2.getId()],
    };

    const argumentMap = new Map([
      [arg1.getId().getValue(), arg1],
      [arg2.getId().getValue(), arg2],
    ]);

    const severity = service.analyzeCycleSeverity(cycle, argumentMap);

    expect(severity.severity).toBe('low');
    expect(severity.isAcceptable).toBe(true);
    expect(severity.reason).toContain('definitional');
  });

  test('identifies high severity cycles with deductive arguments', () => {
    const service = new CycleDetectionService();

    // Create statements
    const stmt1Result = Statement.create('P');
    const stmt2Result = Statement.create('Q');
    const stmt3Result = Statement.create('R');

    expect(stmt1Result.isOk()).toBe(true);
    expect(stmt2Result.isOk()).toBe(true);
    expect(stmt3Result.isOk()).toBe(true);

    if (!stmt1Result.isOk() || !stmt2Result.isOk() || !stmt3Result.isOk()) {
      throw new Error('Failed to create statements');
    }

    const stmt1 = stmt1Result.value;
    const stmt2 = stmt2Result.value;
    const _stmt3 = stmt3Result.value;

    // Create deductive arguments (have premises)
    const arg1Result = AtomicArgument.create([stmt1], [stmt2]);
    const arg2Result = AtomicArgument.create([stmt2], [stmt1]);

    expect(arg1Result.isOk()).toBe(true);
    expect(arg2Result.isOk()).toBe(true);

    if (!arg1Result.isOk() || !arg2Result.isOk()) {
      throw new Error('Failed to create arguments');
    }

    const arg1 = arg1Result.value;
    const arg2 = arg2Result.value;

    const cycle = {
      argumentIds: [arg1.getId(), arg2.getId()],
      length: 2,
      sharedStatements: [stmt1.getId(), stmt2.getId()],
    };

    const argumentMap = new Map([
      [arg1.getId().getValue(), arg1],
      [arg2.getId().getValue(), arg2],
    ]);

    const severity = service.analyzeCycleSeverity(cycle, argumentMap);

    expect(severity.severity).toBe('high');
    expect(severity.isAcceptable).toBe(false);
    expect(severity.reason).toContain('Circular logical dependencies');
  });

  test('handles empty argument map', () => {
    const service = new CycleDetectionService();

    const cycles = service.findAllCycles(new Map());

    expect(cycles.isOk()).toBe(true);
    if (cycles.isOk()) {
      expect(cycles.value).toHaveLength(0);
    }
  });

  test('handles arguments without connections', () => {
    const service = new CycleDetectionService();

    // Create isolated arguments
    const arg1Result = AtomicArgument.create();
    const arg2Result = AtomicArgument.create();

    expect(arg1Result.isOk()).toBe(true);
    expect(arg2Result.isOk()).toBe(true);

    if (!arg1Result.isOk() || !arg2Result.isOk()) {
      throw new Error('Failed to create arguments');
    }

    const arg1 = arg1Result.value;
    const arg2 = arg2Result.value;

    const argumentMap = new Map([
      [arg1.getId().getValue(), arg1],
      [arg2.getId().getValue(), arg2],
    ]);

    const cycles = service.findAllCycles(argumentMap);

    expect(cycles.isOk()).toBe(true);
    if (cycles.isOk()) {
      expect(cycles.value).toHaveLength(0);
    }
  });

  test('wouldCreateCycle handles early path termination', () => {
    const service = new CycleDetectionService();

    // Create statements
    const stmt1Result = Statement.create('A');
    const stmt2Result = Statement.create('B');

    expect(stmt1Result.isOk() && stmt2Result.isOk()).toBe(true);

    if (stmt1Result.isOk() && stmt2Result.isOk()) {
      const stmt1 = stmt1Result.value;
      const stmt2 = stmt2Result.value;

      // Create arguments that don't form a cycle
      const arg1Result = AtomicArgument.create([stmt1], [stmt2]);
      const arg2Result = AtomicArgument.create([stmt2], []); // Only has premise

      expect(arg1Result.isOk()).toBe(true);
      expect(arg2Result.isOk()).toBe(true);

      if (arg1Result.isOk() && arg2Result.isOk()) {
        const arg1 = arg1Result.value;
        const arg2 = arg2Result.value;

        const argumentMap = new Map([
          [arg1.getId().getValue(), arg1],
          [arg2.getId().getValue(), arg2],
        ]);

        const result = service.wouldCreateCycle(arg1, arg2, argumentMap);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.hasCycle).toBe(false);
        }
      }
    }
  });

  test('wouldCreateCycle handles visited node prevention', () => {
    const service = new CycleDetectionService();

    // Create statements for diamond pattern
    const stmt1Result = Statement.create('Statement A');
    const stmt2Result = Statement.create('Statement B');
    const stmt3Result = Statement.create('Statement C');
    const stmt4Result = Statement.create('Statement D');

    expect(stmt1Result.isOk()).toBe(true);
    expect(stmt2Result.isOk()).toBe(true);
    expect(stmt3Result.isOk()).toBe(true);
    expect(stmt4Result.isOk()).toBe(true);

    if (!stmt1Result.isOk() || !stmt2Result.isOk() || !stmt3Result.isOk() || !stmt4Result.isOk()) {
      throw new Error('Failed to create statements');
    }

    const stmt1 = stmt1Result.value;
    const stmt2 = stmt2Result.value;
    const stmt3 = stmt3Result.value;
    const stmt4 = stmt4Result.value;

    // Create diamond pattern: A->B, A->C, B->D, C->D
    const argABResult = AtomicArgument.create([stmt1], [stmt2]);
    const argACResult = AtomicArgument.create([stmt1], [stmt3]);
    const argBDResult = AtomicArgument.create([stmt2], [stmt4]);
    const argCDResult = AtomicArgument.create([stmt3], [stmt4]);

    expect(argABResult.isOk()).toBe(true);
    expect(argACResult.isOk()).toBe(true);
    expect(argBDResult.isOk()).toBe(true);
    expect(argCDResult.isOk()).toBe(true);

    if (!argABResult.isOk() || !argACResult.isOk() || !argBDResult.isOk() || !argCDResult.isOk()) {
      throw new Error('Failed to create arguments');
    }

    const argAB = argABResult.value;
    const argAC = argACResult.value;
    const argBD = argBDResult.value;
    const argCD = argCDResult.value;

    const _argumentMap = new Map([
      [argAB.getId().getValue(), argAB],
      [argAC.getId().getValue(), argAC],
      [argBD.getId().getValue(), argBD],
      [argCD.getId().getValue(), argCD],
    ]);

    // Test connecting D back to A, then checking if A->B would create a cycle
    // First add D->A to the argument map
    const argDAResult = AtomicArgument.create([stmt4], [stmt1]);
    expect(argDAResult.isOk()).toBe(true);
    if (!argDAResult.isOk()) return;
    const argDA = argDAResult.value;

    const extendedArgumentMap = new Map([
      [argAB.getId().getValue(), argAB],
      [argAC.getId().getValue(), argAC],
      [argBD.getId().getValue(), argBD],
      [argCD.getId().getValue(), argCD],
      [argDA.getId().getValue(), argDA],
    ]);

    // Now test if connecting A->B would create a cycle (it should, since D->A->B->D)
    const result = service.wouldCreateCycle(argAB, argBD, extendedArgumentMap);

    // This creates a cycle: A->B->D->A
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.hasCycle).toBe(true);
    }
  });

  test('findAllCycles handles invalid AtomicArgumentId creation', () => {
    const service = new CycleDetectionService();

    // Create a mock argument that would cause AtomicArgumentId.create() to fail
    const mockArgument = {
      getId: () => ({ getValue: () => 'invalid-id-format' }),
      getPremises: () => [],
      getConclusions: () => [],
    } as unknown as AtomicArgument;

    const argumentMap = new Map([['invalid-id-format', mockArgument]]);

    // Should handle invalid ID gracefully
    const cycles = service.findAllCycles(argumentMap);

    expect(cycles.isOk()).toBe(true);
    if (cycles.isOk()) {
      expect(cycles.value).toHaveLength(0);
    }
  });

  test('findAllCycles handles undefined lowlinks and indices', () => {
    const service = new CycleDetectionService();

    // Create valid arguments to trigger Tarjan's algorithm
    const stmt1Result = Statement.create('Test 1');
    const stmt2Result = Statement.create('Test 2');

    expect(stmt1Result.isOk() && stmt2Result.isOk()).toBe(true);

    if (stmt1Result.isOk() && stmt2Result.isOk()) {
      const stmt1 = stmt1Result.value;
      const stmt2 = stmt2Result.value;

      // Create arguments that form a strongly connected component
      const arg1Result = AtomicArgument.create([stmt1], [stmt2]);
      const arg2Result = AtomicArgument.create([stmt2], [stmt1]);

      expect(arg1Result.isOk() && arg2Result.isOk()).toBe(true);

      if (arg1Result.isOk() && arg2Result.isOk()) {
        const arg1 = arg1Result.value;
        const arg2 = arg2Result.value;

        const argumentMap = new Map([
          [arg1.getId().getValue(), arg1],
          [arg2.getId().getValue(), arg2],
        ]);

        const cycles = service.findAllCycles(argumentMap);

        expect(cycles.isOk()).toBe(true);
        if (cycles.isOk()) {
          expect(cycles.value.length).toBeGreaterThan(0);
          expect(cycles.value[0]?.argumentIds.length).toBe(2);
        }
      }
    }
  });

  test('analyzeCycleSeverity handles missing arguments in cycle', () => {
    const service = new CycleDetectionService();

    // Create cycle with argument ID that doesn't exist in map
    const validArgResult = AtomicArgument.create();
    expect(validArgResult.isOk()).toBe(true);

    if (validArgResult.isOk()) {
      const validArg = validArgResult.value;
      const nonExistentId = AtomicArgumentId.generate();

      const cycle = {
        argumentIds: [validArg.getId(), nonExistentId],
        length: 2,
        sharedStatements: [],
      };

      const argumentMap = new Map([
        [validArg.getId().getValue(), validArg],
        // nonExistentId not in map
      ]);

      const severity = service.analyzeCycleSeverity(cycle, argumentMap);

      // Should handle missing argument gracefully
      expect(severity.severity).toBeDefined();
      expect(severity.isAcceptable).toBeDefined();
      expect(severity.reason).toBeDefined();
    }
  });

  test('analyzeCycleSeverity handles mixed definitional and deductive arguments', () => {
    const service = new CycleDetectionService();

    // Create one definitional argument (no premises) and one deductive (has premises)
    const stmt1Result = Statement.create('Definition');
    const stmt2Result = Statement.create('Premise');
    const stmt3Result = Statement.create('Conclusion');

    expect(stmt1Result.isOk() && stmt2Result.isOk() && stmt3Result.isOk()).toBe(true);

    if (stmt1Result.isOk() && stmt2Result.isOk() && stmt3Result.isOk()) {
      const stmt1 = stmt1Result.value;
      const stmt2 = stmt2Result.value;
      const stmt3 = stmt3Result.value;

      // Create mixed arguments: one definitional, one deductive
      const definitionalArgResult = AtomicArgument.create([], [stmt1]);
      const deductiveArgResult = AtomicArgument.create([stmt2], [stmt3]);

      expect(definitionalArgResult.isOk() && deductiveArgResult.isOk()).toBe(true);

      if (definitionalArgResult.isOk() && deductiveArgResult.isOk()) {
        const definitionalArg = definitionalArgResult.value;
        const deductiveArg = deductiveArgResult.value;

        const cycle = {
          argumentIds: [definitionalArg.getId(), deductiveArg.getId()],
          length: 2,
          sharedStatements: [],
        };

        const argumentMap = new Map([
          [definitionalArg.getId().getValue(), definitionalArg],
          [deductiveArg.getId().getValue(), deductiveArg],
        ]);

        const severity = service.analyzeCycleSeverity(cycle, argumentMap);

        // Mixed cycles should be high severity
        expect(severity.severity).toBe('high');
        expect(severity.isAcceptable).toBe(false);
        expect(severity.reason).toContain('Circular logical dependencies');
      }
    }
  });

  test('findSharedSetsInCycle handles missing arguments', () => {
    const service = new CycleDetectionService();

    // Create cycle with non-existent argument IDs
    const nonExistentId1 = AtomicArgumentId.generate();
    const nonExistentId2 = AtomicArgumentId.generate();

    const cycleArgs = [nonExistentId1, nonExistentId2];
    const argumentMap = new Map(); // Empty map

    // Access private method via casting (for testing purposes)
    const sharedSets = (service as any).findSharedSetsInCycle(cycleArgs, argumentMap);

    expect(sharedSets).toHaveLength(0);
  });

  test('buildLogicalDependencyGraph handles various argument configurations', () => {
    const service = new CycleDetectionService();

    // Create arguments with different configurations
    const stmt1Result = Statement.create('Test');
    expect(stmt1Result.isOk()).toBe(true);

    if (stmt1Result.isOk()) {
      const stmt1 = stmt1Result.value;
      // Create arguments: one with no premise, one with premise
      const argNoPremiseResult = AtomicArgument.create([], [stmt1]);
      const argWithPremiseResult = AtomicArgument.create([stmt1], []);

      expect(argNoPremiseResult.isOk() && argWithPremiseResult.isOk()).toBe(true);

      if (argNoPremiseResult.isOk() && argWithPremiseResult.isOk()) {
        const argNoPremise = argNoPremiseResult.value;
        const argWithPremise = argWithPremiseResult.value;

        const argumentMap = new Map([
          [argNoPremise.getId().getValue(), argNoPremise],
          [argWithPremise.getId().getValue(), argWithPremise],
        ]);

        // Access private method for testing
        const graph = (service as any).buildLogicalDependencyGraph(argumentMap);

        expect(graph).toBeInstanceOf(Map);
        expect(graph.size).toBe(2);

        // Argument without premise should have no dependencies
        const noPremiseDeps = graph.get(argNoPremise.getId().getValue());
        expect(noPremiseDeps).toEqual([]);

        // Argument with premise should have dependencies
        const withPremiseDeps = graph.get(argWithPremise.getId().getValue());
        expect(withPremiseDeps).toBeDefined();
      }
    }
  });
});

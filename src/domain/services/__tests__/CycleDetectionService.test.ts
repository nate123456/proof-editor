import { describe, expect, test } from 'vitest';
import { AtomicArgument } from '../../entities/AtomicArgument.js';
import { OrderedSet } from '../../entities/OrderedSet.js';
import { Statement } from '../../entities/Statement.js';
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

    // Create shared OrderedSets for connections
    const set1Result = OrderedSet.create([stmt1.getId()]);
    const set2Result = OrderedSet.create([stmt2.getId()]);
    const set3Result = OrderedSet.create([stmt3.getId()]);

    expect(set1Result.isOk()).toBe(true);
    expect(set2Result.isOk()).toBe(true);
    expect(set3Result.isOk()).toBe(true);

    if (!set1Result.isOk() || !set2Result.isOk() || !set3Result.isOk()) {
      throw new Error('Failed to create ordered sets');
    }

    const set1 = set1Result.value;
    const set2 = set2Result.value;
    const set3 = set3Result.value;

    // Create arguments that would form a cycle:
    // arg1: set1 -> set2
    // arg2: set2 -> set3
    // arg3: set3 -> set1 (closes the cycle)
    const arg1 = AtomicArgument.createComplete(set1.getId(), set2.getId());
    const arg2 = AtomicArgument.createComplete(set2.getId(), set3.getId());
    const arg3 = AtomicArgument.createComplete(set3.getId(), set1.getId());

    const argumentMap = new Map([
      [arg1.getId().getValue(), arg1],
      [arg2.getId().getValue(), arg2],
      [arg3.getId().getValue(), arg3],
    ]);

    // Check if connecting arg3 to arg1 would create cycle
    const result = service.wouldCreateCycle(arg3, arg1, argumentMap);

    expect(result.hasCycle).toBe(true);
    expect(result.cyclePath).toBeDefined();
    expect(result.cyclePath?.length).toBe(3);
    expect(result.description).toContain('Logical cycle detected');
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

    // Create OrderedSets for linear chain
    const set1Result = OrderedSet.create([stmt1.getId()]);
    const set2Result = OrderedSet.create([stmt2.getId()]);
    const set3Result = OrderedSet.create([stmt3.getId()]);

    expect(set1Result.isOk()).toBe(true);
    expect(set2Result.isOk()).toBe(true);
    expect(set3Result.isOk()).toBe(true);

    if (!set1Result.isOk() || !set2Result.isOk() || !set3Result.isOk()) {
      throw new Error('Failed to create ordered sets');
    }

    const set1 = set1Result.value;
    const set2 = set2Result.value;
    const set3 = set3Result.value;

    // Create linear chain: arg1 (P -> Q), arg2 (Q -> R)
    const arg1 = AtomicArgument.createComplete(set1.getId(), set2.getId());
    const arg2 = AtomicArgument.createComplete(set2.getId(), set3.getId());

    const argumentMap = new Map([
      [arg1.getId().getValue(), arg1],
      [arg2.getId().getValue(), arg2],
    ]);

    // Check if connecting arg1 to arg2 would create cycle (it shouldn't)
    const result = service.wouldCreateCycle(arg1, arg2, argumentMap);

    expect(result.hasCycle).toBe(false);
    expect(result.cyclePath).toBeUndefined();
    expect(result.description).toBeUndefined();
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

    // Create sets for simple cycle
    const setXResult = OrderedSet.create([stmt1.getId()]);
    const setYResult = OrderedSet.create([stmt2.getId()]);

    expect(setXResult.isOk()).toBe(true);
    expect(setYResult.isOk()).toBe(true);

    if (!setXResult.isOk() || !setYResult.isOk()) {
      throw new Error('Failed to create ordered sets');
    }

    const setX = setXResult.value;
    const setY = setYResult.value;

    // Create cycle: arg1 (X -> Y), arg2 (Y -> X)
    const arg1 = AtomicArgument.createComplete(setX.getId(), setY.getId());
    const arg2 = AtomicArgument.createComplete(setY.getId(), setX.getId());

    const argumentMap = new Map([
      [arg1.getId().getValue(), arg1],
      [arg2.getId().getValue(), arg2],
    ]);

    const cycles = service.findAllCycles(argumentMap);

    expect(cycles.length).toBeGreaterThan(0);
    if (cycles[0]) {
      expect(cycles[0].argumentIds.length).toBe(2);
      expect(cycles[0].sharedOrderedSets).toBeDefined();
      expect(cycles[0].sharedOrderedSets.length).toBeGreaterThan(0);
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

    // Create sets
    const set1Result = OrderedSet.create([stmt1.getId()]);
    const set2Result = OrderedSet.create([stmt2.getId()]);

    expect(set1Result.isOk()).toBe(true);
    expect(set2Result.isOk()).toBe(true);

    if (!set1Result.isOk() || !set2Result.isOk()) {
      throw new Error('Failed to create ordered sets');
    }

    const set1 = set1Result.value;
    const set2 = set2Result.value;

    // Create definitional arguments (no premises - bootstrap style)
    const arg1Result = AtomicArgument.create(undefined, set1.getId());
    const arg2Result = AtomicArgument.create(undefined, set2.getId());

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
      sharedOrderedSets: [set1.getId(), set2.getId()],
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
    const stmt3 = stmt3Result.value;

    // Create sets
    const set1Result = OrderedSet.create([stmt1.getId()]);
    const set2Result = OrderedSet.create([stmt2.getId()]);
    const set3Result = OrderedSet.create([stmt3.getId()]);

    expect(set1Result.isOk()).toBe(true);
    expect(set2Result.isOk()).toBe(true);
    expect(set3Result.isOk()).toBe(true);

    if (!set1Result.isOk() || !set2Result.isOk() || !set3Result.isOk()) {
      throw new Error('Failed to create ordered sets');
    }

    const set1 = set1Result.value;
    const set2 = set2Result.value;
    const _set3 = set3Result.value;

    // Create deductive arguments (have premises)
    const arg1 = AtomicArgument.createComplete(set1.getId(), set2.getId());
    const arg2 = AtomicArgument.createComplete(set2.getId(), set1.getId());

    const cycle = {
      argumentIds: [arg1.getId(), arg2.getId()],
      length: 2,
      sharedOrderedSets: [set1.getId(), set2.getId()],
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

    expect(cycles).toHaveLength(0);
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

    expect(cycles).toHaveLength(0);
  });
});

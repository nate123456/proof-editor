import { describe, expect, test } from 'vitest';
import { AtomicArgument } from '../../entities/AtomicArgument.js';
import { OrderedSet } from '../../entities/OrderedSet.js';
import { Statement } from '../../entities/Statement.js';
import { OrderedSetIdentityService } from '../OrderedSetIdentityService.js';

describe('OrderedSetIdentityService', () => {
  test('finds direct connections via shared OrderedSet identity', () => {
    const service = new OrderedSetIdentityService();

    // Create statements
    const stmt1Result = Statement.create('All men are mortal');
    const stmt2Result = Statement.create('Socrates is a man');
    const stmt3Result = Statement.create('Socrates is mortal');

    expect(stmt1Result.isOk()).toBe(true);
    expect(stmt2Result.isOk()).toBe(true);
    expect(stmt3Result.isOk()).toBe(true);

    if (!stmt1Result.isOk() || !stmt2Result.isOk() || !stmt3Result.isOk()) {
      throw new Error('Failed to create statements');
    }

    const stmt1 = stmt1Result.value;
    const stmt2 = stmt2Result.value;
    const stmt3 = stmt3Result.value;

    // Create shared OrderedSet
    const premiseSetResult = OrderedSet.create([stmt1.getId(), stmt2.getId()]);
    const conclusionSetResult = OrderedSet.create([stmt3.getId()]);

    expect(premiseSetResult.isOk()).toBe(true);
    expect(conclusionSetResult.isOk()).toBe(true);

    if (!premiseSetResult.isOk() || !conclusionSetResult.isOk()) {
      throw new Error('Failed to create ordered sets');
    }

    const premiseSet = premiseSetResult.value;
    const conclusionSet = conclusionSetResult.value;

    // Two arguments sharing the set: arg1 produces conclusionSet, arg2 consumes it
    const arg1 = AtomicArgument.createComplete(premiseSet.getId(), conclusionSet.getId());
    const arg2Result = AtomicArgument.create(conclusionSet.getId()); // Uses conclusionSet as premise

    expect(arg2Result.isOk()).toBe(true);
    if (!arg2Result.isOk()) {
      throw new Error('Failed to create arg2');
    }
    const arg2 = arg2Result.value;

    const connections = service.findPotentialConnections(
      new Map([
        [arg1.getId().getValue(), arg1],
        [arg2.getId().getValue(), arg2],
      ]),
    );

    expect(connections).toHaveLength(1);
    expect(connections[0]?.sharedSetId.equals(conclusionSet.getId())).toBe(true);
    expect(connections[0]?.connectionType).toBe('direct');
    expect(connections[0]?.providerId.equals(arg1.getId())).toBe(true);
    expect(connections[0]?.consumerId.equals(arg2.getId())).toBe(true);
  });

  test('finds no connections when OrderedSets are different objects', () => {
    const service = new OrderedSetIdentityService();

    // Create statements
    const stmt1Result = Statement.create('P');
    const stmt2Result = Statement.create('Q');

    expect(stmt1Result.isOk()).toBe(true);
    expect(stmt2Result.isOk()).toBe(true);

    if (!stmt1Result.isOk() || !stmt2Result.isOk()) {
      throw new Error('Failed to create statements');
    }

    const stmt1 = stmt1Result.value;
    const stmt2 = stmt2Result.value;

    // Create separate OrderedSets with same content
    const set1Result = OrderedSet.create([stmt1.getId()]);
    const set2Result = OrderedSet.create([stmt1.getId()]); // Same content, different object
    const set3Result = OrderedSet.create([stmt2.getId()]);

    expect(set1Result.isOk()).toBe(true);
    expect(set2Result.isOk()).toBe(true);
    expect(set3Result.isOk()).toBe(true);

    if (!set1Result.isOk() || !set2Result.isOk() || !set3Result.isOk()) {
      throw new Error('Failed to create ordered sets');
    }

    const set1 = set1Result.value;
    const set2 = set2Result.value;
    const set3 = set3Result.value;

    // Arguments with different object references
    const arg1 = AtomicArgument.createComplete(set1.getId(), set3.getId());
    const arg2Result = AtomicArgument.create(set2.getId()); // Different object than set1

    expect(arg2Result.isOk()).toBe(true);
    if (!arg2Result.isOk()) {
      throw new Error('Failed to create arg2');
    }
    const arg2 = arg2Result.value;

    const connections = service.findPotentialConnections(
      new Map([
        [arg1.getId().getValue(), arg1],
        [arg2.getId().getValue(), arg2],
      ]),
    );

    expect(connections).toHaveLength(0);
  });

  test('analyzes connection paths through shared OrderedSets', () => {
    const service = new OrderedSetIdentityService();

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

    // Create shared OrderedSets for chain A -> B -> C
    const setAResult = OrderedSet.create([stmt1.getId()]);
    const setBResult = OrderedSet.create([stmt2.getId()]);
    const setCResult = OrderedSet.create([stmt3.getId()]);

    expect(setAResult.isOk()).toBe(true);
    expect(setBResult.isOk()).toBe(true);
    expect(setCResult.isOk()).toBe(true);

    if (!setAResult.isOk() || !setBResult.isOk() || !setCResult.isOk()) {
      throw new Error('Failed to create ordered sets');
    }

    const setA = setAResult.value;
    const setB = setBResult.value;
    const setC = setCResult.value;

    // Create chain: arg1 (A -> B), arg2 (B -> C)
    const arg1 = AtomicArgument.createComplete(setA.getId(), setB.getId());
    const arg2 = AtomicArgument.createComplete(setB.getId(), setC.getId()); // Shares setB with arg1

    const argumentMap = new Map([
      [arg1.getId().getValue(), arg1],
      [arg2.getId().getValue(), arg2],
    ]);

    const paths = service.analyzeConnectionPaths(argumentMap, arg1.getId());

    expect(paths).toHaveLength(1);
    expect(paths[0]?.steps).toHaveLength(2);
    expect(paths[0]?.steps[0]?.equals(arg1.getId())).toBe(true);
    expect(paths[0]?.steps[1]?.equals(arg2.getId())).toBe(true);
    expect(paths[0]?.sharedSets).toHaveLength(1);
    expect(paths[0]?.sharedSets[0]?.equals(setB.getId())).toBe(true);
  });

  test('analyzes similarity between OrderedSets', () => {
    const service = new OrderedSetIdentityService();

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

    // Create sets with partial overlap
    const set1Result = OrderedSet.create([stmt1.getId(), stmt2.getId()]);
    const set2Result = OrderedSet.create([stmt2.getId(), stmt3.getId()]);

    expect(set1Result.isOk()).toBe(true);
    expect(set2Result.isOk()).toBe(true);

    if (!set1Result.isOk() || !set2Result.isOk()) {
      throw new Error('Failed to create ordered sets');
    }

    const set1 = set1Result.value;
    const set2 = set2Result.value;

    const similarity = service.analyzeSimilarity(set1, set2);

    expect(similarity.sharedStatements).toBe(1); // stmt2
    expect(similarity.totalStatements).toBe(3); // stmt1, stmt2, stmt3
    expect(similarity.jaccardIndex).toBe(1 / 3); // 1 shared / 3 total
    expect(similarity.isIdentical).toBe(false); // Different objects
  });

  test('identifies identical OrderedSets correctly', () => {
    const service = new OrderedSetIdentityService();

    // Create statement
    const stmtResult = Statement.create('Test statement');

    expect(stmtResult.isOk()).toBe(true);
    if (!stmtResult.isOk()) {
      throw new Error('Failed to create statement');
    }
    const stmt = stmtResult.value;

    // Create OrderedSet
    const setResult = OrderedSet.create([stmt.getId()]);
    expect(setResult.isOk()).toBe(true);
    if (!setResult.isOk()) {
      throw new Error('Failed to create ordered set');
    }
    const set = setResult.value;

    // Same object reference
    const similarity = service.analyzeSimilarity(set, set);

    expect(similarity.sharedStatements).toBe(1);
    expect(similarity.totalStatements).toBe(1);
    expect(similarity.jaccardIndex).toBe(1.0);
    expect(similarity.isIdentical).toBe(true); // Same object
  });

  test('handles empty arguments gracefully', () => {
    const service = new OrderedSetIdentityService();

    // Create arguments without premises or conclusions
    const arg1Result = AtomicArgument.create();
    const arg2Result = AtomicArgument.create();

    expect(arg1Result.isOk()).toBe(true);
    expect(arg2Result.isOk()).toBe(true);

    if (!arg1Result.isOk() || !arg2Result.isOk()) {
      throw new Error('Failed to create arguments');
    }

    const arg1 = arg1Result.value;
    const arg2 = arg2Result.value;

    const connections = service.findPotentialConnections(
      new Map([
        [arg1.getId().getValue(), arg1],
        [arg2.getId().getValue(), arg2],
      ]),
    );

    expect(connections).toHaveLength(0);
  });
});

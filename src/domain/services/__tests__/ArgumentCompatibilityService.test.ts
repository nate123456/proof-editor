import { describe, expect, test } from 'vitest';
import { AtomicArgument } from '../../entities/AtomicArgument.js';
import { OrderedSet } from '../../entities/OrderedSet.js';
import { Statement } from '../../entities/Statement.js';
import { ArgumentCompatibilityService } from '../ArgumentCompatibilityService.js';

describe('ArgumentCompatibilityService', () => {
  test('identifies identity connection between arguments', () => {
    const service = new ArgumentCompatibilityService();

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
    const sharedSetResult = OrderedSet.create([stmt3.getId()]);
    const premiseSetResult = OrderedSet.create([stmt1.getId(), stmt2.getId()]);

    expect(sharedSetResult.isOk()).toBe(true);
    expect(premiseSetResult.isOk()).toBe(true);

    if (!sharedSetResult.isOk() || !premiseSetResult.isOk()) {
      throw new Error('Failed to create ordered sets');
    }

    const sharedSet = sharedSetResult.value;
    const premiseSet = premiseSetResult.value;

    // Provider produces sharedSet, consumer uses sharedSet as premise
    const provider = AtomicArgument.createComplete(premiseSet.getId(), sharedSet.getId());
    const consumerResult = AtomicArgument.create(sharedSet.getId());

    expect(consumerResult.isOk()).toBe(true);
    if (!consumerResult.isOk()) {
      throw new Error('Failed to create consumer');
    }
    const consumer = consumerResult.value;

    const orderedSets = new Map<string, OrderedSet>([
      [sharedSet.getId().getValue(), sharedSet],
      [premiseSet.getId().getValue(), premiseSet],
    ]);

    const compatibility = service.canConnect(provider, consumer, orderedSets);

    expect(compatibility.isCompatible).toBe(true);
    expect(compatibility.connectionType).toBe('identity');
    expect(compatibility.compatibilityScore).toBe(1.0);
    expect(compatibility.sharedOrderedSetId?.equals(sharedSet.getId())).toBe(true);
  });

  test('identifies partial connection based on statement overlap', () => {
    const service = new ArgumentCompatibilityService();

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
    const providerConclusionResult = OrderedSet.create([stmt1.getId(), stmt2.getId()]);
    const consumerPremiseResult = OrderedSet.create([stmt2.getId(), stmt3.getId()]);
    const providerPremiseResult = OrderedSet.create([stmt3.getId()]);

    expect(providerConclusionResult.isOk()).toBe(true);
    expect(consumerPremiseResult.isOk()).toBe(true);
    expect(providerPremiseResult.isOk()).toBe(true);

    if (
      !providerConclusionResult.isOk() ||
      !consumerPremiseResult.isOk() ||
      !providerPremiseResult.isOk()
    ) {
      throw new Error('Failed to create ordered sets');
    }

    const providerConclusion = providerConclusionResult.value;
    const consumerPremise = consumerPremiseResult.value;
    const providerPremise = providerPremiseResult.value;

    const provider = AtomicArgument.createComplete(
      providerPremise.getId(),
      providerConclusion.getId(),
    );
    const consumer = AtomicArgument.createComplete(
      consumerPremise.getId(),
      providerPremise.getId(),
    );

    const orderedSets = new Map<string, OrderedSet>([
      [providerConclusion.getId().getValue(), providerConclusion],
      [consumerPremise.getId().getValue(), consumerPremise],
      [providerPremise.getId().getValue(), providerPremise],
    ]);

    const compatibility = service.canConnect(provider, consumer, orderedSets);

    expect(compatibility.isCompatible).toBe(true);
    expect(compatibility.connectionType).toBe('partial');
    expect(compatibility.compatibilityScore).toBe(0.5); // 1 shared / 2 max
    expect(compatibility.overlapStatements?.length).toBe(1);
  });

  test('rejects connection when provider has no conclusions', () => {
    const service = new ArgumentCompatibilityService();

    // Create consumer with premises
    const stmtResult = Statement.create('Test statement');
    expect(stmtResult.isOk()).toBe(true);
    if (!stmtResult.isOk()) {
      throw new Error('Failed to create statement');
    }
    const stmt = stmtResult.value;

    const premiseSetResult = OrderedSet.create([stmt.getId()]);
    expect(premiseSetResult.isOk()).toBe(true);
    if (!premiseSetResult.isOk()) {
      throw new Error('Failed to create premise set');
    }
    const premiseSet = premiseSetResult.value;

    const consumerResult = AtomicArgument.create(premiseSet.getId());
    expect(consumerResult.isOk()).toBe(true);
    if (!consumerResult.isOk()) {
      throw new Error('Failed to create consumer');
    }
    const consumer = consumerResult.value;

    // Create provider without conclusions
    const providerResult = AtomicArgument.create();
    expect(providerResult.isOk()).toBe(true);
    if (!providerResult.isOk()) {
      throw new Error('Failed to create provider');
    }
    const provider = providerResult.value;

    const orderedSets = new Map<string, OrderedSet>([[premiseSet.getId().getValue(), premiseSet]]);

    const compatibility = service.canConnect(provider, consumer, orderedSets);

    expect(compatibility.isCompatible).toBe(false);
    expect(compatibility.reason).toBe('Provider has no conclusions');
    expect(compatibility.compatibilityScore).toBe(0);
  });

  test('rejects connection when consumer has no premises', () => {
    const service = new ArgumentCompatibilityService();

    // Create provider with conclusions
    const stmtResult = Statement.create('Test statement');
    expect(stmtResult.isOk()).toBe(true);
    if (!stmtResult.isOk()) {
      throw new Error('Failed to create statement');
    }
    const stmt = stmtResult.value;

    const conclusionSetResult = OrderedSet.create([stmt.getId()]);
    expect(conclusionSetResult.isOk()).toBe(true);
    if (!conclusionSetResult.isOk()) {
      throw new Error('Failed to create conclusion set');
    }
    const conclusionSet = conclusionSetResult.value;

    const providerResult = AtomicArgument.create(undefined, conclusionSet.getId());
    expect(providerResult.isOk()).toBe(true);
    if (!providerResult.isOk()) {
      throw new Error('Failed to create provider');
    }
    const provider = providerResult.value;

    // Create consumer without premises
    const consumerResult = AtomicArgument.create();
    expect(consumerResult.isOk()).toBe(true);
    if (!consumerResult.isOk()) {
      throw new Error('Failed to create consumer');
    }
    const consumer = consumerResult.value;

    const orderedSets = new Map<string, OrderedSet>([
      [conclusionSet.getId().getValue(), conclusionSet],
    ]);

    const compatibility = service.canConnect(provider, consumer, orderedSets);

    expect(compatibility.isCompatible).toBe(false);
    expect(compatibility.reason).toBe('Consumer has no premises');
    expect(compatibility.compatibilityScore).toBe(0);
  });

  test('rejects connection when no statement overlap exists', () => {
    const service = new ArgumentCompatibilityService();

    // Create completely different statements
    const stmt1Result = Statement.create('P');
    const stmt2Result = Statement.create('Q');

    expect(stmt1Result.isOk()).toBe(true);
    expect(stmt2Result.isOk()).toBe(true);

    if (!stmt1Result.isOk() || !stmt2Result.isOk()) {
      throw new Error('Failed to create statements');
    }

    const stmt1 = stmt1Result.value;
    const stmt2 = stmt2Result.value;

    // Create sets with no overlap
    const providerConclusionResult = OrderedSet.create([stmt1.getId()]);
    const consumerPremiseResult = OrderedSet.create([stmt2.getId()]);
    const baseSetResult = OrderedSet.create([stmt1.getId()]);

    expect(providerConclusionResult.isOk()).toBe(true);
    expect(consumerPremiseResult.isOk()).toBe(true);
    expect(baseSetResult.isOk()).toBe(true);

    if (
      !providerConclusionResult.isOk() ||
      !consumerPremiseResult.isOk() ||
      !baseSetResult.isOk()
    ) {
      throw new Error('Failed to create ordered sets');
    }

    const providerConclusion = providerConclusionResult.value;
    const consumerPremise = consumerPremiseResult.value;
    const baseSet = baseSetResult.value;

    const provider = AtomicArgument.createComplete(baseSet.getId(), providerConclusion.getId());
    const consumer = AtomicArgument.createComplete(consumerPremise.getId(), baseSet.getId());

    const orderedSets = new Map<string, OrderedSet>([
      [providerConclusion.getId().getValue(), providerConclusion],
      [consumerPremise.getId().getValue(), consumerPremise],
      [baseSet.getId().getValue(), baseSet],
    ]);

    const compatibility = service.canConnect(provider, consumer, orderedSets);

    expect(compatibility.isCompatible).toBe(false);
    expect(compatibility.reason).toBe('No statement overlap between conclusion and premise');
    expect(compatibility.compatibilityScore).toBe(0);
  });

  test('finds premise providers sorted by compatibility score', () => {
    const service = new ArgumentCompatibilityService();

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

    // Create consumer needing [A, B]
    const consumerPremiseResult = OrderedSet.create([stmt1.getId(), stmt2.getId()]);
    expect(consumerPremiseResult.isOk()).toBe(true);
    if (!consumerPremiseResult.isOk()) {
      throw new Error('Failed to create consumer premise');
    }
    const consumerPremise = consumerPremiseResult.value;

    const consumerResult = AtomicArgument.create(consumerPremise.getId());
    expect(consumerResult.isOk()).toBe(true);
    if (!consumerResult.isOk()) {
      throw new Error('Failed to create consumer');
    }
    const consumer = consumerResult.value;

    // Create perfect provider (provides [A, B])
    const perfectProviderConclusionResult = OrderedSet.create([stmt1.getId(), stmt2.getId()]);
    expect(perfectProviderConclusionResult.isOk()).toBe(true);
    if (!perfectProviderConclusionResult.isOk()) {
      throw new Error('Failed to create perfect provider conclusion');
    }
    const perfectProviderConclusion = perfectProviderConclusionResult.value;

    const baseSet1Result = OrderedSet.create([stmt3.getId()]);
    expect(baseSet1Result.isOk()).toBe(true);
    if (!baseSet1Result.isOk()) {
      throw new Error('Failed to create base set 1');
    }
    const baseSet1 = baseSet1Result.value;

    const perfectProvider = AtomicArgument.createComplete(
      baseSet1.getId(),
      perfectProviderConclusion.getId(),
    );

    // Create partial provider (provides [A, C])
    const partialProviderConclusionResult = OrderedSet.create([stmt1.getId(), stmt3.getId()]);
    expect(partialProviderConclusionResult.isOk()).toBe(true);
    if (!partialProviderConclusionResult.isOk()) {
      throw new Error('Failed to create partial provider conclusion');
    }
    const partialProviderConclusion = partialProviderConclusionResult.value;

    const baseSet2Result = OrderedSet.create([stmt2.getId()]);
    expect(baseSet2Result.isOk()).toBe(true);
    if (!baseSet2Result.isOk()) {
      throw new Error('Failed to create base set 2');
    }
    const baseSet2 = baseSet2Result.value;

    const partialProvider = AtomicArgument.createComplete(
      baseSet2.getId(),
      partialProviderConclusion.getId(),
    );

    const availableArguments = new Map([
      [perfectProvider.getId().getValue(), perfectProvider],
      [partialProvider.getId().getValue(), partialProvider],
      [consumer.getId().getValue(), consumer],
    ]);

    const orderedSets = new Map<string, OrderedSet>([
      [consumerPremise.getId().getValue(), consumerPremise],
      [perfectProviderConclusion.getId().getValue(), perfectProviderConclusion],
      [partialProviderConclusion.getId().getValue(), partialProviderConclusion],
      [baseSet1.getId().getValue(), baseSet1],
      [baseSet2.getId().getValue(), baseSet2],
    ]);

    const providers = service.findPremiseProviders(consumer, availableArguments, orderedSets);

    expect(providers).toHaveLength(2);

    // Should be sorted by compatibility score (perfect first)
    if (providers[0] && providers[1]) {
      expect(providers[0].compatibility.compatibilityScore).toBeGreaterThan(
        providers[1].compatibility.compatibilityScore,
      );
      expect(providers[0].compatibility.connectionType).toBe('partial');
      expect(providers[1].compatibility.connectionType).toBe('partial');
    }
  });

  test('returns empty array when consumer has no premises', () => {
    const service = new ArgumentCompatibilityService();

    // Create consumer without premises
    const consumerResult = AtomicArgument.create();
    expect(consumerResult.isOk()).toBe(true);
    if (!consumerResult.isOk()) {
      throw new Error('Failed to create consumer');
    }
    const consumer = consumerResult.value;

    const orderedSets = new Map<string, OrderedSet>();

    const providers = service.findPremiseProviders(consumer, new Map(), orderedSets);

    expect(providers).toHaveLength(0);
  });

  test('excludes consumer from its own providers', () => {
    const service = new ArgumentCompatibilityService();

    // Create self-referential scenario
    const stmtResult = Statement.create('Self reference');
    expect(stmtResult.isOk()).toBe(true);
    if (!stmtResult.isOk()) {
      throw new Error('Failed to create statement');
    }
    const stmt = stmtResult.value;

    const setResult = OrderedSet.create([stmt.getId()]);
    expect(setResult.isOk()).toBe(true);
    if (!setResult.isOk()) {
      throw new Error('Failed to create ordered set');
    }
    const set = setResult.value;

    const argument = AtomicArgument.createComplete(set.getId(), set.getId());

    const availableArguments = new Map([[argument.getId().getValue(), argument]]);

    const orderedSets = new Map<string, OrderedSet>([[set.getId().getValue(), set]]);

    const providers = service.findPremiseProviders(argument, availableArguments, orderedSets);

    expect(providers).toHaveLength(0); // Should exclude itself
  });
});

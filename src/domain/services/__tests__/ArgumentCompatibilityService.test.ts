import { describe, expect, test } from 'vitest';
import { AtomicArgument } from '../../entities/AtomicArgument.js';
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

    // Provider produces stmt3, consumer uses stmt3 as premise
    const providerResult = AtomicArgument.create([stmt1, stmt2], [stmt3]);
    const consumerResult = AtomicArgument.create([stmt3], []);

    expect(providerResult.isOk()).toBe(true);
    expect(consumerResult.isOk()).toBe(true);
    if (!providerResult.isOk() || !consumerResult.isOk()) {
      throw new Error('Failed to create arguments');
    }
    const provider = providerResult.value;
    const consumer = consumerResult.value;

    const compatibility = service.canConnect(provider, consumer);

    expect(compatibility.isCompatible).toBe(true);
    expect(compatibility.connectionType).toBe('complete');
    expect(compatibility.compatibilityScore).toBe(1.0);
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

    // Provider produces [stmt1, stmt2], consumer needs [stmt2, stmt3]
    const providerResult = AtomicArgument.create([stmt3], [stmt1, stmt2]);
    const consumerResult = AtomicArgument.create([stmt2, stmt3], [stmt3]);

    expect(providerResult.isOk()).toBe(true);
    expect(consumerResult.isOk()).toBe(true);
    if (!providerResult.isOk() || !consumerResult.isOk()) {
      throw new Error('Failed to create arguments');
    }

    const provider = providerResult.value;
    const consumer = consumerResult.value;

    const compatibility = service.canConnect(provider, consumer);

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

    const consumerResult = AtomicArgument.create([stmt], []);
    expect(consumerResult.isOk()).toBe(true);
    if (!consumerResult.isOk()) {
      throw new Error('Failed to create consumer');
    }
    const consumer = consumerResult.value;

    // Create provider without conclusions
    const providerResult = AtomicArgument.create([], []);
    expect(providerResult.isOk()).toBe(true);
    if (!providerResult.isOk()) {
      throw new Error('Failed to create provider');
    }
    const provider = providerResult.value;

    const compatibility = service.canConnect(provider, consumer);

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

    const providerResult = AtomicArgument.create([], [stmt]);
    expect(providerResult.isOk()).toBe(true);
    if (!providerResult.isOk()) {
      throw new Error('Failed to create provider');
    }
    const provider = providerResult.value;

    // Create consumer without premises
    const consumerResult = AtomicArgument.create([], []);
    expect(consumerResult.isOk()).toBe(true);
    if (!consumerResult.isOk()) {
      throw new Error('Failed to create consumer');
    }
    const consumer = consumerResult.value;

    const compatibility = service.canConnect(provider, consumer);

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

    // Provider produces stmt1, consumer needs stmt2
    const providerResult = AtomicArgument.create([stmt1], [stmt1]);
    const consumerResult = AtomicArgument.create([stmt2], [stmt1]);

    expect(providerResult.isOk()).toBe(true);
    expect(consumerResult.isOk()).toBe(true);
    if (!providerResult.isOk() || !consumerResult.isOk()) {
      throw new Error('Failed to create arguments');
    }

    const provider = providerResult.value;
    const consumer = consumerResult.value;

    const compatibility = service.canConnect(provider, consumer);

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
    const consumerResult = AtomicArgument.create([stmt1, stmt2], []);
    expect(consumerResult.isOk()).toBe(true);
    if (!consumerResult.isOk()) {
      throw new Error('Failed to create consumer');
    }
    const consumer = consumerResult.value;

    // Create perfect provider (provides [A, B])
    const perfectProviderResult = AtomicArgument.create([stmt3], [stmt1, stmt2]);
    expect(perfectProviderResult.isOk()).toBe(true);
    if (!perfectProviderResult.isOk()) {
      throw new Error('Failed to create perfect provider');
    }
    const perfectProvider = perfectProviderResult.value;

    // Create partial provider (provides [A, C])
    const partialProviderResult = AtomicArgument.create([stmt2], [stmt1, stmt3]);
    expect(partialProviderResult.isOk()).toBe(true);
    if (!partialProviderResult.isOk()) {
      throw new Error('Failed to create partial provider');
    }
    const partialProvider = partialProviderResult.value;

    const availableArguments = new Map([
      [perfectProvider.getId().getValue(), perfectProvider],
      [partialProvider.getId().getValue(), partialProvider],
      [consumer.getId().getValue(), consumer],
    ]);

    const providers = service.findPremiseProviders(consumer, availableArguments);

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
    const consumerResult = AtomicArgument.create([], []);
    expect(consumerResult.isOk()).toBe(true);
    if (!consumerResult.isOk()) {
      throw new Error('Failed to create consumer');
    }
    const consumer = consumerResult.value;

    const providers = service.findPremiseProviders(consumer, new Map());

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

    const argResult = AtomicArgument.create([stmt], [stmt]);
    expect(argResult.isOk()).toBe(true);
    if (!argResult.isOk()) {
      throw new Error('Failed to create argument');
    }
    const argument = argResult.value;

    const availableArguments = new Map([[argument.getId().getValue(), argument]]);

    const providers = service.findPremiseProviders(argument, availableArguments);

    expect(providers).toHaveLength(0); // Should exclude itself
  });
});

import { describe, expect, test } from 'vitest';
import { ProofAggregate } from '../../aggregates/ProofAggregate.js';
import { ProofTreeAggregate } from '../../aggregates/ProofTreeAggregate.js';
import { AtomicArgumentId } from '../../shared/value-objects/index.js';
import { BootstrapService } from '../BootstrapService.js';

describe('BootstrapService', () => {
  const service = new BootstrapService();

  describe('ProofAggregate.createNew', () => {
    test('creates empty document ready for use', () => {
      const doc = ProofAggregate.createNew();

      expect(doc.isOk()).toBe(true);
      if (doc.isOk()) {
        const queryService = doc.value.createQueryService();
        expect(queryService.getStatements().size).toBe(0);
        expect(queryService.getArguments().size).toBe(0);
      }
    });
  });

  describe('createBootstrapArgument', () => {
    test('creates bootstrap argument without tree', () => {
      const docResult = ProofAggregate.createNew();
      expect(docResult.isOk()).toBe(true);
      if (!docResult.isOk()) return;

      const result = service.createBootstrapArgument(docResult.value);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.argument.isBootstrap()).toBe(true);
        const queryService = result.value.updatedProofAggregate.createQueryService();
        expect(queryService.getArguments().size).toBe(1);
        expect(result.value.tree).toBeUndefined();
        expect(result.value.node).toBeUndefined();
        expect(result.value.instructions).toBe(
          'Click the empty implication line to add premises and conclusions',
        );
      }
    });

    test('creates bootstrap argument with tree', () => {
      const docResult = ProofAggregate.createNew();
      expect(docResult.isOk()).toBe(true);
      if (!docResult.isOk()) return;

      const treeAggregateResult = ProofTreeAggregate.createNew();
      expect(treeAggregateResult.isOk()).toBe(true);
      if (!treeAggregateResult.isOk()) return;

      const result = service.createBootstrapArgument(docResult.value, treeAggregateResult.value);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.argument.isBootstrap()).toBe(true);
        expect(result.value.tree).toBeDefined();
        expect(result.value.node).toBeDefined();
        expect(result.value.updatedTreeAggregate).toBeDefined();
        // Tree aggregate would have its own query service
        expect(result.value.updatedTreeAggregate).toBeDefined();
      }
    });
  });

  describe('populateEmptyArgument', () => {
    test('populates empty argument with content', () => {
      const docResult = ProofAggregate.createNew();
      expect(docResult.isOk()).toBe(true);
      if (!docResult.isOk()) return;

      const bootstrapResult = service.createBootstrapArgument(docResult.value);
      expect(bootstrapResult.isOk()).toBe(true);
      if (!bootstrapResult.isOk()) return;

      const result = service.populateEmptyArgument(
        bootstrapResult.value.updatedProofAggregate,
        bootstrapResult.value.argument.getId(),
        ['All men are mortal', 'Socrates is a man'],
        ['Socrates is mortal'],
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.premiseStatements).toHaveLength(2);
        expect(result.value.conclusionStatements).toHaveLength(1);
        expect(result.value.newArgument.isBootstrap()).toBe(false);
        const queryService = result.value.updatedProofAggregate.createQueryService();
        expect(queryService.getStatements().size).toBe(3);
      }
    });

    test('allows empty premises', () => {
      const docResult = ProofAggregate.createNew();
      expect(docResult.isOk()).toBe(true);
      if (!docResult.isOk()) return;

      const bootstrapResult = service.createBootstrapArgument(docResult.value);
      expect(bootstrapResult.isOk()).toBe(true);
      if (!bootstrapResult.isOk()) return;

      const result = service.populateEmptyArgument(
        bootstrapResult.value.updatedProofAggregate,
        bootstrapResult.value.argument.getId(),
        [],
        ['Therefore, something is true'],
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.premiseStatements).toHaveLength(0);
        expect(result.value.conclusionStatements).toHaveLength(1);
        expect(result.value.newArgument.hasPremiseSet()).toBe(false);
        expect(result.value.newArgument.hasConclusionSet()).toBe(true);
      }
    });

    test('allows empty conclusions', () => {
      const docResult = ProofAggregate.createNew();
      expect(docResult.isOk()).toBe(true);
      if (!docResult.isOk()) return;

      const bootstrapResult = service.createBootstrapArgument(docResult.value);
      expect(bootstrapResult.isOk()).toBe(true);
      if (!bootstrapResult.isOk()) return;

      const result = service.populateEmptyArgument(
        bootstrapResult.value.updatedProofAggregate,
        bootstrapResult.value.argument.getId(),
        ['Given this premise'],
        [],
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.premiseStatements).toHaveLength(1);
        expect(result.value.conclusionStatements).toHaveLength(0);
        expect(result.value.newArgument.hasPremiseSet()).toBe(true);
        expect(result.value.newArgument.hasConclusionSet()).toBe(false);
      }
    });

    test('fails if argument not found', () => {
      const docResult = ProofAggregate.createNew();
      expect(docResult.isOk()).toBe(true);
      if (!docResult.isOk()) return;

      const fakeArgumentId = AtomicArgumentId.generate();
      const result = service.populateEmptyArgument(
        docResult.value,
        fakeArgumentId,
        ['premise'],
        ['conclusion'],
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Argument not found');
      }
    });

    test('fails if argument is not empty', () => {
      const docResult = ProofAggregate.createNew({ initialStatement: 'Test statement' });
      expect(docResult.isOk()).toBe(true);
      if (!docResult.isOk()) return;

      const queryService = docResult.value.createQueryService();
      const firstStatementId = Array.from(queryService.getStatements().keys())[0];
      if (!firstStatementId) {
        throw new Error('Expected statement to exist');
      }
      const argResult = docResult.value.createAtomicArgument([firstStatementId], []);
      expect(argResult.isOk()).toBe(true);
      if (!argResult.isOk()) return;

      const result = service.populateEmptyArgument(
        docResult.value,
        argResult.value,
        ['new premise'],
        ['new conclusion'],
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Argument is not empty');
      }
    });
  });

  describe('isBootstrapState', () => {
    test('correctly identifies empty document stage', () => {
      const docResult = ProofAggregate.createNew();
      expect(docResult.isOk()).toBe(true);
      if (!docResult.isOk()) return;

      const status = service.isBootstrapState(docResult.value);
      expect(status.isBootstrap).toBe(true);
      expect(status.stage).toBe('empty-document');
      expect(status.nextAction).toBe('Create your first argument');
    });

    test('correctly identifies empty argument stage', () => {
      const docResult = ProofAggregate.createNew();
      expect(docResult.isOk()).toBe(true);
      if (!docResult.isOk()) return;

      const bootstrapResult = service.createBootstrapArgument(docResult.value);
      expect(bootstrapResult.isOk()).toBe(true);
      if (!bootstrapResult.isOk()) return;

      const status = service.isBootstrapState(bootstrapResult.value.updatedProofAggregate);
      expect(status.isBootstrap).toBe(true);
      expect(status.stage).toBe('empty-argument');
      expect(status.nextAction).toBe('Add premises and conclusions to your argument');
    });

    test('correctly identifies no trees stage', () => {
      const docResult = ProofAggregate.createNew();
      expect(docResult.isOk()).toBe(true);
      if (!docResult.isOk()) return;

      const bootstrapResult = service.createBootstrapArgument(docResult.value);
      expect(bootstrapResult.isOk()).toBe(true);
      if (!bootstrapResult.isOk()) return;

      const populateResult = service.populateEmptyArgument(
        bootstrapResult.value.updatedProofAggregate,
        bootstrapResult.value.argument.getId(),
        ['premise'],
        ['conclusion'],
      );
      expect(populateResult.isOk()).toBe(true);
      if (!populateResult.isOk()) return;

      const status = service.isBootstrapState(populateResult.value.updatedProofAggregate);
      expect(status.isBootstrap).toBe(true);
      expect(status.stage).toBe('no-trees');
      expect(status.nextAction).toBe('Create a tree to visualize your arguments');
    });

    test('correctly identifies active stage', () => {
      const docResult = ProofAggregate.createNew();
      expect(docResult.isOk()).toBe(true);
      if (!docResult.isOk()) return;

      const treeAggregateResult = ProofTreeAggregate.createNew();
      expect(treeAggregateResult.isOk()).toBe(true);
      if (!treeAggregateResult.isOk()) return;

      const bootstrapResult = service.createBootstrapArgument(
        docResult.value,
        treeAggregateResult.value,
      );
      expect(bootstrapResult.isOk()).toBe(true);
      if (!bootstrapResult.isOk()) return;

      const populateResult = service.populateEmptyArgument(
        bootstrapResult.value.updatedProofAggregate,
        bootstrapResult.value.argument.getId(),
        ['premise'],
        ['conclusion'],
      );
      expect(populateResult.isOk()).toBe(true);
      if (!populateResult.isOk()) return;

      const status = service.isBootstrapState(
        populateResult.value.updatedProofAggregate,
        bootstrapResult.value.updatedTreeAggregate,
      );
      expect(status.isBootstrap).toBe(false);
      expect(status.stage).toBe('active');
      expect(status.nextAction).toBeNull();
    });
  });
});

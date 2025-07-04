import { err, ok, type Result } from 'neverthrow';
import { ProofAggregate } from '../aggregates/ProofAggregate.js';
import { ProofTreeAggregate } from '../aggregates/ProofTreeAggregate.js';
import { AtomicArgument } from '../entities/AtomicArgument.js';
import type { Node } from '../entities/Node.js';
import { OrderedSet } from '../entities/OrderedSet.js';
import { Statement } from '../entities/Statement.js';
import { Tree } from '../entities/Tree.js';
import type { DomainEvent } from '../events/base-event.js';
import {
  BootstrapArgumentCreated,
  BootstrapArgumentPopulated,
} from '../events/bootstrap-events.js';
import { ValidationError } from '../shared/result.js';
import { type AtomicArgumentId, Position2D } from '../shared/value-objects.js';

/**
 * Handles bootstrap scenarios where users start from nothing.
 * This is the entry point for all proof construction.
 */
export class BootstrapService {
  /**
   * Initialize a new document with bootstrap support.
   * Creates an empty document ready for proof construction.
   */
  initializeEmptyDocument(): Result<ProofAggregate, ValidationError> {
    return ProofAggregate.createNew();
  }

  /**
   * Create the first atomic argument in a document.
   * This is the bootstrap case - no premises or conclusions yet.
   */
  createBootstrapArgument(
    proofAggregate: ProofAggregate,
    treeAggregate?: ProofTreeAggregate,
  ): Result<BootstrapResult, ValidationError> {
    // Create empty atomic argument
    const emptyArg = AtomicArgument.create();
    if (emptyArg.isErr()) {
      return err(emptyArg.error);
    }

    // Add empty argument to the proof aggregate
    const argumentsMap = new Map(proofAggregate.getArguments());
    argumentsMap.set(emptyArg.value.getId(), emptyArg.value);

    // Create new aggregate with the empty argument
    const updatedProofResult = ProofAggregate.reconstruct(
      proofAggregate.getId(),
      new Map(proofAggregate.getStatements()),
      argumentsMap,
      new Map(proofAggregate.getOrderedSets()),
      proofAggregate.getVersion() + 1,
    );

    if (updatedProofResult.isErr()) {
      return err(updatedProofResult.error);
    }

    // If tree aggregate provided, create tree and node
    let tree: Tree | undefined;
    let node: Node | undefined;
    let updatedTreeAggregate: ProofTreeAggregate | undefined;

    if (treeAggregate) {
      const positionResult = Position2D.create(100, 100);
      if (positionResult.isErr()) {
        return err(positionResult.error);
      }

      // Trees need a document ID - use the proof aggregate ID
      const treeResult = Tree.create(proofAggregate.getId().getValue(), positionResult.value);
      if (treeResult.isErr()) {
        return err(treeResult.error);
      }
      tree = treeResult.value;

      // Create a new tree aggregate with the updated proof aggregate
      const newTreeAggregateResult = ProofTreeAggregate.createNew(updatedProofResult.value);
      if (newTreeAggregateResult.isErr()) {
        return err(newTreeAggregateResult.error);
      }
      updatedTreeAggregate = newTreeAggregateResult.value;

      // Add the node to the tree aggregate
      const addNodeResult = updatedTreeAggregate.addNode({
        argumentId: emptyArg.value.getId(),
      });
      if (addNodeResult.isErr()) {
        return err(addNodeResult.error);
      }

      // Get the created node
      const createdNode = updatedTreeAggregate.getNodes().get(addNodeResult.value);
      if (!createdNode) {
        return err(new ValidationError('Failed to retrieve created node'));
      }
      node = createdNode;
    }

    // Emit bootstrap event
    const event = new BootstrapArgumentCreated(
      proofAggregate.getId().getValue(),
      emptyArg.value.getId(),
      tree?.getId(),
    );

    return ok({
      argument: emptyArg.value,
      updatedProofAggregate: updatedProofResult.value,
      tree,
      node,
      updatedTreeAggregate,
      instructions: 'Click the empty implication line to add premises and conclusions',
      event,
    });
  }

  /**
   * Transform empty argument into one with content.
   * This is how users build up from bootstrap state.
   */
  populateEmptyArgument(
    proofAggregate: ProofAggregate,
    argumentId: AtomicArgumentId,
    premiseContents: string[],
    conclusionContents: string[],
  ): Result<PopulationResult, ValidationError> {
    const argument = proofAggregate.getArguments().get(argumentId);
    if (!argument) {
      return err(new ValidationError('Argument not found'));
    }

    // Verify it's actually empty (bootstrap state)
    if (!argument.isBootstrapArgument()) {
      return err(new ValidationError('Argument is not empty'));
    }

    // Create statements for premises
    const premiseStatements: Statement[] = [];
    const statementsMap = new Map(proofAggregate.getStatements());

    for (const content of premiseContents) {
      const stmt = Statement.create(content);
      if (stmt.isErr()) {
        return err(stmt.error);
      }
      premiseStatements.push(stmt.value);
      statementsMap.set(stmt.value.getId(), stmt.value);
    }

    // Create statements for conclusions
    const conclusionStatements: Statement[] = [];
    for (const content of conclusionContents) {
      const stmt = Statement.create(content);
      if (stmt.isErr()) {
        return err(stmt.error);
      }
      conclusionStatements.push(stmt.value);
      statementsMap.set(stmt.value.getId(), stmt.value);
    }

    // Create ordered sets if we have statements
    const orderedSetsMap = new Map(proofAggregate.getOrderedSets());
    let premiseSet: OrderedSet | undefined;
    let conclusionSet: OrderedSet | undefined;

    if (premiseStatements.length > 0) {
      const premiseSetResult = OrderedSet.create(premiseStatements.map((s) => s.getId()));
      if (premiseSetResult.isErr()) {
        return err(premiseSetResult.error);
      }
      premiseSet = premiseSetResult.value;
      orderedSetsMap.set(premiseSet.getId(), premiseSet);

      // Update statement usage counts
      premiseStatements.forEach((stmt) => stmt.incrementUsage());
    }

    if (conclusionStatements.length > 0) {
      const conclusionSetResult = OrderedSet.create(conclusionStatements.map((s) => s.getId()));
      if (conclusionSetResult.isErr()) {
        return err(conclusionSetResult.error);
      }
      conclusionSet = conclusionSetResult.value;
      orderedSetsMap.set(conclusionSet.getId(), conclusionSet);

      // Update statement usage counts
      conclusionStatements.forEach((stmt) => stmt.incrementUsage());
    }

    // Create new argument with content
    const newArg = AtomicArgument.create(premiseSet?.getId(), conclusionSet?.getId());
    if (newArg.isErr()) {
      return err(newArg.error);
    }

    // Update argument references in ordered sets
    if (premiseSet) {
      premiseSet.addAtomicArgumentReference(newArg.value.getId(), 'premise');
    }

    if (conclusionSet) {
      conclusionSet.addAtomicArgumentReference(newArg.value.getId(), 'conclusion');
    }

    // Remove old empty argument and add new one
    const argumentsMap = new Map(proofAggregate.getArguments());
    argumentsMap.delete(argumentId);
    argumentsMap.set(newArg.value.getId(), newArg.value);

    // Create updated proof aggregate
    const updatedProofResult = ProofAggregate.reconstruct(
      proofAggregate.getId(),
      statementsMap,
      argumentsMap,
      orderedSetsMap,
      proofAggregate.getVersion() + 1,
    );

    if (updatedProofResult.isErr()) {
      return err(updatedProofResult.error);
    }

    // Emit populated event
    const event = new BootstrapArgumentPopulated(
      proofAggregate.getId().getValue(),
      argumentId,
      newArg.value.getId(),
      premiseStatements.length,
      conclusionStatements.length,
    );

    return ok({
      oldArgumentId: argumentId,
      newArgument: newArg.value,
      premiseStatements,
      conclusionStatements,
      updatedProofAggregate: updatedProofResult.value,
      event,
    });
  }

  /**
   * Check if document is in bootstrap state.
   * Useful for UI to show appropriate helpers.
   */
  isBootstrapState(
    proofAggregate: ProofAggregate,
    treeAggregate?: ProofTreeAggregate,
  ): BootstrapStatus {
    const statementCount = proofAggregate.getStatements().size;
    const argumentCount = proofAggregate.getArguments().size;
    const treeCount = treeAggregate?.getNodes().size ?? 0;

    if (statementCount === 0 && argumentCount === 0) {
      return {
        isBootstrap: true,
        stage: 'empty-document',
        nextAction: 'Create your first argument',
      };
    }

    if (argumentCount === 1 && statementCount === 0) {
      // Check if the single argument is empty
      const argument = Array.from(proofAggregate.getArguments().values())[0];
      if (argument?.isBootstrapArgument()) {
        return {
          isBootstrap: true,
          stage: 'empty-argument',
          nextAction: 'Add premises and conclusions to your argument',
        };
      }
    }

    if (treeCount === 0 && argumentCount > 0) {
      return {
        isBootstrap: true,
        stage: 'no-trees',
        nextAction: 'Create a tree to visualize your arguments',
      };
    }

    return {
      isBootstrap: false,
      stage: 'active',
      nextAction: null,
    };
  }
}

// Types for bootstrap operations
export interface BootstrapResult {
  argument: AtomicArgument;
  updatedProofAggregate: ProofAggregate;
  tree: Tree | undefined;
  node: Node | undefined;
  updatedTreeAggregate: ProofTreeAggregate | undefined;
  instructions: string;
  event: DomainEvent;
}

export interface PopulationResult {
  oldArgumentId: AtomicArgumentId;
  newArgument: AtomicArgument;
  premiseStatements: Statement[];
  conclusionStatements: Statement[];
  updatedProofAggregate: ProofAggregate;
  event: DomainEvent;
}

export interface BootstrapStatus {
  isBootstrap: boolean;
  stage: 'empty-document' | 'empty-argument' | 'no-trees' | 'active';
  nextAction: string | null;
}

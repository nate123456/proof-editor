import { err, ok, type Result } from 'neverthrow';
import type { ProofAggregate } from '../aggregates/ProofAggregate.js';
import { ProofTreeAggregate } from '../aggregates/ProofTreeAggregate.js';
import type { AtomicArgument } from '../entities/AtomicArgument.js';
import type { Node } from '../entities/Node.js';
import type { Statement } from '../entities/Statement.js';
import { Tree } from '../entities/Tree.js';
import type { DomainEvent } from '../events/base-event.js';
import {
  BootstrapArgumentCreated,
  BootstrapArgumentPopulated,
} from '../events/bootstrap-events.js';
import { ValidationError } from '../shared/result.js';
import {
  type AtomicArgumentId,
  Position2D,
  type StatementId,
} from '../shared/value-objects/index.js';

/**
 * Handles bootstrap scenarios where users start from nothing.
 * This is the entry point for all proof construction.
 */
export class BootstrapService {
  /**
   * Create the first atomic argument in a document.
   * This is the bootstrap case - no premises or conclusions yet.
   */
  createBootstrapArgument(
    proofAggregate: ProofAggregate,
    treeAggregate?: ProofTreeAggregate,
  ): Result<BootstrapResult, ValidationError> {
    // Use aggregate method to create empty argument (no premises or conclusions)
    const emptyArgIdResult = proofAggregate.createAtomicArgument([], []);
    if (emptyArgIdResult.isErr()) {
      return err(emptyArgIdResult.error);
    }

    const emptyArg = proofAggregate.getArguments().get(emptyArgIdResult.value);
    if (!emptyArg) {
      return err(new ValidationError('Failed to retrieve created argument'));
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

      // Create a new tree aggregate with default layout
      const newTreeAggregateResult = ProofTreeAggregate.createNew();
      if (newTreeAggregateResult.isErr()) {
        return err(newTreeAggregateResult.error);
      }
      updatedTreeAggregate = newTreeAggregateResult.value;

      // Add the node to the tree aggregate
      const argumentIds = new Set(proofAggregate.getArguments().keys());
      const addNodeResult = updatedTreeAggregate.addNode(
        {
          argumentId: emptyArg.getId(),
        },
        argumentIds,
      );
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
      emptyArg.getId(),
      tree?.getId(),
    );

    return ok({
      argument: emptyArg,
      updatedProofAggregate: proofAggregate,
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

    // Use aggregate methods to add statements
    const premiseStatementIds: StatementId[] = [];
    const premiseStatements: Statement[] = [];

    for (const content of premiseContents) {
      const statementIdResult = proofAggregate.addStatement(content);
      if (statementIdResult.isErr()) {
        return err(statementIdResult.error);
      }
      premiseStatementIds.push(statementIdResult.value);

      const statement = proofAggregate.getStatements().get(statementIdResult.value);
      if (!statement) {
        return err(new ValidationError('Failed to retrieve created statement'));
      }
      premiseStatements.push(statement);
    }

    const conclusionStatementIds: StatementId[] = [];
    const conclusionStatements: Statement[] = [];

    for (const content of conclusionContents) {
      const statementIdResult = proofAggregate.addStatement(content);
      if (statementIdResult.isErr()) {
        return err(statementIdResult.error);
      }
      conclusionStatementIds.push(statementIdResult.value);

      const statement = proofAggregate.getStatements().get(statementIdResult.value);
      if (!statement) {
        return err(new ValidationError('Failed to retrieve created statement'));
      }
      conclusionStatements.push(statement);
    }

    // Use aggregate method to create new argument
    const newArgumentIdResult = proofAggregate.createAtomicArgument(
      premiseStatementIds,
      conclusionStatementIds,
    );
    if (newArgumentIdResult.isErr()) {
      return err(newArgumentIdResult.error);
    }

    const newArgument = proofAggregate.getArguments().get(newArgumentIdResult.value);
    if (!newArgument) {
      return err(new ValidationError('Failed to retrieve created argument'));
    }

    // Note: We should remove the old empty argument, but ProofAggregate doesn't have a removeArgument method
    // This is a limitation of the current aggregate design

    // Emit populated event
    const event = new BootstrapArgumentPopulated(
      proofAggregate.getId().getValue(),
      argumentId,
      newArgumentIdResult.value,
      premiseStatements.length,
      conclusionStatements.length,
    );

    return ok({
      oldArgumentId: argumentId,
      newArgument,
      premiseStatements,
      conclusionStatements,
      updatedProofAggregate: proofAggregate,
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

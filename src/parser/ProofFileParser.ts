import * as yaml from 'js-yaml';
import { err, ok, type Result } from 'neverthrow';

import { AtomicArgument } from '../domain/entities/AtomicArgument.js';
import { Node } from '../domain/entities/Node.js';
import { OrderedSet } from '../domain/entities/OrderedSet.js';
import { Statement } from '../domain/entities/Statement.js';
import { Tree } from '../domain/entities/Tree.js';
import { type ValidationError } from '../domain/shared/result.js';
import {
  AtomicArgumentId,
  Attachment,
  NodeId,
  OrderedSetId,
  Position2D,
  StatementId,
} from '../domain/shared/value-objects.js';
import { type ParseError, ParseErrorType, ParseFailureError } from './ParseError.js';
import type { NodeSpec, ProofDocument } from './ProofDocument.js';
import { YAMLValidator } from './YAMLValidator.js';

export class ProofFileParser {
  private readonly validator = new YAMLValidator();

  parseProofFile(yamlContent: string): Result<ProofDocument, ParseFailureError> {
    const errors: ParseError[] = [];

    // Phase 1: Parse YAML syntax
    let parsedData: unknown;
    try {
      parsedData = yaml.load(yamlContent);
    } catch (yamlError) {
      const error = yamlError as yaml.YAMLException;
      const parseError: ParseError = {
        type: ParseErrorType.YAML_SYNTAX,
        message: `YAML syntax error: ${error.message}`,
      };

      // Only add line/column if they exist to avoid exactOptionalPropertyTypes issues
      if (error.mark?.line !== undefined) {
        parseError.line = error.mark.line + 1;
      }
      if (error.mark?.column !== undefined) {
        parseError.column = error.mark.column + 1;
      }

      errors.push(parseError);
      return err(new ParseFailureError(errors));
    }

    // Phase 2: Validate YAML structure
    const structureResult = this.validator.validateStructure(parsedData);
    if (structureResult.isErr()) {
      errors.push(...structureResult.error);
      return err(new ParseFailureError(errors));
    }

    const structure = structureResult.value;

    // Phase 3: Create domain objects in dependency order
    const document: ProofDocument = {
      statements: new Map(),
      orderedSets: new Map(),
      atomicArguments: new Map(),
      trees: new Map(),
      nodes: new Map(),
    };

    // Phase 3a: Create Statements
    if (structure.statements) {
      const statementsResult = this.createStatements(structure.statements);
      if (statementsResult.isErr()) {
        errors.push(...statementsResult.error);
      } else {
        statementsResult.value.forEach((statement, id) => {
          document.statements.set(id, statement);
        });
      }
    }

    // Phase 3b: Create OrderedSets (depends on Statements)
    if (structure.orderedSets) {
      const orderedSetsResult = this.createOrderedSets(structure.orderedSets, document.statements);
      if (orderedSetsResult.isErr()) {
        errors.push(...orderedSetsResult.error);
      } else {
        orderedSetsResult.value.forEach((orderedSet, id) => {
          document.orderedSets.set(id, orderedSet);
        });
      }
    }

    // Phase 3c: Create AtomicArguments (depends on OrderedSets)
    if (structure.atomicArguments) {
      const atomicArgumentsResult = this.createAtomicArguments(
        structure.atomicArguments,
        document.orderedSets
      );
      if (atomicArgumentsResult.isErr()) {
        errors.push(...atomicArgumentsResult.error);
      } else {
        atomicArgumentsResult.value.forEach((argument, id) => {
          document.atomicArguments.set(id, argument);
        });
      }
    }

    // Phase 3d: Create Arguments from new format (depends on Statements)
    if (structure.arguments) {
      const argumentsResult = this.createArguments(structure.arguments, document.statements);
      if (argumentsResult.isErr()) {
        errors.push(...argumentsResult.error);
      } else {
        argumentsResult.value.forEach((argument, id) => {
          document.atomicArguments.set(id, argument);
        });
      }
    }

    // Phase 3e: Create Trees and Nodes (depends on Arguments)
    if (structure.trees) {
      const treesResult = this.createTreesAndNodes(structure.trees, document.atomicArguments);
      if (treesResult.isErr()) {
        errors.push(...treesResult.error);
      } else {
        treesResult.value.trees.forEach((tree, id) => {
          document.trees.set(id, tree);
        });
        treesResult.value.nodes.forEach((node, id) => {
          document.nodes.set(id, node);
        });
      }
    }

    // Phase 4: Validate cross-references and detect cycles
    const crossRefErrors = this.validateCrossReferences(document);
    errors.push(...crossRefErrors);

    if (errors.length > 0) {
      return err(new ParseFailureError(errors));
    }

    return ok(document);
  }

  private createStatements(
    statementsData: Record<string, string>
  ): Result<Map<string, Statement>, ParseError[]> {
    const errors: ParseError[] = [];
    const statements = new Map<string, Statement>();

    for (const [id, content] of Object.entries(statementsData)) {
      const statementResult = Statement.create(content);
      if (statementResult.isErr()) {
        errors.push({
          type: ParseErrorType.INVALID_STATEMENT,
          message: `Failed to create statement: ${statementResult.error.message}`,
          section: 'statements',
          reference: id,
        });
        continue;
      }

      statements.set(id, statementResult.value);
    }

    return errors.length > 0 ? err(errors) : ok(statements);
  }

  private createOrderedSets(
    orderedSetsData: Record<string, string[]>,
    statements: Map<string, Statement>
  ): Result<Map<string, OrderedSet>, ParseError[]> {
    const errors: ParseError[] = [];
    const orderedSets = new Map<string, OrderedSet>();

    for (const [id, statementIds] of Object.entries(orderedSetsData)) {
      const validStatementIds: StatementId[] = [];

      for (const statementId of statementIds) {
        if (!statements.has(statementId)) {
          errors.push({
            type: ParseErrorType.MISSING_REFERENCE,
            message: `Statement '${statementId}' referenced in ordered set '${id}' but not defined in statements section`,
            section: 'orderedSets',
            reference: id,
          });
          continue;
        }

        const statementIdResult = StatementId.create(statementId);
        if (statementIdResult.isErr()) {
          errors.push({
            type: ParseErrorType.INVALID_ORDERED_SET,
            message: `Invalid statement ID '${statementId}': ${statementIdResult.error.message}`,
            section: 'orderedSets',
            reference: id,
          });
          continue;
        }

        validStatementIds.push(statementIdResult.value);
      }

      if (validStatementIds.length > 0) {
        const orderedSetResult = OrderedSet.create(validStatementIds);
        if (orderedSetResult.isErr()) {
          errors.push({
            type: ParseErrorType.INVALID_ORDERED_SET,
            message: `Failed to create ordered set: ${orderedSetResult.error.message}`,
            section: 'orderedSets',
            reference: id,
          });
          continue;
        }

        orderedSets.set(id, orderedSetResult.value);
      }
    }

    return errors.length > 0 ? err(errors) : ok(orderedSets);
  }

  private createAtomicArguments(
    atomicArgumentsData: Record<
      string,
      { premises?: string; conclusions?: string; sideLabel?: string }
    >,
    orderedSets: Map<string, OrderedSet>
  ): Result<Map<string, AtomicArgument>, ParseError[]> {
    const errors: ParseError[] = [];
    const atomicArguments = new Map<string, AtomicArgument>();

    for (const [id, argSpec] of Object.entries(atomicArgumentsData)) {
      let premiseSetId: string | undefined;
      let conclusionSetId: string | undefined;

      // Validate premise reference
      if (argSpec.premises) {
        if (!orderedSets.has(argSpec.premises)) {
          errors.push({
            type: ParseErrorType.MISSING_REFERENCE,
            message: `Ordered set '${argSpec.premises}' referenced as premises in argument '${id}' but not defined in orderedSets section`,
            section: 'atomicArguments',
            reference: id,
          });
        } else {
          premiseSetId = orderedSets.get(argSpec.premises)!.getId().getValue();
        }
      }

      // Validate conclusion reference
      if (argSpec.conclusions) {
        if (!orderedSets.has(argSpec.conclusions)) {
          errors.push({
            type: ParseErrorType.MISSING_REFERENCE,
            message: `Ordered set '${argSpec.conclusions}' referenced as conclusions in argument '${id}' but not defined in orderedSets section`,
            section: 'atomicArguments',
            reference: id,
          });
        } else {
          conclusionSetId = orderedSets.get(argSpec.conclusions)!.getId().getValue();
        }
      }

      // Create atomic argument with side labels
      const sideLabels = argSpec.sideLabel ? { left: argSpec.sideLabel } : {};

      // Convert string IDs to OrderedSetId types
      let premiseOrderedSetId: OrderedSetId | undefined;
      let conclusionOrderedSetId: OrderedSetId | undefined;

      if (premiseSetId) {
        const premiseIdResult = OrderedSetId.create(premiseSetId);
        if (premiseIdResult.isErr()) {
          errors.push({
            type: ParseErrorType.INVALID_ATOMIC_ARGUMENT,
            message: `Invalid premise set ID '${premiseSetId}': ${premiseIdResult.error.message}`,
            section: 'atomicArguments',
            reference: id,
          });
          continue;
        }
        premiseOrderedSetId = premiseIdResult.value;
      }

      if (conclusionSetId) {
        const conclusionIdResult = OrderedSetId.create(conclusionSetId);
        if (conclusionIdResult.isErr()) {
          errors.push({
            type: ParseErrorType.INVALID_ATOMIC_ARGUMENT,
            message: `Invalid conclusion set ID '${conclusionSetId}': ${conclusionIdResult.error.message}`,
            section: 'atomicArguments',
            reference: id,
          });
          continue;
        }
        conclusionOrderedSetId = conclusionIdResult.value;
      }

      const atomicArgumentResult = AtomicArgument.create(
        premiseOrderedSetId,
        conclusionOrderedSetId,
        sideLabels
      );

      if (atomicArgumentResult.isErr()) {
        errors.push({
          type: ParseErrorType.INVALID_ATOMIC_ARGUMENT,
          message: `Failed to create atomic argument: ${atomicArgumentResult.error.message}`,
          section: 'atomicArguments',
          reference: id,
        });
        continue;
      }

      atomicArguments.set(id, atomicArgumentResult.value);
    }

    return errors.length > 0 ? err(errors) : ok(atomicArguments);
  }

  private createArguments(
    argumentsData:
      | Record<string, { premises?: string[]; conclusions?: string[]; sideLabel?: string }>
      | Record<string, string[]>[],
    statements: Map<string, Statement>
  ): Result<Map<string, AtomicArgument>, ParseError[]> {
    const errors: ParseError[] = [];
    const argumentsMap = new Map<string, AtomicArgument>();

    // Handle array format (concise syntax)
    if (Array.isArray(argumentsData)) {
      return this.createArgumentsFromConciseFormat(argumentsData, statements);
    }

    // Handle object format (verbose syntax)
    for (const [id, argSpec] of Object.entries(argumentsData)) {
      let premiseSet: OrderedSet | undefined;
      let conclusionSet: OrderedSet | undefined;

      // Create premise OrderedSet from inline array
      if (argSpec.premises && argSpec.premises.length > 0) {
        const validPremiseIds: StatementId[] = [];
        for (const statementId of argSpec.premises) {
          if (!statements.has(statementId)) {
            errors.push({
              type: ParseErrorType.MISSING_REFERENCE,
              message: `Statement '${statementId}' referenced as premise in argument '${id}' but not defined in statements section`,
              section: 'arguments',
              reference: id,
            });
            continue;
          }

          const statementIdResult = StatementId.create(statementId);
          if (statementIdResult.isErr()) {
            errors.push({
              type: ParseErrorType.INVALID_ARGUMENT,
              message: `Invalid premise statement ID '${statementId}': ${statementIdResult.error.message}`,
              section: 'arguments',
              reference: id,
            });
            continue;
          }

          validPremiseIds.push(statementIdResult.value);
        }

        if (validPremiseIds.length > 0) {
          const premiseSetResult = OrderedSet.create(validPremiseIds);
          if (premiseSetResult.isErr()) {
            errors.push({
              type: ParseErrorType.INVALID_ARGUMENT,
              message: `Failed to create premise set for argument '${id}': ${premiseSetResult.error.message}`,
              section: 'arguments',
              reference: id,
            });
          } else {
            premiseSet = premiseSetResult.value;
          }
        }
      }

      // Create conclusion OrderedSet from inline array
      if (argSpec.conclusions && argSpec.conclusions.length > 0) {
        const validConclusionIds: StatementId[] = [];
        for (const statementId of argSpec.conclusions) {
          if (!statements.has(statementId)) {
            errors.push({
              type: ParseErrorType.MISSING_REFERENCE,
              message: `Statement '${statementId}' referenced as conclusion in argument '${id}' but not defined in statements section`,
              section: 'arguments',
              reference: id,
            });
            continue;
          }

          const statementIdResult = StatementId.create(statementId);
          if (statementIdResult.isErr()) {
            errors.push({
              type: ParseErrorType.INVALID_ARGUMENT,
              message: `Invalid conclusion statement ID '${statementId}': ${statementIdResult.error.message}`,
              section: 'arguments',
              reference: id,
            });
            continue;
          }

          validConclusionIds.push(statementIdResult.value);
        }

        if (validConclusionIds.length > 0) {
          const conclusionSetResult = OrderedSet.create(validConclusionIds);
          if (conclusionSetResult.isErr()) {
            errors.push({
              type: ParseErrorType.INVALID_ARGUMENT,
              message: `Failed to create conclusion set for argument '${id}': ${conclusionSetResult.error.message}`,
              section: 'arguments',
              reference: id,
            });
          } else {
            conclusionSet = conclusionSetResult.value;
          }
        }
      }

      // Create atomic argument with side labels
      const sideLabels = argSpec.sideLabel ? { left: argSpec.sideLabel } : {};
      const atomicArgumentResult = AtomicArgument.create(
        premiseSet?.getId(),
        conclusionSet?.getId(),
        sideLabels
      );

      if (atomicArgumentResult.isErr()) {
        errors.push({
          type: ParseErrorType.INVALID_ARGUMENT,
          message: `Failed to create argument: ${atomicArgumentResult.error.message}`,
          section: 'arguments',
          reference: id,
        });
        continue;
      }

      argumentsMap.set(id, atomicArgumentResult.value);
    }

    return errors.length > 0 ? err(errors) : ok(argumentsMap);
  }

  private createArgumentsFromConciseFormat(
    argumentsArray: Record<string, string[]>[],
    statements: Map<string, Statement>
  ): Result<Map<string, AtomicArgument>, ParseError[]> {
    const errors: ParseError[] = [];
    const argumentsMap = new Map<string, AtomicArgument>();

    for (const [index, argumentItem] of argumentsArray.entries()) {
      const keys = Object.keys(argumentItem);
      if (keys.length !== 1) {
        errors.push({
          type: ParseErrorType.INVALID_ARGUMENT,
          message: `Concise argument at index ${index} must have exactly one premise-conclusion mapping`,
          section: 'arguments',
          reference: `argument-${index}`,
        });
        continue;
      }

      const premisesKey = keys[0]!;
      const conclusionsValue = argumentItem[premisesKey]!;

      // Parse premises from key (YAML converts ['s1', 's2'] to "s1,s2")
      let premises: string[];
      if (premisesKey.includes(',')) {
        // Handle comma-separated format from YAML
        premises = premisesKey
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0);
      } else if (premisesKey.length > 0) {
        // Handle single premise
        premises = [premisesKey.trim()];
      } else {
        // Handle empty premises (bootstrap case)
        premises = [];
      }

      // Create premise OrderedSet
      let premiseSet: OrderedSet | undefined;
      if (premises.length > 0) {
        const validPremiseIds: StatementId[] = [];
        for (const statementId of premises) {
          if (!statements.has(statementId)) {
            errors.push({
              type: ParseErrorType.MISSING_REFERENCE,
              message: `Statement '${statementId}' referenced as premise in argument at index ${index} but not defined in statements section`,
              section: 'arguments',
              reference: `argument-${index}`,
            });
            continue;
          }

          const statementIdResult = StatementId.create(statementId);
          if (statementIdResult.isErr()) {
            errors.push({
              type: ParseErrorType.INVALID_ARGUMENT,
              message: `Invalid premise statement ID '${statementId}': ${statementIdResult.error.message}`,
              section: 'arguments',
              reference: `argument-${index}`,
            });
            continue;
          }

          validPremiseIds.push(statementIdResult.value);
        }

        if (validPremiseIds.length > 0) {
          const premiseSetResult = OrderedSet.create(validPremiseIds);
          if (premiseSetResult.isErr()) {
            errors.push({
              type: ParseErrorType.INVALID_ARGUMENT,
              message: `Failed to create premise set for argument at index ${index}: ${premiseSetResult.error.message}`,
              section: 'arguments',
              reference: `argument-${index}`,
            });
          } else {
            premiseSet = premiseSetResult.value;
          }
        }
      }

      // Create conclusion OrderedSet
      let conclusionSet: OrderedSet | undefined;
      if (conclusionsValue.length > 0) {
        const validConclusionIds: StatementId[] = [];
        for (const statementId of conclusionsValue) {
          if (!statements.has(statementId)) {
            errors.push({
              type: ParseErrorType.MISSING_REFERENCE,
              message: `Statement '${statementId}' referenced as conclusion in argument at index ${index} but not defined in statements section`,
              section: 'arguments',
              reference: `argument-${index}`,
            });
            continue;
          }

          const statementIdResult = StatementId.create(statementId);
          if (statementIdResult.isErr()) {
            errors.push({
              type: ParseErrorType.INVALID_ARGUMENT,
              message: `Invalid conclusion statement ID '${statementId}': ${statementIdResult.error.message}`,
              section: 'arguments',
              reference: `argument-${index}`,
            });
            continue;
          }

          validConclusionIds.push(statementIdResult.value);
        }

        if (validConclusionIds.length > 0) {
          const conclusionSetResult = OrderedSet.create(validConclusionIds);
          if (conclusionSetResult.isErr()) {
            errors.push({
              type: ParseErrorType.INVALID_ARGUMENT,
              message: `Failed to create conclusion set for argument at index ${index}: ${conclusionSetResult.error.message}`,
              section: 'arguments',
              reference: `argument-${index}`,
            });
          } else {
            conclusionSet = conclusionSetResult.value;
          }
        }
      }

      // Create atomic argument (no side labels for concise format)
      const atomicArgumentResult = AtomicArgument.create(
        premiseSet?.getId(),
        conclusionSet?.getId(),
        {}
      );

      if (atomicArgumentResult.isErr()) {
        errors.push({
          type: ParseErrorType.INVALID_ARGUMENT,
          message: `Failed to create argument at index ${index}: ${atomicArgumentResult.error.message}`,
          section: 'arguments',
          reference: `argument-${index}`,
        });
        continue;
      }

      // Generate auto ID for concise arguments
      const autoId = `arg${index + 1}`;
      argumentsMap.set(autoId, atomicArgumentResult.value);
    }

    return errors.length > 0 ? err(errors) : ok(argumentsMap);
  }

  private createTreesAndNodes(
    treesData: Record<
      string,
      { offset?: { x: number; y: number }; nodes?: Record<string, NodeSpec> }
    >,
    atomicArguments: Map<string, AtomicArgument>
  ): Result<{ trees: Map<string, Tree>; nodes: Map<string, Node> }, ParseError[]> {
    const errors: ParseError[] = [];
    const trees = new Map<string, Tree>();
    const nodes = new Map<string, Node>();

    for (const [treeId, treeSpec] of Object.entries(treesData)) {
      // Create tree with position
      const position = treeSpec.offset
        ? Position2D.create(treeSpec.offset.x, treeSpec.offset.y)
        : Position2D.create(0, 0);

      if (position.isErr()) {
        errors.push({
          type: ParseErrorType.INVALID_TREE_STRUCTURE,
          message: `Invalid tree position: ${position.error.message}`,
          section: 'trees',
          reference: treeId,
        });
        continue;
      }

      const treeResult = Tree.create('document', position.value);
      if (treeResult.isErr()) {
        errors.push({
          type: ParseErrorType.INVALID_TREE_STRUCTURE,
          message: `Failed to create tree: ${treeResult.error.message}`,
          section: 'trees',
          reference: treeId,
        });
        continue;
      }

      const tree = treeResult.value;
      trees.set(treeId, tree);

      // Create nodes for this tree
      if (treeSpec.nodes) {
        const nodesResult = this.createNodesForTree(treeSpec.nodes, atomicArguments, tree);
        if (nodesResult.isErr()) {
          errors.push(...nodesResult.error);
        } else {
          nodesResult.value.forEach((node, nodeId) => {
            nodes.set(nodeId, node);
            // Add node to tree
            const nodeIdObj = NodeId.create(nodeId);
            if (nodeIdObj.isOk()) {
              tree.addNode(nodeIdObj.value);
            }
          });
        }
      }
    }

    return errors.length > 0 ? err(errors) : ok({ trees, nodes });
  }

  private createNodesForTree(
    nodesData: Record<string, NodeSpec>,
    atomicArguments: Map<string, AtomicArgument>,
    tree: Tree
  ): Result<Map<string, Node>, ParseError[]> {
    const errors: ParseError[] = [];
    const nodes = new Map<string, Node>();

    // First pass: Create all nodes without attachments
    for (const [nodeId, nodeSpec] of Object.entries(nodesData)) {
      // Extract argument ID - either from 'arg' property or as value of parent key
      const argumentId = this.extractArgumentId(nodeSpec);
      if (!argumentId) {
        errors.push({
          type: ParseErrorType.INVALID_TREE_STRUCTURE,
          message: `Node '${nodeId}' must specify an argument (either 'arg' property or as parent key value)`,
          section: 'trees',
          reference: `${tree.getId().getValue()}.${nodeId}`,
        });
        continue;
      }

      if (!atomicArguments.has(argumentId)) {
        errors.push({
          type: ParseErrorType.MISSING_REFERENCE,
          message: `Argument '${argumentId}' referenced in node '${nodeId}' but not defined in arguments section`,
          section: 'trees',
          reference: `${tree.getId().getValue()}.${nodeId}`,
        });
        continue;
      }

      const argumentIdResult = AtomicArgumentId.create(argumentId);
      if (argumentIdResult.isErr()) {
        errors.push({
          type: ParseErrorType.INVALID_TREE_STRUCTURE,
          message: `Invalid atomic argument reference '${argumentId}': ${argumentIdResult.error.message}`,
          section: 'trees',
          reference: `${tree.getId().getValue()}.${nodeId}`,
        });
        continue;
      }

      // Determine if this is a root node (no parent specified) or child node
      const isRootNode = this.isRootNode(nodeSpec);

      let nodeResult: Result<Node, ValidationError>;
      if (isRootNode) {
        nodeResult = Node.createRoot(argumentIdResult.value);
      } else {
        // For child nodes, we'll create the attachment in the second pass
        // For now, create as root and update later
        nodeResult = Node.createRoot(argumentIdResult.value);
      }

      if (nodeResult.isErr()) {
        errors.push({
          type: ParseErrorType.INVALID_TREE_STRUCTURE,
          message: `Failed to create node: ${nodeResult.error.message}`,
          section: 'trees',
          reference: `${tree.getId().getValue()}.${nodeId}`,
        });
        continue;
      }

      nodes.set(nodeId, nodeResult.value);
    }

    // Second pass: Set up attachments for child nodes
    for (const [nodeId, nodeSpec] of Object.entries(nodesData)) {
      if (this.isRootNode(nodeSpec)) {
        continue; // Skip root nodes
      }

      const node = nodes.get(nodeId);
      if (!node) {
        continue; // Skip if node creation failed
      }

      const attachmentResult = this.createAttachment(nodeSpec, nodes, tree.getId().getValue());
      if (attachmentResult.isErr()) {
        errors.push(...attachmentResult.error);
        continue;
      }

      const attachResult = node.attachToParent(attachmentResult.value);
      if (attachResult.isErr()) {
        errors.push({
          type: ParseErrorType.INVALID_TREE_STRUCTURE,
          message: `Failed to attach node to parent: ${attachResult.error.message}`,
          section: 'trees',
          reference: `${tree.getId().getValue()}.${nodeId}`,
        });
      }
    }

    return errors.length > 0 ? err(errors) : ok(nodes);
  }

  private isRootNode(nodeSpec: NodeSpec): boolean {
    // A node is root if it only has 'arg' property and no parent references
    const keys = Object.keys(nodeSpec);
    return keys.length === 1 && keys[0] === 'arg';
  }

  private extractArgumentId(nodeSpec: NodeSpec): string | undefined {
    // First try 'arg' property (root node format)
    if (nodeSpec.arg) {
      return nodeSpec.arg;
    }

    // For child nodes, find the parent key that has a string value (the argument ID)
    for (const [key, value] of Object.entries(nodeSpec)) {
      if (key !== 'on' && typeof value === 'string') {
        return value;
      }
    }

    return undefined;
  }

  private createAttachment(
    nodeSpec: NodeSpec,
    nodes: Map<string, Node>,
    treeId: string
  ): Result<Attachment, ParseError[]> {
    const errors: ParseError[] = [];

    // Find parent node ID and position
    let parentNodeId: string | undefined;
    let position: number | undefined;
    let fromPosition: number | undefined;

    for (const [key, value] of Object.entries(nodeSpec)) {
      if (key === 'arg') continue;

      if (key === 'on') {
        if (typeof value === 'number') {
          position = value;
        } else if (typeof value === 'string') {
          // Handle "from:to" format
          const parts = value.split(':');
          if (parts.length === 2) {
            fromPosition = parseInt(parts[0]!, 10);
            position = parseInt(parts[1]!, 10);
          } else {
            position = parseInt(value, 10);
          }
        }
        continue;
      }

      // This key should be a parent node ID
      if (typeof value === 'string') {
        // Format: { parentNodeId: argumentId, on: position }
        parentNodeId = key;
      } else if (typeof value === 'number') {
        // Format: { parentNodeId: position } (old format)
        parentNodeId = key;
        position ??= value;
      }
    }

    if (!parentNodeId) {
      errors.push({
        type: ParseErrorType.INVALID_TREE_STRUCTURE,
        message: 'Child node must specify a parent node ID',
        section: 'trees',
        reference: treeId,
      });
      return err(errors);
    }

    if (position === undefined || isNaN(position)) {
      errors.push({
        type: ParseErrorType.INVALID_TREE_STRUCTURE,
        message: 'Child node must specify a valid position',
        section: 'trees',
        reference: treeId,
      });
      return err(errors);
    }

    if (!nodes.has(parentNodeId)) {
      errors.push({
        type: ParseErrorType.MISSING_REFERENCE,
        message: `Parent node '${parentNodeId}' not found`,
        section: 'trees',
        reference: treeId,
      });
      return err(errors);
    }

    const parentNodeIdObj = NodeId.create(parentNodeId);
    if (parentNodeIdObj.isErr()) {
      errors.push({
        type: ParseErrorType.INVALID_TREE_STRUCTURE,
        message: `Invalid parent node ID '${parentNodeId}': ${parentNodeIdObj.error.message}`,
        section: 'trees',
        reference: treeId,
      });
      return err(errors);
    }

    const attachmentResult = Attachment.create(parentNodeIdObj.value, position, fromPosition);
    if (attachmentResult.isErr()) {
      errors.push({
        type: ParseErrorType.INVALID_TREE_STRUCTURE,
        message: `Failed to create attachment: ${attachmentResult.error.message}`,
        section: 'trees',
        reference: treeId,
      });
      return err(errors);
    }

    return ok(attachmentResult.value);
  }

  private validateCrossReferences(_document: ProofDocument): ParseError[] {
    const errors: ParseError[] = [];

    // Cross-reference validation is now handled during argument creation
    // since we directly validate statement references when creating OrderedSets
    // Additional validation can be added here for other cross-references

    return errors;
  }
}

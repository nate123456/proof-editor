import { err, ok, type Result } from 'neverthrow';

import { type ParseError, ParseErrorType } from './ParseError.js';
import type { NodeSpec, ParsedYAMLStructure } from './ProofDocument.js';

export class YAMLValidator {
  validateStructure(parsedData: unknown): Result<ParsedYAMLStructure, ParseError[]> {
    const errors: ParseError[] = [];

    // Handle null case (empty YAML or comments-only) as valid empty document
    if (parsedData === null || parsedData === undefined) {
      return ok({});
    }

    if (typeof parsedData !== 'object') {
      errors.push({
        type: ParseErrorType.INVALID_STRUCTURE,
        message: 'Root element must be an object',
        section: 'root',
      });
      return err(errors);
    }

    const data = parsedData as Record<string, unknown>;
    const result: ParsedYAMLStructure = {};

    // Validate statements section
    if (data.statements !== undefined) {
      const statementsValidation = this.validateStatements(data.statements);
      if (statementsValidation.isErr()) {
        errors.push(...statementsValidation.error);
      } else {
        result.statements = statementsValidation.value;
      }
    }

    // Validate orderedSets section
    if (data.orderedSets !== undefined) {
      const orderedSetsValidation = this.validateOrderedSets(data.orderedSets);
      if (orderedSetsValidation.isErr()) {
        errors.push(...orderedSetsValidation.error);
      } else {
        result.orderedSets = orderedSetsValidation.value;
      }
    }

    // Validate atomicArguments section
    if (data.atomicArguments !== undefined) {
      const atomicArgumentsValidation = this.validateAtomicArguments(data.atomicArguments);
      if (atomicArgumentsValidation.isErr()) {
        errors.push(...atomicArgumentsValidation.error);
      } else {
        result.atomicArguments = atomicArgumentsValidation.value;
      }
    }

    // Validate arguments section (new format)
    if (data.arguments !== undefined) {
      const argumentsValidation = this.validateArguments(data.arguments);
      if (argumentsValidation.isErr()) {
        errors.push(...argumentsValidation.error);
      } else {
        result.arguments = argumentsValidation.value;
      }
    }

    // Validate trees section
    if (data.trees !== undefined) {
      const treesValidation = this.validateTrees(data.trees);
      if (treesValidation.isErr()) {
        errors.push(...treesValidation.error);
      } else {
        result.trees = treesValidation.value;
      }
    }

    if (errors.length > 0) {
      return err(errors);
    }

    return ok(result);
  }

  private validateStatements(statements: unknown): Result<Record<string, string>, ParseError[]> {
    const errors: ParseError[] = [];

    // Handle null/undefined as empty valid section
    if (statements === null || statements === undefined) {
      return ok({});
    }

    if (typeof statements !== 'object') {
      errors.push({
        type: ParseErrorType.INVALID_STRUCTURE,
        message: 'Statements section must be an object',
        section: 'statements',
      });
      return err(errors);
    }

    const statementsObj = statements as Record<string, unknown>;
    const result: Record<string, string> = {};

    for (const [id, content] of Object.entries(statementsObj)) {
      if (typeof content !== 'string') {
        errors.push({
          type: ParseErrorType.INVALID_STATEMENT,
          message: `Statement content must be a string, got ${typeof content}`,
          section: 'statements',
          reference: id,
        });
        continue;
      }

      if (content.trim().length === 0) {
        errors.push({
          type: ParseErrorType.INVALID_STATEMENT,
          message: 'Statement content cannot be empty',
          section: 'statements',
          reference: id,
        });
        continue;
      }

      result[id] = content;
    }

    return errors.length > 0 ? err(errors) : ok(result);
  }

  private validateArguments(
    argumentsData: unknown,
  ): Result<
    Record<string, { premises?: string[]; conclusions?: string[]; sideLabel?: string }>,
    ParseError[]
  > {
    const errors: ParseError[] = [];

    // Handle null/undefined as empty valid section
    if (argumentsData === null || argumentsData === undefined) {
      return ok({});
    }

    if (typeof argumentsData !== 'object') {
      errors.push({
        type: ParseErrorType.INVALID_STRUCTURE,
        message: 'Arguments section must be an object or array',
        section: 'arguments',
      });
      return err(errors);
    }

    // Handle array format: [{ [premises]: [conclusions] }, ...]
    if (Array.isArray(argumentsData)) {
      return this.validateConciseArguments(argumentsData);
    }

    // Handle object format: { argId: { premises: [...], conclusions: [...] } }
    const argumentsObj = argumentsData as Record<string, unknown>;
    const result: Record<
      string,
      { premises?: string[]; conclusions?: string[]; sideLabel?: string }
    > = {};

    for (const [id, argumentSpec] of Object.entries(argumentsObj)) {
      // Handle null case (bootstrap arguments with only comments)
      if (argumentSpec === null || argumentSpec === undefined) {
        result[id] = {}; // Empty spec for bootstrap arguments
        continue;
      }

      if (typeof argumentSpec !== 'object') {
        errors.push({
          type: ParseErrorType.INVALID_ARGUMENT,
          message: `Argument spec must be an object, got ${typeof argumentSpec}`,
          section: 'arguments',
          reference: id,
        });
        continue;
      }

      const spec = argumentSpec as Record<string, unknown>;
      const resultSpec: { premises?: string[]; conclusions?: string[]; sideLabel?: string } = {};

      // Validate premises array
      if (spec.premises !== undefined) {
        if (!Array.isArray(spec.premises)) {
          errors.push({
            type: ParseErrorType.INVALID_ARGUMENT,
            message: `Premises must be an array, got ${typeof spec.premises}`,
            section: 'arguments',
            reference: id,
          });
        } else {
          const validPremises: string[] = [];
          for (const [index, premise] of spec.premises.entries()) {
            if (typeof premise !== 'string') {
              errors.push({
                type: ParseErrorType.INVALID_ARGUMENT,
                message: `Premise at index ${index} must be a string, got ${typeof premise}`,
                section: 'arguments',
                reference: id,
              });
              continue;
            }
            if (premise.trim().length === 0) {
              errors.push({
                type: ParseErrorType.INVALID_ARGUMENT,
                message: `Premise at index ${index} cannot be empty`,
                section: 'arguments',
                reference: id,
              });
              continue;
            }
            validPremises.push(premise.trim());
          }
          resultSpec.premises = validPremises;
        }
      }

      // Validate conclusions array
      if (spec.conclusions !== undefined) {
        if (!Array.isArray(spec.conclusions)) {
          errors.push({
            type: ParseErrorType.INVALID_ARGUMENT,
            message: `Conclusions must be an array, got ${typeof spec.conclusions}`,
            section: 'arguments',
            reference: id,
          });
        } else {
          const validConclusions: string[] = [];
          for (const [index, conclusion] of spec.conclusions.entries()) {
            if (typeof conclusion !== 'string') {
              errors.push({
                type: ParseErrorType.INVALID_ARGUMENT,
                message: `Conclusion at index ${index} must be a string, got ${typeof conclusion}`,
                section: 'arguments',
                reference: id,
              });
              continue;
            }
            if (conclusion.trim().length === 0) {
              errors.push({
                type: ParseErrorType.INVALID_ARGUMENT,
                message: `Conclusion at index ${index} cannot be empty`,
                section: 'arguments',
                reference: id,
              });
              continue;
            }
            validConclusions.push(conclusion.trim());
          }
          resultSpec.conclusions = validConclusions;
        }
      }

      // Validate sideLabel
      if (spec.sideLabel !== undefined) {
        if (typeof spec.sideLabel !== 'string') {
          errors.push({
            type: ParseErrorType.INVALID_ARGUMENT,
            message: `Side label must be a string, got ${typeof spec.sideLabel}`,
            section: 'arguments',
            reference: id,
          });
        } else {
          resultSpec.sideLabel = spec.sideLabel;
        }
      }

      result[id] = resultSpec;
    }

    return errors.length > 0 ? err(errors) : ok(result);
  }

  private validateOrderedSets(
    orderedSets: unknown,
  ): Result<Record<string, string[]>, ParseError[]> {
    const errors: ParseError[] = [];

    // Handle null/undefined as empty valid section
    if (orderedSets === null || orderedSets === undefined) {
      return ok({});
    }

    if (typeof orderedSets !== 'object') {
      errors.push({
        type: ParseErrorType.INVALID_STRUCTURE,
        message: 'OrderedSets section must be an object',
        section: 'orderedSets',
      });
      return err(errors);
    }

    const orderedSetsObj = orderedSets as Record<string, unknown>;
    const result: Record<string, string[]> = {};

    for (const [id, setArray] of Object.entries(orderedSetsObj)) {
      if (!Array.isArray(setArray)) {
        errors.push({
          type: ParseErrorType.INVALID_ORDERED_SET,
          message: `Ordered set must be an array, got ${typeof setArray}`,
          section: 'orderedSets',
          reference: id,
        });
        continue;
      }

      const validStatements: string[] = [];
      for (const [index, statement] of setArray.entries()) {
        if (typeof statement !== 'string') {
          errors.push({
            type: ParseErrorType.INVALID_ORDERED_SET,
            message: `Statement at index ${index} must be a string, got ${typeof statement}`,
            section: 'orderedSets',
            reference: id,
          });
          continue;
        }
        if (statement.trim().length === 0) {
          errors.push({
            type: ParseErrorType.INVALID_ORDERED_SET,
            message: `Statement at index ${index} cannot be empty`,
            section: 'orderedSets',
            reference: id,
          });
          continue;
        }
        validStatements.push(statement.trim());
      }
      result[id] = validStatements;
    }

    return errors.length > 0 ? err(errors) : ok(result);
  }

  private validateAtomicArguments(
    atomicArguments: unknown,
  ): Result<
    Record<string, { premises?: string; conclusions?: string; sideLabel?: string }>,
    ParseError[]
  > {
    const errors: ParseError[] = [];

    // Handle null/undefined as empty valid section
    if (atomicArguments === null || atomicArguments === undefined) {
      return ok({});
    }

    if (typeof atomicArguments !== 'object') {
      errors.push({
        type: ParseErrorType.INVALID_STRUCTURE,
        message: 'AtomicArguments section must be an object',
        section: 'atomicArguments',
      });
      return err(errors);
    }

    const atomicArgumentsObj = atomicArguments as Record<string, unknown>;
    const result: Record<string, { premises?: string; conclusions?: string; sideLabel?: string }> =
      {};

    for (const [id, argumentSpec] of Object.entries(atomicArgumentsObj)) {
      // Handle null case (bootstrap arguments with only comments)
      if (argumentSpec === null || argumentSpec === undefined) {
        result[id] = {}; // Empty spec for bootstrap arguments
        continue;
      }

      if (typeof argumentSpec !== 'object') {
        errors.push({
          type: ParseErrorType.INVALID_ATOMIC_ARGUMENT,
          message: `Atomic argument spec must be an object, got ${typeof argumentSpec}`,
          section: 'atomicArguments',
          reference: id,
        });
        continue;
      }

      const spec = argumentSpec as Record<string, unknown>;
      const resultSpec: { premises?: string; conclusions?: string; sideLabel?: string } = {};

      // Validate premises reference
      if (spec.premises !== undefined) {
        if (typeof spec.premises !== 'string') {
          errors.push({
            type: ParseErrorType.INVALID_ATOMIC_ARGUMENT,
            message: `Premises must be a string reference, got ${typeof spec.premises}`,
            section: 'atomicArguments',
            reference: id,
          });
        } else {
          resultSpec.premises = spec.premises.trim();
        }
      }

      // Validate conclusions reference
      if (spec.conclusions !== undefined) {
        if (typeof spec.conclusions !== 'string') {
          errors.push({
            type: ParseErrorType.INVALID_ATOMIC_ARGUMENT,
            message: `Conclusions must be a string reference, got ${typeof spec.conclusions}`,
            section: 'atomicArguments',
            reference: id,
          });
        } else {
          resultSpec.conclusions = spec.conclusions.trim();
        }
      }

      // Validate sideLabel
      if (spec.sideLabel !== undefined) {
        if (typeof spec.sideLabel !== 'string') {
          errors.push({
            type: ParseErrorType.INVALID_ATOMIC_ARGUMENT,
            message: `Side label must be a string, got ${typeof spec.sideLabel}`,
            section: 'atomicArguments',
            reference: id,
          });
        } else {
          resultSpec.sideLabel = spec.sideLabel;
        }
      }

      result[id] = resultSpec;
    }

    return errors.length > 0 ? err(errors) : ok(result);
  }

  private validateConciseArguments(
    argumentsArray: unknown[],
  ): Result<
    Record<string, { premises?: string[]; conclusions?: string[]; sideLabel?: string }>,
    ParseError[]
  > {
    const errors: ParseError[] = [];
    const result: Record<
      string,
      { premises?: string[]; conclusions?: string[]; sideLabel?: string }
    > = {};

    for (const [index, argumentItem] of argumentsArray.entries()) {
      if (!argumentItem || typeof argumentItem !== 'object' || Array.isArray(argumentItem)) {
        errors.push({
          type: ParseErrorType.INVALID_ARGUMENT,
          message: `Argument at index ${index} must be an object with premise-conclusion mapping`,
          section: 'arguments',
          reference: `argument-${index}`,
        });
        continue;
      }

      const argumentObj = argumentItem as Record<string, unknown>;
      const keys = Object.keys(argumentObj);

      // Each concise argument should have exactly one key-value pair: [premises]: [conclusions]
      if (keys.length !== 1) {
        errors.push({
          type: ParseErrorType.INVALID_ARGUMENT,
          message: `Concise argument at index ${index} must have exactly one premise-conclusion mapping`,
          section: 'arguments',
          reference: `argument-${index}`,
        });
        continue;
      }

      const premisesKey = keys[0];
      if (!premisesKey) {
        errors.push({
          type: ParseErrorType.INVALID_ARGUMENT,
          message: `Concise argument at index ${index} has no premise key`,
          section: 'arguments',
          reference: `argument-${index}`,
        });
        continue;
      }
      const conclusionsValue = argumentObj[premisesKey];

      // Parse premises from key (YAML converts ['s1', 's2'] to "s1,s2")
      let premises: string[];
      if (premisesKey.includes(',')) {
        // Handle comma-separated format from YAML
        premises = premisesKey
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      } else if (premisesKey.length > 0) {
        // Handle single premise
        premises = [premisesKey.trim()];
      } else {
        // Handle empty premises (bootstrap case)
        premises = [];
      }

      // Validate conclusions value (should be array)
      if (!Array.isArray(conclusionsValue)) {
        errors.push({
          type: ParseErrorType.INVALID_ARGUMENT,
          message: `Conclusions at index ${index} must be an array`,
          section: 'arguments',
          reference: `argument-${index}`,
        });
        continue;
      }

      // Validate premise strings (skip validation for empty premises - bootstrap case)
      const validPremises: string[] = [];
      if (premises.length > 0) {
        for (const [premiseIndex, premise] of premises.entries()) {
          if (typeof premise !== 'string') {
            errors.push({
              type: ParseErrorType.INVALID_ARGUMENT,
              message: `Premise at index ${premiseIndex} in argument ${index} must be a string`,
              section: 'arguments',
              reference: `argument-${index}`,
            });
            continue;
          }
          if (premise.trim().length === 0) {
            errors.push({
              type: ParseErrorType.INVALID_ARGUMENT,
              message: `Premise at index ${premiseIndex} in argument ${index} cannot be empty`,
              section: 'arguments',
              reference: `argument-${index}`,
            });
            continue;
          }
          // Validate that premise looks like a valid statement ID
          const trimmedPremise = premise.trim();
          if (!this.isValidStatementId(trimmedPremise)) {
            errors.push({
              type: ParseErrorType.INVALID_ARGUMENT,
              message: `Premise '${trimmedPremise}' in argument ${index} must be a valid statement ID`,
              section: 'arguments',
              reference: `argument-${index}`,
            });
            continue;
          }
          validPremises.push(trimmedPremise);
        }
      }

      // Validate conclusion strings
      const validConclusions: string[] = [];
      for (const [conclusionIndex, conclusion] of conclusionsValue.entries()) {
        if (typeof conclusion !== 'string') {
          errors.push({
            type: ParseErrorType.INVALID_ARGUMENT,
            message: `Conclusion at index ${conclusionIndex} in argument ${index} must be a string`,
            section: 'arguments',
            reference: `argument-${index}`,
          });
          continue;
        }
        if (conclusion.trim().length === 0) {
          errors.push({
            type: ParseErrorType.INVALID_ARGUMENT,
            message: `Conclusion at index ${conclusionIndex} in argument ${index} cannot be empty`,
            section: 'arguments',
            reference: `argument-${index}`,
          });
          continue;
        }
        // Validate that conclusion looks like a valid statement ID
        const trimmedConclusion = conclusion.trim();
        if (!this.isValidStatementId(trimmedConclusion)) {
          errors.push({
            type: ParseErrorType.INVALID_ARGUMENT,
            message: `Conclusion '${trimmedConclusion}' in argument ${index} must be a valid statement ID`,
            section: 'arguments',
            reference: `argument-${index}`,
          });
          continue;
        }
        validConclusions.push(trimmedConclusion);
      }

      // Generate auto ID for concise arguments
      const autoId = `arg${index + 1}`;
      result[autoId] = {
        premises: validPremises,
        conclusions: validConclusions,
      };
    }

    return errors.length > 0 ? err(errors) : ok(result);
  }

  private validateTrees(
    trees: unknown,
  ): Result<
    Record<string, { offset?: { x: number; y: number }; nodes?: Record<string, NodeSpec> }>,
    ParseError[]
  > {
    const errors: ParseError[] = [];

    // Handle null/undefined as empty valid section
    if (trees === null || trees === undefined) {
      return ok({});
    }

    if (typeof trees !== 'object') {
      errors.push({
        type: ParseErrorType.INVALID_STRUCTURE,
        message: 'Trees section must be an object',
        section: 'trees',
      });
      return err(errors);
    }

    const treesObj = trees as Record<string, unknown>;
    const result: Record<
      string,
      { offset?: { x: number; y: number }; nodes?: Record<string, NodeSpec> }
    > = {};

    for (const [id, treeSpec] of Object.entries(treesObj)) {
      if (!treeSpec || typeof treeSpec !== 'object') {
        errors.push({
          type: ParseErrorType.INVALID_TREE_STRUCTURE,
          message: `Tree spec must be an object, got ${typeof treeSpec}`,
          section: 'trees',
          reference: id,
        });
        continue;
      }

      const spec = treeSpec as Record<string, unknown>;
      const resultSpec: { offset?: { x: number; y: number }; nodes?: Record<string, NodeSpec> } =
        {};

      // Validate offset
      if (spec.offset !== undefined) {
        const offsetValidation = this.validateOffset(spec.offset, id);
        if (offsetValidation.isErr()) {
          errors.push(...offsetValidation.error);
        } else {
          resultSpec.offset = offsetValidation.value;
        }
      }

      // Validate nodes
      if (spec.nodes !== undefined) {
        const nodesValidation = this.validateTreeNodes(spec.nodes, id);
        if (nodesValidation.isErr()) {
          errors.push(...nodesValidation.error);
        } else {
          resultSpec.nodes = nodesValidation.value;
        }
      }

      result[id] = resultSpec;
    }

    return errors.length > 0 ? err(errors) : ok(result);
  }

  private validateOffset(
    offset: unknown,
    treeId: string,
  ): Result<{ x: number; y: number }, ParseError[]> {
    const errors: ParseError[] = [];

    if (!offset || typeof offset !== 'object') {
      errors.push({
        type: ParseErrorType.INVALID_TREE_STRUCTURE,
        message: `Tree offset must be an object with x and y properties`,
        section: 'trees',
        reference: treeId,
      });
      return err(errors);
    }

    const offsetObj = offset as Record<string, unknown>;

    if (typeof offsetObj.x !== 'number') {
      errors.push({
        type: ParseErrorType.INVALID_TREE_STRUCTURE,
        message: `Tree offset.x must be a number, got ${typeof offsetObj.x}`,
        section: 'trees',
        reference: treeId,
      });
    }

    if (typeof offsetObj.y !== 'number') {
      errors.push({
        type: ParseErrorType.INVALID_TREE_STRUCTURE,
        message: `Tree offset.y must be a number, got ${typeof offsetObj.y}`,
        section: 'trees',
        reference: treeId,
      });
    }

    if (errors.length > 0) {
      return err(errors);
    }

    return ok({ x: offsetObj.x as number, y: offsetObj.y as number });
  }

  private validateTreeNodes(
    nodes: unknown,
    treeId: string,
  ): Result<Record<string, NodeSpec>, ParseError[]> {
    const errors: ParseError[] = [];

    if (!nodes || typeof nodes !== 'object') {
      errors.push({
        type: ParseErrorType.INVALID_TREE_STRUCTURE,
        message: `Tree nodes must be an object`,
        section: 'trees',
        reference: treeId,
      });
      return err(errors);
    }

    const nodesObj = nodes as Record<string, unknown>;
    const result: Record<string, NodeSpec> = {};

    for (const [nodeId, nodeSpec] of Object.entries(nodesObj)) {
      if (!nodeSpec || typeof nodeSpec !== 'object') {
        errors.push({
          type: ParseErrorType.INVALID_TREE_STRUCTURE,
          message: `Node spec must be an object, got ${typeof nodeSpec}`,
          section: 'trees',
          reference: `${treeId}.${nodeId}`,
        });
        continue;
      }

      result[nodeId] = nodeSpec as NodeSpec;
    }

    return errors.length > 0 ? err(errors) : ok(result);
  }

  private isValidStatementId(id: string): boolean {
    // Statement IDs should be non-empty strings that could reasonably be identifiers
    // Common patterns: s1, s2, premise1, conclusion1, etc.
    // Avoid accepting clearly invalid formats like "invalid_format" which suggests user error
    if (id.length === 0) {
      return false;
    }

    // Check if it's a simple alphanumeric identifier (possibly with underscores)
    // But reject overly generic names that suggest the user meant to use array syntax
    const validIdPattern = /^[a-zA-Z][a-zA-Z0-9_]*$/;
    if (!validIdPattern.test(id)) {
      return false;
    }

    // Reject obviously invalid formats that suggest user confusion
    const invalidPatterns = [/^invalid/i, /^format/i, /^example/i, /^test/i, /^placeholder/i];

    return !invalidPatterns.some((pattern) => pattern.test(id));
  }
}

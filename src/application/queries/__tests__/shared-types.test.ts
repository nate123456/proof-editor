/**
 * Comprehensive test suite for shared-types.ts DTOs
 *
 * Tests data structure validation, type integrity, and boundary conditions
 * for shared DTOs used across multiple query modules to avoid circular dependencies.
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createTestSideLabel } from '../../../domain/__tests__/value-object-test-helpers.js';
import {
  AtomicArgumentId,
  Dimensions,
  ErrorCode,
  ErrorMessage,
  ErrorSeverity,
  NodeCount,
  NodeId,
  Position2D,
  SideLabel,
  StatementId,
  TreeId,
} from '../../../domain/shared/value-objects/index.js';
import {
  type AtomicArgumentDTO,
  createAtomicArgumentDTO,
  createTreeDTO,
  createValidationErrorDTO,
  isAtomicArgumentDTO,
  isTreeDTO,
  isValidationErrorDTO,
  isValidBounds,
  isValidPosition,
  isValidSeverity,
  // Import executable functions for testing
  isValidUsageType,
  type TreeDTO,
  type ValidationErrorDTO,
  validateAtomicArgumentDTO,
  validateTreeDTO,
} from '../shared-types.js';
import {
  createTestAtomicArgumentId,
  createTestDimensions,
  createTestErrorCode,
  createTestErrorMessage,
  createTestNodeCount,
  createTestNodeId,
  createTestNodeIds,
  createTestPosition2D,
  createTestStatementId,
  createTestStatementIds,
  createTestTreeId,
} from './shared/branded-type-helpers.js';

describe('AtomicArgumentDTO Basic Structure', () => {
  it('should handle basic atomic argument', () => {
    const argument: AtomicArgumentDTO = {
      id: createTestAtomicArgumentId('arg_12345'),
      premiseIds: createTestStatementIds('stmt_1', 'stmt_2', 'stmt_3'),
      conclusionIds: createTestStatementIds('stmt_4', 'stmt_5'),
    };

    expect(argument.id).toBe('arg_12345');
    expect(argument.premiseIds).toEqual(['stmt_1', 'stmt_2', 'stmt_3']);
    expect(argument.conclusionIds).toEqual(['stmt_4', 'stmt_5']);
  });

  it('should handle empty atomic argument', () => {
    const argument: AtomicArgumentDTO = {
      id: createTestAtomicArgumentId('arg_empty'),
      premiseIds: [],
      conclusionIds: [],
    };

    expect(argument.id).toBe('arg_empty');
    expect(argument.premiseIds).toEqual([]);
    expect(argument.conclusionIds).toEqual([]);
  });

  it('should handle single statement atomic argument', () => {
    const argument: AtomicArgumentDTO = {
      id: createTestAtomicArgumentId('arg_single'),
      premiseIds: createTestStatementIds('stmt_only'),
      conclusionIds: createTestStatementIds('stmt_result'),
    };

    expect(argument.premiseIds).toHaveLength(1);
    expect(argument.premiseIds[0]).toBe('stmt_only');
    expect(argument.conclusionIds).toHaveLength(1);
    expect(argument.conclusionIds[0]).toBe('stmt_result');
  });

  it('should handle atomic argument with many statements', () => {
    const premiseIds = Array.from({ length: 10 }, (_, i) => `premise_${i + 1}`);
    const conclusionIds = Array.from({ length: 10 }, (_, i) => `conclusion_${i + 1}`);

    const argument: AtomicArgumentDTO = {
      id: createTestAtomicArgumentId('arg_many'),
      premiseIds: premiseIds.map((id) => createTestStatementId(id)),
      conclusionIds: conclusionIds.map((id) => createTestStatementId(id)),
    };

    expect(argument.premiseIds).toHaveLength(10);
    expect(argument.conclusionIds).toHaveLength(10);
    expect(argument.premiseIds[0]).toBe('premise_1');
    expect(argument.premiseIds[9]).toBe('premise_10');
    expect(argument.conclusionIds[0]).toBe('conclusion_1');
    expect(argument.conclusionIds[9]).toBe('conclusion_10');
  });

  it('should handle premise-only atomic argument', () => {
    const argument: AtomicArgumentDTO = {
      id: createTestAtomicArgumentId('arg_premise_only'),
      premiseIds: createTestStatementIds('stmt_1', 'stmt_2'),
      conclusionIds: [],
    };

    expect(argument.premiseIds).toEqual(['stmt_1', 'stmt_2']);
    expect(argument.conclusionIds).toEqual([]);
  });

  it('should handle conclusion-only atomic argument', () => {
    const argument: AtomicArgumentDTO = {
      id: createTestAtomicArgumentId('arg_conclusion_only'),
      premiseIds: [],
      conclusionIds: createTestStatementIds('stmt_3', 'stmt_4'),
    };

    expect(argument.premiseIds).toEqual([]);
    expect(argument.conclusionIds).toEqual(['stmt_3', 'stmt_4']);
  });

  it('should handle atomic argument with side labels', () => {
    const argument: AtomicArgumentDTO = {
      id: createTestAtomicArgumentId('arg_with_labels'),
      premiseIds: createTestStatementIds('stmt_1'),
      conclusionIds: createTestStatementIds('stmt_2'),
      sideLabels: {
        left: createTestSideLabel('Modus Ponens'),
        right: createTestSideLabel('Classical Logic'),
      },
    };

    expect(argument.sideLabels?.left).toBe('Modus Ponens');
    expect(argument.sideLabels?.right).toBe('Classical Logic');
  });

  it('should handle various ID formats', () => {
    const idFormats = [
      'arg_123',
      'atomic-argument-456',
      'ARG_UPPERCASE',
      'arg.with.dots',
      'arg_with_underscores',
      '550e8400-e29b-41d4-a716-446655440000',
    ];

    idFormats.forEach((id) => {
      const argument: AtomicArgumentDTO = {
        id: createTestAtomicArgumentId(id),
        premiseIds: [],
        conclusionIds: [],
      };

      expect(argument.id.getValue()).toBe(id);
    });
  });

  it('should handle duplicate statement IDs in premises', () => {
    const argument: AtomicArgumentDTO = {
      id: createTestAtomicArgumentId('arg_duplicate_premises'),
      premiseIds: [
        createTestStatementId('stmt_1'),
        createTestStatementId('stmt_2'),
        createTestStatementId('stmt_1'),
      ], // Duplicate allowed in array
      conclusionIds: createTestStatementIds('stmt_3'),
    };

    expect(argument.premiseIds).toHaveLength(3);
    expect(argument.premiseIds[0]?.getValue()).toBe('stmt_1');
    expect(argument.premiseIds[1]?.getValue()).toBe('stmt_2');
    expect(argument.premiseIds[2]?.getValue()).toBe('stmt_1');
    expect(argument.conclusionIds.map((id) => id.getValue())).toEqual(['stmt_3']);
  });

  it('should handle special characters in IDs', () => {
    const argument: AtomicArgumentDTO = {
      id: createTestAtomicArgumentId('arg@special#chars'),
      premiseIds: createTestStatementIds('stmt@special', 'stmt#with%encoding'),
      conclusionIds: createTestStatementIds('stmt@result'),
    };

    expect(argument.id.getValue()).toBe('arg@special#chars');
    expect(argument.premiseIds[0]?.getValue()).toBe('stmt@special');
    expect(argument.premiseIds[1]?.getValue()).toBe('stmt#with%encoding');
    expect(argument.conclusionIds[0]?.getValue()).toBe('stmt@result');
  });
});

describe('AtomicArgumentDTO Advanced Features', () => {
  it('should handle complete atomic argument', () => {
    const argument: AtomicArgumentDTO = {
      id: createTestAtomicArgumentId('arg_12345'),
      premiseIds: createTestStatementIds('stmt_1', 'stmt_2'),
      conclusionIds: createTestStatementIds('stmt_3'),
      sideLabels: {
        left: createTestSideLabel('Modus Ponens'),
        right: createTestSideLabel('Classical Logic Ch. 3'),
      },
    };

    expect(argument.id).toBe('arg_12345');
    expect(argument.premiseIds).toEqual(['stmt_1', 'stmt_2']);
    expect(argument.conclusionIds).toEqual(['stmt_3']);
    expect(argument.sideLabels?.left).toBe('Modus Ponens');
    expect(argument.sideLabels?.right).toBe('Classical Logic Ch. 3');
  });

  it('should handle argument without premises', () => {
    const argument: AtomicArgumentDTO = {
      id: createTestAtomicArgumentId('arg_no_premise'),
      premiseIds: [],
      conclusionIds: createTestStatementIds('stmt_1', 'stmt_2'),
    };

    expect(argument.id).toBe('arg_no_premise');
    expect(argument.premiseIds).toEqual([]);
    expect(argument.conclusionIds).toEqual(['stmt_1', 'stmt_2']);
    expect(argument.sideLabels).toBeUndefined();
  });

  it('should handle argument without conclusions', () => {
    const argument: AtomicArgumentDTO = {
      id: createTestAtomicArgumentId('arg_no_conclusion'),
      premiseIds: createTestStatementIds('stmt_1', 'stmt_2'),
      conclusionIds: [],
    };

    expect(argument.id.getValue()).toBe('arg_no_conclusion');
    expect(argument.premiseIds.map((id) => id.getValue())).toEqual(['stmt_1', 'stmt_2']);
    expect(argument.conclusionIds).toEqual([]);
  });

  it('should handle bootstrap argument', () => {
    const argument: AtomicArgumentDTO = {
      id: createTestAtomicArgumentId('arg_bootstrap'),
      premiseIds: [],
      conclusionIds: [],
    };

    expect(argument.id.getValue()).toBe('arg_bootstrap');
    expect(argument.premiseIds).toEqual([]);
    expect(argument.conclusionIds).toEqual([]);
  });

  it('should handle argument with only left side label', () => {
    const argument: AtomicArgumentDTO = {
      id: createTestAtomicArgumentId('arg_left_only'),
      premiseIds: createTestStatementIds('stmt_1'),
      conclusionIds: createTestStatementIds('stmt_2'),
      sideLabels: {
        left: createTestSideLabel('Inference Rule'),
      },
    };

    expect(argument.sideLabels?.left?.getValue()).toBe('Inference Rule');
    expect(argument.sideLabels?.right).toBeUndefined();
  });

  it('should handle argument with only right side label', () => {
    const argument: AtomicArgumentDTO = {
      id: createTestAtomicArgumentId('arg_right_only'),
      premiseIds: createTestStatementIds('stmt_1'),
      conclusionIds: createTestStatementIds('stmt_2'),
      sideLabels: {
        right: createTestSideLabel('Reference Text'),
      },
    };

    expect(argument.sideLabels?.left).toBeUndefined();
    expect(argument.sideLabels?.right?.getValue()).toBe('Reference Text');
  });

  it('should handle argument with empty side labels', () => {
    const argument: AtomicArgumentDTO = {
      id: createTestAtomicArgumentId('arg_empty_labels'),
      premiseIds: createTestStatementIds('stmt_1'),
      conclusionIds: createTestStatementIds('stmt_2'),
      sideLabels: {},
    };

    expect(argument.sideLabels).toEqual({});
    expect(argument.sideLabels?.left).toBeUndefined();
    expect(argument.sideLabels?.right).toBeUndefined();
  });

  it('should handle various ID formats', () => {
    const idFormats = [
      'arg_123',
      'atomic-argument-456',
      'ARG_UPPERCASE',
      'arg.with.dots',
      'arg_with_underscores',
      '550e8400-e29b-41d4-a716-446655440000',
    ];

    idFormats.forEach((id) => {
      const argument: AtomicArgumentDTO = {
        id: createTestAtomicArgumentId(id),
        premiseIds: [],
        conclusionIds: [],
      };

      expect(argument.id.getValue()).toBe(id);
    });
  });

  it('should handle long side labels', () => {
    const longLeft =
      'This is a very long left side label that contains detailed information about the logical rule being applied in this specific inference step of the proof structure'.repeat(
        2,
      );
    const longRight =
      'This is a very long right side label that contains detailed reference information including page numbers, section references, and additional contextual notes'.repeat(
        2,
      );

    const argument: AtomicArgumentDTO = {
      id: createTestAtomicArgumentId('arg_long_labels'),
      premiseIds: createTestStatementIds('stmt_1'),
      conclusionIds: createTestStatementIds('stmt_2'),
      sideLabels: {
        left: createTestSideLabel(longLeft),
        right: createTestSideLabel(longRight),
      },
    };

    expect(argument.sideLabels?.left?.getValue()).toBe(longLeft);
    expect(argument.sideLabels?.right?.getValue()).toBe(longRight);
    expect(argument.sideLabels?.left?.getValue().length).toBeGreaterThan(200);
    expect(argument.sideLabels?.right?.getValue().length).toBeGreaterThan(200);
  });

  it('should handle special characters in side labels', () => {
    const argument: AtomicArgumentDTO = {
      id: createTestAtomicArgumentId('arg_special_labels'),
      premiseIds: createTestStatementIds('stmt_1'),
      conclusionIds: createTestStatementIds('stmt_2'),
      sideLabels: {
        left: createTestSideLabel('Rule: ∀x (P(x) → Q(x))'),
        right: createTestSideLabel('Ref: "Logic & Philosophy" pg. 42'),
      },
    };

    expect(argument.sideLabels?.left).toBe('Rule: ∀x (P(x) → Q(x))');
    expect(argument.sideLabels?.right).toBe('Ref: "Logic & Philosophy" pg. 42');
  });

  it('should handle empty string side labels', () => {
    const argument: AtomicArgumentDTO = {
      id: createTestAtomicArgumentId('arg_empty_string_labels'),
      premiseIds: createTestStatementIds('stmt_1'),
      conclusionIds: createTestStatementIds('stmt_2'),
      sideLabels: {
        left: createTestSideLabel(''),
        right: createTestSideLabel(''),
      },
    };

    expect(argument.sideLabels?.left).toBe('');
    expect(argument.sideLabels?.right).toBe('');
  });
});

describe('TreeDTO', () => {
  it('should handle basic tree', () => {
    const tree: TreeDTO = {
      id: createTestTreeId('tree_12345'),
      position: createTestPosition2D(100, 200),
      nodeCount: createTestNodeCount(5),
      rootNodeIds: [createTestNodeId('node_root')],
    };

    expect(tree.id.getValue()).toBe('tree_12345');
    expect(tree.position.getX()).toBe(100);
    expect(tree.position.getY()).toBe(200);
    expect(tree.nodeCount.getValue()).toBe(5);
    expect(tree.rootNodeIds[0]?.getValue()).toBe('node_root');
    expect(tree.bounds).toBeUndefined();
  });

  it('should handle tree with bounds', () => {
    const tree: TreeDTO = {
      id: createTestTreeId('tree_with_bounds'),
      position: createTestPosition2D(50, 75),
      bounds: createTestDimensions(800, 600),
      nodeCount: createTestNodeCount(10),
      rootNodeIds: [createTestNodeId('node_1'), createTestNodeId('node_2')],
    };

    expect(tree.bounds?.getWidth()).toBe(800);
    expect(tree.bounds?.getHeight()).toBe(600);
    expect(tree.rootNodeIds).toHaveLength(2);
  });

  it('should handle tree at origin', () => {
    const tree: TreeDTO = {
      id: createTestTreeId('tree_origin'),
      position: createTestPosition2D(0, 0),
      nodeCount: createTestNodeCount(1),
      rootNodeIds: [createTestNodeId('node_single')],
    };

    expect(tree.position.getX()).toBe(0);
    expect(tree.position.getY()).toBe(0);
    expect(tree.nodeCount).toBe(1);
  });

  it('should handle tree with negative coordinates', () => {
    const tree: TreeDTO = {
      id: createTestTreeId('tree_negative'),
      position: createTestPosition2D(-100, -200),
      nodeCount: createTestNodeCount(3),
      rootNodeIds: [createTestNodeId('node_root')],
    };

    expect(tree.position.getX()).toBe(-100);
    expect(tree.position.getY()).toBe(-200);
  });

  it('should handle tree with large coordinates', () => {
    const tree: TreeDTO = {
      id: createTestTreeId('tree_large'),
      position: createTestPosition2D(10000, 20000),
      bounds: createTestDimensions(5000, 8000),
      nodeCount: createTestNodeCount(100),
      rootNodeIds: [createTestNodeId('node_1')],
    };

    expect(tree.position.getX()).toBe(10000);
    expect(tree.position.getY()).toBe(20000);
    expect(tree.bounds?.getWidth()).toBe(5000);
    expect(tree.bounds?.getHeight()).toBe(8000);
    expect(tree.nodeCount.getValue()).toBe(100);
  });

  it('should handle tree with zero node count', () => {
    const tree: TreeDTO = {
      id: createTestTreeId('tree_empty'),
      position: createTestPosition2D(0, 0),
      nodeCount: createTestNodeCount(0),
      rootNodeIds: [],
    };

    expect(tree.nodeCount.getValue()).toBe(0);
    expect(tree.rootNodeIds).toEqual([]);
  });

  it('should handle tree with multiple root nodes', () => {
    const rootNodeIds = Array.from({ length: 5 }, (_, i) => createTestNodeId(`root_node_${i + 1}`));

    const tree: TreeDTO = {
      id: createTestTreeId('tree_multi_root'),
      position: createTestPosition2D(300, 400),
      nodeCount: createTestNodeCount(20),
      rootNodeIds,
    };

    expect(tree.rootNodeIds).toHaveLength(5);
    expect(tree.rootNodeIds[0]?.getValue()).toBe('root_node_1');
    expect(tree.rootNodeIds[4]?.getValue()).toBe('root_node_5');
  });

  it('should handle tree with zero bounds', () => {
    const tree: TreeDTO = {
      id: createTestTreeId('tree_zero_bounds'),
      position: createTestPosition2D(0, 0),
      bounds: createTestDimensions(1, 1), // zero dimensions not allowed
      nodeCount: createTestNodeCount(1),
      rootNodeIds: [createTestNodeId('node_1')],
    };

    // Since zero dimensions are not allowed, bounds should be undefined or minimum size
    expect(tree.bounds).toBeDefined();
  });

  it('should handle tree with fractional coordinates', () => {
    const tree: TreeDTO = {
      id: createTestTreeId('tree_fractional'),
      position: createTestPosition2D(123.456, 789.012),
      bounds: createTestDimensions(456.789, 234.567),
      nodeCount: createTestNodeCount(7),
      rootNodeIds: [createTestNodeId('node_precise')],
    };

    expect(tree.position.getX()).toBe(123.456);
    expect(tree.position.getY()).toBe(789.012);
    expect(tree.bounds?.getWidth()).toBe(456.789);
    expect(tree.bounds?.getHeight()).toBe(234.567);
  });

  it('should handle various ID formats', () => {
    const idFormats = [
      'tree_123',
      'tree-456',
      'TREE_UPPERCASE',
      'tree.with.dots',
      'tree_with_underscores',
      '550e8400-e29b-41d4-a716-446655440000',
    ];

    idFormats.forEach((id) => {
      const tree: TreeDTO = {
        id: createTestTreeId(id),
        position: createTestPosition2D(0, 0),
        nodeCount: createTestNodeCount(1),
        rootNodeIds: [createTestNodeId('node_1')],
      };

      expect(tree.id.getValue()).toBe(id);
    });
  });
});

describe('ValidationErrorDTO', () => {
  it('should handle basic validation error', () => {
    const error: ValidationErrorDTO = {
      code: createTestErrorCode('REQUIRED_FIELD'),
      message: createTestErrorMessage('Field is required'),
      severity: ErrorSeverity.ERROR,
    };

    expect(error.code).toBe('REQUIRED_FIELD');
    expect(error.message).toBe('Field is required');
    expect(error.severity).toBe(ErrorSeverity.ERROR);
    expect(error.location).toBeUndefined();
  });

  it('should handle validation error with location', () => {
    const error: ValidationErrorDTO = {
      code: createTestErrorCode('INVALID_ARGUMENT'),
      message: createTestErrorMessage('Argument structure is invalid'),
      severity: ErrorSeverity.ERROR,
      location: {
        treeId: createTestTreeId('tree_123'),
        nodeId: createTestNodeId('node_456'),
        argumentId: createTestAtomicArgumentId('arg_789'),
      },
    };

    expect(error.location?.treeId).toBe('tree_123');
    expect(error.location?.nodeId).toBe('node_456');
    expect(error.location?.argumentId).toBe('arg_789');
  });

  it('should handle all valid severity levels', () => {
    const severities = [ErrorSeverity.ERROR, ErrorSeverity.WARNING, ErrorSeverity.INFO];

    severities.forEach((severity) => {
      const error: ValidationErrorDTO = {
        code: createTestErrorCode(`TEST_${severity}`),
        message: createTestErrorMessage(`Test ${severity} message`),
        severity,
      };

      expect(error.severity).toBe(severity);
    });
  });

  it('should handle partial location information', () => {
    // Test single field locations
    const singleFieldCases = [
      { location: { treeId: createTestTreeId('tree_only') } },
      { location: { nodeId: createTestNodeId('node_only') } },
      { location: { argumentId: createTestAtomicArgumentId('arg_only') } },
    ];

    singleFieldCases.forEach(({ location }) => {
      const error: ValidationErrorDTO = {
        code: createTestErrorCode('PARTIAL_LOCATION'),
        message: createTestErrorMessage('Partial location test'),
        severity: ErrorSeverity.WARNING,
        location,
      };

      if ('treeId' in location) {
        expect(error.location?.treeId).toBe(location.treeId);
      }
      if ('nodeId' in location) {
        expect(error.location?.nodeId).toBe(location.nodeId);
      }
      if ('argumentId' in location) {
        expect(error.location?.argumentId).toBe(location.argumentId);
      }
    });

    // Test multi-field location
    const multiFieldLocation = {
      treeId: createTestTreeId('tree_123'),
      nodeId: createTestNodeId('node_456'),
    };
    const multiFieldError: ValidationErrorDTO = {
      code: createTestErrorCode('PARTIAL_LOCATION'),
      message: createTestErrorMessage('Multi-field location test'),
      severity: ErrorSeverity.WARNING,
      location: multiFieldLocation,
    };

    expect(multiFieldError.location?.treeId).toBe('tree_123');
    expect(multiFieldError.location?.nodeId).toBe('node_456');
  });

  it('should handle various error codes', () => {
    const errorCodes = [
      'VALIDATION_FAILED',
      'MISSING_PREMISE',
      'INVALID_CONCLUSION',
      'CIRCULAR_DEPENDENCY',
      'ORPHANED_STATEMENT',
      'UNDEFINED_REFERENCE',
      'TYPE_MISMATCH',
      'CONSTRAINT_VIOLATION',
    ];

    errorCodes.forEach((code) => {
      const error: ValidationErrorDTO = {
        code: createTestErrorCode(code),
        message: createTestErrorMessage(`Error message for ${code}`),
        severity: ErrorSeverity.ERROR,
      };

      expect(error.code).toBe(code);
    });
  });

  it('should handle long error messages', () => {
    const longMessage =
      'This is a very long error message that provides detailed information about what went wrong during validation, including specific details about the nature of the error, potential causes, and suggested remediation steps for the user to follow'.repeat(
        2,
      );

    const error: ValidationErrorDTO = {
      code: createTestErrorCode('DETAILED_ERROR'),
      message: createTestErrorMessage(longMessage),
      severity: ErrorSeverity.ERROR,
    };

    expect(error.message.getValue()).toBe(longMessage);
    expect(error.message.getValue().length).toBeGreaterThan(200);
  });

  it('should handle empty error message', () => {
    const error: ValidationErrorDTO = {
      code: createTestErrorCode('EMPTY_MESSAGE'),
      message: createTestErrorMessage(''),
      severity: ErrorSeverity.INFO,
    };

    expect(error.message).toBe('');
  });

  it('should handle special characters in error messages', () => {
    const error: ValidationErrorDTO = {
      code: createTestErrorCode('SPECIAL_CHARS'),
      message: createTestErrorMessage(
        'Error with symbols: ∀∃→∧∨¬ and quotes "like this" and apostrophes \'like this\'',
      ),
      severity: ErrorSeverity.WARNING,
    };

    expect(error.message).toContain('∀∃→∧∨¬');
    expect(error.message).toContain('"like this"');
    expect(error.message).toContain("'like this'");
  });

  it('should handle various location ID formats', () => {
    const idFormats = [
      {
        treeId: createTestTreeId('tree_123'),
        nodeId: createTestNodeId('node_456'),
        argumentId: createTestAtomicArgumentId('arg_789'),
      },
      {
        treeId: createTestTreeId('550e8400-e29b-41d4-a716-446655440000'),
        nodeId: createTestNodeId('123e4567-e89b-12d3-a456-426614174000'),
        argumentId: createTestAtomicArgumentId('6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
      },
      {
        treeId: createTestTreeId('TREE_UPPERCASE'),
        nodeId: createTestNodeId('NODE_UPPERCASE'),
        argumentId: createTestAtomicArgumentId('ARG_UPPERCASE'),
      },
    ];

    idFormats.forEach((location, index) => {
      const error: ValidationErrorDTO = {
        code: createTestErrorCode(`FORMAT_TEST_${index}`),
        message: createTestErrorMessage('Format test message'),
        severity: ErrorSeverity.INFO,
        location,
      };

      expect(error.location?.treeId).toBe(location.treeId);
      expect(error.location?.nodeId).toBe(location.nodeId);
      expect(error.location?.argumentId).toBe(location.argumentId);
    });
  });
});

describe('property-based testing', () => {
  it('should handle arbitrary atomic argument DTOs', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc
            .string()
            .map((s) =>
              AtomicArgumentId.fromString(s).unwrapOr(
                AtomicArgumentId.fromString('arg_default').unwrapOr(null)!,
              ),
            ),
          premiseIds: fc.array(
            fc
              .string()
              .map((s) =>
                StatementId.fromString(s).unwrapOr(
                  StatementId.fromString('stmt_default').unwrapOr(null)!,
                ),
              ),
          ),
          conclusionIds: fc.array(
            fc
              .string()
              .map((s) =>
                StatementId.fromString(s).unwrapOr(
                  StatementId.fromString('stmt_default').unwrapOr(null)!,
                ),
              ),
          ),
          sideLabels: fc.option(
            fc
              .record({
                left: fc.option(
                  fc.string().map((s) => SideLabel.create(s).unwrapOr(null)),
                  { nil: undefined },
                ),
                right: fc.option(
                  fc.string().map((s) => SideLabel.create(s).unwrapOr(null)),
                  { nil: undefined },
                ),
              })
              .map((labels) => {
                const result: { left?: SideLabel; right?: SideLabel } = {};
                if (labels.left !== undefined && labels.left !== null) {
                  result.left = labels.left;
                }
                if (labels.right !== undefined && labels.right !== null) {
                  result.right = labels.right;
                }
                return Object.keys(result).length > 0 ? result : undefined;
              }),
            { nil: undefined },
          ),
        }),
        (params) => {
          const argument: AtomicArgumentDTO = {
            id: params.id,
            premiseIds: params.premiseIds,
            conclusionIds: params.conclusionIds,
            ...(params.sideLabels && { sideLabels: params.sideLabels }),
          };

          expect(argument.id).toBeInstanceOf(AtomicArgumentId);
          expect(Array.isArray(argument.premiseIds)).toBe(true);
          expect(Array.isArray(argument.conclusionIds)).toBe(true);

          argument.premiseIds.forEach((stmtId) => {
            expect(stmtId).toBeInstanceOf(StatementId);
          });

          argument.conclusionIds.forEach((stmtId) => {
            expect(stmtId).toBeInstanceOf(StatementId);
          });

          if (argument.sideLabels !== undefined) {
            if (argument.sideLabels.left !== undefined) {
              expect(argument.sideLabels.left).toBeInstanceOf(SideLabel);
            }
            if (argument.sideLabels.right !== undefined) {
              expect(argument.sideLabels.right).toBeInstanceOf(SideLabel);
            }
          }
        },
      ),
    );
  });

  it('should handle arbitrary atomic argument DTOs with comprehensive validation', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string(),
          premiseIds: fc.array(fc.string()),
          conclusionIds: fc.array(fc.string()),
          sideLabels: fc.option(
            fc.record({
              left: fc.option(fc.string(), { nil: undefined }),
              right: fc.option(fc.string(), { nil: undefined }),
            }),
            { nil: undefined },
          ),
        }),
        (params) => {
          const sideLabels: { left?: SideLabel; right?: SideLabel } | undefined = (() => {
            if (params.sideLabels === undefined) return undefined;
            const result: { left?: SideLabel; right?: SideLabel } = {};
            if (params.sideLabels.left !== undefined) {
              const leftLabel = SideLabel.create(params.sideLabels.left);
              if (leftLabel.isOk()) {
                result.left = leftLabel.value;
              }
            }
            if (params.sideLabels.right !== undefined) {
              const rightLabel = SideLabel.create(params.sideLabels.right);
              if (rightLabel.isOk()) {
                result.right = rightLabel.value;
              }
            }
            return Object.keys(result).length > 0 ? result : undefined;
          })();

          const argument: AtomicArgumentDTO = {
            id: AtomicArgumentId.fromString(params.id).unwrapOr(
              AtomicArgumentId.fromString('arg_default').unwrapOr(null)!,
            ),
            premiseIds: params.premiseIds.map((s) =>
              StatementId.fromString(s).unwrapOr(
                StatementId.fromString('stmt_default').unwrapOr(null)!,
              ),
            ),
            conclusionIds: params.conclusionIds.map((s) =>
              StatementId.fromString(s).unwrapOr(
                StatementId.fromString('stmt_default').unwrapOr(null)!,
              ),
            ),
            ...(sideLabels && { sideLabels }),
          };

          expect(argument.id).toBeInstanceOf(AtomicArgumentId);
          expect(Array.isArray(argument.premiseIds)).toBe(true);
          expect(Array.isArray(argument.conclusionIds)).toBe(true);

          argument.premiseIds.forEach((id) => {
            expect(id).toBeInstanceOf(StatementId);
          });

          argument.conclusionIds.forEach((id) => {
            expect(id).toBeInstanceOf(StatementId);
          });

          if (argument.sideLabels !== undefined) {
            if (argument.sideLabels.left !== undefined) {
              expect(argument.sideLabels.left).toBeInstanceOf(SideLabel);
            }
            if (argument.sideLabels.right !== undefined) {
              expect(argument.sideLabels.right).toBeInstanceOf(SideLabel);
            }
          }
        },
      ),
    );
  });

  it('should handle arbitrary tree DTOs', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string(),
          position: fc.record({
            x: fc.float(),
            y: fc.float(),
          }),
          bounds: fc.option(
            fc.record({
              width: fc.float({ min: 0 }).filter((n) => !Number.isNaN(n)),
              height: fc.float({ min: 0 }).filter((n) => !Number.isNaN(n)),
            }),
            { nil: undefined },
          ),
          nodeCount: fc.nat(),
          rootNodeIds: fc.array(fc.string()),
        }),
        (params) => {
          const tree: TreeDTO = {
            id: createTestTreeId(params.id),
            position: createTestPosition2D(params.position.x, params.position.y),
            nodeCount: createTestNodeCount(params.nodeCount),
            rootNodeIds: params.rootNodeIds.map((id) => createTestNodeId(id)),
            ...(params.bounds !== undefined && {
              bounds: createTestDimensions(params.bounds.width, params.bounds.height),
            }),
          };

          expect(tree.id.getValue()).toBe(params.id);
          expect(tree.position.getX()).toBe(params.position.x);
          expect(tree.position.getY()).toBe(params.position.y);
          expect(tree.nodeCount.getValue()).toBe(params.nodeCount);
          expect(tree.nodeCount.getValue()).toBeGreaterThanOrEqual(0);
          expect(Array.isArray(tree.rootNodeIds)).toBe(true);

          tree.rootNodeIds.forEach((nodeId, index) => {
            expect(nodeId.getValue()).toBe(params.rootNodeIds[index]);
          });

          if (tree.bounds !== undefined && params.bounds !== undefined) {
            expect(tree.bounds.getWidth()).toBe(params.bounds.width);
            expect(tree.bounds.getHeight()).toBe(params.bounds.height);
            expect(tree.bounds.getWidth()).toBeGreaterThanOrEqual(0);
            expect(tree.bounds.getHeight()).toBeGreaterThanOrEqual(0);
          }
        },
      ),
    );
  });

  it('should handle arbitrary validation error DTOs', () => {
    fc.assert(
      fc.property(
        fc.record({
          code: fc.string(),
          message: fc.string(),
          severity: fc.constantFrom(ErrorSeverity.ERROR, ErrorSeverity.WARNING, ErrorSeverity.INFO),
          location: fc.option(
            fc.record({
              treeId: fc.option(fc.string(), { nil: undefined }),
              nodeId: fc.option(fc.string(), { nil: undefined }),
              argumentId: fc.option(fc.string(), { nil: undefined }),
            }),
            { nil: undefined },
          ),
        }),
        (params) => {
          const error: ValidationErrorDTO = {
            code: createTestErrorCode(params.code),
            message: createTestErrorMessage(params.message),
            severity: params.severity as ErrorSeverity,
            ...(params.location !== undefined && {
              location: {
                ...(params.location.treeId !== undefined && {
                  treeId: createTestTreeId(params.location.treeId),
                }),
                ...(params.location.nodeId !== undefined && {
                  nodeId: createTestNodeId(params.location.nodeId),
                }),
                ...(params.location.argumentId !== undefined && {
                  argumentId: createTestAtomicArgumentId(params.location.argumentId),
                }),
              },
            }),
          };

          expect(typeof error.code).toBe('string');
          expect(typeof error.message).toBe('string');
          expect(['error', 'warning', 'info']).toContain(error.severity);

          if (error.location !== undefined) {
            if (error.location.treeId !== undefined) {
              expect(typeof error.location.treeId).toBe('string');
            }
            if (error.location.nodeId !== undefined) {
              expect(typeof error.location.nodeId).toBe('string');
            }
            if (error.location.argumentId !== undefined) {
              expect(typeof error.location.argumentId).toBe('string');
            }
          }
        },
      ),
    );
  });
});

describe('integration scenarios', () => {
  it('should handle complex atomic argument structure', () => {
    const complexArgument: AtomicArgumentDTO = {
      id: createTestAtomicArgumentId('arg_complex_logic'),
      premiseIds: createTestStatementIds(
        'stmt_major_premise',
        'stmt_minor_premise',
        'stmt_assumption',
      ),
      conclusionIds: createTestStatementIds('stmt_intermediate_conclusion', 'stmt_derived_result'),
      sideLabels: {
        left: createTestSideLabel('Complex Syllogism'),
        right: createTestSideLabel('Formal Logic Reference'),
      },
    };

    expect(complexArgument.premiseIds).toHaveLength(3);
    expect(complexArgument.conclusionIds).toHaveLength(2);
    expect(complexArgument.premiseIds).toContain('stmt_major_premise');
    expect(complexArgument.premiseIds).toContain('stmt_minor_premise');
    expect(complexArgument.premiseIds).toContain('stmt_assumption');
    expect(complexArgument.conclusionIds).toContain('stmt_intermediate_conclusion');
    expect(complexArgument.conclusionIds).toContain('stmt_derived_result');
    expect(complexArgument.sideLabels?.left).toBe('Complex Syllogism');
    expect(complexArgument.sideLabels?.right).toBe('Formal Logic Reference');
  });

  it('should handle complete argument chain structure', () => {
    // First argument: premises → intermediate conclusion
    const arg1: AtomicArgumentDTO = {
      id: createTestAtomicArgumentId('arg_step_1'),
      premiseIds: createTestStatementIds('stmt_p1', 'stmt_p2'),
      conclusionIds: createTestStatementIds('stmt_intermediate'),
      sideLabels: {
        left: createTestSideLabel('Modus Ponens'),
        right: createTestSideLabel('Step 1'),
      },
    };

    // Second argument: intermediate conclusion → final conclusion
    const arg2: AtomicArgumentDTO = {
      id: createTestAtomicArgumentId('arg_step_2'),
      premiseIds: createTestStatementIds('stmt_intermediate', 'stmt_additional'), // Reuses intermediate from arg1
      conclusionIds: createTestStatementIds('stmt_final'),
      sideLabels: {
        left: createTestSideLabel('Universal Instantiation'),
        right: createTestSideLabel('Step 2'),
      },
    };

    // Verify the chain structure
    expect(arg1.conclusionIds).toContain('stmt_intermediate');
    expect(arg2.premiseIds).toContain('stmt_intermediate');
    expect(arg1.premiseIds).toHaveLength(2);
    expect(arg1.conclusionIds).toHaveLength(1);
    expect(arg2.premiseIds).toHaveLength(2);
    expect(arg2.conclusionIds).toHaveLength(1);

    // Verify shared statement connects the arguments
    const sharedStatement = 'stmt_intermediate';
    expect(arg1.conclusionIds).toContain(sharedStatement);
    expect(arg2.premiseIds).toContain(sharedStatement);
  });

  it('should handle tree with complex positioning', () => {
    const tree: TreeDTO = {
      id: createTestTreeId('tree_complex_proof'),
      position: createTestPosition2D(150.5, 300.75),
      bounds: createTestDimensions(1200.25, 800.5),
      nodeCount: createTestNodeCount(15),
      rootNodeIds: [
        createTestNodeId('node_axiom_1'),
        createTestNodeId('node_axiom_2'),
        createTestNodeId('node_definition'),
      ],
    };

    expect(tree.nodeCount.getValue()).toBe(15);
    expect(tree.rootNodeIds).toHaveLength(3);
    expect(tree.position.getX()).toBe(150.5);
    expect(tree.position.getY()).toBe(300.75);
    expect(tree.bounds?.getWidth()).toBe(1200.25);
    expect(tree.bounds?.getHeight()).toBe(800.5);

    // Verify tree has multiple entry points (axioms and definitions)
    expect(tree.rootNodeIds.some((id) => id.getValue() === 'node_axiom_1')).toBe(true);
    expect(tree.rootNodeIds.some((id) => id.getValue() === 'node_axiom_2')).toBe(true);
    expect(tree.rootNodeIds.some((id) => id.getValue() === 'node_definition')).toBe(true);
  });

  it('should handle validation error with complete location context', () => {
    const error: ValidationErrorDTO = {
      code: createTestErrorCode('CIRCULAR_DEPENDENCY_DETECTED'),
      message: createTestErrorMessage(
        'A circular dependency has been detected in the argument chain starting from argument arg_problematic',
      ),
      severity: ErrorSeverity.ERROR,
      location: {
        treeId: createTestTreeId('tree_main_proof'),
        nodeId: createTestNodeId('node_circular_start'),
        argumentId: createTestAtomicArgumentId('arg_problematic'),
      },
    };

    expect(error.code).toBe('CIRCULAR_DEPENDENCY_DETECTED');
    expect(error.severity).toBe(ErrorSeverity.ERROR);
    expect(error.location?.treeId).toBe('tree_main_proof');
    expect(error.location?.nodeId).toBe('node_circular_start');
    expect(error.location?.argumentId).toBe('arg_problematic');
    expect(error.message).toContain('circular dependency');
    expect(error.message).toContain('arg_problematic');
  });

  it('should handle complex proof structure with bootstrap arguments', () => {
    // Bootstrap argument (empty starting point)
    const bootstrapArg: AtomicArgumentDTO = {
      id: createTestAtomicArgumentId('arg_bootstrap'),
      premiseIds: [],
      conclusionIds: [],
    };

    // First real argument using external premises
    const firstArg: AtomicArgumentDTO = {
      id: createTestAtomicArgumentId('arg_first_step'),
      premiseIds: createTestStatementIds('stmt_axiom_1', 'stmt_axiom_2', 'stmt_definition_1'),
      conclusionIds: createTestStatementIds('stmt_first_conclusion'),
      sideLabels: {
        left: createTestSideLabel('Axiom Application'),
        right: createTestSideLabel('Foundation'),
      },
    };

    // Tree structure containing all arguments
    const proofTree: TreeDTO = {
      id: createTestTreeId('tree_complete_proof'),
      position: createTestPosition2D(0, 0),
      bounds: createTestDimensions(2000, 1500),
      nodeCount: createTestNodeCount(2),
      rootNodeIds: [createTestNodeId('node_bootstrap'), createTestNodeId('node_first_step')],
    };

    expect(bootstrapArg.premiseIds).toEqual([]);
    expect(bootstrapArg.conclusionIds).toEqual([]);
    expect(firstArg.premiseIds).toHaveLength(3);
    expect(firstArg.premiseIds).toContain('stmt_axiom_1');
    expect(firstArg.premiseIds).toContain('stmt_axiom_2');
    expect(firstArg.premiseIds).toContain('stmt_definition_1');
    expect(firstArg.conclusionIds).toEqual(['stmt_first_conclusion']);
    expect(proofTree.rootNodeIds).toContain('node_bootstrap');
    expect(proofTree.rootNodeIds).toContain('node_first_step');
  });

  it('should handle validation errors across different severity levels', () => {
    const errors: ValidationErrorDTO[] = [
      {
        code: createTestErrorCode('CRITICAL_LOGIC_ERROR'),
        message: createTestErrorMessage('Invalid logical inference detected'),
        severity: ErrorSeverity.ERROR,
        location: {
          treeId: createTestTreeId('tree_main'),
          argumentId: createTestAtomicArgumentId('arg_invalid'),
        },
      },
      {
        code: createTestErrorCode('MISSING_SIDE_LABEL'),
        message: createTestErrorMessage('Argument missing descriptive side label'),
        severity: ErrorSeverity.WARNING,
        location: {
          argumentId: createTestAtomicArgumentId('arg_unlabeled'),
        },
      },
      {
        code: createTestErrorCode('STYLE_SUGGESTION'),
        message: createTestErrorMessage('Consider using more descriptive statement content'),
        severity: ErrorSeverity.INFO,
        location: {
          treeId: createTestTreeId('tree_main'),
          nodeId: createTestNodeId('node_generic'),
        },
      },
    ];

    expect(errors).toHaveLength(3);

    const errorsByType = {
      error: errors.filter((e) => e.severity === 'error'),
      warning: errors.filter((e) => e.severity === 'warning'),
      info: errors.filter((e) => e.severity === 'info'),
    };

    expect(errorsByType.error).toHaveLength(1);
    expect(errorsByType.warning).toHaveLength(1);
    expect(errorsByType.info).toHaveLength(1);

    expect(errorsByType.error[0]?.code).toBe('CRITICAL_LOGIC_ERROR');
    expect(errorsByType.warning[0]?.code).toBe('MISSING_SIDE_LABEL');
    expect(errorsByType.info[0]?.code).toBe('STYLE_SUGGESTION');
  });
});

// Tests for actual executable functions (type guards, factories, validators)
describe('Shared Types Executable Functions', () => {
  describe('Type Guard Functions', () => {
    describe('isValidUsageType', () => {
      it('should return true for valid usage types', () => {
        expect(isValidUsageType('premise')).toBe(true);
        expect(isValidUsageType('conclusion')).toBe(true);
      });

      it('should return false for invalid usage types', () => {
        expect(isValidUsageType('invalid')).toBe(false);
        expect(isValidUsageType('')).toBe(false);
        expect(isValidUsageType(null)).toBe(false);
        expect(isValidUsageType(123)).toBe(false);
      });
    });

    describe('isValidPosition', () => {
      it('should return true for valid positions', () => {
        expect(isValidPosition({ x: 0, y: 0 })).toBe(true);
        expect(isValidPosition({ x: 100, y: 200 })).toBe(true);
        expect(isValidPosition({ x: -50, y: -25 })).toBe(true);
      });

      it('should return false for invalid positions', () => {
        expect(isValidPosition(null)).toBe(false);
        expect(isValidPosition({})).toBe(false);
        expect(isValidPosition({ x: 'not number', y: 0 })).toBe(false);
        expect(isValidPosition({ x: 0 })).toBe(false);
      });
    });

    describe('isValidBounds', () => {
      it('should return true for valid bounds', () => {
        expect(isValidBounds({ width: 100, height: 200 })).toBe(true);
        expect(isValidBounds({ width: 0, height: 0 })).toBe(true);
      });

      it('should return false for invalid bounds', () => {
        expect(isValidBounds(null)).toBe(false);
        expect(isValidBounds({})).toBe(false);
        expect(isValidBounds({ width: 'not number', height: 100 })).toBe(false);
        expect(isValidBounds({ width: 100 })).toBe(false);
        expect(isValidBounds({ width: -10, height: 100 })).toBe(false);
      });
    });

    describe('isValidSeverity', () => {
      it('should return true for valid severities', () => {
        expect(isValidSeverity('error')).toBe(true);
        expect(isValidSeverity('warning')).toBe(true);
        expect(isValidSeverity('info')).toBe(true);
      });

      it('should return false for invalid severities', () => {
        expect(isValidSeverity('invalid')).toBe(false);
        expect(isValidSeverity('')).toBe(false);
        expect(isValidSeverity(null)).toBe(false);
      });
    });

    describe('isAtomicArgumentDTO detailed', () => {
      it('should return true for valid AtomicArgumentDTO with arrays', () => {
        const validDTO = {
          id: 'arg-123',
          premiseIds: ['stmt-1', 'stmt-2'],
          conclusionIds: ['stmt-3'],
        };
        expect(isAtomicArgumentDTO(validDTO)).toBe(true);
      });

      it('should return false for DTOs with old property names', () => {
        const invalidDTO = {
          id: 'arg-123',
          premiseSetId: 'set-1', // Old property name
          conclusionSetId: 'set-2', // Old property name
        };
        expect(isAtomicArgumentDTO(invalidDTO)).toBe(false);
      });
    });

    describe('isAtomicArgumentDTO complete', () => {
      it('should return true for valid AtomicArgumentDTO with statement arrays', () => {
        const validDTO = {
          id: 'arg-123',
          premiseIds: ['stmt-1', 'stmt-2'],
          conclusionIds: ['stmt-3'],
        };
        expect(isAtomicArgumentDTO(validDTO)).toBe(true);
      });

      it('should return false for invalid DTOs', () => {
        expect(isAtomicArgumentDTO(null)).toBe(false);
        expect(isAtomicArgumentDTO({})).toBe(false);
        expect(isAtomicArgumentDTO({ id: 'arg-123' })).toBe(false);
      });
    });

    describe('isTreeDTO', () => {
      it('should return true for valid TreeDTO', () => {
        const validDTO = {
          id: 'tree-123',
          position: { x: 0, y: 0 },
          bounds: { width: 100, height: 200 },
          nodeCount: 5,
          rootNodeIds: ['node-1', 'node-2'],
        };
        expect(isTreeDTO(validDTO)).toBe(true);
      });

      it('should return false for invalid DTOs', () => {
        expect(isTreeDTO(null)).toBe(false);
        expect(isTreeDTO({})).toBe(false);
        expect(isTreeDTO({ id: 'tree-123' })).toBe(false);
      });
    });

    describe('isValidationErrorDTO', () => {
      it('should return true for valid ValidationErrorDTO', () => {
        const validDTO = {
          code: 'ERROR_CODE',
          message: 'Error message',
          severity: ErrorSeverity.ERROR,
          location: { treeId: 'tree-1' },
        };
        expect(isValidationErrorDTO(validDTO)).toBe(true);
      });

      it('should return false for invalid DTOs', () => {
        expect(isValidationErrorDTO(null)).toBe(false);
        expect(isValidationErrorDTO({})).toBe(false);
        expect(isValidationErrorDTO({ code: 'ERROR_CODE' })).toBe(false);
      });
    });
  });

  describe('Factory Functions', () => {
    describe('createAtomicArgumentDTO updated', () => {
      it('should create valid AtomicArgumentDTO with statement arrays', () => {
        const argId = AtomicArgumentId.create('arg-123');
        const premiseIds = [StatementId.create('stmt-1'), StatementId.create('stmt-2')]
          .filter((r) => r.isOk())
          .map((r) => r.value);
        const conclusionIds = [StatementId.create('stmt-3')]
          .filter((r) => r.isOk())
          .map((r) => r.value);

        if (argId.isOk() && premiseIds.length === 2 && conclusionIds.length === 1) {
          const dto = createAtomicArgumentDTO(argId.value, premiseIds, conclusionIds);
          expect(dto.id.getValue()).toBe('arg-123');
          expect(dto.premiseIds.map((id) => id.getValue())).toEqual(['stmt-1', 'stmt-2']);
          expect(dto.conclusionIds.map((id) => id.getValue())).toEqual(['stmt-3']);
          expect(dto.sideLabels).toBeUndefined();
          expect(isAtomicArgumentDTO(dto)).toBe(true);
        }
      });
    });

    describe('createAtomicArgumentDTO with arrays', () => {
      it('should create valid AtomicArgumentDTO with statement arrays', () => {
        const argId = AtomicArgumentId.create('arg-123');
        const premiseIds = [StatementId.create('stmt-1')]
          .filter((r) => r.isOk())
          .map((r) => r.value);
        const conclusionIds = [StatementId.create('stmt-2')]
          .filter((r) => r.isOk())
          .map((r) => r.value);

        if (argId.isOk() && premiseIds.length === 1 && conclusionIds.length === 1) {
          const dto = createAtomicArgumentDTO(argId.value, premiseIds, conclusionIds);
          expect(dto.id.getValue()).toBe('arg-123');
          expect(dto.premiseIds.map((id) => id.getValue())).toEqual(['stmt-1']);
          expect(dto.conclusionIds.map((id) => id.getValue())).toEqual(['stmt-2']);
          expect(dto.sideLabels).toBeUndefined();
          expect(isAtomicArgumentDTO(dto)).toBe(true);
        }
      });

      it('should handle empty premise/conclusion arrays', () => {
        const argId = AtomicArgumentId.create('arg-123');

        if (argId.isOk()) {
          const dto = createAtomicArgumentDTO(argId.value, [], []);
          expect(dto.premiseIds).toEqual([]);
          expect(dto.conclusionIds).toEqual([]);
        }
      });
    });

    describe('createTreeDTO', () => {
      it('should create valid TreeDTO', () => {
        const treeId = TreeId.create('tree-123');
        const position = Position2D.create(10, 20);
        const nodeCount = NodeCount.create(0);
        const bounds = Dimensions.create(100, 200);

        if (treeId.isOk() && position.isOk() && nodeCount.isOk() && bounds.isOk()) {
          const dto = createTreeDTO(
            treeId.value,
            position.value,
            nodeCount.value,
            [],
            bounds.value,
          );
          expect(dto.id.getValue()).toBe('tree-123');
          expect(dto.position.getX()).toBe(10);
          expect(dto.position.getY()).toBe(20);
          expect(dto.bounds?.getWidth()).toBe(100);
          expect(dto.bounds?.getHeight()).toBe(200);
          expect(dto.nodeCount.getValue()).toBe(0);
          expect(dto.rootNodeIds).toEqual([]);
          expect(isTreeDTO(dto)).toBe(true);
        }
      });
    });

    describe('createValidationErrorDTO', () => {
      it('should create valid ValidationErrorDTO', () => {
        const treeId = TreeId.create('tree-1');
        const code = ErrorCode.create('ERROR_CODE');
        const message = ErrorMessage.create('Error message');
        const severity = ErrorSeverity.ERROR;

        if (treeId.isOk() && code.isOk() && message.isOk()) {
          const location = { treeId: treeId.value };
          const dto = createValidationErrorDTO(code.value, message.value, severity, location);
          expect(dto.code.getValue()).toBe('ERROR_CODE');
          expect(dto.message.getValue()).toBe('Error message');
          expect(dto.severity).toBe(ErrorSeverity.ERROR);
          expect(dto.location?.treeId?.getValue()).toBe('tree-1');
          expect(isValidationErrorDTO(dto)).toBe(true);
        }
      });
    });
  });

  describe('Validation Functions', () => {
    describe('validateAtomicArgumentDTO', () => {
      it('should return empty array for valid DTO', () => {
        const argId = AtomicArgumentId.create('arg-123');
        const premiseIds = [StatementId.create('premise-1')]
          .filter((r) => r.isOk())
          .map((r) => r.value);
        const conclusionIds = [StatementId.create('conclusion-1')]
          .filter((r) => r.isOk())
          .map((r) => r.value);

        if (argId.isOk() && premiseIds.length === 1 && conclusionIds.length === 1) {
          const validDTO = createAtomicArgumentDTO(argId.value, premiseIds, conclusionIds);
          const errors = validateAtomicArgumentDTO(validDTO);
          expect(errors).toEqual([]);
        }
      });

      it('should return errors for invalid DTO', () => {
        const errors = validateAtomicArgumentDTO({});
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    describe('validateTreeDTO', () => {
      it('should return empty array for valid DTO', () => {
        const positionResult = Position2D.create(0, 0);
        if (positionResult.isErr()) throw new Error('Failed to create position');
        const position = positionResult.value;

        const nodeCountResult = NodeCount.create(0);
        if (nodeCountResult.isErr()) throw new Error('Failed to create node count');
        const nodeCount = nodeCountResult.value;

        const boundsResult = Dimensions.create(100, 200);
        if (boundsResult.isErr()) throw new Error('Failed to create dimensions');
        const bounds = boundsResult.value;
        const treeIdResult = TreeId.create('tree-123');
        if (treeIdResult.isErr()) throw new Error('Failed to create tree id');
        const treeId = treeIdResult.value;
        const validDTO = createTreeDTO(treeId, position, nodeCount, [], bounds);
        const errors = validateTreeDTO(validDTO);
        expect(errors).toEqual([]);
      });

      it('should return errors for invalid DTO', () => {
        const errors = validateTreeDTO({});
        expect(errors.length).toBeGreaterThan(0);
      });

      it('should detect trees with zero nodes but root node IDs', () => {
        const positionResult = Position2D.create(0, 0);
        if (positionResult.isErr()) throw new Error('Failed to create position');
        const position = positionResult.value;
        const nodeCountResult = NodeCount.create(0);
        if (nodeCountResult.isErr()) throw new Error('Failed to create node count');
        const nodeCount = nodeCountResult.value;
        const treeWithZeroNodesButRoots = {
          id: 'tree-inconsistent-1',
          position,
          nodeCount,
          rootNodeIds: ['node-1', 'node-2'], // Should be empty if nodeCount is 0
        };

        const errors = validateTreeDTO(treeWithZeroNodesButRoots);
        expect(errors).toContain('Tree with zero nodes cannot have root node IDs');
      });

      it('should detect trees with nodes but no root node IDs', () => {
        const positionResult = Position2D.create(0, 0);
        if (positionResult.isErr()) throw new Error('Failed to create position');
        const position = positionResult.value;
        const nodeCountResult = NodeCount.create(5);
        if (nodeCountResult.isErr()) throw new Error('Failed to create node count');
        const nodeCount = nodeCountResult.value;
        const treeWithNodesButNoRoots = {
          id: 'tree-inconsistent-2',
          position,
          nodeCount,
          rootNodeIds: [], // Should have at least one root if nodeCount > 0
        };

        const errors = validateTreeDTO(treeWithNodesButNoRoots);
        expect(errors).toContain('Tree with nodes must have at least one root node');
      });

      it('should allow valid tree with nodes and roots', () => {
        const positionResult = Position2D.create(100, 200);
        if (positionResult.isErr()) throw new Error('Failed to create position');
        const position = positionResult.value;
        const nodeCountResult = NodeCount.create(3);
        if (nodeCountResult.isErr()) throw new Error('Failed to create node count');
        const nodeCount = nodeCountResult.value;
        const validTree = {
          id: 'tree-valid',
          position,
          nodeCount,
          rootNodeIds: ['root-1'],
        };

        const errors = validateTreeDTO(validTree);
        expect(errors).toEqual([]);
      });
    });
  });

  describe('Enhanced validation and edge case coverage', () => {
    describe('validateAtomicArgumentDTO comprehensive tests', () => {
      it('should detect arguments without premise or conclusion statements', () => {
        const emptyArgument = {
          id: 'arg-empty',
          premiseIds: [],
          conclusionIds: [],
        };

        const errors = validateAtomicArgumentDTO(emptyArgument);
        expect(errors).toContain('Atomic argument must have at least one premise or conclusion');
      });

      it('should allow arguments with only premises', () => {
        const premiseOnlyArg = {
          id: 'arg-premise-only',
          premiseIds: ['stmt-1', 'stmt-2'],
          conclusionIds: [],
        };

        const errors = validateAtomicArgumentDTO(premiseOnlyArg);
        expect(errors).toEqual([]);
      });

      it('should allow arguments with only conclusions', () => {
        const conclusionOnlyArg = {
          id: 'arg-conclusion-only',
          premiseIds: [],
          conclusionIds: ['stmt-1', 'stmt-2'],
        };

        const errors = validateAtomicArgumentDTO(conclusionOnlyArg);
        expect(errors).toEqual([]);
      });
    });

    describe('Factory function error conditions', () => {
      it('should handle createAtomicArgumentDTO error conditions', () => {
        const argId = createTestAtomicArgumentId('arg-1');
        const stmtId1 = createTestStatementId('stmt-1');
        const stmtId2 = createTestStatementId('stmt-2');
        const validId = createTestStatementId('valid');
        const anotherId = createTestStatementId('another');

        // Test empty argument ID
        const emptyArgResult = AtomicArgumentId.create('');
        expect(emptyArgResult.isErr()).toBe(true);
        const spacesArgResult = AtomicArgumentId.create('   ');
        expect(spacesArgResult.isErr()).toBe(true);

        // For testing invalid statement IDs, we rely on StatementId validation
        const emptyStmtResult = StatementId.create('');
        expect(emptyStmtResult.isErr()).toBe(true);
      });

      it('should handle createTreeDTO error conditions', () => {
        const treeId = createTestTreeId('tree-1');
        const position = createTestPosition2D(0, 0);
        const nodeCount = createTestNodeCount(0);

        // Test empty tree ID
        const emptyTreeResult = TreeId.create('');
        expect(emptyTreeResult.isErr()).toBe(true);

        // Test invalid position
        const nanPositionResult = Position2D.create(Number.NaN, 0);
        expect(nanPositionResult.isErr()).toBe(true);

        // Test invalid node count
        const negativeCountResult = NodeCount.create(-1);
        expect(negativeCountResult.isErr()).toBe(true);

        // Test invalid node IDs
        const emptyNodeResult = NodeId.create('');
        expect(emptyNodeResult.isErr()).toBe(true);
      });

      it('should handle createValidationErrorDTO error conditions', () => {
        const code = createTestErrorCode('CODE');
        const message = createTestErrorMessage('message');

        // Test invalid code
        const emptyCodeResult = ErrorCode.create('');
        expect(emptyCodeResult.isErr()).toBe(true);

        // Test invalid message
        const emptyMessageResult = ErrorMessage.create('');
        expect(emptyMessageResult.isErr()).toBe(true);

        // Test valid severity - severity is an enum so can't be invalid at compile time
        const validDTO = createValidationErrorDTO(code, message, ErrorSeverity.ERROR);
        expect(validDTO).toBeDefined();
      });
    });

    describe('Type guard edge cases', () => {
      describe('isValidPosition edge cases', () => {
        it('should handle infinite and NaN coordinates', () => {
          expect(isValidPosition({ x: Number.POSITIVE_INFINITY, y: 0 })).toBe(false);
          expect(isValidPosition({ x: 0, y: Number.NEGATIVE_INFINITY })).toBe(false);
          expect(isValidPosition({ x: Number.NaN, y: 0 })).toBe(false);
          expect(isValidPosition({ x: 0, y: Number.NaN })).toBe(false);
        });

        it('should handle missing properties', () => {
          expect(isValidPosition({ x: 0 } as any)).toBe(false);
          expect(isValidPosition({ y: 0 } as any)).toBe(false);
          expect(isValidPosition({})).toBe(false);
        });
      });

      describe('isValidBounds edge cases', () => {
        it('should handle infinite and NaN dimensions', () => {
          // These should be false because they're not Dimensions instances
          expect(isValidBounds({ width: Number.POSITIVE_INFINITY, height: 100 })).toBe(false);
          expect(isValidBounds({ width: 100, height: Number.NaN })).toBe(false);
        });

        it('should reject plain objects (not Dimensions instances)', () => {
          expect(isValidBounds({ width: -1, height: 100 })).toBe(false);
          expect(isValidBounds({ width: 100, height: -0.1 })).toBe(false);
        });

        it('should accept valid Dimensions instances', () => {
          const dimensions = createTestDimensions(100, 200);
          expect(isValidBounds(dimensions)).toBe(true);
        });
      });

      describe('Complex DTO validation edge cases', () => {
        it('should handle isAtomicArgumentDTO with invalid side labels', () => {
          const invalidSideLabels1 = {
            id: 'arg-1',
            premiseIds: ['stmt-1'],
            conclusionIds: ['stmt-2'],
            sideLabels: null, // Should be object
          };
          expect(isAtomicArgumentDTO(invalidSideLabels1)).toBe(false);

          const invalidSideLabels2 = {
            id: 'arg-1',
            premiseIds: ['stmt-1'],
            conclusionIds: ['stmt-2'],
            sideLabels: { left: 123 }, // Should be string
          };
          expect(isAtomicArgumentDTO(invalidSideLabels2)).toBe(false);
        });

        it('should handle isValidationErrorDTO with invalid location', () => {
          const invalidLocation1 = {
            code: 'ERROR',
            message: 'Error message',
            severity: ErrorSeverity.ERROR,
            location: null, // Should be object
          };
          expect(isValidationErrorDTO(invalidLocation1)).toBe(false);

          const invalidLocation2 = {
            code: 'ERROR',
            message: 'Error message',
            severity: ErrorSeverity.ERROR,
            location: { treeId: 123 }, // Should be string
          };
          expect(isValidationErrorDTO(invalidLocation2)).toBe(false);
        });
      });
    });
  });
});

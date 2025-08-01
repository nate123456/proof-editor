/**
 * Comprehensive test suite for shared-types.ts DTOs
 *
 * Tests data structure validation, type integrity, and boundary conditions
 * for shared DTOs used across multiple query modules to avoid circular dependencies.
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { Dimensions, NodeCount, Position2D } from '../../../domain/shared/value-objects/index.js';
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

describe('AtomicArgumentDTO Basic Structure', () => {
  it('should handle basic atomic argument', () => {
    const argument: AtomicArgumentDTO = {
      id: 'arg_12345',
      premiseIds: ['stmt_1', 'stmt_2', 'stmt_3'],
      conclusionIds: ['stmt_4', 'stmt_5'],
    };

    expect(argument.id).toBe('arg_12345');
    expect(argument.premiseIds).toEqual(['stmt_1', 'stmt_2', 'stmt_3']);
    expect(argument.conclusionIds).toEqual(['stmt_4', 'stmt_5']);
  });

  it('should handle empty atomic argument', () => {
    const argument: AtomicArgumentDTO = {
      id: 'arg_empty',
      premiseIds: [],
      conclusionIds: [],
    };

    expect(argument.id).toBe('arg_empty');
    expect(argument.premiseIds).toEqual([]);
    expect(argument.conclusionIds).toEqual([]);
  });

  it('should handle single statement atomic argument', () => {
    const argument: AtomicArgumentDTO = {
      id: 'arg_single',
      premiseIds: ['stmt_only'],
      conclusionIds: ['stmt_result'],
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
      id: 'arg_many',
      premiseIds,
      conclusionIds,
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
      id: 'arg_premise_only',
      premiseIds: ['stmt_1', 'stmt_2'],
      conclusionIds: [],
    };

    expect(argument.premiseIds).toEqual(['stmt_1', 'stmt_2']);
    expect(argument.conclusionIds).toEqual([]);
  });

  it('should handle conclusion-only atomic argument', () => {
    const argument: AtomicArgumentDTO = {
      id: 'arg_conclusion_only',
      premiseIds: [],
      conclusionIds: ['stmt_3', 'stmt_4'],
    };

    expect(argument.premiseIds).toEqual([]);
    expect(argument.conclusionIds).toEqual(['stmt_3', 'stmt_4']);
  });

  it('should handle atomic argument with side labels', () => {
    const argument: AtomicArgumentDTO = {
      id: 'arg_with_labels',
      premiseIds: ['stmt_1'],
      conclusionIds: ['stmt_2'],
      sideLabels: {
        left: 'Modus Ponens',
        right: 'Classical Logic',
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
        id,
        premiseIds: [],
        conclusionIds: [],
      };

      expect(argument.id).toBe(id);
    });
  });

  it('should handle duplicate statement IDs in premises', () => {
    const argument: AtomicArgumentDTO = {
      id: 'arg_duplicate_premises',
      premiseIds: ['stmt_1', 'stmt_2', 'stmt_1'], // Duplicate allowed in array
      conclusionIds: ['stmt_3'],
    };

    expect(argument.premiseIds).toHaveLength(3);
    expect(argument.premiseIds[0]).toBe('stmt_1');
    expect(argument.premiseIds[1]).toBe('stmt_2');
    expect(argument.premiseIds[2]).toBe('stmt_1');
    expect(argument.conclusionIds).toEqual(['stmt_3']);
  });

  it('should handle special characters in IDs', () => {
    const argument: AtomicArgumentDTO = {
      id: 'arg@special#chars',
      premiseIds: ['stmt@special', 'stmt#with%encoding'],
      conclusionIds: ['stmt@result'],
    };

    expect(argument.id).toBe('arg@special#chars');
    expect(argument.premiseIds[0]).toBe('stmt@special');
    expect(argument.premiseIds[1]).toBe('stmt#with%encoding');
    expect(argument.conclusionIds[0]).toBe('stmt@result');
  });
});

describe('AtomicArgumentDTO Advanced Features', () => {
  it('should handle complete atomic argument', () => {
    const argument: AtomicArgumentDTO = {
      id: 'arg_12345',
      premiseIds: ['stmt_1', 'stmt_2'],
      conclusionIds: ['stmt_3'],
      sideLabels: {
        left: 'Modus Ponens',
        right: 'Classical Logic Ch. 3',
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
      id: 'arg_no_premise',
      premiseIds: [],
      conclusionIds: ['stmt_1', 'stmt_2'],
    };

    expect(argument.id).toBe('arg_no_premise');
    expect(argument.premiseIds).toEqual([]);
    expect(argument.conclusionIds).toEqual(['stmt_1', 'stmt_2']);
    expect(argument.sideLabels).toBeUndefined();
  });

  it('should handle argument without conclusions', () => {
    const argument: AtomicArgumentDTO = {
      id: 'arg_no_conclusion',
      premiseIds: ['stmt_1', 'stmt_2'],
      conclusionIds: [],
    };

    expect(argument.id).toBe('arg_no_conclusion');
    expect(argument.premiseIds).toEqual(['stmt_1', 'stmt_2']);
    expect(argument.conclusionIds).toEqual([]);
  });

  it('should handle bootstrap argument', () => {
    const argument: AtomicArgumentDTO = {
      id: 'arg_bootstrap',
      premiseIds: [],
      conclusionIds: [],
    };

    expect(argument.id).toBe('arg_bootstrap');
    expect(argument.premiseIds).toEqual([]);
    expect(argument.conclusionIds).toEqual([]);
  });

  it('should handle argument with only left side label', () => {
    const argument: AtomicArgumentDTO = {
      id: 'arg_left_only',
      premiseIds: ['stmt_1'],
      conclusionIds: ['stmt_2'],
      sideLabels: {
        left: 'Inference Rule',
      },
    };

    expect(argument.sideLabels?.left).toBe('Inference Rule');
    expect(argument.sideLabels?.right).toBeUndefined();
  });

  it('should handle argument with only right side label', () => {
    const argument: AtomicArgumentDTO = {
      id: 'arg_right_only',
      premiseIds: ['stmt_1'],
      conclusionIds: ['stmt_2'],
      sideLabels: {
        right: 'Reference Text',
      },
    };

    expect(argument.sideLabels?.left).toBeUndefined();
    expect(argument.sideLabels?.right).toBe('Reference Text');
  });

  it('should handle argument with empty side labels', () => {
    const argument: AtomicArgumentDTO = {
      id: 'arg_empty_labels',
      premiseIds: ['stmt_1'],
      conclusionIds: ['stmt_2'],
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
        id,
        premiseIds: [],
        conclusionIds: [],
      };

      expect(argument.id).toBe(id);
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
      id: 'arg_long_labels',
      premiseIds: ['stmt_1'],
      conclusionIds: ['stmt_2'],
      sideLabels: {
        left: longLeft,
        right: longRight,
      },
    };

    expect(argument.sideLabels?.left).toBe(longLeft);
    expect(argument.sideLabels?.right).toBe(longRight);
    expect(argument.sideLabels?.left?.length).toBeGreaterThan(200);
    expect(argument.sideLabels?.right?.length).toBeGreaterThan(200);
  });

  it('should handle special characters in side labels', () => {
    const argument: AtomicArgumentDTO = {
      id: 'arg_special_labels',
      premiseIds: ['stmt_1'],
      conclusionIds: ['stmt_2'],
      sideLabels: {
        left: 'Rule: ∀x (P(x) → Q(x))',
        right: 'Ref: "Logic & Philosophy" pg. 42',
      },
    };

    expect(argument.sideLabels?.left).toBe('Rule: ∀x (P(x) → Q(x))');
    expect(argument.sideLabels?.right).toBe('Ref: "Logic & Philosophy" pg. 42');
  });

  it('should handle empty string side labels', () => {
    const argument: AtomicArgumentDTO = {
      id: 'arg_empty_string_labels',
      premiseIds: ['stmt_1'],
      conclusionIds: ['stmt_2'],
      sideLabels: {
        left: '',
        right: '',
      },
    };

    expect(argument.sideLabels?.left).toBe('');
    expect(argument.sideLabels?.right).toBe('');
  });
});

describe('TreeDTO', () => {
  it('should handle basic tree', () => {
    const tree: TreeDTO = {
      id: 'tree_12345',
      position: {
        x: 100,
        y: 200,
      },
      nodeCount: 5,
      rootNodeIds: ['node_root'],
    };

    expect(tree.id).toBe('tree_12345');
    expect(tree.position.x).toBe(100);
    expect(tree.position.y).toBe(200);
    expect(tree.nodeCount).toBe(5);
    expect(tree.rootNodeIds).toEqual(['node_root']);
    expect(tree.bounds).toBeUndefined();
  });

  it('should handle tree with bounds', () => {
    const tree: TreeDTO = {
      id: 'tree_with_bounds',
      position: {
        x: 50,
        y: 75,
      },
      bounds: {
        width: 800,
        height: 600,
      },
      nodeCount: 10,
      rootNodeIds: ['node_1', 'node_2'],
    };

    expect(tree.bounds?.width).toBe(800);
    expect(tree.bounds?.height).toBe(600);
    expect(tree.rootNodeIds).toHaveLength(2);
  });

  it('should handle tree at origin', () => {
    const tree: TreeDTO = {
      id: 'tree_origin',
      position: {
        x: 0,
        y: 0,
      },
      nodeCount: 1,
      rootNodeIds: ['node_single'],
    };

    expect(tree.position.x).toBe(0);
    expect(tree.position.y).toBe(0);
    expect(tree.nodeCount).toBe(1);
  });

  it('should handle tree with negative coordinates', () => {
    const tree: TreeDTO = {
      id: 'tree_negative',
      position: {
        x: -100,
        y: -200,
      },
      nodeCount: 3,
      rootNodeIds: ['node_root'],
    };

    expect(tree.position.x).toBe(-100);
    expect(tree.position.y).toBe(-200);
  });

  it('should handle tree with large coordinates', () => {
    const tree: TreeDTO = {
      id: 'tree_large',
      position: {
        x: 10000,
        y: 20000,
      },
      bounds: {
        width: 5000,
        height: 8000,
      },
      nodeCount: 100,
      rootNodeIds: ['node_1'],
    };

    expect(tree.position.x).toBe(10000);
    expect(tree.position.y).toBe(20000);
    expect(tree.bounds?.width).toBe(5000);
    expect(tree.bounds?.height).toBe(8000);
    expect(tree.nodeCount).toBe(100);
  });

  it('should handle tree with zero node count', () => {
    const tree: TreeDTO = {
      id: 'tree_empty',
      position: {
        x: 0,
        y: 0,
      },
      nodeCount: 0,
      rootNodeIds: [],
    };

    expect(tree.nodeCount).toBe(0);
    expect(tree.rootNodeIds).toEqual([]);
  });

  it('should handle tree with multiple root nodes', () => {
    const rootNodeIds = Array.from({ length: 5 }, (_, i) => `root_node_${i + 1}`);

    const tree: TreeDTO = {
      id: 'tree_multi_root',
      position: {
        x: 300,
        y: 400,
      },
      nodeCount: 20,
      rootNodeIds,
    };

    expect(tree.rootNodeIds).toHaveLength(5);
    expect(tree.rootNodeIds[0]).toBe('root_node_1');
    expect(tree.rootNodeIds[4]).toBe('root_node_5');
  });

  it('should handle tree with zero bounds', () => {
    const tree: TreeDTO = {
      id: 'tree_zero_bounds',
      position: {
        x: 0,
        y: 0,
      },
      bounds: {
        width: 0,
        height: 0,
      },
      nodeCount: 1,
      rootNodeIds: ['node_1'],
    };

    expect(tree.bounds?.width).toBe(0);
    expect(tree.bounds?.height).toBe(0);
  });

  it('should handle tree with fractional coordinates', () => {
    const tree: TreeDTO = {
      id: 'tree_fractional',
      position: {
        x: 123.456,
        y: 789.012,
      },
      bounds: {
        width: 456.789,
        height: 234.567,
      },
      nodeCount: 7,
      rootNodeIds: ['node_precise'],
    };

    expect(tree.position.x).toBe(123.456);
    expect(tree.position.y).toBe(789.012);
    expect(tree.bounds?.width).toBe(456.789);
    expect(tree.bounds?.height).toBe(234.567);
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
        id,
        position: { x: 0, y: 0 },
        nodeCount: 1,
        rootNodeIds: ['node_1'],
      };

      expect(tree.id).toBe(id);
    });
  });
});

describe('ValidationErrorDTO', () => {
  it('should handle basic validation error', () => {
    const error: ValidationErrorDTO = {
      code: 'REQUIRED_FIELD',
      message: 'Field is required',
      severity: 'error',
    };

    expect(error.code).toBe('REQUIRED_FIELD');
    expect(error.message).toBe('Field is required');
    expect(error.severity).toBe('error');
    expect(error.location).toBeUndefined();
  });

  it('should handle validation error with location', () => {
    const error: ValidationErrorDTO = {
      code: 'INVALID_ARGUMENT',
      message: 'Argument structure is invalid',
      severity: 'error',
      location: {
        treeId: 'tree_123',
        nodeId: 'node_456',
        argumentId: 'arg_789',
      },
    };

    expect(error.location?.treeId).toBe('tree_123');
    expect(error.location?.nodeId).toBe('node_456');
    expect(error.location?.argumentId).toBe('arg_789');
  });

  it('should handle all valid severity levels', () => {
    const severities: Array<'error' | 'warning' | 'info'> = ['error', 'warning', 'info'];

    severities.forEach((severity) => {
      const error: ValidationErrorDTO = {
        code: `TEST_${severity.toUpperCase()}`,
        message: `Test ${severity} message`,
        severity,
      };

      expect(error.severity).toBe(severity);
    });
  });

  it('should handle partial location information', () => {
    // Test single field locations
    const singleFieldCases = [
      { location: { treeId: 'tree_only' } },
      { location: { nodeId: 'node_only' } },
      { location: { argumentId: 'arg_only' } },
    ];

    singleFieldCases.forEach(({ location }) => {
      const error: ValidationErrorDTO = {
        code: 'PARTIAL_LOCATION',
        message: 'Partial location test',
        severity: 'warning',
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
    const multiFieldLocation = { treeId: 'tree_123', nodeId: 'node_456' };
    const multiFieldError: ValidationErrorDTO = {
      code: 'PARTIAL_LOCATION',
      message: 'Multi-field location test',
      severity: 'warning',
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
        code,
        message: `Error message for ${code}`,
        severity: 'error',
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
      code: 'DETAILED_ERROR',
      message: longMessage,
      severity: 'error',
    };

    expect(error.message).toBe(longMessage);
    expect(error.message.length).toBeGreaterThan(200);
  });

  it('should handle empty error message', () => {
    const error: ValidationErrorDTO = {
      code: 'EMPTY_MESSAGE',
      message: '',
      severity: 'info',
    };

    expect(error.message).toBe('');
  });

  it('should handle special characters in error messages', () => {
    const error: ValidationErrorDTO = {
      code: 'SPECIAL_CHARS',
      message: 'Error with symbols: ∀∃→∧∨¬ and quotes "like this" and apostrophes \'like this\'',
      severity: 'warning',
    };

    expect(error.message).toContain('∀∃→∧∨¬');
    expect(error.message).toContain('"like this"');
    expect(error.message).toContain("'like this'");
  });

  it('should handle various location ID formats', () => {
    const idFormats = [
      {
        treeId: 'tree_123',
        nodeId: 'node_456',
        argumentId: 'arg_789',
      },
      {
        treeId: '550e8400-e29b-41d4-a716-446655440000',
        nodeId: '123e4567-e89b-12d3-a456-426614174000',
        argumentId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      },
      {
        treeId: 'TREE_UPPERCASE',
        nodeId: 'NODE_UPPERCASE',
        argumentId: 'ARG_UPPERCASE',
      },
    ];

    idFormats.forEach((location, index) => {
      const error: ValidationErrorDTO = {
        code: `FORMAT_TEST_${index}`,
        message: 'Format test message',
        severity: 'info',
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
          const argument: AtomicArgumentDTO = params;

          expect(typeof argument.id).toBe('string');
          expect(Array.isArray(argument.premiseIds)).toBe(true);
          expect(Array.isArray(argument.conclusionIds)).toBe(true);

          argument.premiseIds.forEach((stmtId) => {
            expect(typeof stmtId).toBe('string');
          });

          argument.conclusionIds.forEach((stmtId) => {
            expect(typeof stmtId).toBe('string');
          });

          if (argument.sideLabels !== undefined) {
            if (argument.sideLabels.left !== undefined) {
              expect(typeof argument.sideLabels.left).toBe('string');
            }
            if (argument.sideLabels.right !== undefined) {
              expect(typeof argument.sideLabels.right).toBe('string');
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
          const argument: AtomicArgumentDTO = {
            id: params.id,
            premiseIds: params.premiseIds,
            conclusionIds: params.conclusionIds,
            ...(params.sideLabels !== undefined && {
              sideLabels: {
                ...(params.sideLabels.left !== undefined && { left: params.sideLabels.left }),
                ...(params.sideLabels.right !== undefined && { right: params.sideLabels.right }),
              },
            }),
          };

          expect(typeof argument.id).toBe('string');
          expect(Array.isArray(argument.premiseIds)).toBe(true);
          expect(Array.isArray(argument.conclusionIds)).toBe(true);

          argument.premiseIds.forEach((id) => {
            expect(typeof id).toBe('string');
          });

          argument.conclusionIds.forEach((id) => {
            expect(typeof id).toBe('string');
          });

          if (argument.sideLabels !== undefined) {
            if (argument.sideLabels.left !== undefined) {
              expect(typeof argument.sideLabels.left).toBe('string');
            }
            if (argument.sideLabels.right !== undefined) {
              expect(typeof argument.sideLabels.right).toBe('string');
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
            id: params.id,
            position: params.position,
            nodeCount: params.nodeCount,
            rootNodeIds: params.rootNodeIds,
            ...(params.bounds !== undefined && { bounds: params.bounds }),
          };

          expect(typeof tree.id).toBe('string');
          expect(typeof tree.position.x).toBe('number');
          expect(typeof tree.position.y).toBe('number');
          expect(typeof tree.nodeCount).toBe('number');
          expect(tree.nodeCount).toBeGreaterThanOrEqual(0);
          expect(Array.isArray(tree.rootNodeIds)).toBe(true);

          tree.rootNodeIds.forEach((nodeId) => {
            expect(typeof nodeId).toBe('string');
          });

          if (tree.bounds !== undefined) {
            expect(typeof tree.bounds.width).toBe('number');
            expect(typeof tree.bounds.height).toBe('number');
            expect(tree.bounds.width).toBeGreaterThanOrEqual(0);
            expect(tree.bounds.height).toBeGreaterThanOrEqual(0);
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
          severity: fc.constantFrom('error', 'warning', 'info'),
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
            code: params.code,
            message: params.message,
            severity: params.severity,
            ...(params.location !== undefined && {
              location: {
                ...(params.location.treeId !== undefined && { treeId: params.location.treeId }),
                ...(params.location.nodeId !== undefined && { nodeId: params.location.nodeId }),
                ...(params.location.argumentId !== undefined && {
                  argumentId: params.location.argumentId,
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
      id: 'arg_complex_logic',
      premiseIds: ['stmt_major_premise', 'stmt_minor_premise', 'stmt_assumption'],
      conclusionIds: ['stmt_intermediate_conclusion', 'stmt_derived_result'],
      sideLabels: {
        left: 'Complex Syllogism',
        right: 'Formal Logic Reference',
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
      id: 'arg_step_1',
      premiseIds: ['stmt_p1', 'stmt_p2'],
      conclusionIds: ['stmt_intermediate'],
      sideLabels: {
        left: 'Modus Ponens',
        right: 'Step 1',
      },
    };

    // Second argument: intermediate conclusion → final conclusion
    const arg2: AtomicArgumentDTO = {
      id: 'arg_step_2',
      premiseIds: ['stmt_intermediate', 'stmt_additional'], // Reuses intermediate from arg1
      conclusionIds: ['stmt_final'],
      sideLabels: {
        left: 'Universal Instantiation',
        right: 'Step 2',
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
      id: 'tree_complex_proof',
      position: {
        x: 150.5,
        y: 300.75,
      },
      bounds: {
        width: 1200.25,
        height: 800.5,
      },
      nodeCount: 15,
      rootNodeIds: ['node_axiom_1', 'node_axiom_2', 'node_definition'],
    };

    expect(tree.nodeCount).toBe(15);
    expect(tree.rootNodeIds).toHaveLength(3);
    expect(tree.position.x).toBe(150.5);
    expect(tree.position.y).toBe(300.75);
    expect(tree.bounds?.width).toBe(1200.25);
    expect(tree.bounds?.height).toBe(800.5);

    // Verify tree has multiple entry points (axioms and definitions)
    expect(tree.rootNodeIds).toContain('node_axiom_1');
    expect(tree.rootNodeIds).toContain('node_axiom_2');
    expect(tree.rootNodeIds).toContain('node_definition');
  });

  it('should handle validation error with complete location context', () => {
    const error: ValidationErrorDTO = {
      code: 'CIRCULAR_DEPENDENCY_DETECTED',
      message:
        'A circular dependency has been detected in the argument chain starting from argument arg_problematic',
      severity: 'error',
      location: {
        treeId: 'tree_main_proof',
        nodeId: 'node_circular_start',
        argumentId: 'arg_problematic',
      },
    };

    expect(error.code).toBe('CIRCULAR_DEPENDENCY_DETECTED');
    expect(error.severity).toBe('error');
    expect(error.location?.treeId).toBe('tree_main_proof');
    expect(error.location?.nodeId).toBe('node_circular_start');
    expect(error.location?.argumentId).toBe('arg_problematic');
    expect(error.message).toContain('circular dependency');
    expect(error.message).toContain('arg_problematic');
  });

  it('should handle complex proof structure with bootstrap arguments', () => {
    // Bootstrap argument (empty starting point)
    const bootstrapArg: AtomicArgumentDTO = {
      id: 'arg_bootstrap',
      premiseIds: [],
      conclusionIds: [],
    };

    // First real argument using external premises
    const firstArg: AtomicArgumentDTO = {
      id: 'arg_first_step',
      premiseIds: ['stmt_axiom_1', 'stmt_axiom_2', 'stmt_definition_1'],
      conclusionIds: ['stmt_first_conclusion'],
      sideLabels: {
        left: 'Axiom Application',
        right: 'Foundation',
      },
    };

    // Tree structure containing all arguments
    const proofTree: TreeDTO = {
      id: 'tree_complete_proof',
      position: { x: 0, y: 0 },
      bounds: { width: 2000, height: 1500 },
      nodeCount: 2,
      rootNodeIds: ['node_bootstrap', 'node_first_step'],
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
        code: 'CRITICAL_LOGIC_ERROR',
        message: 'Invalid logical inference detected',
        severity: 'error',
        location: {
          treeId: 'tree_main',
          argumentId: 'arg_invalid',
        },
      },
      {
        code: 'MISSING_SIDE_LABEL',
        message: 'Argument missing descriptive side label',
        severity: 'warning',
        location: {
          argumentId: 'arg_unlabeled',
        },
      },
      {
        code: 'STYLE_SUGGESTION',
        message: 'Consider using more descriptive statement content',
        severity: 'info',
        location: {
          treeId: 'tree_main',
          nodeId: 'node_generic',
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
          severity: 'error',
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
        const dto = createAtomicArgumentDTO('arg-123', ['stmt-1', 'stmt-2'], ['stmt-3']);
        expect(dto.id).toBe('arg-123');
        expect(dto.premiseIds).toEqual(['stmt-1', 'stmt-2']);
        expect(dto.conclusionIds).toEqual(['stmt-3']);
        expect(dto.sideLabels).toBeUndefined();
        expect(isAtomicArgumentDTO(dto)).toBe(true);
      });
    });

    describe('createAtomicArgumentDTO with arrays', () => {
      it('should create valid AtomicArgumentDTO with statement arrays', () => {
        const dto = createAtomicArgumentDTO('arg-123', ['stmt-1'], ['stmt-2']);
        expect(dto.id).toBe('arg-123');
        expect(dto.premiseIds).toEqual(['stmt-1']);
        expect(dto.conclusionIds).toEqual(['stmt-2']);
        expect(dto.sideLabels).toBeUndefined();
        expect(isAtomicArgumentDTO(dto)).toBe(true);
      });

      it('should handle empty premise/conclusion arrays', () => {
        const dto = createAtomicArgumentDTO('arg-123', [], []);
        expect(dto.premiseIds).toEqual([]);
        expect(dto.conclusionIds).toEqual([]);
      });
    });

    describe('createTreeDTO', () => {
      it('should create valid TreeDTO', () => {
        const dto = createTreeDTO('tree-123', { x: 10, y: 20 }, 0, [], { width: 100, height: 200 });
        expect(dto.id).toBe('tree-123');
        expect(dto.position).toEqual({ x: 10, y: 20 });
        expect(dto.bounds).toEqual({ width: 100, height: 200 });
        expect(dto.nodeCount).toBe(0);
        expect(dto.rootNodeIds).toEqual([]);
        expect(isTreeDTO(dto)).toBe(true);
      });
    });

    describe('createValidationErrorDTO', () => {
      it('should create valid ValidationErrorDTO', () => {
        const location = { treeId: 'tree-1' };
        const dto = createValidationErrorDTO('ERROR_CODE', 'Error message', 'error', location);
        expect(dto.code).toBe('ERROR_CODE');
        expect(dto.message).toBe('Error message');
        expect(dto.severity).toBe('error');
        expect(dto.location).toEqual(location);
        expect(isValidationErrorDTO(dto)).toBe(true);
      });
    });
  });

  describe('Validation Functions', () => {
    describe('validateAtomicArgumentDTO', () => {
      it('should return empty array for valid DTO', () => {
        const validDTO = createAtomicArgumentDTO('arg-123', ['premise-1'], ['conclusion-1']);
        const errors = validateAtomicArgumentDTO(validDTO);
        expect(errors).toEqual([]);
      });

      it('should return errors for invalid DTO', () => {
        const errors = validateAtomicArgumentDTO({});
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    describe('validateTreeDTO', () => {
      it('should return empty array for valid DTO', () => {
        const position = Position2D.create(0, 0).value;
        const nodeCount = NodeCount.create(0).value;
        const bounds = Dimensions.create(100, 200).value;
        const validDTO = createTreeDTO('tree-123', position, nodeCount, [], bounds);
        const errors = validateTreeDTO(validDTO);
        expect(errors).toEqual([]);
      });

      it('should return errors for invalid DTO', () => {
        const errors = validateTreeDTO({});
        expect(errors.length).toBeGreaterThan(0);
      });

      it('should detect trees with zero nodes but root node IDs', () => {
        const position = Position2D.create(0, 0).value;
        const nodeCount = NodeCount.create(0).value;
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
        const position = Position2D.create(0, 0).value;
        const nodeCount = NodeCount.create(5).value;
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
        const position = Position2D.create(100, 200).value;
        const nodeCount = NodeCount.create(3).value;
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
        expect(() => createAtomicArgumentDTO('', ['stmt-1'], ['stmt-2'])).toThrow(
          'Argument ID cannot be empty',
        );
        expect(() => createAtomicArgumentDTO('   ', ['stmt-1'], ['stmt-2'])).toThrow(
          'Argument ID cannot be empty',
        );
        expect(() =>
          createAtomicArgumentDTO('arg-1', ['valid', '', 'another'], ['stmt-2']),
        ).toThrow('Premise IDs must be non-empty strings');
        expect(() =>
          createAtomicArgumentDTO('arg-1', ['stmt-1'], ['valid', '', 'another']),
        ).toThrow('Conclusion IDs must be non-empty strings');
      });

      it('should handle createTreeDTO error conditions', () => {
        expect(() => createTreeDTO('', { x: 0, y: 0 }, 0, [])).toThrow('Tree ID cannot be empty');
        expect(() => createTreeDTO('tree-1', { x: Number.NaN, y: 0 }, 0, [])).toThrow(
          'Invalid position coordinates',
        );
        expect(() => createTreeDTO('tree-1', { x: 0, y: 0 }, -1, [])).toThrow(
          'Node count must be a non-negative integer',
        );
        expect(() => createTreeDTO('tree-1', { x: 0, y: 0 }, 0, ['', 'valid'])).toThrow(
          'Root node IDs must be non-empty strings',
        );
      });

      it('should handle createValidationErrorDTO error conditions', () => {
        expect(() => createValidationErrorDTO('', 'message', 'error')).toThrow(
          'Error code cannot be empty',
        );
        expect(() => createValidationErrorDTO('CODE', '', 'error')).toThrow(
          'Error message cannot be empty',
        );
        expect(() => createValidationErrorDTO('CODE', 'message', 'invalid' as any)).toThrow(
          'Invalid severity level',
        );
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
          expect(isValidBounds({ width: Number.POSITIVE_INFINITY, height: 100 })).toBe(false);
          expect(isValidBounds({ width: 100, height: Number.NaN })).toBe(false);
        });

        it('should reject negative dimensions', () => {
          expect(isValidBounds({ width: -1, height: 100 })).toBe(false);
          expect(isValidBounds({ width: 100, height: -0.1 })).toBe(false);
        });

        it('should accept zero dimensions', () => {
          expect(isValidBounds({ width: 0, height: 0 })).toBe(true);
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
            severity: 'error' as const,
            location: null, // Should be object
          };
          expect(isValidationErrorDTO(invalidLocation1)).toBe(false);

          const invalidLocation2 = {
            code: 'ERROR',
            message: 'Error message',
            severity: 'error' as const,
            location: { treeId: 123 }, // Should be string
          };
          expect(isValidationErrorDTO(invalidLocation2)).toBe(false);
        });
      });
    });
  });
});

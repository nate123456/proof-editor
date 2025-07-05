/**
 * Comprehensive test suite for shared-types.ts DTOs
 *
 * Tests data structure validation, type integrity, and boundary conditions
 * for shared DTOs used across multiple query modules to avoid circular dependencies.
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  type AtomicArgumentDTO,
  createAtomicArgumentDTO,
  createOrderedSetDTO,
  createTreeDTO,
  createValidationErrorDTO,
  isAtomicArgumentDTO,
  isOrderedSetDTO,
  isTreeDTO,
  isValidationErrorDTO,
  isValidBounds,
  isValidPosition,
  isValidSeverity,
  // Import executable functions for testing
  isValidUsageType,
  type OrderedSetDTO,
  type TreeDTO,
  type ValidationErrorDTO,
  validateAtomicArgumentDTO,
  validateOrderedSetDTO,
  validateTreeDTO,
} from '../shared-types.js';

describe('OrderedSetDTO', () => {
  it('should handle basic ordered set', () => {
    const orderedSet: OrderedSetDTO = {
      id: 'set_12345',
      statementIds: ['stmt_1', 'stmt_2', 'stmt_3'],
      usageCount: 2,
      usedBy: [
        {
          argumentId: 'arg_1',
          usage: 'premise',
        },
        {
          argumentId: 'arg_2',
          usage: 'conclusion',
        },
      ],
    };

    expect(orderedSet.id).toBe('set_12345');
    expect(orderedSet.statementIds).toEqual(['stmt_1', 'stmt_2', 'stmt_3']);
    expect(orderedSet.usageCount).toBe(2);
    expect(orderedSet.usedBy).toHaveLength(2);
    expect(orderedSet.usedBy[0]?.usage).toBe('premise');
    expect(orderedSet.usedBy[1]?.usage).toBe('conclusion');
  });

  it('should handle empty ordered set', () => {
    const orderedSet: OrderedSetDTO = {
      id: 'set_empty',
      statementIds: [],
      usageCount: 0,
      usedBy: [],
    };

    expect(orderedSet.id).toBe('set_empty');
    expect(orderedSet.statementIds).toEqual([]);
    expect(orderedSet.usageCount).toBe(0);
    expect(orderedSet.usedBy).toEqual([]);
  });

  it('should handle single statement ordered set', () => {
    const orderedSet: OrderedSetDTO = {
      id: 'set_single',
      statementIds: ['stmt_only'],
      usageCount: 1,
      usedBy: [
        {
          argumentId: 'arg_single',
          usage: 'premise',
        },
      ],
    };

    expect(orderedSet.statementIds).toHaveLength(1);
    expect(orderedSet.statementIds[0]).toBe('stmt_only');
    expect(orderedSet.usedBy).toHaveLength(1);
  });

  it('should handle ordered set with many statements', () => {
    const statementIds = Array.from({ length: 20 }, (_, i) => `stmt_${i + 1}`);

    const orderedSet: OrderedSetDTO = {
      id: 'set_many',
      statementIds,
      usageCount: 5,
      usedBy: Array.from({ length: 5 }, (_, i) => ({
        argumentId: `arg_${i + 1}`,
        usage: i % 2 === 0 ? ('premise' as const) : ('conclusion' as const),
      })),
    };

    expect(orderedSet.statementIds).toHaveLength(20);
    expect(orderedSet.usedBy).toHaveLength(5);
    expect(orderedSet.statementIds[0]).toBe('stmt_1');
    expect(orderedSet.statementIds[19]).toBe('stmt_20');
  });

  it('should handle all valid usage types', () => {
    const usageTypes: Array<'premise' | 'conclusion'> = ['premise', 'conclusion'];

    usageTypes.forEach((usage, index) => {
      const orderedSet: OrderedSetDTO = {
        id: `set_${usage}`,
        statementIds: ['stmt_1'],
        usageCount: 1,
        usedBy: [
          {
            argumentId: `arg_${index}`,
            usage,
          },
        ],
      };

      expect(orderedSet.usedBy[0]?.usage).toBe(usage);
    });
  });

  it('should handle zero usage count', () => {
    const orderedSet: OrderedSetDTO = {
      id: 'set_unused',
      statementIds: ['stmt_1', 'stmt_2'],
      usageCount: 0,
      usedBy: [],
    };

    expect(orderedSet.usageCount).toBe(0);
    expect(orderedSet.usedBy).toHaveLength(0);
  });

  it('should handle large usage count', () => {
    const usedBy = Array.from({ length: 100 }, (_, i) => ({
      argumentId: `arg_${i}`,
      usage: (i % 2 === 0 ? 'premise' : 'conclusion') as 'premise' | 'conclusion',
    }));

    const orderedSet: OrderedSetDTO = {
      id: 'set_heavily_used',
      statementIds: ['stmt_shared'],
      usageCount: 100,
      usedBy,
    };

    expect(orderedSet.usageCount).toBe(100);
    expect(orderedSet.usedBy).toHaveLength(100);
  });

  it('should handle various ID formats', () => {
    const idFormats = [
      'set_123',
      'ordered-set-456',
      'SET_UPPERCASE',
      'set.with.dots',
      'set_with_underscores',
      '550e8400-e29b-41d4-a716-446655440000',
    ];

    idFormats.forEach((id) => {
      const orderedSet: OrderedSetDTO = {
        id,
        statementIds: [],
        usageCount: 0,
        usedBy: [],
      };

      expect(orderedSet.id).toBe(id);
    });
  });

  it('should handle duplicate argument usage', () => {
    const orderedSet: OrderedSetDTO = {
      id: 'set_duplicate_usage',
      statementIds: ['stmt_1'],
      usageCount: 2,
      usedBy: [
        {
          argumentId: 'arg_same',
          usage: 'premise',
        },
        {
          argumentId: 'arg_same',
          usage: 'conclusion',
        },
      ],
    };

    expect(orderedSet.usedBy).toHaveLength(2);
    expect(orderedSet.usedBy[0]?.argumentId).toBe('arg_same');
    expect(orderedSet.usedBy[1]?.argumentId).toBe('arg_same');
    expect(orderedSet.usedBy[0]?.usage).toBe('premise');
    expect(orderedSet.usedBy[1]?.usage).toBe('conclusion');
  });

  it('should handle special characters in IDs', () => {
    const orderedSet: OrderedSetDTO = {
      id: 'set@special#chars',
      statementIds: ['stmt@special', 'stmt#with%encoding'],
      usageCount: 1,
      usedBy: [
        {
          argumentId: 'arg@special',
          usage: 'premise',
        },
      ],
    };

    expect(orderedSet.id).toBe('set@special#chars');
    expect(orderedSet.statementIds[0]).toBe('stmt@special');
    expect(orderedSet.usedBy[0]?.argumentId).toBe('arg@special');
  });
});

describe('AtomicArgumentDTO', () => {
  it('should handle complete atomic argument', () => {
    const argument: AtomicArgumentDTO = {
      id: 'arg_12345',
      premiseSetId: 'set_premise',
      conclusionSetId: 'set_conclusion',
      sideLabels: {
        left: 'Modus Ponens',
        right: 'Classical Logic Ch. 3',
      },
    };

    expect(argument.id).toBe('arg_12345');
    expect(argument.premiseSetId).toBe('set_premise');
    expect(argument.conclusionSetId).toBe('set_conclusion');
    expect(argument.sideLabels?.left).toBe('Modus Ponens');
    expect(argument.sideLabels?.right).toBe('Classical Logic Ch. 3');
  });

  it('should handle argument without premise set', () => {
    const argument: AtomicArgumentDTO = {
      id: 'arg_no_premise',
      premiseSetId: null,
      conclusionSetId: 'set_conclusion',
    };

    expect(argument.id).toBe('arg_no_premise');
    expect(argument.premiseSetId).toBeNull();
    expect(argument.conclusionSetId).toBe('set_conclusion');
    expect(argument.sideLabels).toBeUndefined();
  });

  it('should handle argument without conclusion set', () => {
    const argument: AtomicArgumentDTO = {
      id: 'arg_no_conclusion',
      premiseSetId: 'set_premise',
      conclusionSetId: null,
    };

    expect(argument.id).toBe('arg_no_conclusion');
    expect(argument.premiseSetId).toBe('set_premise');
    expect(argument.conclusionSetId).toBeNull();
  });

  it('should handle bootstrap argument', () => {
    const argument: AtomicArgumentDTO = {
      id: 'arg_bootstrap',
      premiseSetId: null,
      conclusionSetId: null,
    };

    expect(argument.id).toBe('arg_bootstrap');
    expect(argument.premiseSetId).toBeNull();
    expect(argument.conclusionSetId).toBeNull();
  });

  it('should handle argument with only left side label', () => {
    const argument: AtomicArgumentDTO = {
      id: 'arg_left_only',
      premiseSetId: 'set_premise',
      conclusionSetId: 'set_conclusion',
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
      premiseSetId: 'set_premise',
      conclusionSetId: 'set_conclusion',
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
      premiseSetId: 'set_premise',
      conclusionSetId: 'set_conclusion',
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
        premiseSetId: null,
        conclusionSetId: null,
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
      premiseSetId: 'set_premise',
      conclusionSetId: 'set_conclusion',
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
      premiseSetId: 'set_premise',
      conclusionSetId: 'set_conclusion',
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
      premiseSetId: 'set_premise',
      conclusionSetId: 'set_conclusion',
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
  it('should handle arbitrary ordered set DTOs', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string(),
          statementIds: fc.array(fc.string()),
          usageCount: fc.nat(),
          usedBy: fc.array(
            fc.record({
              argumentId: fc.string(),
              usage: fc.constantFrom('premise', 'conclusion'),
            }),
          ),
        }),
        (params) => {
          const orderedSet: OrderedSetDTO = params;

          expect(typeof orderedSet.id).toBe('string');
          expect(Array.isArray(orderedSet.statementIds)).toBe(true);
          expect(typeof orderedSet.usageCount).toBe('number');
          expect(orderedSet.usageCount).toBeGreaterThanOrEqual(0);
          expect(Array.isArray(orderedSet.usedBy)).toBe(true);

          orderedSet.statementIds.forEach((stmtId) => {
            expect(typeof stmtId).toBe('string');
          });

          orderedSet.usedBy.forEach((usage) => {
            expect(typeof usage.argumentId).toBe('string');
            expect(['premise', 'conclusion']).toContain(usage.usage);
          });
        },
      ),
    );
  });

  it('should handle arbitrary atomic argument DTOs', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string(),
          premiseSetId: fc.option(fc.string(), { nil: null }),
          conclusionSetId: fc.option(fc.string(), { nil: null }),
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
            premiseSetId: params.premiseSetId,
            conclusionSetId: params.conclusionSetId,
            ...(params.sideLabels !== undefined && {
              sideLabels: {
                ...(params.sideLabels.left !== undefined && { left: params.sideLabels.left }),
                ...(params.sideLabels.right !== undefined && { right: params.sideLabels.right }),
              },
            }),
          };

          expect(typeof argument.id).toBe('string');

          if (argument.premiseSetId !== null) {
            expect(typeof argument.premiseSetId).toBe('string');
          }

          if (argument.conclusionSetId !== null) {
            expect(typeof argument.conclusionSetId).toBe('string');
          }

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
  it('should handle ordered set with multiple argument usages', () => {
    const orderedSet: OrderedSetDTO = {
      id: 'set_shared_logic',
      statementIds: ['stmt_major_premise', 'stmt_minor_premise'],
      usageCount: 3,
      usedBy: [
        {
          argumentId: 'arg_syllogism_1',
          usage: 'premise',
        },
        {
          argumentId: 'arg_syllogism_2',
          usage: 'premise',
        },
        {
          argumentId: 'arg_conclusion_derivation',
          usage: 'conclusion',
        },
      ],
    };

    expect(orderedSet.usageCount).toBe(3);
    expect(orderedSet.usedBy).toHaveLength(3);

    const premiseUsages = orderedSet.usedBy.filter((usage) => usage.usage === 'premise');
    const conclusionUsages = orderedSet.usedBy.filter((usage) => usage.usage === 'conclusion');

    expect(premiseUsages).toHaveLength(2);
    expect(conclusionUsages).toHaveLength(1);
  });

  it('should handle complete argument chain structure', () => {
    // First argument: premises → intermediate conclusion
    const arg1: AtomicArgumentDTO = {
      id: 'arg_step_1',
      premiseSetId: 'set_initial_premises',
      conclusionSetId: 'set_intermediate_conclusion',
      sideLabels: {
        left: 'Modus Ponens',
        right: 'Step 1',
      },
    };

    // Second argument: intermediate conclusion → final conclusion
    const arg2: AtomicArgumentDTO = {
      id: 'arg_step_2',
      premiseSetId: 'set_intermediate_conclusion', // Same as arg1's conclusion
      conclusionSetId: 'set_final_conclusion',
      sideLabels: {
        left: 'Universal Instantiation',
        right: 'Step 2',
      },
    };

    // Shared ordered set connecting the arguments
    const sharedSet: OrderedSetDTO = {
      id: 'set_intermediate_conclusion',
      statementIds: ['stmt_intermediate'],
      usageCount: 2,
      usedBy: [
        {
          argumentId: 'arg_step_1',
          usage: 'conclusion',
        },
        {
          argumentId: 'arg_step_2',
          usage: 'premise',
        },
      ],
    };

    expect(arg1.conclusionSetId).toBe(arg2.premiseSetId);
    expect(sharedSet.id).toBe(arg1.conclusionSetId);
    expect(sharedSet.usedBy).toHaveLength(2);
    expect(sharedSet.usedBy[0]?.usage).toBe('conclusion');
    expect(sharedSet.usedBy[1]?.usage).toBe('premise');
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
      premiseSetId: null,
      conclusionSetId: null,
    };

    // First real argument using external premises
    const firstArg: AtomicArgumentDTO = {
      id: 'arg_first_step',
      premiseSetId: 'set_axioms',
      conclusionSetId: 'set_first_conclusion',
      sideLabels: {
        left: 'Axiom Application',
        right: 'Foundation',
      },
    };

    // Shared axiom set
    const axiomSet: OrderedSetDTO = {
      id: 'set_axioms',
      statementIds: ['stmt_axiom_1', 'stmt_axiom_2', 'stmt_definition_1'],
      usageCount: 1,
      usedBy: [
        {
          argumentId: 'arg_first_step',
          usage: 'premise',
        },
      ],
    };

    // Tree structure containing all arguments
    const proofTree: TreeDTO = {
      id: 'tree_complete_proof',
      position: { x: 0, y: 0 },
      bounds: { width: 2000, height: 1500 },
      nodeCount: 2,
      rootNodeIds: ['node_bootstrap', 'node_first_step'],
    };

    expect(bootstrapArg.premiseSetId).toBeNull();
    expect(bootstrapArg.conclusionSetId).toBeNull();
    expect(firstArg.premiseSetId).toBe(axiomSet.id);
    expect(axiomSet.statementIds).toHaveLength(3);
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

    describe('isOrderedSetDTO', () => {
      it('should return true for valid OrderedSetDTO', () => {
        const validDTO = {
          id: 'set-123',
          statementIds: ['stmt-1', 'stmt-2'],
          usageCount: 1,
          usedBy: [{ argumentId: 'arg-1', usage: 'premise' }],
        };
        expect(isOrderedSetDTO(validDTO)).toBe(true);
      });

      it('should return false for invalid DTOs', () => {
        expect(isOrderedSetDTO(null)).toBe(false);
        expect(isOrderedSetDTO({})).toBe(false);
        expect(isOrderedSetDTO({ id: 'set-123' })).toBe(false);
      });
    });

    describe('isAtomicArgumentDTO', () => {
      it('should return true for valid AtomicArgumentDTO', () => {
        const validDTO = {
          id: 'arg-123',
          premiseSetId: 'set-1',
          conclusionSetId: 'set-2',
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
    describe('createOrderedSetDTO', () => {
      it('should create valid OrderedSetDTO', () => {
        const dto = createOrderedSetDTO('set-123', ['stmt-1', 'stmt-2'], 0, []);
        expect(dto.id).toBe('set-123');
        expect(dto.statementIds).toEqual(['stmt-1', 'stmt-2']);
        expect(dto.usageCount).toBe(0);
        expect(dto.usedBy).toEqual([]);
        expect(isOrderedSetDTO(dto)).toBe(true);
      });
    });

    describe('createAtomicArgumentDTO', () => {
      it('should create valid AtomicArgumentDTO', () => {
        const dto = createAtomicArgumentDTO('arg-123', 'set-1', 'set-2');
        expect(dto.id).toBe('arg-123');
        expect(dto.premiseSetId).toBe('set-1');
        expect(dto.conclusionSetId).toBe('set-2');
        expect(dto.sideLabels).toBeUndefined();
        expect(isAtomicArgumentDTO(dto)).toBe(true);
      });

      it('should handle null premise/conclusion sets', () => {
        const dto = createAtomicArgumentDTO('arg-123', null, null);
        expect(dto.premiseSetId).toBeNull();
        expect(dto.conclusionSetId).toBeNull();
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
    describe('validateOrderedSetDTO', () => {
      it('should return empty array for valid DTO', () => {
        const validDTO = createOrderedSetDTO('set-123', ['stmt-1'], 0, []);
        const errors = validateOrderedSetDTO(validDTO);
        expect(errors).toEqual([]);
      });

      it('should return errors for invalid DTO', () => {
        const errors = validateOrderedSetDTO({});
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    describe('validateAtomicArgumentDTO', () => {
      it('should return empty array for valid DTO', () => {
        const validDTO = createAtomicArgumentDTO('arg-123', 'set-1', 'set-2');
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
        const validDTO = createTreeDTO('tree-123', { x: 0, y: 0 }, 0, [], {
          width: 100,
          height: 200,
        });
        const errors = validateTreeDTO(validDTO);
        expect(errors).toEqual([]);
      });

      it('should return errors for invalid DTO', () => {
        const errors = validateTreeDTO({});
        expect(errors.length).toBeGreaterThan(0);
      });

      it('should detect trees with zero nodes but root node IDs', () => {
        const treeWithZeroNodesButRoots = {
          id: 'tree-inconsistent-1',
          position: { x: 0, y: 0 },
          nodeCount: 0,
          rootNodeIds: ['node-1', 'node-2'], // Should be empty if nodeCount is 0
        };

        const errors = validateTreeDTO(treeWithZeroNodesButRoots);
        expect(errors).toContain('Tree with zero nodes cannot have root node IDs');
      });

      it('should detect trees with nodes but no root node IDs', () => {
        const treeWithNodesButNoRoots = {
          id: 'tree-inconsistent-2',
          position: { x: 0, y: 0 },
          nodeCount: 5,
          rootNodeIds: [], // Should have at least one root if nodeCount > 0
        };

        const errors = validateTreeDTO(treeWithNodesButNoRoots);
        expect(errors).toContain('Tree with nodes must have at least one root node');
      });

      it('should allow valid tree with nodes and roots', () => {
        const validTree = {
          id: 'tree-valid',
          position: { x: 100, y: 200 },
          nodeCount: 3,
          rootNodeIds: ['root-1'],
        };

        const errors = validateTreeDTO(validTree);
        expect(errors).toEqual([]);
      });
    });
  });

  describe('Enhanced validation and edge case coverage', () => {
    describe('validateOrderedSetDTO comprehensive tests', () => {
      it('should detect usage count mismatch', () => {
        const dtoWithMismatch = {
          id: 'set-mismatch',
          statementIds: ['stmt-1'],
          usageCount: 5, // Mismatches usedBy array length
          usedBy: [
            { argumentId: 'arg-1', usage: 'premise' as const },
            { argumentId: 'arg-2', usage: 'conclusion' as const },
          ], // Only 2 items but usageCount is 5
        };

        const errors = validateOrderedSetDTO(dtoWithMismatch);
        expect(errors).toContain('Usage count does not match usedBy array length');
      });

      it('should detect duplicate statement IDs', () => {
        const dtoWithDuplicates = {
          id: 'set-duplicates',
          statementIds: ['stmt-1', 'stmt-2', 'stmt-1'], // Duplicate stmt-1
          usageCount: 1,
          usedBy: [{ argumentId: 'arg-1', usage: 'premise' as const }],
        };

        const errors = validateOrderedSetDTO(dtoWithDuplicates);
        expect(errors).toContain('Duplicate statement IDs found');
      });

      it('should handle multiple validation errors', () => {
        const dtoWithMultipleErrors = {
          id: 'set-multi-error',
          statementIds: ['stmt-1', 'stmt-1'], // Duplicates
          usageCount: 5, // Mismatch
          usedBy: [{ argumentId: 'arg-1', usage: 'premise' as const }], // Only 1 item
        };

        const errors = validateOrderedSetDTO(dtoWithMultipleErrors);
        expect(errors).toHaveLength(2);
        expect(errors).toContain('Usage count does not match usedBy array length');
        expect(errors).toContain('Duplicate statement IDs found');
      });
    });

    describe('validateAtomicArgumentDTO comprehensive tests', () => {
      it('should detect arguments without premise or conclusion sets', () => {
        const emptyArgument = {
          id: 'arg-empty',
          premiseSetId: null,
          conclusionSetId: null,
        };

        const errors = validateAtomicArgumentDTO(emptyArgument);
        expect(errors).toContain('Atomic argument must have at least premise or conclusion set');
      });

      it('should allow arguments with only premise set', () => {
        const premiseOnlyArg = {
          id: 'arg-premise-only',
          premiseSetId: 'set-premise',
          conclusionSetId: null,
        };

        const errors = validateAtomicArgumentDTO(premiseOnlyArg);
        expect(errors).toEqual([]);
      });

      it('should allow arguments with only conclusion set', () => {
        const conclusionOnlyArg = {
          id: 'arg-conclusion-only',
          premiseSetId: null,
          conclusionSetId: 'set-conclusion',
        };

        const errors = validateAtomicArgumentDTO(conclusionOnlyArg);
        expect(errors).toEqual([]);
      });
    });

    describe('Factory function error conditions', () => {
      it('should handle createOrderedSetDTO error conditions', () => {
        expect(() => createOrderedSetDTO('', ['stmt-1'], 0, [])).toThrow(
          'OrderedSet ID cannot be empty',
        );
        expect(() => createOrderedSetDTO('set-1', ['valid', '', 'another'], 0, [])).toThrow(
          'Statement IDs must be non-empty strings',
        );
        expect(() => createOrderedSetDTO('set-1', ['stmt-1'], -1, [])).toThrow(
          'Usage count must be a non-negative integer',
        );
        expect(() => createOrderedSetDTO('set-1', ['stmt-1'], 3.5, [])).toThrow(
          'Usage count must be a non-negative integer',
        );
      });

      it('should handle createAtomicArgumentDTO error conditions', () => {
        expect(() => createAtomicArgumentDTO('', 'set-1', 'set-2')).toThrow(
          'Argument ID cannot be empty',
        );
        expect(() => createAtomicArgumentDTO('   ', 'set-1', 'set-2')).toThrow(
          'Argument ID cannot be empty',
        );
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
            premiseSetId: 'set-1',
            conclusionSetId: 'set-2',
            sideLabels: null, // Should be object
          };
          expect(isAtomicArgumentDTO(invalidSideLabels1)).toBe(false);

          const invalidSideLabels2 = {
            id: 'arg-1',
            premiseSetId: 'set-1',
            conclusionSetId: 'set-2',
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

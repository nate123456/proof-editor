/**
 * Comprehensive test suite for ValidationMapper
 *
 * Priority: CRITICAL - 0% coverage → Target: 95%+
 * Tests validation error transformation and grouping functions
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ErrorCode, ErrorMessage, ErrorSeverity } from '../../../domain/index.js';
import { ValidationError } from '../../../domain/shared/result.js';
import type { ValidationErrorDTO } from '../../queries/shared-types.js';
import {
  filterErrorsBySeverity,
  groupErrorsByType,
  validationErrorsToDTOs,
  validationErrorToDTO,
} from '../ValidationMapper.js';

describe('ValidationMapper', () => {
  describe('validationErrorToDTO', () => {
    it('should convert basic ValidationError to DTO', () => {
      // Arrange
      const error = new ValidationError('Statement cannot be empty');

      // Act
      const result = validationErrorToDTO(error);

      // Assert
      expect(result.code.getValue()).toBe('EMPTY_STATEMENT');
      expect(result.message.getValue()).toBe('Statement cannot be empty');
      expect(result.severity).toBe(ErrorSeverity.ERROR);
    });

    it('should handle statement-related errors', () => {
      const testCases = [
        {
          message: 'Statement cannot be empty',
          expectedCode: 'EMPTY_STATEMENT',
          expectedSeverity: 'error' as const, // "cannot" triggers error severity
        },
        {
          message: 'Statement not found in repository',
          expectedCode: 'STATEMENT_NOT_FOUND',
          expectedSeverity: 'error' as const,
        },
        {
          message: 'Statement is already in use',
          expectedCode: 'STATEMENT_IN_USE',
          expectedSeverity: 'info' as const,
        },
        {
          message: 'Statement validation failed',
          expectedCode: 'STATEMENT_ERROR',
          expectedSeverity: 'info' as const,
        },
      ];

      testCases.forEach(({ message, expectedCode, expectedSeverity }) => {
        const error = new ValidationError(message);
        const result = validationErrorToDTO(error);

        expect(result.code.getValue()).toBe(expectedCode);
        expect(result.message.getValue()).toBe(message);
        const severityMap = {
          error: ErrorSeverity.ERROR,
          warning: ErrorSeverity.WARNING,
          info: ErrorSeverity.INFO,
        };
        expect(result.severity).toBe(severityMap[expectedSeverity]);
      });
    });

    it('should handle ordered set related errors', () => {
      const testCases = [
        {
          message: 'Ordered set contains duplicate items',
          expectedCode: 'DUPLICATE_IN_ORDERED_SET',
          expectedSeverity: 'info' as const, // No error/warning keywords
        },
        {
          message: 'Ordered set not found in document',
          expectedCode: 'ORDERED_SET_NOT_FOUND',
          expectedSeverity: 'error' as const,
        },
        {
          message: 'Ordered set validation error occurred',
          expectedCode: 'ORDERED_SET_ERROR',
          expectedSeverity: 'info' as const,
        },
      ];

      testCases.forEach(({ message, expectedCode, expectedSeverity }) => {
        const error = new ValidationError(message);
        const result = validationErrorToDTO(error);

        expect(result.code.getValue()).toBe(expectedCode);
        expect(result.message.getValue()).toBe(message);
        const severityMap = {
          error: ErrorSeverity.ERROR,
          warning: ErrorSeverity.WARNING,
          info: ErrorSeverity.INFO,
        };
        expect(result.severity).toBe(severityMap[expectedSeverity]);
      });
    });

    it('should handle argument-related errors', () => {
      const testCases = [
        {
          message: 'Argument creates a cycle in the proof structure',
          expectedCode: 'CYCLE_DETECTED',
          expectedSeverity: 'error' as const,
        },
        {
          message: 'Argument not found in proof',
          expectedCode: 'ARGUMENT_NOT_FOUND',
          expectedSeverity: 'error' as const,
        },
        {
          message: 'Argument connection is invalid',
          expectedCode: 'CONNECTION_ERROR',
          expectedSeverity: 'error' as const, // "invalid" triggers error severity
        },
        {
          message: 'Argument validation failed',
          expectedCode: 'ARGUMENT_ERROR',
          expectedSeverity: 'info' as const,
        },
      ];

      testCases.forEach(({ message, expectedCode, expectedSeverity }) => {
        const error = new ValidationError(message);
        const result = validationErrorToDTO(error);

        expect(result.code.getValue()).toBe(expectedCode);
        expect(result.message.getValue()).toBe(message);
        const severityMap = {
          error: ErrorSeverity.ERROR,
          warning: ErrorSeverity.WARNING,
          info: ErrorSeverity.INFO,
        };
        expect(result.severity).toBe(severityMap[expectedSeverity]);
      });
    });

    it('should handle tree-related errors', () => {
      const testCases = [
        {
          message: 'Tree node cannot be found',
          expectedCode: 'TREE_NODE_ERROR',
          expectedSeverity: 'error' as const,
        },
        {
          message: 'Tree position is invalid',
          expectedCode: 'TREE_POSITION_ERROR',
          expectedSeverity: 'error' as const,
        },
        {
          message: 'Tree structure is corrupted',
          expectedCode: 'TREE_ERROR',
          expectedSeverity: 'info' as const,
        },
      ];

      testCases.forEach(({ message, expectedCode, expectedSeverity }) => {
        const error = new ValidationError(message);
        const result = validationErrorToDTO(error);

        expect(result.code.getValue()).toBe(expectedCode);
        expect(result.message.getValue()).toBe(message);
        const severityMap = {
          error: ErrorSeverity.ERROR,
          warning: ErrorSeverity.WARNING,
          info: ErrorSeverity.INFO,
        };
        expect(result.severity).toBe(severityMap[expectedSeverity]);
      });
    });

    it('should handle bootstrap errors', () => {
      // Arrange
      const error = new ValidationError('Bootstrap validation failed');

      // Act
      const result = validationErrorToDTO(error);

      // Assert
      expect(result.code.getValue()).toBe('BOOTSTRAP_ERROR');
      expect(result.message.getValue()).toBe('Bootstrap validation failed');
      expect(result.severity).toBe(ErrorSeverity.INFO);
    });

    it('should handle generic validation errors', () => {
      // Arrange
      const error = new ValidationError('Some unexpected validation issue');

      // Act
      const result = validationErrorToDTO(error);

      // Assert
      expect(result.code.getValue()).toBe('VALIDATION_ERROR');
      expect(result.message.getValue()).toBe('Some unexpected validation issue');
      expect(result.severity).toBe(ErrorSeverity.INFO);
    });

    it('should extract location from error messages with tree ID', () => {
      // Arrange
      const error = new ValidationError('Error in tree: tree123');

      // Act
      const result = validationErrorToDTO(error);

      // Assert
      expect(result.location?.treeId?.getValue()).toBe('tree123');
    });

    it('should extract location from error messages with node ID', () => {
      // Arrange
      const error = new ValidationError('Invalid operation on node: node456');

      // Act
      const result = validationErrorToDTO(error);

      // Assert
      expect(result.location?.nodeId?.getValue()).toBe('node456');
    });

    it('should extract location from error messages with argument ID', () => {
      // Arrange
      const error = new ValidationError('Argument arg789 has invalid structure');

      // Act
      const result = validationErrorToDTO(error);

      // Assert
      expect(result.location?.argumentId?.getValue()).toBe('arg789');
    });

    it('should extract multiple location components', () => {
      // Arrange
      const error = new ValidationError('Error in tree: tree123, node: node456, argument: arg789');

      // Act
      const result = validationErrorToDTO(error);

      // Assert
      expect(result.location?.treeId?.getValue()).toBe('tree123');
      expect(result.location?.nodeId?.getValue()).toBe('node456');
      expect(result.location?.argumentId?.getValue()).toBe('arg789');
    });

    it('should handle error messages without location information', () => {
      // Arrange
      const error = new ValidationError('Generic error without specific location');

      // Act
      const result = validationErrorToDTO(error);

      // Assert
      expect(result.location).toBeUndefined();
    });

    it('should handle case-insensitive location extraction', () => {
      // Arrange
      const error = new ValidationError('Problem with Tree: TREE123 and Node: NODE456');

      // Act
      const result = validationErrorToDTO(error);

      // Assert
      expect(result.location?.treeId?.getValue()).toBe('TREE123');
      expect(result.location?.nodeId?.getValue()).toBe('NODE456');
    });

    it('should handle location extraction with different separators', () => {
      const testCases = ['tree:tree123', 'tree tree123', 'tree: tree123', 'tree  tree123'];

      testCases.forEach((message) => {
        const error = new ValidationError(message);
        const result = validationErrorToDTO(error);

        expect(result.location?.treeId?.getValue()).toBe('tree123');
      });
    });

    it('should determine severity based on error keywords', () => {
      const errorSeverityTests = [
        // Error level
        { message: 'Cycle detected in proof', expectedSeverity: ErrorSeverity.ERROR },
        { message: 'Statement not found', expectedSeverity: ErrorSeverity.ERROR },
        { message: 'Invalid argument structure', expectedSeverity: ErrorSeverity.ERROR },
        { message: 'Cannot process request', expectedSeverity: ErrorSeverity.ERROR },

        // Warning level
        { message: 'Statement is unused', expectedSeverity: ErrorSeverity.WARNING },
        { message: 'Ordered set is empty', expectedSeverity: ErrorSeverity.WARNING },
        { message: 'You should check this', expectedSeverity: ErrorSeverity.WARNING },

        // Info level (default)
        { message: 'General information message', expectedSeverity: ErrorSeverity.INFO },
        { message: 'Process completed', expectedSeverity: ErrorSeverity.INFO },
      ];

      errorSeverityTests.forEach(({ message, expectedSeverity }) => {
        const error = new ValidationError(message);
        const result = validationErrorToDTO(error);

        expect(result.severity).toBe(expectedSeverity);
      });
    });

    it('should handle ValidationError with context', () => {
      // Arrange
      const context = { componentId: 'test-component', operation: 'validation' };
      const error = new ValidationError('Error with context', context);

      // Act
      const result = validationErrorToDTO(error);

      // Assert
      expect(result.code.getValue()).toBe('VALIDATION_ERROR');
      expect(result.message.getValue()).toBe('Error with context');
      expect(result.severity).toBe(ErrorSeverity.INFO);
      // Note: Context is not included in DTO - this is by design
    });
  });

  describe('validationErrorsToDTOs', () => {
    it('should convert empty array of errors', () => {
      // Arrange
      const errors: ValidationError[] = [];

      // Act
      const result = validationErrorsToDTOs(errors);

      // Assert
      expect(result).toEqual([]);
    });

    it('should convert single error', () => {
      // Arrange
      const error = new ValidationError('Single error');
      const errors = [error];

      // Act
      const result = validationErrorsToDTOs(errors);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(validationErrorToDTO(error));
    });

    it('should convert multiple errors', () => {
      // Arrange
      const errors = [
        new ValidationError('Statement cannot be empty'),
        new ValidationError('Argument cycle detected'),
        new ValidationError('Tree node not found'),
      ];

      // Act
      const result = validationErrorsToDTOs(errors);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]?.code.getValue()).toBe('EMPTY_STATEMENT');
      expect(result[1]?.code.getValue()).toBe('CYCLE_DETECTED');
      expect(result[2]?.code.getValue()).toBe('TREE_NODE_ERROR');
    });

    it('should maintain order of errors', () => {
      // Arrange
      const errors = Array.from({ length: 5 }, (_, i) => new ValidationError(`Error ${i + 1}`));

      // Act
      const result = validationErrorsToDTOs(errors);

      // Assert
      expect(result).toHaveLength(5);
      result.forEach((dto, index) => {
        expect(dto.message.getValue()).toBe(`Error ${index + 1}`);
      });
    });

    it('should handle mixed error types', () => {
      // Arrange
      const errors = [
        new ValidationError('Statement error'),
        new ValidationError('Ordered set duplicate'),
        new ValidationError('Argument not found'),
        new ValidationError('Tree position invalid'),
        new ValidationError('Bootstrap error'),
        new ValidationError('Generic error'),
      ];

      // Act
      const result = validationErrorsToDTOs(errors);

      // Assert
      expect(result).toHaveLength(6);
      expect(result[0]?.code.getValue()).toBe('STATEMENT_ERROR');
      expect(result[1]?.code.getValue()).toBe('DUPLICATE_IN_ORDERED_SET');
      expect(result[2]?.code.getValue()).toBe('ARGUMENT_NOT_FOUND');
      expect(result[3]?.code.getValue()).toBe('TREE_POSITION_ERROR');
      expect(result[4]?.code.getValue()).toBe('BOOTSTRAP_ERROR');
      expect(result[5]?.code.getValue()).toBe('VALIDATION_ERROR');
    });
  });

  describe('groupErrorsByType', () => {
    it('should group empty array of errors', () => {
      // Arrange
      const errors: ValidationError[] = [];

      // Act
      const result = groupErrorsByType(errors);

      // Assert
      expect(result.size).toBe(0);
    });

    it('should group single error', () => {
      // Arrange
      const errors = [new ValidationError('Statement cannot be empty')];

      // Act
      const result = groupErrorsByType(errors);

      // Assert
      expect(result.size).toBe(1);
      expect(result.has('EMPTY_STATEMENT')).toBe(true);
      const group = result.get('EMPTY_STATEMENT');
      expect(group).toHaveLength(1);
      expect(group?.[0]?.message.getValue()).toBe('Statement cannot be empty');
    });

    it('should group multiple errors of same type', () => {
      // Arrange
      const errors = [
        new ValidationError('Statement cannot be empty'),
        new ValidationError('Another statement is empty'),
        new ValidationError('Third statement cannot be empty'),
      ];

      // Act
      const result = groupErrorsByType(errors);

      // Assert
      expect(result.size).toBe(1);
      expect(result.has('EMPTY_STATEMENT')).toBe(true);
      const group = result.get('EMPTY_STATEMENT');
      expect(group).toHaveLength(3);
    });

    it('should group errors by different types', () => {
      // Arrange
      const errors = [
        new ValidationError('Statement cannot be empty'),
        new ValidationError('Argument cycle detected'),
        new ValidationError('Another statement is empty'),
        new ValidationError('Tree node not found'),
        new ValidationError('Another cycle detected'),
      ];

      // Act
      const result = groupErrorsByType(errors);

      // Assert
      expect(result.size).toBe(4); // EMPTY_STATEMENT, CYCLE_DETECTED, TREE_NODE_ERROR, VALIDATION_ERROR
      expect(result.has('EMPTY_STATEMENT')).toBe(true);
      expect(result.has('CYCLE_DETECTED')).toBe(true);
      expect(result.has('TREE_NODE_ERROR')).toBe(true);
      expect(result.has('VALIDATION_ERROR')).toBe(true);

      expect(result.get('EMPTY_STATEMENT')).toHaveLength(2); // Both "empty" messages
      expect(result.get('CYCLE_DETECTED')).toHaveLength(1); // Only "Argument cycle detected"
      expect(result.get('TREE_NODE_ERROR')).toHaveLength(1);
      expect(result.get('VALIDATION_ERROR')).toHaveLength(1); // "Another cycle detected"
    });

    it('should create new Map instance', () => {
      // Arrange
      const errors = [new ValidationError('Test error')];

      // Act
      const result1 = groupErrorsByType(errors);
      const result2 = groupErrorsByType(errors);

      // Assert
      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });

    it('should handle comprehensive error type grouping', () => {
      // Arrange
      const errors = [
        new ValidationError('Statement cannot be empty'),
        new ValidationError('Statement not found'),
        new ValidationError('Ordered set duplicate'),
        new ValidationError('Argument cycle detected'),
        new ValidationError('Tree node error'),
        new ValidationError('Bootstrap failure'),
        new ValidationError('Generic validation error'),
        new ValidationError('Another statement error'),
        new ValidationError('Another ordered set error'),
      ];

      // Act
      const result = groupErrorsByType(errors);

      // Assert
      expect(result.size).toBe(9); // All different error types

      const expectedGroups = [
        'EMPTY_STATEMENT',
        'STATEMENT_NOT_FOUND',
        'DUPLICATE_IN_ORDERED_SET',
        'CYCLE_DETECTED',
        'TREE_NODE_ERROR',
        'BOOTSTRAP_ERROR',
        'VALIDATION_ERROR',
        'STATEMENT_ERROR',
        'ORDERED_SET_ERROR',
      ];

      expectedGroups.forEach((groupKey) => {
        expect(result.has(groupKey)).toBe(true);
      });
    });
  });

  describe('filterErrorsBySeverity', () => {
    // Setup common test data
    const createTestErrors = (): ValidationErrorDTO[] => [
      {
        code: ErrorCode.create('CYCLE_DETECTED').unwrapOr(null as any),
        message: ErrorMessage.create('Cycle found').unwrapOr(null as any),
        severity: ErrorSeverity.ERROR,
      },
      {
        code: ErrorCode.create('EMPTY_STATEMENT').unwrapOr(null as any),
        message: ErrorMessage.create('Statement empty').unwrapOr(null as any),
        severity: ErrorSeverity.WARNING,
      },
      {
        code: ErrorCode.create('VALIDATION_ERROR').unwrapOr(null as any),
        message: ErrorMessage.create('General error').unwrapOr(null as any),
        severity: ErrorSeverity.INFO,
      },
      {
        code: ErrorCode.create('STATEMENT_NOT_FOUND').unwrapOr(null as any),
        message: ErrorMessage.create('Not found').unwrapOr(null as any),
        severity: ErrorSeverity.ERROR,
      },
      {
        code: ErrorCode.create('UNUSED_STATEMENT').unwrapOr(null as any),
        message: ErrorMessage.create('Unused').unwrapOr(null as any),
        severity: ErrorSeverity.WARNING,
      },
    ];

    it('should filter errors by error severity', () => {
      // Arrange
      const errors = createTestErrors();

      // Act
      const result = filterErrorsBySeverity(errors, ErrorSeverity.ERROR);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every((error) => error.severity === ErrorSeverity.ERROR)).toBe(true);
      expect(result.map((e) => e.code.getValue())).toEqual([
        'CYCLE_DETECTED',
        'STATEMENT_NOT_FOUND',
      ]);
    });

    it('should filter errors by warning severity', () => {
      // Arrange
      const errors = createTestErrors();

      // Act
      const result = filterErrorsBySeverity(errors, ErrorSeverity.WARNING);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every((error) => error.severity === ErrorSeverity.WARNING)).toBe(true);
      expect(result.map((e) => e.code.getValue())).toEqual(['EMPTY_STATEMENT', 'UNUSED_STATEMENT']);
    });

    it('should filter errors by info severity', () => {
      // Arrange
      const errors = createTestErrors();

      // Act
      const result = filterErrorsBySeverity(errors, ErrorSeverity.INFO);

      // Assert
      expect(result).toHaveLength(1);
      expect(result.every((error) => error.severity === ErrorSeverity.INFO)).toBe(true);
      expect(result[0]?.code.getValue()).toBe('VALIDATION_ERROR');
    });

    it('should return empty array when no errors match severity', () => {
      // Arrange
      const errors: ValidationErrorDTO[] = [
        {
          code: ErrorCode.create('TEST_ERROR').unwrapOr(null as any),
          message: ErrorMessage.create('Test').unwrapOr(null as any),
          severity: ErrorSeverity.ERROR,
        },
      ];

      // Act
      const result = filterErrorsBySeverity(errors, ErrorSeverity.WARNING);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return empty array for empty input', () => {
      // Arrange
      const errors: ValidationErrorDTO[] = [];

      // Act
      const result = filterErrorsBySeverity(errors, ErrorSeverity.ERROR);

      // Assert
      expect(result).toEqual([]);
    });

    it('should maintain order of filtered errors', () => {
      // Arrange
      const errors: ValidationErrorDTO[] = [
        {
          code: ErrorCode.create('ERROR_1').unwrapOr(null as any),
          message: ErrorMessage.create('First error').unwrapOr(null as any),
          severity: ErrorSeverity.ERROR,
        },
        {
          code: ErrorCode.create('WARNING_1').unwrapOr(null as any),
          message: ErrorMessage.create('Warning').unwrapOr(null as any),
          severity: ErrorSeverity.WARNING,
        },
        {
          code: ErrorCode.create('ERROR_2').unwrapOr(null as any),
          message: ErrorMessage.create('Second error').unwrapOr(null as any),
          severity: ErrorSeverity.ERROR,
        },
        {
          code: ErrorCode.create('ERROR_3').unwrapOr(null as any),
          message: ErrorMessage.create('Third error').unwrapOr(null as any),
          severity: ErrorSeverity.ERROR,
        },
      ];

      // Act
      const result = filterErrorsBySeverity(errors, ErrorSeverity.ERROR);

      // Assert
      expect(result).toHaveLength(3);
      expect(result.map((e) => e.code.getValue())).toEqual(['ERROR_1', 'ERROR_2', 'ERROR_3']);
    });

    it('should not modify original array', () => {
      // Arrange
      const errors = createTestErrors();
      const originalLength = errors.length;

      // Act
      const result = filterErrorsBySeverity(errors, ErrorSeverity.ERROR);

      // Assert
      expect(errors).toHaveLength(originalLength);
      expect(result).not.toBe(errors);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle error messages with special characters', () => {
      // Arrange
      const specialMessages = [
        'Error with "quotes" and \'apostrophes\'',
        'Error with symbols: →∀∃⊃⊂∧∨¬',
        'Error with Unicode: 🎯 α β γ δ',
        'Error with newlines\nand\ttabs',
        'Error with HTML <tags> & entities',
      ];

      specialMessages.forEach((message) => {
        const error = new ValidationError(message);
        const result = validationErrorToDTO(error);

        expect(result.message.getValue()).toBe(message);
        expect(result.code.getValue()).toBe('VALIDATION_ERROR');
        expect(result.severity).toBe(ErrorSeverity.INFO);
      });
    });

    it('should handle very long error messages', () => {
      // Arrange
      const longMessage = 'A'.repeat(1000); // ErrorMessage has max length of 1000
      const error = new ValidationError(longMessage);

      // Act
      const result = validationErrorToDTO(error);

      // Assert
      expect(result.message.getValue()).toBe(longMessage);
      expect(result.code.getValue()).toBe('VALIDATION_ERROR');
    });

    it('should handle error message with multiple location patterns', () => {
      // Arrange
      const error = new ValidationError(
        'Complex error: tree:tree1 node:node1 argument:arg1 tree:tree2 node:node2',
      );

      // Act
      const result = validationErrorToDTO(error);

      // Assert
      // Should extract first occurrence of each pattern
      expect(result.location?.treeId?.getValue()).toBe('tree1');
      expect(result.location?.nodeId?.getValue()).toBe('node1');
      expect(result.location?.argumentId?.getValue()).toBe('arg1');
    });

    it('should handle case sensitivity in error classification', () => {
      const testCases = [
        { message: 'STATEMENT CANNOT BE EMPTY', expectedCode: 'EMPTY_STATEMENT' },
        { message: 'statement cannot be empty', expectedCode: 'EMPTY_STATEMENT' },
        { message: 'Statement Cannot Be Empty', expectedCode: 'EMPTY_STATEMENT' },
        { message: 'StAtEmEnT cAnNoT bE eMpTy', expectedCode: 'EMPTY_STATEMENT' },
      ];

      testCases.forEach(({ message, expectedCode }) => {
        const error = new ValidationError(message);
        const result = validationErrorToDTO(error);

        expect(result.code.getValue()).toBe(expectedCode);
      });
    });
  });

  describe('property-based testing', () => {
    it('should handle arbitrary error messages', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 1000 }).filter((s) => s.trim().length > 0),
          (message) => {
            const error = new ValidationError(message);
            const result = validationErrorToDTO(error);

            // Verify basic structure
            expect(result).toHaveProperty('code');
            expect(result).toHaveProperty('message');
            expect(result).toHaveProperty('severity');
            expect(result.message.getValue()).toBe(message.trim());
            expect([ErrorSeverity.ERROR, ErrorSeverity.WARNING, ErrorSeverity.INFO]).toContain(
              result.severity,
            );
            expect(result.code).toBeInstanceOf(ErrorCode);
            expect(result.code.getValue().length).toBeGreaterThan(0);
          },
        ),
      );
    });

    it('should maintain referential integrity in array operations', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
            { minLength: 0, maxLength: 20 },
          ),
          (messages) => {
            const errors = messages.map((msg) => new ValidationError(msg));
            const dtos = validationErrorsToDTOs(errors);

            // Verify length preservation
            expect(dtos).toHaveLength(errors.length);

            // Verify order preservation
            dtos.forEach((dto, index) => {
              expect(dto.message.getValue()).toBe(messages[index]?.trim());
            });

            // Verify grouping works
            const groups = groupErrorsByType(errors);
            const totalGrouped = Array.from(groups.values()).reduce(
              (sum, group) => sum + group.length,
              0,
            );
            expect(totalGrouped).toBe(errors.length);
          },
        ),
      );
    });
  });

  describe('integration with real error scenarios', () => {
    it('should handle typical validation workflow', () => {
      // Arrange - Simulate real validation errors from different parts of the system
      const errors = [
        new ValidationError('Statement cannot be empty'),
        new ValidationError('Statement not found in tree: tree123'),
        new ValidationError('Ordered set contains duplicate statement ids'),
        new ValidationError('Argument creates cycle in node: node456'),
        new ValidationError('Tree position is invalid coordinates'),
        new ValidationError('Bootstrap argument is malformed'),
        new ValidationError('Statement is unused in proof'),
        new ValidationError('Unknown validation error occurred'),
      ];

      // Act - Convert and group
      const dtos = validationErrorsToDTOs(errors);
      const grouped = groupErrorsByType(errors);
      const criticalErrors = filterErrorsBySeverity(dtos, ErrorSeverity.ERROR);
      const warnings = filterErrorsBySeverity(dtos, ErrorSeverity.WARNING);

      // Assert - Verify complete workflow
      expect(dtos).toHaveLength(8);
      expect(grouped.size).toBeGreaterThan(0);
      expect(criticalErrors.length).toBeGreaterThan(0);
      expect(warnings.length).toBeGreaterThan(0);

      // Verify location extraction worked
      const errorsWithLocation = dtos.filter((dto) => dto.location);
      expect(errorsWithLocation.length).toBeGreaterThan(0);

      // Verify severity classification
      const severities = dtos.map((dto) => dto.severity);
      expect(severities).toContain(ErrorSeverity.ERROR);
      expect(severities).toContain(ErrorSeverity.INFO); // Most errors default to info, not warning
    });
  });
});

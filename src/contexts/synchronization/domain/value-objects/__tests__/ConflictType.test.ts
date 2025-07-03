import { describe, expect, it } from 'vitest';

import { ConflictType, type ConflictTypeValue } from '../ConflictType.js';

describe('ConflictType', () => {
  describe('create', () => {
    it('should create valid conflict types', () => {
      const validTypes: ConflictTypeValue[] = [
        'STRUCTURAL_CONFLICT',
        'SEMANTIC_CONFLICT',
        'ORDERING_CONFLICT',
        'DELETION_CONFLICT',
        'CONCURRENT_MODIFICATION',
      ];

      for (const type of validTypes) {
        const result = ConflictType.create(type);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe(type);
        }
      }
    });

    it('should reject invalid conflict types', () => {
      // @ts-expect-error - Testing invalid input
      const result = ConflictType.create('INVALID_TYPE');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid conflict type');
      }
    });

    it('should reject null and undefined', () => {
      // @ts-expect-error - Testing invalid input
      const nullResult = ConflictType.create(null);
      // @ts-expect-error - Testing invalid input
      const undefinedResult = ConflictType.create(undefined);

      expect(nullResult.isErr()).toBe(true);
      expect(undefinedResult.isErr()).toBe(true);
    });
  });

  describe('static factory methods', () => {
    it('should create structural conflict', () => {
      const result = ConflictType.structural();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('STRUCTURAL_CONFLICT');
        expect(result.value.isStructural()).toBe(true);
      }
    });

    it('should create semantic conflict', () => {
      const result = ConflictType.semantic();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('SEMANTIC_CONFLICT');
        expect(result.value.isSemantic()).toBe(true);
      }
    });

    it('should create ordering conflict', () => {
      const result = ConflictType.ordering();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('ORDERING_CONFLICT');
        expect(result.value.isStructural()).toBe(true);
      }
    });

    it('should create deletion conflict', () => {
      const result = ConflictType.deletion();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('DELETION_CONFLICT');
        expect(result.value.isStructural()).toBe(true);
      }
    });

    it('should create concurrent modification conflict', () => {
      const result = ConflictType.concurrentModification();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('CONCURRENT_MODIFICATION');
        expect(result.value.isSemantic()).toBe(true);
      }
    });
  });

  describe('equals', () => {
    it('should return true for equal conflict types', () => {
      const type1Result = ConflictType.create('SEMANTIC_CONFLICT');
      const type2Result = ConflictType.create('SEMANTIC_CONFLICT');

      expect(type1Result.isOk()).toBe(true);
      expect(type2Result.isOk()).toBe(true);
      if (type1Result.isOk() && type2Result.isOk()) {
        expect(type1Result.value.equals(type2Result.value)).toBe(true);
      }
    });

    it('should return false for different conflict types', () => {
      const type1Result = ConflictType.create('SEMANTIC_CONFLICT');
      const type2Result = ConflictType.create('STRUCTURAL_CONFLICT');

      expect(type1Result.isOk()).toBe(true);
      expect(type2Result.isOk()).toBe(true);
      if (type1Result.isOk() && type2Result.isOk()) {
        expect(type1Result.value.equals(type2Result.value)).toBe(false);
      }
    });
  });

  describe('isStructural', () => {
    it('should identify structural conflict types', () => {
      const structuralTypes: ConflictTypeValue[] = [
        'STRUCTURAL_CONFLICT',
        'ORDERING_CONFLICT',
        'DELETION_CONFLICT',
      ];

      for (const type of structuralTypes) {
        const result = ConflictType.create(type);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isStructural()).toBe(true);
        }
      }
    });

    it('should identify non-structural conflict types', () => {
      const nonStructuralTypes: ConflictTypeValue[] = [
        'SEMANTIC_CONFLICT',
        'CONCURRENT_MODIFICATION',
      ];

      for (const type of nonStructuralTypes) {
        const result = ConflictType.create(type);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isStructural()).toBe(false);
        }
      }
    });
  });

  describe('isSemantic', () => {
    it('should identify semantic conflict types', () => {
      const semanticTypes: ConflictTypeValue[] = ['SEMANTIC_CONFLICT', 'CONCURRENT_MODIFICATION'];

      for (const type of semanticTypes) {
        const result = ConflictType.create(type);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isSemantic()).toBe(true);
        }
      }
    });

    it('should identify non-semantic conflict types', () => {
      const nonSemanticTypes: ConflictTypeValue[] = [
        'STRUCTURAL_CONFLICT',
        'ORDERING_CONFLICT',
        'DELETION_CONFLICT',
      ];

      for (const type of nonSemanticTypes) {
        const result = ConflictType.create(type);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isSemantic()).toBe(false);
        }
      }
    });
  });

  describe('requiresUserIntervention', () => {
    it('should require user intervention for semantic conflicts', () => {
      const semanticTypes: ConflictTypeValue[] = ['SEMANTIC_CONFLICT', 'CONCURRENT_MODIFICATION'];

      for (const type of semanticTypes) {
        const result = ConflictType.create(type);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.requiresUserIntervention()).toBe(true);
        }
      }
    });

    it('should not require user intervention for structural conflicts', () => {
      const structuralTypes: ConflictTypeValue[] = [
        'STRUCTURAL_CONFLICT',
        'ORDERING_CONFLICT',
        'DELETION_CONFLICT',
      ];

      for (const type of structuralTypes) {
        const result = ConflictType.create(type);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.requiresUserIntervention()).toBe(false);
        }
      }
    });
  });

  describe('canBeAutomaticallyResolved', () => {
    it('should allow automatic resolution for structural conflicts', () => {
      const structuralTypes: ConflictTypeValue[] = [
        'STRUCTURAL_CONFLICT',
        'ORDERING_CONFLICT',
        'DELETION_CONFLICT',
      ];

      for (const type of structuralTypes) {
        const result = ConflictType.create(type);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.canBeAutomaticallyResolved()).toBe(true);
        }
      }
    });

    it('should not allow automatic resolution for semantic conflicts', () => {
      const semanticTypes: ConflictTypeValue[] = ['SEMANTIC_CONFLICT', 'CONCURRENT_MODIFICATION'];

      for (const type of semanticTypes) {
        const result = ConflictType.create(type);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.canBeAutomaticallyResolved()).toBe(false);
        }
      }
    });
  });

  describe('getSeverityLevel', () => {
    it('should return correct severity levels', () => {
      const severityTests: [ConflictTypeValue, 'LOW' | 'MEDIUM' | 'HIGH'][] = [
        ['STRUCTURAL_CONFLICT', 'LOW'],
        ['ORDERING_CONFLICT', 'LOW'],
        ['DELETION_CONFLICT', 'MEDIUM'],
        ['CONCURRENT_MODIFICATION', 'MEDIUM'],
        ['SEMANTIC_CONFLICT', 'HIGH'],
      ];

      for (const [type, expectedSeverity] of severityTests) {
        const result = ConflictType.create(type);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getSeverityLevel()).toBe(expectedSeverity);
        }
      }
    });
  });

  describe('getResolutionComplexity', () => {
    it('should return correct resolution complexity', () => {
      const complexityTests: [ConflictTypeValue, 'SIMPLE' | 'MODERATE' | 'COMPLEX'][] = [
        ['STRUCTURAL_CONFLICT', 'SIMPLE'],
        ['ORDERING_CONFLICT', 'MODERATE'],
        ['DELETION_CONFLICT', 'MODERATE'],
        ['SEMANTIC_CONFLICT', 'COMPLEX'],
        ['CONCURRENT_MODIFICATION', 'COMPLEX'],
      ];

      for (const [type, expectedComplexity] of complexityTests) {
        const result = ConflictType.create(type);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getResolutionComplexity()).toBe(expectedComplexity);
        }
      }
    });
  });

  describe('getExpectedResolutionStrategies', () => {
    it('should return appropriate strategies for each conflict type', () => {
      const strategyTests: [ConflictTypeValue, string[]][] = [
        ['STRUCTURAL_CONFLICT', ['MERGE_OPERATIONS', 'OPERATIONAL_TRANSFORM']],
        ['SEMANTIC_CONFLICT', ['USER_DECISION_REQUIRED', 'MANUAL_MERGE']],
        ['ORDERING_CONFLICT', ['TIMESTAMP_ORDERING', 'CAUSAL_ORDERING']],
        ['DELETION_CONFLICT', ['LAST_WRITER_WINS', 'PRESERVE_DELETION', 'USER_DECISION_REQUIRED']],
        [
          'CONCURRENT_MODIFICATION',
          ['THREE_WAY_MERGE', 'USER_DECISION_REQUIRED', 'LAST_WRITER_WINS'],
        ],
      ];

      for (const [type, expectedStrategies] of strategyTests) {
        const result = ConflictType.create(type);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const strategies = result.value.getExpectedResolutionStrategies();
          expect(strategies).toEqual(expectedStrategies);
        }
      }
    });
  });

  describe('getDescription', () => {
    it('should return descriptive text for each conflict type', () => {
      const descriptionTests: [ConflictTypeValue, string][] = [
        [
          'STRUCTURAL_CONFLICT',
          'Conflicting changes to document structure that can be automatically resolved',
        ],
        [
          'SEMANTIC_CONFLICT',
          'Conflicting changes to content meaning that require user intervention',
        ],
        [
          'ORDERING_CONFLICT',
          'Operations applied in different orders resulting in inconsistent state',
        ],
        ['DELETION_CONFLICT', 'Attempt to modify content that was deleted by another operation'],
        [
          'CONCURRENT_MODIFICATION',
          'Simultaneous modifications to the same content by multiple devices',
        ],
      ];

      for (const [type, expectedDescription] of descriptionTests) {
        const result = ConflictType.create(type);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getDescription()).toBe(expectedDescription);
        }
      }
    });
  });

  describe('isCompatibleWith', () => {
    it('should return true for same conflict types', () => {
      const type1Result = ConflictType.create('SEMANTIC_CONFLICT');
      const type2Result = ConflictType.create('SEMANTIC_CONFLICT');

      expect(type1Result.isOk()).toBe(true);
      expect(type2Result.isOk()).toBe(true);
      if (type1Result.isOk() && type2Result.isOk()) {
        expect(type1Result.value.isCompatibleWith(type2Result.value)).toBe(true);
      }
    });

    it('should return true for compatible pairs', () => {
      const compatiblePairs: [ConflictTypeValue, ConflictTypeValue][] = [
        ['STRUCTURAL_CONFLICT', 'ORDERING_CONFLICT'],
        ['ORDERING_CONFLICT', 'STRUCTURAL_CONFLICT'],
        ['SEMANTIC_CONFLICT', 'CONCURRENT_MODIFICATION'],
        ['CONCURRENT_MODIFICATION', 'SEMANTIC_CONFLICT'],
      ];

      for (const [type1, type2] of compatiblePairs) {
        const type1Result = ConflictType.create(type1);
        const type2Result = ConflictType.create(type2);

        expect(type1Result.isOk()).toBe(true);
        expect(type2Result.isOk()).toBe(true);
        if (type1Result.isOk() && type2Result.isOk()) {
          expect(type1Result.value.isCompatibleWith(type2Result.value)).toBe(true);
        }
      }
    });

    it('should return false for incompatible pairs', () => {
      const incompatiblePairs: [ConflictTypeValue, ConflictTypeValue][] = [
        ['STRUCTURAL_CONFLICT', 'SEMANTIC_CONFLICT'],
        ['DELETION_CONFLICT', 'ORDERING_CONFLICT'],
        ['DELETION_CONFLICT', 'SEMANTIC_CONFLICT'],
      ];

      for (const [type1, type2] of incompatiblePairs) {
        const type1Result = ConflictType.create(type1);
        const type2Result = ConflictType.create(type2);

        expect(type1Result.isOk()).toBe(true);
        expect(type2Result.isOk()).toBe(true);
        if (type1Result.isOk() && type2Result.isOk()) {
          expect(type1Result.value.isCompatibleWith(type2Result.value)).toBe(false);
        }
      }
    });

    it('should handle deletion conflict compatibility', () => {
      const deletionResult = ConflictType.create('DELETION_CONFLICT');
      const structuralResult = ConflictType.create('STRUCTURAL_CONFLICT');

      expect(deletionResult.isOk()).toBe(true);
      expect(structuralResult.isOk()).toBe(true);
      if (deletionResult.isOk() && structuralResult.isOk()) {
        // Deletion conflicts are not compatible with other types
        expect(deletionResult.value.isCompatibleWith(structuralResult.value)).toBe(false);
      }
    });
  });

  describe('toString', () => {
    it('should return the conflict type value', () => {
      const types: ConflictTypeValue[] = [
        'STRUCTURAL_CONFLICT',
        'SEMANTIC_CONFLICT',
        'ORDERING_CONFLICT',
        'DELETION_CONFLICT',
        'CONCURRENT_MODIFICATION',
      ];

      for (const type of types) {
        const result = ConflictType.create(type);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.toString()).toBe(type);
        }
      }
    });
  });

  describe('toDisplayString', () => {
    it('should return formatted display strings', () => {
      const displayTests: [ConflictTypeValue, string][] = [
        ['STRUCTURAL_CONFLICT', 'Structural Conflict'],
        ['SEMANTIC_CONFLICT', 'Semantic Conflict'],
        ['ORDERING_CONFLICT', 'Ordering Conflict'],
        ['DELETION_CONFLICT', 'Deletion Conflict'],
        ['CONCURRENT_MODIFICATION', 'Concurrent Modification'],
      ];

      for (const [type, expectedDisplay] of displayTests) {
        const result = ConflictType.create(type);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.toDisplayString()).toBe(expectedDisplay);
        }
      }
    });
  });

  describe('getIcon', () => {
    it('should return appropriate icons for each conflict type', () => {
      const iconTests: [ConflictTypeValue, string][] = [
        ['STRUCTURAL_CONFLICT', '🔧'],
        ['SEMANTIC_CONFLICT', '⚠️'],
        ['ORDERING_CONFLICT', '🔄'],
        ['DELETION_CONFLICT', '🗑️'],
        ['CONCURRENT_MODIFICATION', '⚡'],
      ];

      for (const [type, expectedIcon] of iconTests) {
        const result = ConflictType.create(type);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getIcon()).toBe(expectedIcon);
        }
      }
    });
  });
});

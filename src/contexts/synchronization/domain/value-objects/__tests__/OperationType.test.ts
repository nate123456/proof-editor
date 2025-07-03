import { describe, expect, it } from 'vitest';

import { OperationType, type OperationTypeValue } from '../OperationType.js';

describe('OperationType', () => {
  describe('create', () => {
    it('should create valid operation types', () => {
      const validTypes: OperationTypeValue[] = [
        'CREATE_STATEMENT',
        'UPDATE_STATEMENT',
        'DELETE_STATEMENT',
        'CREATE_ARGUMENT',
        'UPDATE_ARGUMENT',
        'DELETE_ARGUMENT',
        'CREATE_TREE',
        'UPDATE_TREE_POSITION',
        'DELETE_TREE',
        'CREATE_CONNECTION',
        'DELETE_CONNECTION',
        'UPDATE_METADATA',
      ];

      for (const type of validTypes) {
        const result = OperationType.create(type);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe(type);
        }
      }
    });

    it('should reject invalid operation types', () => {
      // @ts-expect-error - Testing invalid input
      const result = OperationType.create('INVALID_OPERATION');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid operation type');
      }
    });

    it('should reject null and undefined', () => {
      // @ts-expect-error - Testing invalid input
      const nullResult = OperationType.create(null);
      // @ts-expect-error - Testing invalid input
      const undefinedResult = OperationType.create(undefined);

      expect(nullResult.isErr()).toBe(true);
      expect(undefinedResult.isErr()).toBe(true);
    });
  });

  describe('static constant', () => {
    it('should provide INSERT constant for test compatibility', () => {
      expect(OperationType.INSERT.getValue()).toBe('CREATE_STATEMENT');
    });
  });

  describe('equals', () => {
    it('should return true for equal operation types', () => {
      const type1Result = OperationType.create('CREATE_STATEMENT');
      const type2Result = OperationType.create('CREATE_STATEMENT');

      expect(type1Result.isOk()).toBe(true);
      expect(type2Result.isOk()).toBe(true);
      if (type1Result.isOk() && type2Result.isOk()) {
        expect(type1Result.value.equals(type2Result.value)).toBe(true);
      }
    });

    it('should return false for different operation types', () => {
      const type1Result = OperationType.create('CREATE_STATEMENT');
      const type2Result = OperationType.create('UPDATE_STATEMENT');

      expect(type1Result.isOk()).toBe(true);
      expect(type2Result.isOk()).toBe(true);
      if (type1Result.isOk() && type2Result.isOk()) {
        expect(type1Result.value.equals(type2Result.value)).toBe(false);
      }
    });
  });

  describe('isStructural', () => {
    it('should identify structural operations', () => {
      const structuralTypes: OperationTypeValue[] = [
        'CREATE_ARGUMENT',
        'DELETE_ARGUMENT',
        'CREATE_TREE',
        'UPDATE_TREE_POSITION',
        'DELETE_TREE',
        'CREATE_CONNECTION',
        'DELETE_CONNECTION',
      ];

      for (const type of structuralTypes) {
        const result = OperationType.create(type);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isStructural()).toBe(true);
        }
      }
    });

    it('should identify non-structural operations', () => {
      const nonStructuralTypes: OperationTypeValue[] = [
        'CREATE_STATEMENT',
        'UPDATE_STATEMENT',
        'DELETE_STATEMENT',
        'UPDATE_ARGUMENT',
        'UPDATE_METADATA',
      ];

      for (const type of nonStructuralTypes) {
        const result = OperationType.create(type);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isStructural()).toBe(false);
        }
      }
    });
  });

  describe('isSemantic', () => {
    it('should identify semantic operations', () => {
      const semanticTypes: OperationTypeValue[] = [
        'CREATE_STATEMENT',
        'UPDATE_STATEMENT',
        'DELETE_STATEMENT',
        'UPDATE_ARGUMENT',
        'UPDATE_METADATA',
      ];

      for (const type of semanticTypes) {
        const result = OperationType.create(type);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isSemantic()).toBe(true);
        }
      }
    });

    it('should identify non-semantic operations', () => {
      const nonSemanticTypes: OperationTypeValue[] = [
        'CREATE_ARGUMENT',
        'DELETE_ARGUMENT',
        'CREATE_TREE',
        'UPDATE_TREE_POSITION',
        'DELETE_TREE',
        'CREATE_CONNECTION',
        'DELETE_CONNECTION',
      ];

      for (const type of nonSemanticTypes) {
        const result = OperationType.create(type);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isSemantic()).toBe(false);
        }
      }
    });
  });

  describe('isCreation', () => {
    it('should identify creation operations', () => {
      const creationTypes: OperationTypeValue[] = [
        'CREATE_STATEMENT',
        'CREATE_ARGUMENT',
        'CREATE_TREE',
        'CREATE_CONNECTION',
      ];

      for (const type of creationTypes) {
        const result = OperationType.create(type);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isCreation()).toBe(true);
        }
      }
    });

    it('should identify non-creation operations', () => {
      const nonCreationTypes: OperationTypeValue[] = [
        'UPDATE_STATEMENT',
        'DELETE_STATEMENT',
        'UPDATE_ARGUMENT',
        'DELETE_ARGUMENT',
        'UPDATE_TREE_POSITION',
        'DELETE_TREE',
        'DELETE_CONNECTION',
        'UPDATE_METADATA',
      ];

      for (const type of nonCreationTypes) {
        const result = OperationType.create(type);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isCreation()).toBe(false);
        }
      }
    });
  });

  describe('isDeletion', () => {
    it('should identify deletion operations', () => {
      const deletionTypes: OperationTypeValue[] = [
        'DELETE_STATEMENT',
        'DELETE_ARGUMENT',
        'DELETE_TREE',
        'DELETE_CONNECTION',
      ];

      for (const type of deletionTypes) {
        const result = OperationType.create(type);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isDeletion()).toBe(true);
        }
      }
    });

    it('should identify non-deletion operations', () => {
      const nonDeletionTypes: OperationTypeValue[] = [
        'CREATE_STATEMENT',
        'UPDATE_STATEMENT',
        'CREATE_ARGUMENT',
        'UPDATE_ARGUMENT',
        'CREATE_TREE',
        'UPDATE_TREE_POSITION',
        'CREATE_CONNECTION',
        'UPDATE_METADATA',
      ];

      for (const type of nonDeletionTypes) {
        const result = OperationType.create(type);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isDeletion()).toBe(false);
        }
      }
    });
  });

  describe('isUpdate', () => {
    it('should identify update operations', () => {
      const updateTypes: OperationTypeValue[] = [
        'UPDATE_STATEMENT',
        'UPDATE_ARGUMENT',
        'UPDATE_TREE_POSITION',
        'UPDATE_METADATA',
      ];

      for (const type of updateTypes) {
        const result = OperationType.create(type);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isUpdate()).toBe(true);
        }
      }
    });

    it('should identify non-update operations', () => {
      const nonUpdateTypes: OperationTypeValue[] = [
        'CREATE_STATEMENT',
        'DELETE_STATEMENT',
        'CREATE_ARGUMENT',
        'DELETE_ARGUMENT',
        'CREATE_TREE',
        'DELETE_TREE',
        'CREATE_CONNECTION',
        'DELETE_CONNECTION',
      ];

      for (const type of nonUpdateTypes) {
        const result = OperationType.create(type);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isUpdate()).toBe(false);
        }
      }
    });
  });

  describe('canCommuteWith', () => {
    it('should return true for same commutative operations', () => {
      const commutativeTypes: OperationTypeValue[] = ['UPDATE_TREE_POSITION', 'UPDATE_METADATA'];

      for (const type of commutativeTypes) {
        const type1Result = OperationType.create(type);
        const type2Result = OperationType.create(type);

        expect(type1Result.isOk()).toBe(true);
        expect(type2Result.isOk()).toBe(true);
        if (type1Result.isOk() && type2Result.isOk()) {
          expect(type1Result.value.canCommuteWith(type2Result.value)).toBe(true);
        }
      }
    });

    it('should return false for same non-commutative operations', () => {
      const nonCommutativeTypes: OperationTypeValue[] = [
        'CREATE_STATEMENT',
        'DELETE_STATEMENT',
        'CREATE_ARGUMENT',
        'DELETE_ARGUMENT',
      ];

      for (const type of nonCommutativeTypes) {
        const type1Result = OperationType.create(type);
        const type2Result = OperationType.create(type);

        expect(type1Result.isOk()).toBe(true);
        expect(type2Result.isOk()).toBe(true);
        if (type1Result.isOk() && type2Result.isOk()) {
          expect(type1Result.value.canCommuteWith(type2Result.value)).toBe(false);
        }
      }
    });

    it('should handle structural operation commutativity', () => {
      const structuralPairs: [OperationTypeValue, OperationTypeValue, boolean][] = [
        ['CREATE_TREE', 'CREATE_CONNECTION', true], // Should commute
        ['CREATE_ARGUMENT', 'DELETE_ARGUMENT', false], // Should not commute
        ['CREATE_TREE', 'DELETE_TREE', false], // Should not commute
        ['CREATE_CONNECTION', 'DELETE_CONNECTION', false], // Should not commute
        ['DELETE_ARGUMENT', 'CREATE_CONNECTION', false], // Should not commute
        ['DELETE_TREE', 'CREATE_ARGUMENT', false], // Should not commute
        ['UPDATE_TREE_POSITION', 'CREATE_CONNECTION', true], // Should commute (not in non-commutative pairs)
      ];

      for (const [type1, type2, shouldCommute] of structuralPairs) {
        const type1Result = OperationType.create(type1);
        const type2Result = OperationType.create(type2);

        expect(type1Result.isOk()).toBe(true);
        expect(type2Result.isOk()).toBe(true);
        if (type1Result.isOk() && type2Result.isOk()) {
          expect(type1Result.value.canCommuteWith(type2Result.value)).toBe(shouldCommute);
        }
      }
    });

    it('should not commute semantic operations with each other', () => {
      const semanticTypes: OperationTypeValue[] = [
        'CREATE_STATEMENT',
        'UPDATE_STATEMENT',
        'DELETE_STATEMENT',
        'UPDATE_ARGUMENT',
        'UPDATE_METADATA',
      ];

      for (let i = 0; i < semanticTypes.length; i++) {
        for (let j = i + 1; j < semanticTypes.length; j++) {
          const type1Result = OperationType.create(semanticTypes[i]!);
          const type2Result = OperationType.create(semanticTypes[j]!);

          expect(type1Result.isOk()).toBe(true);
          expect(type2Result.isOk()).toBe(true);
          if (type1Result.isOk() && type2Result.isOk()) {
            expect(type1Result.value.canCommuteWith(type2Result.value)).toBe(false);
          }
        }
      }
    });

    it('should handle cross-type commutativity based on structural effects', () => {
      const crossTypePairs: [OperationTypeValue, OperationTypeValue, boolean][] = [
        ['CREATE_TREE', 'CREATE_STATEMENT', true], // Structural + Semantic that don't affect each other
        ['DELETE_ARGUMENT', 'UPDATE_STATEMENT', false], // Deletion affects semantic
        ['DELETE_CONNECTION', 'UPDATE_ARGUMENT', false], // Connection deletion affects argument update
        ['UPDATE_TREE_POSITION', 'CREATE_STATEMENT', true], // Position update doesn't affect statement creation
      ];

      for (const [type1, type2, shouldCommute] of crossTypePairs) {
        const type1Result = OperationType.create(type1);
        const type2Result = OperationType.create(type2);

        expect(type1Result.isOk()).toBe(true);
        expect(type2Result.isOk()).toBe(true);
        if (type1Result.isOk() && type2Result.isOk()) {
          expect(type1Result.value.canCommuteWith(type2Result.value)).toBe(shouldCommute);
          // Test symmetry
          expect(type2Result.value.canCommuteWith(type1Result.value)).toBe(shouldCommute);
        }
      }
    });
  });

  describe('toString', () => {
    it('should return the operation type value', () => {
      const types: OperationTypeValue[] = [
        'CREATE_STATEMENT',
        'UPDATE_ARGUMENT',
        'DELETE_TREE',
        'UPDATE_METADATA',
      ];

      for (const type of types) {
        const result = OperationType.create(type);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.toString()).toBe(type);
        }
      }
    });
  });

  describe('getCategory', () => {
    it('should return correct categories', () => {
      const categoryTests: [OperationTypeValue, 'STRUCTURAL' | 'SEMANTIC'][] = [
        ['CREATE_ARGUMENT', 'STRUCTURAL'],
        ['DELETE_TREE', 'STRUCTURAL'],
        ['UPDATE_TREE_POSITION', 'STRUCTURAL'],
        ['CREATE_CONNECTION', 'STRUCTURAL'],
        ['CREATE_STATEMENT', 'SEMANTIC'],
        ['UPDATE_STATEMENT', 'SEMANTIC'],
        ['DELETE_STATEMENT', 'SEMANTIC'],
        ['UPDATE_ARGUMENT', 'SEMANTIC'],
        ['UPDATE_METADATA', 'SEMANTIC'],
      ];

      for (const [type, expectedCategory] of categoryTests) {
        const result = OperationType.create(type);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getCategory()).toBe(expectedCategory);
        }
      }
    });
  });

  describe('getVerb', () => {
    it('should return correct verbs', () => {
      const verbTests: [OperationTypeValue, string][] = [
        ['CREATE_STATEMENT', 'CREATE'],
        ['CREATE_ARGUMENT', 'CREATE'],
        ['CREATE_TREE', 'CREATE'],
        ['CREATE_CONNECTION', 'CREATE'],
        ['UPDATE_STATEMENT', 'UPDATE'],
        ['UPDATE_ARGUMENT', 'UPDATE'],
        ['UPDATE_TREE_POSITION', 'UPDATE'],
        ['UPDATE_METADATA', 'UPDATE'],
        ['DELETE_STATEMENT', 'DELETE'],
        ['DELETE_ARGUMENT', 'DELETE'],
        ['DELETE_TREE', 'DELETE'],
        ['DELETE_CONNECTION', 'DELETE'],
      ];

      for (const [type, expectedVerb] of verbTests) {
        const result = OperationType.create(type);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getVerb()).toBe(expectedVerb);
        }
      }
    });
  });

  describe('getTarget', () => {
    it('should return correct targets', () => {
      const targetTests: [OperationTypeValue, string][] = [
        ['CREATE_STATEMENT', 'STATEMENT'],
        ['UPDATE_STATEMENT', 'STATEMENT'],
        ['DELETE_STATEMENT', 'STATEMENT'],
        ['CREATE_ARGUMENT', 'ARGUMENT'],
        ['UPDATE_ARGUMENT', 'ARGUMENT'],
        ['DELETE_ARGUMENT', 'ARGUMENT'],
        ['CREATE_TREE', 'TREE'],
        ['UPDATE_TREE_POSITION', 'TREE_POSITION'],
        ['DELETE_TREE', 'TREE'],
        ['CREATE_CONNECTION', 'CONNECTION'],
        ['DELETE_CONNECTION', 'CONNECTION'],
        ['UPDATE_METADATA', 'METADATA'],
      ];

      for (const [type, expectedTarget] of targetTests) {
        const result = OperationType.create(type);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getTarget()).toBe(expectedTarget);
        }
      }
    });
  });

  describe('edge cases and validation', () => {
    it('should handle all valid operation types consistently', () => {
      const allTypes: OperationTypeValue[] = [
        'CREATE_STATEMENT',
        'UPDATE_STATEMENT',
        'DELETE_STATEMENT',
        'CREATE_ARGUMENT',
        'UPDATE_ARGUMENT',
        'DELETE_ARGUMENT',
        'CREATE_TREE',
        'UPDATE_TREE_POSITION',
        'DELETE_TREE',
        'CREATE_CONNECTION',
        'DELETE_CONNECTION',
        'UPDATE_METADATA',
      ];

      // Verify all types can be created and have consistent behavior
      for (const type of allTypes) {
        const result = OperationType.create(type);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const operation = result.value;

          // Every operation should be either structural or semantic, but not both
          expect(operation.isStructural() && operation.isSemantic()).toBe(false);
          expect(operation.isStructural() || operation.isSemantic()).toBe(true);

          // Every operation should have exactly one verb
          const isCreate = operation.isCreation();
          const isUpdate = operation.isUpdate();
          const isDelete = operation.isDeletion();
          const verbCount = [isCreate, isUpdate, isDelete].filter(Boolean).length;
          expect(verbCount).toBe(1);

          // getCategory should match structural/semantic classification
          const category = operation.getCategory();
          expect((category === 'STRUCTURAL') === operation.isStructural()).toBe(true);
          expect((category === 'SEMANTIC') === operation.isSemantic()).toBe(true);

          // getVerb should match verb classification
          const verb = operation.getVerb();
          expect((verb === 'CREATE') === operation.isCreation()).toBe(true);
          expect((verb === 'UPDATE') === operation.isUpdate()).toBe(true);
          expect((verb === 'DELETE') === operation.isDeletion()).toBe(true);
        }
      }
    });

    it('should have symmetric commutativity', () => {
      const allTypes: OperationTypeValue[] = [
        'CREATE_STATEMENT',
        'UPDATE_STATEMENT',
        'DELETE_STATEMENT',
        'CREATE_ARGUMENT',
        'UPDATE_ARGUMENT',
        'DELETE_ARGUMENT',
        'CREATE_TREE',
        'UPDATE_TREE_POSITION',
        'DELETE_TREE',
        'CREATE_CONNECTION',
        'DELETE_CONNECTION',
        'UPDATE_METADATA',
      ];

      // Test symmetry: if A commutes with B, then B should commute with A
      for (const type1 of allTypes) {
        for (const type2 of allTypes) {
          const result1 = OperationType.create(type1);
          const result2 = OperationType.create(type2);

          expect(result1.isOk()).toBe(true);
          expect(result2.isOk()).toBe(true);
          if (result1.isOk() && result2.isOk()) {
            const commute12 = result1.value.canCommuteWith(result2.value);
            const commute21 = result2.value.canCommuteWith(result1.value);
            expect(commute12).toBe(commute21);
          }
        }
      }
    });

    it('should handle reflexive commutativity correctly', () => {
      const allTypes: OperationTypeValue[] = [
        'CREATE_STATEMENT',
        'UPDATE_STATEMENT',
        'DELETE_STATEMENT',
        'CREATE_ARGUMENT',
        'UPDATE_ARGUMENT',
        'DELETE_ARGUMENT',
        'CREATE_TREE',
        'UPDATE_TREE_POSITION',
        'DELETE_TREE',
        'CREATE_CONNECTION',
        'DELETE_CONNECTION',
        'UPDATE_METADATA',
      ];

      const selfCommutativeTypes = ['UPDATE_TREE_POSITION', 'UPDATE_METADATA'];

      for (const type of allTypes) {
        const result = OperationType.create(type);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const canSelfCommute = result.value.canCommuteWith(result.value);
          const shouldSelfCommute = selfCommutativeTypes.includes(type);
          expect(canSelfCommute).toBe(shouldSelfCommute);
        }
      }
    });
  });
});

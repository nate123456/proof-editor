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
          const type1 = semanticTypes[i];
          const type2 = semanticTypes[j];
          if (!type1 || !type2) continue;
          const type1Result = OperationType.create(type1);
          const type2Result = OperationType.create(type2);

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

  describe('advanced commutativity analysis', () => {
    it('should handle complex structural operation dependencies', () => {
      const dependencyTests: [OperationTypeValue, OperationTypeValue, boolean, string][] = [
        // Dependencies that affect commutativity
        [
          'DELETE_ARGUMENT',
          'CREATE_CONNECTION',
          false,
          'Argument deletion affects connection creation',
        ],
        ['DELETE_TREE', 'CREATE_ARGUMENT', false, 'Tree deletion affects argument creation'],
        [
          'DELETE_CONNECTION',
          'UPDATE_ARGUMENT',
          false,
          'Connection deletion affects argument updates',
        ],

        // Independent operations that should commute
        [
          'CREATE_TREE',
          'UPDATE_TREE_POSITION',
          true,
          'Tree creation independent of position updates',
        ],
        [
          'UPDATE_TREE_POSITION',
          'CREATE_CONNECTION',
          true,
          'Position updates independent of connections',
        ],
        ['CREATE_ARGUMENT', 'CREATE_TREE', true, 'Independent creations should commute'],

        // Edge cases in structural operations
        ['CREATE_CONNECTION', 'CREATE_TREE', true, 'Independent structural creations'],
        [
          'UPDATE_TREE_POSITION',
          'UPDATE_TREE_POSITION',
          true,
          'Same operation type should commute',
        ],
      ];

      dependencyTests.forEach(([type1, type2, expectedCommute, _description]) => {
        const result1 = OperationType.create(type1);
        const result2 = OperationType.create(type2);

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);

        if (result1.isOk() && result2.isOk()) {
          const actualCommute = result1.value.canCommuteWith(result2.value);
          expect(actualCommute).toBe(expectedCommute);
        }
      });
    });

    it('should handle semantic operation interactions comprehensively', () => {
      const semanticTypes: OperationTypeValue[] = [
        'CREATE_STATEMENT',
        'UPDATE_STATEMENT',
        'DELETE_STATEMENT',
        'UPDATE_ARGUMENT',
        'UPDATE_METADATA',
      ];

      // All semantic operations should NOT commute with each other (except with themselves for UPDATE types)
      for (let i = 0; i < semanticTypes.length; i++) {
        for (let j = i + 1; j < semanticTypes.length; j++) {
          const type1 = semanticTypes[i];
          const type2 = semanticTypes[j];
          if (!type1 || !type2) continue;

          const result1 = OperationType.create(type1);
          const result2 = OperationType.create(type2);

          expect(result1.isOk()).toBe(true);
          expect(result2.isOk()).toBe(true);

          if (result1.isOk() && result2.isOk()) {
            expect(result1.value.canCommuteWith(result2.value)).toBe(false);
            expect(result2.value.canCommuteWith(result1.value)).toBe(false);
          }
        }
      }
    });

    it('should handle cross-category commutativity edge cases', () => {
      const crossCategoryTests: [OperationTypeValue, OperationTypeValue, boolean, string][] = [
        // Structural operations that DON'T affect semantic operations
        [
          'UPDATE_TREE_POSITION',
          'CREATE_STATEMENT',
          true,
          'Position changes independent of statement creation',
        ],
        ['CREATE_TREE', 'UPDATE_METADATA', true, 'Tree creation independent of metadata updates'],
        [
          'CREATE_CONNECTION',
          'CREATE_STATEMENT',
          true,
          'Connection creation independent of statement creation',
        ],

        // Structural operations that DO affect semantic operations
        [
          'DELETE_ARGUMENT',
          'UPDATE_STATEMENT',
          false,
          'Argument deletion affects statement semantics',
        ],
        ['DELETE_TREE', 'UPDATE_ARGUMENT', false, 'Tree deletion affects argument semantics'],
        [
          'DELETE_CONNECTION',
          'UPDATE_ARGUMENT',
          false,
          'Connection deletion specifically affects argument updates',
        ],

        // Edge cases
        [
          'CREATE_ARGUMENT',
          'UPDATE_STATEMENT',
          true,
          'Argument creation independent of statement updates',
        ],
        [
          'UPDATE_TREE_POSITION',
          'DELETE_STATEMENT',
          true,
          'Position updates independent of statement deletion',
        ],
      ];

      crossCategoryTests.forEach(([structural, semantic, expectedCommute, _description]) => {
        const structuralResult = OperationType.create(structural);
        const semanticResult = OperationType.create(semantic);

        expect(structuralResult.isOk()).toBe(true);
        expect(semanticResult.isOk()).toBe(true);

        if (structuralResult.isOk() && semanticResult.isOk()) {
          const commute1 = structuralResult.value.canCommuteWith(semanticResult.value);
          const commute2 = semanticResult.value.canCommuteWith(structuralResult.value);

          expect(commute1).toBe(expectedCommute);
          expect(commute2).toBe(expectedCommute); // Should be symmetric
        }
      });
    });
  });

  describe('property-based operation classification', () => {
    it('should maintain consistent verb-operation mapping', () => {
      const verbMappings = {
        CREATE: ['CREATE_STATEMENT', 'CREATE_ARGUMENT', 'CREATE_TREE', 'CREATE_CONNECTION'],
        UPDATE: ['UPDATE_STATEMENT', 'UPDATE_ARGUMENT', 'UPDATE_TREE_POSITION', 'UPDATE_METADATA'],
        DELETE: ['DELETE_STATEMENT', 'DELETE_ARGUMENT', 'DELETE_TREE', 'DELETE_CONNECTION'],
      } as const;

      Object.entries(verbMappings).forEach(([expectedVerb, operations]) => {
        operations.forEach((operation) => {
          const result = OperationType.create(operation as OperationTypeValue);
          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            expect(result.value.getVerb()).toBe(expectedVerb);

            // Verify verb classification methods
            expect(result.value.isCreation()).toBe(expectedVerb === 'CREATE');
            expect(result.value.isUpdate()).toBe(expectedVerb === 'UPDATE');
            expect(result.value.isDeletion()).toBe(expectedVerb === 'DELETE');
          }
        });
      });
    });

    it('should maintain consistent category-operation mapping', () => {
      const categoryMappings = {
        STRUCTURAL: [
          'CREATE_ARGUMENT',
          'DELETE_ARGUMENT',
          'CREATE_TREE',
          'UPDATE_TREE_POSITION',
          'DELETE_TREE',
          'CREATE_CONNECTION',
          'DELETE_CONNECTION',
        ],
        SEMANTIC: [
          'CREATE_STATEMENT',
          'UPDATE_STATEMENT',
          'DELETE_STATEMENT',
          'UPDATE_ARGUMENT',
          'UPDATE_METADATA',
        ],
      } as const;

      Object.entries(categoryMappings).forEach(([expectedCategory, operations]) => {
        operations.forEach((operation) => {
          const result = OperationType.create(operation as OperationTypeValue);
          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            expect(result.value.getCategory()).toBe(expectedCategory as 'STRUCTURAL' | 'SEMANTIC');

            // Verify category classification methods
            expect(result.value.isStructural()).toBe(expectedCategory === 'STRUCTURAL');
            expect(result.value.isSemantic()).toBe(expectedCategory === 'SEMANTIC');
          }
        });
      });
    });

    it('should generate correct targets for all operations', () => {
      const targetMappings: [OperationTypeValue, string][] = [
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

      targetMappings.forEach(([operation, expectedTarget]) => {
        const result = OperationType.create(operation);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getTarget()).toBe(expectedTarget);
        }
      });
    });
  });

  describe('advanced validation scenarios', () => {
    it('should handle invalid operation types robustly', () => {
      const invalidTypes = [
        '',
        'INVALID_OPERATION',
        'CREATE_INVALID',
        'UPDATE_UNKNOWN',
        'DELETE_NONEXISTENT',
        'OPERATION_TYPE',
        'create_statement', // Wrong case
        'CREATE STATEMENT', // Space instead of underscore
        'CREATE-STATEMENT', // Hyphen instead of underscore
        null,
        undefined,
        123,
        {},
        [],
        'CREATE_STATEMENT_EXTRA',
        'PREFIX_CREATE_STATEMENT',
      ];

      invalidTypes.forEach((invalidType) => {
        // @ts-expect-error - Testing invalid input
        const result = OperationType.create(invalidType);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Invalid operation type');
        }
      });
    });

    it('should handle case sensitivity strictly', () => {
      const caseVariations = [
        'create_statement',
        'Create_Statement',
        'CREATE_statement',
        'create_STATEMENT',
        'Create_Statement_',
        '_CREATE_STATEMENT',
      ];

      caseVariations.forEach((variation) => {
        // @ts-expect-error - Testing invalid input
        const result = OperationType.create(variation);
        expect(result.isErr()).toBe(true);
      });
    });

    it('should maintain immutability of operation instances', () => {
      const result = OperationType.create('CREATE_STATEMENT');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const operation = result.value;
        const value1 = operation.getValue();
        const value2 = operation.getValue();
        const toString1 = operation.toString();
        const toString2 = operation.toString();

        // Values should be consistent
        expect(value1).toBe(value2);
        expect(toString1).toBe(toString2);
        expect(value1).toBe(toString1);

        // Classification should be consistent
        expect(operation.isCreation()).toBe(true);
        expect(operation.isCreation()).toBe(true); // Call again
        expect(operation.getCategory()).toBe('SEMANTIC');
        expect(operation.getCategory()).toBe('SEMANTIC'); // Call again
      }
    });

    it('should handle operation comparison edge cases', () => {
      const operation1Result = OperationType.create('CREATE_STATEMENT');
      const operation2Result = OperationType.create('CREATE_STATEMENT');
      const operation3Result = OperationType.create('UPDATE_STATEMENT');

      expect(operation1Result.isOk()).toBe(true);
      expect(operation2Result.isOk()).toBe(true);
      expect(operation3Result.isOk()).toBe(true);

      if (operation1Result.isOk() && operation2Result.isOk() && operation3Result.isOk()) {
        const op1 = operation1Result.value;
        const op2 = operation2Result.value;
        const op3 = operation3Result.value;

        // Same type equality
        expect(op1.equals(op2)).toBe(true);
        expect(op2.equals(op1)).toBe(true);
        expect(op1.equals(op1)).toBe(true); // Reflexive

        // Different type inequality
        expect(op1.equals(op3)).toBe(false);
        expect(op3.equals(op1)).toBe(false);
      }
    });
  });

  describe('enhanced coverage scenarios', () => {
    it('should handle getVerb edge case for unknown operation types', () => {
      // Test the getVerb method's default case by mocking an unknown operation
      const operation = OperationType.create('CREATE_STATEMENT');
      expect(operation.isOk()).toBe(true);

      if (operation.isOk()) {
        const op = operation.value;
        // Force the value to an unknown type to test default case
        (op as any).value = 'UNKNOWN_OPERATION' as any;

        const verb = op.getVerb();
        expect(verb).toBe('UNKNOWN');
      }
    });

    it('should handle complex structural commutativity with all non-commutative pairs', () => {
      const nonCommutativePairs: [OperationTypeValue, OperationTypeValue][] = [
        ['CREATE_ARGUMENT', 'DELETE_ARGUMENT'],
        ['CREATE_TREE', 'DELETE_TREE'],
        ['CREATE_CONNECTION', 'DELETE_CONNECTION'],
        ['DELETE_ARGUMENT', 'CREATE_CONNECTION'],
        ['DELETE_TREE', 'CREATE_ARGUMENT'],
      ];

      // Test all non-commutative pairs in both directions
      nonCommutativePairs.forEach(([op1, op2]) => {
        const result1 = OperationType.create(op1);
        const result2 = OperationType.create(op2);

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);

        if (result1.isOk() && result2.isOk()) {
          // Should not commute in either direction
          expect(result1.value.canCommuteWith(result2.value)).toBe(false);
          expect(result2.value.canCommuteWith(result1.value)).toBe(false);
        }
      });
    });

    it('should test private method structuralAffectsSemantic edge cases', () => {
      // Test DELETE_CONNECTION with UPDATE_ARGUMENT specifically
      const deleteConnResult = OperationType.create('DELETE_CONNECTION');
      const updateArgResult = OperationType.create('UPDATE_ARGUMENT');

      expect(deleteConnResult.isOk()).toBe(true);
      expect(updateArgResult.isOk()).toBe(true);

      if (deleteConnResult.isOk() && updateArgResult.isOk()) {
        const deleteConn = deleteConnResult.value;
        const updateArg = updateArgResult.value;

        // This specific combination should not commute
        expect(deleteConn.canCommuteWith(updateArg)).toBe(false);
        expect(updateArg.canCommuteWith(deleteConn)).toBe(false);
      }
    });

    it('should test all deletion operations affect semantic operations', () => {
      const deletionTypes: OperationTypeValue[] = [
        'DELETE_STATEMENT',
        'DELETE_ARGUMENT',
        'DELETE_TREE',
        'DELETE_CONNECTION',
      ];

      const semanticTypes: OperationTypeValue[] = [
        'CREATE_STATEMENT',
        'UPDATE_STATEMENT',
        'DELETE_STATEMENT',
        'UPDATE_ARGUMENT',
        'UPDATE_METADATA',
      ];

      deletionTypes.forEach((deletionType) => {
        semanticTypes.forEach((semanticType) => {
          const deletionResult = OperationType.create(deletionType);
          const semanticResult = OperationType.create(semanticType);

          expect(deletionResult.isOk()).toBe(true);
          expect(semanticResult.isOk()).toBe(true);

          if (deletionResult.isOk() && semanticResult.isOk()) {
            const deletion = deletionResult.value;
            const semantic = semanticResult.value;

            // Deletion operations should not commute with semantic operations
            expect(deletion.canCommuteWith(semantic)).toBe(false);
            expect(semantic.canCommuteWith(deletion)).toBe(false);
          }
        });
      });
    });

    it('should handle cross-type commutativity with structural non-deletion operations', () => {
      const structuralNonDeletions: OperationTypeValue[] = [
        'CREATE_ARGUMENT',
        'CREATE_TREE',
        'UPDATE_TREE_POSITION',
        'CREATE_CONNECTION',
      ];

      const semanticTypes: OperationTypeValue[] = [
        'CREATE_STATEMENT',
        'UPDATE_STATEMENT',
        'DELETE_STATEMENT',
        'UPDATE_ARGUMENT',
        'UPDATE_METADATA',
      ];

      structuralNonDeletions.forEach((structuralType) => {
        semanticTypes.forEach((semanticType) => {
          const structuralResult = OperationType.create(structuralType);
          const semanticResult = OperationType.create(semanticType);

          expect(structuralResult.isOk()).toBe(true);
          expect(semanticResult.isOk()).toBe(true);

          if (structuralResult.isOk() && semanticResult.isOk()) {
            const structural = structuralResult.value;
            const semantic = semanticResult.value;

            // Non-deletion structural operations should commute with semantic operations
            // (this test only covers non-deletion operations, so all should commute)
            const shouldCommute = true;
            expect(structural.canCommuteWith(semantic)).toBe(shouldCommute);
            expect(semantic.canCommuteWith(structural)).toBe(shouldCommute);
          }
        });
      });
    });

    it('should handle checkCrossTypeCommutativity default case', () => {
      // Create operations that are neither structural nor semantic (impossible in real code)
      // We'll test by forcing a mock operation type
      const op1Result = OperationType.create('CREATE_STATEMENT');
      const op2Result = OperationType.create('UPDATE_STATEMENT');

      expect(op1Result.isOk()).toBe(true);
      expect(op2Result.isOk()).toBe(true);

      if (op1Result.isOk() && op2Result.isOk()) {
        const op1 = op1Result.value;
        const op2 = op2Result.value;

        // Mock isStructural and isSemantic to return false for both
        const originalIsStructural1 = op1.isStructural;
        const originalIsSemantic1 = op1.isSemantic;
        const originalIsStructural2 = op2.isStructural;
        const originalIsSemantic2 = op2.isSemantic;

        (op1 as any).isStructural = () => false;
        (op1 as any).isSemantic = () => false;
        (op2 as any).isStructural = () => false;
        (op2 as any).isSemantic = () => false;

        // Should return true for the default case
        const result = op1.canCommuteWith(op2);
        expect(result).toBe(true);

        // Restore original methods
        (op1 as any).isStructural = originalIsStructural1;
        (op1 as any).isSemantic = originalIsSemantic1;
        (op2 as any).isStructural = originalIsStructural2;
        (op2 as any).isSemantic = originalIsSemantic2;
      }
    });

    it('should test operation type validation with boundary inputs', () => {
      const boundaryInputs = [
        null,
        undefined,
        '',
        ' ',
        '\t',
        '\n',
        'CREATE_',
        '_STATEMENT',
        'CREATE__STATEMENT',
        'CREATE-STATEMENT',
        'create_statement',
        'Create_Statement',
        'CREATE STATEMENT',
        'CREATE_STATEMENT_EXTRA',
        'INVALID_TYPE',
        123,
        {},
        [],
        true,
        false,
      ];

      boundaryInputs.forEach((input) => {
        // @ts-expect-error - Testing invalid input types
        const result = OperationType.create(input);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Invalid operation type');
        }
      });
    });

    it('should test getTarget with complex operation names', () => {
      // Test getTarget with UPDATE_TREE_POSITION which has multiple underscores
      const result = OperationType.create('UPDATE_TREE_POSITION');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const operation = result.value;
        expect(operation.getTarget()).toBe('TREE_POSITION');
        expect(operation.getVerb()).toBe('UPDATE');
      }
    });

    it('should handle all operation types with consistent toString behavior', () => {
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

      allTypes.forEach((type) => {
        const result = OperationType.create(type);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const operation = result.value;

          // toString should match getValue
          expect(operation.toString()).toBe(operation.getValue());
          expect(operation.toString()).toBe(type);

          // Multiple calls should be consistent
          expect(operation.toString()).toBe(operation.toString());
          expect(operation.getValue()).toBe(operation.getValue());
        }
      });
    });

    it('should test static INSERT constant maintains consistency', () => {
      const insert = OperationType.INSERT;
      const created = OperationType.create('CREATE_STATEMENT');

      expect(created.isOk()).toBe(true);
      if (created.isOk()) {
        expect(insert.getValue()).toBe(created.value.getValue());
        expect(insert.equals(created.value)).toBe(true);
        expect(insert.toString()).toBe('CREATE_STATEMENT');
        expect(insert.isCreation()).toBe(true);
        expect(insert.isSemantic()).toBe(true);
        expect(insert.isStructural()).toBe(false);
      }
    });
  });

  describe('performance and stress testing', () => {
    it('should handle rapid operation creation efficiently', () => {
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

      const startTime = performance.now();
      const operations: any[] = [];

      // Create many operations rapidly
      for (let i = 0; i < 10000; i++) {
        const type = allTypes[i % allTypes.length] as OperationTypeValue;
        const result = OperationType.create(type);
        if (result.isOk()) {
          operations.push(result.value);
        }
      }

      const duration = performance.now() - startTime;

      expect(operations).toHaveLength(10000);
      expect(duration).toBeLessThan(100); // Should be very fast
    });

    it('should handle extensive commutativity checking efficiently', () => {
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

      const operations = allTypes
        .map((type) => {
          const result = OperationType.create(type);
          return result.isOk() ? result.value : null;
        })
        .filter(Boolean);

      const startTime = performance.now();
      let commuteChecks = 0;

      // Check all pairwise commutativity
      for (const op1 of operations) {
        for (const op2 of operations) {
          if (op1 && op2) {
            op1.canCommuteWith(op2);
            commuteChecks++;
          }
        }
      }

      const duration = performance.now() - startTime;

      expect(commuteChecks).toBe(144); // 12 * 12
      expect(duration).toBeLessThan(50); // Should be fast even for many checks
    });

    it('should maintain memory efficiency with many operations', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const operations: any[] = [];

      // Create many operation instances
      for (let i = 0; i < 10000; i++) {
        const result = OperationType.create('CREATE_STATEMENT');
        if (result.isOk()) {
          operations.push(result.value);
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 5MB for 10k operations)
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
      expect(operations).toHaveLength(10000);
    });
  });
});

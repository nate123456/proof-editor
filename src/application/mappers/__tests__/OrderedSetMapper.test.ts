import { describe, expect, it } from 'vitest';
import {
  atomicArgumentIdFactory,
  orderedSetFactory,
  orderedSetIdFactory,
  statementIdFactory,
} from '../../../domain/__tests__/factories/index.js';
import { expect as domainExpect } from '../../../domain/__tests__/test-setup.js';
import { OrderedSet } from '../../../domain/entities/OrderedSet.js';
import type { OrderedSetDTO } from '../../queries/shared-types.js';
import {
  createUsageInfo,
  orderedSetFromDTO,
  orderedSetsFromDTOs,
  orderedSetsToDTOs,
  orderedSetToDTO,
} from '../OrderedSetMapper.js';

describe('OrderedSetMapper', () => {
  describe('orderedSetToDTO', () => {
    it('converts a basic OrderedSet to DTO', () => {
      // Arrange
      const statementIds = [statementIdFactory.build(), statementIdFactory.build()];
      const orderedSet = orderedSetFactory.build({}, { transient: { statementIds } });

      // Act
      const result = orderedSetToDTO(orderedSet);

      // Assert
      expect(result).toEqual({
        id: orderedSet.getId().getValue(),
        statementIds: statementIds.map((id) => id.getValue()),
        usageCount: 0,
        usedBy: [],
      });
    });

    it('converts OrderedSet with usage information to DTO', () => {
      // Arrange
      const statementIds = [statementIdFactory.build(), statementIdFactory.build()];
      const orderedSet = orderedSetFactory.build({}, { transient: { statementIds } });
      const argumentId1 = atomicArgumentIdFactory.build();
      const argumentId2 = atomicArgumentIdFactory.build();

      // Add references to the ordered set
      orderedSet.addAtomicArgumentReference(argumentId1, 'premise');
      orderedSet.addAtomicArgumentReference(argumentId2, 'conclusion');

      // Act
      const result = orderedSetToDTO(orderedSet);

      // Assert
      expect(result).toEqual({
        id: orderedSet.getId().getValue(),
        statementIds: statementIds.map((id) => id.getValue()),
        usageCount: 2,
        usedBy: [
          { argumentId: argumentId1.getValue(), usage: 'premise' },
          { argumentId: argumentId2.getValue(), usage: 'conclusion' },
        ],
      });
    });

    it('converts OrderedSet with explicit usage parameter', () => {
      // Arrange
      const statementIds = [statementIdFactory.build()];
      const orderedSet = orderedSetFactory.build({}, { transient: { statementIds } });
      const explicitUsages = [
        { argumentId: 'arg1', usage: 'premise' as const },
        { argumentId: 'arg2', usage: 'conclusion' as const },
      ];

      // Act
      const result = orderedSetToDTO(orderedSet, explicitUsages);

      // Assert
      expect(result).toEqual({
        id: orderedSet.getId().getValue(),
        statementIds: statementIds.map((id) => id.getValue()),
        usageCount: orderedSet.getTotalReferenceCount(),
        usedBy: explicitUsages,
      });
    });

    it('converts empty OrderedSet to DTO', () => {
      // Arrange
      const emptyOrderedSetResult = OrderedSet.createEmpty();
      expect(emptyOrderedSetResult.isOk()).toBe(true);
      if (!emptyOrderedSetResult.isOk()) throw new Error('Failed to create empty OrderedSet');
      const emptyOrderedSet = emptyOrderedSetResult.value;

      // Act
      const result = orderedSetToDTO(emptyOrderedSet);

      // Assert
      expect(result).toEqual({
        id: emptyOrderedSet.getId().getValue(),
        statementIds: [],
        usageCount: 0,
        usedBy: [],
      });
    });

    it('preserves statement order in DTO', () => {
      // Arrange
      const statementIds = [
        statementIdFactory.build(),
        statementIdFactory.build(),
        statementIdFactory.build(),
      ];
      const orderedSet = orderedSetFactory.build({}, { transient: { statementIds } });

      // Act
      const result = orderedSetToDTO(orderedSet);

      // Assert
      expect(result.statementIds).toEqual(statementIds.map((id) => id.getValue()));
      // Verify order is preserved
      expect(result.statementIds[0]).toBe(statementIds[0]?.getValue());
      expect(result.statementIds[1]).toBe(statementIds[1]?.getValue());
      expect(result.statementIds[2]).toBe(statementIds[2]?.getValue());
    });
  });

  describe('orderedSetsToDTOs', () => {
    it('converts multiple OrderedSets to DTOs', () => {
      // Arrange
      const orderedSet1 = orderedSetFactory.build(
        {},
        { transient: { statementIds: [statementIdFactory.build()] } },
      );
      const orderedSet2 = orderedSetFactory.build(
        {},
        {
          transient: {
            statementIds: [statementIdFactory.build(), statementIdFactory.build()],
          },
        },
      );
      const orderedSets = [orderedSet1, orderedSet2];

      // Act
      const result = orderedSetsToDTOs(orderedSets);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: orderedSet1.getId().getValue(),
        statementIds: orderedSet1.getStatementIds().map((id) => id.getValue()),
        usageCount: 0,
        usedBy: [],
      });
      expect(result[1]).toEqual({
        id: orderedSet2.getId().getValue(),
        statementIds: orderedSet2.getStatementIds().map((id) => id.getValue()),
        usageCount: 0,
        usedBy: [],
      });
    });

    it('converts empty array to empty DTOs array', () => {
      // Act
      const result = orderedSetsToDTOs([]);

      // Assert
      expect(result).toEqual([]);
    });

    it('uses usage map when provided', () => {
      // Arrange
      const orderedSet = orderedSetFactory.build(
        {},
        { transient: { statementIds: [statementIdFactory.build()] } },
      );
      const usageMap = new Map([
        [orderedSet.getId().getValue(), [{ argumentId: 'arg1', usage: 'premise' as const }]],
      ]);

      // Act
      const result = orderedSetsToDTOs([orderedSet], usageMap);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.usedBy).toEqual([{ argumentId: 'arg1', usage: 'premise' }]);
    });
  });

  describe('createUsageInfo', () => {
    it('creates usage information for premise', () => {
      // Arrange
      const argumentIds = [atomicArgumentIdFactory.build(), atomicArgumentIdFactory.build()];

      // Act
      const result = createUsageInfo(argumentIds, 'premise');

      // Assert
      expect(result).toEqual([
        { argumentId: argumentIds[0]?.getValue(), usage: 'premise' },
        { argumentId: argumentIds[1]?.getValue(), usage: 'premise' },
      ]);
    });

    it('creates usage information for conclusion', () => {
      // Arrange
      const argumentIds = [atomicArgumentIdFactory.build()];

      // Act
      const result = createUsageInfo(argumentIds, 'conclusion');

      // Assert
      expect(result).toEqual([{ argumentId: argumentIds[0]?.getValue(), usage: 'conclusion' }]);
    });

    it('handles empty argument IDs array', () => {
      // Act
      const result = createUsageInfo([], 'premise');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('orderedSetFromDTO', () => {
    it('converts a basic OrderedSetDTO to OrderedSet', () => {
      // Arrange
      const dto: OrderedSetDTO = {
        id: orderedSetIdFactory.build().getValue(),
        statementIds: [
          statementIdFactory.build().getValue(),
          statementIdFactory.build().getValue(),
        ],
        usageCount: 0,
        usedBy: [],
      };

      // Act
      const result = orderedSetFromDTO(dto);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const orderedSet = result.value;
        domainExpect(orderedSet).toBeValidOrderedSet();
        expect(orderedSet.getId().getValue()).toBe(dto.id);
        expect(orderedSet.getStatementIds().map((id) => id.getValue())).toEqual(dto.statementIds);
        expect(orderedSet.getTotalReferenceCount()).toBe(0);
      }
    });

    it('converts OrderedSetDTO with usage information', () => {
      // Arrange
      const dto: OrderedSetDTO = {
        id: orderedSetIdFactory.build().getValue(),
        statementIds: [statementIdFactory.build().getValue()],
        usageCount: 2,
        usedBy: [
          { argumentId: atomicArgumentIdFactory.build().getValue(), usage: 'premise' },
          { argumentId: atomicArgumentIdFactory.build().getValue(), usage: 'conclusion' },
        ],
      };

      // Act
      const result = orderedSetFromDTO(dto);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const orderedSet = result.value;
        domainExpect(orderedSet).toBeValidOrderedSet();
        expect(orderedSet.getTotalReferenceCount()).toBe(2);
        expect(orderedSet.getReferencedByAsPremise()).toHaveLength(1);
        expect(orderedSet.getReferencedByAsConclusion()).toHaveLength(1);
      }
    });

    it('preserves statement order from DTO', () => {
      // Arrange
      const statementIds = [
        statementIdFactory.build().getValue(),
        statementIdFactory.build().getValue(),
        statementIdFactory.build().getValue(),
      ];
      const dto: OrderedSetDTO = {
        id: orderedSetIdFactory.build().getValue(),
        statementIds,
        usageCount: 0,
        usedBy: [],
      };

      // Act
      const result = orderedSetFromDTO(dto);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const orderedSet = result.value;
        const resultStatementIds = orderedSet.getStatementIds().map((id) => id.getValue());
        expect(resultStatementIds).toEqual(statementIds);
        // Verify order is preserved
        expect(resultStatementIds[0]).toBe(statementIds[0]);
        expect(resultStatementIds[1]).toBe(statementIds[1]);
        expect(resultStatementIds[2]).toBe(statementIds[2]);
      }
    });

    it('handles empty OrderedSetDTO', () => {
      // Arrange
      const dto: OrderedSetDTO = {
        id: orderedSetIdFactory.build().getValue(),
        statementIds: [],
        usageCount: 0,
        usedBy: [],
      };

      // Act
      const result = orderedSetFromDTO(dto);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const orderedSet = result.value;
        expect(orderedSet.isEmpty()).toBe(true);
        expect(orderedSet.size()).toBe(0);
        expect(orderedSet.getTotalReferenceCount()).toBe(0);
      }
    });

    it('returns error for invalid OrderedSetId', () => {
      // Arrange
      const dto: OrderedSetDTO = {
        id: '', // Invalid empty ID
        statementIds: [statementIdFactory.build().getValue()],
        usageCount: 0,
        usedBy: [],
      };

      // Act
      const result = orderedSetFromDTO(dto);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        domainExpect(result.error).toBeValidationError('OrderedSetId cannot be empty');
      }
    });

    it('returns error for invalid StatementId', () => {
      // Arrange
      const dto: OrderedSetDTO = {
        id: orderedSetIdFactory.build().getValue(),
        statementIds: ['', 'valid-id'], // First ID is invalid
        usageCount: 0,
        usedBy: [],
      };

      // Act
      const result = orderedSetFromDTO(dto);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        domainExpect(result.error).toBeValidationError('Invalid statement ID in ordered set');
      }
    });

    it('returns error for invalid AtomicArgumentId in usage', () => {
      // Arrange
      const dto: OrderedSetDTO = {
        id: orderedSetIdFactory.build().getValue(),
        statementIds: [statementIdFactory.build().getValue()],
        usageCount: 1,
        usedBy: [{ argumentId: '', usage: 'premise' }], // Invalid empty argument ID
      };

      // Act
      const result = orderedSetFromDTO(dto);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        domainExpect(result.error).toBeValidationError('Invalid argument ID in usage');
      }
    });

    it('handles duplicate statement IDs by preserving uniqueness', () => {
      // Arrange
      const duplicateStatementId = statementIdFactory.build().getValue();
      const dto: OrderedSetDTO = {
        id: orderedSetIdFactory.build().getValue(),
        statementIds: [duplicateStatementId, duplicateStatementId, 'unique-id'],
        usageCount: 0,
        usedBy: [],
      };

      // Act
      const result = orderedSetFromDTO(dto);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const orderedSet = result.value;
        // OrderedSet should automatically handle uniqueness
        expect(orderedSet.size()).toBe(2); // Only unique statements
        const statementIds = orderedSet.getStatementIds().map((id) => id.getValue());
        expect(statementIds).toContain(duplicateStatementId);
        expect(statementIds).toContain('unique-id');
      }
    });
  });

  describe('orderedSetsFromDTOs', () => {
    it('converts multiple OrderedSetDTOs to OrderedSets', () => {
      // Arrange
      const dto1: OrderedSetDTO = {
        id: orderedSetIdFactory.build().getValue(),
        statementIds: [statementIdFactory.build().getValue()],
        usageCount: 0,
        usedBy: [],
      };
      const dto2: OrderedSetDTO = {
        id: orderedSetIdFactory.build().getValue(),
        statementIds: [
          statementIdFactory.build().getValue(),
          statementIdFactory.build().getValue(),
        ],
        usageCount: 0,
        usedBy: [],
      };
      const dtos = [dto1, dto2];

      // Act
      const result = orderedSetsFromDTOs(dtos);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const orderedSets = result.value;
        expect(orderedSets).toHaveLength(2);
        domainExpect(orderedSets[0]).toBeValidOrderedSet();
        domainExpect(orderedSets[1]).toBeValidOrderedSet();
        expect(orderedSets[0]?.getId().getValue()).toBe(dto1.id);
        expect(orderedSets[1]?.getId().getValue()).toBe(dto2.id);
      }
    });

    it('converts empty DTOs array', () => {
      // Act
      const result = orderedSetsFromDTOs([]);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([]);
      }
    });

    it('returns error if any DTO conversion fails', () => {
      // Arrange
      const validDto: OrderedSetDTO = {
        id: orderedSetIdFactory.build().getValue(),
        statementIds: [statementIdFactory.build().getValue()],
        usageCount: 0,
        usedBy: [],
      };
      const invalidDto: OrderedSetDTO = {
        id: '', // Invalid empty ID
        statementIds: [statementIdFactory.build().getValue()],
        usageCount: 0,
        usedBy: [],
      };
      const dtos = [validDto, invalidDto];

      // Act
      const result = orderedSetsFromDTOs(dtos);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        domainExpect(result.error).toBeValidationError('OrderedSetId cannot be empty');
      }
    });

    it('stops processing at first error', () => {
      // Arrange
      const invalidDto1: OrderedSetDTO = {
        id: '', // Invalid empty ID
        statementIds: [],
        usageCount: 0,
        usedBy: [],
      };
      const invalidDto2: OrderedSetDTO = {
        id: 'x'.repeat(300), // Invalid long ID
        statementIds: [],
        usageCount: 0,
        usedBy: [],
      };
      const dtos = [invalidDto1, invalidDto2];

      // Act
      const result = orderedSetsFromDTOs(dtos);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        // Should return error from first invalid DTO
        domainExpect(result.error).toBeValidationError('OrderedSetId cannot be empty');
      }
    });
  });

  describe('round-trip conversion', () => {
    it('maintains data integrity through toDTO -> fromDTO conversion', () => {
      // Arrange
      const statementIds = [
        statementIdFactory.build(),
        statementIdFactory.build(),
        statementIdFactory.build(),
      ];
      const originalOrderedSet = orderedSetFactory.build({}, { transient: { statementIds } });
      const argumentId1 = atomicArgumentIdFactory.build();
      const argumentId2 = atomicArgumentIdFactory.build();

      // Add some references
      originalOrderedSet.addAtomicArgumentReference(argumentId1, 'premise');
      originalOrderedSet.addAtomicArgumentReference(argumentId2, 'conclusion');

      // Act
      const dto = orderedSetToDTO(originalOrderedSet);
      const reconstructedResult = orderedSetFromDTO(dto);

      // Assert
      expect(reconstructedResult.isOk()).toBe(true);
      if (reconstructedResult.isOk()) {
        const reconstructedOrderedSet = reconstructedResult.value;

        // Verify core data integrity
        expect(reconstructedOrderedSet.getId().getValue()).toBe(
          originalOrderedSet.getId().getValue(),
        );
        expect(reconstructedOrderedSet.getStatementIds().map((id) => id.getValue())).toEqual(
          originalOrderedSet.getStatementIds().map((id) => id.getValue()),
        );
        expect(reconstructedOrderedSet.size()).toBe(originalOrderedSet.size());
        expect(reconstructedOrderedSet.getTotalReferenceCount()).toBe(
          originalOrderedSet.getTotalReferenceCount(),
        );

        // Verify order preservation
        const originalStatementIds = originalOrderedSet
          .getStatementIds()
          .map((id) => id.getValue());
        const reconstructedStatementIds = reconstructedOrderedSet
          .getStatementIds()
          .map((id) => id.getValue());
        expect(reconstructedStatementIds).toEqual(originalStatementIds);
      }
    });

    it('maintains uniqueness through round-trip conversion', () => {
      // Arrange
      const statementIds = [
        statementIdFactory.build(),
        statementIdFactory.build(),
        statementIdFactory.build(),
      ];
      const originalOrderedSet = orderedSetFactory.build({}, { transient: { statementIds } });

      // Act
      const dto = orderedSetToDTO(originalOrderedSet);
      const reconstructedResult = orderedSetFromDTO(dto);

      // Assert
      expect(reconstructedResult.isOk()).toBe(true);
      if (reconstructedResult.isOk()) {
        const reconstructedOrderedSet = reconstructedResult.value;

        // Verify uniqueness is maintained
        const originalStatementIds = originalOrderedSet.getStatementIds();
        const reconstructedStatementIds = reconstructedOrderedSet.getStatementIds();

        expect(reconstructedStatementIds).toHaveLength(originalStatementIds.length);

        // Check that all statements are unique
        const uniqueIds = new Set(reconstructedStatementIds.map((id) => id.getValue()));
        expect(uniqueIds.size).toBe(reconstructedStatementIds.length);
      }
    });
  });

  describe('edge cases', () => {
    it('handles OrderedSet with maximum statement count', () => {
      // Arrange
      const manyStatementIds = Array.from({ length: 50 }, () => statementIdFactory.build());
      const orderedSet = orderedSetFactory.build(
        {},
        { transient: { statementIds: manyStatementIds } },
      );

      // Act
      const dto = orderedSetToDTO(orderedSet);
      const reconstructedResult = orderedSetFromDTO(dto);

      // Assert
      expect(reconstructedResult.isOk()).toBe(true);
      if (reconstructedResult.isOk()) {
        const reconstructedOrderedSet = reconstructedResult.value;
        expect(reconstructedOrderedSet.size()).toBe(50);
        expect(reconstructedOrderedSet.getStatementIds()).toHaveLength(50);
      }
    });

    it('handles OrderedSet with many references', () => {
      // Arrange
      const orderedSet = orderedSetFactory.build(
        {},
        { transient: { statementIds: [statementIdFactory.build()] } },
      );
      const argumentIds = Array.from({ length: 10 }, () => atomicArgumentIdFactory.build());

      // Add many references
      argumentIds.forEach((argId, index) => {
        orderedSet.addAtomicArgumentReference(argId, index % 2 === 0 ? 'premise' : 'conclusion');
      });

      // Act
      const dto = orderedSetToDTO(orderedSet);
      const reconstructedResult = orderedSetFromDTO(dto);

      // Assert
      expect(reconstructedResult.isOk()).toBe(true);
      if (reconstructedResult.isOk()) {
        const reconstructedOrderedSet = reconstructedResult.value;
        expect(reconstructedOrderedSet.getTotalReferenceCount()).toBe(10);
        expect(reconstructedOrderedSet.getReferencedByAsPremise()).toHaveLength(5);
        expect(reconstructedOrderedSet.getReferencedByAsConclusion()).toHaveLength(5);
      }
    });
  });
});

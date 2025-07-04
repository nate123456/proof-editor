import { describe, expect, it } from 'vitest';
import {
  atomicArgumentFactory,
  orderedSetFactory,
} from '../../../domain/__tests__/factories/index.js';
import { AtomicArgument, type SideLabels } from '../../../domain/entities/AtomicArgument.js';
import type { AtomicArgumentDTO } from '../../queries/shared-types.js';
import {
  atomicArgumentFromDTO,
  atomicArgumentsToDTOs,
  atomicArgumentToDTO,
} from '../AtomicArgumentMapper.js';

describe('AtomicArgumentMapper', () => {
  describe('atomicArgumentToDTO', () => {
    it('should convert AtomicArgument to DTO with all fields', () => {
      // Arrange
      const premiseSet = orderedSetFactory.build();
      const conclusionSet = orderedSetFactory.build();
      const sideLabels: SideLabels = { left: 'Rule A', right: 'Reference 1' };
      const createResult = AtomicArgument.create(
        premiseSet.getId(),
        conclusionSet.getId(),
        sideLabels,
      );
      expect(createResult.isOk()).toBe(true);
      if (!createResult.isOk()) throw createResult.error;
      const atomicArgument = createResult.value;

      // Act
      const result = atomicArgumentToDTO(atomicArgument);

      // Assert
      expect(result).toEqual({
        id: atomicArgument.getId().getValue(),
        premiseSetId: premiseSet.getId().getValue(),
        conclusionSetId: conclusionSet.getId().getValue(),
        sideLabels: {
          left: 'Rule A',
          right: 'Reference 1',
        },
      });
    });

    it('should convert AtomicArgument to DTO with null premise set', () => {
      // Arrange
      const conclusionSet = orderedSetFactory.build();
      const createResult = AtomicArgument.create(undefined, conclusionSet.getId(), {});
      expect(createResult.isOk()).toBe(true);
      if (!createResult.isOk()) throw createResult.error;
      const atomicArgument = createResult.value;

      // Act
      const result = atomicArgumentToDTO(atomicArgument);

      // Assert
      expect(result).toEqual({
        id: atomicArgument.getId().getValue(),
        premiseSetId: null,
        conclusionSetId: conclusionSet.getId().getValue(),
      });
    });

    it('should convert AtomicArgument to DTO with null conclusion set', () => {
      // Arrange
      const premiseSet = orderedSetFactory.build();
      const createResult = AtomicArgument.create(premiseSet.getId(), undefined, {});
      expect(createResult.isOk()).toBe(true);
      if (!createResult.isOk()) throw createResult.error;
      const atomicArgument = createResult.value;

      // Act
      const result = atomicArgumentToDTO(atomicArgument);

      // Assert
      expect(result).toEqual({
        id: atomicArgument.getId().getValue(),
        premiseSetId: premiseSet.getId().getValue(),
        conclusionSetId: null,
      });
    });

    it('should convert bootstrap AtomicArgument to DTO with null sets', () => {
      // Arrange
      const bootstrapArgument = AtomicArgument.createBootstrap();

      // Act
      const result = atomicArgumentToDTO(bootstrapArgument);

      // Assert
      expect(result).toEqual({
        id: bootstrapArgument.getId().getValue(),
        premiseSetId: null,
        conclusionSetId: null,
      });
    });

    it('should convert AtomicArgument to DTO with only left side label', () => {
      // Arrange
      const sideLabels: SideLabels = { left: 'Modus Ponens' };
      const createResult = AtomicArgument.create(undefined, undefined, sideLabels);
      expect(createResult.isOk()).toBe(true);
      if (!createResult.isOk()) throw createResult.error;
      const atomicArgument = createResult.value;

      // Act
      const result = atomicArgumentToDTO(atomicArgument);

      // Assert
      expect(result.sideLabels).toEqual({ left: 'Modus Ponens' });
    });

    it('should convert AtomicArgument to DTO with only right side label', () => {
      // Arrange
      const sideLabels: SideLabels = { right: 'Theorem 5.2' };
      const createResult = AtomicArgument.create(undefined, undefined, sideLabels);
      expect(createResult.isOk()).toBe(true);
      if (!createResult.isOk()) throw createResult.error;
      const atomicArgument = createResult.value;

      // Act
      const result = atomicArgumentToDTO(atomicArgument);

      // Assert
      expect(result.sideLabels).toEqual({ right: 'Theorem 5.2' });
    });

    it('should convert AtomicArgument to DTO without sideLabels property when no labels', () => {
      // Arrange
      const premiseSet = orderedSetFactory.build();
      const conclusionSet = orderedSetFactory.build();
      const createResult = AtomicArgument.create(premiseSet.getId(), conclusionSet.getId(), {});
      expect(createResult.isOk()).toBe(true);
      if (!createResult.isOk()) throw createResult.error;
      const atomicArgument = createResult.value;

      // Act
      const result = atomicArgumentToDTO(atomicArgument);

      // Assert
      expect(result).not.toHaveProperty('sideLabels');
    });

    it('should convert AtomicArgument to DTO without sideLabels property when labels are empty strings', () => {
      // Arrange
      const premiseSet = orderedSetFactory.build();
      const conclusionSet = orderedSetFactory.build();
      const sideLabels: SideLabels = { left: '', right: '' };
      const createResult = AtomicArgument.create(
        premiseSet.getId(),
        conclusionSet.getId(),
        sideLabels,
      );
      expect(createResult.isOk()).toBe(true);
      if (!createResult.isOk()) throw createResult.error;
      const atomicArgument = createResult.value;

      // Act
      const result = atomicArgumentToDTO(atomicArgument);

      // Assert
      expect(result).not.toHaveProperty('sideLabels');
    });
  });

  describe('atomicArgumentsToDTOs', () => {
    it('should convert array of AtomicArguments to DTOs', () => {
      // Arrange
      const atomicArguments = [
        atomicArgumentFactory.build(),
        atomicArgumentFactory.build(),
        atomicArgumentFactory.build(),
      ];

      // Act
      const result = atomicArgumentsToDTOs(atomicArguments);

      // Assert
      expect(result).toHaveLength(3);
      atomicArguments.forEach((arg, index) => {
        expect(result[index]).toEqual(atomicArgumentToDTO(arg));
      });
    });

    it('should convert empty array to empty array', () => {
      // Arrange
      const atomicArguments: AtomicArgument[] = [];

      // Act
      const result = atomicArgumentsToDTOs(atomicArguments);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle mixed AtomicArguments with different properties', () => {
      // Arrange
      const atomicArguments = [
        AtomicArgument.createBootstrap(),
        (() => {
          const orderedSet = orderedSetFactory.build();
          const result = AtomicArgument.create(orderedSet.getId(), undefined, {
            left: 'Rule',
          });
          if (result.isErr()) throw result.error;
          return result.value;
        })(),
        (() => {
          const orderedSet = orderedSetFactory.build();
          const result = AtomicArgument.create(undefined, orderedSet.getId(), {
            right: 'Ref',
          });
          if (result.isErr()) throw result.error;
          return result.value;
        })(),
      ];

      // Act
      const result = atomicArgumentsToDTOs(atomicArguments);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]?.premiseSetId).toBeNull();
      expect(result[0]?.conclusionSetId).toBeNull();
      expect(result[1]?.premiseSetId).toBeDefined();
      expect(result[1]?.sideLabels?.left).toBe('Rule');
      expect(result[2]?.conclusionSetId).toBeDefined();
      expect(result[2]?.sideLabels?.right).toBe('Ref');
    });
  });

  describe('atomicArgumentFromDTO', () => {
    it('should convert valid DTO to AtomicArgument', () => {
      // Arrange
      const dto: AtomicArgumentDTO = {
        id: 'test-id',
        premiseSetId: 'premise-set-id',
        conclusionSetId: 'conclusion-set-id',
        sideLabels: {
          left: 'Rule A',
          right: 'Reference 1',
        },
      };

      // Act
      const result = atomicArgumentFromDTO(dto);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const reconstructionData = result.value;
        expect(reconstructionData.id.getValue()).toBe('test-id');
        expect(reconstructionData.premiseSetId?.getValue()).toBe('premise-set-id');
        expect(reconstructionData.conclusionSetId?.getValue()).toBe('conclusion-set-id');
        expect(reconstructionData.sideLabels).toEqual({
          left: 'Rule A',
          right: 'Reference 1',
        });
      }
    });

    it('should convert DTO with null premise set to AtomicArgument', () => {
      // Arrange
      const dto: AtomicArgumentDTO = {
        id: 'test-id',
        premiseSetId: null,
        conclusionSetId: 'conclusion-set-id',
      };

      // Act
      const result = atomicArgumentFromDTO(dto);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const reconstructionData = result.value;
        expect(reconstructionData.id.getValue()).toBe('test-id');
        expect(reconstructionData.premiseSetId).toBeNull();
        expect(reconstructionData.conclusionSetId?.getValue()).toBe('conclusion-set-id');
      }
    });

    it('should convert DTO with null conclusion set to AtomicArgument', () => {
      // Arrange
      const dto: AtomicArgumentDTO = {
        id: 'test-id',
        premiseSetId: 'premise-set-id',
        conclusionSetId: null,
      };

      // Act
      const result = atomicArgumentFromDTO(dto);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const atomicArgument = result.value;
        expect(atomicArgument.id.getValue()).toBe('test-id');
        expect(atomicArgument.premiseSetId?.getValue()).toBe('premise-set-id');
        expect(atomicArgument.conclusionSetId).toBeNull();
      }
    });

    it('should convert bootstrap DTO to AtomicArgument', () => {
      // Arrange
      const dto: AtomicArgumentDTO = {
        id: 'bootstrap-id',
        premiseSetId: null,
        conclusionSetId: null,
      };

      // Act
      const result = atomicArgumentFromDTO(dto);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const atomicArgument = result.value;
        expect(atomicArgument.id.getValue()).toBe('bootstrap-id');
        expect(atomicArgument.premiseSetId).toBeNull();
        expect(atomicArgument.conclusionSetId).toBeNull();
      }
    });

    it('should convert DTO with only left side label', () => {
      // Arrange
      const dto: AtomicArgumentDTO = {
        id: 'test-id',
        premiseSetId: 'premise-set-id',
        conclusionSetId: 'conclusion-set-id',
        sideLabels: { left: 'Modus Ponens' },
      };

      // Act
      const result = atomicArgumentFromDTO(dto);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const atomicArgument = result.value;
        expect(atomicArgument.sideLabels).toEqual({ left: 'Modus Ponens' });
      }
    });

    it('should convert DTO with only right side label', () => {
      // Arrange
      const dto: AtomicArgumentDTO = {
        id: 'test-id',
        premiseSetId: 'premise-set-id',
        conclusionSetId: 'conclusion-set-id',
        sideLabels: { right: 'Theorem 5.2' },
      };

      // Act
      const result = atomicArgumentFromDTO(dto);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const atomicArgument = result.value;
        expect(atomicArgument.sideLabels).toEqual({ right: 'Theorem 5.2' });
      }
    });

    it('should convert DTO without sideLabels property', () => {
      // Arrange
      const dto: AtomicArgumentDTO = {
        id: 'test-id',
        premiseSetId: 'premise-set-id',
        conclusionSetId: 'conclusion-set-id',
      };

      // Act
      const result = atomicArgumentFromDTO(dto);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const reconstructionData = result.value;
        expect(reconstructionData.sideLabels).toEqual({});
      }
    });

    it('should return error for invalid id', () => {
      // Arrange
      const dto: AtomicArgumentDTO = {
        id: '',
        premiseSetId: 'premise-set-id',
        conclusionSetId: 'conclusion-set-id',
      };

      // Act
      const result = atomicArgumentFromDTO(dto);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('AtomicArgumentId cannot be empty');
      }
    });

    it('should return error for invalid premise set id', () => {
      // Arrange
      const dto: AtomicArgumentDTO = {
        id: 'test-id',
        premiseSetId: '',
        conclusionSetId: 'conclusion-set-id',
      };

      // Act
      const result = atomicArgumentFromDTO(dto);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('OrderedSetId cannot be empty');
      }
    });

    it('should return error for invalid conclusion set id', () => {
      // Arrange
      const dto: AtomicArgumentDTO = {
        id: 'test-id',
        premiseSetId: 'premise-set-id',
        conclusionSetId: '',
      };

      // Act
      const result = atomicArgumentFromDTO(dto);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('OrderedSetId cannot be empty');
      }
    });

    it('should return error for id that is too long', () => {
      // Arrange
      const longId = 'a'.repeat(256);
      const dto: AtomicArgumentDTO = {
        id: longId,
        premiseSetId: 'premise-set-id',
        conclusionSetId: 'conclusion-set-id',
      };

      // Act
      const result = atomicArgumentFromDTO(dto);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('AtomicArgumentId cannot exceed 255 characters');
      }
    });

    it('should return error for premise set id that is too long', () => {
      // Arrange
      const longId = 'a'.repeat(256);
      const dto: AtomicArgumentDTO = {
        id: 'test-id',
        premiseSetId: longId,
        conclusionSetId: 'conclusion-set-id',
      };

      // Act
      const result = atomicArgumentFromDTO(dto);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('OrderedSetId cannot exceed 255 characters');
      }
    });

    it('should return error for conclusion set id that is too long', () => {
      // Arrange
      const longId = 'a'.repeat(256);
      const dto: AtomicArgumentDTO = {
        id: 'test-id',
        premiseSetId: 'premise-set-id',
        conclusionSetId: longId,
      };

      // Act
      const result = atomicArgumentFromDTO(dto);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('OrderedSetId cannot exceed 255 characters');
      }
    });

    it('should handle side labels with undefined values', () => {
      // Arrange
      const dto: AtomicArgumentDTO = {
        id: 'test-id',
        premiseSetId: 'premise-set-id',
        conclusionSetId: 'conclusion-set-id',
        sideLabels: {},
      };

      // Act
      const result = atomicArgumentFromDTO(dto);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const reconstructionData = result.value;
        expect(reconstructionData.sideLabels).toEqual({});
      }
    });
  });

  describe('round-trip conversion', () => {
    it('should maintain data integrity in toDTO -> fromDTO conversion', () => {
      // Arrange
      const premiseSet = orderedSetFactory.build();
      const conclusionSet = orderedSetFactory.build();
      const sideLabels = { left: 'Rule A', right: 'Reference 1' };
      const createResult = AtomicArgument.create(
        premiseSet.getId(),
        conclusionSet.getId(),
        sideLabels,
      );
      expect(createResult.isOk()).toBe(true);
      if (!createResult.isOk()) throw createResult.error;
      const original = createResult.value;

      // Act
      const dto = atomicArgumentToDTO(original);
      const result = atomicArgumentFromDTO(dto);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const reconstructionData = result.value;
        expect(reconstructionData.id.getValue()).toBe(original.getId().getValue());
        expect(reconstructionData.premiseSetId?.getValue()).toBe(
          original.getPremiseSet()?.getValue(),
        );
        expect(reconstructionData.conclusionSetId?.getValue()).toBe(
          original.getConclusionSet()?.getValue(),
        );
        expect(reconstructionData.sideLabels).toEqual(original.getSideLabels());
      }
    });

    it('should maintain data integrity for bootstrap argument in round-trip', () => {
      // Arrange
      const original = AtomicArgument.createBootstrap();

      // Act
      const dto = atomicArgumentToDTO(original);
      const result = atomicArgumentFromDTO(dto);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const reconstructionData = result.value;
        expect(reconstructionData.id.getValue()).toBe(original.getId().getValue());
        expect(reconstructionData.premiseSetId).toBeNull();
        expect(reconstructionData.conclusionSetId).toBeNull();
        // Note: isBootstrap is determined by having both sets null
      }
    });

    it('should maintain data integrity for argument with only side labels in round-trip', () => {
      // Arrange
      const sideLabels = { left: 'Complex Rule', right: 'Page 42' };
      const createResult = AtomicArgument.create(undefined, undefined, sideLabels);
      expect(createResult.isOk()).toBe(true);
      if (!createResult.isOk()) throw createResult.error;
      const original = createResult.value;

      // Act
      const dto = atomicArgumentToDTO(original);
      const result = atomicArgumentFromDTO(dto);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const reconstructionData = result.value;
        expect(reconstructionData.sideLabels).toEqual(original.getSideLabels());
      }
    });
  });
});

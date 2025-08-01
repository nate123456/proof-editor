import { describe, expect, it } from 'vitest';
import {
  atomicArgumentFactory,
  statementFactory,
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
      const premises = [statementFactory.build(), statementFactory.build()];
      const conclusions = [statementFactory.build()];
      const sideLabels: SideLabels = { left: 'Rule A', right: 'Reference 1' };
      const createResult = AtomicArgument.create(premises, conclusions, sideLabels);
      expect(createResult.isOk()).toBe(true);
      if (!createResult.isOk()) throw createResult.error;
      const atomicArgument = createResult.value;

      // Act
      const result = atomicArgumentToDTO(atomicArgument);

      // Assert
      expect(result).toEqual({
        id: atomicArgument.getId().getValue(),
        premiseIds: premises.map((p) => p.getId().getValue()),
        conclusionIds: conclusions.map((c) => c.getId().getValue()),
        sideLabels: {
          left: 'Rule A',
          right: 'Reference 1',
        },
      });
    });

    it('should convert AtomicArgument to DTO with empty premises', () => {
      // Arrange
      const conclusions = [statementFactory.build()];
      const createResult = AtomicArgument.create([], conclusions, {});
      expect(createResult.isOk()).toBe(true);
      if (!createResult.isOk()) throw createResult.error;
      const atomicArgument = createResult.value;

      // Act
      const result = atomicArgumentToDTO(atomicArgument);

      // Assert
      expect(result).toEqual({
        id: atomicArgument.getId().getValue(),
        premiseIds: [],
        conclusionIds: conclusions.map((c) => c.getId().getValue()),
      });
    });

    it('should convert AtomicArgument to DTO with empty conclusions', () => {
      // Arrange
      const premises = [statementFactory.build()];
      const createResult = AtomicArgument.create(premises, [], {});
      expect(createResult.isOk()).toBe(true);
      if (!createResult.isOk()) throw createResult.error;
      const atomicArgument = createResult.value;

      // Act
      const result = atomicArgumentToDTO(atomicArgument);

      // Assert
      expect(result).toEqual({
        id: atomicArgument.getId().getValue(),
        premiseIds: premises.map((p) => p.getId().getValue()),
        conclusionIds: [],
      });
    });

    it('should convert bootstrap AtomicArgument to DTO with empty arrays', () => {
      // Arrange
      const bootstrapArgument = AtomicArgument.createBootstrap();

      // Act
      const result = atomicArgumentToDTO(bootstrapArgument);

      // Assert
      expect(result).toEqual({
        id: bootstrapArgument.getId().getValue(),
        premiseIds: [],
        conclusionIds: [],
      });
    });

    it('should convert AtomicArgument to DTO with only left side label', () => {
      // Arrange
      const sideLabels: SideLabels = { left: 'Modus Ponens' };
      const createResult = AtomicArgument.create([], [], sideLabels);
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
      const createResult = AtomicArgument.create([], [], sideLabels);
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
      const premises = [statementFactory.build()];
      const conclusions = [statementFactory.build()];
      const createResult = AtomicArgument.create(premises, conclusions, {});
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
      const premises = [statementFactory.build()];
      const conclusions = [statementFactory.build()];
      const sideLabels: SideLabels = { left: '', right: '' };
      const createResult = AtomicArgument.create(premises, conclusions, sideLabels);
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
          const statements = [statementFactory.build()];
          const result = AtomicArgument.create(statements, [], {
            left: 'Rule',
          });
          if (result.isErr()) throw result.error;
          return result.value;
        })(),
        (() => {
          const statements = [statementFactory.build()];
          const result = AtomicArgument.create([], statements, {
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
      expect(result[0]?.premiseIds).toEqual([]);
      expect(result[0]?.conclusionIds).toEqual([]);
      expect(result[1]?.premiseIds.length).toBeGreaterThan(0);
      expect(result[1]?.sideLabels?.left).toBe('Rule');
      expect(result[2]?.conclusionIds.length).toBeGreaterThan(0);
      expect(result[2]?.sideLabels?.right).toBe('Ref');
    });
  });

  describe('atomicArgumentFromDTO', () => {
    it('should convert valid DTO to reconstruction data', () => {
      // Arrange
      const dto: AtomicArgumentDTO = {
        id: 'test-id',
        premiseIds: ['premise-1', 'premise-2'],
        conclusionIds: ['conclusion-1'],
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
        expect(reconstructionData.premiseIds.map((id) => id.getValue())).toEqual([
          'premise-1',
          'premise-2',
        ]);
        expect(reconstructionData.conclusionIds.map((id) => id.getValue())).toEqual([
          'conclusion-1',
        ]);
        expect(reconstructionData.sideLabels).toEqual({
          left: 'Rule A',
          right: 'Reference 1',
        });
      }
    });

    it('should convert DTO with empty premises to reconstruction data', () => {
      // Arrange
      const dto: AtomicArgumentDTO = {
        id: 'test-id',
        premiseIds: [],
        conclusionIds: ['conclusion-1'],
      };

      // Act
      const result = atomicArgumentFromDTO(dto);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const reconstructionData = result.value;
        expect(reconstructionData.id.getValue()).toBe('test-id');
        expect(reconstructionData.premiseIds).toEqual([]);
        expect(reconstructionData.conclusionIds.map((id) => id.getValue())).toEqual([
          'conclusion-1',
        ]);
      }
    });

    it('should convert DTO with empty conclusions to reconstruction data', () => {
      // Arrange
      const dto: AtomicArgumentDTO = {
        id: 'test-id',
        premiseIds: ['premise-1'],
        conclusionIds: [],
      };

      // Act
      const result = atomicArgumentFromDTO(dto);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const reconstructionData = result.value;
        expect(reconstructionData.id.getValue()).toBe('test-id');
        expect(reconstructionData.premiseIds.map((id) => id.getValue())).toEqual(['premise-1']);
        expect(reconstructionData.conclusionIds).toEqual([]);
      }
    });

    it('should convert bootstrap DTO to reconstruction data', () => {
      // Arrange
      const dto: AtomicArgumentDTO = {
        id: 'bootstrap-id',
        premiseIds: [],
        conclusionIds: [],
      };

      // Act
      const result = atomicArgumentFromDTO(dto);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const reconstructionData = result.value;
        expect(reconstructionData.id.getValue()).toBe('bootstrap-id');
        expect(reconstructionData.premiseIds).toEqual([]);
        expect(reconstructionData.conclusionIds).toEqual([]);
      }
    });

    it('should convert DTO with only left side label', () => {
      // Arrange
      const dto: AtomicArgumentDTO = {
        id: 'test-id',
        premiseIds: ['premise-1'],
        conclusionIds: ['conclusion-1'],
        sideLabels: { left: 'Modus Ponens' },
      };

      // Act
      const result = atomicArgumentFromDTO(dto);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const reconstructionData = result.value;
        expect(reconstructionData.sideLabels).toEqual({ left: 'Modus Ponens' });
      }
    });

    it('should convert DTO with only right side label', () => {
      // Arrange
      const dto: AtomicArgumentDTO = {
        id: 'test-id',
        premiseIds: ['premise-1'],
        conclusionIds: ['conclusion-1'],
        sideLabels: { right: 'Theorem 5.2' },
      };

      // Act
      const result = atomicArgumentFromDTO(dto);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const reconstructionData = result.value;
        expect(reconstructionData.sideLabels).toEqual({ right: 'Theorem 5.2' });
      }
    });

    it('should convert DTO without sideLabels property', () => {
      // Arrange
      const dto: AtomicArgumentDTO = {
        id: 'test-id',
        premiseIds: ['premise-1'],
        conclusionIds: ['conclusion-1'],
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
        premiseIds: ['premise-1'],
        conclusionIds: ['conclusion-1'],
      };

      // Act
      const result = atomicArgumentFromDTO(dto);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('AtomicArgumentId cannot be empty');
      }
    });

    it('should return error for invalid premise statement id', () => {
      // Arrange
      const dto: AtomicArgumentDTO = {
        id: 'test-id',
        premiseIds: [''],
        conclusionIds: ['conclusion-1'],
      };

      // Act
      const result = atomicArgumentFromDTO(dto);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('StatementId cannot be empty');
      }
    });

    it('should return error for invalid conclusion statement id', () => {
      // Arrange
      const dto: AtomicArgumentDTO = {
        id: 'test-id',
        premiseIds: ['premise-1'],
        conclusionIds: [''],
      };

      // Act
      const result = atomicArgumentFromDTO(dto);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('StatementId cannot be empty');
      }
    });

    it('should return error for id that is too long', () => {
      // Arrange
      const longId = 'a'.repeat(256);
      const dto: AtomicArgumentDTO = {
        id: longId,
        premiseIds: ['premise-1'],
        conclusionIds: ['conclusion-1'],
      };

      // Act
      const result = atomicArgumentFromDTO(dto);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('AtomicArgumentId cannot exceed 255 characters');
      }
    });

    it('should return error for premise statement id that is too long', () => {
      // Arrange
      const longId = 'a'.repeat(256);
      const dto: AtomicArgumentDTO = {
        id: 'test-id',
        premiseIds: [longId],
        conclusionIds: ['conclusion-1'],
      };

      // Act
      const result = atomicArgumentFromDTO(dto);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('StatementId cannot exceed 255 characters');
      }
    });

    it('should return error for conclusion statement id that is too long', () => {
      // Arrange
      const longId = 'a'.repeat(256);
      const dto: AtomicArgumentDTO = {
        id: 'test-id',
        premiseIds: ['premise-1'],
        conclusionIds: [longId],
      };

      // Act
      const result = atomicArgumentFromDTO(dto);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('StatementId cannot exceed 255 characters');
      }
    });

    it('should handle side labels with undefined values', () => {
      // Arrange
      const dto: AtomicArgumentDTO = {
        id: 'test-id',
        premiseIds: ['premise-1'],
        conclusionIds: ['conclusion-1'],
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
      const premises = [statementFactory.build(), statementFactory.build()];
      const conclusions = [statementFactory.build()];
      const sideLabels = { left: 'Rule A', right: 'Reference 1' };
      const createResult = AtomicArgument.create(premises, conclusions, sideLabels);
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
        expect(reconstructionData.premiseIds.map((id) => id.getValue())).toEqual(
          premises.map((p) => p.getId().getValue()),
        );
        expect(reconstructionData.conclusionIds.map((id) => id.getValue())).toEqual(
          conclusions.map((c) => c.getId().getValue()),
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
        expect(reconstructionData.premiseIds).toEqual([]);
        expect(reconstructionData.conclusionIds).toEqual([]);
        // Note: isBootstrap is determined by having both sets null
      }
    });

    it('should maintain data integrity for argument with only side labels in round-trip', () => {
      // Arrange
      const sideLabels = { left: 'Complex Rule', right: 'Page 42' };
      const createResult = AtomicArgument.create([], [], sideLabels);
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

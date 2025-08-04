import { describe, expect, it } from 'vitest';
import {
  atomicArgumentFactory,
  statementFactory,
} from '../../../domain/__tests__/factories/index.js';
import { AtomicArgument, SideLabels } from '../../../domain/entities/AtomicArgument.js';
import {
  AtomicArgumentId,
  SideLabel,
  StatementId,
} from '../../../domain/shared/value-objects/index.js';
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
      const sideLabelsResult = SideLabels.fromStrings({ left: 'Rule A', right: 'Reference 1' });
      expect(sideLabelsResult.isOk()).toBe(true);
      if (!sideLabelsResult.isOk()) throw sideLabelsResult.error;
      const sideLabels = sideLabelsResult.value;
      const createResult = AtomicArgument.create(premises, conclusions, sideLabels);
      expect(createResult.isOk()).toBe(true);
      if (!createResult.isOk()) throw createResult.error;
      const atomicArgument = createResult.value;

      // Act
      const result = atomicArgumentToDTO(atomicArgument);

      // Assert
      expect(result.id).toBe(atomicArgument.getId());
      expect(result.premiseIds).toEqual(premises.map((p) => p.getId()));
      expect(result.conclusionIds).toEqual(conclusions.map((c) => c.getId()));
      expect(result.sideLabels).toBeDefined();
      expect(result.sideLabels?.left?.getValue()).toBe('Rule A');
      expect(result.sideLabels?.right?.getValue()).toBe('Reference 1');
    });

    it('should convert AtomicArgument to DTO with empty premises', () => {
      // Arrange
      const conclusions = [statementFactory.build()];
      const createResult = AtomicArgument.create([], conclusions, SideLabels.empty());
      expect(createResult.isOk()).toBe(true);
      if (!createResult.isOk()) throw createResult.error;
      const atomicArgument = createResult.value;

      // Act
      const result = atomicArgumentToDTO(atomicArgument);

      // Assert
      expect(result.id).toBe(atomicArgument.getId());
      expect(result.premiseIds).toEqual([]);
      expect(result.conclusionIds).toEqual(conclusions.map((c) => c.getId()));
      expect(result.sideLabels).toBeUndefined();
    });

    it('should convert AtomicArgument to DTO with empty conclusions', () => {
      // Arrange
      const premises = [statementFactory.build()];
      const createResult = AtomicArgument.create(premises, [], SideLabels.empty());
      expect(createResult.isOk()).toBe(true);
      if (!createResult.isOk()) throw createResult.error;
      const atomicArgument = createResult.value;

      // Act
      const result = atomicArgumentToDTO(atomicArgument);

      // Assert
      expect(result.id).toBe(atomicArgument.getId());
      expect(result.premiseIds).toEqual(premises.map((p) => p.getId()));
      expect(result.conclusionIds).toEqual([]);
      expect(result.sideLabels).toBeUndefined();
    });

    it('should convert bootstrap AtomicArgument to DTO with empty arrays', () => {
      // Arrange
      const bootstrapArgument = AtomicArgument.createBootstrap();

      // Act
      const result = atomicArgumentToDTO(bootstrapArgument);

      // Assert
      expect(result.id).toBe(bootstrapArgument.getId());
      expect(result.premiseIds).toEqual([]);
      expect(result.conclusionIds).toEqual([]);
      expect(result.sideLabels).toBeUndefined();
    });

    it('should convert AtomicArgument to DTO with only left side label', () => {
      // Arrange
      const sideLabelsResult = SideLabels.fromStrings({ left: 'Modus Ponens' });
      expect(sideLabelsResult.isOk()).toBe(true);
      if (!sideLabelsResult.isOk()) throw sideLabelsResult.error;
      const sideLabels = sideLabelsResult.value;
      const createResult = AtomicArgument.create([], [], sideLabels);
      expect(createResult.isOk()).toBe(true);
      if (!createResult.isOk()) throw createResult.error;
      const atomicArgument = createResult.value;

      // Act
      const result = atomicArgumentToDTO(atomicArgument);

      // Assert
      expect(result.sideLabels?.left?.getValue()).toBe('Modus Ponens');
      expect(result.sideLabels?.right).toBeUndefined();
    });

    it('should convert AtomicArgument to DTO with only right side label', () => {
      // Arrange
      const sideLabelsResult = SideLabels.fromStrings({ right: 'Theorem 5.2' });
      expect(sideLabelsResult.isOk()).toBe(true);
      if (!sideLabelsResult.isOk()) throw sideLabelsResult.error;
      const sideLabels = sideLabelsResult.value;
      const createResult = AtomicArgument.create([], [], sideLabels);
      expect(createResult.isOk()).toBe(true);
      if (!createResult.isOk()) throw createResult.error;
      const atomicArgument = createResult.value;

      // Act
      const result = atomicArgumentToDTO(atomicArgument);

      // Assert
      expect(result.sideLabels?.right?.getValue()).toBe('Theorem 5.2');
      expect(result.sideLabels?.left).toBeUndefined();
    });

    it('should convert AtomicArgument to DTO without sideLabels property when no labels', () => {
      // Arrange
      const premises = [statementFactory.build()];
      const conclusions = [statementFactory.build()];
      const createResult = AtomicArgument.create(premises, conclusions, SideLabels.empty());
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
      const sideLabelsResult = SideLabels.fromStrings({ left: '', right: '' });
      // Note: empty strings will fail validation for SideLabel
      expect(sideLabelsResult.isErr()).toBe(true);
      const createResult = AtomicArgument.create(premises, conclusions, SideLabels.empty());
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
          const sideLabelsResult = SideLabels.fromStrings({ left: 'Rule' });
          if (sideLabelsResult.isErr()) throw sideLabelsResult.error;
          const result = AtomicArgument.create(statements, [], sideLabelsResult.value);
          if (result.isErr()) throw result.error;
          return result.value;
        })(),
        (() => {
          const statements = [statementFactory.build()];
          const sideLabelsResult = SideLabels.fromStrings({ right: 'Ref' });
          if (sideLabelsResult.isErr()) throw sideLabelsResult.error;
          const result = AtomicArgument.create([], statements, sideLabelsResult.value);
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
      expect(result[1]?.sideLabels?.left?.getValue()).toBe('Rule');
      expect(result[2]?.conclusionIds.length).toBeGreaterThan(0);
      expect(result[2]?.sideLabels?.right?.getValue()).toBe('Ref');
    });
  });

  describe('atomicArgumentFromDTO', () => {
    it('should convert valid DTO to reconstruction data', () => {
      // Arrange
      const idResult = AtomicArgumentId.fromString('test-id');
      const premise1Result = StatementId.fromString('premise-1');
      const premise2Result = StatementId.fromString('premise-2');
      const conclusion1Result = StatementId.fromString('conclusion-1');
      const leftLabelResult = SideLabel.create('Rule A');
      const rightLabelResult = SideLabel.create('Reference 1');

      expect(idResult.isOk()).toBe(true);
      expect(premise1Result.isOk()).toBe(true);
      expect(premise2Result.isOk()).toBe(true);
      expect(conclusion1Result.isOk()).toBe(true);
      expect(leftLabelResult.isOk()).toBe(true);
      expect(rightLabelResult.isOk()).toBe(true);

      if (
        idResult.isErr() ||
        premise1Result.isErr() ||
        premise2Result.isErr() ||
        conclusion1Result.isErr() ||
        leftLabelResult.isErr() ||
        rightLabelResult.isErr()
      )
        return;

      const dto: AtomicArgumentDTO = {
        id: idResult.value,
        premiseIds: [premise1Result.value, premise2Result.value],
        conclusionIds: [conclusion1Result.value],
        sideLabels: {
          left: leftLabelResult.value,
          right: rightLabelResult.value,
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
      const idResult = AtomicArgumentId.fromString('test-id');
      const conclusion1Result = StatementId.fromString('conclusion-1');

      expect(idResult.isOk()).toBe(true);
      expect(conclusion1Result.isOk()).toBe(true);

      if (idResult.isErr() || conclusion1Result.isErr()) return;

      const dto: AtomicArgumentDTO = {
        id: idResult.value,
        premiseIds: [],
        conclusionIds: [conclusion1Result.value],
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
      const idResult = AtomicArgumentId.fromString('test-id');
      const premise1Result = StatementId.fromString('premise-1');

      expect(idResult.isOk()).toBe(true);
      expect(premise1Result.isOk()).toBe(true);

      if (idResult.isErr() || premise1Result.isErr()) return;

      const dto: AtomicArgumentDTO = {
        id: idResult.value,
        premiseIds: [premise1Result.value],
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
      const idResult = AtomicArgumentId.fromString('bootstrap-id');
      expect(idResult.isOk()).toBe(true);
      if (idResult.isErr()) return;

      const dto: AtomicArgumentDTO = {
        id: idResult.value,
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
      const idResult = AtomicArgumentId.fromString('test-id');
      const premise1Result = StatementId.fromString('premise-1');
      const conclusion1Result = StatementId.fromString('conclusion-1');
      const leftLabelResult = SideLabel.create('Modus Ponens');

      expect(idResult.isOk()).toBe(true);
      expect(premise1Result.isOk()).toBe(true);
      expect(conclusion1Result.isOk()).toBe(true);
      expect(leftLabelResult.isOk()).toBe(true);

      if (
        idResult.isErr() ||
        premise1Result.isErr() ||
        conclusion1Result.isErr() ||
        leftLabelResult.isErr()
      )
        return;

      const dto: AtomicArgumentDTO = {
        id: idResult.value,
        premiseIds: [premise1Result.value],
        conclusionIds: [conclusion1Result.value],
        sideLabels: { left: leftLabelResult.value },
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
      const idResult = AtomicArgumentId.fromString('test-id');
      const premise1Result = StatementId.fromString('premise-1');
      const conclusion1Result = StatementId.fromString('conclusion-1');
      const rightLabelResult = SideLabel.create('Theorem 5.2');

      expect(idResult.isOk()).toBe(true);
      expect(premise1Result.isOk()).toBe(true);
      expect(conclusion1Result.isOk()).toBe(true);
      expect(rightLabelResult.isOk()).toBe(true);

      if (
        idResult.isErr() ||
        premise1Result.isErr() ||
        conclusion1Result.isErr() ||
        rightLabelResult.isErr()
      )
        return;

      const dto: AtomicArgumentDTO = {
        id: idResult.value,
        premiseIds: [premise1Result.value],
        conclusionIds: [conclusion1Result.value],
        sideLabels: { right: rightLabelResult.value },
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
      const idResult = AtomicArgumentId.fromString('test-id');
      const premise1Result = StatementId.fromString('premise-1');
      const conclusion1Result = StatementId.fromString('conclusion-1');

      expect(idResult.isOk()).toBe(true);
      expect(premise1Result.isOk()).toBe(true);
      expect(conclusion1Result.isOk()).toBe(true);

      if (idResult.isErr() || premise1Result.isErr() || conclusion1Result.isErr()) return;

      const dto: AtomicArgumentDTO = {
        id: idResult.value,
        premiseIds: [premise1Result.value],
        conclusionIds: [conclusion1Result.value],
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

    // Note: atomicArgumentFromDTO currently doesn't validate inputs
    // These tests are commented out as the function doesn't return validation errors
    // TODO: Consider adding validation to atomicArgumentFromDTO
    /*
    it('should return error for invalid id', () => {
      // This test is not applicable as atomicArgumentFromDTO doesn't validate
    });
    */

    /*
    it('should return error for invalid premise statement id', () => {
      // This test is not applicable as atomicArgumentFromDTO doesn't validate
    });
    */

    /*
    it('should return error for invalid conclusion statement id', () => {
      // This test is not applicable as atomicArgumentFromDTO doesn't validate
    });
    */

    /*
    it('should return error for id that is too long', () => {
      // This test is not applicable as atomicArgumentFromDTO doesn't validate
    });
    */

    /*
    it('should return error for premise statement id that is too long', () => {
      // This test is not applicable as atomicArgumentFromDTO doesn't validate
    });
    */

    /*
    it('should return error for conclusion statement id that is too long', () => {
      // This test is not applicable as atomicArgumentFromDTO doesn't validate
    });
    */

    it('should handle side labels with undefined values', () => {
      // Arrange
      const idResult = AtomicArgumentId.fromString('test-id');
      const premise1Result = StatementId.fromString('premise-1');
      const conclusion1Result = StatementId.fromString('conclusion-1');

      expect(idResult.isOk()).toBe(true);
      expect(premise1Result.isOk()).toBe(true);
      expect(conclusion1Result.isOk()).toBe(true);

      if (idResult.isErr() || premise1Result.isErr() || conclusion1Result.isErr()) return;

      const dto: AtomicArgumentDTO = {
        id: idResult.value,
        premiseIds: [premise1Result.value],
        conclusionIds: [conclusion1Result.value],
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
      const sideLabelsResult = SideLabels.fromStrings({ left: 'Rule A', right: 'Reference 1' });
      expect(sideLabelsResult.isOk()).toBe(true);
      if (!sideLabelsResult.isOk()) throw sideLabelsResult.error;
      const sideLabels = sideLabelsResult.value;
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
      const sideLabelsResult = SideLabels.fromStrings({ left: 'Complex Rule', right: 'Page 42' });
      expect(sideLabelsResult.isOk()).toBe(true);
      if (!sideLabelsResult.isOk()) throw sideLabelsResult.error;
      const sideLabels = sideLabelsResult.value;
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

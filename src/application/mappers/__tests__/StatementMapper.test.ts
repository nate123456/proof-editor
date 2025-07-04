/**
 * Comprehensive test suite for StatementMapper
 *
 * Priority: CRITICAL - Tier 1 High ROI pure functions
 * Current coverage: 0% → Target: 95%+
 * Tests both toDTO() and fromDTO() functions with edge cases
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { statementFactory, statementIdFactory } from '../../../domain/__tests__/factories/index.js';
import { Statement } from '../../../domain/entities/Statement.js';
import { ValidationError } from '../../../domain/shared/result.js';
import type { StatementDTO } from '../../queries/statement-queries.js';
import {
  statementsToDomains,
  statementsToDTOs,
  statementToDomain,
  statementToDTO,
} from '../StatementMapper.js';

describe('StatementMapper', () => {
  describe('statementToDTO', () => {
    it('should convert valid Statement to StatementDTO', () => {
      const statement = statementFactory.build();
      const dto = statementToDTO(statement);

      expect(dto).toBeDefined();
      expect(dto.id).toBe(statement.getId().getValue());
      expect(dto.content).toBe(statement.getContent());
      expect(dto.usageCount).toBe(statement.getUsageCount());
      expect(dto.createdAt).toBe(new Date(statement.getCreatedAt()).toISOString());
      expect(dto.modifiedAt).toBe(new Date(statement.getModifiedAt()).toISOString());
    });

    it('should handle timestamps correctly', () => {
      const _now = Date.now();
      const statement = statementFactory.build();
      const dto = statementToDTO(statement);

      // Verify timestamps are valid ISO strings
      expect(() => new Date(dto.createdAt)).not.toThrow();
      expect(() => new Date(dto.modifiedAt)).not.toThrow();

      // Verify they can be parsed back
      expect(new Date(dto.createdAt).getTime()).toBe(statement.getCreatedAt());
      expect(new Date(dto.modifiedAt).getTime()).toBe(statement.getModifiedAt());
    });

    it('should handle statement with different content types', () => {
      const testCases = [
        'Simple statement',
        'Statement with symbols: →∀∃⊃⊂∧∨¬',
        'Multi-line\nstatement\nwith\nbreaks',
        'Statement with "quotes" and \'apostrophes\'',
        'Statement with numbers: 123, 456.789',
        'Statement with Unicode: 🎯 α β γ δ',
        'Statement with special chars: @#$%^&*()_+{}|:<>?',
        'Very long statement that exceeds typical length expectations and contains lots of text to test boundary conditions and ensure proper handling of extended content',
      ];

      testCases.forEach((content) => {
        const statementResult = Statement.create(content);
        expect(statementResult.isOk()).toBe(true);

        if (statementResult.isOk()) {
          const statement = statementResult.value;
          const dto = statementToDTO(statement);

          expect(dto.content).toBe(content);
          expect(dto.id).toBe(statement.getId().getValue());
          expect(dto.usageCount).toBe(0); // New statements have 0 usage
        }
      });
    });

    it('should handle statements with different usage counts', () => {
      const statement = statementFactory.build();

      // Test with 0 usage (default)
      let dto = statementToDTO(statement);
      expect(dto.usageCount).toBe(0);

      // Test with incremented usage
      statement.incrementUsage();
      dto = statementToDTO(statement);
      expect(dto.usageCount).toBe(1);

      // Test with multiple increments
      statement.incrementUsage();
      statement.incrementUsage();
      dto = statementToDTO(statement);
      expect(dto.usageCount).toBe(3);
    });

    it('should produce consistent results for same statement', () => {
      const statement = statementFactory.build();
      const dto1 = statementToDTO(statement);
      const dto2 = statementToDTO(statement);

      expect(dto1).toEqual(dto2);
    });
  });

  describe('statementToDomain', () => {
    it('should convert valid StatementDTO to Statement', () => {
      const originalStatement = statementFactory.build();
      const dto = statementToDTO(originalStatement);

      const result = statementToDomain(dto);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const reconstituted = result.value;
        expect(reconstituted.getId().getValue()).toBe(originalStatement.getId().getValue());
        expect(reconstituted.getContent()).toBe(originalStatement.getContent());
        expect(reconstituted.getUsageCount()).toBe(originalStatement.getUsageCount());
        expect(reconstituted.getCreatedAt()).toBe(originalStatement.getCreatedAt());
        expect(reconstituted.getModifiedAt()).toBe(originalStatement.getModifiedAt());
      }
    });

    it('should handle valid timestamps in different formats', () => {
      const validTimestamps = [
        '2023-01-01T00:00:00.000Z',
        '2023-12-31T23:59:59.999Z',
        '2023-06-15T12:30:45.123Z',
        new Date(0).toISOString(), // Unix epoch
        new Date(Date.now()).toISOString(), // Current time
      ];

      validTimestamps.forEach((timestamp) => {
        const dto: StatementDTO = {
          id: statementIdFactory.build().getValue(),
          content: 'Test statement',
          usageCount: 0,
          createdAt: timestamp,
          modifiedAt: timestamp,
        };

        const result = statementToDomain(dto);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const statement = result.value;
          expect(statement.getCreatedAt()).toBe(new Date(timestamp).getTime());
          expect(statement.getModifiedAt()).toBe(new Date(timestamp).getTime());
        }
      });
    });

    it('should reject invalid StatementId', () => {
      const invalidIds = ['', '   ', 'a'.repeat(256)];

      invalidIds.forEach((invalidId) => {
        const dto: StatementDTO = {
          id: invalidId,
          content: 'Test statement',
          usageCount: 0,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
        };

        const result = statementToDomain(dto);
        expect(result.isErr()).toBe(true);

        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toMatch(/cannot be empty|cannot exceed/i);
        }
      });
    });

    it('should reject invalid createdAt timestamps', () => {
      const invalidTimestamps = ['invalid-date', 'not-a-date', '', 'NaN', 'null', 'undefined'];

      invalidTimestamps.forEach((invalidTimestamp) => {
        const dto: StatementDTO = {
          id: statementIdFactory.build().getValue(),
          content: 'Test statement',
          usageCount: 0,
          createdAt: invalidTimestamp,
          modifiedAt: new Date().toISOString(),
        };

        const result = statementToDomain(dto);
        expect(result.isErr()).toBe(true);

        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('Invalid createdAt timestamp');
        }
      });
    });

    it('should reject invalid modifiedAt timestamps', () => {
      const invalidTimestamps = ['invalid-date', 'not-a-date', '', 'NaN', 'null', 'undefined'];

      invalidTimestamps.forEach((invalidTimestamp) => {
        const dto: StatementDTO = {
          id: statementIdFactory.build().getValue(),
          content: 'Test statement',
          usageCount: 0,
          createdAt: new Date().toISOString(),
          modifiedAt: invalidTimestamp,
        };

        const result = statementToDomain(dto);
        expect(result.isErr()).toBe(true);

        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('Invalid modifiedAt timestamp');
        }
      });
    });

    it('should handle edge case timestamp values', () => {
      const edgeCases = [
        new Date(0).toISOString(), // Unix epoch
        new Date(1).toISOString(), // Very early timestamp
        new Date(Date.now()).toISOString(), // Current time
      ];

      edgeCases.forEach((timestamp) => {
        const dto: StatementDTO = {
          id: statementIdFactory.build().getValue(),
          content: 'Test statement',
          usageCount: 0,
          createdAt: timestamp,
          modifiedAt: timestamp,
        };

        const result = statementToDomain(dto);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const statement = result.value;
          expect(statement.getCreatedAt()).toBe(new Date(timestamp).getTime());
          expect(statement.getModifiedAt()).toBe(new Date(timestamp).getTime());
        }
      });
    });

    it('should validate statement content through reconstruction', () => {
      const invalidContent = ['', '   ', 'a'.repeat(10001)];

      invalidContent.forEach((content) => {
        const dto: StatementDTO = {
          id: statementIdFactory.build().getValue(),
          content,
          usageCount: 0,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
        };

        const result = statementToDomain(dto);
        expect(result.isErr()).toBe(true);

        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
        }
      });
    });

    it('should reject negative usage counts', () => {
      const dto: StatementDTO = {
        id: statementIdFactory.build().getValue(),
        content: 'Test statement',
        usageCount: -1,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
      };

      const result = statementToDomain(dto);
      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Usage count cannot be negative');
      }
    });

    it('should handle various valid usage counts', () => {
      const validUsageCounts = [0, 1, 5, 100, 1000, Number.MAX_SAFE_INTEGER];

      validUsageCounts.forEach((usageCount) => {
        const dto: StatementDTO = {
          id: statementIdFactory.build().getValue(),
          content: 'Test statement',
          usageCount,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
        };

        const result = statementToDomain(dto);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const statement = result.value;
          expect(statement.getUsageCount()).toBe(usageCount);
        }
      });
    });
  });

  describe('statementsToDTOs', () => {
    it('should convert empty array', () => {
      const result = statementsToDTOs([]);
      expect(result).toEqual([]);
    });

    it('should convert single statement', () => {
      const statement = statementFactory.build();
      const result = statementsToDTOs([statement]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(statementToDTO(statement));
    });

    it('should convert multiple statements', () => {
      const statements = [
        statementFactory.build(),
        statementFactory.build(),
        statementFactory.build(),
      ];

      const result = statementsToDTOs(statements);

      expect(result).toHaveLength(3);
      result.forEach((dto, index) => {
        const statement = statements[index];
        expect(statement).toBeDefined();
        if (statement) {
          expect(dto).toEqual(statementToDTO(statement));
        }
      });
    });

    it('should maintain order of statements', () => {
      const statements = Array.from({ length: 10 }, () => statementFactory.build());
      const result = statementsToDTOs(statements);

      expect(result).toHaveLength(10);
      result.forEach((dto, index) => {
        const statement = statements[index];
        expect(statement).toBeDefined();
        expect(dto.id).toBe(statement?.getId().getValue());
      });
    });
  });

  describe('statementsToDomains', () => {
    it('should convert empty array', () => {
      const result = statementsToDomains([]);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value).toEqual([]);
      }
    });

    it('should convert single valid DTO', () => {
      const original = statementFactory.build();
      const dto = statementToDTO(original);

      const result = statementsToDomains([dto]);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        const statement = result.value[0];
        expect(statement).toBeDefined();
        expect(statement?.getId().getValue()).toBe(original.getId().getValue());
      }
    });

    it('should convert multiple valid DTOs', () => {
      const originals = [
        statementFactory.build(),
        statementFactory.build(),
        statementFactory.build(),
      ];
      const dtos = statementsToDTOs(originals);

      const result = statementsToDomains(dtos);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value).toHaveLength(3);
        result.value.forEach((statement, index) => {
          const original = originals[index];
          expect(original).toBeDefined();
          expect(statement.getId().getValue()).toBe(original?.getId().getValue());
        });
      }
    });

    it('should fail fast on first invalid DTO', () => {
      const validDto: StatementDTO = {
        id: statementIdFactory.build().getValue(),
        content: 'Valid statement',
        usageCount: 0,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
      };

      const invalidDto: StatementDTO = {
        id: '', // Invalid ID
        content: 'Invalid statement',
        usageCount: 0,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
      };

      const result = statementsToDomains([validDto, invalidDto]);
      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toMatch(/cannot be empty/i);
      }
    });

    it('should maintain order of successful conversions', () => {
      const originals = Array.from({ length: 5 }, () => statementFactory.build());
      const dtos = statementsToDTOs(originals);

      const result = statementsToDomains(dtos);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value).toHaveLength(5);
        result.value.forEach((statement, index) => {
          const original = originals[index];
          expect(original).toBeDefined();
          expect(statement.getId().getValue()).toBe(original?.getId().getValue());
        });
      }
    });
  });

  describe('round-trip conversion', () => {
    it('should maintain statement identity through round-trip', () => {
      const original = statementFactory.build();
      const dto = statementToDTO(original);
      const result = statementToDomain(dto);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const reconstituted = result.value;

        // Verify all properties are preserved
        expect(reconstituted.getId().getValue()).toBe(original.getId().getValue());
        expect(reconstituted.getContent()).toBe(original.getContent());
        expect(reconstituted.getUsageCount()).toBe(original.getUsageCount());
        expect(reconstituted.getCreatedAt()).toBe(original.getCreatedAt());
        expect(reconstituted.getModifiedAt()).toBe(original.getModifiedAt());
      }
    });

    it('should handle round-trip with modified statements', () => {
      const original = statementFactory.build();

      // Modify the statement
      original.incrementUsage();
      original.incrementUsage();
      const updateResult = original.updateContent('Updated content');
      expect(updateResult.isOk()).toBe(true);

      // Round-trip conversion
      const dto = statementToDTO(original);
      const result = statementToDomain(dto);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const reconstituted = result.value;
        expect(reconstituted.getUsageCount()).toBe(2);
        expect(reconstituted.getContent()).toBe('Updated content');
      }
    });
  });

  describe('property-based testing', () => {
    it('should handle arbitrary valid statement content', () => {
      const validContentArbitrary = fc
        .string({ minLength: 1, maxLength: 1000 })
        .filter((s) => s.trim().length > 0);

      fc.assert(
        fc.property(validContentArbitrary, (content) => {
          const statementResult = Statement.create(content);
          expect(statementResult.isOk()).toBe(true);

          if (statementResult.isOk()) {
            const statement = statementResult.value;
            const dto = statementToDTO(statement);

            // Verify DTO structure - note that content gets trimmed during Statement creation
            const trimmedContent = content.trim();
            expect(dto.content).toBe(trimmedContent);
            expect(dto.id).toBe(statement.getId().getValue());
            expect(dto.usageCount).toBe(0);
            expect(dto.createdAt).toBe(new Date(statement.getCreatedAt()).toISOString());
            expect(dto.modifiedAt).toBe(new Date(statement.getModifiedAt()).toISOString());

            // Verify round-trip works
            const reconstitutedResult = statementToDomain(dto);
            expect(reconstitutedResult.isOk()).toBe(true);

            if (reconstitutedResult.isOk()) {
              const reconstituted = reconstitutedResult.value;
              expect(reconstituted.getContent()).toBe(trimmedContent);
            }
          }
        }),
      );
    });

    it('should handle arbitrary usage counts', () => {
      fc.assert(
        fc.property(fc.nat({ max: 10000 }), (usageCount) => {
          const dto: StatementDTO = {
            id: statementIdFactory.build().getValue(),
            content: 'Test statement',
            usageCount,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
          };

          const result = statementToDomain(dto);
          expect(result.isOk()).toBe(true);

          if (result.isOk()) {
            const statement = result.value;
            expect(statement.getUsageCount()).toBe(usageCount);
          }
        }),
      );
    });

    it('should handle arbitrary valid timestamps', () => {
      fc.assert(
        fc.property(fc.nat({ max: Date.now() * 2 }), (timestamp) => {
          const isoString = new Date(timestamp).toISOString();
          const dto: StatementDTO = {
            id: statementIdFactory.build().getValue(),
            content: 'Test statement',
            usageCount: 0,
            createdAt: isoString,
            modifiedAt: isoString,
          };

          const result = statementToDomain(dto);
          expect(result.isOk()).toBe(true);

          if (result.isOk()) {
            const statement = result.value;
            expect(statement.getCreatedAt()).toBe(timestamp);
            expect(statement.getModifiedAt()).toBe(timestamp);
          }
        }),
      );
    });
  });

  describe('error propagation', () => {
    it('should propagate StatementId creation errors', () => {
      const dto: StatementDTO = {
        id: '', // This will cause StatementId.create to fail
        content: 'Valid content',
        usageCount: 0,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
      };

      const result = statementToDomain(dto);
      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        // Error should come from StatementId.create
        expect(result.error.message).toMatch(/cannot be empty/i);
      }
    });

    it('should propagate Statement.reconstruct errors', () => {
      const dto: StatementDTO = {
        id: statementIdFactory.build().getValue(),
        content: '', // This will cause Statement.reconstruct to fail
        usageCount: 0,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
      };

      const result = statementToDomain(dto);
      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        // Error should come from StatementContent validation
        expect(result.error.message).toMatch(/cannot be empty/i);
      }
    });
  });
});

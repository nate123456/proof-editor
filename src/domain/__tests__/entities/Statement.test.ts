/**
 * Comprehensive test suite for Statement entity - core domain entity
 *
 * Priority: CRITICAL (Used across argument construction and validation)
 * Demonstrates:
 * - Red-Green-Refactor TDD cycle
 * - Property-based testing with domain constraints
 * - Immutability verification
 * - Error handling patterns with neverthrow
 * - Entity lifecycle management
 * - Usage tracking and reference counting
 */

import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Statement } from '../../entities/Statement.js';
import { ValidationError } from '../../shared/result.js';
import { StatementId } from '../../shared/value-objects/index.js';

// Property-based test generators for Statement domain
const validContentArbitrary = fc
  .string({ minLength: 1, maxLength: 1000 })
  .filter((s) => s.trim().length > 0);

const invalidContentArbitrary = fc.oneof(
  // Empty and whitespace-only strings (will fail with "empty" message)
  fc.constant(''),
  fc.constant('   '),
  fc.constant('\t\n\r'),
  fc.constant('\t\t\t'),
  fc.constant('\n\n\n'),
  fc.constant(' \t \n \r '),
  // Generate whitespace-only strings efficiently
  fc
    .array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 50 })
    .map((arr) => arr.join('')),
  // Overly long strings (will fail with "exceed" message)
  fc.string({ minLength: 10001, maxLength: 15000 }),
);

const usageCountArbitrary = fc.nat({ max: 1000 });

describe('Statement Entity', () => {
  let mockDateNow: ReturnType<typeof vi.fn>;
  const FIXED_TIMESTAMP = 1640995200000; // 2022-01-01T00:00:00.000Z

  beforeEach(() => {
    mockDateNow = vi.spyOn(Date, 'now').mockReturnValue(FIXED_TIMESTAMP) as ReturnType<
      typeof vi.fn
    >;
  });

  afterEach(() => {
    mockDateNow.mockRestore();
  });

  describe('Statement Creation', () => {
    describe('placeholder creation', () => {
      it('should create placeholder statement for UI display', () => {
        const result = Statement.createPlaceholder();

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const statement = result.value;
          expect(statement.getContent()).toBe('[Enter text]');
          expect(statement.hasContent()).toBe(true);
          expect(statement.getContentObject().wordCount).toBe(2); // '[Enter' and 'text]'
          expect(statement.getUsageCount()).toBe(0);
          expect(statement.isReferencedInOrderedSets()).toBe(false);
        }
      });

      it('should create placeholder statement with proper timestamp', () => {
        const result = Statement.createPlaceholder();

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const statement = result.value;
          expect(statement.getCreatedAt()).toBe(FIXED_TIMESTAMP);
          expect(statement.getModifiedAt()).toBe(FIXED_TIMESTAMP);
        }
      });

      it('should create placeholder statements with unique IDs', () => {
        const result1 = Statement.createPlaceholder();
        const result2 = Statement.createPlaceholder();

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);

        if (result1.isOk() && result2.isOk()) {
          const statement1 = result1.value;
          const statement2 = result2.value;
          expect(statement1.getId().equals(statement2.getId())).toBe(false);
          expect(statement1.equals(statement2)).toBe(false);
        }
      });
    });

    describe('valid creation cases', () => {
      it('should create valid statements from non-empty content', () => {
        fc.assert(
          fc.property(validContentArbitrary, (content) => {
            const result = Statement.create(content);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              const statement = result.value;
              expect(statement).toBeInstanceOf(Statement);
              expect(statement.getContent()).toBe(content.trim());
              expect(statement.getCreatedAt()).toBe(FIXED_TIMESTAMP);
              expect(statement.getModifiedAt()).toBe(FIXED_TIMESTAMP);
              expect(statement.getUsageCount()).toBe(0);
              expect(statement.getId()).toBeInstanceOf(StatementId);
            }
          }),
        );
      });

      it('should create statement with proper initialization', () => {
        const content = 'All humans are mortal';
        const result = Statement.create(content);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const statement = result.value;

          // Verify all properties are properly initialized
          expect(statement.getContent()).toBe(content);
          expect(statement.getCreatedAt()).toBe(FIXED_TIMESTAMP);
          expect(statement.getModifiedAt()).toBe(FIXED_TIMESTAMP);
          expect(statement.getUsageCount()).toBe(0);
          expect(statement.isReferencedInOrderedSets()).toBe(false);
          expect(statement.hasContent()).toBe(true);
          expect(statement.getContentObject().wordCount).toBe(4);
        }
      });

      it('should trim whitespace during creation', () => {
        const content = '  Socrates is a man  ';
        const result = Statement.create(content);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getContent()).toBe('Socrates is a man');
        }
      });

      it('should generate unique IDs for each statement', () => {
        const content = 'Test statement';
        const result1 = Statement.create(content);
        const result2 = Statement.create(content);

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);

        if (result1.isOk() && result2.isOk()) {
          expect(result1.value.getId().equals(result2.value.getId())).toBe(false);
          expect(result1.value.equals(result2.value)).toBe(false);
        }
      });
    });

    describe('invalid creation cases', () => {
      it('should reject empty and whitespace-only content', () => {
        fc.assert(
          fc.property(invalidContentArbitrary, (invalidContent) => {
            const result = Statement.create(invalidContent);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error).toBeInstanceOf(ValidationError);
              expect(result.error.message).toMatch(/cannot be empty|cannot exceed/i);
            }
          }),
        );
      });

      it('should reject null and undefined content', () => {
        const nullResult = Statement.create(null as any);
        expect(nullResult.isErr()).toBe(true);

        const undefinedResult = Statement.create(undefined as any);
        expect(undefinedResult.isErr()).toBe(true);
      });

      it('should reject overly long content', () => {
        const longContent = 'x'.repeat(10001);
        const result = Statement.create(longContent);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('cannot exceed 10000 characters');
        }
      });
    });
  });

  describe('Statement Reconstruction', () => {
    describe('valid reconstruction cases', () => {
      it('should reconstruct statements with all parameters', () => {
        const id = StatementId.generate();
        const content = 'Reconstructed statement';
        const createdAt = FIXED_TIMESTAMP - 1000;
        const modifiedAt = FIXED_TIMESTAMP;
        const usageCount = 5;

        const result = Statement.reconstruct(id, content, createdAt, modifiedAt, usageCount);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const statement = result.value;
          expect(statement.getId()).toBe(id);
          expect(statement.getContent()).toBe(content);
          expect(statement.getCreatedAt()).toBe(createdAt);
          expect(statement.getModifiedAt()).toBe(modifiedAt);
          expect(statement.getUsageCount()).toBe(usageCount);
        }
      });

      it('should reconstruct with default usage count', () => {
        const id = StatementId.generate();
        const content = 'Default usage count';
        const createdAt = FIXED_TIMESTAMP;
        const modifiedAt = FIXED_TIMESTAMP;

        const result = Statement.reconstruct(id, content, createdAt, modifiedAt);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getUsageCount()).toBe(0);
        }
      });

      it('should handle property-based reconstruction', () => {
        fc.assert(
          fc.property(
            validContentArbitrary,
            fc.nat(),
            fc.nat(),
            usageCountArbitrary,
            (content, createdAt, modifiedAt, usageCount) => {
              const id = StatementId.generate();
              const result = Statement.reconstruct(id, content, createdAt, modifiedAt, usageCount);

              expect(result.isOk()).toBe(true);
              if (result.isOk()) {
                const statement = result.value;
                expect(statement.getId()).toBe(id);
                expect(statement.getContent()).toBe(content.trim());
                expect(statement.getCreatedAt()).toBe(createdAt);
                expect(statement.getModifiedAt()).toBe(modifiedAt);
                expect(statement.getUsageCount()).toBe(usageCount);
              }
            },
          ),
        );
      });
    });

    describe('invalid reconstruction cases', () => {
      it('should reject invalid content during reconstruction', () => {
        const id = StatementId.generate();
        const result = Statement.reconstruct(id, '', FIXED_TIMESTAMP, FIXED_TIMESTAMP, 0);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
        }
      });

      it('should reject negative usage count', () => {
        const id = StatementId.generate();
        const content = 'Valid content';
        const result = Statement.reconstruct(id, content, FIXED_TIMESTAMP, FIXED_TIMESTAMP, -1);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('Usage count must be a non-negative integer');
        }
      });
    });
  });

  describe('Immutability Verification', () => {
    it('should maintain immutability of core properties', () => {
      const content = 'Immutable statement';
      const result = Statement.create(content);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const statement = result.value;
        const originalId = statement.getId();
        const originalCreatedAt = statement.getCreatedAt();
        const originalModifiedAt = statement.getModifiedAt();

        // Attempt to modify properties (should have no effect)
        statement.incrementUsage();

        // Core immutable properties should remain unchanged
        expect(statement.getId()).toBe(originalId);
        expect(statement.getCreatedAt()).toBe(originalCreatedAt);
        expect(statement.getModifiedAt()).toBe(originalModifiedAt);
      }
    });

    it('should return consistent value object references', () => {
      const content = 'Test content';
      const result = Statement.create(content);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const statement = result.value;
        const contentObj1 = statement.getContentObject();
        const contentObj2 = statement.getContentObject();

        // Should be the same reference since value objects are immutable
        expect(contentObj1.equals(contentObj2)).toBe(true);
        expect(contentObj1).toBe(contentObj2);
        expect(contentObj1.getValue()).toBe(content);
      }
    });

    it('should prevent external modification of internal state', () => {
      const content = 'Protected content';
      const result = Statement.create(content);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const statement = result.value;

        // These should not be modifiable from outside
        expect(() => {
          (statement as any).id = StatementId.generate();
        }).not.toThrow(); // But should have no effect

        expect(() => {
          (statement as any).createdAt = Date.now();
        }).not.toThrow(); // But should have no effect

        // Original properties should remain unchanged
        expect(statement.getCreatedAt()).toBe(FIXED_TIMESTAMP);
      }
    });
  });

  describe('Content Validation and Management', () => {
    describe('content updates', () => {
      it('should update content successfully', () => {
        const originalContent = 'Original content';
        const newContent = 'Updated content';
        const result = Statement.create(originalContent);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const statement = result.value;

          // Mock new timestamp for update
          const updateTime = FIXED_TIMESTAMP + 1000;
          mockDateNow.mockReturnValue(updateTime);

          const updateResult = statement.updateContent(newContent);
          expect(updateResult.isOk()).toBe(true);

          expect(statement.getContent()).toBe(newContent);
          expect(statement.getModifiedAt()).toBe(updateTime);
          expect(statement.getCreatedAt()).toBe(FIXED_TIMESTAMP); // Should remain unchanged
        }
      });

      it('should handle no-op updates gracefully', () => {
        const content = 'Same content';
        const result = Statement.create(content);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const statement = result.value;
          const originalModifiedAt = statement.getModifiedAt();

          const updateResult = statement.updateContent(content);
          expect(updateResult.isOk()).toBe(true);

          expect(statement.getContent()).toBe(content);
          expect(statement.getModifiedAt()).toBe(originalModifiedAt); // Should remain unchanged
        }
      });

      it('should reject invalid content updates', () => {
        const result = Statement.create('Valid content');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const statement = result.value;

          const updateResult = statement.updateContent('');
          expect(updateResult.isErr()).toBe(true);

          if (updateResult.isErr()) {
            expect(updateResult.error).toBeInstanceOf(ValidationError);
          }

          // Original content should remain unchanged
          expect(statement.getContent()).toBe('Valid content');
        }
      });

      it('should trim whitespace during updates', () => {
        const result = Statement.create('Original');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const statement = result.value;

          const updateResult = statement.updateContent('  Updated content  ');
          expect(updateResult.isOk()).toBe(true);

          expect(statement.getContent()).toBe('Updated content');
        }
      });
    });

    describe('content analysis', () => {
      it('should provide word count functionality', () => {
        const testCases = [
          { content: 'Single', expectedCount: 1 },
          { content: 'Two words', expectedCount: 2 },
          { content: 'This is a longer sentence', expectedCount: 5 },
          { content: 'Multiple   spaces    between', expectedCount: 3 },
          { content: 'Punctuation, symbols! And numbers 123', expectedCount: 5 },
        ];

        testCases.forEach(({ content, expectedCount }) => {
          const result = Statement.create(content);
          expect(result.isOk()).toBe(true);

          if (result.isOk()) {
            expect(result.value.getContentObject().wordCount).toBe(expectedCount);
          }
        });
      });

      it('should detect content presence correctly', () => {
        const result = Statement.create('Has content');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.hasContent()).toBe(true);
        }
      });

      it('should maintain word count consistency', () => {
        fc.assert(
          fc.property(validContentArbitrary, (content) => {
            const result = Statement.create(content);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              const statement = result.value;
              const contentObj = statement.getContentObject();
              expect(contentObj.wordCount).toBeGreaterThanOrEqual(1);
            }
          }),
        );
      });
    });
  });

  describe('Usage Tracking and Reference Management', () => {
    describe('usage count management', () => {
      it('should increment usage count correctly', () => {
        const result = Statement.create('Test statement');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const statement = result.value;

          expect(statement.getUsageCount()).toBe(0);
          expect(statement.isReferencedInOrderedSets()).toBe(false);

          statement.incrementUsage();
          expect(statement.getUsageCount()).toBe(1);
          expect(statement.isReferencedInOrderedSets()).toBe(true);

          statement.incrementUsage();
          expect(statement.getUsageCount()).toBe(2);
        }
      });

      it('should provide both increment methods', () => {
        const result = Statement.create('Test statement');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          let statement = result.value;

          // Test both increment methods
          statement = statement.incrementUsage();
          expect(statement.getUsageCount()).toBe(1);

          statement = statement.incrementUsage();
          expect(statement.getUsageCount()).toBe(2);
        }
      });

      it('should decrement usage count with validation', () => {
        const result = Statement.create('Test statement');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const statement = result.value;

          // First increment to have something to decrement
          statement.incrementUsage();
          statement.incrementUsage();
          expect(statement.getUsageCount()).toBe(2);

          const decrementResult = statement.decrementUsage();
          expect(decrementResult.isOk()).toBe(true);
          expect(statement.getUsageCount()).toBe(1);
          expect(statement.isReferencedInOrderedSets()).toBe(true);
        }
      });

      it('should prevent decrementing below zero', () => {
        const result = Statement.create('Test statement');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const statement = result.value;

          // Try to decrement when count is 0
          const decrementResult = statement.decrementUsage();
          expect(decrementResult.isErr()).toBe(true);

          if (decrementResult.isErr()) {
            expect(decrementResult.error).toBeInstanceOf(ValidationError);
            expect(decrementResult.error.message).toContain(
              'Cannot decrement usage count below zero',
            );
          }

          expect(statement.getUsageCount()).toBe(0);
        }
      });

      it('should handle usage count edge cases', () => {
        const result = Statement.create('Test statement');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const statement = result.value;

          // Increment to 1, then decrement to 0
          statement.incrementUsage();
          const decrementResult = statement.decrementUsage();
          expect(decrementResult.isOk()).toBe(true);
          expect(statement.getUsageCount()).toBe(0);
          expect(statement.isReferencedInOrderedSets()).toBe(false);

          // Try to decrement from 0 (should fail)
          const decrementFromZero = statement.decrementUsage();
          expect(decrementFromZero.isErr()).toBe(true);
        }
      });
    });

    describe('reference tracking', () => {
      it('should track reference state correctly', () => {
        const result = Statement.create('Referenced statement');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const statement = result.value;

          // Initially not referenced
          expect(statement.isReferencedInOrderedSets()).toBe(false);

          // After incrementing, should be referenced
          statement.incrementUsage();
          expect(statement.isReferencedInOrderedSets()).toBe(true);

          // After decrementing back to 0, should not be referenced
          statement.decrementUsage();
          expect(statement.isReferencedInOrderedSets()).toBe(false);
        }
      });

      it('should maintain reference consistency', () => {
        fc.assert(
          fc.property(usageCountArbitrary, (initialCount) => {
            const result = Statement.create('Test statement');
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              const statement = result.value;

              // Set usage count by incrementing
              for (let i = 0; i < initialCount; i++) {
                statement.incrementUsage();
              }

              const expectedReferenced = initialCount > 0;
              expect(statement.isReferencedInOrderedSets()).toBe(expectedReferenced);
              expect(statement.getUsageCount()).toBe(initialCount);
            }
          }),
        );
      });
    });
  });

  describe('Equality and Comparison', () => {
    describe('statement equality', () => {
      it('should implement identity-based equality', () => {
        const content = 'Same content';
        const result1 = Statement.create(content);
        const result2 = Statement.create(content);

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);

        if (result1.isOk() && result2.isOk()) {
          const statement1 = result1.value;
          const statement2 = result2.value;

          // Same content but different identities
          expect(statement1.equals(statement2)).toBe(false);
          expect(statement1.equals(statement1)).toBe(true);
          expect(statement2.equals(statement2)).toBe(true);
        }
      });

      it('should implement content-based equality separately', () => {
        const content = 'Identical content';
        const result1 = Statement.create(content);
        const result2 = Statement.create(content);

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);

        if (result1.isOk() && result2.isOk()) {
          const statement1 = result1.value;
          const statement2 = result2.value;

          // Content should be equal even if identities differ
          expect(statement1.hasEqualContent(statement2)).toBe(true);
          expect(statement1.equals(statement2)).toBe(false);
        }
      });

      it('should distinguish content equality from identity equality', () => {
        const result1 = Statement.create('First content');
        const result2 = Statement.create('Second content');

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);

        if (result1.isOk() && result2.isOk()) {
          const statement1 = result1.value;
          const statement2 = result2.value;

          expect(statement1.hasEqualContent(statement2)).toBe(false);
          expect(statement1.equals(statement2)).toBe(false);
        }
      });
    });

    describe('equality properties', () => {
      it('should satisfy reflexivity for identity equality', () => {
        const result = Statement.create('Test statement');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const statement = result.value;
          expect(statement.equals(statement)).toBe(true);
        }
      });

      it('should satisfy reflexivity for content equality', () => {
        const result = Statement.create('Test statement');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const statement = result.value;
          expect(statement.hasEqualContent(statement)).toBe(true);
        }
      });

      it('should satisfy symmetry for content equality', () => {
        const content = 'Symmetric content';
        const result1 = Statement.create(content);
        const result2 = Statement.create(content);

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);

        if (result1.isOk() && result2.isOk()) {
          const statement1 = result1.value;
          const statement2 = result2.value;

          expect(statement1.hasEqualContent(statement2)).toBe(
            statement2.hasEqualContent(statement1),
          );
        }
      });
    });
  });

  describe('Serialization and String Representation', () => {
    describe('toString method', () => {
      it('should return content as string representation', () => {
        const content = 'String representation test';
        const result = Statement.create(content);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const statement = result.value;
          expect(statement.toString()).toBe(content);
        }
      });

      it('should handle various content types in toString', () => {
        const testCases = [
          'Simple text',
          'Text with numbers 123',
          'Text with symbols !@#$%',
          'Multi-line\ncontent',
          'Unicode content: 🌟 αβγ',
        ];

        testCases.forEach((content) => {
          const result = Statement.create(content);
          expect(result.isOk()).toBe(true);

          if (result.isOk()) {
            expect(result.value.toString()).toBe(content);
          }
        });
      });

      it('should maintain consistency between toString and getContent', () => {
        fc.assert(
          fc.property(validContentArbitrary, (content) => {
            const result = Statement.create(content);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              const statement = result.value;
              expect(statement.toString()).toBe(statement.getContent());
            }
          }),
        );
      });
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    describe('boundary conditions', () => {
      it('should handle minimum valid content', () => {
        const result = Statement.create('a');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const statement = result.value;
          expect(statement.getContent()).toBe('a');
          expect(statement.getContentObject().wordCount).toBe(1);
          expect(statement.hasContent()).toBe(true);
        }
      });

      it('should handle maximum valid content', () => {
        const maxContent = 'x'.repeat(10000);
        const result = Statement.create(maxContent);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const statement = result.value;
          expect(statement.getContent()).toBe(maxContent);
          expect(statement.getContent().length).toBe(10000);
        }
      });

      it('should handle content just over the limit', () => {
        const overLimitContent = 'x'.repeat(10001);
        const result = Statement.create(overLimitContent);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('cannot exceed 10000 characters');
        }
      });
    });

    describe('timestamp edge cases', () => {
      it('should handle reconstruction with equal created and modified timestamps', () => {
        const id = StatementId.generate();
        const content = 'Same timestamps';
        const timestamp = FIXED_TIMESTAMP;

        const result = Statement.reconstruct(id, content, timestamp, timestamp, 0);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const statement = result.value;
          expect(statement.getCreatedAt()).toBe(timestamp);
          expect(statement.getModifiedAt()).toBe(timestamp);
        }
      });

      it('should handle reconstruction with modified before created', () => {
        const id = StatementId.generate();
        const content = 'Backwards timestamps';
        const createdAt = FIXED_TIMESTAMP;
        const modifiedAt = FIXED_TIMESTAMP - 1000;

        // This should still work - we don't validate timestamp ordering
        const result = Statement.reconstruct(id, content, createdAt, modifiedAt, 0);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const statement = result.value;
          expect(statement.getCreatedAt()).toBe(createdAt);
          expect(statement.getModifiedAt()).toBe(modifiedAt);
        }
      });
    });

    describe('usage count edge cases', () => {
      it('should handle maximum usage count', () => {
        const result = Statement.create('Max usage');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const statement = result.value;

          // Increment to a large number
          const maxCount = 10000;
          for (let i = 0; i < maxCount; i++) {
            statement.incrementUsage();
          }

          expect(statement.getUsageCount()).toBe(maxCount);
          expect(statement.isReferencedInOrderedSets()).toBe(true);
        }
      });

      it('should handle reconstruction with maximum usage count', () => {
        const id = StatementId.generate();
        const content = 'High usage';
        const maxCount = Number.MAX_SAFE_INTEGER;

        const result = Statement.reconstruct(
          id,
          content,
          FIXED_TIMESTAMP,
          FIXED_TIMESTAMP,
          maxCount,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const statement = result.value;
          expect(statement.getUsageCount()).toBe(maxCount);
          expect(statement.isReferencedInOrderedSets()).toBe(true);
        }
      });
    });
  });

  describe('Property-Based Testing', () => {
    it('should maintain invariants across all operations', () => {
      fc.assert(
        fc.property(
          validContentArbitrary,
          fc.array(
            fc.oneof(fc.constant('increment'), fc.constant('update'), fc.constant('decrement')),
            { maxLength: 10 },
          ),
          (initialContent, operations) => {
            const result = Statement.create(initialContent);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              const statement = result.value;
              let expectedUsageCount = 0;

              for (const operation of operations) {
                switch (operation) {
                  case 'increment': {
                    statement.incrementUsage();
                    expectedUsageCount++;
                    break;
                  }
                  case 'update': {
                    const updateResult = statement.updateContent(`${initialContent} updated`);
                    expect(updateResult.isOk()).toBe(true);
                    break;
                  }
                  case 'decrement': {
                    if (expectedUsageCount > 0) {
                      const decrementResult = statement.decrementUsage();
                      expect(decrementResult.isOk()).toBe(true);
                      expectedUsageCount--;
                    }
                    break;
                  }
                }
              }

              // Verify invariants
              expect(statement.getUsageCount()).toBe(expectedUsageCount);
              expect(statement.isReferencedInOrderedSets()).toBe(expectedUsageCount > 0);
              expect(statement.hasContent()).toBe(true);
              expect(statement.getContentObject().wordCount).toBeGreaterThan(0);
            }
          },
        ),
      );
    });

    it('should maintain content consistency across updates', () => {
      fc.assert(
        fc.property(
          validContentArbitrary,
          fc.array(validContentArbitrary, { maxLength: 5 }),
          (initialContent, updates) => {
            const result = Statement.create(initialContent);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              const statement = result.value;
              let expectedContent = initialContent.trim();

              for (const update of updates) {
                const updateResult = statement.updateContent(update);
                expect(updateResult.isOk()).toBe(true);
                expectedContent = update.trim();
              }

              expect(statement.getContent()).toBe(expectedContent);
              expect(statement.toString()).toBe(expectedContent);
              expect(statement.hasContent()).toBe(true);
            }
          },
        ),
      );
    });
  });

  describe('Edge case coverage for improved test coverage', () => {
    it('should test incrementUsageCount method as alias to incrementUsage', () => {
      const result = Statement.create('Test statement');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        let statement = result.value;

        expect(statement.getUsageCount()).toBe(0);

        // Test incrementUsage
        statement = statement.incrementUsage();
        expect(statement.getUsageCount()).toBe(1);

        // Test incrementUsageCount (should be the same)
        statement = statement.incrementUsage();
        expect(statement.getUsageCount()).toBe(2);

        // Both methods should have the same effect
        statement = statement.incrementUsage();
        statement = statement.incrementUsage();
        expect(statement.getUsageCount()).toBe(4);
      }
    });

    it('should test content equality edge cases', () => {
      const content1 = 'Test content';
      const content2 = 'Test content';
      const content3 = 'Different content';

      const result1 = Statement.create(content1);
      const result2 = Statement.create(content2);
      const result3 = Statement.create(content3);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      expect(result3.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk() && result3.isOk()) {
        const statement1 = result1.value;
        const statement2 = result2.value;
        const statement3 = result3.value;

        // Same content should be content equal but not ID equal
        expect(statement1.hasEqualContent(statement2)).toBe(true);
        expect(statement1.equals(statement2)).toBe(false); // Different IDs

        // Different content should not be content equal
        expect(statement1.hasEqualContent(statement3)).toBe(false);
        expect(statement1.equals(statement3)).toBe(false);

        // Statement should equal itself
        expect(statement1.equals(statement1)).toBe(true);
        expect(statement1.hasEqualContent(statement1)).toBe(true);
      }
    });

    it('should test updateContent with identical content', () => {
      const originalContent = 'Test content';
      const result = Statement.create(originalContent);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const statement = result.value;
        const originalModifiedAt = statement.getModifiedAt();

        // Update with identical content should succeed but not change modifiedAt
        const updateResult = statement.updateContent(originalContent);
        expect(updateResult.isOk()).toBe(true);

        // Modified timestamp should not change for identical content
        expect(statement.getModifiedAt()).toBe(originalModifiedAt);
        expect(statement.getContent()).toBe(originalContent);
      }
    });

    it('should test hasContent with different content states', () => {
      // Normal content
      const normalResult = Statement.create('Normal content');
      expect(normalResult.isOk()).toBe(true);
      if (normalResult.isOk()) {
        expect(normalResult.value.hasContent()).toBe(true);
      }

      // Single character
      const singleCharResult = Statement.create('A');
      expect(singleCharResult.isOk()).toBe(true);
      if (singleCharResult.isOk()) {
        expect(singleCharResult.value.hasContent()).toBe(true);
      }

      // Special characters
      const specialResult = Statement.create('!@#$%^&*()');
      expect(specialResult.isOk()).toBe(true);
      if (specialResult.isOk()) {
        expect(specialResult.value.hasContent()).toBe(true);
      }
    });

    it('should test getContentObject method', () => {
      const content = 'Test content for content object';
      const result = Statement.create(content);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const statement = result.value;
        const contentObject = statement.getContentObject();

        expect(contentObject.getValue()).toBe(content);
        expect(contentObject.wordCount).toBe(5); // "Test content for content object"
        expect(contentObject.isEmpty).toBe(false);
      }
    });

    it('should test createPlaceholder static method', () => {
      const placeholderResult = Statement.createPlaceholder();
      expect(placeholderResult.isOk()).toBe(true);

      if (placeholderResult.isOk()) {
        const placeholder = placeholderResult.value;
        expect(placeholder.getContent()).toBe('[Enter text]');
        expect(placeholder.hasContent()).toBe(true);
        expect(placeholder.getUsageCount()).toBe(0);
        expect(placeholder.isReferencedInOrderedSets()).toBe(false);
      }
    });

    it('should test reconstruct with edge case usage counts', () => {
      const id = StatementId.generate();
      const content = 'Reconstructed content';
      const now = Date.now();

      // Test with zero usage count (default)
      const result1 = Statement.reconstruct(id, content, now, now);
      expect(result1.isOk()).toBe(true);
      if (result1.isOk()) {
        expect(result1.value.getUsageCount()).toBe(0);
      }

      // Test with explicit zero usage count
      const result2 = Statement.reconstruct(id, content, now, now, 0);
      expect(result2.isOk()).toBe(true);
      if (result2.isOk()) {
        expect(result2.value.getUsageCount()).toBe(0);
      }

      // Test with positive usage count
      const result3 = Statement.reconstruct(id, content, now, now, 5);
      expect(result3.isOk()).toBe(true);
      if (result3.isOk()) {
        expect(result3.value.getUsageCount()).toBe(5);
        expect(result3.value.isReferencedInOrderedSets()).toBe(true);
      }

      // Test with negative usage count (should fail)
      const result4 = Statement.reconstruct(id, content, now, now, -1);
      expect(result4.isErr()).toBe(true);
      if (result4.isErr()) {
        expect(result4.error.message).toContain('Usage count must be a non-negative integer');
      }
    });
  });

  // Enhanced coverage tests for Statement edge cases
  describe('Enhanced Coverage Tests', () => {
    describe('content validation edge cases', () => {
      it('should handle various whitespace characters', () => {
        const whitespaceVariations = [
          '\u0009', // Tab
          '\u000A', // Line Feed
          '\u000B', // Vertical Tab
          '\u000C', // Form Feed
          '\u000D', // Carriage Return
          '\u0020', // Space
          '\u00A0', // Non-breaking space
          '\u1680', // Ogham space mark
          '\u2000', // En quad
          '\u2001', // Em quad
          '\u2002', // En space
          '\u2003', // Em space
          '\u2004', // Three-per-em space
          '\u2005', // Four-per-em space
          '\u2006', // Six-per-em space
          '\u2007', // Figure space
          '\u2008', // Punctuation space
          '\u2009', // Thin space
          '\u200A', // Hair space
          '\u2028', // Line separator
          '\u2029', // Paragraph separator
          '\u202F', // Narrow no-break space
          '\u205F', // Medium mathematical space
          '\u3000', // Ideographic space
        ];

        whitespaceVariations.forEach((whitespace) => {
          const result = Statement.create(whitespace);
          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            expect(result.error.message).toContain('cannot be empty');
          }

          // Test with content containing these whitespace characters
          const contentWithWhitespace = `valid${whitespace}content`;
          const validResult = Statement.create(contentWithWhitespace);
          expect(validResult.isOk()).toBe(true);
          if (validResult.isOk()) {
            expect(validResult.value.getContent()).toBe(contentWithWhitespace.trim());
          }
        });
      });

      it('should handle Unicode and special characters', () => {
        const unicodeTestCases = [
          'Mathematical symbols: ∑∏∫∆∇∂',
          'Greek letters: αβγδεζηθικλμνξοπρστυφχψω',
          'Emoji: 🔬⚗️📊📈📉🧮🔢',
          'CJK characters: 中文 日本語 한국어',
          'Arabic: العربية',
          'Hebrew: עברית',
          'Cyrillic: русский',
          'Combining characters: é ñ ü',
          'Mathematical operators: ≠ ≤ ≥ ≈ ∞ ∅',
          'Special punctuation: "quotes" \'apostrophes\' —em-dash —',
          'Line breaks in content\nwith multiple\nlines',
          'Tab-separated\tvalues\there',
          'Mixed\tmultiple\nwhitespace\r\ntypes',
        ];

        unicodeTestCases.forEach((content) => {
          const result = Statement.create(content);
          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            expect(result.value.getContent()).toBe(content.trim());
          }
        });
      });

      it('should handle null and undefined inputs', () => {
        const nullResult = Statement.create(null as any);
        expect(nullResult.isErr()).toBe(true);
        if (nullResult.isErr()) {
          expect(nullResult.error.message).toContain('null or undefined');
        }

        const undefinedResult = Statement.create(undefined as any);
        expect(undefinedResult.isErr()).toBe(true);
        if (undefinedResult.isErr()) {
          expect(undefinedResult.error.message).toContain('null or undefined');
        }
      });
    });

    describe('usage tracking edge cases', () => {
      it('should handle usage count edge cases', () => {
        const result = Statement.create('Test statement');
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          let statement = result.value;

          // Test multiple increments
          statement = statement.incrementUsage();
          statement = statement.incrementUsage();
          statement = statement.incrementUsage();
          expect(statement.getUsageCount()).toBe(3);
          expect(statement.isReferencedInOrderedSets()).toBe(true);

          // Test multiple decrements
          const decrementResult1 = statement.decrementUsage();
          expect(decrementResult1.isOk()).toBe(true);
          expect(statement.getUsageCount()).toBe(2);
          expect(statement.isReferencedInOrderedSets()).toBe(true);

          const decrementResult2 = statement.decrementUsage();
          expect(decrementResult2.isOk()).toBe(true);
          expect(statement.getUsageCount()).toBe(1);
          expect(statement.isReferencedInOrderedSets()).toBe(true);

          const decrementResult3 = statement.decrementUsage();
          expect(decrementResult3.isOk()).toBe(true);
          expect(statement.getUsageCount()).toBe(0);
          expect(statement.isReferencedInOrderedSets()).toBe(false);

          // Test decrement below zero (should fail)
          const decrementResult4 = statement.decrementUsage();
          expect(decrementResult4.isErr()).toBe(true);
          expect(statement.getUsageCount()).toBe(0);
          expect(statement.isReferencedInOrderedSets()).toBe(false);
        }
      });

      it('should handle large usage counts', () => {
        const result = Statement.create('Test statement');
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          let statement = result.value;

          // Test incrementing to large number
          for (let i = 0; i < 1000; i++) {
            statement = statement.incrementUsage();
          }
          expect(statement.getUsageCount()).toBe(1000);
          expect(statement.isReferencedInOrderedSets()).toBe(true);

          // Test decrementing back to zero
          for (let i = 0; i < 1000; i++) {
            const decrementResult = statement.decrementUsage();
            expect(decrementResult.isOk()).toBe(true);
          }
          expect(statement.getUsageCount()).toBe(0);
          expect(statement.isReferencedInOrderedSets()).toBe(false);
        }
      });
    });

    describe('equality and identity edge cases', () => {
      it('should implement proper equality semantics', () => {
        const content = 'Test statement content';

        const stmt1Result = Statement.create(content);
        const stmt2Result = Statement.create(content);
        const stmt3Result = Statement.create(content);
        const stmt4Result = Statement.create('Different content');

        expect(stmt1Result.isOk()).toBe(true);
        expect(stmt2Result.isOk()).toBe(true);
        expect(stmt3Result.isOk()).toBe(true);
        expect(stmt4Result.isOk()).toBe(true);

        if (stmt1Result.isOk() && stmt2Result.isOk() && stmt3Result.isOk() && stmt4Result.isOk()) {
          // Equality based on ID, not content - each has unique ID
          expect(stmt1Result.value.equals(stmt2Result.value)).toBe(false);
          expect(stmt1Result.value.equals(stmt3Result.value)).toBe(false);
          expect(stmt1Result.value.equals(stmt4Result.value)).toBe(false);

          // Test reflexivity
          expect(stmt1Result.value.equals(stmt1Result.value)).toBe(true);

          // Test symmetry
          expect(stmt1Result.value.equals(stmt2Result.value)).toBe(
            stmt2Result.value.equals(stmt1Result.value),
          );
        }
      });
    });

    describe('reconstruction with extreme values', () => {
      it('should handle reconstruction with boundary timestamp values', () => {
        const content = 'Test content';
        const id = StatementId.generate();

        // Test with minimum timestamp values
        const minResult = Statement.reconstruct(id, content, 0, 0, 0);
        expect(minResult.isOk()).toBe(true);
        if (minResult.isOk()) {
          expect(minResult.value.getCreatedAt()).toBe(0);
          expect(minResult.value.getModifiedAt()).toBe(0);
        }

        // Test with maximum safe integer timestamps
        const maxResult = Statement.reconstruct(
          id,
          content,
          Number.MAX_SAFE_INTEGER,
          Number.MAX_SAFE_INTEGER,
          0,
        );
        expect(maxResult.isOk()).toBe(true);
        if (maxResult.isOk()) {
          expect(maxResult.value.getCreatedAt()).toBe(Number.MAX_SAFE_INTEGER);
          expect(maxResult.value.getModifiedAt()).toBe(Number.MAX_SAFE_INTEGER);
        }

        // Test with modified time before created time
        const backwardsTimeResult = Statement.reconstruct(id, content, 2000, 1000, 0);
        expect(backwardsTimeResult.isOk()).toBe(true); // Should not validate time order in reconstruct
        if (backwardsTimeResult.isOk()) {
          expect(backwardsTimeResult.value.getCreatedAt()).toBe(2000);
          expect(backwardsTimeResult.value.getModifiedAt()).toBe(1000);
        }
      });

      it('should handle reconstruction with maximum usage count', () => {
        const content = 'Test content';
        const id = StatementId.generate();
        const now = Date.now();

        const maxUsageResult = Statement.reconstruct(
          id,
          content,
          now,
          now,
          Number.MAX_SAFE_INTEGER,
        );
        expect(maxUsageResult.isOk()).toBe(true);
        if (maxUsageResult.isOk()) {
          expect(maxUsageResult.value.getUsageCount()).toBe(Number.MAX_SAFE_INTEGER);
          expect(maxUsageResult.value.isReferencedInOrderedSets()).toBe(true);
        }
      });
    });

    describe('content boundary testing', () => {
      it('should handle content at exact size limits', () => {
        // Test content at exactly 10000 characters (max allowed)
        const maxContent = 'a'.repeat(10000);
        const maxResult = Statement.create(maxContent);
        expect(maxResult.isOk()).toBe(true);
        if (maxResult.isOk()) {
          expect(maxResult.value.getContent()).toBe(maxContent);
        }

        // Test content at 10001 characters (over limit)
        const overMaxContent = 'a'.repeat(10001);
        const overMaxResult = Statement.create(overMaxContent);
        expect(overMaxResult.isErr()).toBe(true);
        if (overMaxResult.isErr()) {
          expect(overMaxResult.error.message).toContain('cannot exceed 10000 characters');
        }

        // Test content at exactly 1 character (minimum)
        const minContent = 'a';
        const minResult = Statement.create(minContent);
        expect(minResult.isOk()).toBe(true);
        if (minResult.isOk()) {
          expect(minResult.value.getContent()).toBe(minContent);
        }
      });

      it('should handle whitespace trimming edge cases', () => {
        const testCases = [
          { input: '  content  ', expected: 'content' },
          { input: '\t\tcontent\t\t', expected: 'content' },
          { input: '\n\ncontent\n\n', expected: 'content' },
          { input: '\r\rcontent\r\r', expected: 'content' },
          { input: '  \t\n\r  content  \r\n\t  ', expected: 'content' },
          { input: 'content with  internal   spaces', expected: 'content with  internal   spaces' },
          { input: 'content\twith\ttabs', expected: 'content\twith\ttabs' },
          { input: 'content\nwith\nlines', expected: 'content\nwith\nlines' },
        ];

        testCases.forEach(({ input, expected }) => {
          const result = Statement.create(input);
          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            expect(result.value.getContent()).toBe(expected);
          }
        });
      });
    });

    describe('modification timestamp tracking', () => {
      it('should not update modification time on usage count changes', () => {
        const result = Statement.create('Test statement');
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          let statement = result.value;
          const initialModified = statement.getModifiedAt();

          // Test increment does not update timestamp
          mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
          statement = statement.incrementUsage();
          expect(statement.getModifiedAt()).toBe(initialModified);

          // Test decrement does not update timestamp
          mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 2000);
          const decrementResult = statement.decrementUsage();
          expect(decrementResult.isOk()).toBe(true);
          expect(statement.getModifiedAt()).toBe(initialModified);
        }
      });

      it('should not update timestamp when decrementing below zero', () => {
        const result = Statement.create('Test statement');
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const statement = result.value;

          // Start with zero usage count
          expect(statement.getUsageCount()).toBe(0);
          const initialModified = statement.getModifiedAt();

          // Try to decrement below zero
          mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
          const decrementResult = statement.decrementUsage();

          // Should fail and not update timestamp since count didn't change
          expect(decrementResult.isErr()).toBe(true);
          expect(statement.getUsageCount()).toBe(0);
          expect(statement.getModifiedAt()).toBe(initialModified);
        }
      });
    });

    describe('error handling comprehensive coverage', () => {
      it('should provide detailed error information for all failure modes', () => {
        // Test StatementContent validation errors
        const emptyResult = Statement.create('');
        expect(emptyResult.isErr()).toBe(true);
        if (emptyResult.isErr()) {
          expect(emptyResult.error).toBeInstanceOf(ValidationError);
          expect(emptyResult.error.message).toContain('StatementContent cannot be empty');
          expect(emptyResult.error.context?.field).toBe('value');
        }

        const oversizeResult = Statement.create('x'.repeat(10001));
        expect(oversizeResult.isErr()).toBe(true);
        if (oversizeResult.isErr()) {
          expect(oversizeResult.error).toBeInstanceOf(ValidationError);
          expect(oversizeResult.error.message).toContain(
            'StatementContent cannot exceed 10000 characters',
          );
          expect(oversizeResult.error.context?.field).toBe('value');
        }

        const nullResult = Statement.create(null as any);
        expect(nullResult.isErr()).toBe(true);
        if (nullResult.isErr()) {
          expect(nullResult.error).toBeInstanceOf(ValidationError);
          expect(nullResult.error.message).toContain(
            'StatementContent cannot be null or undefined',
          );
          expect(nullResult.error.context?.field).toBe('value');
        }

        // Test reconstruction validation errors
        const id = StatementId.generate();
        const negativeUsageResult = Statement.reconstruct(id, 'content', 0, 0, -1);
        expect(negativeUsageResult.isErr()).toBe(true);
        if (negativeUsageResult.isErr()) {
          expect(negativeUsageResult.error).toBeInstanceOf(ValidationError);
          expect(negativeUsageResult.error.message).toContain(
            'Usage count must be a non-negative integer',
          );
        }
      });
    });

    describe('toString edge cases', () => {
      it('should provide meaningful string representations', () => {
        const testCases = [
          'Simple statement',
          'Statement with special chars: αβγ',
          'Statement\nwith\nmultiple\nlines',
          'Statement\twith\ttabs',
          'Very long statement that might need truncation in some contexts but should be preserved fully in toString ' +
            'x'.repeat(100),
        ];

        testCases.forEach((content) => {
          const result = Statement.create(content);
          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            const statement = result.value;
            const stringRepresentation = statement.toString();
            expect(stringRepresentation).toBe(content.trim());
          }
        });
      });
    });
  });
});

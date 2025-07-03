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
import { StatementId } from '../../shared/value-objects.js';

// Property-based test generators for Statement domain
const validContentArbitrary = fc
  .string({ minLength: 1, maxLength: 1000 })
  .filter((s) => s.trim().length > 0);

const invalidContentArbitrary = fc.oneof(
  fc.constant(''),
  fc.constant('   '),
  fc.constant('\t\n\r'),
  fc.string({ minLength: 10001, maxLength: 15000 }), // Add reasonable upper bound
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
          expect(statement.getWordCount()).toBe(4);
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
          expect(result.error.message).toContain('Usage count cannot be negative');
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
            expect(result.value.getWordCount()).toBe(expectedCount);
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
              const wordCount = statement.getWordCount();
              const contentObj = statement.getContentObject();

              expect(wordCount).toBe(contentObj.wordCount);
              expect(wordCount).toBeGreaterThanOrEqual(1);
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
          const statement = result.value;

          // Test both increment methods
          statement.incrementUsage();
          expect(statement.getUsageCount()).toBe(1);

          statement.incrementUsageCount();
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
          expect(statement1.contentEquals(statement2)).toBe(true);
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

          expect(statement1.contentEquals(statement2)).toBe(false);
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
          expect(statement.contentEquals(statement)).toBe(true);
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

          expect(statement1.contentEquals(statement2)).toBe(statement2.contentEquals(statement1));
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
          expect(statement.getWordCount()).toBe(1);
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
              expect(statement.getWordCount()).toBeGreaterThan(0);
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
});

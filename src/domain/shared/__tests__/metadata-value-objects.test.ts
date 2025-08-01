/**
 * Test suite for metadata value objects
 *
 * Priority: HIGH (Version, Timestamp, Attachment used across system)
 * Demonstrates:
 * - Version sequencing and comparison
 * - Timestamp creation and operations
 * - Attachment relationship modeling
 * - Edge cases and boundary conditions
 * - Error handling with neverthrow Result types
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { Attachment, NodeId, Timestamp, Version } from '../value-objects.js';

describe('Metadata Value Objects', () => {
  describe('Version', () => {
    describe('creation and validation', () => {
      it('should create valid Version from non-negative integers', () => {
        fc.assert(
          fc.property(fc.nat(), (value) => {
            const result = Version.create(value);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              expect(result.value.getValue()).toBe(value);
            }
          }),
        );
      });

      it('should reject negative numbers', () => {
        fc.assert(
          fc.property(fc.integer({ max: -1 }), (value) => {
            const result = Version.create(value);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error.message).toContain('must be a non-negative integer');
            }
          }),
        );
      });

      it('should reject non-integers', () => {
        const floatResult = Version.create(1.5);
        expect(floatResult.isErr()).toBe(true);

        const nanResult = Version.create(Number.NaN);
        expect(nanResult.isErr()).toBe(true);

        const infinityResult = Version.create(Number.POSITIVE_INFINITY);
        expect(infinityResult.isErr()).toBe(true);
      });

      it('should create initial version', () => {
        const initial = Version.initial();
        expect(initial.getValue()).toBe(0);
      });
    });

    describe('version operations', () => {
      it('should increment version correctly', () => {
        fc.assert(
          fc.property(fc.nat({ max: 1000 }), (value) => {
            const versionResult = Version.create(value);
            expect(versionResult.isOk()).toBe(true);

            if (versionResult.isOk()) {
              const version = versionResult.value;
              const next = version.increment();
              expect(next.getValue()).toBe(value + 1);
            }
          }),
        );
      });

      it('should compare versions correctly', () => {
        const v1Result = Version.create(1);
        const v2Result = Version.create(2);
        const v3Result = Version.create(2);

        expect(v1Result.isOk()).toBe(true);
        expect(v2Result.isOk()).toBe(true);
        expect(v3Result.isOk()).toBe(true);

        if (v1Result.isOk() && v2Result.isOk() && v3Result.isOk()) {
          const v1 = v1Result.value;
          const v2 = v2Result.value;
          const v3 = v3Result.value;

          expect(v2.isAfter(v1)).toBe(true);
          expect(v1.isBefore(v2)).toBe(true);
          expect(v2.isAfter(v3)).toBe(false);
          expect(v3.isBefore(v2)).toBe(false);
        }
      });

      it('should satisfy version ordering properties', () => {
        fc.assert(
          fc.property(fc.nat(), fc.nat(), (a, b) => {
            const vaResult = Version.create(a);
            const vbResult = Version.create(b);

            expect(vaResult.isOk()).toBe(true);
            expect(vbResult.isOk()).toBe(true);

            if (vaResult.isOk() && vbResult.isOk()) {
              const va = vaResult.value;
              const vb = vbResult.value;

              // Trichotomy: exactly one of <, =, > must be true
              const isAfter = va.isAfter(vb);
              const isBefore = va.isBefore(vb);
              const isEqual = va.equals(vb);

              expect(Number(isAfter) + Number(isBefore) + Number(isEqual)).toBe(1);
            }
          }),
        );
      });
    });
  });

  describe('Timestamp', () => {
    describe('creation and validation', () => {
      it('should create valid Timestamp from non-negative integers', () => {
        fc.assert(
          fc.property(fc.nat(), (value) => {
            const result = Timestamp.create(value);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              expect(result.value.getValue()).toBe(value);
            }
          }),
        );
      });

      it('should reject negative numbers and non-integers', () => {
        expect(Timestamp.create(-1).isErr()).toBe(true);
        expect(Timestamp.create(1.5).isErr()).toBe(true);
        expect(Timestamp.create(Number.NaN).isErr()).toBe(true);
      });

      it('should create timestamp from current time', () => {
        const now = Timestamp.now();
        const currentTime = Date.now();

        // Should be very close to current time (within 1 second)
        expect(Math.abs(now.getValue() - currentTime)).toBeLessThan(1000);
      });

      it('should create timestamp from Date object', () => {
        const date = new Date('2023-01-01T00:00:00.000Z');
        const timestamp = Timestamp.fromDate(date);

        expect(timestamp.getValue()).toBe(date.getTime());
      });
    });

    describe('timestamp operations', () => {
      it('should convert back to Date correctly', () => {
        fc.assert(
          fc.property(fc.nat(), (value) => {
            const timestampResult = Timestamp.create(value);
            expect(timestampResult.isOk()).toBe(true);

            if (timestampResult.isOk()) {
              const timestamp = timestampResult.value;
              const date = timestamp.toDate();
              expect(date.getTime()).toBe(value);
            }
          }),
        );
      });

      it('should compare timestamps correctly', () => {
        const t1Result = Timestamp.create(1000);
        const t2Result = Timestamp.create(2000);
        const t3Result = Timestamp.create(2000);

        expect(t1Result.isOk()).toBe(true);
        expect(t2Result.isOk()).toBe(true);
        expect(t3Result.isOk()).toBe(true);

        if (t1Result.isOk() && t2Result.isOk() && t3Result.isOk()) {
          const t1 = t1Result.value;
          const t2 = t2Result.value;
          const t3 = t3Result.value;

          expect(t2.isAfter(t1)).toBe(true);
          expect(t1.isBefore(t2)).toBe(true);
          expect(t2.isAfter(t3)).toBe(false);
          expect(t3.isBefore(t2)).toBe(false);
        }
      });

      it('should handle date conversions thoroughly', () => {
        const specificDate = new Date('2024-01-15T10:30:00.000Z');
        const timestampResult = Timestamp.fromDate(specificDate);

        expect(timestampResult.getValue()).toBe(specificDate.getTime());

        const convertedDate = timestampResult.toDate();
        expect(convertedDate.getTime()).toBe(specificDate.getTime());
        expect(convertedDate.toISOString()).toBe(specificDate.toISOString());
      });

      it('should handle Timestamp.now() variations', () => {
        const timestamp1 = Timestamp.now();
        const timestamp2 = Timestamp.now();

        // Timestamps should be very close but not necessarily identical
        // depending on execution timing
        expect(Math.abs(timestamp1.getValue() - timestamp2.getValue())).toBeLessThan(100);
      });

      it('should handle comparison edge cases', () => {
        const early = Timestamp.create(1000);
        const late = Timestamp.create(2000);
        const same1 = Timestamp.create(1500);
        const same2 = Timestamp.create(1500);

        expect(early.isOk()).toBe(true);
        expect(late.isOk()).toBe(true);
        expect(same1.isOk()).toBe(true);
        expect(same2.isOk()).toBe(true);

        if (early.isOk() && late.isOk() && same1.isOk() && same2.isOk()) {
          // Before/after relationships
          expect(early.value.isBefore(late.value)).toBe(true);
          expect(late.value.isAfter(early.value)).toBe(true);

          // Same values
          expect(same1.value.isBefore(same2.value)).toBe(false);
          expect(same1.value.isAfter(same2.value)).toBe(false);

          // Self comparison
          expect(early.value.isBefore(early.value)).toBe(false);
          expect(early.value.isAfter(early.value)).toBe(false);
        }
      });
    });
  });

  describe('Attachment', () => {
    describe('creation and validation', () => {
      it('should create valid attachment with valid parameters', () => {
        const nodeId = NodeId.generate();
        const result = Attachment.create(nodeId, 0);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getParentNodeId()).toBe(nodeId);
          expect(result.value.getPremisePosition()).toBe(0);
          expect(result.value.getFromPosition()).toBeUndefined();
          expect(result.value.hasMultipleConclusionSource()).toBe(false);
        }
      });

      it('should create attachment with from position', () => {
        const nodeId = NodeId.generate();
        const result = Attachment.create(nodeId, 1, 2);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getPremisePosition()).toBe(1);
          expect(result.value.getFromPosition()).toBe(2);
          expect(result.value.hasMultipleConclusionSource()).toBe(true);
        }
      });

      it('should reject negative premise positions', () => {
        const nodeId = NodeId.generate();
        const result = Attachment.create(nodeId, -1);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Premise position must be a non-negative integer');
        }
      });

      it('should reject non-integer premise positions', () => {
        const nodeId = NodeId.generate();
        const result = Attachment.create(nodeId, 1.5);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Premise position must be a non-negative integer');
        }
      });

      it('should reject negative from positions', () => {
        const nodeId = NodeId.generate();
        const result = Attachment.create(nodeId, 0, -1);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('From position must be a non-negative integer');
        }
      });

      it('should reject non-integer from positions', () => {
        const nodeId = NodeId.generate();
        const result = Attachment.create(nodeId, 0, 2.5);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('From position must be a non-negative integer');
        }
      });
    });

    describe('attachment operations', () => {
      it('should implement equality correctly', () => {
        const nodeId1 = NodeId.generate();
        const nodeId2 = NodeId.generate();

        const att1Result = Attachment.create(nodeId1, 0, 1);
        const att2Result = Attachment.create(nodeId1, 0, 1);
        const att3Result = Attachment.create(nodeId2, 0, 1);
        const att4Result = Attachment.create(nodeId1, 1, 1);
        const att5Result = Attachment.create(nodeId1, 0, 2);

        expect(att1Result.isOk()).toBe(true);
        expect(att2Result.isOk()).toBe(true);
        expect(att3Result.isOk()).toBe(true);
        expect(att4Result.isOk()).toBe(true);
        expect(att5Result.isOk()).toBe(true);

        if (
          att1Result.isOk() &&
          att2Result.isOk() &&
          att3Result.isOk() &&
          att4Result.isOk() &&
          att5Result.isOk()
        ) {
          const att1 = att1Result.value;
          const att2 = att2Result.value;
          const att3 = att3Result.value;
          const att4 = att4Result.value;
          const att5 = att5Result.value;

          expect(att1.equals(att2)).toBe(true); // Same everything
          expect(att1.equals(att3)).toBe(false); // Different parent
          expect(att1.equals(att4)).toBe(false); // Different premise position
          expect(att1.equals(att5)).toBe(false); // Different from position
        }
      });

      it('should provide meaningful string representation', () => {
        const nodeIdResult = NodeId.fromString('test-node-id');
        expect(nodeIdResult.isOk()).toBe(true);

        if (nodeIdResult.isOk()) {
          const nodeId = nodeIdResult.value;

          const simpleResult = Attachment.create(nodeId, 2);
          expect(simpleResult.isOk()).toBe(true);
          if (simpleResult.isOk()) {
            const str = simpleResult.value.toString();
            expect(str).toContain('parent=test-node-id');
            expect(str).toContain('position=2');
            expect(str).not.toContain('from=');
          }

          const complexResult = Attachment.create(nodeId, 1, 3);
          expect(complexResult.isOk()).toBe(true);
          if (complexResult.isOk()) {
            const str = complexResult.value.toString();
            expect(str).toContain('parent=test-node-id');
            expect(str).toContain('position=1');
            expect(str).toContain('from=3');
          }
        }
      });

      it('should handle multiple conclusion source handling', () => {
        const nodeId = NodeId.generate();

        // Simple attachment (no from position)
        const simpleResult = Attachment.create(nodeId, 0);
        expect(simpleResult.isOk()).toBe(true);
        if (simpleResult.isOk()) {
          const simple = simpleResult.value;
          expect(simple.hasMultipleConclusionSource()).toBe(false);
          expect(simple.getFromPosition()).toBeUndefined();
        }

        // Complex attachment (with from position)
        const complexResult = Attachment.create(nodeId, 1, 2);
        expect(complexResult.isOk()).toBe(true);
        if (complexResult.isOk()) {
          const complex = complexResult.value;
          expect(complex.hasMultipleConclusionSource()).toBe(true);
          expect(complex.getFromPosition()).toBe(2);
        }
      });

      it('should handle attachment equality and string representation', () => {
        const nodeId = NodeId.generate();

        const att1Result = Attachment.create(nodeId, 0);
        const att2Result = Attachment.create(nodeId, 0);
        const att3Result = Attachment.create(nodeId, 1);

        expect(att1Result.isOk()).toBe(true);
        expect(att2Result.isOk()).toBe(true);
        expect(att3Result.isOk()).toBe(true);

        if (att1Result.isOk() && att2Result.isOk() && att3Result.isOk()) {
          const att1 = att1Result.value;
          const att2 = att2Result.value;
          const att3 = att3Result.value;

          // Test equality
          expect(att1.equals(att2)).toBe(true);
          expect(att1.equals(att3)).toBe(false);

          // Test string representation consistency
          expect(att1.toString()).toBe(att2.toString());
          expect(att1.toString()).not.toBe(att3.toString());
        }
      });
    });

    describe('property-based testing', () => {
      it('should handle various valid position combinations', () => {
        fc.assert(
          fc.property(
            fc.nat({ max: 100 }),
            fc.option(fc.nat({ max: 100 }), { nil: undefined }),
            (premisePos, fromPos) => {
              const nodeId = NodeId.generate();
              const result = Attachment.create(nodeId, premisePos, fromPos);

              expect(result.isOk()).toBe(true);
              if (result.isOk()) {
                expect(result.value.getPremisePosition()).toBe(premisePos);
                expect(result.value.getFromPosition()).toBe(fromPos);
                expect(result.value.hasMultipleConclusionSource()).toBe(fromPos !== undefined);
              }
            },
          ),
        );
      });

      it('should reject invalid position combinations', () => {
        fc.assert(
          fc.property(
            fc.integer({ max: -1 }),
            fc.option(fc.nat({ max: 100 }), { nil: undefined }),
            (premisePos, fromPos) => {
              const nodeId = NodeId.generate();
              const result = Attachment.create(nodeId, premisePos, fromPos);

              expect(result.isErr()).toBe(true);
              if (result.isErr()) {
                expect(result.error.message).toContain(
                  'Premise position must be a non-negative integer',
                );
              }
            },
          ),
        );
      });

      it('should reject invalid from positions', () => {
        fc.assert(
          fc.property(fc.nat({ max: 100 }), fc.integer({ max: -1 }), (premisePos, fromPos) => {
            const nodeId = NodeId.generate();
            const result = Attachment.create(nodeId, premisePos, fromPos);

            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
              expect(result.error.message).toContain(
                'From position must be a non-negative integer',
              );
            }
          }),
        );
      });
    });
  });
});

/**
 * Tests for VersionConstraint value object
 *
 * Focuses on:
 * - Version constraint creation and parsing
 * - Different constraint operators (exact, caret, tilde, ranges, comparisons)
 * - Version satisfaction checking
 * - SemVer validation and parsing
 * - Range validation and comparison logic
 * - Error conditions and edge cases
 * - Complex version scenarios (prereleases, build metadata)
 * - High coverage for all constraint types and version matching logic
 */

import { describe, expect, it } from 'vitest';

import { InvalidPackageVersionError } from '../../types/domain-errors';
import { VersionConstraint } from '../../value-objects/version-constraint';

describe('VersionConstraint', () => {
  describe('create', () => {
    it('should create exact version constraint', () => {
      const result = VersionConstraint.create('1.0.0');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const constraint = result.value;
        expect(constraint.getConstraintString()).toBe('1.0.0');
        expect(constraint.getRanges()).toHaveLength(1);
        expect(constraint.getRanges()[0].operator).toBe('exact');
        expect(constraint.getRanges()[0].version).toBe('1.0.0');
      }
    });

    it('should create caret constraint', () => {
      const result = VersionConstraint.create('^1.2.3');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const constraint = result.value;
        expect(constraint.getConstraintString()).toBe('^1.2.3');
        expect(constraint.getRanges()[0].operator).toBe('caret');
        expect(constraint.getRanges()[0].version).toBe('1.2.3');
      }
    });

    it('should create tilde constraint', () => {
      const result = VersionConstraint.create('~1.2.3');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const constraint = result.value;
        expect(constraint.getConstraintString()).toBe('~1.2.3');
        expect(constraint.getRanges()[0].operator).toBe('tilde');
        expect(constraint.getRanges()[0].version).toBe('1.2.3');
      }
    });

    it('should create greater than or equal constraint', () => {
      const result = VersionConstraint.create('>=1.2.3');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const constraint = result.value;
        expect(constraint.getConstraintString()).toBe('>=1.2.3');
        expect(constraint.getRanges()[0].operator).toBe('gte');
        expect(constraint.getRanges()[0].version).toBe('1.2.3');
      }
    });

    it('should create less than or equal constraint', () => {
      const result = VersionConstraint.create('<=1.2.3');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const constraint = result.value;
        expect(constraint.getConstraintString()).toBe('<=1.2.3');
        expect(constraint.getRanges()[0].operator).toBe('lte');
        expect(constraint.getRanges()[0].version).toBe('1.2.3');
      }
    });

    it('should create greater than constraint', () => {
      const result = VersionConstraint.create('>1.2.3');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const constraint = result.value;
        expect(constraint.getConstraintString()).toBe('>1.2.3');
        expect(constraint.getRanges()[0].operator).toBe('gt');
        expect(constraint.getRanges()[0].version).toBe('1.2.3');
      }
    });

    it('should create less than constraint', () => {
      const result = VersionConstraint.create('<1.2.3');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const constraint = result.value;
        expect(constraint.getConstraintString()).toBe('<1.2.3');
        expect(constraint.getRanges()[0].operator).toBe('lt');
        expect(constraint.getRanges()[0].version).toBe('1.2.3');
      }
    });

    it('should create range constraint', () => {
      const result = VersionConstraint.create('1.0.0 - 2.0.0');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const constraint = result.value;
        expect(constraint.getConstraintString()).toBe('1.0.0 - 2.0.0');
        expect(constraint.getRanges()[0].operator).toBe('range');
        expect(constraint.getRanges()[0].version).toBe('1.0.0');
        expect(constraint.getRanges()[0].upperBound).toBe('2.0.0');
      }
    });

    it('should trim whitespace from constraint string', () => {
      const result = VersionConstraint.create('  ^1.2.3  ');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const constraint = result.value;
        expect(constraint.getConstraintString()).toBe('^1.2.3');
      }
    });

    it('should handle >= constraint with whitespace after operator', () => {
      const result = VersionConstraint.create('>= 1.2.3');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const constraint = result.value;
        expect(constraint.getRanges()[0].operator).toBe('gte');
        expect(constraint.getRanges()[0].version).toBe('1.2.3');
      }
    });

    it('should handle <= constraint with whitespace after operator', () => {
      const result = VersionConstraint.create('<= 1.2.3');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const constraint = result.value;
        expect(constraint.getRanges()[0].operator).toBe('lte');
        expect(constraint.getRanges()[0].version).toBe('1.2.3');
      }
    });

    it('should handle > constraint with whitespace after operator', () => {
      const result = VersionConstraint.create('> 1.2.3');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const constraint = result.value;
        expect(constraint.getRanges()[0].operator).toBe('gt');
        expect(constraint.getRanges()[0].version).toBe('1.2.3');
      }
    });

    it('should handle < constraint with whitespace after operator', () => {
      const result = VersionConstraint.create('< 1.2.3');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const constraint = result.value;
        expect(constraint.getRanges()[0].operator).toBe('lt');
        expect(constraint.getRanges()[0].version).toBe('1.2.3');
      }
    });

    describe('validation failures', () => {
      it('should fail with empty constraint', () => {
        const result = VersionConstraint.create('');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidPackageVersionError);
          expect(result.error.message).toBe('Version constraint cannot be empty');
        }
      });

      it('should fail with whitespace-only constraint', () => {
        const result = VersionConstraint.create('   ');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidPackageVersionError);
          expect(result.error.message).toBe('Version constraint cannot be empty');
        }
      });

      it('should fail with invalid exact version', () => {
        const result = VersionConstraint.create('invalid-version');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidPackageVersionError);
          expect(result.error.message).toBe('Invalid version format: invalid-version');
        }
      });

      it('should fail with invalid caret constraint', () => {
        const result = VersionConstraint.create('^invalid-version');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidPackageVersionError);
          expect(result.error.message).toBe('Invalid caret constraint: ^invalid-version');
        }
      });

      it('should fail with invalid tilde constraint', () => {
        const result = VersionConstraint.create('~invalid-version');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidPackageVersionError);
          expect(result.error.message).toBe('Invalid tilde constraint: ~invalid-version');
        }
      });

      it('should fail with invalid gte constraint', () => {
        const result = VersionConstraint.create('>=invalid-version');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidPackageVersionError);
          expect(result.error.message).toBe('Invalid gte constraint: >=invalid-version');
        }
      });

      it('should fail with invalid lte constraint', () => {
        const result = VersionConstraint.create('<=invalid-version');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidPackageVersionError);
          expect(result.error.message).toBe('Invalid lte constraint: <=invalid-version');
        }
      });

      it('should fail with invalid gt constraint', () => {
        const result = VersionConstraint.create('>invalid-version');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidPackageVersionError);
          expect(result.error.message).toBe('Invalid gt constraint: >invalid-version');
        }
      });

      it('should fail with invalid lt constraint', () => {
        const result = VersionConstraint.create('<invalid-version');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidPackageVersionError);
          expect(result.error.message).toBe('Invalid lt constraint: <invalid-version');
        }
      });

      it('should fail with invalid range constraint - missing lower bound', () => {
        const result = VersionConstraint.create(' - 2.0.0');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidPackageVersionError);
          expect(result.error.message).toBe('Invalid range format:  - 2.0.0');
        }
      });

      it('should fail with invalid range constraint - missing upper bound', () => {
        const result = VersionConstraint.create('1.0.0 - ');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidPackageVersionError);
          expect(result.error.message).toBe('Invalid range format: 1.0.0 - ');
        }
      });

      it('should fail with invalid range constraint - invalid lower version', () => {
        const result = VersionConstraint.create('invalid - 2.0.0');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidPackageVersionError);
          expect(result.error.message).toBe('Invalid range format: invalid - 2.0.0');
        }
      });

      it('should fail with invalid range constraint - invalid upper version', () => {
        const result = VersionConstraint.create('1.0.0 - invalid');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidPackageVersionError);
          expect(result.error.message).toBe('Invalid range format: 1.0.0 - invalid');
        }
      });
    });
  });

  describe('satisfies', () => {
    describe('exact constraints', () => {
      it('should satisfy exact version match', () => {
        const constraintResult = VersionConstraint.create('1.2.3');
        expect(constraintResult.isOk()).toBe(true);

        if (constraintResult.isOk()) {
          const constraint = constraintResult.value;
          const result = constraint.satisfies('1.2.3');

          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            expect(result.value).toBe(true);
          }
        }
      });

      it('should not satisfy different exact version', () => {
        const constraintResult = VersionConstraint.create('1.2.3');
        expect(constraintResult.isOk()).toBe(true);

        if (constraintResult.isOk()) {
          const constraint = constraintResult.value;
          const result = constraint.satisfies('1.2.4');

          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            expect(result.value).toBe(false);
          }
        }
      });
    });

    describe('caret constraints', () => {
      it('should satisfy compatible version with caret constraint', () => {
        const constraintResult = VersionConstraint.create('^1.2.3');
        expect(constraintResult.isOk()).toBe(true);

        if (constraintResult.isOk()) {
          const constraint = constraintResult.value;

          const compatibleVersions = ['1.2.3', '1.2.4', '1.3.0', '1.9.9'];
          for (const version of compatibleVersions) {
            const result = constraint.satisfies(version);
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
              expect(result.value).toBe(true);
            }
          }
        }
      });

      it('should not satisfy incompatible version with caret constraint', () => {
        const constraintResult = VersionConstraint.create('^1.2.3');
        expect(constraintResult.isOk()).toBe(true);

        if (constraintResult.isOk()) {
          const constraint = constraintResult.value;

          const incompatibleVersions = ['0.9.9', '1.2.2', '2.0.0', '2.1.0'];
          for (const version of incompatibleVersions) {
            const result = constraint.satisfies(version);
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
              expect(result.value).toBe(false);
            }
          }
        }
      });
    });

    describe('tilde constraints', () => {
      it('should satisfy compatible version with tilde constraint', () => {
        const constraintResult = VersionConstraint.create('~1.2.3');
        expect(constraintResult.isOk()).toBe(true);

        if (constraintResult.isOk()) {
          const constraint = constraintResult.value;

          const compatibleVersions = ['1.2.3', '1.2.4', '1.2.9'];
          for (const version of compatibleVersions) {
            const result = constraint.satisfies(version);
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
              expect(result.value).toBe(true);
            }
          }
        }
      });

      it('should not satisfy incompatible version with tilde constraint', () => {
        const constraintResult = VersionConstraint.create('~1.2.3');
        expect(constraintResult.isOk()).toBe(true);

        if (constraintResult.isOk()) {
          const constraint = constraintResult.value;

          const incompatibleVersions = ['1.1.9', '1.2.2', '1.3.0', '2.0.0'];
          for (const version of incompatibleVersions) {
            const result = constraint.satisfies(version);
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
              expect(result.value).toBe(false);
            }
          }
        }
      });
    });

    describe('greater than or equal constraints', () => {
      it('should satisfy version greater than or equal to constraint', () => {
        const constraintResult = VersionConstraint.create('>=1.2.3');
        expect(constraintResult.isOk()).toBe(true);

        if (constraintResult.isOk()) {
          const constraint = constraintResult.value;

          const satisfyingVersions = ['1.2.3', '1.2.4', '1.3.0', '2.0.0'];
          for (const version of satisfyingVersions) {
            const result = constraint.satisfies(version);
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
              expect(result.value).toBe(true);
            }
          }
        }
      });

      it('should not satisfy version less than constraint', () => {
        const constraintResult = VersionConstraint.create('>=1.2.3');
        expect(constraintResult.isOk()).toBe(true);

        if (constraintResult.isOk()) {
          const constraint = constraintResult.value;

          const nonSatisfyingVersions = ['1.2.2', '1.1.9', '0.9.0'];
          for (const version of nonSatisfyingVersions) {
            const result = constraint.satisfies(version);
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
              expect(result.value).toBe(false);
            }
          }
        }
      });
    });

    describe('less than or equal constraints', () => {
      it('should satisfy version less than or equal to constraint', () => {
        const constraintResult = VersionConstraint.create('<=1.2.3');
        expect(constraintResult.isOk()).toBe(true);

        if (constraintResult.isOk()) {
          const constraint = constraintResult.value;

          const satisfyingVersions = ['1.2.3', '1.2.2', '1.1.0', '0.9.0'];
          for (const version of satisfyingVersions) {
            const result = constraint.satisfies(version);
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
              expect(result.value).toBe(true);
            }
          }
        }
      });

      it('should not satisfy version greater than constraint', () => {
        const constraintResult = VersionConstraint.create('<=1.2.3');
        expect(constraintResult.isOk()).toBe(true);

        if (constraintResult.isOk()) {
          const constraint = constraintResult.value;

          const nonSatisfyingVersions = ['1.2.4', '1.3.0', '2.0.0'];
          for (const version of nonSatisfyingVersions) {
            const result = constraint.satisfies(version);
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
              expect(result.value).toBe(false);
            }
          }
        }
      });
    });

    describe('greater than constraints', () => {
      it('should satisfy version strictly greater than constraint', () => {
        const constraintResult = VersionConstraint.create('>1.2.3');
        expect(constraintResult.isOk()).toBe(true);

        if (constraintResult.isOk()) {
          const constraint = constraintResult.value;

          const satisfyingVersions = ['1.2.4', '1.3.0', '2.0.0'];
          for (const version of satisfyingVersions) {
            const result = constraint.satisfies(version);
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
              expect(result.value).toBe(true);
            }
          }
        }
      });

      it('should not satisfy version less than or equal to constraint', () => {
        const constraintResult = VersionConstraint.create('>1.2.3');
        expect(constraintResult.isOk()).toBe(true);

        if (constraintResult.isOk()) {
          const constraint = constraintResult.value;

          const nonSatisfyingVersions = ['1.2.3', '1.2.2', '1.1.0', '0.9.0'];
          for (const version of nonSatisfyingVersions) {
            const result = constraint.satisfies(version);
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
              expect(result.value).toBe(false);
            }
          }
        }
      });
    });

    describe('less than constraints', () => {
      it('should satisfy version strictly less than constraint', () => {
        const constraintResult = VersionConstraint.create('<1.2.3');
        expect(constraintResult.isOk()).toBe(true);

        if (constraintResult.isOk()) {
          const constraint = constraintResult.value;

          const satisfyingVersions = ['1.2.2', '1.1.0', '0.9.0'];
          for (const version of satisfyingVersions) {
            const result = constraint.satisfies(version);
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
              expect(result.value).toBe(true);
            }
          }
        }
      });

      it('should not satisfy version greater than or equal to constraint', () => {
        const constraintResult = VersionConstraint.create('<1.2.3');
        expect(constraintResult.isOk()).toBe(true);

        if (constraintResult.isOk()) {
          const constraint = constraintResult.value;

          const nonSatisfyingVersions = ['1.2.3', '1.2.4', '1.3.0', '2.0.0'];
          for (const version of nonSatisfyingVersions) {
            const result = constraint.satisfies(version);
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
              expect(result.value).toBe(false);
            }
          }
        }
      });
    });

    describe('range constraints', () => {
      it('should satisfy version within range', () => {
        const constraintResult = VersionConstraint.create('1.0.0 - 2.0.0');
        expect(constraintResult.isOk()).toBe(true);

        if (constraintResult.isOk()) {
          const constraint = constraintResult.value;

          const satisfyingVersions = ['1.0.0', '1.5.0', '1.9.9', '2.0.0'];
          for (const version of satisfyingVersions) {
            const result = constraint.satisfies(version);
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
              expect(result.value).toBe(true);
            }
          }
        }
      });

      it('should not satisfy version outside range', () => {
        const constraintResult = VersionConstraint.create('1.0.0 - 2.0.0');
        expect(constraintResult.isOk()).toBe(true);

        if (constraintResult.isOk()) {
          const constraint = constraintResult.value;

          const nonSatisfyingVersions = ['0.9.9', '2.0.1', '3.0.0'];
          for (const version of nonSatisfyingVersions) {
            const result = constraint.satisfies(version);
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
              expect(result.value).toBe(false);
            }
          }
        }
      });
    });

    describe('prerelease version handling', () => {
      it('should handle prerelease versions with exact constraints', () => {
        const constraintResult = VersionConstraint.create('1.0.0-alpha.1');
        expect(constraintResult.isOk()).toBe(true);

        if (constraintResult.isOk()) {
          const constraint = constraintResult.value;

          const result = constraint.satisfies('1.0.0-alpha.1');
          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            expect(result.value).toBe(true);
          }

          const result2 = constraint.satisfies('1.0.0-alpha.2');
          expect(result2.isOk()).toBe(true);
          if (result2.isOk()) {
            expect(result2.value).toBe(false);
          }
        }
      });

      it('should handle prerelease version ordering', () => {
        const constraintResult = VersionConstraint.create('>1.0.0-alpha.1');
        expect(constraintResult.isOk()).toBe(true);

        if (constraintResult.isOk()) {
          const constraint = constraintResult.value;

          // alpha.2 > alpha.1
          const result1 = constraint.satisfies('1.0.0-alpha.2');
          expect(result1.isOk()).toBe(true);
          if (result1.isOk()) {
            expect(result1.value).toBe(true);
          }

          // beta > alpha
          const result2 = constraint.satisfies('1.0.0-beta.1');
          expect(result2.isOk()).toBe(true);
          if (result2.isOk()) {
            expect(result2.value).toBe(true);
          }

          // Release > prerelease
          const result3 = constraint.satisfies('1.0.0');
          expect(result3.isOk()).toBe(true);
          if (result3.isOk()) {
            expect(result3.value).toBe(true);
          }
        }
      });

      it('should order prerelease versions correctly', () => {
        const constraintResult = VersionConstraint.create('>=1.0.0-alpha.1');
        expect(constraintResult.isOk()).toBe(true);

        if (constraintResult.isOk()) {
          const constraint = constraintResult.value;

          // Test prerelease comes before release
          const result1 = constraint.satisfies('1.0.0-alpha.1');
          expect(result1.isOk()).toBe(true);
          if (result1.isOk()) {
            expect(result1.value).toBe(true);
          }

          const result2 = constraint.satisfies('1.0.0');
          expect(result2.isOk()).toBe(true);
          if (result2.isOk()) {
            expect(result2.value).toBe(true);
          }
        }
      });
    });

    it('should fail with invalid version format', () => {
      const constraintResult = VersionConstraint.create('1.0.0');
      expect(constraintResult.isOk()).toBe(true);

      if (constraintResult.isOk()) {
        const constraint = constraintResult.value;
        const result = constraint.satisfies('invalid-version');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidPackageVersionError);
          expect(result.error.message).toBe('Invalid version format: invalid-version');
        }
      }
    });

    it('should trim whitespace from version being checked', () => {
      const constraintResult = VersionConstraint.create('1.0.0');
      expect(constraintResult.isOk()).toBe(true);

      if (constraintResult.isOk()) {
        const constraint = constraintResult.value;
        const result = constraint.satisfies('  1.0.0  ');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe(true);
        }
      }
    });
  });

  describe('equals', () => {
    it('should be equal to itself', () => {
      const constraintResult = VersionConstraint.create('^1.2.3');
      expect(constraintResult.isOk()).toBe(true);

      if (constraintResult.isOk()) {
        const constraint = constraintResult.value;
        expect(constraint.equals(constraint)).toBe(true);
      }
    });

    it('should be equal to another constraint with same string', () => {
      const constraint1Result = VersionConstraint.create('^1.2.3');
      const constraint2Result = VersionConstraint.create('^1.2.3');

      expect(constraint1Result.isOk()).toBe(true);
      expect(constraint2Result.isOk()).toBe(true);

      if (constraint1Result.isOk() && constraint2Result.isOk()) {
        expect(constraint1Result.value.equals(constraint2Result.value)).toBe(true);
        expect(constraint2Result.value.equals(constraint1Result.value)).toBe(true);
      }
    });

    it('should be equal after trimming whitespace', () => {
      const constraint1Result = VersionConstraint.create('^1.2.3');
      const constraint2Result = VersionConstraint.create('  ^1.2.3  ');

      expect(constraint1Result.isOk()).toBe(true);
      expect(constraint2Result.isOk()).toBe(true);

      if (constraint1Result.isOk() && constraint2Result.isOk()) {
        expect(constraint1Result.value.equals(constraint2Result.value)).toBe(true);
      }
    });

    it('should not be equal with different constraint strings', () => {
      const constraint1Result = VersionConstraint.create('^1.2.3');
      const constraint2Result = VersionConstraint.create('~1.2.3');

      expect(constraint1Result.isOk()).toBe(true);
      expect(constraint2Result.isOk()).toBe(true);

      if (constraint1Result.isOk() && constraint2Result.isOk()) {
        expect(constraint1Result.value.equals(constraint2Result.value)).toBe(false);
      }
    });

    it('should not be equal with different versions', () => {
      const constraint1Result = VersionConstraint.create('^1.2.3');
      const constraint2Result = VersionConstraint.create('^1.2.4');

      expect(constraint1Result.isOk()).toBe(true);
      expect(constraint2Result.isOk()).toBe(true);

      if (constraint1Result.isOk() && constraint2Result.isOk()) {
        expect(constraint1Result.value.equals(constraint2Result.value)).toBe(false);
      }
    });
  });

  describe('toJSON', () => {
    it('should serialize to constraint string', () => {
      const constraintResult = VersionConstraint.create('^1.2.3');
      expect(constraintResult.isOk()).toBe(true);

      if (constraintResult.isOk()) {
        const constraint = constraintResult.value;
        expect(constraint.toJSON()).toBe('^1.2.3');
      }
    });

    it('should be serializable with JSON.stringify', () => {
      const constraintResult = VersionConstraint.create('>=1.0.0');
      expect(constraintResult.isOk()).toBe(true);

      if (constraintResult.isOk()) {
        const constraint = constraintResult.value;
        const jsonString = JSON.stringify({ constraint });
        expect(jsonString).toBe('{"constraint":">=1.0.0"}');
      }
    });
  });

  describe('comprehensive version constraint scenarios', () => {
    it('should handle complex caret ranges correctly', () => {
      const scenarios = [
        {
          constraint: '^0.1.2',
          satisfying: ['0.1.2', '0.1.9'],
          nonSatisfying: ['0.0.9', '0.2.0', '1.0.0'],
        },
        { constraint: '^1.0.0', satisfying: ['1.0.0', '1.9.9'], nonSatisfying: ['0.9.9', '2.0.0'] },
        { constraint: '^2.3.4', satisfying: ['2.3.4', '2.9.9'], nonSatisfying: ['2.3.3', '3.0.0'] },
      ];

      for (const scenario of scenarios) {
        const constraintResult = VersionConstraint.create(scenario.constraint);
        expect(constraintResult.isOk()).toBe(true);

        if (constraintResult.isOk()) {
          const constraint = constraintResult.value;

          for (const version of scenario.satisfying) {
            const result = constraint.satisfies(version);
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
              expect(result.value).toBe(true);
            }
          }

          for (const version of scenario.nonSatisfying) {
            const result = constraint.satisfies(version);
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
              expect(result.value).toBe(false);
            }
          }
        }
      }
    });

    it('should handle complex tilde ranges correctly', () => {
      const scenarios = [
        { constraint: '~0.1.2', satisfying: ['0.1.2', '0.1.9'], nonSatisfying: ['0.1.1', '0.2.0'] },
        { constraint: '~1.2.3', satisfying: ['1.2.3', '1.2.9'], nonSatisfying: ['1.2.2', '1.3.0'] },
      ];

      for (const scenario of scenarios) {
        const constraintResult = VersionConstraint.create(scenario.constraint);
        expect(constraintResult.isOk()).toBe(true);

        if (constraintResult.isOk()) {
          const constraint = constraintResult.value;

          for (const version of scenario.satisfying) {
            const result = constraint.satisfies(version);
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
              expect(result.value).toBe(true);
            }
          }

          for (const version of scenario.nonSatisfying) {
            const result = constraint.satisfies(version);
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
              expect(result.value).toBe(false);
            }
          }
        }
      }
    });
  });

  describe('edge cases and complex versions', () => {
    it('should handle versions with build metadata', () => {
      const constraintResult = VersionConstraint.create('1.0.0+build.1');
      expect(constraintResult.isOk()).toBe(true);

      if (constraintResult.isOk()) {
        const constraint = constraintResult.value;
        const result = constraint.satisfies('1.0.0+build.1');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe(true);
        }
      }
    });

    it('should handle versions with complex prerelease identifiers', () => {
      const constraintResult = VersionConstraint.create('1.0.0-alpha.beta.gamma.1');
      expect(constraintResult.isOk()).toBe(true);

      if (constraintResult.isOk()) {
        const constraint = constraintResult.value;
        const result = constraint.satisfies('1.0.0-alpha.beta.gamma.1');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe(true);
        }
      }
    });

    it('should handle zero versions correctly', () => {
      const constraintResult = VersionConstraint.create('0.0.0');
      expect(constraintResult.isOk()).toBe(true);

      if (constraintResult.isOk()) {
        const constraint = constraintResult.value;

        const result1 = constraint.satisfies('0.0.0');
        expect(result1.isOk()).toBe(true);
        if (result1.isOk()) {
          expect(result1.value).toBe(true);
        }

        const result2 = constraint.satisfies('0.0.1');
        expect(result2.isOk()).toBe(true);
        if (result2.isOk()) {
          expect(result2.value).toBe(false);
        }
      }
    });

    it('should handle large version numbers', () => {
      const constraintResult = VersionConstraint.create('999.999.999');
      expect(constraintResult.isOk()).toBe(true);

      if (constraintResult.isOk()) {
        const constraint = constraintResult.value;
        const result = constraint.satisfies('999.999.999');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe(true);
        }
      }
    });
  });
});

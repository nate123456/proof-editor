/**
 * Tests for Dependency entity
 *
 * Focuses on:
 * - Entity creation and validation
 * - Static factory methods
 * - Resolution status management
 * - Version constraint checking
 * - Dependency type validations
 * - Error conditions and edge cases
 * - High coverage for all methods
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { Dependency, type DependencyData, type DependencyType } from '../../entities/Dependency';
import { DependencyResolutionError } from '../../types/domain-errors';
import { PackageId } from '../../value-objects/package-id';
import { VersionConstraint } from '../../value-objects/version-constraint';

describe('Dependency', () => {
  let sourcePackageId: PackageId;
  let targetPackageId: PackageId;
  let versionConstraint: VersionConstraint;

  beforeEach(() => {
    const sourceResult = PackageId.create('source-package');
    const targetResult = PackageId.create('target-package');
    const constraintResult = VersionConstraint.create('>=1.0.0');

    expect(sourceResult.isOk()).toBe(true);
    expect(targetResult.isOk()).toBe(true);
    expect(constraintResult.isOk()).toBe(true);

    if (sourceResult.isOk() && targetResult.isOk() && constraintResult.isOk()) {
      sourcePackageId = sourceResult.value;
      targetPackageId = targetResult.value;
      versionConstraint = constraintResult.value;
    }
  });

  describe('create', () => {
    it('should create a valid dependency with minimal data', () => {
      const data: DependencyData = {
        sourcePackageId,
        targetPackageId,
        versionConstraint,
        dependencyType: 'runtime',
        isRequired: true,
        resolutionStatus: 'unresolved',
      };

      const result = Dependency.create(data);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const dependency = result.value;
        expect(dependency.getSourcePackageId()).toBe(sourcePackageId);
        expect(dependency.getTargetPackageId()).toBe(targetPackageId);
        expect(dependency.getVersionConstraint()).toBe(versionConstraint);
        expect(dependency.getDependencyType()).toBe('runtime');
        expect(dependency.isRequired()).toBe(true);
        expect(dependency.getResolutionStatus()).toBe('unresolved');
      }
    });

    it('should create dependency with resolved version', () => {
      const data: DependencyData = {
        sourcePackageId,
        targetPackageId,
        versionConstraint,
        dependencyType: 'runtime',
        isRequired: true,
        resolutionStatus: 'resolved',
        resolvedVersion: '1.2.0',
      };

      const result = Dependency.create(data);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const dependency = result.value;
        expect(dependency.isResolved()).toBe(true);
        expect(dependency.getResolvedVersion()).toBe('1.2.0');
      }
    });

    it('should create dependency with conflict reason', () => {
      const data: DependencyData = {
        sourcePackageId,
        targetPackageId,
        versionConstraint,
        dependencyType: 'runtime',
        isRequired: true,
        resolutionStatus: 'conflict',
        conflictReason: 'Version conflict with another dependency',
      };

      const result = Dependency.create(data);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const dependency = result.value;
        expect(dependency.hasConflict()).toBe(true);
        expect(dependency.getConflictReason()).toBe('Version conflict with another dependency');
      }
    });

    it('should fail when package depends on itself', () => {
      const data: DependencyData = {
        sourcePackageId,
        targetPackageId: sourcePackageId, // Same as source
        versionConstraint,
        dependencyType: 'runtime',
        isRequired: true,
        resolutionStatus: 'unresolved',
      };

      const result = Dependency.create(data);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(DependencyResolutionError);
        expect(result.error.message).toBe('Package cannot depend on itself');
      }
    });

    it('should fail when resolved dependency has no resolved version', () => {
      const data: DependencyData = {
        sourcePackageId,
        targetPackageId,
        versionConstraint,
        dependencyType: 'runtime',
        isRequired: true,
        resolutionStatus: 'resolved',
        // Missing resolvedVersion
      };

      const result = Dependency.create(data);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(DependencyResolutionError);
        expect(result.error.message).toBe('Resolved dependency must have resolved version');
      }
    });

    it('should fail when failed dependency has no conflict reason', () => {
      const data: DependencyData = {
        sourcePackageId,
        targetPackageId,
        versionConstraint,
        dependencyType: 'runtime',
        isRequired: true,
        resolutionStatus: 'failed',
        // Missing conflictReason
      };

      const result = Dependency.create(data);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(DependencyResolutionError);
        expect(result.error.message).toBe('Failed dependency must have conflict reason');
      }
    });

    it('should fail when conflicted dependency has no conflict reason', () => {
      const data: DependencyData = {
        sourcePackageId,
        targetPackageId,
        versionConstraint,
        dependencyType: 'runtime',
        isRequired: true,
        resolutionStatus: 'conflict',
        // Missing conflictReason
      };

      const result = Dependency.create(data);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(DependencyResolutionError);
        expect(result.error.message).toBe('Conflicted dependency must have conflict reason');
      }
    });

    it('should fail when optional dependency is marked as required', () => {
      const data: DependencyData = {
        sourcePackageId,
        targetPackageId,
        versionConstraint,
        dependencyType: 'optional',
        isRequired: true, // Contradictory
        resolutionStatus: 'unresolved',
      };

      const result = Dependency.create(data);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(DependencyResolutionError);
        expect(result.error.message).toBe('Optional dependency cannot be required');
      }
    });

    it('should create optional dependency that is not required', () => {
      const data: DependencyData = {
        sourcePackageId,
        targetPackageId,
        versionConstraint,
        dependencyType: 'optional',
        isRequired: false,
        resolutionStatus: 'unresolved',
      };

      const result = Dependency.create(data);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const dependency = result.value;
        expect(dependency.getDependencyType()).toBe('optional');
        expect(dependency.isRequired()).toBe(false);
        expect(dependency.isOptional()).toBe(true);
      }
    });
  });

  describe('createFromDependencyInfo', () => {
    it('should create dependency from dependency info', () => {
      const dependencyInfo = {
        targetPackageId: 'target-package',
        versionConstraint: '>=1.0.0',
        isRequired: true,
      };

      const result = Dependency.createFromDependencyInfo(
        sourcePackageId,
        dependencyInfo,
        'runtime',
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const dependency = result.value;
        expect(dependency.getSourcePackageId()).toBe(sourcePackageId);
        expect(dependency.getTargetPackageId().toString()).toBe('target-package');
        expect(dependency.getDependencyType()).toBe('runtime');
        expect(dependency.isRequired()).toBe(true);
        expect(dependency.getResolutionStatus()).toBe('unresolved');
      }
    });

    it('should create resolved dependency from dependency info with resolved version', () => {
      const dependencyInfo = {
        targetPackageId: 'target-package',
        versionConstraint: '>=1.0.0',
        isRequired: true,
        resolvedVersion: '1.2.0',
      };

      const result = Dependency.createFromDependencyInfo(
        sourcePackageId,
        dependencyInfo,
        'development',
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const dependency = result.value;
        expect(dependency.getDependencyType()).toBe('development');
        expect(dependency.getResolutionStatus()).toBe('resolved');
        expect(dependency.getResolvedVersion()).toBe('1.2.0');
      }
    });

    it('should default to runtime dependency type', () => {
      const dependencyInfo = {
        targetPackageId: 'target-package',
        versionConstraint: '>=1.0.0',
        isRequired: true,
      };

      const result = Dependency.createFromDependencyInfo(sourcePackageId, dependencyInfo);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const dependency = result.value;
        expect(dependency.getDependencyType()).toBe('runtime');
      }
    });

    it('should fail with invalid target package ID', () => {
      const dependencyInfo = {
        targetPackageId: '', // Invalid
        versionConstraint: '>=1.0.0',
        isRequired: true,
      };

      const result = Dependency.createFromDependencyInfo(sourcePackageId, dependencyInfo);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(DependencyResolutionError);
        expect(result.error.message).toContain('Invalid target package ID');
      }
    });

    it('should fail with invalid version constraint', () => {
      const dependencyInfo = {
        targetPackageId: 'target-package',
        versionConstraint: 'invalid-constraint',
        isRequired: true,
      };

      const result = Dependency.createFromDependencyInfo(sourcePackageId, dependencyInfo);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(DependencyResolutionError);
        expect(result.error.message).toContain('Invalid version constraint');
      }
    });
  });

  describe('status checking methods', () => {
    it('should check various status states', () => {
      const unresolvedData: DependencyData = {
        sourcePackageId,
        targetPackageId,
        versionConstraint,
        dependencyType: 'runtime',
        isRequired: true,
        resolutionStatus: 'unresolved',
      };

      const unresolvedResult = Dependency.create(unresolvedData);
      expect(unresolvedResult.isOk()).toBe(true);

      if (unresolvedResult.isOk()) {
        const dependency = unresolvedResult.value;
        expect(dependency.isResolved()).toBe(false);
        expect(dependency.isFailed()).toBe(false);
        expect(dependency.hasConflict()).toBe(false);
        expect(dependency.isResolutionInProgress()).toBe(false);
      }
    });

    it('should detect resolving status', () => {
      const resolvingData: DependencyData = {
        sourcePackageId,
        targetPackageId,
        versionConstraint,
        dependencyType: 'runtime',
        isRequired: true,
        resolutionStatus: 'resolving',
      };

      const result = Dependency.create(resolvingData);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const dependency = result.value;
        expect(dependency.isResolutionInProgress()).toBe(true);
      }
    });

    it('should detect failed status', () => {
      const failedData: DependencyData = {
        sourcePackageId,
        targetPackageId,
        versionConstraint,
        dependencyType: 'runtime',
        isRequired: true,
        resolutionStatus: 'failed',
        conflictReason: 'Failed to resolve',
      };

      const result = Dependency.create(failedData);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const dependency = result.value;
        expect(dependency.isFailed()).toBe(true);
      }
    });
  });

  describe('dependency type checking', () => {
    const dependencyTypes: DependencyType[] = ['runtime', 'development', 'optional', 'peer'];

    dependencyTypes.forEach((type) => {
      it(`should handle ${type} dependency type`, () => {
        const data: DependencyData = {
          sourcePackageId,
          targetPackageId,
          versionConstraint,
          dependencyType: type,
          isRequired: type !== 'optional',
          resolutionStatus: 'unresolved',
        };

        const result = Dependency.create(data);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const dependency = result.value;
          expect(dependency.getDependencyType()).toBe(type);
          if (type === 'optional') {
            expect(dependency.isOptional()).toBe(true);
          }
        }
      });
    });

    it('should detect optional dependencies correctly', () => {
      const optionalData: DependencyData = {
        sourcePackageId,
        targetPackageId,
        versionConstraint,
        dependencyType: 'optional',
        isRequired: false,
        resolutionStatus: 'unresolved',
      };

      const result = Dependency.create(optionalData);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const dependency = result.value;
        expect(dependency.isOptional()).toBe(true);
      }
    });

    it('should detect non-required dependencies as optional', () => {
      const nonRequiredData: DependencyData = {
        sourcePackageId,
        targetPackageId,
        versionConstraint,
        dependencyType: 'runtime',
        isRequired: false,
        resolutionStatus: 'unresolved',
      };

      const result = Dependency.create(nonRequiredData);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const dependency = result.value;
        expect(dependency.isOptional()).toBe(true);
      }
    });
  });

  describe('canSatisfyVersion', () => {
    let dependency: Dependency;

    beforeEach(() => {
      const data: DependencyData = {
        sourcePackageId,
        targetPackageId,
        versionConstraint,
        dependencyType: 'runtime',
        isRequired: true,
        resolutionStatus: 'unresolved',
      };

      const result = Dependency.create(data);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        dependency = result.value;
      }
    });

    it('should check if version satisfies constraint', () => {
      const result = dependency.canSatisfyVersion('1.5.0');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(true);
      }
    });

    it('should reject version that does not satisfy constraint', () => {
      const result = dependency.canSatisfyVersion('0.9.0');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(false);
      }
    });

    it('should handle invalid version format', () => {
      const result = dependency.canSatisfyVersion('invalid-version');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(DependencyResolutionError);
        expect(result.error.message).toContain('Cannot check version satisfaction');
      }
    });
  });

  describe('withResolvedVersion', () => {
    let dependency: Dependency;

    beforeEach(() => {
      const data: DependencyData = {
        sourcePackageId,
        targetPackageId,
        versionConstraint,
        dependencyType: 'runtime',
        isRequired: true,
        resolutionStatus: 'unresolved',
      };

      const result = Dependency.create(data);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        dependency = result.value;
      }
    });

    it('should create resolved dependency with valid version', () => {
      const result = dependency.withResolvedVersion('1.2.0');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const resolvedDependency = result.value;
        expect(resolvedDependency.isResolved()).toBe(true);
        expect(resolvedDependency.getResolvedVersion()).toBe('1.2.0');
        expect(resolvedDependency.getResolutionStatus()).toBe('resolved');
        expect(resolvedDependency.getConflictReason()).toBeUndefined();
      }
    });

    it('should fail with version that does not satisfy constraint', () => {
      const result = dependency.withResolvedVersion('0.5.0');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(DependencyResolutionError);
        expect(result.error.message).toContain('does not satisfy constraint');
      }
    });

    it('should fail with invalid version format', () => {
      const result = dependency.withResolvedVersion('invalid');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(DependencyResolutionError);
        expect(result.error.message).toContain('Cannot check version satisfaction');
      }
    });
  });

  describe('withResolutionStatus', () => {
    let dependency: Dependency;

    beforeEach(() => {
      const data: DependencyData = {
        sourcePackageId,
        targetPackageId,
        versionConstraint,
        dependencyType: 'runtime',
        isRequired: true,
        resolutionStatus: 'unresolved',
      };

      const result = Dependency.create(data);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        dependency = result.value;
      }
    });

    it('should update status to resolving', () => {
      const result = dependency.withResolutionStatus('resolving');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedDependency = result.value;
        expect(updatedDependency.getResolutionStatus()).toBe('resolving');
        expect(updatedDependency.isResolutionInProgress()).toBe(true);
      }
    });

    it('should update status to failed with conflict reason', () => {
      const result = dependency.withResolutionStatus('failed', 'Network error');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedDependency = result.value;
        expect(updatedDependency.getResolutionStatus()).toBe('failed');
        expect(updatedDependency.isFailed()).toBe(true);
        expect(updatedDependency.getConflictReason()).toBe('Network error');
      }
    });

    it('should update status to conflict with conflict reason', () => {
      const result = dependency.withResolutionStatus('conflict', 'Version conflict');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedDependency = result.value;
        expect(updatedDependency.getResolutionStatus()).toBe('conflict');
        expect(updatedDependency.hasConflict()).toBe(true);
        expect(updatedDependency.getConflictReason()).toBe('Version conflict');
      }
    });

    it('should fail when setting failed status without conflict reason', () => {
      const result = dependency.withResolutionStatus('failed');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(DependencyResolutionError);
        expect(result.error.message).toBe('Failed or conflicted status requires conflict reason');
      }
    });

    it('should fail when setting conflict status without conflict reason', () => {
      const result = dependency.withResolutionStatus('conflict');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(DependencyResolutionError);
        expect(result.error.message).toBe('Failed or conflicted status requires conflict reason');
      }
    });

    it('should preserve resolved version when updating to resolved status', () => {
      // First resolve the dependency
      const resolvedResult = dependency.withResolvedVersion('1.2.0');
      expect(resolvedResult.isOk()).toBe(true);

      if (resolvedResult.isOk()) {
        const resolvedDependency = resolvedResult.value;

        // Update status while preserving resolved version
        const result = resolvedDependency.withResolutionStatus('resolved');
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const updatedDependency = result.value;
          expect(updatedDependency.getResolutionStatus()).toBe('resolved');
          expect(updatedDependency.getResolvedVersion()).toBe('1.2.0');
        }
      }
    });
  });

  describe('status helper methods', () => {
    let dependency: Dependency;

    beforeEach(() => {
      const data: DependencyData = {
        sourcePackageId,
        targetPackageId,
        versionConstraint,
        dependencyType: 'runtime',
        isRequired: true,
        resolutionStatus: 'unresolved',
      };

      const result = Dependency.create(data);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        dependency = result.value;
      }
    });

    it('should mark as resolving', () => {
      const result = dependency.markAsResolving();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedDependency = result.value;
        expect(updatedDependency.getResolutionStatus()).toBe('resolving');
        expect(updatedDependency.isResolutionInProgress()).toBe(true);
      }
    });

    it('should mark as failed', () => {
      const result = dependency.markAsFailed('Resolution failed');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedDependency = result.value;
        expect(updatedDependency.getResolutionStatus()).toBe('failed');
        expect(updatedDependency.isFailed()).toBe(true);
        expect(updatedDependency.getConflictReason()).toBe('Resolution failed');
      }
    });

    it('should mark as conflicted', () => {
      const result = dependency.markAsConflicted('Version conflict detected');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedDependency = result.value;
        expect(updatedDependency.getResolutionStatus()).toBe('conflict');
        expect(updatedDependency.hasConflict()).toBe(true);
        expect(updatedDependency.getConflictReason()).toBe('Version conflict detected');
      }
    });
  });

  describe('toDependencyInfo', () => {
    it('should convert to dependency info format', () => {
      const data: DependencyData = {
        sourcePackageId,
        targetPackageId,
        versionConstraint,
        dependencyType: 'runtime',
        isRequired: true,
        resolutionStatus: 'resolved',
        resolvedVersion: '1.2.0',
      };

      const result = Dependency.create(data);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const dependency = result.value;
        const dependencyInfo = dependency.toDependencyInfo();

        expect(dependencyInfo.targetPackageId).toBe('target-package');
        expect(dependencyInfo.versionConstraint).toBe('>=1.0.0');
        expect(dependencyInfo.isRequired).toBe(true);
        expect(dependencyInfo.resolvedVersion).toBe('1.2.0');
      }
    });

    it('should convert unresolved dependency without resolved version', () => {
      const data: DependencyData = {
        sourcePackageId,
        targetPackageId,
        versionConstraint,
        dependencyType: 'runtime',
        isRequired: true,
        resolutionStatus: 'unresolved',
      };

      const result = Dependency.create(data);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const dependency = result.value;
        const dependencyInfo = dependency.toDependencyInfo();

        expect(dependencyInfo.targetPackageId).toBe('target-package');
        expect(dependencyInfo.versionConstraint).toBe('>=1.0.0');
        expect(dependencyInfo.isRequired).toBe(true);
        expect(dependencyInfo.resolvedVersion).toBeUndefined();
      }
    });
  });

  describe('equals', () => {
    it('should compare dependencies by source, target, and version constraint', () => {
      const data1: DependencyData = {
        sourcePackageId,
        targetPackageId,
        versionConstraint,
        dependencyType: 'runtime',
        isRequired: true,
        resolutionStatus: 'unresolved',
      };

      const data2: DependencyData = {
        sourcePackageId,
        targetPackageId,
        versionConstraint,
        dependencyType: 'development', // Different type
        isRequired: false, // Different required
        resolutionStatus: 'resolved', // Different status
        resolvedVersion: '1.2.0',
      };

      const result1 = Dependency.create(data1);
      const result2 = Dependency.create(data2);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        const dependency1 = result1.value;
        const dependency2 = result2.value;

        // Should be equal despite different type, required, and status
        expect(dependency1.equals(dependency2)).toBe(true);
        expect(dependency2.equals(dependency1)).toBe(true);
      }
    });

    it('should not be equal with different source packages', () => {
      const otherSourceResult = PackageId.create('other-source');
      expect(otherSourceResult.isOk()).toBe(true);

      if (otherSourceResult.isOk()) {
        const otherSource = otherSourceResult.value;

        const data1: DependencyData = {
          sourcePackageId,
          targetPackageId,
          versionConstraint,
          dependencyType: 'runtime',
          isRequired: true,
          resolutionStatus: 'unresolved',
        };

        const data2: DependencyData = {
          sourcePackageId: otherSource,
          targetPackageId,
          versionConstraint,
          dependencyType: 'runtime',
          isRequired: true,
          resolutionStatus: 'unresolved',
        };

        const result1 = Dependency.create(data1);
        const result2 = Dependency.create(data2);

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);

        if (result1.isOk() && result2.isOk()) {
          const dependency1 = result1.value;
          const dependency2 = result2.value;

          expect(dependency1.equals(dependency2)).toBe(false);
        }
      }
    });

    it('should not be equal with different target packages', () => {
      const otherTargetResult = PackageId.create('other-target');
      expect(otherTargetResult.isOk()).toBe(true);

      if (otherTargetResult.isOk()) {
        const otherTarget = otherTargetResult.value;

        const data1: DependencyData = {
          sourcePackageId,
          targetPackageId,
          versionConstraint,
          dependencyType: 'runtime',
          isRequired: true,
          resolutionStatus: 'unresolved',
        };

        const data2: DependencyData = {
          sourcePackageId,
          targetPackageId: otherTarget,
          versionConstraint,
          dependencyType: 'runtime',
          isRequired: true,
          resolutionStatus: 'unresolved',
        };

        const result1 = Dependency.create(data1);
        const result2 = Dependency.create(data2);

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);

        if (result1.isOk() && result2.isOk()) {
          const dependency1 = result1.value;
          const dependency2 = result2.value;

          expect(dependency1.equals(dependency2)).toBe(false);
        }
      }
    });

    it('should not be equal with different version constraints', () => {
      const otherConstraintResult = VersionConstraint.create('^2.0.0');
      expect(otherConstraintResult.isOk()).toBe(true);

      if (otherConstraintResult.isOk()) {
        const otherConstraint = otherConstraintResult.value;

        const data1: DependencyData = {
          sourcePackageId,
          targetPackageId,
          versionConstraint,
          dependencyType: 'runtime',
          isRequired: true,
          resolutionStatus: 'unresolved',
        };

        const data2: DependencyData = {
          sourcePackageId,
          targetPackageId,
          versionConstraint: otherConstraint,
          dependencyType: 'runtime',
          isRequired: true,
          resolutionStatus: 'unresolved',
        };

        const result1 = Dependency.create(data1);
        const result2 = Dependency.create(data2);

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);

        if (result1.isOk() && result2.isOk()) {
          const dependency1 = result1.value;
          const dependency2 = result2.value;

          expect(dependency1.equals(dependency2)).toBe(false);
        }
      }
    });

    it('should be equal to itself', () => {
      const data: DependencyData = {
        sourcePackageId,
        targetPackageId,
        versionConstraint,
        dependencyType: 'runtime',
        isRequired: true,
        resolutionStatus: 'unresolved',
      };

      const result = Dependency.create(data);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const dependency = result.value;
        expect(dependency.equals(dependency)).toBe(true);
      }
    });
  });

  describe('toJSON', () => {
    it('should convert to JSON format', () => {
      const data: DependencyData = {
        sourcePackageId,
        targetPackageId,
        versionConstraint,
        dependencyType: 'runtime',
        isRequired: true,
        resolutionStatus: 'resolved',
        resolvedVersion: '1.2.0',
        conflictReason: 'Some conflict',
      };

      const result = Dependency.create(data);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const dependency = result.value;
        const json = dependency.toJSON();

        expect(json).toEqual({
          sourcePackageId: 'source-package',
          targetPackageId: 'target-package',
          versionConstraint: expect.anything(), // VersionConstraint JSON object
          dependencyType: 'runtime',
          isRequired: true,
          resolutionStatus: 'resolved',
          resolvedVersion: '1.2.0',
          conflictReason: 'Some conflict',
        });
      }
    });

    it('should handle minimal dependency data in JSON', () => {
      const data: DependencyData = {
        sourcePackageId,
        targetPackageId,
        versionConstraint,
        dependencyType: 'runtime',
        isRequired: true,
        resolutionStatus: 'unresolved',
      };

      const result = Dependency.create(data);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const dependency = result.value;
        const json = dependency.toJSON();

        expect(json).toEqual({
          sourcePackageId: 'source-package',
          targetPackageId: 'target-package',
          versionConstraint: expect.anything(),
          dependencyType: 'runtime',
          isRequired: true,
          resolutionStatus: 'unresolved',
          resolvedVersion: undefined,
          conflictReason: undefined,
        });
      }
    });
  });

  describe('getter methods', () => {
    let dependency: Dependency;

    beforeEach(() => {
      const data: DependencyData = {
        sourcePackageId,
        targetPackageId,
        versionConstraint,
        dependencyType: 'development',
        isRequired: false,
        resolutionStatus: 'conflict',
        conflictReason: 'Test conflict',
      };

      const result = Dependency.create(data);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        dependency = result.value;
      }
    });

    it('should return all properties correctly', () => {
      expect(dependency.getSourcePackageId()).toBe(sourcePackageId);
      expect(dependency.getTargetPackageId()).toBe(targetPackageId);
      expect(dependency.getVersionConstraint()).toBe(versionConstraint);
      expect(dependency.getDependencyType()).toBe('development');
      expect(dependency.isRequired()).toBe(false);
      expect(dependency.getResolutionStatus()).toBe('conflict');
      expect(dependency.getConflictReason()).toBe('Test conflict');
      expect(dependency.getResolvedVersion()).toBeUndefined();
    });
  });
});

/**
 * Custom domain matchers for dependency resolution testing
 *
 * Provides readable, domain-specific assertions that improve test clarity
 * and reduce boilerplate in dependency resolution tests.
 */

import { expect } from 'vitest';
import type {
  DependencyResolutionPlan,
  ResolvedDependency,
} from '../../domain/services/DependencyResolutionService.js';
import type { PackageId } from '../../domain/value-objects/package-id.js';

interface CustomMatchers<R = unknown> {
  toBeValidResolutionPlan(): R;
  toHaveValidInstallationOrder(): R;
  toSatisfyAllConstraints(): R;
  toContainPackage(packageName: string): R;
  toBeValidForPackage(packageName: string): R;
  toHaveConflictsBetween(packageA: string, packageB: string): R;
  toHaveNoCircularDependencies(): R;
  toRespectDepthConstraints(maxDepth: number): R;
  toHavePerformanceWithinLimits(maxTimeMs: number): R;
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

expect.extend({
  toBeValidResolutionPlan(received: DependencyResolutionPlan) {
    const { isNot } = this;

    const pass =
      received &&
      typeof received === 'object' &&
      received.rootPackage &&
      Array.isArray(received.resolvedDependencies) &&
      Array.isArray(received.installationOrder) &&
      Array.isArray(received.conflicts) &&
      typeof received.totalPackages === 'number' &&
      typeof received.resolutionTime === 'number' &&
      received.totalPackages > 0 &&
      received.resolutionTime >= 0;

    return {
      pass,
      message: () =>
        isNot
          ? `Expected resolution plan to be invalid, but it was valid`
          : `Expected resolution plan to be valid, but it was invalid. Issues: ${getResolutionPlanIssues(received)}`,
    };
  },

  toHaveValidInstallationOrder(received: PackageId[]) {
    const { isNot } = this;

    // Check that installation order is a valid array of PackageIds
    const pass =
      Array.isArray(received) &&
      received.every((id) => id && typeof id.toString === 'function') &&
      received.length === new Set(received.map((id) => id.toString())).size; // No duplicates

    return {
      pass,
      message: () =>
        isNot
          ? `Expected installation order to be invalid, but it was valid`
          : `Expected installation order to be valid, but found issues: ${getInstallationOrderIssues(received)}`,
    };
  },

  toSatisfyAllConstraints(received: ResolvedDependency[]) {
    const { isNot } = this;

    const issues: string[] = [];

    if (!Array.isArray(received)) {
      issues.push('Expected array of resolved dependencies');
    } else {
      received.forEach((dep, index) => {
        if (!dep.dependency || !dep.resolvedPackage || !dep.resolvedVersion) {
          issues.push(`Dependency at index ${index} is missing required properties`);
        }

        if (typeof dep.depth !== 'number' || dep.depth < 0) {
          issues.push(`Dependency at index ${index} has invalid depth: ${dep.depth}`);
        }

        if (typeof dep.isDirectDependency !== 'boolean') {
          issues.push(`Dependency at index ${index} has invalid isDirectDependency flag`);
        }
      });
    }

    const pass = issues.length === 0;

    return {
      pass,
      message: () =>
        isNot
          ? `Expected constraints to be violated, but all were satisfied`
          : `Expected all constraints to be satisfied, but found issues: ${issues.join(', ')}`,
    };
  },

  toContainPackage(received: ResolvedDependency[], packageName: string) {
    const { isNot } = this;

    const pass =
      Array.isArray(received) &&
      received.some(
        (dep) =>
          dep.resolvedPackage &&
          (dep.resolvedPackage.getName() === packageName ||
            dep.resolvedPackage.getId().toString() === packageName),
      );

    return {
      pass,
      message: () =>
        isNot
          ? `Expected resolved dependencies not to contain package "${packageName}", but it was found`
          : `Expected resolved dependencies to contain package "${packageName}", but it was not found. Found packages: ${getPackageNames(received)}`,
    };
  },

  toBeValidForPackage(received: PackageId[], packageName: string) {
    const { isNot } = this;

    const packageIndex = received.findIndex(
      (id) => id.toString() === packageName || id.toString().includes(packageName),
    );

    const pass = packageIndex !== -1;

    return {
      pass,
      message: () =>
        isNot
          ? `Expected installation order not to be valid for package "${packageName}", but it was`
          : `Expected installation order to be valid for package "${packageName}", but package was not found in order: ${received.map((id) => id.toString()).join(', ')}`,
    };
  },

  toHaveConflictsBetween(received: DependencyResolutionPlan, packageA: string, packageB: string) {
    const { isNot } = this;

    const hasConflicts = received.conflicts && received.conflicts.length > 0;
    const involvedPackages = hasConflicts
      ? received.conflicts.flatMap((conflict) => [
          conflict.packageId.toString(),
          ...conflict.requiredBy.map((id) => id.toString()),
        ])
      : [];

    const pass =
      hasConflicts && (involvedPackages.includes(packageA) || involvedPackages.includes(packageB));

    return {
      pass,
      message: () =>
        isNot
          ? `Expected no conflicts between "${packageA}" and "${packageB}", but conflicts were found`
          : `Expected conflicts between "${packageA}" and "${packageB}", but none were found. Conflicts involved: ${involvedPackages.join(', ')}`,
    };
  },

  toHaveNoCircularDependencies(received: PackageId[][]) {
    const { isNot } = this;

    const pass = Array.isArray(received) && received.length === 0;

    return {
      pass,
      message: () =>
        isNot
          ? `Expected circular dependencies, but none were found`
          : `Expected no circular dependencies, but found ${received.length} cycle(s): ${formatCycles(received)}`,
    };
  },

  toRespectDepthConstraints(received: ResolvedDependency[], maxDepth: number) {
    const { isNot } = this;

    const violations = received.filter((dep) => dep.depth > maxDepth);
    const pass = violations.length === 0;

    return {
      pass,
      message: () =>
        isNot
          ? `Expected depth constraint violations, but all dependencies respected max depth ${maxDepth}`
          : `Expected all dependencies to respect max depth ${maxDepth}, but found ${violations.length} violation(s): ${violations.map((v) => `${v.resolvedPackage.getName()}@depth=${v.depth}`).join(', ')}`,
    };
  },

  toHavePerformanceWithinLimits(received: DependencyResolutionPlan, maxTimeMs: number) {
    const { isNot } = this;

    const pass = received.resolutionTime <= maxTimeMs;

    return {
      pass,
      message: () =>
        isNot
          ? `Expected resolution time to exceed ${maxTimeMs}ms, but it was ${received.resolutionTime}ms`
          : `Expected resolution time to be within ${maxTimeMs}ms, but it took ${received.resolutionTime}ms`,
    };
  },
});

// Helper functions for error messages
function getResolutionPlanIssues(plan: any): string {
  const issues: string[] = [];

  if (!plan) {
    issues.push('plan is null/undefined');
  } else {
    if (!plan.rootPackage) issues.push('missing rootPackage');
    if (!Array.isArray(plan.resolvedDependencies))
      issues.push('resolvedDependencies is not an array');
    if (!Array.isArray(plan.installationOrder)) issues.push('installationOrder is not an array');
    if (!Array.isArray(plan.conflicts)) issues.push('conflicts is not an array');
    if (typeof plan.totalPackages !== 'number') issues.push('totalPackages is not a number');
    if (typeof plan.resolutionTime !== 'number') issues.push('resolutionTime is not a number');
    if (plan.totalPackages <= 0) issues.push('totalPackages must be positive');
    if (plan.resolutionTime < 0) issues.push('resolutionTime must be non-negative');
  }

  return issues.join(', ');
}

function getInstallationOrderIssues(order: any): string {
  const issues: string[] = [];

  if (!Array.isArray(order)) {
    issues.push('not an array');
  } else {
    const invalidIds = order.filter((id) => !id || typeof id.toString !== 'function');
    if (invalidIds.length > 0) {
      issues.push(`${invalidIds.length} invalid PackageId(s)`);
    }

    const strings = order.map((id) => id?.toString?.() || 'invalid');
    const duplicates = strings.filter((str, index) => strings.indexOf(str) !== index);
    if (duplicates.length > 0) {
      issues.push(`duplicate packages: ${Array.from(new Set(duplicates)).join(', ')}`);
    }
  }

  return issues.join(', ');
}

function getPackageNames(deps: ResolvedDependency[]): string {
  if (!Array.isArray(deps)) return 'invalid dependencies array';

  return deps
    .map(
      (dep) =>
        dep.resolvedPackage?.getName() || dep.resolvedPackage?.getId()?.toString() || 'unknown',
    )
    .join(', ');
}

function formatCycles(cycles: PackageId[][]): string {
  return cycles.map((cycle) => cycle.map((id) => id.toString()).join(' -> ')).join('; ');
}

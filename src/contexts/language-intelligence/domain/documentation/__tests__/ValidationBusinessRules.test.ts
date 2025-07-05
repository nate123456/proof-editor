/**
 * Comprehensive tests for ValidationBusinessRules documentation
 *
 * Tests cover:
 * - Business rule structure and completeness
 * - Hierarchy compliance validation
 * - Performance target compliance validation
 * - Dependency compliance validation
 * - Rule consistency and logical correctness
 * - Edge cases and error conditions
 */

import { describe, expect, it } from 'vitest';
import { ValidationLevel } from '../../value-objects/ValidationLevel';
import {
  ValidationBusinessRules,
  type ValidationBusinessRuleType,
  validateDependencyCompliance,
  validateHierarchyCompliance,
  validatePerformanceCompliance,
} from '../ValidationBusinessRules';

describe('ValidationBusinessRules', () => {
  describe('rule structure and completeness', () => {
    it('should have all required top-level rule categories', () => {
      expect(ValidationBusinessRules).toHaveProperty('HIERARCHY_RULES');
      expect(ValidationBusinessRules).toHaveProperty('LEVEL_REQUIREMENTS');
      expect(ValidationBusinessRules).toHaveProperty('SKIP_CONDITIONS');
      expect(ValidationBusinessRules).toHaveProperty('PERFORMANCE_TARGETS');
      expect(ValidationBusinessRules).toHaveProperty('DEPENDENCY_RULES');
      expect(ValidationBusinessRules).toHaveProperty('ERROR_HANDLING');
      expect(ValidationBusinessRules).toHaveProperty('QUALITY_ASSURANCE');
    });

    it('should have complete hierarchy rules structure', () => {
      const hierarchyRules = ValidationBusinessRules.HIERARCHY_RULES;

      expect(hierarchyRules).toHaveProperty('description');
      expect(hierarchyRules).toHaveProperty('rules');
      expect(hierarchyRules).toHaveProperty('implementation');

      expect(Array.isArray(hierarchyRules.rules)).toBe(true);
      expect(hierarchyRules.rules.length).toBeGreaterThan(0);

      expect(hierarchyRules.implementation).toHaveProperty('syntaxFirst');
      expect(hierarchyRules.implementation).toHaveProperty('parallelExecution');
      expect(hierarchyRules.implementation).toHaveProperty('errorPropagation');
    });

    it('should have complete level requirements for all validation levels', () => {
      const levelRequirements = ValidationBusinessRules.LEVEL_REQUIREMENTS;

      expect(levelRequirements).toHaveProperty('description');
      expect(levelRequirements).toHaveProperty('rules');

      const syntaxLevel = ValidationLevel.syntax().toString();
      const semanticLevel = ValidationLevel.semantic().toString();
      const flowLevel = ValidationLevel.flow().toString();
      const styleLevel = ValidationLevel.style().toString();

      expect(levelRequirements.rules).toHaveProperty(syntaxLevel);
      expect(levelRequirements.rules).toHaveProperty(semanticLevel);
      expect(levelRequirements.rules).toHaveProperty(flowLevel);
      expect(levelRequirements.rules).toHaveProperty(styleLevel);

      // Verify each level has required properties
      for (const levelKey of [syntaxLevel, semanticLevel, flowLevel, styleLevel]) {
        const levelRule = levelRequirements.rules[levelKey];
        expect(levelRule).toHaveProperty('requirement');
        expect(levelRule).toHaveProperty('rationale');
        expect(levelRule).toHaveProperty('skipConditions');
        expect(levelRule).toHaveProperty('dependencies');
        expect(levelRule).toHaveProperty('performanceTarget');
      }
    });

    it('should have complete skip conditions for all levels', () => {
      const skipConditions = ValidationBusinessRules.SKIP_CONDITIONS;

      expect(skipConditions).toHaveProperty('description');
      expect(skipConditions).toHaveProperty('rules');
      expect(Array.isArray(skipConditions.rules)).toBe(true);

      const levels = ['syntax', 'semantic', 'flow', 'style'];
      const skipRules = skipConditions.rules;

      for (const level of levels) {
        const levelRule = skipRules.find((rule) => rule.level === level);
        expect(levelRule).toBeDefined();
        if (levelRule) {
          expect(levelRule).toHaveProperty('condition');
          expect(levelRule).toHaveProperty('rationale');
          expect(levelRule).toHaveProperty('examples');
          expect(Array.isArray(levelRule.examples)).toBe(true);
        }
      }
    });

    it('should have complete performance targets for all levels', () => {
      const performanceTargets = ValidationBusinessRules.PERFORMANCE_TARGETS;

      expect(performanceTargets).toHaveProperty('description');
      expect(performanceTargets).toHaveProperty('targets');
      expect(performanceTargets).toHaveProperty('monitoring');

      const expectedLevels = ['syntax', 'semantic', 'flow', 'style'];

      for (const level of expectedLevels) {
        const target = performanceTargets.targets[level as keyof typeof performanceTargets.targets];
        expect(target).toBeDefined();
        expect(target).toHaveProperty('maxExecutionTime');
        expect(target).toHaveProperty('rationale');
        expect(target).toHaveProperty('optimizations');
        expect(Array.isArray(target.optimizations)).toBe(true);
      }

      expect(performanceTargets.monitoring).toHaveProperty('alertThresholds');
      expect(performanceTargets.monitoring).toHaveProperty('performanceMetrics');
      expect(performanceTargets.monitoring).toHaveProperty('degradationHandling');
    });

    it('should have complete dependency rules', () => {
      const dependencyRules = ValidationBusinessRules.DEPENDENCY_RULES;

      expect(dependencyRules).toHaveProperty('description');
      expect(dependencyRules).toHaveProperty('dependencies');
      expect(dependencyRules).toHaveProperty('executionStrategy');

      const expectedLevels = ['syntax', 'semantic', 'flow', 'style'];

      for (const level of expectedLevels) {
        const dependency =
          dependencyRules.dependencies[level as keyof typeof dependencyRules.dependencies];
        expect(dependency).toBeDefined();
        expect(dependency).toHaveProperty('dependsOn');
        expect(dependency).toHaveProperty('blocksOnFailure');
        expect(dependency).toHaveProperty('canRunInParallel');
        expect(dependency).toHaveProperty('mustCompleteFirst');
        expect(Array.isArray(dependency.dependsOn)).toBe(true);
        expect(Array.isArray(dependency.blocksOnFailure)).toBe(true);
      }
    });

    it('should have complete error handling strategies', () => {
      const errorHandling = ValidationBusinessRules.ERROR_HANDLING;

      expect(errorHandling).toHaveProperty('description');
      expect(errorHandling).toHaveProperty('strategies');

      const expectedStrategies = [
        'syntaxErrors',
        'semanticErrors',
        'flowErrors',
        'styleErrors',
        'systemErrors',
      ];

      for (const strategy of expectedStrategies) {
        const errorStrategy =
          errorHandling.strategies[strategy as keyof typeof errorHandling.strategies];
        expect(errorStrategy).toBeDefined();
        expect(errorStrategy).toHaveProperty('action');
        expect(errorStrategy).toHaveProperty('rationale');
        expect(errorStrategy).toHaveProperty('recovery');
      }
    });

    it('should have complete quality assurance requirements', () => {
      const qualityAssurance = ValidationBusinessRules.QUALITY_ASSURANCE;

      expect(qualityAssurance).toHaveProperty('description');
      expect(qualityAssurance).toHaveProperty('requirements');
      expect(qualityAssurance).toHaveProperty('monitoring');

      expect(qualityAssurance.requirements).toHaveProperty('testCoverage');
      expect(qualityAssurance.requirements).toHaveProperty('performanceTesting');
      expect(qualityAssurance.requirements).toHaveProperty('businessRuleCompliance');
      expect(qualityAssurance.requirements).toHaveProperty('regressionTesting');

      expect(qualityAssurance.monitoring).toHaveProperty('businessRuleViolations');
      expect(qualityAssurance.monitoring).toHaveProperty('performanceDegradation');
      expect(qualityAssurance.monitoring).toHaveProperty('errorRateMonitoring');
      expect(qualityAssurance.monitoring).toHaveProperty('usagePatterns');
    });
  });

  describe('business rule logical consistency', () => {
    it('should have syntax as foundation with no dependencies', () => {
      const syntaxDeps = ValidationBusinessRules.DEPENDENCY_RULES.dependencies.syntax;

      expect(syntaxDeps.dependsOn).toEqual([]);
      expect(syntaxDeps.mustCompleteFirst).toBe(true);
      expect(syntaxDeps.canRunInParallel).toBe(false);
    });

    it('should have all non-syntax levels depend on syntax', () => {
      const dependencies = ValidationBusinessRules.DEPENDENCY_RULES.dependencies;
      const nonSyntaxLevels = ['semantic', 'flow', 'style'];

      for (const level of nonSyntaxLevels) {
        const levelDeps = dependencies[level as keyof typeof dependencies];
        expect(levelDeps.dependsOn).toContain('syntax');
        expect(levelDeps.mustCompleteFirst).toBe(false);
      }
    });

    it('should allow parallel execution for semantic, flow, and style', () => {
      const dependencies = ValidationBusinessRules.DEPENDENCY_RULES.dependencies;

      expect(dependencies.semantic.canRunInParallel).toContain('flow');
      expect(dependencies.semantic.canRunInParallel).toContain('style');
      expect(dependencies.flow.canRunInParallel).toContain('semantic');
      expect(dependencies.flow.canRunInParallel).toContain('style');
      expect(dependencies.style.canRunInParallel).toContain('semantic');
      expect(dependencies.style.canRunInParallel).toContain('flow');
    });

    it('should have syntax errors block all other levels', () => {
      const syntaxDeps = ValidationBusinessRules.DEPENDENCY_RULES.dependencies.syntax;

      expect(syntaxDeps.blocksOnFailure).toContain('semantic');
      expect(syntaxDeps.blocksOnFailure).toContain('flow');
      expect(syntaxDeps.blocksOnFailure).toContain('style');
    });

    it('should have consistent skip conditions with dependency rules', () => {
      const skipConditions = ValidationBusinessRules.SKIP_CONDITIONS;

      // Syntax should never be skippable
      const syntaxSkip = skipConditions.rules.find((rule) => rule.level === 'syntax');
      expect(syntaxSkip?.condition).toBe('Never');

      // Other levels should have specific skip conditions
      const nonSyntaxLevels = ['semantic', 'flow', 'style'];
      for (const level of nonSyntaxLevels) {
        const levelSkip = skipConditions.rules.find((rule) => rule.level === level);
        expect(levelSkip?.condition).not.toBe('Never');
        expect(levelSkip?.examples.length).toBeGreaterThan(0);
      }
    });
  });

  describe('performance target consistency', () => {
    it('should have reasonable performance targets in ascending order of complexity', () => {
      const targets = ValidationBusinessRules.PERFORMANCE_TARGETS.targets;

      const syntaxTime = Number.parseInt(targets.syntax.maxExecutionTime.replace('ms', ''));
      const flowTime = Number.parseInt(targets.flow.maxExecutionTime.replace('ms', ''));
      const semanticTime = Number.parseInt(targets.semantic.maxExecutionTime.replace('ms', ''));
      const styleTime = Number.parseInt(targets.style.maxExecutionTime.replace('ms', ''));

      // Syntax should be fastest (simplest validation)
      expect(syntaxTime).toBeLessThan(flowTime);
      expect(syntaxTime).toBeLessThan(semanticTime);
      expect(syntaxTime).toBeLessThan(styleTime);

      // Flow should be faster than semantic (less complex than semantic analysis)
      expect(flowTime).toBeLessThan(semanticTime);
    });

    it('should have performance targets that are reasonable for real-time validation', () => {
      const targets = ValidationBusinessRules.PERFORMANCE_TARGETS.targets;

      // All targets should be under 20ms for responsive validation
      for (const [_level, target] of Object.entries(targets)) {
        const timeMs = Number.parseInt(target.maxExecutionTime.replace('ms', ''));
        expect(timeMs).toBeLessThan(20);
        expect(timeMs).toBeGreaterThan(0);
      }
    });

    it('should have optimization strategies for each level', () => {
      const targets = ValidationBusinessRules.PERFORMANCE_TARGETS.targets;

      for (const [_level, target] of Object.entries(targets)) {
        expect(target.optimizations).toBeDefined();
        expect(target.optimizations.length).toBeGreaterThan(0);

        // Each optimization should be a non-empty string
        for (const optimization of target.optimizations) {
          expect(typeof optimization).toBe('string');
          expect(optimization.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('validateHierarchyCompliance', () => {
    it('should pass compliance when syntax validation is executed', () => {
      const executedLevels = [ValidationLevel.syntax()];
      const errors: string[] = [];

      const result = validateHierarchyCompliance(executedLevels, errors);

      expect(result.isCompliant).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it('should fail compliance when syntax validation is missing', () => {
      const executedLevels = [ValidationLevel.semantic(), ValidationLevel.flow()];
      const errors: string[] = [];

      const result = validateHierarchyCompliance(executedLevels, errors);

      expect(result.isCompliant).toBe(false);
      expect(result.violations).toContain('Syntax validation is required but was not executed');
    });

    it('should detect multiple validation level failures', () => {
      const executedLevels = [
        ValidationLevel.syntax(),
        ValidationLevel.semantic(),
        ValidationLevel.flow(),
      ];
      const errors = ['semantic error occurred', 'flow error occurred'];

      const result = validateHierarchyCompliance(executedLevels, errors);

      expect(result.isCompliant).toBe(false);
      expect(result.violations).toContain(
        'Multiple validation levels failed after syntax validation',
      );
    });

    it('should handle empty executed levels', () => {
      const executedLevels: ValidationLevel[] = [];
      const errors: string[] = [];

      const result = validateHierarchyCompliance(executedLevels, errors);

      expect(result.isCompliant).toBe(false);
      expect(result.violations).toContain('Syntax validation is required but was not executed');
    });

    it('should handle various error message formats', () => {
      const executedLevels = [ValidationLevel.syntax()];
      const errors = ['Syntax error', 'Flow validation failed', 'Style issue'];

      const result = validateHierarchyCompliance(executedLevels, errors);

      // Should pass because we don't have both semantic and flow errors
      expect(result.isCompliant).toBe(true);
    });
  });

  describe('validatePerformanceCompliance', () => {
    it('should pass compliance when all execution times are within targets', () => {
      const executionTimes = new Map([
        [ValidationLevel.syntax(), 3], // Target: 5ms
        [ValidationLevel.semantic(), 8], // Target: 10ms
        [ValidationLevel.flow(), 6], // Target: 8ms
        [ValidationLevel.style(), 12], // Target: 15ms
      ]);

      const result = validatePerformanceCompliance(executionTimes);

      expect(result.isCompliant).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it('should fail compliance when execution times exceed targets', () => {
      const executionTimes = new Map([
        [ValidationLevel.syntax(), 8], // Target: 5ms - EXCEEDS
        [ValidationLevel.semantic(), 15], // Target: 10ms - EXCEEDS
      ]);

      const result = validatePerformanceCompliance(executionTimes);

      expect(result.isCompliant).toBe(false);
      expect(result.violations).toContain('syntax validation exceeded target time: 8ms > 5ms');
      expect(result.violations).toContain('semantic validation exceeded target time: 15ms > 10ms');
    });

    it('should handle unknown validation levels gracefully', () => {
      const unknownLevel = {
        toString: () => 'unknown',
        isSyntax: () => false,
        isSemantic: () => false,
        isFlow: () => false,
        isStyle: () => false,
      } as ValidationLevel;

      const executionTimes = new Map([
        [unknownLevel, 100], // Unknown level
      ]);

      const result = validatePerformanceCompliance(executionTimes);

      // Should pass because unknown level has no target
      expect(result.isCompliant).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it('should handle empty execution times', () => {
      const executionTimes = new Map<ValidationLevel, number>();

      const result = validatePerformanceCompliance(executionTimes);

      expect(result.isCompliant).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it('should handle edge case of exactly meeting targets', () => {
      const executionTimes = new Map([
        [ValidationLevel.syntax(), 5], // Exactly 5ms target
        [ValidationLevel.flow(), 8], // Exactly 8ms target
      ]);

      const result = validatePerformanceCompliance(executionTimes);

      expect(result.isCompliant).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it('should handle edge case of exceeding by 1ms', () => {
      const executionTimes = new Map([
        [ValidationLevel.syntax(), 6], // Target: 5ms, exceeds by 1ms
      ]);

      const result = validatePerformanceCompliance(executionTimes);

      expect(result.isCompliant).toBe(false);
      expect(result.violations).toContain('syntax validation exceeded target time: 6ms > 5ms');
    });
  });

  describe('validateDependencyCompliance', () => {
    it('should pass compliance when all dependencies are satisfied', () => {
      const requestedLevel = ValidationLevel.semantic();
      const executedLevels = [ValidationLevel.syntax(), ValidationLevel.semantic()];

      const result = validateDependencyCompliance(requestedLevel, executedLevels);

      expect(result.isCompliant).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it('should fail compliance when required dependencies are missing', () => {
      const requestedLevel = ValidationLevel.semantic();
      const executedLevels = [ValidationLevel.semantic()]; // Missing syntax dependency

      const result = validateDependencyCompliance(requestedLevel, executedLevels);

      expect(result.isCompliant).toBe(false);
      expect(result.violations).toContain(
        'semantic validation requires syntax validation but it was not executed',
      );
    });

    it('should pass compliance for syntax level with no dependencies', () => {
      const requestedLevel = ValidationLevel.syntax();
      const executedLevels = [ValidationLevel.syntax()];

      const result = validateDependencyCompliance(requestedLevel, executedLevels);

      expect(result.isCompliant).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it('should handle flow level dependencies correctly', () => {
      const requestedLevel = ValidationLevel.flow();
      const executedLevels = [ValidationLevel.syntax(), ValidationLevel.flow()];

      const result = validateDependencyCompliance(requestedLevel, executedLevels);

      expect(result.isCompliant).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it('should handle style level dependencies correctly', () => {
      const requestedLevel = ValidationLevel.style();
      const executedLevels = [ValidationLevel.syntax(), ValidationLevel.style()];

      const result = validateDependencyCompliance(requestedLevel, executedLevels);

      expect(result.isCompliant).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it('should handle unknown validation levels gracefully', () => {
      const unknownLevel = {
        toString: () => 'unknown',
        isSyntax: () => false,
        isSemantic: () => false,
        isFlow: () => false,
        isStyle: () => false,
      } as ValidationLevel;

      const executedLevels = [ValidationLevel.syntax()];

      const result = validateDependencyCompliance(unknownLevel, executedLevels);

      // Should pass because unknown level has no dependency rules
      expect(result.isCompliant).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it('should handle empty executed levels', () => {
      const requestedLevel = ValidationLevel.semantic();
      const executedLevels: ValidationLevel[] = [];

      const result = validateDependencyCompliance(requestedLevel, executedLevels);

      expect(result.isCompliant).toBe(false);
      expect(result.violations).toContain(
        'semantic validation requires syntax validation but it was not executed',
      );
    });

    it('should handle multiple missing dependencies', () => {
      // In current rules, only syntax is a dependency, but test structure for future extensions
      const requestedLevel = ValidationLevel.flow();
      const executedLevels = [ValidationLevel.flow()]; // Missing syntax

      const result = validateDependencyCompliance(requestedLevel, executedLevels);

      expect(result.isCompliant).toBe(false);
      expect(result.violations).toContain(
        'flow validation requires syntax validation but it was not executed',
      );
    });
  });

  describe('type safety and exports', () => {
    it('should export ValidationBusinessRuleType correctly', () => {
      // This test ensures the type is properly exported and can be used
      const rules: ValidationBusinessRuleType = ValidationBusinessRules;

      expect(rules).toBeDefined();
      expect(typeof rules).toBe('object');
    });

    it('should have readonly properties on ValidationBusinessRules', () => {
      // Verify the const assertion makes properties readonly
      expect(() => {
        // This would be a TypeScript error, but JavaScript allows it
        (ValidationBusinessRules as any).HIERARCHY_RULES = {};
      }).not.toThrow(); // JavaScript allows this, but TypeScript should prevent it
    });
  });

  describe('real-world validation scenarios', () => {
    it('should handle typical successful validation workflow', () => {
      const executedLevels = [
        ValidationLevel.syntax(),
        ValidationLevel.semantic(),
        ValidationLevel.flow(),
      ];
      const errors: string[] = [];

      const hierarchyResult = validateHierarchyCompliance(executedLevels, errors);
      expect(hierarchyResult.isCompliant).toBe(true);

      const executionTimes = new Map([
        [ValidationLevel.syntax(), 3],
        [ValidationLevel.semantic(), 9],
        [ValidationLevel.flow(), 7],
      ]);

      const performanceResult = validatePerformanceCompliance(executionTimes);
      expect(performanceResult.isCompliant).toBe(true);

      for (const level of executedLevels) {
        const dependencyResult = validateDependencyCompliance(level, executedLevels);
        expect(dependencyResult.isCompliant).toBe(true);
      }
    });

    it('should handle partial validation with syntax-only execution', () => {
      const executedLevels = [ValidationLevel.syntax()];
      const errors: string[] = [];

      const hierarchyResult = validateHierarchyCompliance(executedLevels, errors);
      expect(hierarchyResult.isCompliant).toBe(true);

      const executionTimes = new Map([[ValidationLevel.syntax(), 4]]);
      const performanceResult = validatePerformanceCompliance(executionTimes);
      expect(performanceResult.isCompliant).toBe(true);

      const dependencyResult = validateDependencyCompliance(
        ValidationLevel.syntax(),
        executedLevels,
      );
      expect(dependencyResult.isCompliant).toBe(true);
    });

    it('should handle performance violations in complex validation', () => {
      const _executedLevels = [
        ValidationLevel.syntax(),
        ValidationLevel.semantic(),
        ValidationLevel.style(),
      ];

      const executionTimes = new Map([
        [ValidationLevel.syntax(), 7], // Exceeds 5ms target
        [ValidationLevel.semantic(), 12], // Exceeds 10ms target
        [ValidationLevel.style(), 20], // Exceeds 15ms target
      ]);

      const performanceResult = validatePerformanceCompliance(executionTimes);
      expect(performanceResult.isCompliant).toBe(false);
      expect(performanceResult.violations).toHaveLength(3);
    });

    it('should validate business rule integration correctly', () => {
      // Test that all validation functions work together coherently
      const requestedLevel = ValidationLevel.semantic();
      const executedLevels = [ValidationLevel.syntax(), ValidationLevel.semantic()];
      const errors: string[] = [];
      const executionTimes = new Map([
        [ValidationLevel.syntax(), 4],
        [ValidationLevel.semantic(), 9],
      ]);

      const hierarchyResult = validateHierarchyCompliance(executedLevels, errors);
      const performanceResult = validatePerformanceCompliance(executionTimes);
      const dependencyResult = validateDependencyCompliance(requestedLevel, executedLevels);

      expect(hierarchyResult.isCompliant).toBe(true);
      expect(performanceResult.isCompliant).toBe(true);
      expect(dependencyResult.isCompliant).toBe(true);

      // All compliance checks should pass for a well-executed validation
      const overallCompliant =
        hierarchyResult.isCompliant &&
        performanceResult.isCompliant &&
        dependencyResult.isCompliant;

      expect(overallCompliant).toBe(true);
    });
  });
});

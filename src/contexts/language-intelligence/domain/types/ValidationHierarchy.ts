import type { ValidationContext } from '../services/ValidationPolicyService';
import { ValidationLevel } from '../value-objects/ValidationLevel';

export interface ValidationHierarchyRules {
  getMinimumLevel(context: ValidationContext): ValidationLevel;
  getRequiredLevels(context: ValidationContext): ValidationLevel[];
  canSkipLevel(level: ValidationLevel, context: ValidationContext): boolean;
  getValidationOrder(levels: ValidationLevel[]): ValidationLevel[];
  getDependencies(level: ValidationLevel): ValidationLevel[];
  isLevelCompatibleWith(level1: ValidationLevel, level2: ValidationLevel): boolean;
}

export class ValidationHierarchyService implements ValidationHierarchyRules {
  getMinimumLevel(_context: ValidationContext): ValidationLevel {
    return ValidationLevel.syntax();
  }

  getRequiredLevels(context: ValidationContext): ValidationLevel[] {
    const requiredLevels: ValidationLevel[] = [ValidationLevel.syntax()];

    if (context.needsFlowValidation()) {
      requiredLevels.push(ValidationLevel.flow());
    }

    if (context.requiresSemanticAnalysis()) {
      requiredLevels.push(ValidationLevel.semantic());
    }

    if (context.requiresStyleValidation()) {
      requiredLevels.push(ValidationLevel.style());
    }

    return this.removeDuplicates(requiredLevels);
  }

  canSkipLevel(level: ValidationLevel, context: ValidationContext): boolean {
    if (level.isSyntax()) {
      return false;
    }

    if (level.isSemantic() && this.isStyleOnlyChange(context)) {
      return true;
    }

    if (level.isFlow() && this.isIsolatedStatementChange(context)) {
      return true;
    }

    if (level.isStyle() && context.getContentLength() < 50) {
      return true;
    }

    return false;
  }

  getValidationOrder(levels: ValidationLevel[]): ValidationLevel[] {
    const orderedLevels = [...levels];
    return orderedLevels.sort((a, b) => a.getPriority() - b.getPriority());
  }

  getDependencies(level: ValidationLevel): ValidationLevel[] {
    const dependencies: ValidationLevel[] = [];

    if (level.isSyntax()) {
      return dependencies;
    }

    dependencies.push(ValidationLevel.syntax());

    if (level.isSemantic()) {
      dependencies.push(ValidationLevel.syntax());
    }

    if (level.isFlow()) {
      dependencies.push(ValidationLevel.syntax());
    }

    if (level.isStyle()) {
      dependencies.push(ValidationLevel.syntax());
    }

    return this.removeDuplicates(dependencies);
  }

  isLevelCompatibleWith(level1: ValidationLevel, level2: ValidationLevel): boolean {
    const dependencies1 = this.getDependencies(level1);
    const dependencies2 = this.getDependencies(level2);

    return this.hasNoConflictingDependencies(dependencies1, dependencies2);
  }

  getValidationLevelPerformanceTargets(): Map<ValidationLevel, number> {
    const targets = new Map<ValidationLevel, number>();

    targets.set(ValidationLevel.syntax(), ValidationLevel.syntax().getPerformanceTargetMs());
    targets.set(ValidationLevel.flow(), ValidationLevel.flow().getPerformanceTargetMs());
    targets.set(ValidationLevel.semantic(), ValidationLevel.semantic().getPerformanceTargetMs());
    targets.set(ValidationLevel.style(), ValidationLevel.style().getPerformanceTargetMs());

    return targets;
  }

  getValidationLevelComplexityScore(level: ValidationLevel): number {
    if (level.isSyntax()) return 1;
    if (level.isFlow()) return 2;
    if (level.isSemantic()) return 3;
    if (level.isStyle()) return 1;
    return 0;
  }

  private removeDuplicates(levels: ValidationLevel[]): ValidationLevel[] {
    const seen = new Set<string>();
    return levels.filter((level) => {
      const key = level.toString();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private isStyleOnlyChange(context: ValidationContext): boolean {
    return context.getStatementType() === 'style-only';
  }

  private isIsolatedStatementChange(context: ValidationContext): boolean {
    return context.getStatementType() === 'isolated';
  }

  private hasNoConflictingDependencies(
    _dependencies1: ValidationLevel[],
    _dependencies2: ValidationLevel[],
  ): boolean {
    return true;
  }
}

export const ValidationBusinessRules = {
  HIERARCHY_RULES: {
    description: 'Validation must follow hierarchical order',
    rules: [
      'Syntactic validation must pass before semantic validation',
      'Flow validation requires successful syntactic validation',
      'Style validation can run independently or after semantic validation',
      'Higher level validations include all lower level validations',
    ],
  },

  LEVEL_REQUIREMENTS: {
    description: 'When each validation level is required',
    rules: {
      syntax: 'Always required for all validation requests',
      semantic: 'Required when logical consistency and meaning matter',
      flow: 'Required for proof construction and argument chain validation',
      style: 'Required for presentation and formatting compliance',
    },
  },

  SKIP_CONDITIONS: {
    description: 'When validation levels can be skipped',
    rules: [
      'Syntactic validation cannot be skipped under any circumstances',
      'Semantic validation can be skipped for pure style-only changes',
      'Flow validation can be skipped for isolated statement modifications',
      'Style validation can be skipped for short statements (< 50 characters)',
    ],
  },

  PERFORMANCE_TARGETS: {
    description: 'Performance expectations for each validation level',
    rules: {
      syntax: '5ms maximum execution time',
      flow: '8ms maximum execution time',
      semantic: '10ms maximum execution time',
      style: '15ms maximum execution time',
    },
  },

  DEPENDENCY_RULES: {
    description: 'Dependencies between validation levels',
    rules: [
      'All validation levels depend on successful syntax validation',
      'Semantic validation is independent of flow validation',
      'Style validation is independent of semantic and flow validation',
      'Multiple validation levels can execute in parallel after syntax validation',
    ],
  },
} as const;

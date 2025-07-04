import { err, ok, type Result } from 'neverthrow';
import { injectable } from 'tsyringe';

import { ValidationError } from '../errors/DomainErrors';
import type { PerformanceTracker } from '../value-objects/PerformanceTracker';
import { ValidationLevel } from '../value-objects/ValidationLevel';
import type { ValidationRequest } from '../value-objects/ValidationRequest';

export interface ValidationContext {
  requiresSemanticAnalysis(): boolean;
  hasComplexLogicalStructure(): boolean;
  needsFlowValidation(): boolean;
  requiresStyleValidation(): boolean;
  getContentLength(): number;
  getStatementType(): string;
}

export interface ValidationWorkflow {
  getRequiredLevels(): ValidationLevel[];
  getValidationOrder(): ValidationLevel[];
  canSkipLevel(level: ValidationLevel): boolean;
  shouldExecuteInParallel(): boolean;
}

export interface ComplianceReport {
  isCompliant(): boolean;
  getViolations(): string[];
  getRecommendations(): string[];
}

@injectable()
export class ValidationPolicyService {
  constructor(private performanceTracker: PerformanceTracker) {}

  determineValidationLevel(request: ValidationRequest): Result<ValidationLevel, ValidationError> {
    try {
      const context = this.createValidationContext(request);

      if (context.requiresSemanticAnalysis() && context.hasComplexLogicalStructure()) {
        return ok(ValidationLevel.semantic());
      }

      if (context.needsFlowValidation()) {
        return ok(ValidationLevel.flow());
      }

      if (context.requiresStyleValidation() && context.getContentLength() > 100) {
        return ok(ValidationLevel.style());
      }

      return ok(ValidationLevel.syntax());
    } catch (error) {
      return err(
        new ValidationError(
          'Failed to determine validation level',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  orchestrateValidationWorkflow(
    level: ValidationLevel,
  ): Result<ValidationWorkflow, ValidationError> {
    try {
      if (!level) {
        throw new Error('ValidationLevel is required');
      }
      const workflow = new DefaultValidationWorkflow(level);
      return ok(workflow);
    } catch (error) {
      return err(
        new ValidationError(
          'Failed to orchestrate validation workflow',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  validateBusinessRuleCompliance(
    resultLevel: ValidationLevel,
    requestedLevel: ValidationLevel,
    executedLevels: ValidationLevel[],
  ): Result<ComplianceReport, ValidationError> {
    try {
      if (!resultLevel || !requestedLevel || !executedLevels) {
        throw new Error('All parameters are required for business rule compliance validation');
      }

      const violations: string[] = [];
      const recommendations: string[] = [];

      // Check if syntax validation was executed
      const hasSyntaxValidation = executedLevels.some((level) => level.isSyntax());
      if (!hasSyntaxValidation) {
        violations.push('Syntax validation must always be executed');
      }

      if (requestedLevel.isSemantic() && !this.hasExecutedSemanticDependencies(executedLevels)) {
        violations.push('Semantic validation requires prior syntax validation');
        recommendations.push('Execute syntax validation before semantic validation');
      }

      if (requestedLevel.isFlow() && !this.hasExecutedFlowDependencies(executedLevels)) {
        violations.push('Flow validation requires prior syntax validation');
        recommendations.push('Execute syntax validation before flow validation');
      }

      const report = new DefaultComplianceReport(violations, recommendations);
      return ok(report);
    } catch (error) {
      return err(
        new ValidationError(
          'Failed to validate business rule compliance',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  getValidationLevelRequirements(level: ValidationLevel): ValidationLevel[] {
    const requirements: ValidationLevel[] = [];

    // Always include syntax as it's required for all levels
    requirements.push(ValidationLevel.syntax());

    // Add the specific level if it's not syntax
    if (level.isSemantic()) {
      requirements.push(ValidationLevel.semantic());
    } else if (level.isFlow()) {
      requirements.push(ValidationLevel.flow());
    } else if (level.isStyle()) {
      requirements.push(ValidationLevel.style());
    }

    return requirements;
  }

  private createValidationContext(request: ValidationRequest): ValidationContext {
    return new DefaultValidationContext(request);
  }

  private hasExecutedSemanticDependencies(executedLevels: ValidationLevel[]): boolean {
    return executedLevels.some((level) => level.isSyntax());
  }

  private hasExecutedFlowDependencies(executedLevels: ValidationLevel[]): boolean {
    return executedLevels.some((level) => level.isSyntax());
  }
}

class DefaultValidationContext implements ValidationContext {
  constructor(private request: ValidationRequest) {}

  requiresSemanticAnalysis(): boolean {
    return (
      this.request.getValidationLevel().isSemantic() || this.request.getValidationLevel().isStyle()
    );
  }

  hasComplexLogicalStructure(): boolean {
    const content = this.getContent();
    return (
      content.includes('∀') ||
      content.includes('∃') ||
      content.includes('→') ||
      content.includes('↔') ||
      content.includes('∧') ||
      content.includes('∨')
    );
  }

  needsFlowValidation(): boolean {
    return (
      this.request.getValidationLevel().isFlow() ||
      this.request.getValidationLevel().isSemantic() ||
      this.request.getValidationLevel().isStyle()
    );
  }

  requiresStyleValidation(): boolean {
    return this.request.getValidationLevel().isStyle();
  }

  getContentLength(): number {
    return this.getContent().length;
  }

  getStatementType(): string {
    const content = this.getContent();
    if (content.includes('therefore') || content.includes('∴')) {
      return 'inference';
    }
    if (content.includes('∀') || content.includes('∃')) {
      return 'quantified';
    }
    return 'simple';
  }

  private getContent(): string {
    return this.request.getStatementText();
  }
}

class DefaultValidationWorkflow implements ValidationWorkflow {
  constructor(private level: ValidationLevel) {}

  getRequiredLevels(): ValidationLevel[] {
    return this.level.getIncludedLevels();
  }

  getValidationOrder(): ValidationLevel[] {
    const levels = this.getRequiredLevels();
    return levels.sort((a, b) => a.getPriority() - b.getPriority());
  }

  canSkipLevel(level: ValidationLevel): boolean {
    if (level.isSyntax()) {
      return false;
    }

    if (level.isSemantic() && this.level.isStyle() && this.isStyleOnlyChange()) {
      return true;
    }

    if (level.isFlow() && this.isIsolatedStatementChange()) {
      return true;
    }

    return false;
  }

  shouldExecuteInParallel(): boolean {
    return this.getRequiredLevels().length > 2;
  }

  private isStyleOnlyChange(): boolean {
    return false;
  }

  private isIsolatedStatementChange(): boolean {
    return false;
  }
}

class DefaultComplianceReport implements ComplianceReport {
  constructor(
    private violations: string[],
    private recommendations: string[],
  ) {}

  isCompliant(): boolean {
    return this.violations.length === 0;
  }

  getViolations(): string[] {
    return [...this.violations];
  }

  getRecommendations(): string[] {
    return [...this.recommendations];
  }
}

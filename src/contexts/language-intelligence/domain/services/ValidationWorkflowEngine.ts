import { err, ok, type Result } from 'neverthrow';
import { injectable } from 'tsyringe';

import { ValidationResult } from '../entities/ValidationResult';
import { ValidationError } from '../errors/DomainErrors';
import type { IValidationPolicy, ValidationTarget } from '../policies/ValidationPolicies';
import type { ValidationHierarchyService } from '../types/ValidationHierarchy';
import type { ValidationLevel } from '../value-objects/ValidationLevel';
import { ValidationMetrics } from '../value-objects/ValidationMetrics';
import type { ValidationRequest } from '../value-objects/ValidationRequest';
import type { ValidationPolicyService } from './ValidationPolicyService';

export interface ValidationStep {
  level: ValidationLevel;
  policy: string;
  result: Result<ValidationResult, ValidationError>;
  executionTimeMs: number;
  startTime: number;
  endTime: number;
}

export class ValidationWorkflowResult {
  constructor(
    private readonly steps: ValidationStep[],
    private readonly totalExecutionTime: number,
    private readonly finalResult: ValidationResult,
  ) {}

  getSteps(): ValidationStep[] {
    return [...this.steps];
  }

  getTotalExecutionTime(): number {
    return this.totalExecutionTime;
  }

  getFinalResult(): ValidationResult {
    return this.finalResult;
  }

  getExecutedLevels(): ValidationLevel[] {
    return this.steps.map((step) => step.level);
  }

  hasErrors(): boolean {
    return this.steps.some(
      (step) =>
        step.result.isOk() &&
        step.result.value.getDiagnostics().some((d) => d.getSeverity().isError()),
    );
  }

  getAggregatedDiagnostics() {
    const allDiagnostics = [];
    for (const step of this.steps) {
      if (step.result.isOk()) {
        allDiagnostics.push(...step.result.value.getDiagnostics());
      }
    }
    return allDiagnostics;
  }
}

@injectable()
export class ValidationWorkflowEngine {
  constructor(
    private policyService: ValidationPolicyService,
    private hierarchyService: ValidationHierarchyService,
    private policies: Map<ValidationLevel, IValidationPolicy[]>,
  ) {}

  async executeValidationWorkflow(
    request: ValidationRequest,
    target: ValidationTarget,
  ): Promise<Result<ValidationWorkflowResult, ValidationError>> {
    const workflowStartTime = performance.now();

    try {
      const context = this.createValidationContext(request);

      const requiredLevelsResult = this.hierarchyService.getRequiredLevels(context);
      const orderedLevels = this.hierarchyService.getValidationOrder(requiredLevelsResult);

      const steps: ValidationStep[] = [];
      let hasBlockingError = false;

      for (const level of orderedLevels) {
        if (hasBlockingError && this.isLevelBlockedByPrevious(level)) {
          continue;
        }

        if (this.hierarchyService.canSkipLevel(level, context)) {
          continue;
        }

        const levelPolicies = this.policies.get(level) || [];

        for (const policy of levelPolicies) {
          if (!policy.applies(context)) {
            continue;
          }

          const stepStartTime = performance.now();
          const policyResult = await policy.execute(target);
          const stepEndTime = performance.now();

          const step: ValidationStep = {
            level,
            policy: policy.name,
            result: policyResult,
            executionTimeMs: stepEndTime - stepStartTime,
            startTime: stepStartTime,
            endTime: stepEndTime,
          };

          steps.push(step);

          if (policyResult.isErr()) {
            hasBlockingError = true;
            break;
          }

          if (policyResult.isOk() && this.hasBlockingErrors(policyResult.value)) {
            hasBlockingError = true;
            break;
          }
        }

        if (hasBlockingError && this.shouldStopOnError(level)) {
          break;
        }
      }

      const workflowEndTime = performance.now();
      const totalExecutionTime = workflowEndTime - workflowStartTime;

      const finalResult = this.aggregateResults(steps, request.getValidationLevel());
      if (finalResult.isErr()) {
        return err(finalResult.error);
      }

      const workflowResult = new ValidationWorkflowResult(
        steps,
        totalExecutionTime,
        finalResult.value,
      );

      return ok(workflowResult);
    } catch (error) {
      return err(
        new ValidationError(
          'Validation workflow execution failed',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  async validateWorkflowCompliance(
    workflowResult: ValidationWorkflowResult,
    originalRequest: ValidationRequest,
  ): Promise<Result<boolean, ValidationError>> {
    try {
      const executedLevels = workflowResult.getExecutedLevels();
      const requestedLevel = originalRequest.getValidationLevel();
      const finalLevel = workflowResult.getFinalResult().getLevel();

      const complianceResult = await this.policyService.validateBusinessRuleCompliance(
        finalLevel,
        requestedLevel,
        executedLevels,
      );

      if (complianceResult.isErr()) {
        return err(complianceResult.error);
      }

      return ok(complianceResult.value.isCompliant());
    } catch (error) {
      return err(
        new ValidationError(
          'Workflow compliance validation failed',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  getWorkflowMetrics(workflowResult: ValidationWorkflowResult) {
    const steps = workflowResult.getSteps();
    const totalTime = workflowResult.getTotalExecutionTime();
    const levelTimes = new Map<string, number>();
    const policyTimes = new Map<string, number>();

    for (const step of steps) {
      const levelKey = step.level.toString();
      const existingLevelTime = levelTimes.get(levelKey) || 0;
      levelTimes.set(levelKey, existingLevelTime + step.executionTimeMs);

      const existingPolicyTime = policyTimes.get(step.policy) || 0;
      policyTimes.set(step.policy, existingPolicyTime + step.executionTimeMs);
    }

    return {
      totalExecutionTime: totalTime,
      stepCount: steps.length,
      levelExecutionTimes: levelTimes,
      policyExecutionTimes: policyTimes,
      hasErrors: workflowResult.hasErrors(),
      diagnosticCount: workflowResult.getAggregatedDiagnostics().length,
    };
  }

  private createValidationContext(request: ValidationRequest) {
    return {
      requiresSemanticAnalysis: () => request.getValidationLevel().isSemantic(),
      hasComplexLogicalStructure: () => false,
      needsFlowValidation: () => request.getValidationLevel().isFlow(),
      requiresStyleValidation: () => request.getValidationLevel().isStyle(),
      getContentLength: () => 100,
      getStatementType: () => 'simple',
    };
  }

  private isLevelBlockedByPrevious(level: ValidationLevel): boolean {
    // Only semantic level is blocked by previous (syntax) errors
    // Flow level can continue even if semantic level had errors
    return level.isSemantic();
  }

  private hasBlockingErrors(result: ValidationResult): boolean {
    return result.getDiagnostics().some((d) => d.getSeverity().isError());
  }

  private shouldStopOnError(level: ValidationLevel): boolean {
    return level.isSyntax();
  }

  private aggregateResults(
    steps: ValidationStep[],
    requestedLevel: ValidationLevel,
  ): Result<ValidationResult, ValidationError> {
    const allDiagnostics = this.getAggregatedDiagnostics(steps);
    const totalExecutionTime = steps.reduce((sum, step) => sum + step.executionTimeMs, 0);
    const hasErrors = steps.some(
      (step) => step.result.isOk() && this.hasBlockingErrors(step.result.value),
    );

    const documentId = `workflow-${Date.now()}`;
    const packageId = steps[0]?.result.isOk()
      ? steps[0].result.value.getLanguagePackageId()
      : 'default-package';

    const metricsResult = ValidationMetrics.create(
      totalExecutionTime,
      allDiagnostics.length,
      100, // contentLength
      steps.length, // ruleCount
    );

    if (metricsResult.isErr()) {
      return err(metricsResult.error);
    }

    if (hasErrors) {
      return ValidationResult.createFailedValidation(
        requestedLevel,
        allDiagnostics,
        documentId,
        packageId,
        metricsResult.value,
      );
    }

    return ValidationResult.createSuccessfulValidation(
      requestedLevel,
      documentId,
      packageId,
      metricsResult.value,
    );
  }

  private getAggregatedDiagnostics(steps: ValidationStep[]) {
    const allDiagnostics = [];
    for (const step of steps) {
      if (step.result.isOk()) {
        allDiagnostics.push(...step.result.value.getDiagnostics());
      }
    }
    return allDiagnostics;
  }
}

/**
 * Comprehensive tests for ValidationWorkflowEngine
 *
 * Tests cover:
 * - Validation workflow execution and orchestration
 * - Step execution with timing and result aggregation
 * - Error handling and blocking behavior
 * - Workflow compliance validation
 * - Metrics collection and performance tracking
 * - Policy integration and hierarchy service interaction
 * - Edge cases and error scenarios
 */

import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidationResult } from '../../entities/ValidationResult';
import { ValidationError } from '../../errors/DomainErrors';
import type { IValidationPolicy, ValidationTarget } from '../../policies/ValidationPolicies';
import type { ValidationHierarchyService } from '../../types/ValidationHierarchy';
import { ValidationLevel } from '../../value-objects/ValidationLevel';
import { ValidationMetrics } from '../../value-objects/ValidationMetrics';
import type { ValidationRequest } from '../../value-objects/ValidationRequest';
import type { ValidationPolicyService } from '../ValidationPolicyService';
import {
  type ValidationStep,
  ValidationWorkflowEngine,
  ValidationWorkflowResult,
} from '../ValidationWorkflowEngine';

// Mock implementations for testing
class MockValidationPolicy implements IValidationPolicy {
  public readonly level: ValidationLevel;
  public readonly description: string;

  constructor(
    public name: string,
    private shouldApply: boolean = true,
    private resultToReturn: any = null,
    private executionTimeMs: number = 10,
  ) {
    this.level = ValidationLevel.syntax();
    this.description = `Mock validation policy: ${name}`;
  }

  applies(_context: any): boolean {
    return this.shouldApply;
  }

  async execute(_target: ValidationTarget): Promise<any> {
    // Advance mock time by the configured execution time for deterministic testing
    (globalThis as any).__advanceMockTime?.(this.executionTimeMs);

    if (this.resultToReturn) {
      return this.resultToReturn;
    }

    const metricsResult = ValidationMetrics.create(this.executionTimeMs, 0, 100, 1);
    if (metricsResult.isErr()) {
      return err(metricsResult.error);
    }

    const validationResult = ValidationResult.createSuccessfulValidation(
      ValidationLevel.syntax(),
      'test-doc',
      'test-package',
      metricsResult.value,
    );

    return validationResult; // This already returns Result<ValidationResult, ValidationError>
  }
}

describe('ValidationWorkflowEngine', () => {
  let engine: ValidationWorkflowEngine;
  let mockPolicyService: ValidationPolicyService;
  let mockHierarchyService: ValidationHierarchyService;
  let mockPolicies: Map<ValidationLevel, IValidationPolicy[]>;
  let mockRequest: ValidationRequest;
  let mockTarget: ValidationTarget;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock performance.now() for deterministic timing
    // This ensures that execution times match the configured mock policy times
    let mockTime = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => {
      return mockTime;
    });

    // Helper to advance mock time (used by MockValidationPolicy)
    (globalThis as any).__advanceMockTime = (ms: number) => {
      mockTime += ms;
    };

    // Mock PolicyService with proper typing
    mockPolicyService = {
      validateBusinessRuleCompliance: vi.fn().mockResolvedValue(ok({ isCompliant: () => true })),
    } as unknown as ValidationPolicyService;

    // Mock HierarchyService with proper typing
    mockHierarchyService = {
      getRequiredLevels: vi.fn().mockReturnValue([]),
      getValidationOrder: vi.fn().mockReturnValue([]),
      canSkipLevel: vi.fn().mockReturnValue(false),
    } as unknown as ValidationHierarchyService;

    // Mock policies map
    mockPolicies = new Map();

    // Mock request
    mockRequest = {
      getValidationLevel: vi.fn().mockReturnValue(ValidationLevel.syntax()),
    } as any;

    // Mock target
    mockTarget = {
      content: 'test content',
      metadata: {},
    } as any;

    engine = new ValidationWorkflowEngine(mockPolicyService, mockHierarchyService, mockPolicies);
  });

  describe('ValidationWorkflowResult', () => {
    it('should create workflow result with steps and metrics', () => {
      const mockValidationResult = {
        getDiagnostics: vi.fn().mockReturnValue([]),
      } as any;

      const mockStep: ValidationStep = {
        level: ValidationLevel.syntax(),
        policy: 'test-policy',
        result: ok(mockValidationResult),
        executionTimeMs: 10,
        startTime: 100,
        endTime: 110,
      };

      const steps = [mockStep];
      const totalTime = 50;
      const finalResult = mockValidationResult;

      const workflowResult = new ValidationWorkflowResult(steps, totalTime, finalResult);

      expect(workflowResult.getSteps()).toEqual(steps);
      expect(workflowResult.getTotalExecutionTime()).toBe(totalTime);
      expect(workflowResult.getFinalResult()).toBe(finalResult);
    });

    it('should return executed levels from steps', () => {
      const mockValidationResult = {
        getDiagnostics: vi.fn().mockReturnValue([]),
      } as any;

      const steps: ValidationStep[] = [
        {
          level: ValidationLevel.syntax(),
          policy: 'syntax-policy',
          result: ok(mockValidationResult),
          executionTimeMs: 5,
          startTime: 100,
          endTime: 105,
        },
        {
          level: ValidationLevel.semantic(),
          policy: 'semantic-policy',
          result: ok(mockValidationResult),
          executionTimeMs: 8,
          startTime: 105,
          endTime: 113,
        },
      ];

      const workflowResult = new ValidationWorkflowResult(steps, 20, mockValidationResult);
      const executedLevels = workflowResult.getExecutedLevels();

      expect(executedLevels).toHaveLength(2);
      expect(executedLevels[0]).toEqual(ValidationLevel.syntax());
      expect(executedLevels[1]).toEqual(ValidationLevel.semantic());
    });

    it('should detect errors in validation results', () => {
      const mockDiagnostic = {
        getSeverity: vi.fn().mockReturnValue({ isError: vi.fn().mockReturnValue(true) }),
      };

      const errorResult = {
        getDiagnostics: vi.fn().mockReturnValue([mockDiagnostic]),
      } as any;

      const steps: ValidationStep[] = [
        {
          level: ValidationLevel.syntax(),
          policy: 'syntax-policy',
          result: ok(errorResult),
          executionTimeMs: 5,
          startTime: 100,
          endTime: 105,
        },
      ];

      const mockFinalResult = {
        getDiagnostics: vi.fn().mockReturnValue([]),
      } as any;

      const workflowResult = new ValidationWorkflowResult(steps, 10, mockFinalResult);

      expect(workflowResult.hasErrors()).toBe(true);
    });

    it('should aggregate diagnostics from all steps', () => {
      const mockDiagnostic1 = { message: 'Error 1' };
      const mockDiagnostic2 = { message: 'Error 2' };

      const result1 = {
        getDiagnostics: vi.fn().mockReturnValue([mockDiagnostic1]),
      } as any;

      const result2 = {
        getDiagnostics: vi.fn().mockReturnValue([mockDiagnostic2]),
      } as any;

      const steps: ValidationStep[] = [
        {
          level: ValidationLevel.syntax(),
          policy: 'policy1',
          result: ok(result1),
          executionTimeMs: 5,
          startTime: 100,
          endTime: 105,
        },
        {
          level: ValidationLevel.semantic(),
          policy: 'policy2',
          result: ok(result2),
          executionTimeMs: 8,
          startTime: 105,
          endTime: 113,
        },
      ];

      const mockFinalResult = {
        getDiagnostics: vi.fn().mockReturnValue([]),
      } as any;

      const workflowResult = new ValidationWorkflowResult(steps, 20, mockFinalResult);
      const aggregatedDiagnostics = workflowResult.getAggregatedDiagnostics();

      expect(aggregatedDiagnostics).toHaveLength(2);
      expect(aggregatedDiagnostics).toContain(mockDiagnostic1);
      expect(aggregatedDiagnostics).toContain(mockDiagnostic2);
    });
  });

  describe('executeValidationWorkflow', () => {
    let syntaxLevel: ValidationLevel;
    let semanticLevel: ValidationLevel;

    beforeEach(() => {
      // Use the same ValidationLevel instances for consistency
      syntaxLevel = ValidationLevel.syntax();
      semanticLevel = ValidationLevel.semantic();

      // Set up default mock responses
      (mockHierarchyService.getRequiredLevels as any).mockReturnValue([syntaxLevel]);
      (mockHierarchyService.getValidationOrder as any).mockReturnValue([syntaxLevel]);
      (mockHierarchyService.canSkipLevel as any).mockReturnValue(false);

      // Update mock request to return the same instance
      mockRequest.getValidationLevel = vi.fn().mockReturnValue(syntaxLevel);
    });

    it('should execute simple workflow successfully', async () => {
      const syntaxPolicy = new MockValidationPolicy('syntax-policy');
      mockPolicies.set(syntaxLevel, [syntaxPolicy]);

      const result = await engine.executeValidationWorkflow(mockRequest, mockTarget);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const workflowResult = result.value;
        expect(workflowResult.getSteps()).toHaveLength(1);
        expect(workflowResult.getSteps()[0]?.policy).toBe('syntax-policy');
        expect(workflowResult.getTotalExecutionTime()).toBeGreaterThan(0);
      }
    });

    it('should execute multiple validation levels in order', async () => {
      const syntaxPolicy = new MockValidationPolicy('syntax-policy');
      const semanticPolicy = new MockValidationPolicy('semantic-policy');

      mockPolicies.set(syntaxLevel, [syntaxPolicy]);
      mockPolicies.set(semanticLevel, [semanticPolicy]);

      (mockHierarchyService.getRequiredLevels as any).mockReturnValue([syntaxLevel, semanticLevel]);
      (mockHierarchyService.getValidationOrder as any).mockReturnValue([
        syntaxLevel,
        semanticLevel,
      ]);

      const result = await engine.executeValidationWorkflow(mockRequest, mockTarget);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const workflowResult = result.value;
        const steps = workflowResult.getSteps();
        expect(steps).toHaveLength(2);
        expect(steps[0]?.policy).toBe('syntax-policy');
        expect(steps[1]?.policy).toBe('semantic-policy');
      }
    });

    it('should skip levels when hierarchy service indicates', async () => {
      const syntaxPolicy = new MockValidationPolicy('syntax-policy');
      const semanticPolicy = new MockValidationPolicy('semantic-policy');

      // Use the same instances for Map keys and mock return values
      const syntaxLevelInstance = ValidationLevel.syntax();
      const semanticLevelInstance = ValidationLevel.semantic();

      mockPolicies.set(syntaxLevelInstance, [syntaxPolicy]);
      mockPolicies.set(semanticLevelInstance, [semanticPolicy]);

      (mockHierarchyService.getRequiredLevels as any).mockReturnValue([
        syntaxLevelInstance,
        semanticLevelInstance,
      ]);
      (mockHierarchyService.getValidationOrder as any).mockReturnValue([
        syntaxLevelInstance,
        semanticLevelInstance,
      ]);

      // Skip semantic level
      (mockHierarchyService.canSkipLevel as any).mockImplementation((level: ValidationLevel) =>
        level.isSemantic(),
      );

      const result = await engine.executeValidationWorkflow(mockRequest, mockTarget);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const workflowResult = result.value;
        const steps = workflowResult.getSteps();
        expect(steps).toHaveLength(1);
        expect(steps[0]?.policy).toBe('syntax-policy');
      }
    });

    it('should skip policies that do not apply', async () => {
      const applicablePolicy = new MockValidationPolicy('applicable-policy', true);
      const nonApplicablePolicy = new MockValidationPolicy('non-applicable-policy', false);

      const syntaxLevelInstance = ValidationLevel.syntax();
      mockPolicies.set(syntaxLevelInstance, [applicablePolicy, nonApplicablePolicy]);

      (mockHierarchyService.getRequiredLevels as any).mockReturnValue([syntaxLevelInstance]);
      (mockHierarchyService.getValidationOrder as any).mockReturnValue([syntaxLevelInstance]);

      const result = await engine.executeValidationWorkflow(mockRequest, mockTarget);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const workflowResult = result.value;
        const steps = workflowResult.getSteps();
        expect(steps).toHaveLength(1);
        expect(steps[0]?.policy).toBe('applicable-policy');
      }
    });

    it('should handle policy execution errors gracefully', async () => {
      const errorPolicy = new MockValidationPolicy('error-policy');
      errorPolicy.execute = vi.fn().mockResolvedValue(err(new ValidationError('Policy failed')));

      const syntaxLevelInstance = ValidationLevel.syntax();
      mockPolicies.set(syntaxLevelInstance, [errorPolicy]);

      (mockHierarchyService.getRequiredLevels as any).mockReturnValue([syntaxLevelInstance]);
      (mockHierarchyService.getValidationOrder as any).mockReturnValue([syntaxLevelInstance]);

      const result = await engine.executeValidationWorkflow(mockRequest, mockTarget);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const workflowResult = result.value;
        const steps = workflowResult.getSteps();
        expect(steps).toHaveLength(1);
        expect(steps[0]?.result.isErr()).toBe(true);
      }
    });

    it('should stop execution on blocking errors for syntax level', async () => {
      const syntaxPolicy = new MockValidationPolicy('syntax-policy');
      const semanticPolicy = new MockValidationPolicy('semantic-policy');

      // Make syntax policy return error
      syntaxPolicy.execute = vi.fn().mockResolvedValue(err(new ValidationError('Syntax error')));

      const syntaxLevelInstance = ValidationLevel.syntax();
      const semanticLevelInstance = ValidationLevel.semantic();

      mockPolicies.set(syntaxLevelInstance, [syntaxPolicy]);
      mockPolicies.set(semanticLevelInstance, [semanticPolicy]);

      (mockHierarchyService.getRequiredLevels as any).mockReturnValue([
        syntaxLevelInstance,
        semanticLevelInstance,
      ]);
      (mockHierarchyService.getValidationOrder as any).mockReturnValue([
        syntaxLevelInstance,
        semanticLevelInstance,
      ]);

      const result = await engine.executeValidationWorkflow(mockRequest, mockTarget);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const workflowResult = result.value;
        const steps = workflowResult.getSteps();
        // Should only execute syntax policy due to blocking error
        expect(steps).toHaveLength(1);
        expect(steps[0]?.policy).toBe('syntax-policy');
      }
    });

    it('should continue execution for non-blocking errors', async () => {
      const semanticPolicy = new MockValidationPolicy('semantic-policy');
      const flowPolicy = new MockValidationPolicy('flow-policy');

      // Make semantic policy return error but not blocking for flow
      semanticPolicy.execute = vi
        .fn()
        .mockResolvedValue(err(new ValidationError('Semantic error')));

      const semanticLevelInstance = ValidationLevel.semantic();
      const flowLevelInstance = ValidationLevel.flow();

      mockPolicies.set(semanticLevelInstance, [semanticPolicy]);
      mockPolicies.set(flowLevelInstance, [flowPolicy]);

      (mockHierarchyService.getRequiredLevels as any).mockReturnValue([
        semanticLevelInstance,
        flowLevelInstance,
      ]);
      (mockHierarchyService.getValidationOrder as any).mockReturnValue([
        semanticLevelInstance,
        flowLevelInstance,
      ]);

      const result = await engine.executeValidationWorkflow(mockRequest, mockTarget);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const workflowResult = result.value;
        const steps = workflowResult.getSteps();
        expect(steps).toHaveLength(2);
        expect(steps[0]?.policy).toBe('semantic-policy');
        expect(steps[1]?.policy).toBe('flow-policy');
      }
    });

    it('should measure execution times accurately', async () => {
      const slowPolicy = new MockValidationPolicy('slow-policy', true, null, 50);

      const syntaxLevelInstance = ValidationLevel.syntax();
      mockPolicies.set(syntaxLevelInstance, [slowPolicy]);

      (mockHierarchyService.getRequiredLevels as any).mockReturnValue([syntaxLevelInstance]);
      (mockHierarchyService.getValidationOrder as any).mockReturnValue([syntaxLevelInstance]);

      const result = await engine.executeValidationWorkflow(mockRequest, mockTarget);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const workflowResult = result.value;
        const steps = workflowResult.getSteps();
        expect(steps[0]?.executionTimeMs).toBeGreaterThanOrEqual(50);
        expect(workflowResult.getTotalExecutionTime()).toBeGreaterThanOrEqual(50);
      }
    });

    it('should handle workflow execution exceptions', async () => {
      // Force an exception during workflow execution
      (mockHierarchyService.getRequiredLevels as any).mockImplementation(() => {
        throw new Error('Hierarchy service error');
      });

      const result = await engine.executeValidationWorkflow(mockRequest, mockTarget);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error?.message).toBe('Validation workflow execution failed');
      }
    });

    it('should handle empty policies for a level', async () => {
      // No policies for syntax level
      mockPolicies.set(ValidationLevel.syntax(), []);

      const result = await engine.executeValidationWorkflow(mockRequest, mockTarget);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const workflowResult = result.value;
        expect(workflowResult.getSteps()).toHaveLength(0);
      }
    });
  });

  describe('validateWorkflowCompliance', () => {
    it('should validate workflow compliance successfully', async () => {
      const mockComplianceResult = {
        isCompliant: vi.fn().mockReturnValue(true),
      };

      (mockPolicyService.validateBusinessRuleCompliance as any).mockResolvedValue(
        ok(mockComplianceResult as any),
      );

      const workflowResult = new ValidationWorkflowResult([], 10, {
        getLevel: vi.fn().mockReturnValue(ValidationLevel.syntax()),
      } as any);

      const result = await engine.validateWorkflowCompliance(workflowResult, mockRequest);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(true);
      }

      expect(mockPolicyService.validateBusinessRuleCompliance).toHaveBeenCalled();
    });

    it('should handle compliance validation failure', async () => {
      const mockComplianceResult = {
        isCompliant: vi.fn().mockReturnValue(false),
      };

      (mockPolicyService.validateBusinessRuleCompliance as any).mockResolvedValue(
        ok(mockComplianceResult as any),
      );

      const workflowResult = new ValidationWorkflowResult([], 10, {
        getLevel: vi.fn().mockReturnValue(ValidationLevel.syntax()),
      } as any);

      const result = await engine.validateWorkflowCompliance(workflowResult, mockRequest);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(false);
      }
    });

    it('should handle compliance service errors', async () => {
      (mockPolicyService.validateBusinessRuleCompliance as any).mockResolvedValue(
        err(new ValidationError('Compliance validation failed')),
      );

      const workflowResult = new ValidationWorkflowResult([], 10, {
        getLevel: vi.fn().mockReturnValue(ValidationLevel.syntax()),
      } as any);

      const result = await engine.validateWorkflowCompliance(workflowResult, mockRequest);

      expect(result.isErr()).toBe(true);
    });

    it('should handle compliance validation exceptions', async () => {
      (mockPolicyService.validateBusinessRuleCompliance as any).mockImplementation(() => {
        throw new Error('Service exception');
      });

      const workflowResult = new ValidationWorkflowResult([], 10, {
        getLevel: vi.fn().mockReturnValue(ValidationLevel.syntax()),
      } as any);

      const result = await engine.validateWorkflowCompliance(workflowResult, mockRequest);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error?.message).toBe('Workflow compliance validation failed');
      }
    });
  });

  describe('getWorkflowMetrics', () => {
    it('should calculate workflow metrics correctly', () => {
      const mockValidationResult = {
        getDiagnostics: vi.fn().mockReturnValue([]),
      } as any;

      const steps: ValidationStep[] = [
        {
          level: ValidationLevel.syntax(),
          policy: 'syntax-policy',
          result: ok(mockValidationResult),
          executionTimeMs: 5,
          startTime: 100,
          endTime: 105,
        },
        {
          level: ValidationLevel.semantic(),
          policy: 'semantic-policy',
          result: ok(mockValidationResult),
          executionTimeMs: 8,
          startTime: 105,
          endTime: 113,
        },
        {
          level: ValidationLevel.syntax(),
          policy: 'another-syntax-policy',
          result: ok(mockValidationResult),
          executionTimeMs: 3,
          startTime: 113,
          endTime: 116,
        },
      ];

      const workflowResult = new ValidationWorkflowResult(steps, 20, mockValidationResult);
      const metrics = engine.getWorkflowMetrics(workflowResult);

      expect(metrics.totalExecutionTime).toBe(20);
      expect(metrics.stepCount).toBe(3);
      expect(metrics.levelExecutionTimes.get('syntax')).toBe(8); // 5 + 3
      expect(metrics.levelExecutionTimes.get('semantic')).toBe(8);
      expect(metrics.policyExecutionTimes.get('syntax-policy')).toBe(5);
      expect(metrics.policyExecutionTimes.get('semantic-policy')).toBe(8);
      expect(metrics.policyExecutionTimes.get('another-syntax-policy')).toBe(3);
    });

    it('should detect errors in workflow metrics', () => {
      const mockDiagnostic = {
        getSeverity: vi.fn().mockReturnValue({ isError: vi.fn().mockReturnValue(true) }),
      };

      const errorResult = {
        getDiagnostics: vi.fn().mockReturnValue([mockDiagnostic]),
      } as any;

      const steps: ValidationStep[] = [
        {
          level: ValidationLevel.syntax(),
          policy: 'syntax-policy',
          result: ok(errorResult),
          executionTimeMs: 5,
          startTime: 100,
          endTime: 105,
        },
      ];

      const mockFinalResult = {
        getDiagnostics: vi.fn().mockReturnValue([]),
      } as any;

      const workflowResult = new ValidationWorkflowResult(steps, 10, mockFinalResult);
      const metrics = engine.getWorkflowMetrics(workflowResult);

      expect(metrics.hasErrors).toBe(true);
      expect(metrics.diagnosticCount).toBe(1);
    });

    it('should handle empty workflow metrics', () => {
      const mockFinalResult = {
        getDiagnostics: vi.fn().mockReturnValue([]),
      } as any;

      const workflowResult = new ValidationWorkflowResult([], 0, mockFinalResult);
      const metrics = engine.getWorkflowMetrics(workflowResult);

      expect(metrics.totalExecutionTime).toBe(0);
      expect(metrics.stepCount).toBe(0);
      expect(metrics.levelExecutionTimes.size).toBe(0);
      expect(metrics.policyExecutionTimes.size).toBe(0);
      expect(metrics.hasErrors).toBe(false);
      expect(metrics.diagnosticCount).toBe(0);
    });
  });

  describe('private methods and edge cases', () => {
    it('should create validation context correctly', async () => {
      const syntaxPolicy = new MockValidationPolicy('syntax-policy');
      mockPolicies.set(ValidationLevel.syntax(), [syntaxPolicy]);

      // Use spy to verify context creation
      const createContextSpy = vi.spyOn(engine as any, 'createValidationContext');

      await engine.executeValidationWorkflow(mockRequest, mockTarget);

      expect(createContextSpy).toHaveBeenCalledWith(mockRequest);
    });

    it('should handle result aggregation with no steps', async () => {
      (mockHierarchyService.getRequiredLevels as any).mockReturnValue([]);
      (mockHierarchyService.getValidationOrder as any).mockReturnValue([]);

      const result = await engine.executeValidationWorkflow(mockRequest, mockTarget);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const workflowResult = result.value;
        expect(workflowResult.getSteps()).toHaveLength(0);
      }
    });

    it('should handle metrics creation failure in aggregation', async () => {
      const syntaxPolicy = new MockValidationPolicy('syntax-policy');
      mockPolicies.set(ValidationLevel.syntax(), [syntaxPolicy]);

      // Mock ValidationMetrics.create to return error
      const originalCreate = ValidationMetrics.create;
      ValidationMetrics.create = vi.fn().mockReturnValue(err(new ValidationError('Metrics error')));

      const result = await engine.executeValidationWorkflow(mockRequest, mockTarget);

      expect(result.isErr()).toBe(true);

      // Restore original method
      ValidationMetrics.create = originalCreate;
    });

    it('should detect blocking errors correctly', () => {
      const mockDiagnostic = {
        getSeverity: vi.fn().mockReturnValue({ isError: vi.fn().mockReturnValue(true) }),
      };

      const errorResult = {
        getDiagnostics: vi.fn().mockReturnValue([mockDiagnostic]),
      } as any;

      const hasBlockingErrors = (engine as any).hasBlockingErrors(errorResult);
      expect(hasBlockingErrors).toBe(true);
    });

    it('should determine when to stop on error correctly', () => {
      const shouldStopOnSyntaxError = (engine as any).shouldStopOnError(ValidationLevel.syntax());
      const shouldStopOnSemanticError = (engine as any).shouldStopOnError(
        ValidationLevel.semantic(),
      );

      expect(shouldStopOnSyntaxError).toBe(true);
      expect(shouldStopOnSemanticError).toBe(false);
    });

    it('should determine level blocking correctly', () => {
      const isSyntaxBlocked = (engine as any).isLevelBlockedByPrevious(ValidationLevel.syntax());
      const isSemanticBlocked = (engine as any).isLevelBlockedByPrevious(
        ValidationLevel.semantic(),
      );
      const isFlowBlocked = (engine as any).isLevelBlockedByPrevious(ValidationLevel.flow());

      expect(isSyntaxBlocked).toBe(false);
      expect(isSemanticBlocked).toBe(true);
      expect(isFlowBlocked).toBe(false); // Flow level can continue even after semantic errors
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex workflow with multiple levels and policies', async () => {
      const syntaxPolicy1 = new MockValidationPolicy('syntax-policy-1', true, null, 5);
      const syntaxPolicy2 = new MockValidationPolicy('syntax-policy-2', true, null, 3);
      const semanticPolicy = new MockValidationPolicy('semantic-policy', true, null, 10);
      const flowPolicy = new MockValidationPolicy('flow-policy', true, null, 7);

      const syntaxLevelInstance = ValidationLevel.syntax();
      const semanticLevelInstance = ValidationLevel.semantic();
      const flowLevelInstance = ValidationLevel.flow();

      mockPolicies.set(syntaxLevelInstance, [syntaxPolicy1, syntaxPolicy2]);
      mockPolicies.set(semanticLevelInstance, [semanticPolicy]);
      mockPolicies.set(flowLevelInstance, [flowPolicy]);

      (mockHierarchyService.getRequiredLevels as any).mockReturnValue([
        syntaxLevelInstance,
        semanticLevelInstance,
        flowLevelInstance,
      ]);
      (mockHierarchyService.getValidationOrder as any).mockReturnValue([
        syntaxLevelInstance,
        semanticLevelInstance,
        flowLevelInstance,
      ]);

      const result = await engine.executeValidationWorkflow(mockRequest, mockTarget);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const workflowResult = result.value;
        const steps = workflowResult.getSteps();

        expect(steps).toHaveLength(4);
        expect(steps[0]?.policy).toBe('syntax-policy-1');
        expect(steps[1]?.policy).toBe('syntax-policy-2');
        expect(steps[2]?.policy).toBe('semantic-policy');
        expect(steps[3]?.policy).toBe('flow-policy');

        const metrics = engine.getWorkflowMetrics(workflowResult);
        expect(metrics.levelExecutionTimes.get('syntax')).toBeGreaterThanOrEqual(8); // 5 + 3 + overhead
        expect(metrics.levelExecutionTimes.get('semantic')).toBeGreaterThanOrEqual(10);
        expect(metrics.levelExecutionTimes.get('flow')).toBeGreaterThanOrEqual(7);
      }
    });

    it('should handle mixed success and error scenarios', async () => {
      const successPolicy = new MockValidationPolicy('success-policy');
      const errorPolicy = new MockValidationPolicy('error-policy');
      errorPolicy.execute = vi.fn().mockResolvedValue(err(new ValidationError('Policy failed')));

      const semanticLevelInstance = ValidationLevel.semantic();
      mockPolicies.set(semanticLevelInstance, [successPolicy, errorPolicy]);

      (mockHierarchyService.getRequiredLevels as any).mockReturnValue([semanticLevelInstance]);
      (mockHierarchyService.getValidationOrder as any).mockReturnValue([semanticLevelInstance]);

      const result = await engine.executeValidationWorkflow(mockRequest, mockTarget);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const workflowResult = result.value;
        const steps = workflowResult.getSteps();

        expect(steps).toHaveLength(2);
        expect(steps[0]?.result.isOk()).toBe(true);
        expect(steps[1]?.result.isErr()).toBe(true);
      }
    });

    it('should stop execution when policy returns success with blocking errors', async () => {
      const policyWithBlockingErrors = new MockValidationPolicy('blocking-error-policy');
      const subsequentPolicy = new MockValidationPolicy('subsequent-policy');

      // Create a mock diagnostic with error severity
      const blockingDiagnostic = {
        getSeverity: vi.fn().mockReturnValue({
          isError: vi.fn().mockReturnValue(true),
        }),
      };

      // Create a successful validation result that contains blocking errors
      const resultWithBlockingErrors = {
        getDiagnostics: vi.fn().mockReturnValue([blockingDiagnostic]),
        getLanguagePackageId: vi.fn().mockReturnValue('test-package'),
      } as any;

      policyWithBlockingErrors.execute = vi.fn().mockResolvedValue(ok(resultWithBlockingErrors));

      const syntaxLevelInstance = ValidationLevel.syntax();
      const semanticLevelInstance = ValidationLevel.semantic();

      mockPolicies.set(syntaxLevelInstance, [policyWithBlockingErrors]);
      mockPolicies.set(semanticLevelInstance, [subsequentPolicy]);

      (mockHierarchyService.getRequiredLevels as any).mockReturnValue([
        syntaxLevelInstance,
        semanticLevelInstance,
      ]);
      (mockHierarchyService.getValidationOrder as any).mockReturnValue([
        syntaxLevelInstance,
        semanticLevelInstance,
      ]);

      const result = await engine.executeValidationWorkflow(mockRequest, mockTarget);

      if (result.isErr()) {
        console.log('Test failed with error:', result.error.message);
      }
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const workflowResult = result.value;
        const steps = workflowResult.getSteps();

        // Should only execute the policy with blocking errors, not the subsequent one
        expect(steps).toHaveLength(1);
        expect(steps[0]?.policy).toBe('blocking-error-policy');
        expect(steps[0]?.result.isOk()).toBe(true);

        // Verify the result contains blocking errors
        const stepResult = steps[0]?.result;
        if (stepResult?.isOk()) {
          expect(stepResult.value.getDiagnostics()).toHaveLength(1);
        }
      }
    });
  });
});

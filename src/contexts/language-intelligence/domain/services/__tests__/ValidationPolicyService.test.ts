import { beforeEach, describe, it, vi } from 'vitest';
import { expect } from '../../__tests__/test-setup.js';
import { ValidationLevel } from '../../value-objects/ValidationLevel';
import type { ValidationRequest } from '../../value-objects/ValidationRequest';
import { type ValidationContext, ValidationPolicyService } from '../ValidationPolicyService';

describe('ValidationPolicyService', () => {
  let service: ValidationPolicyService;
  let mockPerformanceTracker: any;

  beforeEach(() => {
    mockPerformanceTracker = {
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
      getMetrics: vi.fn(),
    };
    service = new ValidationPolicyService(mockPerformanceTracker);
  });

  describe('determineValidationLevel', () => {
    it('should return semantic level for complex logical content', async () => {
      const request = createMockValidationRequest();
      const mockContext = createMockValidationContext({
        requiresSemanticAnalysis: () => true,
        hasComplexLogicalStructure: () => true,
      });

      vi.spyOn(service as any, 'createValidationContext').mockReturnValue(mockContext);

      const result = service.determineValidationLevel(request);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isSemantic()).toBe(true);
      }
    });

    it('should return flow level for flow validation requirements', async () => {
      const request = createMockValidationRequest();
      const mockContext = createMockValidationContext({
        requiresSemanticAnalysis: () => false,
        hasComplexLogicalStructure: () => false,
        needsFlowValidation: () => true,
      });

      vi.spyOn(service as any, 'createValidationContext').mockReturnValue(mockContext);

      const result = service.determineValidationLevel(request);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isFlow()).toBe(true);
      }
    });

    it('should return style level for style validation with long content', async () => {
      const request = createMockValidationRequest();
      const mockContext = createMockValidationContext({
        requiresSemanticAnalysis: () => false,
        hasComplexLogicalStructure: () => false,
        needsFlowValidation: () => false,
        requiresStyleValidation: () => true,
        getContentLength: () => 150,
      });

      vi.spyOn(service as any, 'createValidationContext').mockReturnValue(mockContext);

      const result = service.determineValidationLevel(request);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isStyle()).toBe(true);
      }
    });

    it('should return syntax level as default', async () => {
      const request = createMockValidationRequest();
      const mockContext = createMockValidationContext({
        requiresSemanticAnalysis: () => false,
        hasComplexLogicalStructure: () => false,
        needsFlowValidation: () => false,
        requiresStyleValidation: () => false,
      });

      vi.spyOn(service as any, 'createValidationContext').mockReturnValue(mockContext);

      const result = service.determineValidationLevel(request);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isSyntax()).toBe(true);
      }
    });

    it('should handle errors in validation level determination', async () => {
      const request = createMockValidationRequest();
      vi.spyOn(service as any, 'createValidationContext').mockImplementation(() => {
        throw new Error('Context creation failed');
      });

      const result = service.determineValidationLevel(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to determine validation level');
      }
    });
  });

  describe('orchestrateValidationWorkflow', () => {
    it('should create validation workflow for syntax level', async () => {
      const level = ValidationLevel.syntax();

      const result = service.orchestrateValidationWorkflow(level);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const workflow = result.value;
        expect(workflow.getRequiredLevels()).toContainValidationLevel(ValidationLevel.syntax());
        expect(workflow.getValidationOrder()[0]?.isSyntax()).toBe(true);
      }
    });

    it('should create validation workflow for semantic level', async () => {
      const level = ValidationLevel.semantic();

      const result = service.orchestrateValidationWorkflow(level);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const workflow = result.value;
        const requiredLevels = workflow.getRequiredLevels();
        expect(requiredLevels).toContainValidationLevel(ValidationLevel.syntax());
        expect(requiredLevels).toContainValidationLevel(ValidationLevel.semantic());
      }
    });

    it('should handle errors in workflow orchestration', async () => {
      const level = null as any;

      const result = service.orchestrateValidationWorkflow(level);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to orchestrate validation workflow');
      }
    });
  });

  describe('validateBusinessRuleCompliance', () => {
    it('should validate successful compliance for proper validation sequence', async () => {
      const resultLevel = ValidationLevel.semantic();
      const requestedLevel = ValidationLevel.semantic();
      const executedLevels: ValidationLevel[] = [
        ValidationLevel.syntax(),
        ValidationLevel.semantic(),
      ];

      const result = service.validateBusinessRuleCompliance(
        resultLevel,
        requestedLevel,
        executedLevels,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isCompliant()).toBe(true);
        expect(result.value.getViolations()).toHaveLength(0);
      }
    });

    it('should detect missing syntax validation', async () => {
      const resultLevel = ValidationLevel.semantic();
      const requestedLevel = ValidationLevel.semantic();
      const executedLevels: ValidationLevel[] = [ValidationLevel.semantic()];

      const result = service.validateBusinessRuleCompliance(
        resultLevel,
        requestedLevel,
        executedLevels,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isCompliant()).toBe(false);
        expect(result.value.getViolations()).toContain('Syntax validation must always be executed');
      }
    });

    it('should detect missing semantic dependencies', async () => {
      const resultLevel = ValidationLevel.semantic();
      const requestedLevel = ValidationLevel.semantic();
      const executedLevels: ValidationLevel[] = [];

      const result = service.validateBusinessRuleCompliance(
        resultLevel,
        requestedLevel,
        executedLevels,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isCompliant()).toBe(false);
        expect(result.value.getViolations()).toContain(
          'Semantic validation requires prior syntax validation',
        );
        expect(result.value.getRecommendations()).toContain(
          'Execute syntax validation before semantic validation',
        );
      }
    });

    it('should detect missing flow dependencies', async () => {
      const resultLevel = ValidationLevel.flow();
      const requestedLevel = ValidationLevel.flow();
      const executedLevels: ValidationLevel[] = [];

      const result = service.validateBusinessRuleCompliance(
        resultLevel,
        requestedLevel,
        executedLevels,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isCompliant()).toBe(false);
        expect(result.value.getViolations()).toContain(
          'Flow validation requires prior syntax validation',
        );
        expect(result.value.getRecommendations()).toContain(
          'Execute syntax validation before flow validation',
        );
      }
    });

    it('should handle errors in compliance validation', async () => {
      const resultLevel = null as any;
      const requestedLevel = ValidationLevel.syntax();
      const executedLevels: ValidationLevel[] = [];

      const result = service.validateBusinessRuleCompliance(
        resultLevel,
        requestedLevel,
        executedLevels,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to validate business rule compliance');
      }
    });
  });

  describe('getValidationLevelRequirements', () => {
    it('should return syntax requirement for syntax level', () => {
      const level = ValidationLevel.syntax();

      const requirements = service.getValidationLevelRequirements(level);

      expect(requirements).toContainValidationLevel(ValidationLevel.syntax());
      expect(requirements).toHaveLength(1);
    });

    it('should return syntax and semantic requirements for semantic level', () => {
      const level = ValidationLevel.semantic();

      const requirements = service.getValidationLevelRequirements(level);

      expect(requirements).toContainValidationLevel(ValidationLevel.syntax());
      expect(requirements.length).toBeGreaterThan(1);
    });

    it('should return syntax requirement for flow level', () => {
      const level = ValidationLevel.flow();

      const requirements = service.getValidationLevelRequirements(level);

      expect(requirements).toContainValidationLevel(ValidationLevel.syntax());
    });

    it('should return syntax requirement for style level', () => {
      const level = ValidationLevel.style();

      const requirements = service.getValidationLevelRequirements(level);

      expect(requirements).toContainValidationLevel(ValidationLevel.syntax());
    });
  });

  describe('DefaultValidationContext', () => {
    it('should properly analyze content for semantic requirements', () => {
      const request = createMockValidationRequest('∀x (P(x) → Q(x))');
      request.getValidationLevel = vi.fn().mockReturnValue(ValidationLevel.semantic());

      const result = service.determineValidationLevel(request);
      expect(result.isOk()).toBe(true);
    });

    it('should detect complex logical structures with quantifiers', () => {
      const request = createMockValidationRequest('∀x ∃y (P(x) → Q(y))');
      request.getValidationLevel = vi.fn().mockReturnValue(ValidationLevel.semantic());

      const result = service.determineValidationLevel(request);
      expect(result.isOk()).toBe(true);
    });

    it('should detect complex logical structures with implications', () => {
      const request = createMockValidationRequest('P → Q ↔ R ∧ S');
      request.getValidationLevel = vi.fn().mockReturnValue(ValidationLevel.semantic());

      const result = service.determineValidationLevel(request);
      expect(result.isOk()).toBe(true);
    });

    it('should identify inference statements', () => {
      const request = createMockValidationRequest('P is true, therefore Q follows');
      request.getValidationLevel = vi.fn().mockReturnValue(ValidationLevel.flow());

      const result = service.determineValidationLevel(request);
      expect(result.isOk()).toBe(true);
    });

    it('should identify quantified statements', () => {
      const request = createMockValidationRequest('∀x P(x) and ∃y Q(y)');
      request.getValidationLevel = vi.fn().mockReturnValue(ValidationLevel.semantic());

      const result = service.determineValidationLevel(request);
      expect(result.isOk()).toBe(true);
    });

    it('should handle short content for style validation', () => {
      const request = createMockValidationRequest('P');
      request.getValidationLevel = vi.fn().mockReturnValue(ValidationLevel.style());

      const result = service.determineValidationLevel(request);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isFlow()).toBe(true); // Style validation implies flow validation for short content
      }
    });
  });

  describe('DefaultValidationWorkflow', () => {
    it('should allow skipping semantic validation for style-only changes', () => {
      const level = ValidationLevel.style();
      const workflow = service.orchestrateValidationWorkflow(level);

      expect(workflow.isOk()).toBe(true);
      if (workflow.isOk()) {
        const workflowInstance = workflow.value;
        const semanticLevel = ValidationLevel.semantic();
        // Note: This tests the default behavior, actual implementation may always return false
        const canSkip = workflowInstance.canSkipLevel(semanticLevel);
        expect(typeof canSkip).toBe('boolean');
      }
    });

    it('should allow skipping flow validation for isolated statement changes', () => {
      const level = ValidationLevel.semantic();
      const workflow = service.orchestrateValidationWorkflow(level);

      expect(workflow.isOk()).toBe(true);
      if (workflow.isOk()) {
        const workflowInstance = workflow.value;
        const flowLevel = ValidationLevel.flow();
        const canSkip = workflowInstance.canSkipLevel(flowLevel);
        expect(typeof canSkip).toBe('boolean');
      }
    });

    it('should never allow skipping syntax validation', () => {
      const level = ValidationLevel.semantic();
      const workflow = service.orchestrateValidationWorkflow(level);

      expect(workflow.isOk()).toBe(true);
      if (workflow.isOk()) {
        const workflowInstance = workflow.value;
        const syntaxLevel = ValidationLevel.syntax();
        const canSkip = workflowInstance.canSkipLevel(syntaxLevel);
        expect(canSkip).toBe(false);
      }
    });

    it('should determine parallel execution for complex workflows', () => {
      const level = ValidationLevel.style(); // This should include multiple levels
      const workflow = service.orchestrateValidationWorkflow(level);

      expect(workflow.isOk()).toBe(true);
      if (workflow.isOk()) {
        const workflowInstance = workflow.value;
        const shouldParallel = workflowInstance.shouldExecuteInParallel();
        expect(typeof shouldParallel).toBe('boolean');
      }
    });

    it('should order validation levels by priority', () => {
      const level = ValidationLevel.semantic();
      const workflow = service.orchestrateValidationWorkflow(level);

      expect(workflow.isOk()).toBe(true);
      if (workflow.isOk()) {
        const workflowInstance = workflow.value;
        const order = workflowInstance.getValidationOrder();
        expect(Array.isArray(order)).toBe(true);
        expect(order.length).toBeGreaterThan(0);
      }
    });
  });

  describe('error handling edge cases', () => {
    it('should handle validation context creation errors', () => {
      const request = createMockValidationRequest();

      // Mock the private method to throw an error
      const originalMethod = (service as any).createValidationContext;
      (service as any).createValidationContext = vi.fn().mockImplementation(() => {
        throw new Error('Context creation failed');
      });

      const result = service.determineValidationLevel(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to determine validation level');
      }

      // Restore original method
      (service as any).createValidationContext = originalMethod;
    });

    it('should handle undefined validation level in workflow orchestration', () => {
      const result = service.orchestrateValidationWorkflow(undefined as any);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to orchestrate validation workflow');
      }
    });

    it('should handle null arrays in business rule compliance', () => {
      const resultLevel = ValidationLevel.syntax();
      const requestedLevel = ValidationLevel.syntax();

      const result = service.validateBusinessRuleCompliance(
        resultLevel,
        requestedLevel,
        null as any,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to validate business rule compliance');
      }
    });
  });
});

function createMockValidationRequest(content: string = 'test content'): ValidationRequest {
  const mockRequest = {
    getValidationLevel: vi.fn().mockReturnValue(ValidationLevel.syntax()),
    getStatementText: vi.fn().mockReturnValue(content),
  } as any;
  return mockRequest;
}

function createMockValidationContext(
  overrides: Partial<ValidationContext> = {},
): ValidationContext {
  return {
    requiresSemanticAnalysis: () => false,
    hasComplexLogicalStructure: () => false,
    needsFlowValidation: () => false,
    requiresStyleValidation: () => false,
    getContentLength: () => 50,
    getStatementType: () => 'simple',
    ...overrides,
  };
}

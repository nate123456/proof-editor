import { beforeEach, describe, expect, it, vi } from 'vitest';
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
        expect(workflow.getRequiredLevels()).toContain(ValidationLevel.syntax());
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
        expect(requiredLevels).toContain(ValidationLevel.syntax());
        expect(requiredLevels).toContain(ValidationLevel.semantic());
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

      expect(requirements).toContain(ValidationLevel.syntax());
      expect(requirements).toHaveLength(1);
    });

    it('should return syntax and semantic requirements for semantic level', () => {
      const level = ValidationLevel.semantic();

      const requirements = service.getValidationLevelRequirements(level);

      expect(requirements).toContain(ValidationLevel.syntax());
      expect(requirements.length).toBeGreaterThan(1);
    });

    it('should return syntax requirement for flow level', () => {
      const level = ValidationLevel.flow();

      const requirements = service.getValidationLevelRequirements(level);

      expect(requirements).toContain(ValidationLevel.syntax());
    });

    it('should return syntax requirement for style level', () => {
      const level = ValidationLevel.style();

      const requirements = service.getValidationLevelRequirements(level);

      expect(requirements).toContain(ValidationLevel.syntax());
    });
  });
});

function createMockValidationRequest(): ValidationRequest {
  const mockRequest = {
    getValidationLevel: vi.fn().mockReturnValue(ValidationLevel.syntax()),
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

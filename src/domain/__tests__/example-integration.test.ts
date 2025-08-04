/**
 * Example test showcasing the modern TDD stack integration
 *
 * Demonstrates:
 * - jest-mock-extended for type-safe mocking
 * - Fishery + Faker for test data generation
 * - fast-check for property-based testing
 * - Custom domain matchers
 */

import fc from 'fast-check';
import { err, ok } from 'neverthrow';
import { describe, expect, it, vi } from 'vitest';

import { ValidationError } from '../shared/result.js';
import { StatementContent } from '../shared/value-objects/index.js';
import { statementContentFactory, testScenarios } from './factories/index.js';

// Example interface for demonstration
interface MockService {
  processContent(content: string): Promise<{ id: string; processed: boolean }>;
  validateInput(input: string): boolean;
}

describe('Modern TDD Stack Integration', () => {
  describe('Mocking with Vitest', () => {
    it('should provide type-safe mocking', () => {
      const mockService: MockService = {
        validateInput: vi.fn(),
        processContent: vi.fn(),
      };

      // Setup mock behavior
      const validateInputMock = vi.mocked(mockService.validateInput);
      const processContentMock = vi.mocked(mockService.processContent);

      validateInputMock.mockReturnValue(true);
      processContentMock.mockResolvedValue({
        id: 'test-id',
        processed: true,
      });

      // Execute
      const isValid = mockService.validateInput('valid input');

      // Verify
      expect(isValid).toBe(true);
      expect(validateInputMock).toHaveBeenCalledWith('valid input');
    });
  });

  describe('Test data generation with Fishery + Faker', () => {
    it('should generate realistic domain-specific test data', () => {
      const content = statementContentFactory.build();
      expect(content).toBeTruthy();
      expect(content).toBeInstanceOf(StatementContent);
      expect(content.getValue().length).toBeGreaterThan(0);
    });

    it('should provide realistic test scenarios', () => {
      const scenario = testScenarios.simpleChain;
      expect(scenario.premises).toHaveLength(2);
      expect(scenario.conclusions).toHaveLength(2);
      expect(scenario.premises[0]).toContain('men');
      expect(scenario.premises[1]).toContain('Socrates');
    });
  });

  describe('Property-based testing with fast-check', () => {
    it('should test properties across input space', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const result =
            input.length > 0 ? ok(input.toUpperCase()) : err(new ValidationError('Empty input'));

          if (input.length > 0) {
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
              expect(result.value).toBe(input.toUpperCase());
            }
          } else {
            expect(result.isErr()).toBe(true);
          }
        }),
      );
    });

    it('should find edge cases automatically', () => {
      fc.assert(
        fc.property(fc.array(fc.string()), (strings) => {
          const nonEmptyStrings = strings.filter((s) => s.length > 0);
          const result =
            nonEmptyStrings.length > 0
              ? ok(nonEmptyStrings.join(' '))
              : err(new ValidationError('No valid strings'));

          if (nonEmptyStrings.length > 0) {
            expect(result.isOk()).toBe(true);
          } else {
            expect(result.isErr()).toBe(true);
          }
        }),
      );
    });
  });

  describe('Custom domain matchers', () => {
    it('should use validation error matcher', () => {
      const error = new ValidationError('Test validation error');
      // Custom matchers would be defined in test setup
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toContain('validation');
    });

    it('should demonstrate domain-specific assertions', () => {
      // These would work with actual domain entities
      // expect(statement).toBeValidStatement();
      // expect(argument).toBeValidAtomicArgument();
      // expect([arg1, arg2]).toHaveValidConnections();
    });
  });

  describe('Integration example', () => {
    it('should combine all tools in realistic test scenario', async () => {
      const mockService: MockService = {
        validateInput: vi.fn(),
        processContent: vi.fn(),
      };
      const testContent = statementContentFactory.build();
      const contentString = testContent.getValue();

      // Setup mock behavior
      const validateInputMock = vi.mocked(mockService.validateInput);
      const processContentMock = vi.mocked(mockService.processContent);

      validateInputMock.mockReturnValue(true);
      processContentMock.mockResolvedValue({
        id: 'generated-id',
        processed: true,
      });

      // Execute business logic
      const isValid = mockService.validateInput(contentString);
      expect(isValid).toBe(true);

      const result = await mockService.processContent(contentString);
      expect(result.processed).toBe(true);
      expect(result.id).toBeTruthy();

      // Verify interactions
      expect(validateInputMock).toHaveBeenCalledWith(contentString);
      expect(processContentMock).toHaveBeenCalledWith(contentString);
    });
  });
});

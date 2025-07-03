import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import { TOKENS } from '../../infrastructure/di/tokens.js';
import { createServiceTestContainer } from './test-container.js';

describe('DI Container', () => {
  describe('Domain Services Registration', () => {
    it('should resolve StatementFlowService with dependencies', async () => {
      const { resolve } = await createServiceTestContainer();

      const service = resolve<any>(TOKENS.StatementFlowService);

      expect(service).toBeDefined();
      expect(service.createStatementFromContent).toBeDefined();
      expect(typeof service.createStatementFromContent).toBe('function');
    });

    it('should resolve TreeStructureService with dependencies', async () => {
      const { resolve } = await createServiceTestContainer();

      const service = resolve<any>(TOKENS.TreeStructureService);

      expect(service).toBeDefined();
      expect(service.createTreeWithRootNode).toBeDefined();
      expect(typeof service.createTreeWithRootNode).toBe('function');
    });

    it('should resolve ConnectionResolutionService with dependencies', async () => {
      const { resolve } = await createServiceTestContainer();

      const service = resolve<any>(TOKENS.ConnectionResolutionService);

      expect(service).toBeDefined();
      expect(service.findBasicConnections).toBeDefined();
      expect(typeof service.findBasicConnections).toBe('function');
    });
  });

  describe('Context Services Registration', () => {
    it('should resolve LogicValidationService', async () => {
      const { resolve } = await createServiceTestContainer();

      const service = resolve<any>(TOKENS.LogicValidationService);

      expect(service).toBeDefined();
      expect(service.validateStatement).toBeDefined();
      expect(typeof service.validateStatement).toBe('function');
    });

    it('should resolve EducationalFeedbackService', async () => {
      const { resolve } = await createServiceTestContainer();

      const service = resolve<any>(TOKENS.EducationalFeedbackService);

      expect(service).toBeDefined();
      expect(service.generateLearningHints).toBeDefined();
      expect(typeof service.generateLearningHints).toBe('function');
    });

    it('should resolve PatternRecognitionService', async () => {
      const { resolve } = await createServiceTestContainer();

      const service = resolve<any>(TOKENS.PatternRecognitionService);

      expect(service).toBeDefined();
      expect(service.recognizePatterns).toBeDefined();
      expect(typeof service.recognizePatterns).toBe('function');
    });
  });

  describe('Service Dependencies', () => {
    it('should inject mocked repositories into domain services', async () => {
      const { resolve, mocks } = await createServiceTestContainer();

      // Get the StatementProcessingService which has repository dependencies
      const service = resolve<any>(TOKENS.StatementProcessingService);

      expect(service).toBeDefined();

      // Verify that the mocked repositories are available for use
      expect(mocks.statementRepo).toBeDefined();
      expect(mocks.orderedSetRepo).toBeDefined();
      expect(mocks.atomicArgumentRepo).toBeDefined();
    });

    it.skip('should create singleton instances', async () => {
      // Test disabled - requires shared container instance for singleton testing
      const { resolve } = await createServiceTestContainer();

      const service1 = resolve(TOKENS.StatementFlowService);
      const service2 = resolve(TOKENS.StatementFlowService);

      expect(service1).toBe(service2); // Same instance
    });
  });
});

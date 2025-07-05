import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { IPlatformPort } from '../../../application/ports/IPlatformPort.js';
import type { IUIPort } from '../../../application/ports/IUIPort.js';
import type { CrossContextOrchestrationService } from '../../../application/services/CrossContextOrchestrationService.js';
import { ValidationController } from '../ValidationController.js';

describe('ValidationController', () => {
  let controller: ValidationController;
  let mockOrchestrationService: ReturnType<typeof vi.mocked<CrossContextOrchestrationService>>;
  let mockPlatform: ReturnType<typeof vi.mocked<IPlatformPort>>;
  let mockUI: ReturnType<typeof vi.mocked<IUIPort>>;

  beforeEach(() => {
    mockOrchestrationService = vi.mocked<CrossContextOrchestrationService>(
      {} as CrossContextOrchestrationService,
    );
    mockPlatform = vi.mocked<IPlatformPort>({} as IPlatformPort);
    mockUI = vi.mocked<IUIPort>({} as IUIPort);

    controller = new ValidationController(mockOrchestrationService, mockPlatform, mockUI);
  });

  describe('initialization and disposal', () => {
    test('initializes successfully', async () => {
      const result = await controller.initialize();

      expect(result.isOk()).toBe(true);
    });

    test('disposes successfully', async () => {
      const result = await controller.dispose();

      expect(result.isOk()).toBe(true);
    });
  });

  describe('validateDocument', () => {
    test('validates document successfully', async () => {
      const documentId = 'doc-123';

      const result = await controller.validateDocument(documentId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.documentId).toBe(documentId);
        expect(result.value.data?.isValid).toBe(true);
        expect(result.value.data?.overallScore).toBe(92);
        expect(result.value.data?.summary).toBeDefined();
        expect(result.value.data?.categories).toBeDefined();
        expect(result.value.data?.recommendations).toBeDefined();
        expect(result.value.metadata?.operationId).toBe('validate-document');
      }
    });

    test('validates with custom options', async () => {
      const documentId = 'doc-123';
      const options = {
        includeCustomScripts: true,
        strictMode: true,
        categories: ['logic', 'structure'],
      };

      const result = await controller.validateDocument(documentId, options);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.categories).toBeDefined();
        expect(result.value.data?.categories.length).toBeGreaterThan(0);
      }
    });

    test('provides detailed validation categories', async () => {
      const result = await controller.validateDocument('doc-123');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const categories = result.value.data?.categories;
        expect(categories?.some((c) => c.name === 'Structural Integrity')).toBe(true);
        expect(categories?.some((c) => c.name === 'Logical Consistency')).toBe(true);
        expect(categories?.some((c) => c.name === 'Completeness')).toBe(true);
      }
    });

    test('rejects empty document ID', async () => {
      const result = await controller.validateDocument('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Document ID cannot be empty');
      }
    });

    test('handles unexpected errors gracefully', async () => {
      const originalDate = Date;
      vi.stubGlobal(
        'Date',
        class extends Date {
          constructor() {
            super();
            throw new Error('Unexpected error');
          }

          static override now() {
            return originalDate.now();
          }
        },
      );

      const result = await controller.validateDocument('doc-123');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to validate document');
      }

      vi.unstubAllGlobals();
    });
  });

  describe('runCustomValidationScript', () => {
    test('runs valid script successfully', async () => {
      const documentId = 'doc-123';
      const scriptContent = 'console.log("Validating arguments...");';
      const scriptId = 'script-456';

      const result = await controller.runCustomValidationScript(
        documentId,
        scriptContent,
        scriptId,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.scriptId).toBe(scriptId);
        expect(result.value.data?.scriptName).toBeDefined();
        expect(result.value.data?.executionTime).toBeDefined();
        expect(result.value.data?.isValid).toBe(true);
        expect(result.value.data?.results).toBeDefined();
        expect(result.value.data?.errors).toBeDefined();
        expect(result.value.data?.output).toBeDefined();
        expect(result.value.metadata?.operationId).toBe('run-custom-validation-script');
      }
    });

    test('generates script ID when not provided', async () => {
      const result = await controller.runCustomValidationScript('doc-123', 'console.log("test");');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.scriptId).toBeDefined();
        expect(result.value.data?.scriptId).toContain('script-');
      }
    });

    test('provides detailed script execution results', async () => {
      const result = await controller.runCustomValidationScript('doc-123', 'console.log("test");');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.results).toBeDefined();
        expect(result.value.data?.results.length).toBeGreaterThan(0);
        expect(result.value.data?.results[0]?.testName).toBeDefined();
        expect(result.value.data?.results[0]?.passed).toBeDefined();
        expect(result.value.data?.output).toBeDefined();
      }
    });

    test('rejects unsafe script content', async () => {
      const unsafeScript = 'eval("malicious code");';

      const result = await controller.runCustomValidationScript('doc-123', unsafeScript);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Script contains potentially unsafe constructs');
      }
    });

    test('rejects scripts with Function constructor', async () => {
      const unsafeScript = 'new Function("return 1;");';

      const result = await controller.runCustomValidationScript('doc-123', unsafeScript);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Script contains potentially unsafe constructs');
      }
    });

    test('rejects empty document ID', async () => {
      const result = await controller.runCustomValidationScript('', 'console.log("test");');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Document ID cannot be empty');
      }
    });

    test('rejects empty script content', async () => {
      const result = await controller.runCustomValidationScript('doc-123', '');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Script content cannot be empty');
      }
    });
  });

  describe('validateProofPath', () => {
    test('validates proof path successfully', async () => {
      const documentId = 'doc-123';
      const fromNodeId = 'node-1';
      const toNodeId = 'node-2';

      const result = await controller.validateProofPath(documentId, fromNodeId, toNodeId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.fromNodeId).toBe(fromNodeId);
        expect(result.value.data?.toNodeId).toBe(toNodeId);
        expect(result.value.data?.isValid).toBe(true);
        expect(result.value.data?.pathLength).toBeDefined();
        expect(result.value.data?.validationSteps).toBeDefined();
        expect(result.value.data?.logicalSoundness).toBeDefined();
        expect(result.value.data?.completeness).toBeDefined();
        expect(result.value.metadata?.operationId).toBe('validate-proof-path');
      }
    });

    test('provides detailed validation steps', async () => {
      const result = await controller.validateProofPath('doc-123', 'node-1', 'node-2');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const steps = result.value.data?.validationSteps;
        expect(steps).toBeDefined();
        expect(steps?.length).toBeGreaterThan(0);
        expect(steps?.[0]?.stepNumber).toBeDefined();
        expect(steps?.[0]?.fromArgument).toBeDefined();
        expect(steps?.[0]?.toArgument).toBeDefined();
        expect(steps?.[0]?.connectionType).toBeDefined();
        expect(steps?.[0]?.isValid).toBeDefined();
      }
    });

    test('provides logical soundness analysis', async () => {
      const result = await controller.validateProofPath('doc-123', 'node-1', 'node-2');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const soundness = result.value.data?.logicalSoundness;
        expect(soundness?.isSound).toBeDefined();
        expect(soundness?.inferenceRules).toBeDefined();
        expect(soundness?.violations).toBeDefined();
      }
    });

    test('provides completeness analysis', async () => {
      const result = await controller.validateProofPath('doc-123', 'node-1', 'node-2');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const completeness = result.value.data?.completeness;
        expect(completeness?.isComplete).toBeDefined();
        expect(completeness?.missingSteps).toBeDefined();
        expect(completeness?.gaps).toBeDefined();
      }
    });

    test('rejects empty document ID', async () => {
      const result = await controller.validateProofPath('', 'node-1', 'node-2');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Document ID cannot be empty');
      }
    });

    test('rejects empty from node ID', async () => {
      const result = await controller.validateProofPath('doc-123', '', 'node-2');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('From node ID cannot be empty');
      }
    });

    test('rejects empty to node ID', async () => {
      const result = await controller.validateProofPath('doc-123', 'node-1', '');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('To node ID cannot be empty');
      }
    });

    test('rejects same from and to node IDs', async () => {
      const result = await controller.validateProofPath('doc-123', 'node-1', 'node-1');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('From and to node IDs cannot be the same');
      }
    });
  });

  describe('getValidationConfig', () => {
    test('retrieves validation configuration successfully', async () => {
      const documentId = 'doc-123';

      const result = await controller.getValidationConfig(documentId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.enabledChecks).toBeDefined();
        expect(result.value.data?.customScripts).toBeDefined();
        expect(result.value.data?.settings).toBeDefined();
        expect(result.value.metadata?.operationId).toBe('get-validation-config');
      }
    });

    test('provides enabled validation checks', async () => {
      const result = await controller.getValidationConfig('doc-123');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const checks = result.value.data?.enabledChecks;
        expect(checks).toBeDefined();
        expect(checks?.some((check) => check.id === 'structural-integrity')).toBe(true);
        expect(checks?.some((check) => check.id === 'logical-consistency')).toBe(true);
      }
    });

    test('provides validation settings', async () => {
      const result = await controller.getValidationConfig('doc-123');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const settings = result.value.data?.settings;
        expect(settings?.strictMode).toBeDefined();
        expect(settings?.validateOnSave).toBeDefined();
        expect(settings?.realTimeValidation).toBeDefined();
        expect(settings?.maxExecutionTime).toBeDefined();
      }
    });

    test('rejects empty document ID', async () => {
      const result = await controller.getValidationConfig('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Document ID cannot be empty');
      }
    });
  });

  describe('getValidationIssues', () => {
    test('retrieves all validation issues successfully', async () => {
      const documentId = 'doc-123';

      const result = await controller.getValidationIssues(documentId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data).toBeDefined();
        expect(Array.isArray(result.value.data)).toBe(true);
        expect(result.value.metadata?.operationId).toBe('get-validation-issues');
      }
    });

    test('filters issues by severity', async () => {
      const result = await controller.getValidationIssues('doc-123', { severity: 'error' });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.every((issue) => issue.severity === 'error')).toBe(true);
      }
    });

    test('filters issues by category', async () => {
      const result = await controller.getValidationIssues('doc-123', { category: 'Logic' });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.every((issue) => issue.category === 'Logic')).toBe(true);
      }
    });

    test('provides issue details', async () => {
      const result = await controller.getValidationIssues('doc-123');

      expect(result.isOk()).toBe(true);
      if (result.isOk() && result.value.data && result.value.data.length > 0) {
        const issue = result.value.data[0];
        expect(issue?.id).toBeDefined();
        expect(issue?.code).toBeDefined();
        expect(issue?.message).toBeDefined();
        expect(issue?.severity).toBeDefined();
        expect(issue?.category).toBeDefined();
        expect(typeof issue?.autoFixable).toBe('boolean');
      }
    });

    test('rejects empty document ID', async () => {
      const result = await controller.getValidationIssues('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Document ID cannot be empty');
      }
    });
  });

  describe('validateStatement', () => {
    test('validates statement successfully', async () => {
      const documentId = 'doc-123';
      const statementId = 'stmt-456';

      const result = await controller.validateStatement(documentId, statementId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data).toBeDefined();
        expect(Array.isArray(result.value.data)).toBe(true);
        expect(result.value.metadata?.operationId).toBe('validate-statement');
      }
    });

    test('provides statement-specific validation issues', async () => {
      const result = await controller.validateStatement('doc-123', 'stmt-456');

      expect(result.isOk()).toBe(true);
      if (result.isOk() && result.value.data && result.value.data.length > 0) {
        const issue = result.value.data[0];
        expect(issue?.location?.statementId).toBe('stmt-456');
      }
    });

    test('rejects empty document ID', async () => {
      const result = await controller.validateStatement('', 'stmt-456');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Document ID cannot be empty');
      }
    });

    test('rejects empty statement ID', async () => {
      const result = await controller.validateStatement('doc-123', '');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Statement ID cannot be empty');
      }
    });
  });

  describe('validateArgument', () => {
    test('validates argument successfully', async () => {
      const documentId = 'doc-123';
      const argumentId = 'arg-456';

      const result = await controller.validateArgument(documentId, argumentId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data).toBeDefined();
        expect(Array.isArray(result.value.data)).toBe(true);
        expect(result.value.metadata?.operationId).toBe('validate-argument');
      }
    });

    test('returns empty issues for valid arguments', async () => {
      const result = await controller.validateArgument('doc-123', 'arg-456');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.length).toBe(0);
      }
    });

    test('rejects empty document ID', async () => {
      const result = await controller.validateArgument('', 'arg-456');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Document ID cannot be empty');
      }
    });

    test('rejects empty argument ID', async () => {
      const result = await controller.validateArgument('doc-123', '');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Argument ID cannot be empty');
      }
    });
  });

  describe('metadata generation', () => {
    test('generates consistent metadata for operations', async () => {
      const result = await controller.validateDocument('doc-123');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.value.metadata;
        expect(metadata?.timestamp).toBeDefined();
        expect(metadata?.operationId).toBeDefined();
        expect(metadata?.source).toBeDefined();

        // Verify timestamp is valid ISO string
        if (metadata?.timestamp) {
          expect(() => new Date(metadata.timestamp)).not.toThrow();
        }
      }
    });
  });
});

import { describe, expect, test } from 'vitest';
import type { ContextType } from '../../errors/OrchestrationErrors.js';
import type {
  ConflictResolution,
  ContextConflict,
  ContextResult,
  CrossContextSyncRequest,
  IOrchestrationRequest,
  IOrchestrationResult,
  PackageInstallationRequest,
  PackageInstallationResult,
  Priority,
  ProofValidationRequest,
  ProofValidationResult,
  SyncResult,
} from '../OrchestrationInterfaces.js';

describe('OrchestrationInterfaces Type Contracts', () => {
  describe('Base Orchestration Types', () => {
    test('IOrchestrationRequest structure is well-typed', () => {
      const request: IOrchestrationRequest = {
        requestId: 'req-123',
        contexts: ['language-intelligence', 'package-ecosystem'],
        priority: 'high',
        timeout: 30000,
      };

      expect(request.requestId).toBe('req-123');
      expect(request.contexts).toContain('language-intelligence');
      expect(request.priority).toBe('high');
      expect(request.timeout).toBe(30000);
    });

    test('IOrchestrationRequest handles optional timeout', () => {
      const request: IOrchestrationRequest = {
        requestId: 'req-456',
        contexts: ['synchronization'],
        priority: 'medium',
      };

      expect(request.timeout).toBeUndefined();
    });

    test('Priority type supports all valid values', () => {
      const priorities: Priority[] = ['low', 'medium', 'high', 'critical'];

      priorities.forEach((priority) => {
        const request: IOrchestrationRequest = {
          requestId: 'test',
          contexts: ['core'],
          priority,
        };

        expect(request.priority).toBe(priority);
      });
    });

    test('IOrchestrationResult structure is well-typed', () => {
      const contextResults = new Map<ContextType, ContextResult>();
      contextResults.set('language-intelligence', {
        context: 'language-intelligence',
        success: true,
        data: { validated: true },
        executionTime: 150,
      });

      const result: IOrchestrationResult = {
        requestId: 'req-123',
        success: true,
        contextResults,
        executionTime: 500,
      };

      expect(result.requestId).toBe('req-123');
      expect(result.success).toBe(true);
      expect(result.contextResults.size).toBe(1);
      expect(result.executionTime).toBe(500);
    });

    test('ContextResult handles success and error cases', () => {
      const successResult: ContextResult = {
        context: 'package-ecosystem',
        success: true,
        data: { packages: ['pkg1', 'pkg2'] },
        executionTime: 200,
      };

      const errorResult: ContextResult = {
        context: 'synchronization',
        success: false,
        error: new Error('Sync failed'),
        executionTime: 50,
      };

      expect(successResult.success).toBe(true);
      expect(successResult.data).toBeDefined();
      expect(successResult.error).toBeUndefined();

      expect(errorResult.success).toBe(false);
      expect(errorResult.error).toBeInstanceOf(Error);
      expect(errorResult.data).toBeUndefined();
    });

    test('ContextResult data and error are optional', () => {
      const minimalResult: ContextResult = {
        context: 'core',
        success: true,
        executionTime: 100,
      };

      expect(minimalResult.data).toBeUndefined();
      expect(minimalResult.error).toBeUndefined();
    });
  });

  describe('Proof Validation Types', () => {
    test('ProofValidationRequest extends IOrchestrationRequest', () => {
      const request: ProofValidationRequest = {
        requestId: 'validation-req-123',
        contexts: ['language-intelligence', 'package-ecosystem'],
        priority: 'high',
        timeout: 10000,
        statements: ['All men are mortal', 'Socrates is a man', 'Therefore, Socrates is mortal'],
        packageDependencies: [
          { name: 'logic-package', version: '1.0.0' },
          { name: 'proof-helpers', version: '2.1.0' },
        ],
      };

      // Verify it satisfies base interface
      const baseRequest: IOrchestrationRequest = request;
      expect(baseRequest.requestId).toBe('validation-req-123');

      // Verify specific fields
      expect(request.statements).toHaveLength(3);
      expect(request.packageDependencies).toHaveLength(2);
    });

    test('ProofValidationResult extends IOrchestrationResult', () => {
      const contextResults = new Map<ContextType, ContextResult>();
      contextResults.set('language-intelligence', {
        context: 'language-intelligence',
        success: true,
        data: { logicallyValid: true },
        executionTime: 300,
      });

      const result: ProofValidationResult = {
        requestId: 'validation-req-123',
        success: true,
        contextResults,
        executionTime: 800,
        structuralValid: true,
        logicalValid: true,
        dependenciesResolved: true,
        syncCoordinated: true,
        errors: [],
      };

      // Verify it satisfies base interface
      const baseResult: IOrchestrationResult = result;
      expect(baseResult.success).toBe(true);

      // Verify specific validation fields
      expect(result.structuralValid).toBe(true);
      expect(result.logicalValid).toBe(true);
      expect(result.dependenciesResolved).toBe(true);
      expect(result.syncCoordinated).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('ProofValidationResult handles validation failures', () => {
      const contextResults = new Map<ContextType, ContextResult>();

      const result: ProofValidationResult = {
        requestId: 'validation-req-456',
        success: false,
        contextResults,
        executionTime: 400,
        structuralValid: false,
        logicalValid: false,
        dependenciesResolved: true,
        syncCoordinated: false,
        errors: [
          'Invalid argument structure at line 5',
          'Missing premise for conclusion',
          'Synchronization conflict detected',
        ],
      };

      expect(result.success).toBe(false);
      expect(result.structuralValid).toBe(false);
      expect(result.logicalValid).toBe(false);
      expect(result.syncCoordinated).toBe(false);
      expect(result.errors).toHaveLength(3);
    });
  });

  describe('Package Installation Types', () => {
    test('PackageInstallationRequest extends IOrchestrationRequest', () => {
      const request: PackageInstallationRequest = {
        requestId: 'install-req-789',
        contexts: ['package-ecosystem'],
        priority: 'medium',
        packageId: 'logic-package',
        version: '1.2.0',
        source: 'https://github.com/user/logic-package',
      };

      // Verify it satisfies base interface
      const baseRequest: IOrchestrationRequest = request;
      expect(baseRequest.contexts).toContain('package-ecosystem');

      // Verify specific installation fields
      expect(request.packageId).toBe('logic-package');
      expect(request.version).toBe('1.2.0');
      expect(request.source).toBe('https://github.com/user/logic-package');
    });

    test('PackageInstallationRequest handles optional version', () => {
      const request: PackageInstallationRequest = {
        requestId: 'install-req-999',
        contexts: ['package-ecosystem'],
        priority: 'low',
        packageId: 'latest-package',
        source: 'npm:latest-package',
      };

      expect(request.version).toBeUndefined();
      expect(request.packageId).toBe('latest-package');
    });

    test('PackageInstallationResult extends IOrchestrationResult', () => {
      const contextResults = new Map<ContextType, ContextResult>();
      contextResults.set('package-ecosystem', {
        context: 'package-ecosystem',
        success: true,
        data: { installedVersion: '1.2.0' },
        executionTime: 2000,
      });

      const result: PackageInstallationResult = {
        requestId: 'install-req-789',
        success: true,
        contextResults,
        executionTime: 2500,
        installed: true,
        installedVersion: '1.2.0',
        dependenciesInstalled: ['dep1@1.0.0', 'dep2@2.1.0'],
      };

      // Verify it satisfies base interface
      const baseResult: IOrchestrationResult = result;
      expect(baseResult.success).toBe(true);

      // Verify specific installation fields
      expect(result.installed).toBe(true);
      expect(result.installedVersion).toBe('1.2.0');
      expect(result.dependenciesInstalled).toHaveLength(2);
    });

    test('PackageInstallationResult handles installation failure', () => {
      const contextResults = new Map<ContextType, ContextResult>();

      const result: PackageInstallationResult = {
        requestId: 'install-req-fail',
        success: false,
        contextResults,
        executionTime: 1000,
        installed: false,
        dependenciesInstalled: [],
      };

      expect(result.installed).toBe(false);
      expect(result.installedVersion).toBeUndefined();
      expect(result.dependenciesInstalled).toHaveLength(0);
    });
  });

  describe('Cross-Context Sync Types', () => {
    test('CrossContextSyncRequest extends IOrchestrationRequest', () => {
      const request: CrossContextSyncRequest = {
        requestId: 'sync-req-456',
        contexts: ['synchronization', 'package-ecosystem'],
        priority: 'critical',
        syncType: 'incremental',
        deviceId: 'device-123',
        changes: [
          { type: 'create', entity: 'statement', data: { content: 'New statement' } },
          { type: 'update', entity: 'argument', data: { id: 'arg1', premises: ['s1', 's2'] } },
        ],
      };

      // Verify it satisfies base interface
      const baseRequest: IOrchestrationRequest = request;
      expect(baseRequest.priority).toBe('critical');

      // Verify specific sync fields
      expect(request.syncType).toBe('incremental');
      expect(request.deviceId).toBe('device-123');
      expect(request.changes).toHaveLength(2);
    });

    test('CrossContextSyncRequest handles sync types', () => {
      const syncTypes: Array<'incremental' | 'full'> = ['incremental', 'full'];

      syncTypes.forEach((syncType) => {
        const request: CrossContextSyncRequest = {
          requestId: 'sync-test',
          contexts: ['synchronization'],
          priority: 'medium',
          syncType,
          deviceId: 'test-device',
          changes: [],
        };

        expect(request.syncType).toBe(syncType);
      });
    });

    test('SyncResult extends IOrchestrationResult', () => {
      const contextResults = new Map<ContextType, ContextResult>();
      contextResults.set('synchronization', {
        context: 'synchronization',
        success: true,
        data: { syncedChanges: 5, conflicts: 1 },
        executionTime: 1500,
      });

      const result: SyncResult = {
        requestId: 'sync-req-456',
        success: true,
        contextResults,
        executionTime: 2000,
        synced: true,
        conflictsResolved: 1,
        syncedChanges: 5,
      };

      // Verify it satisfies base interface
      const baseResult: IOrchestrationResult = result;
      expect(baseResult.success).toBe(true);

      // Verify specific sync fields
      expect(result.synced).toBe(true);
      expect(result.conflictsResolved).toBe(1);
      expect(result.syncedChanges).toBe(5);
    });

    test('SyncResult handles sync failures', () => {
      const contextResults = new Map<ContextType, ContextResult>();

      const result: SyncResult = {
        requestId: 'sync-req-fail',
        success: false,
        contextResults,
        executionTime: 500,
        synced: false,
        conflictsResolved: 0,
        syncedChanges: 0,
      };

      expect(result.synced).toBe(false);
      expect(result.conflictsResolved).toBe(0);
      expect(result.syncedChanges).toBe(0);
    });
  });

  describe('Conflict Resolution Types', () => {
    test('ContextConflict structure is well-typed', () => {
      const conflict: ContextConflict = {
        conflictId: 'conflict-123',
        contexts: ['language-intelligence', 'synchronization'],
        description: 'Validation rule conflict during sync',
        severity: 'high',
        conflictData: {
          localRule: 'rule-a',
          remoteRule: 'rule-b',
          statement: 'conflicting statement',
        },
      };

      expect(conflict.conflictId).toBe('conflict-123');
      expect(conflict.contexts).toHaveLength(2);
      expect(conflict.description).toBe('Validation rule conflict during sync');
      expect(conflict.severity).toBe('high');
      expect(conflict.conflictData).toBeDefined();
    });

    test('ContextConflict handles all severity levels', () => {
      const severities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];

      severities.forEach((severity) => {
        const conflict: ContextConflict = {
          conflictId: 'test-conflict',
          contexts: ['core'],
          description: `${severity} severity conflict`,
          severity,
          conflictData: {},
        };

        expect(conflict.severity).toBe(severity);
      });
    });

    test('ConflictResolution structure is well-typed', () => {
      const resolution: ConflictResolution = {
        conflictId: 'conflict-123',
        resolution: 'manual',
        strategy: 'user-choice-local',
        resolvedData: {
          chosenRule: 'rule-a',
          reason: 'User prefers local version',
        },
      };

      expect(resolution.conflictId).toBe('conflict-123');
      expect(resolution.resolution).toBe('manual');
      expect(resolution.strategy).toBe('user-choice-local');
      expect(resolution.resolvedData).toBeDefined();
    });

    test('ConflictResolution handles resolution types', () => {
      const resolutionTypes: Array<'manual' | 'automatic'> = ['manual', 'automatic'];

      resolutionTypes.forEach((resolutionType) => {
        const resolution: ConflictResolution = {
          conflictId: 'test-conflict',
          resolution: resolutionType,
          strategy: `${resolutionType}-strategy`,
          resolvedData: {},
        };

        expect(resolution.resolution).toBe(resolutionType);
      });
    });
  });

  describe('Type Safety and Integration', () => {
    test('all request types extend base IOrchestrationRequest', () => {
      const baseRequest: IOrchestrationRequest = {
        requestId: 'base-req',
        contexts: ['core'],
        priority: 'medium',
      };

      const proofRequest: ProofValidationRequest = {
        ...baseRequest,
        statements: ['test statement'],
        packageDependencies: [],
      };

      const packageRequest: PackageInstallationRequest = {
        ...baseRequest,
        packageId: 'test-package',
        source: 'test-source',
      };

      const syncRequest: CrossContextSyncRequest = {
        ...baseRequest,
        syncType: 'full',
        deviceId: 'test-device',
        changes: [],
      };

      // Verify all can be treated as base type
      const requests: IOrchestrationRequest[] = [proofRequest, packageRequest, syncRequest];
      requests.forEach((req) => {
        expect(req.requestId).toBeDefined();
        expect(req.contexts).toBeDefined();
        expect(req.priority).toBeDefined();
      });
    });

    test('all result types extend base IOrchestrationResult', () => {
      const contextResults = new Map<ContextType, ContextResult>();
      const baseResult: IOrchestrationResult = {
        requestId: 'base-result',
        success: true,
        contextResults,
        executionTime: 100,
      };

      const proofResult: ProofValidationResult = {
        ...baseResult,
        structuralValid: true,
        logicalValid: true,
        dependenciesResolved: true,
        syncCoordinated: true,
        errors: [],
      };

      const packageResult: PackageInstallationResult = {
        ...baseResult,
        installed: true,
        dependenciesInstalled: [],
      };

      const syncResult: SyncResult = {
        ...baseResult,
        synced: true,
        conflictsResolved: 0,
        syncedChanges: 5,
      };

      // Verify all can be treated as base type
      const results: IOrchestrationResult[] = [proofResult, packageResult, syncResult];
      results.forEach((res) => {
        expect(res.requestId).toBeDefined();
        expect(res.success).toBeDefined();
        expect(res.contextResults).toBeDefined();
        expect(res.executionTime).toBeDefined();
      });
    });

    test('ContextResult data field accepts arbitrary types', () => {
      const stringDataResult: ContextResult = {
        context: 'core',
        success: true,
        data: 'string data',
        executionTime: 100,
      };

      const objectDataResult: ContextResult = {
        context: 'package-ecosystem',
        success: true,
        data: { packages: ['pkg1'], versions: ['1.0.0'] },
        executionTime: 200,
      };

      const arrayDataResult: ContextResult = {
        context: 'synchronization',
        success: true,
        data: [1, 2, 3],
        executionTime: 150,
      };

      expect(typeof stringDataResult.data).toBe('string');
      expect(typeof objectDataResult.data).toBe('object');
      expect(Array.isArray(arrayDataResult.data)).toBe(true);
    });

    test('readonly properties are properly typed', () => {
      const request: IOrchestrationRequest = {
        requestId: 'test',
        contexts: ['core'],
        priority: 'low',
      };

      // These should be readonly but we can't test that at runtime
      // The TypeScript compiler enforces readonly at compile time
      expect(request.requestId).toBe('test');
      expect(request.contexts).toEqual(['core']);
      expect(request.priority).toBe('low');
    });
  });
});

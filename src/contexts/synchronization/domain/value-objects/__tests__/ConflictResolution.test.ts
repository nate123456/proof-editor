import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ConflictResolution,
  type ConflictResolutionStrategy,
  type ResolutionContext,
  type UserSelection,
} from '../ConflictResolution.js';
import { DeviceId } from '../DeviceId.js';

describe('ConflictResolution', () => {
  let mockDeviceId: DeviceId;
  let mockContext: ResolutionContext;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    const deviceResult = DeviceId.generateRandom();
    expect(deviceResult.isOk()).toBe(true);
    if (deviceResult.isOk()) {
      mockDeviceId = deviceResult.value;
    }

    mockContext = {
      conflictId: 'conflict-123',
      involvedDevices: [mockDeviceId],
      conflictType: 'TEXT_CONFLICT',
      targetPath: '/document.md',
      detectedAt: new Date('2024-01-01T00:00:00Z'),
      operationCount: 2,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createAutomatic', () => {
    it('should create automatic resolution with valid strategy', () => {
      const result = ConflictResolution.createAutomatic(
        'LAST_WRITER_WINS',
        'HIGH',
        mockDeviceId,
        mockContext,
        { winner: 'operation-1' },
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const resolution = result.value;
        expect(resolution.getStrategy()).toBe('LAST_WRITER_WINS');
        expect(resolution.getConfidence()).toBe('HIGH');
        expect(resolution.isAutomaticResolution()).toBe(true);
        expect(resolution.isManualResolution()).toBe(false);
        expect(resolution.getResolvedBy()).toBe(mockDeviceId);
        expect(resolution.getResultData()).toEqual({ winner: 'operation-1' });
        expect(resolution.getUserSelection()).toBeUndefined();
      }
    });

    it('should reject manual strategies for automatic resolution', () => {
      const result = ConflictResolution.createAutomatic(
        'USER_DECISION_REQUIRED',
        'HIGH',
        mockDeviceId,
        mockContext,
        {},
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('not suitable for automatic resolution');
      }
    });

    it('should accept all automatic strategies', () => {
      const automaticStrategies: ConflictResolutionStrategy[] = [
        'LAST_WRITER_WINS',
        'FIRST_WRITER_WINS',
        'MERGE_OPERATIONS',
        'OPERATIONAL_TRANSFORM',
        'THREE_WAY_MERGE',
      ];

      for (const strategy of automaticStrategies) {
        const result = ConflictResolution.createAutomatic(
          strategy,
          'HIGH',
          mockDeviceId,
          mockContext,
          {},
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getStrategy()).toBe(strategy);
        }
      }
    });
  });

  describe('createManual', () => {
    const userSelection: UserSelection = {
      selectedOperationId: 'operation-1',
      customData: { reason: 'test' },
      rationale: 'Test selection',
    };

    it('should create manual resolution', () => {
      const result = ConflictResolution.createManual(
        'MANUAL_SELECTION',
        mockDeviceId,
        mockContext,
        { selected: 'operation-1' },
        userSelection,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const resolution = result.value;
        expect(resolution.getStrategy()).toBe('MANUAL_SELECTION');
        expect(resolution.getConfidence()).toBe('HIGH'); // Manual always HIGH
        expect(resolution.isManualResolution()).toBe(true);
        expect(resolution.isAutomaticResolution()).toBe(false);
        expect(resolution.getUserSelection()).toEqual(userSelection);
      }
    });

    it('should reject automatic strategies for manual resolution', () => {
      const result = ConflictResolution.createManual(
        'LAST_WRITER_WINS',
        mockDeviceId,
        mockContext,
        {},
        userSelection,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('should be used for automatic resolution');
      }
    });

    it('should accept manual strategies', () => {
      const manualStrategies: ConflictResolutionStrategy[] = [
        'USER_DECISION_REQUIRED',
        'MANUAL_SELECTION',
      ];

      for (const strategy of manualStrategies) {
        const result = ConflictResolution.createManual(
          strategy,
          mockDeviceId,
          mockContext,
          {},
          userSelection,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getStrategy()).toBe(strategy);
        }
      }
    });
  });

  describe('createMerged', () => {
    it('should create merged resolution with default strategy', () => {
      const mergeResult = { merged: 'content' };
      const result = ConflictResolution.createMerged(mockDeviceId, mockContext, mergeResult);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const resolution = result.value;
        expect(resolution.getStrategy()).toBe('OPERATIONAL_TRANSFORM');
        expect(resolution.isMergeResolution()).toBe(true);
        expect(resolution.getResultData()).toBe(mergeResult);
      }
    });

    it('should create merged resolution with specified strategy', () => {
      const result = ConflictResolution.createMerged(
        mockDeviceId,
        mockContext,
        {},
        'THREE_WAY_MERGE',
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getStrategy()).toBe('THREE_WAY_MERGE');
      }
    });

    it('should calculate confidence based on operation count', () => {
      const highOpContext = { ...mockContext, operationCount: 10 };
      const result = ConflictResolution.createMerged(mockDeviceId, highOpContext, {});

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getConfidence()).toBe('LOW');
      }
    });

    it('should calculate confidence based on conflict type', () => {
      const semanticContext = { ...mockContext, conflictType: 'SEMANTIC_CONFLICT' };
      const result = ConflictResolution.createMerged(mockDeviceId, semanticContext, {});

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getConfidence()).toBe('MEDIUM');
      }
    });

    it('should calculate confidence based on merge result', () => {
      const result1 = ConflictResolution.createMerged(mockDeviceId, mockContext, null);
      const result2 = ConflictResolution.createMerged(mockDeviceId, mockContext, {
        content: 'valid',
      });

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.getConfidence()).toBe('LOW');
        expect(result2.value.getConfidence()).toBe('HIGH');
      }
    });
  });

  describe('business logic methods', () => {
    let automaticResolution: ConflictResolution;
    let manualResolution: ConflictResolution;

    beforeEach(() => {
      const autoResult = ConflictResolution.createAutomatic(
        'LAST_WRITER_WINS',
        'HIGH',
        mockDeviceId,
        mockContext,
        {},
      );
      const manualResult = ConflictResolution.createManual(
        'MANUAL_SELECTION',
        mockDeviceId,
        mockContext,
        {},
        { selectedOperationId: 'op-1' },
      );

      expect(autoResult.isOk()).toBe(true);
      expect(manualResult.isOk()).toBe(true);
      if (autoResult.isOk() && manualResult.isOk()) {
        automaticResolution = autoResult.value;
        manualResolution = manualResult.value;
      }
    });

    describe('confidence checks', () => {
      it('should identify high confidence resolutions', () => {
        expect(automaticResolution.isHighConfidence()).toBe(true);
        expect(manualResolution.isHighConfidence()).toBe(true);
      });

      it('should identify low confidence resolutions', () => {
        const lowConfResult = ConflictResolution.createAutomatic(
          'LAST_WRITER_WINS',
          'LOW',
          mockDeviceId,
          mockContext,
          {},
        );

        expect(lowConfResult.isOk()).toBe(true);
        if (lowConfResult.isOk()) {
          expect(lowConfResult.value.isHighConfidence()).toBe(false);
        }
      });
    });

    describe('merge resolution detection', () => {
      it('should identify merge strategies', () => {
        const strategies: ConflictResolutionStrategy[] = [
          'MERGE_OPERATIONS',
          'OPERATIONAL_TRANSFORM',
          'THREE_WAY_MERGE',
        ];

        for (const strategy of strategies) {
          const result = ConflictResolution.createAutomatic(
            strategy,
            'HIGH',
            mockDeviceId,
            mockContext,
            {},
          );

          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            expect(result.value.isMergeResolution()).toBe(true);
          }
        }
      });

      it('should identify non-merge strategies', () => {
        expect(automaticResolution.isMergeResolution()).toBe(false);
        expect(manualResolution.isMergeResolution()).toBe(false);
      });
    });

    describe('user validation requirements', () => {
      it('should require validation for low confidence', () => {
        const lowConfResult = ConflictResolution.createAutomatic(
          'LAST_WRITER_WINS',
          'LOW',
          mockDeviceId,
          mockContext,
          {},
        );

        expect(lowConfResult.isOk()).toBe(true);
        if (lowConfResult.isOk()) {
          expect(lowConfResult.value.requiresUserValidation()).toBe(true);
        }
      });

      it('should require validation for user decision strategy', () => {
        const userDecisionResult = ConflictResolution.createManual(
          'USER_DECISION_REQUIRED',
          mockDeviceId,
          mockContext,
          {},
          { selectedOperationId: 'op-1' },
        );

        expect(userDecisionResult.isOk()).toBe(true);
        if (userDecisionResult.isOk()) {
          expect(userDecisionResult.value.requiresUserValidation()).toBe(true);
        }
      });

      it('should require validation for semantic merge conflicts', () => {
        const semanticContext = { ...mockContext, conflictType: 'SEMANTIC_CONFLICT' };
        const mergeResult = ConflictResolution.createMerged(mockDeviceId, semanticContext, {});

        expect(mergeResult.isOk()).toBe(true);
        if (mergeResult.isOk()) {
          expect(mergeResult.value.requiresUserValidation()).toBe(true);
        }
      });

      it('should not require validation for high confidence automatic resolutions', () => {
        expect(automaticResolution.requiresUserValidation()).toBe(false);
      });
    });

    describe('canBeUndone', () => {
      it('should allow undo for manual resolutions', () => {
        expect(manualResolution.canBeUndone()).toBe(true);
      });

      it('should allow undo for low confidence resolutions', () => {
        const lowConfResult = ConflictResolution.createAutomatic(
          'LAST_WRITER_WINS',
          'LOW',
          mockDeviceId,
          mockContext,
          {},
        );

        expect(lowConfResult.isOk()).toBe(true);
        if (lowConfResult.isOk()) {
          expect(lowConfResult.value.canBeUndone()).toBe(true);
        }
      });

      it('should not allow undo for high confidence automatic resolutions', () => {
        expect(automaticResolution.canBeUndone()).toBe(false);
      });
    });
  });

  describe('resolution summary', () => {
    it('should generate summary for automatic resolution', () => {
      const result = ConflictResolution.createAutomatic(
        'LAST_WRITER_WINS',
        'HIGH',
        mockDeviceId,
        mockContext,
        {},
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const summary = result.value.getResolutionSummary();
        expect(summary).toContain('Automatic resolution');
        expect(summary).toContain('last writer wins');
        expect(summary).toContain('high confidence');
      }
    });

    it('should generate summary for manual resolution', () => {
      const result = ConflictResolution.createManual(
        'MANUAL_SELECTION',
        mockDeviceId,
        mockContext,
        {},
        { selectedOperationId: 'op-1' },
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const summary = result.value.getResolutionSummary();
        expect(summary).toContain('Manual resolution');
        expect(summary).toContain('manual selection');
      }
    });

    it('should handle all strategy descriptions', () => {
      const strategies: ConflictResolutionStrategy[] = [
        'LAST_WRITER_WINS',
        'FIRST_WRITER_WINS',
        'MERGE_OPERATIONS',
        'OPERATIONAL_TRANSFORM',
        'THREE_WAY_MERGE',
        'USER_DECISION_REQUIRED',
        'MANUAL_SELECTION',
      ];

      for (const strategy of strategies) {
        let result: any;
        if (['USER_DECISION_REQUIRED', 'MANUAL_SELECTION'].includes(strategy)) {
          result = ConflictResolution.createManual(
            strategy,
            mockDeviceId,
            mockContext,
            {},
            { selectedOperationId: 'op-1' },
          );
        } else {
          result = ConflictResolution.createAutomatic(
            strategy,
            'HIGH',
            mockDeviceId,
            mockContext,
            {},
          );
        }

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const summary = result.value.getResolutionSummary();
          expect(summary).toBeTruthy();
          expect(summary).not.toContain('unknown strategy');
        }
      }
    });
  });

  describe('resolution metrics', () => {
    it('should calculate resolution metrics', () => {
      vi.setSystemTime(new Date('2024-01-01T00:01:00Z')); // 1 minute later

      const result = ConflictResolution.createAutomatic(
        'LAST_WRITER_WINS',
        'HIGH',
        mockDeviceId,
        mockContext,
        {},
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value.getResolutionMetrics();
        expect(metrics.resolutionTimeMs).toBe(60000); // 1 minute
        expect(metrics.operationsInvolved).toBe(2);
        expect(metrics.devicesInvolved).toBe(1);
        expect(metrics.wasAutomated).toBe(true);
        expect(metrics.confidence).toBe('HIGH');
      }
    });

    it('should calculate age correctly', () => {
      const result = ConflictResolution.createAutomatic(
        'LAST_WRITER_WINS',
        'HIGH',
        mockDeviceId,
        mockContext,
        {},
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const resolution = result.value;

        // Initially age should be 0
        expect(resolution.getAgeMs()).toBe(0);
        expect(resolution.isExpired(1000)).toBe(false);

        // Advance time
        vi.setSystemTime(new Date('2024-01-01T00:00:05Z'));
        expect(resolution.getAgeMs()).toBe(5000);
        expect(resolution.isExpired(3000)).toBe(true);
        expect(resolution.isExpired(10000)).toBe(false);
      }
    });
  });

  describe('validation', () => {
    it('should validate valid automatic resolution', () => {
      const result = ConflictResolution.createAutomatic(
        'LAST_WRITER_WINS',
        'HIGH',
        mockDeviceId,
        mockContext,
        { data: 'valid' },
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const validation = result.value.validateResolution();
        expect(validation.isOk()).toBe(true);
      }
    });

    it('should reject resolution with null result data', () => {
      const result = ConflictResolution.createAutomatic(
        'LAST_WRITER_WINS',
        'HIGH',
        mockDeviceId,
        mockContext,
        null,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const validation = result.value.validateResolution();
        expect(validation.isErr()).toBe(true);
        if (validation.isErr()) {
          expect(validation.error.message).toContain('result data cannot be null');
        }
      }
    });

    it('should reject manual resolution without user selection', () => {
      // Create with invalid user selection to test validation
      const resolution = new (ConflictResolution as any)(
        'MANUAL_SELECTION',
        'HIGH',
        new Date(),
        mockDeviceId,
        mockContext,
        { data: 'valid' },
        undefined, // No user selection
        false, // Manual
      );

      const validation = resolution.validateResolution();
      expect(validation.isErr()).toBe(true);
      if (validation.isErr()) {
        expect(validation.error.message).toContain('Manual resolution must include user selection');
      }
    });

    it('should validate user selection', () => {
      const invalidSelection: UserSelection = {
        selectedOperationId: '', // Invalid
      };

      const result = ConflictResolution.createManual(
        'MANUAL_SELECTION',
        mockDeviceId,
        mockContext,
        { data: 'valid' },
        invalidSelection,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const validation = result.value.validateResolution();
        expect(validation.isErr()).toBe(true);
        if (validation.isErr()) {
          expect(validation.error.message).toContain('valid operation ID');
        }
      }
    });
  });

  describe('serialization', () => {
    it('should convert to JSON', () => {
      const result = ConflictResolution.createAutomatic(
        'LAST_WRITER_WINS',
        'HIGH',
        mockDeviceId,
        mockContext,
        { test: 'data' },
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const json = result.value.toJSON();
        expect(json.strategy).toBe('LAST_WRITER_WINS');
        expect(json.confidence).toBe('HIGH');
        expect(json.resolvedAt).toBe('2024-01-01T00:00:00.000Z');
        expect(json.context).toBe(mockContext);
        expect(json.resultData).toEqual({ test: 'data' });
        expect(json.automaticResolution).toBe(true);
      }
    });

    it('should convert to string', () => {
      const result = ConflictResolution.createAutomatic(
        'LAST_WRITER_WINS',
        'HIGH',
        mockDeviceId,
        mockContext,
        {},
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const str = result.value.toString();
        expect(str).toContain('ConflictResolution');
        expect(str).toContain('LAST_WRITER_WINS');
        expect(str).toContain('HIGH');
      }
    });
  });

  describe('clone', () => {
    it('should clone resolution successfully', () => {
      const original = ConflictResolution.createAutomatic(
        'LAST_WRITER_WINS',
        'HIGH',
        mockDeviceId,
        mockContext,
        { test: 'data' },
      );

      expect(original.isOk()).toBe(true);
      if (original.isOk()) {
        const cloneResult = original.value.clone();
        expect(cloneResult.isOk()).toBe(true);
        if (cloneResult.isOk()) {
          const clone = cloneResult.value;
          expect(clone.getStrategy()).toBe(original.value.getStrategy());
          expect(clone.getConfidence()).toBe(original.value.getConfidence());
          expect(clone.getResolvedBy()).toBe(original.value.getResolvedBy());
          expect(clone.getResultData()).toEqual(original.value.getResultData());

          // Should be different objects
          expect(clone).not.toBe(original.value);
          expect(clone.getResolvedAt()).not.toBe(original.value.getResolvedAt());
        }
      }
    });

    it('should handle clone errors for non-serializable data', () => {
      const circularRef: any = {};
      circularRef.self = circularRef;

      const original = ConflictResolution.createAutomatic(
        'LAST_WRITER_WINS',
        'HIGH',
        mockDeviceId,
        mockContext,
        circularRef,
      );

      expect(original.isOk()).toBe(true);
      if (original.isOk()) {
        const cloneResult = original.value.clone();
        expect(cloneResult.isErr()).toBe(true);
      }
    });
  });

  describe('equals', () => {
    it('should return true for equal resolutions', () => {
      const data = { test: 'data' };
      const result1 = ConflictResolution.createAutomatic(
        'LAST_WRITER_WINS',
        'HIGH',
        mockDeviceId,
        mockContext,
        data,
      );
      const result2 = ConflictResolution.createAutomatic(
        'LAST_WRITER_WINS',
        'HIGH',
        mockDeviceId,
        mockContext,
        data,
      );

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });

    it('should return false for different strategies', () => {
      const result1 = ConflictResolution.createAutomatic(
        'LAST_WRITER_WINS',
        'HIGH',
        mockDeviceId,
        mockContext,
        {},
      );
      const result2 = ConflictResolution.createAutomatic(
        'FIRST_WRITER_WINS',
        'HIGH',
        mockDeviceId,
        mockContext,
        {},
      );

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });

    it('should return false for different conflict IDs', () => {
      const context2 = { ...mockContext, conflictId: 'different-conflict' };
      const result1 = ConflictResolution.createAutomatic(
        'LAST_WRITER_WINS',
        'HIGH',
        mockDeviceId,
        mockContext,
        {},
      );
      const result2 = ConflictResolution.createAutomatic(
        'LAST_WRITER_WINS',
        'HIGH',
        mockDeviceId,
        context2,
        {},
      );

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });
  });
});

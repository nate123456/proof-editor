import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';

import { ValidationController } from '../ValidationController.js';

// Mock timers
vi.useFakeTimers();

// Mock DiagnosticProvider
const mockDiagnosticProvider = {
  validateDocument: vi.fn(),
  clearDiagnostics: vi.fn(),
  clearAllDiagnostics: vi.fn(),
  dispose: vi.fn(),
};

vi.mock('../DiagnosticProvider.js', () => ({
  ProofDiagnosticProvider: vi.fn(() => mockDiagnosticProvider),
}));

describe('ValidationController', () => {
  let controller: ValidationController;
  let mockDocument: vscode.TextDocument;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDocument = {
      languageId: 'proof',
      uri: { toString: () => 'file:///test.proof' } as any,
      getText: () => 'test content',
    } as any;

    controller = new ValidationController(500); // 500ms delay
  });

  afterEach(() => {
    controller.dispose();
  });

  describe('constructor', () => {
    it('should create diagnostic provider', () => {
      expect(controller).toBeDefined();
      expect(controller.getDiagnosticProvider()).toBe(mockDiagnosticProvider);
    });

    it('should use default validation delay when not specified', () => {
      const defaultController = new ValidationController();
      expect(defaultController).toBeDefined();
    });
  });

  describe('validateDocumentImmediate', () => {
    it('should validate document immediately', () => {
      controller.validateDocumentImmediate(mockDocument);

      expect(mockDiagnosticProvider.validateDocument).toHaveBeenCalledWith(mockDocument);
    });

    it('should validate non-proof documents immediately', () => {
      const nonProofDocument = { ...mockDocument, languageId: 'typescript' };

      controller.validateDocumentImmediate(nonProofDocument);

      expect(mockDiagnosticProvider.validateDocument).toHaveBeenCalledWith(nonProofDocument);
    });
  });

  describe('validateDocumentDebounced', () => {
    it('should skip validation for non-proof documents', () => {
      const nonProofDocument = { ...mockDocument, languageId: 'typescript' };

      controller.validateDocumentDebounced(nonProofDocument);
      vi.runAllTimers();

      expect(mockDiagnosticProvider.validateDocument).not.toHaveBeenCalled();
    });

    it('should debounce validation for proof documents', () => {
      controller.validateDocumentDebounced(mockDocument);

      // Validation should not happen immediately
      expect(mockDiagnosticProvider.validateDocument).not.toHaveBeenCalled();

      // Run timers to trigger debounced validation
      vi.runAllTimers();

      expect(mockDiagnosticProvider.validateDocument).toHaveBeenCalledWith(mockDocument);
    });

    it('should cancel previous validation when new validation is requested', () => {
      // Start first validation
      controller.validateDocumentDebounced(mockDocument);

      // Start second validation before first completes
      controller.validateDocumentDebounced(mockDocument);

      // Run all timers
      vi.runAllTimers();

      // Should only validate once (the second call)
      expect(mockDiagnosticProvider.validateDocument).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple documents independently', () => {
      const document2 = {
        ...mockDocument,
        uri: { toString: () => 'file:///test2.proof' } as any,
      };

      controller.validateDocumentDebounced(mockDocument);
      controller.validateDocumentDebounced(document2);

      vi.runAllTimers();

      expect(mockDiagnosticProvider.validateDocument).toHaveBeenCalledTimes(2);
      expect(mockDiagnosticProvider.validateDocument).toHaveBeenCalledWith(mockDocument);
      expect(mockDiagnosticProvider.validateDocument).toHaveBeenCalledWith(document2);
    });

    it('should respect custom validation delay', () => {
      const customController = new ValidationController(1000);

      customController.validateDocumentDebounced(mockDocument);

      // Advance time by 500ms - should not validate yet
      vi.advanceTimersByTime(500);
      expect(mockDiagnosticProvider.validateDocument).not.toHaveBeenCalled();

      // Advance time by another 500ms - should validate now
      vi.advanceTimersByTime(500);
      expect(mockDiagnosticProvider.validateDocument).toHaveBeenCalledWith(mockDocument);

      customController.dispose();
    });
  });

  describe('clearDocumentValidation', () => {
    it('should clear pending validation timeout', () => {
      controller.validateDocumentDebounced(mockDocument);

      // Clear validation before it executes
      controller.clearDocumentValidation(mockDocument);

      // Run timers - validation should not happen
      vi.runAllTimers();

      expect(mockDiagnosticProvider.validateDocument).not.toHaveBeenCalled();
    });

    it('should clear diagnostics for document', () => {
      controller.clearDocumentValidation(mockDocument);

      expect(mockDiagnosticProvider.clearDiagnostics).toHaveBeenCalledWith(mockDocument);
    });

    it('should handle clearing non-existent timeout gracefully', () => {
      // Clear validation for document that was never scheduled
      expect(() => {
        controller.clearDocumentValidation(mockDocument);
      }).not.toThrow();

      expect(mockDiagnosticProvider.clearDiagnostics).toHaveBeenCalledWith(mockDocument);
    });
  });

  describe('clearAllValidation', () => {
    it('should clear all pending validations', () => {
      const document2 = {
        ...mockDocument,
        uri: { toString: () => 'file:///test2.proof' } as any,
      };

      controller.validateDocumentDebounced(mockDocument);
      controller.validateDocumentDebounced(document2);

      controller.clearAllValidation();

      // Run timers - no validations should happen
      vi.runAllTimers();

      expect(mockDiagnosticProvider.validateDocument).not.toHaveBeenCalled();
    });

    it('should clear all diagnostics', () => {
      controller.clearAllValidation();

      expect(mockDiagnosticProvider.clearAllDiagnostics).toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('should clear all validations and dispose diagnostic provider', () => {
      controller.validateDocumentDebounced(mockDocument);

      controller.dispose();

      // Run timers - no validations should happen after dispose
      vi.runAllTimers();

      expect(mockDiagnosticProvider.validateDocument).not.toHaveBeenCalled();
      expect(mockDiagnosticProvider.clearAllDiagnostics).toHaveBeenCalled();
      expect(mockDiagnosticProvider.dispose).toHaveBeenCalled();
    });

    it('should be safe to call multiple times', () => {
      controller.dispose();
      controller.dispose();

      expect(mockDiagnosticProvider.dispose).toHaveBeenCalledTimes(2);
    });
  });

  describe('getDiagnosticProvider', () => {
    it('should return the diagnostic provider instance', () => {
      const provider = controller.getDiagnosticProvider();

      expect(provider).toBe(mockDiagnosticProvider);
    });
  });

  describe('debouncing behavior', () => {
    it('should reset debounce timer on repeated calls', () => {
      controller.validateDocumentDebounced(mockDocument);

      // Advance time partially
      vi.advanceTimersByTime(250);

      // Call again - should reset the timer
      controller.validateDocumentDebounced(mockDocument);

      // Advance time by the original delay - should not validate yet
      vi.advanceTimersByTime(250);
      expect(mockDiagnosticProvider.validateDocument).not.toHaveBeenCalled();

      // Advance time by remaining delay - should validate now
      vi.advanceTimersByTime(250);
      expect(mockDiagnosticProvider.validateDocument).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid successive validations correctly', () => {
      // Simulate rapid typing with multiple validation requests
      for (let i = 0; i < 10; i++) {
        controller.validateDocumentDebounced(mockDocument);
        vi.advanceTimersByTime(100); // Advance less than the delay each time
      }

      // Should not have validated yet
      expect(mockDiagnosticProvider.validateDocument).not.toHaveBeenCalled();

      // Complete the final delay
      vi.advanceTimersByTime(500);

      // Should validate exactly once
      expect(mockDiagnosticProvider.validateDocument).toHaveBeenCalledTimes(1);
    });
  });

  describe('memory management', () => {
    it('should clean up timeout references after validation', () => {
      controller.validateDocumentDebounced(mockDocument);
      vi.runAllTimers();

      // The timeout should be cleaned up after execution
      // This is tested implicitly by checking that clearDocumentValidation
      // doesn't affect anything when called after timeout execution
      controller.clearDocumentValidation(mockDocument);

      // Should still clear diagnostics even if no timeout exists
      expect(mockDiagnosticProvider.clearDiagnostics).toHaveBeenCalledWith(mockDocument);
    });
  });
});

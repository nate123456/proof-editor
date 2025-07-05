import { ok } from 'neverthrow';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IDiagnosticPort } from '../../application/ports/IDiagnosticPort.js';
import type { DocumentInfo, ValidationController } from '../ValidationController.js';

// Mock timers
vi.useFakeTimers();

// Create properly typed mock IDiagnosticPort
const createMockDiagnosticPort = (): IDiagnosticPort => ({
  validateDocument: vi.fn().mockResolvedValue(ok(undefined)),
  clearDiagnostics: vi.fn(),
  clearAllDiagnostics: vi.fn(),
  dispose: vi.fn(),
});

describe('ValidationController', () => {
  let controller: ValidationController;
  let mockDocument: DocumentInfo;
  let mockDiagnosticPort: IDiagnosticPort;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create a fresh mock diagnostic port instance
    mockDiagnosticPort = createMockDiagnosticPort();

    mockDocument = {
      languageId: 'proof',
      uri: 'file:///test.proof',
      content: 'test content',
    };

    // Dynamic import to avoid circular dependencies
    const { ValidationController: ValidationControllerClass } = await import(
      '../ValidationController.js'
    );
    controller = new ValidationControllerClass(mockDiagnosticPort, 500); // 500ms delay
  });

  afterEach(() => {
    controller.dispose();
  });

  describe('constructor', () => {
    it('should create validation controller', () => {
      expect(controller).toBeDefined();
    });

    it('should use default validation delay when not specified', async () => {
      const { ValidationController: ValidationControllerClass } = await import(
        '../ValidationController.js'
      );
      const defaultController = new ValidationControllerClass(mockDiagnosticPort);
      expect(defaultController).toBeDefined();
      defaultController.dispose();
    });
  });

  describe('validateDocumentImmediate', () => {
    it('should validate document immediately', async () => {
      const result = await controller.validateDocumentImmediate(mockDocument);

      expect(result.isOk()).toBe(true);
      expect(mockDiagnosticPort.validateDocument).toHaveBeenCalledWith(
        mockDocument.uri,
        mockDocument.content,
      );
    });

    it('should skip non-proof documents', async () => {
      const nonProofDocument = { ...mockDocument, languageId: 'typescript' };

      const result = await controller.validateDocumentImmediate(nonProofDocument);

      expect(result.isOk()).toBe(true);
      expect(mockDiagnosticPort.validateDocument).not.toHaveBeenCalled();
    });
  });

  describe('validateDocumentDebounced', () => {
    it('should skip validation for non-proof documents', () => {
      const nonProofDocument = { ...mockDocument, languageId: 'typescript' };

      controller.validateDocumentDebounced(nonProofDocument);
      vi.runAllTimers();

      expect(mockDiagnosticPort.validateDocument).not.toHaveBeenCalled();
    });

    it('should debounce validation for proof documents', () => {
      controller.validateDocumentDebounced(mockDocument);

      // Validation should not happen immediately
      expect(mockDiagnosticPort.validateDocument).not.toHaveBeenCalled();

      // Run timers to trigger debounced validation
      vi.runAllTimers();

      expect(mockDiagnosticPort.validateDocument).toHaveBeenCalledWith(
        mockDocument.uri,
        mockDocument.content,
      );
    });

    it('should cancel previous validation when new validation is requested', () => {
      // Start first validation
      controller.validateDocumentDebounced(mockDocument);

      // Start second validation before first completes
      controller.validateDocumentDebounced(mockDocument);

      // Run all timers
      vi.runAllTimers();

      // Should only validate once (the second call)
      expect(mockDiagnosticPort.validateDocument).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple documents independently', () => {
      const document2 = {
        ...mockDocument,
        uri: 'file:///test2.proof',
      };

      controller.validateDocumentDebounced(mockDocument);
      controller.validateDocumentDebounced(document2);

      vi.runAllTimers();

      expect(mockDiagnosticPort.validateDocument).toHaveBeenCalledTimes(2);
      expect(mockDiagnosticPort.validateDocument).toHaveBeenCalledWith(
        mockDocument.uri,
        mockDocument.content,
      );
      expect(mockDiagnosticPort.validateDocument).toHaveBeenCalledWith(
        document2.uri,
        document2.content,
      );
    });

    it('should respect custom validation delay', async () => {
      const { ValidationController: ValidationControllerClass } = await import(
        '../ValidationController.js'
      );
      const customController = new ValidationControllerClass(mockDiagnosticPort, 1000);

      customController.validateDocumentDebounced(mockDocument);

      // Advance time by 500ms - should not validate yet
      vi.advanceTimersByTime(500);
      expect(mockDiagnosticPort.validateDocument).not.toHaveBeenCalled();

      // Advance time by another 500ms - should validate now
      vi.advanceTimersByTime(500);
      expect(mockDiagnosticPort.validateDocument).toHaveBeenCalledWith(
        mockDocument.uri,
        mockDocument.content,
      );

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

      expect(mockDiagnosticPort.validateDocument).not.toHaveBeenCalled();
    });

    it('should clear diagnostics for document', () => {
      controller.clearDocumentValidation(mockDocument);

      expect(mockDiagnosticPort.clearDiagnostics).toHaveBeenCalledWith(mockDocument.uri);
    });

    it('should handle clearing non-existent timeout gracefully', () => {
      // Clear validation for document that was never scheduled
      expect(() => {
        controller.clearDocumentValidation(mockDocument);
      }).not.toThrow();

      expect(mockDiagnosticPort.clearDiagnostics).toHaveBeenCalledWith(mockDocument.uri);
    });
  });

  describe('clearAllValidation', () => {
    it('should clear all pending validations', () => {
      const document2 = {
        ...mockDocument,
        uri: 'file:///test2.proof',
      };

      controller.validateDocumentDebounced(mockDocument);
      controller.validateDocumentDebounced(document2);

      controller.clearAllValidation();

      // Run timers - no validations should happen
      vi.runAllTimers();

      expect(mockDiagnosticPort.validateDocument).not.toHaveBeenCalled();
    });

    it('should clear all diagnostics', () => {
      controller.clearAllValidation();

      expect(mockDiagnosticPort.clearAllDiagnostics).toHaveBeenCalled();
    });
  });

  describe('advanced validation scenarios', () => {
    it('should handle validation errors gracefully', async () => {
      const { err } = await import('neverthrow');

      // Mock the diagnostic port to return an error
      vi.mocked(mockDiagnosticPort.validateDocument).mockResolvedValue(
        err({
          code: 'VALIDATION_FAILED',
          message: 'Document corrupted',
        }),
      );

      const result = await controller.validateDocumentImmediate(mockDocument);

      expect(result.isErr()).toBe(true);
      expect(result.isErr() && result.error.message).toContain('Document corrupted');
    });

    it('should handle rapid validation requests with debouncing', () => {
      const rapidDocument = {
        ...mockDocument,
        content: 'statements:\n  s1: "Test statement"',
      };

      // Fire multiple rapid validation requests
      for (let i = 0; i < 10; i++) {
        controller.validateDocumentDebounced(rapidDocument);
      }

      // Should not have validated yet due to debouncing
      expect(mockDiagnosticPort.validateDocument).not.toHaveBeenCalled();

      // Fast-forward past debounce delay
      vi.advanceTimersByTime(500);

      // Should have validated only once
      expect(mockDiagnosticPort.validateDocument).toHaveBeenCalledTimes(1);
    });

    it('should handle clearing validation for non-existent documents', () => {
      const nonExistentDocument = {
        ...mockDocument,
        uri: 'file:///non-existent.proof',
      };

      // Should not throw when clearing validation for non-existent document
      expect(() => {
        controller.clearDocumentValidation(nonExistentDocument);
      }).not.toThrow();

      expect(mockDiagnosticPort.clearDiagnostics).toHaveBeenCalledWith(nonExistentDocument.uri);
    });

    it('should handle validation of extremely large documents', async () => {
      const largeContent = `statements:\n${'a'.repeat(1000000)}`;
      const largeDocument = {
        ...mockDocument,
        content: largeContent,
      };

      const startTime = Date.now();
      const result = await controller.validateDocumentImmediate(largeDocument);
      const endTime = Date.now();

      expect(result.isOk()).toBe(true);
      expect(mockDiagnosticPort.validateDocument).toHaveBeenCalledWith(
        largeDocument.uri,
        largeDocument.content,
      );
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});

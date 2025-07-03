import { beforeEach, describe, expect, it } from 'vitest';

import { SourceLocation } from '../../../../../domain/shared/index.js';
import { ValidationError } from '../../errors/DomainErrors.js';
import { ValidationLevel } from '../ValidationLevel.js';
import { ValidationRequest, ValidationRequestMetadataFactory } from '../ValidationRequest.js';

describe('ValidationRequest', () => {
  const validStatementText = 'P → Q';
  const validLocation = SourceLocation.createDefault();
  const validLevel = ValidationLevel.syntax();
  const validDocumentId = 'doc-123';
  const validLanguagePackageId = 'lang-123';

  describe('create', () => {
    it('should create valid ValidationRequest', () => {
      const result = ValidationRequest.create(
        validStatementText,
        validLocation,
        validLevel,
        validDocumentId,
        validLanguagePackageId
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const request = result.value;
        expect(request.getStatementText()).toBe(validStatementText);
        expect(request.getLocation()).toBe(validLocation);
        expect(request.getValidationLevel()).toBe(validLevel);
        expect(request.getDocumentId()).toBe(validDocumentId);
        expect(request.getLanguagePackageId()).toBe(validLanguagePackageId);
      }
    });

    it('should trim whitespace from statement text', () => {
      const result = ValidationRequest.create(
        '  P → Q  ',
        validLocation,
        validLevel,
        validDocumentId,
        validLanguagePackageId
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getStatementText()).toBe('P → Q');
      }
    });

    it('should trim whitespace from document ID', () => {
      const result = ValidationRequest.create(
        validStatementText,
        validLocation,
        validLevel,
        '  doc-123  ',
        validLanguagePackageId
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getDocumentId()).toBe('doc-123');
      }
    });

    it('should trim whitespace from language package ID', () => {
      const result = ValidationRequest.create(
        validStatementText,
        validLocation,
        validLevel,
        validDocumentId,
        '  lang-123  '
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getLanguagePackageId()).toBe('lang-123');
      }
    });

    it('should reject empty statement text', () => {
      const result = ValidationRequest.create(
        '',
        validLocation,
        validLevel,
        validDocumentId,
        validLanguagePackageId
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Statement text cannot be empty');
      }
    });

    it('should reject whitespace-only statement text', () => {
      const result = ValidationRequest.create(
        '   ',
        validLocation,
        validLevel,
        validDocumentId,
        validLanguagePackageId
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Statement text cannot be empty');
      }
    });

    it('should reject empty document ID', () => {
      const result = ValidationRequest.create(
        validStatementText,
        validLocation,
        validLevel,
        '',
        validLanguagePackageId
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Document ID cannot be empty');
      }
    });

    it('should reject whitespace-only document ID', () => {
      const result = ValidationRequest.create(
        validStatementText,
        validLocation,
        validLevel,
        '   ',
        validLanguagePackageId
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Document ID cannot be empty');
      }
    });

    it('should reject empty language package ID', () => {
      const result = ValidationRequest.create(
        validStatementText,
        validLocation,
        validLevel,
        validDocumentId,
        ''
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Language package ID cannot be empty');
      }
    });

    it('should reject whitespace-only language package ID', () => {
      const result = ValidationRequest.create(
        validStatementText,
        validLocation,
        validLevel,
        validDocumentId,
        '   '
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Language package ID cannot be empty');
      }
    });

    it('should use provided metadata', () => {
      const customMetadata = {
        ...ValidationRequestMetadataFactory.createDefault(),
        trackPerformance: false,
        educationalFeedback: false,
      };

      const result = ValidationRequest.create(
        validStatementText,
        validLocation,
        validLevel,
        validDocumentId,
        validLanguagePackageId,
        customMetadata
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const request = result.value;
        expect(request.requiresPerformanceTracking()).toBe(false);
        expect(request.enablesEducationalFeedback()).toBe(false);
      }
    });
  });

  describe('createForInference', () => {
    const validPremises = ['P', 'P → Q'];
    const validConclusions = ['Q'];

    it('should create inference validation request', () => {
      const result = ValidationRequest.createForInference(
        validPremises,
        validConclusions,
        validLevel,
        validDocumentId,
        validLanguagePackageId
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const request = result.value;
        expect(request.isInferenceValidation()).toBe(true);
        expect(request.getPremises()).toEqual(validPremises);
        expect(request.getConclusions()).toEqual(validConclusions);
        expect(request.getStatementText()).toBe('P | P → Q ⊢ Q');
      }
    });

    it('should reject empty premises', () => {
      const result = ValidationRequest.createForInference(
        [],
        validConclusions,
        validLevel,
        validDocumentId,
        validLanguagePackageId
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('At least one premise is required');
      }
    });

    it('should reject empty conclusions', () => {
      const result = ValidationRequest.createForInference(
        validPremises,
        [],
        validLevel,
        validDocumentId,
        validLanguagePackageId
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('At least one conclusion is required');
      }
    });

    it('should handle multiple premises and conclusions', () => {
      const premises = ['P', 'Q', 'R'];
      const conclusions = ['S', 'T'];

      const result = ValidationRequest.createForInference(
        premises,
        conclusions,
        validLevel,
        validDocumentId,
        validLanguagePackageId
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const request = result.value;
        expect(request.getStatementText()).toBe('P | Q | R ⊢ S | T');
        expect(request.getPremises()).toEqual(premises);
        expect(request.getConclusions()).toEqual(conclusions);
      }
    });
  });

  describe('getter methods', () => {
    let request: ValidationRequest;

    beforeEach(() => {
      const result = ValidationRequest.create(
        validStatementText,
        validLocation,
        validLevel,
        validDocumentId,
        validLanguagePackageId
      );
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        request = result.value;
      }
    });

    it('should return statement text', () => {
      expect(request.getStatementText()).toBe(validStatementText);
    });

    it('should return location', () => {
      expect(request.getLocation()).toBe(validLocation);
    });

    it('should return validation level', () => {
      expect(request.getValidationLevel()).toBe(validLevel);
    });

    it('should return document ID', () => {
      expect(request.getDocumentId()).toBe(validDocumentId);
    });

    it('should return language package ID', () => {
      expect(request.getLanguagePackageId()).toBe(validLanguagePackageId);
    });

    it('should return metadata', () => {
      const metadata = request.getMetadata();
      expect(metadata).toBeDefined();
      expect(metadata.isInferenceValidation).toBe(false);
    });

    it('should return statement length', () => {
      expect(request.getStatementLength()).toBe(validStatementText.length);
    });
  });

  describe('inference validation methods', () => {
    it('should return false for non-inference validation', () => {
      const result = ValidationRequest.create(
        validStatementText,
        validLocation,
        validLevel,
        validDocumentId,
        validLanguagePackageId
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const request = result.value;
        expect(request.isInferenceValidation()).toBe(false);
        expect(request.getPremises()).toEqual([]);
        expect(request.getConclusions()).toEqual([]);
      }
    });

    it('should return true for inference validation', () => {
      const result = ValidationRequest.createForInference(
        ['P'],
        ['Q'],
        validLevel,
        validDocumentId,
        validLanguagePackageId
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const request = result.value;
        expect(request.isInferenceValidation()).toBe(true);
        expect(request.getPremises()).toEqual(['P']);
        expect(request.getConclusions()).toEqual(['Q']);
      }
    });
  });

  describe('metadata flag methods', () => {
    it('should return default metadata flags', () => {
      const result = ValidationRequest.create(
        validStatementText,
        validLocation,
        validLevel,
        validDocumentId,
        validLanguagePackageId
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const request = result.value;
        expect(request.requiresPerformanceTracking()).toBe(true);
        expect(request.enablesEducationalFeedback()).toBe(true);
        expect(request.hasCustomValidators()).toBe(false);
        expect(request.getCustomValidators()).toEqual([]);
      }
    });

    it('should handle custom validators', () => {
      const customMetadata = {
        ...ValidationRequestMetadataFactory.createDefault(),
        customValidators: ['validator1', 'validator2'],
      };

      const result = ValidationRequest.create(
        validStatementText,
        validLocation,
        validLevel,
        validDocumentId,
        validLanguagePackageId,
        customMetadata
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const request = result.value;
        expect(request.hasCustomValidators()).toBe(true);
        expect(request.getCustomValidators()).toEqual(['validator1', 'validator2']);
      }
    });
  });

  describe('complexity score calculation', () => {
    it('should calculate basic complexity for simple text', () => {
      const result = ValidationRequest.create(
        'P',
        validLocation,
        validLevel,
        validDocumentId,
        validLanguagePackageId
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getComplexityScore()).toBe(1); // Just length
      }
    });

    it('should add weight for logical symbols', () => {
      const result = ValidationRequest.create(
        '∀x(P(x) → Q(x))',
        validLocation,
        validLevel,
        validDocumentId,
        validLanguagePackageId
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const score = result.value.getComplexityScore();
        expect(score).toBeGreaterThan(15); // Length + symbol weights + parentheses
      }
    });

    it('should add weight for parentheses', () => {
      const result = ValidationRequest.create(
        '(P ∧ Q)',
        validLocation,
        validLevel,
        validDocumentId,
        validLanguagePackageId
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const score = result.value.getComplexityScore();
        expect(score).toBe(Math.floor(7 + 2 + 1)); // length + symbol + parentheses
      }
    });
  });

  describe('withLevel', () => {
    it('should create new request with different level', () => {
      const originalResult = ValidationRequest.create(
        validStatementText,
        validLocation,
        validLevel,
        validDocumentId,
        validLanguagePackageId
      );

      expect(originalResult.isOk()).toBe(true);
      if (originalResult.isOk()) {
        const original = originalResult.value;
        const newLevel = ValidationLevel.semantic();
        const updated = original.withLevel(newLevel);

        expect(updated.getValidationLevel()).toBe(newLevel);
        expect(updated.getStatementText()).toBe(original.getStatementText());
        expect(updated.getDocumentId()).toBe(original.getDocumentId());
      }
    });
  });

  describe('withMetadata', () => {
    it('should create new request with updated metadata', () => {
      const originalResult = ValidationRequest.create(
        validStatementText,
        validLocation,
        validLevel,
        validDocumentId,
        validLanguagePackageId
      );

      expect(originalResult.isOk()).toBe(true);
      if (originalResult.isOk()) {
        const original = originalResult.value;
        const updated = original.withMetadata({
          trackPerformance: false,
          customValidators: ['custom1'],
        });

        expect(updated.requiresPerformanceTracking()).toBe(false);
        expect(updated.hasCustomValidators()).toBe(true);
        expect(updated.getCustomValidators()).toEqual(['custom1']);
        expect(updated.enablesEducationalFeedback()).toBe(true); // Should preserve original
      }
    });
  });

  describe('equals', () => {
    it('should return true for identical requests', () => {
      const result1 = ValidationRequest.create(
        validStatementText,
        validLocation,
        validLevel,
        validDocumentId,
        validLanguagePackageId
      );
      const result2 = ValidationRequest.create(
        validStatementText,
        validLocation,
        validLevel,
        validDocumentId,
        validLanguagePackageId
      );

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });

    it('should return false for different statement text', () => {
      const result1 = ValidationRequest.create(
        'P',
        validLocation,
        validLevel,
        validDocumentId,
        validLanguagePackageId
      );
      const result2 = ValidationRequest.create(
        'Q',
        validLocation,
        validLevel,
        validDocumentId,
        validLanguagePackageId
      );

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });

    it('should return false for different document ID', () => {
      const result1 = ValidationRequest.create(
        validStatementText,
        validLocation,
        validLevel,
        'doc-1',
        validLanguagePackageId
      );
      const result2 = ValidationRequest.create(
        validStatementText,
        validLocation,
        validLevel,
        'doc-2',
        validLanguagePackageId
      );

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });
  });
});

describe('ValidationRequestMetadataFactory', () => {
  describe('createDefault', () => {
    it('should create default metadata', () => {
      const metadata = ValidationRequestMetadataFactory.createDefault();

      expect(metadata.isInferenceValidation).toBe(false);
      expect(metadata.trackPerformance).toBe(true);
      expect(metadata.educationalFeedback).toBe(true);
      expect(metadata.requestSource).toBe('editor');
      expect(metadata.priority).toBe('normal');
      expect(metadata.timeout).toBe(10000);
    });
  });

  describe('createForLSP', () => {
    it('should create LSP-specific metadata', () => {
      const metadata = ValidationRequestMetadataFactory.createForLSP();

      expect(metadata.requestSource).toBe('lsp');
      expect(metadata.timeout).toBe(5000);
      expect(metadata.trackPerformance).toBe(true);
      expect(metadata.educationalFeedback).toBe(true);
    });
  });

  describe('createForAPI', () => {
    it('should create API-specific metadata', () => {
      const metadata = ValidationRequestMetadataFactory.createForAPI();

      expect(metadata.requestSource).toBe('api');
      expect(metadata.priority).toBe('high');
      expect(metadata.timeout).toBe(15000);
      expect(metadata.trackPerformance).toBe(true);
      expect(metadata.educationalFeedback).toBe(true);
    });
  });
});

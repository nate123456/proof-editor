/**
 * Tests for Diagnostic entity
 *
 * Focuses on:
 * - Basic creation and validation
 * - Static factory methods for different diagnostic types
 * - Related diagnostic management
 * - Tag-based categorization
 * - Quick fix management
 * - Location overlap and severity comparison
 * - High coverage for all methods and edge cases
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { SourceLocation } from '../../../../../domain/shared/index.js';
import { Diagnostic } from '../../entities/Diagnostic';
import { ValidationError } from '../../errors/DomainErrors';
import { DiagnosticId } from '../../value-objects/DiagnosticId';
import { DiagnosticSeverity } from '../../value-objects/DiagnosticSeverity';

describe('Diagnostic', () => {
  const validLanguagePackageId = 'lang-package-123';
  let mockLocation: SourceLocation;

  beforeEach(() => {
    const locationResult = SourceLocation.createSinglePosition(1, 1);
    if (locationResult.isOk()) {
      mockLocation = locationResult.value;
    }
  });

  describe('create', () => {
    it('should create a new diagnostic with valid inputs', () => {
      const result = Diagnostic.create(
        DiagnosticSeverity.error(),
        'Test error message',
        'test-error',
        mockLocation,
        validLanguagePackageId,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const diagnostic = result.value;
        expect(diagnostic.getMessage().getText()).toBe('Test error message');
        expect(diagnostic.getCode().getCode()).toBe('test-error');
        expect(diagnostic.getLanguagePackageId()).toBe(validLanguagePackageId);
        expect(diagnostic.getLocation()).toBe(mockLocation);
        expect(diagnostic.getSeverity()).toEqual(DiagnosticSeverity.error());
        expect(diagnostic.getRelatedDiagnostics()).toEqual([]);
        expect(diagnostic.getQuickFixes()).toEqual([]);
        expect(diagnostic.getTags()).toEqual([]);
      }
    });

    it('should create diagnostic with quick fixes and tags', () => {
      const quickFixes = ['Add semicolon', 'Remove extra space'];
      const tags = ['syntax', 'punctuation'];

      const result = Diagnostic.create(
        DiagnosticSeverity.warning(),
        'Missing semicolon',
        'missing-semicolon',
        mockLocation,
        validLanguagePackageId,
        quickFixes,
        tags,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const diagnostic = result.value;
        expect(diagnostic.getQuickFixes()).toEqual(quickFixes);
        expect(diagnostic.getTags()).toEqual(tags);
        expect(diagnostic.hasQuickFixes()).toBe(true);
        expect(diagnostic.hasTag('syntax')).toBe(true);
        expect(diagnostic.hasTag('punctuation')).toBe(true);
        expect(diagnostic.hasTag('nonexistent')).toBe(false);
      }
    });

    it('should fail with empty message', () => {
      const result = Diagnostic.create(
        DiagnosticSeverity.error(),
        '',
        'test-error',
        mockLocation,
        validLanguagePackageId,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    it('should fail with whitespace-only message', () => {
      const result = Diagnostic.create(
        DiagnosticSeverity.error(),
        '   ',
        'test-error',
        mockLocation,
        validLanguagePackageId,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    it('should fail with empty code', () => {
      const result = Diagnostic.create(
        DiagnosticSeverity.error(),
        'Test message',
        '',
        mockLocation,
        validLanguagePackageId,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    it('should fail with whitespace-only code', () => {
      const result = Diagnostic.create(
        DiagnosticSeverity.error(),
        'Test message',
        '   ',
        mockLocation,
        validLanguagePackageId,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });
  });

  describe('createSyntaxError', () => {
    it('should create syntax error diagnostic', () => {
      const quickFixes = ['Fix syntax'];
      const result = Diagnostic.createSyntaxError(
        'Invalid syntax detected',
        mockLocation,
        validLanguagePackageId,
        quickFixes,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const diagnostic = result.value;
        expect(diagnostic.getMessage().getText()).toBe('Invalid syntax detected');
        expect(diagnostic.getCode().getCode()).toBe('syntax-error');
        expect(diagnostic.getSeverity().isError()).toBe(true);
        expect(diagnostic.hasTag('syntax')).toBe(true);
        expect(diagnostic.isSyntaxRelated()).toBe(true);
        expect(diagnostic.getQuickFixes()).toEqual(quickFixes);
      }
    });

    it('should create syntax error without quick fixes', () => {
      const result = Diagnostic.createSyntaxError(
        'Syntax error',
        mockLocation,
        validLanguagePackageId,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const diagnostic = result.value;
        expect(diagnostic.hasQuickFixes()).toBe(false);
        expect(diagnostic.getQuickFixes()).toEqual([]);
      }
    });
  });

  describe('createSemanticError', () => {
    it('should create semantic error diagnostic', () => {
      const quickFixes = ['Add type annotation'];
      const result = Diagnostic.createSemanticError(
        'Type mismatch',
        mockLocation,
        validLanguagePackageId,
        quickFixes,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const diagnostic = result.value;
        expect(diagnostic.getMessage().getText()).toBe('Type mismatch');
        expect(diagnostic.getCode().getCode()).toBe('semantic-error');
        expect(diagnostic.getSeverity().isError()).toBe(true);
        expect(diagnostic.hasTag('semantic')).toBe(true);
        expect(diagnostic.isSemanticRelated()).toBe(true);
      }
    });
  });

  describe('createStyleWarning', () => {
    it('should create style warning diagnostic', () => {
      const quickFixes = ['Apply formatting'];
      const result = Diagnostic.createStyleWarning(
        'Inconsistent indentation',
        mockLocation,
        validLanguagePackageId,
        quickFixes,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const diagnostic = result.value;
        expect(diagnostic.getMessage().getText()).toBe('Inconsistent indentation');
        expect(diagnostic.getCode().getCode()).toBe('style-warning');
        expect(diagnostic.getSeverity().isWarning()).toBe(true);
        expect(diagnostic.hasTag('style')).toBe(true);
        expect(diagnostic.isStyleRelated()).toBe(true);
      }
    });
  });

  describe('createEducationalInfo', () => {
    it('should create educational info diagnostic', () => {
      const learningHints = ['Learn about proof techniques', 'Study logical operators'];
      const result = Diagnostic.createEducationalInfo(
        'Consider using modus ponens here',
        mockLocation,
        validLanguagePackageId,
        learningHints,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const diagnostic = result.value;
        expect(diagnostic.getMessage().getText()).toBe('Consider using modus ponens here');
        expect(diagnostic.getCode().getCode()).toBe('educational-info');
        expect(diagnostic.getSeverity().isInfo()).toBe(true);
        expect(diagnostic.hasTag('educational')).toBe(true);
        expect(diagnostic.isEducational()).toBe(true);
        expect(diagnostic.getQuickFixes()).toEqual(learningHints);
      }
    });
  });

  describe('related diagnostic management', () => {
    let diagnostic: Diagnostic;
    let relatedDiagnosticId: DiagnosticId;

    beforeEach(() => {
      const result = Diagnostic.create(
        DiagnosticSeverity.error(),
        'Main error',
        'main-error',
        mockLocation,
        validLanguagePackageId,
      );
      if (result.isOk()) {
        diagnostic = result.value;
      }
      relatedDiagnosticId = DiagnosticId.generate();
    });

    it('should add related diagnostic', () => {
      const result = diagnostic.addRelatedDiagnostic(relatedDiagnosticId);

      expect(result.isOk()).toBe(true);
      const relatedDiagnostics = diagnostic.getRelatedDiagnostics();
      expect(relatedDiagnostics).toContain(relatedDiagnosticId);
      expect(relatedDiagnostics).toHaveLength(1);
    });

    it('should not relate diagnostic to itself', () => {
      const result = diagnostic.addRelatedDiagnostic(diagnostic.getId());

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Cannot relate diagnostic to itself');
      }
    });

    it('should not add duplicate related diagnostic', () => {
      diagnostic.addRelatedDiagnostic(relatedDiagnosticId);
      const result = diagnostic.addRelatedDiagnostic(relatedDiagnosticId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Diagnostic already related');
      }
    });

    it('should remove related diagnostic', () => {
      diagnostic.addRelatedDiagnostic(relatedDiagnosticId);
      const result = diagnostic.removeRelatedDiagnostic(relatedDiagnosticId);

      expect(result.isOk()).toBe(true);
      const relatedDiagnostics = diagnostic.getRelatedDiagnostics();
      expect(relatedDiagnostics).not.toContain(relatedDiagnosticId);
      expect(relatedDiagnostics).toHaveLength(0);
    });

    it('should fail to remove non-existent related diagnostic', () => {
      const result = diagnostic.removeRelatedDiagnostic(DiagnosticId.generate());

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Related diagnostic not found');
      }
    });
  });

  describe('tag-based categorization', () => {
    it('should identify syntax-related diagnostics', () => {
      const result = Diagnostic.createSyntaxError(
        'Syntax error',
        mockLocation,
        validLanguagePackageId,
      );
      if (result.isOk()) {
        expect(result.value.isSyntaxRelated()).toBe(true);
        expect(result.value.isSemanticRelated()).toBe(false);
        expect(result.value.isStyleRelated()).toBe(false);
        expect(result.value.isEducational()).toBe(false);
      }
    });

    it('should identify semantic-related diagnostics', () => {
      const result = Diagnostic.createSemanticError(
        'Semantic error',
        mockLocation,
        validLanguagePackageId,
      );
      if (result.isOk()) {
        expect(result.value.isSemanticRelated()).toBe(true);
        expect(result.value.isSyntaxRelated()).toBe(false);
        expect(result.value.isStyleRelated()).toBe(false);
        expect(result.value.isEducational()).toBe(false);
      }
    });

    it('should identify style-related diagnostics', () => {
      const result = Diagnostic.createStyleWarning(
        'Style warning',
        mockLocation,
        validLanguagePackageId,
      );
      if (result.isOk()) {
        expect(result.value.isStyleRelated()).toBe(true);
        expect(result.value.isSyntaxRelated()).toBe(false);
        expect(result.value.isSemanticRelated()).toBe(false);
        expect(result.value.isEducational()).toBe(false);
      }
    });

    it('should identify educational diagnostics', () => {
      const result = Diagnostic.createEducationalInfo(
        'Educational info',
        mockLocation,
        validLanguagePackageId,
      );
      if (result.isOk()) {
        expect(result.value.isEducational()).toBe(true);
        expect(result.value.isSyntaxRelated()).toBe(false);
        expect(result.value.isSemanticRelated()).toBe(false);
        expect(result.value.isStyleRelated()).toBe(false);
      }
    });
  });

  describe('location overlap detection', () => {
    it('should detect overlapping locations', () => {
      const location1Result = SourceLocation.create(1, 1, 2, 5);
      const location2Result = SourceLocation.create(1, 3, 2, 8);

      if (location1Result.isOk() && location2Result.isOk()) {
        const diagnostic1 = Diagnostic.createSyntaxError(
          'Error 1',
          location1Result.value,
          validLanguagePackageId,
        );
        const diagnostic2 = Diagnostic.createStyleWarning(
          'Warning 1',
          location2Result.value,
          validLanguagePackageId,
        );

        if (diagnostic1.isOk() && diagnostic2.isOk()) {
          expect(diagnostic1.value.overlapsLocation(diagnostic2.value)).toBe(true);
        }
      }
    });

    it('should detect non-overlapping locations', () => {
      const location1Result = SourceLocation.createSinglePosition(1, 1);
      const location2Result = SourceLocation.createSinglePosition(5, 10);

      if (location1Result.isOk() && location2Result.isOk()) {
        const diagnostic1 = Diagnostic.createSyntaxError(
          'Error 1',
          location1Result.value,
          validLanguagePackageId,
        );
        const diagnostic2 = Diagnostic.createStyleWarning(
          'Warning 1',
          location2Result.value,
          validLanguagePackageId,
        );

        if (diagnostic1.isOk() && diagnostic2.isOk()) {
          expect(diagnostic1.value.overlapsLocation(diagnostic2.value)).toBe(false);
        }
      }
    });
  });

  describe('severity comparison', () => {
    it('should compare severity levels correctly', () => {
      const errorResult = Diagnostic.create(
        DiagnosticSeverity.error(),
        'Error',
        'error-code',
        mockLocation,
        validLanguagePackageId,
      );
      const warningResult = Diagnostic.create(
        DiagnosticSeverity.warning(),
        'Warning',
        'warning-code',
        mockLocation,
        validLanguagePackageId,
      );
      const infoResult = Diagnostic.create(
        DiagnosticSeverity.info(),
        'Info',
        'info-code',
        mockLocation,
        validLanguagePackageId,
      );

      expect(errorResult.isOk()).toBe(true);
      expect(warningResult.isOk()).toBe(true);
      expect(infoResult.isOk()).toBe(true);

      if (errorResult.isOk() && warningResult.isOk() && infoResult.isOk()) {
        const error = errorResult.value;
        const warning = warningResult.value;
        const info = infoResult.value;

        expect(error.isMoreSevereThan(warning)).toBe(true);
        expect(error.isMoreSevereThan(info)).toBe(true);
        expect(warning.isMoreSevereThan(info)).toBe(true);
        expect(warning.isMoreSevereThan(error)).toBe(false);
        expect(info.isMoreSevereThan(warning)).toBe(false);
        expect(info.isMoreSevereThan(error)).toBe(false);
      }
    });
  });

  describe('canSupersede', () => {
    it('should allow superseding when conditions are met', () => {
      const location = SourceLocation.create(1, 1, 2, 5);
      expect(location.isOk()).toBe(true);

      if (location.isOk()) {
        const errorResult = Diagnostic.create(
          DiagnosticSeverity.error(),
          'Severe error',
          'same-code',
          location.value,
          validLanguagePackageId,
        );
        const warningResult = Diagnostic.create(
          DiagnosticSeverity.warning(),
          'Minor warning',
          'same-code',
          location.value,
          validLanguagePackageId,
        );

        expect(errorResult.isOk()).toBe(true);
        expect(warningResult.isOk()).toBe(true);

        if (errorResult.isOk() && warningResult.isOk()) {
          expect(errorResult.value.canSupersede(warningResult.value)).toBe(true);
          expect(warningResult.value.canSupersede(errorResult.value)).toBe(false);
        }
      }
    });

    it('should not supersede when codes differ', () => {
      const errorResult = Diagnostic.createSyntaxError(
        'Syntax Error',
        mockLocation,
        validLanguagePackageId,
      );
      const warningResult = Diagnostic.createStyleWarning(
        'Style Warning',
        mockLocation,
        validLanguagePackageId,
      );

      if (errorResult.isOk() && warningResult.isOk()) {
        expect(errorResult.value.canSupersede(warningResult.value)).toBe(false);
      }
    });
  });

  describe('equals', () => {
    it('should compare diagnostics by ID', () => {
      const diagnostic1Result = Diagnostic.create(
        DiagnosticSeverity.error(),
        'Error',
        'error-code',
        mockLocation,
        validLanguagePackageId,
      );
      const diagnostic2Result = Diagnostic.create(
        DiagnosticSeverity.error(),
        'Error',
        'error-code',
        mockLocation,
        validLanguagePackageId,
      );

      expect(diagnostic1Result.isOk()).toBe(true);
      expect(diagnostic2Result.isOk()).toBe(true);

      if (diagnostic1Result.isOk() && diagnostic2Result.isOk()) {
        const diagnostic1 = diagnostic1Result.value;
        const diagnostic2 = diagnostic2Result.value;

        // Different instances have different IDs
        expect(diagnostic1.equals(diagnostic2)).toBe(false);

        // Same instance equals itself
        expect(diagnostic1.equals(diagnostic1)).toBe(true);
      }
    });
  });

  describe('getter methods', () => {
    it('should return all properties correctly', () => {
      const quickFixes = ['Fix 1', 'Fix 2'];
      const tags = ['tag1', 'tag2'];
      const result = Diagnostic.create(
        DiagnosticSeverity.error(),
        'Test message',
        'test-code',
        mockLocation,
        validLanguagePackageId,
        quickFixes,
        tags,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const diagnostic = result.value;

        expect(diagnostic.getId()).toBeDefined();
        expect(diagnostic.getSeverity()).toEqual(DiagnosticSeverity.error());
        expect(diagnostic.getMessage().getText()).toBe('Test message');
        expect(diagnostic.getCode().getCode()).toBe('test-code');
        expect(diagnostic.getLocation()).toBe(mockLocation);
        expect(diagnostic.getTimestamp()).toBeDefined();
        expect(diagnostic.getLanguagePackageId()).toBe(validLanguagePackageId);
        expect(diagnostic.getRelatedDiagnostics()).toEqual([]);
        expect(diagnostic.getQuickFixes()).toEqual(quickFixes);
        expect(diagnostic.getTags()).toEqual(tags);
      }
    });
  });
});

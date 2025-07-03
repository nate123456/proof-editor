import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../errors/DomainErrors.js';
import { DiagnosticSeverity } from '../DiagnosticSeverity.js';

describe('DiagnosticSeverity', () => {
  describe('static factory methods', () => {
    it('should create error severity', () => {
      const severity = DiagnosticSeverity.error();

      expect(severity.getSeverity()).toBe('error');
      expect(severity.getLevel()).toBe(3);
    });

    it('should create warning severity', () => {
      const severity = DiagnosticSeverity.warning();

      expect(severity.getSeverity()).toBe('warning');
      expect(severity.getLevel()).toBe(2);
    });

    it('should create info severity', () => {
      const severity = DiagnosticSeverity.info();

      expect(severity.getSeverity()).toBe('info');
      expect(severity.getLevel()).toBe(1);
    });
  });

  describe('fromString', () => {
    it('should create error from string', () => {
      const result = DiagnosticSeverity.fromString('error');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSeverity()).toBe('error');
        expect(result.value.getLevel()).toBe(3);
      }
    });

    it('should create warning from string', () => {
      const result = DiagnosticSeverity.fromString('warning');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSeverity()).toBe('warning');
        expect(result.value.getLevel()).toBe(2);
      }
    });

    it('should create info from string', () => {
      const result = DiagnosticSeverity.fromString('info');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSeverity()).toBe('info');
        expect(result.value.getLevel()).toBe(1);
      }
    });

    it('should handle case-insensitive input', () => {
      const results = [
        DiagnosticSeverity.fromString('ERROR'),
        DiagnosticSeverity.fromString('Warning'),
        DiagnosticSeverity.fromString('INFO'),
      ];

      for (const result of results) {
        expect(result.isOk()).toBe(true);
      }
    });

    it('should reject invalid severity string', () => {
      const result = DiagnosticSeverity.fromString('invalid');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Invalid diagnostic severity: invalid');
      }
    });

    it('should reject empty string', () => {
      const result = DiagnosticSeverity.fromString('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Invalid diagnostic severity: ');
      }
    });
  });

  describe('fromLevel', () => {
    it('should create error from level 3', () => {
      const result = DiagnosticSeverity.fromLevel(3);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSeverity()).toBe('error');
        expect(result.value.getLevel()).toBe(3);
      }
    });

    it('should create warning from level 2', () => {
      const result = DiagnosticSeverity.fromLevel(2);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSeverity()).toBe('warning');
        expect(result.value.getLevel()).toBe(2);
      }
    });

    it('should create info from level 1', () => {
      const result = DiagnosticSeverity.fromLevel(1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSeverity()).toBe('info');
        expect(result.value.getLevel()).toBe(1);
      }
    });

    it('should reject invalid level', () => {
      const result = DiagnosticSeverity.fromLevel(5);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Invalid diagnostic severity level: 5');
      }
    });

    it('should reject zero level', () => {
      const result = DiagnosticSeverity.fromLevel(0);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Invalid diagnostic severity level: 0');
      }
    });

    it('should reject negative level', () => {
      const result = DiagnosticSeverity.fromLevel(-1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Invalid diagnostic severity level: -1');
      }
    });
  });

  describe('getter methods', () => {
    it('should return correct severity and level for error', () => {
      const severity = DiagnosticSeverity.error();

      expect(severity.getSeverity()).toBe('error');
      expect(severity.getLevel()).toBe(3);
    });

    it('should return correct severity and level for warning', () => {
      const severity = DiagnosticSeverity.warning();

      expect(severity.getSeverity()).toBe('warning');
      expect(severity.getLevel()).toBe(2);
    });

    it('should return correct severity and level for info', () => {
      const severity = DiagnosticSeverity.info();

      expect(severity.getSeverity()).toBe('info');
      expect(severity.getLevel()).toBe(1);
    });
  });

  describe('type checking methods', () => {
    it('should correctly identify error severity', () => {
      const error = DiagnosticSeverity.error();
      const warning = DiagnosticSeverity.warning();
      const info = DiagnosticSeverity.info();

      expect(error.isError()).toBe(true);
      expect(warning.isError()).toBe(false);
      expect(info.isError()).toBe(false);
    });

    it('should correctly identify warning severity', () => {
      const error = DiagnosticSeverity.error();
      const warning = DiagnosticSeverity.warning();
      const info = DiagnosticSeverity.info();

      expect(error.isWarning()).toBe(false);
      expect(warning.isWarning()).toBe(true);
      expect(info.isWarning()).toBe(false);
    });

    it('should correctly identify info severity', () => {
      const error = DiagnosticSeverity.error();
      const warning = DiagnosticSeverity.warning();
      const info = DiagnosticSeverity.info();

      expect(error.isInfo()).toBe(false);
      expect(warning.isInfo()).toBe(false);
      expect(info.isInfo()).toBe(true);
    });
  });

  describe('comparison methods', () => {
    it('should correctly compare severity levels (more severe)', () => {
      const error = DiagnosticSeverity.error();
      const warning = DiagnosticSeverity.warning();
      const info = DiagnosticSeverity.info();

      expect(error.isMoreSevereThan(warning)).toBe(true);
      expect(error.isMoreSevereThan(info)).toBe(true);
      expect(warning.isMoreSevereThan(info)).toBe(true);

      expect(warning.isMoreSevereThan(error)).toBe(false);
      expect(info.isMoreSevereThan(error)).toBe(false);
      expect(info.isMoreSevereThan(warning)).toBe(false);
    });

    it('should correctly compare severity levels (less severe)', () => {
      const error = DiagnosticSeverity.error();
      const warning = DiagnosticSeverity.warning();
      const info = DiagnosticSeverity.info();

      expect(info.isLessSevereThan(warning)).toBe(true);
      expect(info.isLessSevereThan(error)).toBe(true);
      expect(warning.isLessSevereThan(error)).toBe(true);

      expect(error.isLessSevereThan(warning)).toBe(false);
      expect(error.isLessSevereThan(info)).toBe(false);
      expect(warning.isLessSevereThan(info)).toBe(false);
    });

    it('should return false when comparing same severity levels', () => {
      const error1 = DiagnosticSeverity.error();
      const error2 = DiagnosticSeverity.error();

      expect(error1.isMoreSevereThan(error2)).toBe(false);
      expect(error1.isLessSevereThan(error2)).toBe(false);
    });
  });

  describe('display methods', () => {
    it('should return correct icons', () => {
      expect(DiagnosticSeverity.error().getIcon()).toBe('❌');
      expect(DiagnosticSeverity.warning().getIcon()).toBe('⚠️');
      expect(DiagnosticSeverity.info().getIcon()).toBe('ℹ️');
    });

    it('should return correct colors', () => {
      expect(DiagnosticSeverity.error().getColor()).toBe('#ff4444');
      expect(DiagnosticSeverity.warning().getColor()).toBe('#ffaa00');
      expect(DiagnosticSeverity.info().getColor()).toBe('#4488ff');
    });

    it('should return correct display names', () => {
      expect(DiagnosticSeverity.error().getDisplayName()).toBe('Error');
      expect(DiagnosticSeverity.warning().getDisplayName()).toBe('Warning');
      expect(DiagnosticSeverity.info().getDisplayName()).toBe('Information');
    });
  });

  describe('validation behavior methods', () => {
    it('should correctly identify blocking severities', () => {
      expect(DiagnosticSeverity.error().blocksValidation()).toBe(true);
      expect(DiagnosticSeverity.warning().blocksValidation()).toBe(false);
      expect(DiagnosticSeverity.info().blocksValidation()).toBe(false);
    });

    it('should correctly identify severities requiring attention', () => {
      expect(DiagnosticSeverity.error().requiresAttention()).toBe(true);
      expect(DiagnosticSeverity.warning().requiresAttention()).toBe(true);
      expect(DiagnosticSeverity.info().requiresAttention()).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for identical severities', () => {
      const error1 = DiagnosticSeverity.error();
      const error2 = DiagnosticSeverity.error();

      expect(error1.equals(error2)).toBe(true);
    });

    it('should return false for different severities', () => {
      const error = DiagnosticSeverity.error();
      const warning = DiagnosticSeverity.warning();

      expect(error.equals(warning)).toBe(false);
    });

    it('should work with all severity combinations', () => {
      const severities = [
        DiagnosticSeverity.error(),
        DiagnosticSeverity.warning(),
        DiagnosticSeverity.info(),
      ];

      for (let i = 0; i < severities.length; i++) {
        for (let j = 0; j < severities.length; j++) {
          const expected = i === j;
          const severityI = severities[i];
          const severityJ = severities[j];
          if (severityI && severityJ) {
            expect(severityI.equals(severityJ)).toBe(expected);
          }
        }
      }
    });
  });

  describe('toString', () => {
    it('should return severity as string', () => {
      expect(DiagnosticSeverity.error().toString()).toBe('error');
      expect(DiagnosticSeverity.warning().toString()).toBe('warning');
      expect(DiagnosticSeverity.info().toString()).toBe('info');
    });
  });
});

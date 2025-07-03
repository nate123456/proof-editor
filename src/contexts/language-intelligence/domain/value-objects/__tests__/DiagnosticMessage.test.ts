import { beforeEach, describe, expect, it } from 'vitest';

import { ValidationError } from '../../errors/DomainErrors.js';
import { DiagnosticMessage } from '../DiagnosticMessage.js';

describe('DiagnosticMessage', () => {
  describe('create', () => {
    it('should create valid DiagnosticMessage with minimal parameters', () => {
      const result = DiagnosticMessage.create('Error message');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const message = result.value;
        expect(message.getText()).toBe('Error message');
        expect(message.getContext()).toBe('');
        expect(message.getSeverity()).toBe('error');
      }
    });

    it('should create valid DiagnosticMessage with all parameters', () => {
      const result = DiagnosticMessage.create('Warning message', 'parser', 'warning');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const message = result.value;
        expect(message.getText()).toBe('Warning message');
        expect(message.getContext()).toBe('parser');
        expect(message.getSeverity()).toBe('warning');
      }
    });

    it('should trim whitespace from text and context', () => {
      const result = DiagnosticMessage.create('  Error message  ', '  context  ', 'info');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const message = result.value;
        expect(message.getText()).toBe('Error message');
        expect(message.getContext()).toBe('context');
      }
    });

    it('should accept maximum length of 500 characters', () => {
      const longText = 'a'.repeat(500);
      const result = DiagnosticMessage.create(longText);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getText()).toBe(longText);
      }
    });

    it('should reject empty text', () => {
      const result = DiagnosticMessage.create('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Diagnostic message text cannot be empty');
      }
    });

    it('should reject whitespace-only text', () => {
      const result = DiagnosticMessage.create('   ');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Diagnostic message text cannot be empty');
      }
    });

    it('should reject text longer than 500 characters', () => {
      const longText = 'a'.repeat(501);
      const result = DiagnosticMessage.create(longText);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Diagnostic message cannot exceed 500 characters');
      }
    });
  });

  describe('createError', () => {
    it('should create error message', () => {
      const result = DiagnosticMessage.createError('Error occurred');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSeverity()).toBe('error');
        expect(result.value.getText()).toBe('Error occurred');
      }
    });

    it('should create error message with context', () => {
      const result = DiagnosticMessage.createError('Error occurred', 'validation');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSeverity()).toBe('error');
        expect(result.value.getContext()).toBe('validation');
      }
    });
  });

  describe('createWarning', () => {
    it('should create warning message', () => {
      const result = DiagnosticMessage.createWarning('Warning occurred');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSeverity()).toBe('warning');
        expect(result.value.getText()).toBe('Warning occurred');
      }
    });

    it('should create warning message with context', () => {
      const result = DiagnosticMessage.createWarning('Warning occurred', 'syntax');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSeverity()).toBe('warning');
        expect(result.value.getContext()).toBe('syntax');
      }
    });
  });

  describe('createInfo', () => {
    it('should create info message', () => {
      const result = DiagnosticMessage.createInfo('Info message');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSeverity()).toBe('info');
        expect(result.value.getText()).toBe('Info message');
      }
    });

    it('should create info message with context', () => {
      const result = DiagnosticMessage.createInfo('Info message', 'analysis');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSeverity()).toBe('info');
        expect(result.value.getContext()).toBe('analysis');
      }
    });
  });

  describe('getter methods', () => {
    let message: DiagnosticMessage;

    beforeEach(() => {
      const result = DiagnosticMessage.create('Test message', 'test context', 'warning');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        message = result.value;
      }
    });

    it('should return text', () => {
      expect(message.getText()).toBe('Test message');
    });

    it('should return context', () => {
      expect(message.getContext()).toBe('test context');
    });

    it('should return severity', () => {
      expect(message.getSeverity()).toBe('warning');
    });
  });

  describe('getFullMessage', () => {
    it('should return text only when no context', () => {
      const result = DiagnosticMessage.create('Test message');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getFullMessage()).toBe('Test message');
      }
    });

    it('should return text with context when context exists', () => {
      const result = DiagnosticMessage.create('Test message', 'parser');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getFullMessage()).toBe('Test message (parser)');
      }
    });
  });

  describe('getFormattedMessage', () => {
    it('should format error message', () => {
      const result = DiagnosticMessage.createError('Error occurred');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getFormattedMessage()).toBe('[ERROR] Error occurred');
      }
    });

    it('should format warning message with context', () => {
      const result = DiagnosticMessage.createWarning('Warning occurred', 'syntax');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getFormattedMessage()).toBe('[WARNING] Warning occurred (syntax)');
      }
    });

    it('should format info message', () => {
      const result = DiagnosticMessage.createInfo('Info message');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getFormattedMessage()).toBe('[INFO] Info message');
      }
    });
  });

  describe('hasContext', () => {
    it('should return false when no context', () => {
      const result = DiagnosticMessage.create('Test message');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.hasContext()).toBe(false);
      }
    });

    it('should return false when empty context', () => {
      const result = DiagnosticMessage.create('Test message', '');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.hasContext()).toBe(false);
      }
    });

    it('should return true when context exists', () => {
      const result = DiagnosticMessage.create('Test message', 'parser');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.hasContext()).toBe(true);
      }
    });
  });

  describe('withContext', () => {
    it('should create new message with updated context', () => {
      const originalResult = DiagnosticMessage.create('Test message', 'old context');

      expect(originalResult.isOk()).toBe(true);
      if (originalResult.isOk()) {
        const updatedResult = originalResult.value.withContext('new context');

        expect(updatedResult.isOk()).toBe(true);
        if (updatedResult.isOk()) {
          expect(updatedResult.value.getContext()).toBe('new context');
          expect(updatedResult.value.getText()).toBe('Test message');
          expect(updatedResult.value.getSeverity()).toBe('error');
        }
      }
    });

    it('should preserve original severity when updating context', () => {
      const originalResult = DiagnosticMessage.createWarning('Warning message');

      expect(originalResult.isOk()).toBe(true);
      if (originalResult.isOk()) {
        const updatedResult = originalResult.value.withContext('new context');

        expect(updatedResult.isOk()).toBe(true);
        if (updatedResult.isOk()) {
          expect(updatedResult.value.getSeverity()).toBe('warning');
        }
      }
    });
  });

  describe('withSeverity', () => {
    it('should create new message with updated severity', () => {
      const originalResult = DiagnosticMessage.createError('Test message', 'context');

      expect(originalResult.isOk()).toBe(true);
      if (originalResult.isOk()) {
        const updated = originalResult.value.withSeverity('warning');

        expect(updated.getSeverity()).toBe('warning');
        expect(updated.getText()).toBe('Test message');
        expect(updated.getContext()).toBe('context');
      }
    });

    it('should handle all severity levels', () => {
      const originalResult = DiagnosticMessage.create('Test message');

      expect(originalResult.isOk()).toBe(true);
      if (originalResult.isOk()) {
        const original = originalResult.value;

        expect(original.withSeverity('error').getSeverity()).toBe('error');
        expect(original.withSeverity('warning').getSeverity()).toBe('warning');
        expect(original.withSeverity('info').getSeverity()).toBe('info');
      }
    });
  });

  describe('getWordCount', () => {
    it('should count words correctly', () => {
      const result = DiagnosticMessage.create('This is a test message');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getWordCount()).toBe(5);
      }
    });

    it('should handle single word', () => {
      const result = DiagnosticMessage.create('Error');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getWordCount()).toBe(1);
      }
    });

    it('should handle multiple spaces', () => {
      const result = DiagnosticMessage.create('Word1   Word2     Word3');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getWordCount()).toBe(3);
      }
    });
  });

  describe('isLongMessage', () => {
    it('should return false for short message', () => {
      const result = DiagnosticMessage.create('Short message');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isLongMessage()).toBe(false);
      }
    });

    it('should return true for long message', () => {
      const longText = 'a'.repeat(101);
      const result = DiagnosticMessage.create(longText);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isLongMessage()).toBe(true);
      }
    });

    it('should return false for exactly 100 characters', () => {
      const text = 'a'.repeat(100);
      const result = DiagnosticMessage.create(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isLongMessage()).toBe(false);
      }
    });
  });

  describe('containsKeyword', () => {
    it('should find keyword case-insensitively', () => {
      const result = DiagnosticMessage.create('Syntax Error in expression');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const message = result.value;
        expect(message.containsKeyword('syntax')).toBe(true);
        expect(message.containsKeyword('SYNTAX')).toBe(true);
        expect(message.containsKeyword('error')).toBe(true);
        expect(message.containsKeyword('missing')).toBe(false);
      }
    });

    it('should handle partial matches', () => {
      const result = DiagnosticMessage.create('Unexpected token');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.containsKeyword('expect')).toBe(true);
        expect(result.value.containsKeyword('token')).toBe(true);
        expect(result.value.containsKeyword('unexpected')).toBe(true);
      }
    });
  });

  describe('equals', () => {
    it('should return true for identical messages', () => {
      const result1 = DiagnosticMessage.create('Test message', 'context', 'warning');
      const result2 = DiagnosticMessage.create('Test message', 'context', 'warning');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });

    it('should return false for different text', () => {
      const result1 = DiagnosticMessage.create('Message 1');
      const result2 = DiagnosticMessage.create('Message 2');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });

    it('should return false for different context', () => {
      const result1 = DiagnosticMessage.create('Test message', 'context1');
      const result2 = DiagnosticMessage.create('Test message', 'context2');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });

    it('should return false for different severity', () => {
      const result1 = DiagnosticMessage.create('Test message', '', 'error');
      const result2 = DiagnosticMessage.create('Test message', '', 'warning');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });
  });

  describe('toString', () => {
    it('should return full message string', () => {
      const result = DiagnosticMessage.create('Test message', 'context');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe('Test message (context)');
      }
    });

    it('should return text only when no context', () => {
      const result = DiagnosticMessage.create('Test message');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe('Test message');
      }
    });
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import { ValidationError } from '../../../domain/shared/result.js';
import { DocumentIdService } from '../DocumentIdService.js';

describe('DocumentIdService', () => {
  let service: DocumentIdService;

  beforeEach(() => {
    service = new DocumentIdService();
  });

  describe('extractFromUri', () => {
    describe('basic URI extraction', () => {
      it('should extract document ID from Unix file path', () => {
        const result = service.extractFromUri('/Users/user/document.proof');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe('document');
        }
      });

      it('should extract document ID from Windows file path', () => {
        const result = service.extractFromUri('C:\\Users\\user\\document.proof');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe('document');
        }
      });

      it('should extract document ID from file:// URI scheme', () => {
        const result = service.extractFromUri('file:///Users/user/document.proof');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe('document');
        }
      });

      it('should extract document ID from vscode:// URI scheme', () => {
        const result = service.extractFromUri('vscode://file/Users/user/document.proof');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe('document');
        }
      });
    });

    describe('special characters and encoding', () => {
      it('should handle spaces in file paths', () => {
        const result = service.extractFromUri('/Users/user/my document.proof');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe('my document');
        }
      });

      it('should handle URL encoded spaces', () => {
        const result = service.extractFromUri('file:///Users/user/my%20document.proof');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe('my document');
        }
      });

      it('should handle unicode characters', () => {
        const result = service.extractFromUri('/Users/user/논리증명.proof');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe('논리증명');
        }
      });

      it('should handle special characters in filename', () => {
        const result = service.extractFromUri('/Users/user/proof-v1_final(2).proof');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe('proof-v1_final(2)');
        }
      });
    });

    describe('cross-platform path handling', () => {
      it('should handle mixed path separators', () => {
        const result = service.extractFromUri('C:\\Users/user\\documents/proof.proof');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe('proof');
        }
      });

      it('should handle network paths (UNC)', () => {
        const result = service.extractFromUri('\\\\server\\share\\document.proof');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe('document');
        }
      });
    });

    describe('edge cases', () => {
      it('should return error for empty string', () => {
        const result = service.extractFromUri('');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('empty');
        }
      });

      it('should return error for null/undefined', () => {
        const result = service.extractFromUri(null as any);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
        }
      });

      it('should handle file without extension', () => {
        const result = service.extractFromUri('/Users/user/document');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe('document');
        }
      });

      it('should handle file with different extension', () => {
        const result = service.extractFromUri('/Users/user/document.txt');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe('document.txt');
        }
      });

      it('should handle only extension as filename', () => {
        const result = service.extractFromUri('/Users/user/.proof');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe('');
        }
      });

      it('should handle path ending with separator', () => {
        const result = service.extractFromUri('/Users/user/documents/');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('no filename');
        }
      });

      it('should handle very long paths', () => {
        const longPath = `/Users/user/${'a'.repeat(255)}.proof`;
        const result = service.extractFromUri(longPath);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe('a'.repeat(255));
        }
      });
    });

    describe('malformed URIs', () => {
      it('should handle malformed file:// URI', () => {
        const result = service.extractFromUri('file://invalid/path');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe('path');
        }
      });

      it('should handle URI with query parameters', () => {
        const result = service.extractFromUri('file:///Users/user/document.proof?version=1');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe('document');
        }
      });

      it('should handle URI with fragments', () => {
        const result = service.extractFromUri('file:///Users/user/document.proof#section1');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe('document');
        }
      });
    });
  });

  describe('validateDocumentId', () => {
    describe('valid IDs', () => {
      it('should accept simple alphanumeric ID', () => {
        const result = service.validateDocumentId('document123');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe('document123');
        }
      });

      it('should accept ID with hyphens and underscores', () => {
        const result = service.validateDocumentId('my-document_v1');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe('my-document_v1');
        }
      });

      it('should accept unicode characters', () => {
        const result = service.validateDocumentId('논리증명');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe('논리증명');
        }
      });
    });

    describe('invalid IDs', () => {
      it('should reject empty string', () => {
        const result = service.validateDocumentId('');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('empty');
        }
      });

      it('should reject whitespace-only string', () => {
        const result = service.validateDocumentId('   ');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('empty');
        }
      });

      it('should reject null/undefined', () => {
        const result = service.validateDocumentId(null as any);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
        }
      });

      it('should reject IDs with illegal characters', () => {
        const result = service.validateDocumentId('document/with/slashes');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('illegal characters');
        }
      });

      it('should reject very long IDs', () => {
        const longId = 'a'.repeat(300);
        const result = service.validateDocumentId(longId);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('too long');
        }
      });
    });

    describe('sanitization', () => {
      it('should trim whitespace', () => {
        const result = service.validateDocumentId('  document  ');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe('document');
        }
      });

      it('should normalize spaces to single space', () => {
        const result = service.validateDocumentId('my    document');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe('my document');
        }
      });
    });
  });

  describe('generateFallbackId', () => {
    it('should generate unique IDs on subsequent calls', () => {
      const id1 = service.generateFallbackId();
      const id2 = service.generateFallbackId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^fallback-\d+-[a-f0-9]+$/);
      expect(id2).toMatch(/^fallback-\d+-[a-f0-9]+$/);
    });

    it('should generate IDs with consistent format', () => {
      const id = service.generateFallbackId();

      expect(id).toMatch(/^fallback-\d+-[a-f0-9]+$/);
      expect(id.length).toBeGreaterThan(15);
      expect(id.length).toBeLessThan(50);
    });

    it('should pass validation', () => {
      const fallbackId = service.generateFallbackId();
      const result = service.validateDocumentId(fallbackId);

      expect(result.isOk()).toBe(true);
    });
  });

  describe('extractFromUriWithFallback', () => {
    it('should return extracted ID when extraction succeeds', () => {
      const result = service.extractFromUriWithFallback('/Users/user/document.proof');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('document');
      }
    });

    it('should return fallback ID when extraction fails', () => {
      const result = service.extractFromUriWithFallback('');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toMatch(/^fallback-\d+-[a-f0-9]+$/);
      }
    });

    it('should return fallback ID when validation fails', () => {
      const result = service.extractFromUriWithFallback('/Users/user/invalid/file/name.proof');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Should get either extracted or fallback, both should be valid
        const validationResult = service.validateDocumentId(result.value);
        expect(validationResult.isOk()).toBe(true);
      }
    });
  });

  describe('integration scenarios', () => {
    it('should handle real VS Code URIs', () => {
      const uris = [
        'vscode://vscode.git/clone?url=https://github.com/user/repo.git',
        'vscode://file/c%3A/Users/user/project/proof.proof',
        'vscode://vscode-remote/wsl+Ubuntu/home/user/proof.proof',
      ];

      for (const uri of uris) {
        const result = service.extractFromUriWithFallback(uri);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const validationResult = service.validateDocumentId(result.value);
          expect(validationResult.isOk()).toBe(true);
        }
      }
    });

    it('should handle complex real-world paths', () => {
      const paths = [
        '/Users/alice/Documents/Formal Logic/Proof 1 - Modus Ponens.proof',
        'C:\\Users\\Bob\\OneDrive\\논리학\\증명\\syllogism.proof',
        '//network-drive/shared/proofs/team-review(final).proof',
        '/tmp/auto-generated-proof-2023-12-01T10:30:00.proof',
      ];

      for (const path of paths) {
        const result = service.extractFromUriWithFallback(path);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const validationResult = service.validateDocumentId(result.value);
          expect(validationResult.isOk()).toBe(true);
        }
      }
    });
  });
});

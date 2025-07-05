import { err, ok, type Result } from 'neverthrow';
import { ValidationError } from '../../domain/shared/result.js';

/**
 * Service interface for document ID extraction and validation
 */
export interface IDocumentIdService {
  extractFromUri(uri: string): Result<string, ValidationError>;
  validateDocumentId(id: string): Result<string, ValidationError>;
  generateFallbackId(): string;
  extractFromUriWithFallback(uri: string): Result<string, ValidationError>;
}

/**
 * Robust document ID extraction and validation service
 *
 * Handles cross-platform URIs, special characters, encoding, and validation
 * with fallback strategies for malformed inputs.
 */
export class DocumentIdService implements IDocumentIdService {
  private static readonly MAX_ID_LENGTH = 255;
  private static readonly ILLEGAL_CHAR_PATTERN = /[/\\:*?"<>|]/g;
  private static readonly PROOF_EXTENSION = '.proof';

  /**
   * Extract document ID from URI with comprehensive cross-platform support
   */
  extractFromUri(uri: string): Result<string, ValidationError> {
    if (!uri || typeof uri !== 'string') {
      return err(new ValidationError('URI cannot be null, undefined, or empty'));
    }

    const trimmedUri = uri.trim();
    if (trimmedUri.length === 0) {
      return err(new ValidationError('URI cannot be empty'));
    }

    try {
      // Handle URI schemes and decode if needed
      const cleanedUri = this.cleanUri(trimmedUri);

      // Extract filename from path
      const filename = this.extractFilename(cleanedUri);
      if (!filename) {
        return err(new ValidationError('URI contains no filename'));
      }

      // Remove .proof extension if present, otherwise keep full filename
      const documentId = filename.endsWith(DocumentIdService.PROOF_EXTENSION)
        ? filename.slice(0, -DocumentIdService.PROOF_EXTENSION.length)
        : filename;

      return ok(documentId);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to extract document ID: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Validate and sanitize document ID
   */
  validateDocumentId(id: string): Result<string, ValidationError> {
    if (!id || typeof id !== 'string') {
      return err(new ValidationError('Document ID cannot be null, undefined, or empty'));
    }

    // Trim and normalize whitespace
    const sanitized = id.trim().replace(/\s+/g, ' ');

    if (sanitized.length === 0) {
      return err(new ValidationError('Document ID cannot be empty'));
    }

    if (sanitized.length > DocumentIdService.MAX_ID_LENGTH) {
      return err(
        new ValidationError(
          `Document ID is too long (max ${DocumentIdService.MAX_ID_LENGTH} characters)`,
        ),
      );
    }

    // Check for illegal characters (path separators and filesystem-unsafe chars)
    if (DocumentIdService.ILLEGAL_CHAR_PATTERN.test(sanitized)) {
      return err(
        new ValidationError('Document ID contains illegal characters (/, \\, :, *, ?, ", <, >, |)'),
      );
    }

    return ok(sanitized);
  }

  /**
   * Generate unique fallback ID when extraction fails
   */
  generateFallbackId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(16).substring(2, 8);
    return `fallback-${timestamp}-${random}`;
  }

  /**
   * Extract document ID with fallback generation on failure
   */
  extractFromUriWithFallback(uri: string): Result<string, ValidationError> {
    const extractResult = this.extractFromUri(uri);

    if (extractResult.isErr()) {
      const fallbackId = this.generateFallbackId();
      return ok(fallbackId);
    }

    const validationResult = this.validateDocumentId(extractResult.value);
    if (validationResult.isErr()) {
      const fallbackId = this.generateFallbackId();
      return ok(fallbackId);
    }

    return validationResult;
  }

  /**
   * Clean URI by removing schemes and decoding
   */
  private cleanUri(uri: string): string {
    let cleaned = uri;

    // Remove URI schemes
    cleaned = cleaned.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '');

    // Handle query parameters and fragments
    cleaned = (cleaned.split('?')[0] || cleaned).split('#')[0] || cleaned;

    // URL decode
    try {
      cleaned = decodeURIComponent(cleaned);
    } catch {
      // Keep original if decoding fails
    }

    return cleaned;
  }

  /**
   * Extract filename from cross-platform path
   */
  private extractFilename(path: string): string | null {
    if (path.endsWith('/') || path.endsWith('\\')) {
      return null; // Path ends with separator, no filename
    }

    // Split by both Unix and Windows separators
    const parts = path.split(/[/\\]/);
    const filename = parts[parts.length - 1];

    return filename || null;
  }
}

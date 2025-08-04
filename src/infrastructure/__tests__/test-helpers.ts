import { err, ok, Result } from 'neverthrow';
import { ValidationError } from '../../domain/shared/result.js';
import {
  ActionLabel,
  Architecture,
  DialogPrompt,
  DialogTitle,
  Dimensions,
  DocumentContent,
  DocumentId,
  DocumentVersion,
  ErrorMessage,
  FilePath,
  FileSize,
  FontFamily,
  FontSize,
  MessageLength,
  PlatformVersion,
  Timestamp,
  Title,
  ViewType,
  WebviewId,
} from '../../domain/shared/value-objects/index.js';

/**
 * Test helper to create a FilePath from string
 * Throws on error for simplicity in tests
 */
export function createTestFilePath(path: string): FilePath {
  const result = FilePath.create(path);
  if (result.isErr()) {
    throw new Error(`Failed to create test FilePath: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Test helper to create a DialogTitle from string
 * Throws on error for simplicity in tests
 */
export function createTestDialogTitle(title: string): DialogTitle {
  const result = DialogTitle.create(title);
  if (result.isErr()) {
    throw new Error(`Failed to create test DialogTitle: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Test helper to create a DialogPrompt from string
 * Throws on error for simplicity in tests
 */
export function createTestDialogPrompt(prompt: string): DialogPrompt {
  const result = DialogPrompt.create(prompt);
  if (result.isErr()) {
    throw new Error(`Failed to create test DialogPrompt: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Test helper to create a DocumentId from string
 * Throws on error for simplicity in tests
 */
export function createTestDocumentId(id: string): DocumentId {
  const result = DocumentId.create(id);
  if (result.isErr()) {
    throw new Error(`Failed to create test DocumentId: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Test helper to create a DocumentContent from string
 * Throws on error for simplicity in tests
 */
export function createTestDocumentContent(content: string): DocumentContent {
  const result = DocumentContent.create(content);
  if (result.isErr()) {
    throw new Error(`Failed to create test DocumentContent: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Test helper to create a DocumentVersion from number
 * Throws on error for simplicity in tests
 */
export function createTestDocumentVersion(version: number): DocumentVersion {
  const result = DocumentVersion.create(version);
  if (result.isErr()) {
    throw new Error(`Failed to create test DocumentVersion: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Test helper to create a Title from string
 * Throws on error for simplicity in tests
 */
export function createTestTitle(title: string): Title {
  const result = Title.create(title);
  if (result.isErr()) {
    throw new Error(`Failed to create test Title: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Test helper to create a Timestamp from Date
 * Throws on error for simplicity in tests
 */
export function createTestTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

/**
 * Test helper to create a FileSize from number
 * Throws on error for simplicity in tests
 */
export function createTestFileSize(size: number): FileSize {
  const result = FileSize.create(size);
  if (result.isErr()) {
    throw new Error(`Failed to create test FileSize: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Test helper to create an ErrorMessage from string
 * Throws on error for simplicity in tests
 */
export function createTestErrorMessage(message: string): ErrorMessage {
  const result = ErrorMessage.create(message);
  if (result.isErr()) {
    throw new Error(`Failed to create test ErrorMessage: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Test helper to create an ActionLabel from string
 * Throws on error for simplicity in tests
 */
export function createTestActionLabel(label: string): ActionLabel {
  const result = ActionLabel.create(label);
  if (result.isErr()) {
    throw new Error(`Failed to create test ActionLabel: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Test helper to create a WebviewId from string
 * Throws on error for simplicity in tests
 */
export function createTestWebviewId(id: string): WebviewId {
  const result = WebviewId.create(id);
  if (result.isErr()) {
    throw new Error(`Failed to create test WebviewId: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Test helper to create a ViewType from string
 * Throws on error for simplicity in tests
 */
export function createTestViewType(type: string): ViewType {
  const result = ViewType.create(type);
  if (result.isErr()) {
    throw new Error(`Failed to create test ViewType: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Test helper to create a FontFamily from string
 * Throws on error for simplicity in tests
 */
export function createTestFontFamily(family: string): FontFamily {
  const result = FontFamily.create(family);
  if (result.isErr()) {
    throw new Error(`Failed to create test FontFamily: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Test helper to create a FontSize from number
 * Throws on error for simplicity in tests
 */
export function createTestFontSize(size: number): FontSize {
  const result = FontSize.create(size);
  if (result.isErr()) {
    throw new Error(`Failed to create test FontSize: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Test helper to create a MessageLength from number
 * Throws on error for simplicity in tests
 */
export function createTestMessageLength(length: number): MessageLength {
  const result = MessageLength.create(length);
  if (result.isErr()) {
    throw new Error(`Failed to create test MessageLength: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Test helper to create a PlatformVersion from string
 * Throws on error for simplicity in tests
 */
export function createTestPlatformVersion(version: string): PlatformVersion {
  const result = PlatformVersion.create(version);
  if (result.isErr()) {
    throw new Error(`Failed to create test PlatformVersion: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Test helper to create an Architecture from string
 * Throws on error for simplicity in tests
 */
export function createTestArchitecture(arch: string): Architecture {
  const result = Architecture.create(arch);
  if (result.isErr()) {
    throw new Error(`Failed to create test Architecture: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Test helper to create Dimensions from width and height
 * Throws on error for simplicity in tests
 */
export function createTestDimensions(width: number, height: number): Dimensions {
  const result = Dimensions.create(width, height);
  if (result.isErr()) {
    throw new Error(`Failed to create test Dimensions: ${result.error.message}`);
  }
  return result.value;
}

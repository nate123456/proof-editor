/**
 * UI Test Helpers
 *
 * Factory functions for creating UI value objects in tests.
 * These helpers provide convenient shortcuts while ensuring type safety.
 */

import type { Result } from 'neverthrow';
import type { ValidationError } from '../../../domain/shared/result.js';
import {
  ActionLabel,
  DialogPrompt,
  DialogTitle,
  ErrorMessage,
  FilterName,
  NotificationMessage,
  PlaceholderText,
  ViewType,
  WebviewId,
} from '../../../domain/shared/value-objects/index.js';

/**
 * Creates a DialogTitle or throws if invalid
 */
export function createDialogTitle(value: string): DialogTitle {
  const result = DialogTitle.create(value);
  if (result.isErr()) {
    throw new Error(`Invalid DialogTitle: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates a DialogPrompt or throws if invalid
 */
export function createDialogPrompt(value: string): DialogPrompt {
  const result = DialogPrompt.create(value);
  if (result.isErr()) {
    throw new Error(`Invalid DialogPrompt: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates an ActionLabel or throws if invalid
 */
export function createActionLabel(value: string): ActionLabel {
  const result = ActionLabel.create(value);
  if (result.isErr()) {
    throw new Error(`Invalid ActionLabel: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates a FilterName or throws if invalid
 */
export function createFilterName(value: string): FilterName {
  const result = FilterName.create(value);
  if (result.isErr()) {
    throw new Error(`Invalid FilterName: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates a ViewType or throws if invalid
 */
export function createViewType(value: string): ViewType {
  const result = ViewType.create(value);
  if (result.isErr()) {
    throw new Error(`Invalid ViewType: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates a WebviewId or throws if invalid
 */
export function createWebviewId(value: string): WebviewId {
  const result = WebviewId.create(value);
  if (result.isErr()) {
    throw new Error(`Invalid WebviewId: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates a PlaceholderText or throws if invalid
 */
export function createPlaceholderText(value: string): PlaceholderText {
  const result = PlaceholderText.create(value);
  if (result.isErr()) {
    throw new Error(`Invalid PlaceholderText: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates a NotificationMessage or throws if invalid
 */
export function createNotificationMessage(value: string): NotificationMessage {
  const result = NotificationMessage.create(value);
  if (result.isErr()) {
    throw new Error(`Invalid NotificationMessage: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates an ErrorMessage or throws if invalid
 */
export function createErrorMessage(value: string): ErrorMessage {
  const result = ErrorMessage.create(value);
  if (result.isErr()) {
    throw new Error(`Invalid ErrorMessage: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Common test values
 */
export const testUIValues = {
  dialogTitle: {
    simple: createDialogTitle('Test Dialog'),
    withSpaces: createDialogTitle('Test Dialog Title'),
    question: createDialogTitle('Are you sure?'),
    saveFile: createDialogTitle('Save File'),
    openFile: createDialogTitle('Open File'),
    error: createDialogTitle('Error Occurred'),
  },
  dialogPrompt: {
    simple: createDialogPrompt('Enter a value'),
    enterName: createDialogPrompt('Enter your name'),
    chooseFile: createDialogPrompt('Choose a file'),
    confirmAction: createDialogPrompt('Please confirm this action'),
  },
  actionLabel: {
    ok: createActionLabel('OK'),
    cancel: createActionLabel('Cancel'),
    yes: createActionLabel('Yes'),
    no: createActionLabel('No'),
    save: createActionLabel('Save'),
    delete: createActionLabel('Delete'),
    confirm: createActionLabel('Confirm'),
    crash: createActionLabel('Crash'),
  },
  filterName: {
    allFiles: createFilterName('All Files'),
    textFiles: createFilterName('Text Files'),
    proofFiles: createFilterName('Proof Files'),
    validFiles: createFilterName('Valid Files'),
    invalidFiles: createFilterName('Invalid Files'),
  },
  viewType: {
    proofTree: createViewType('proofTreeVisualization'),
    editor: createViewType('documentEditor'),
    testView: createViewType('testView'),
    testPanel: createViewType('testPanel'),
  },
  webviewId: {
    test: createWebviewId('test-panel'),
    proof: createWebviewId('proof-panel'),
    editor: createWebviewId('editor-panel'),
  },
  placeholder: {
    empty: PlaceholderText.empty(),
    simple: createPlaceholderText('placeholder'),
    enterValue: createPlaceholderText('Enter a value...'),
  },
  notification: {
    simple: createNotificationMessage('Test message'),
    warning: createNotificationMessage('Test warning'),
    error: createNotificationMessage('Test error'),
    info: createNotificationMessage('Test information'),
    long: createNotificationMessage('x'.repeat(100)), // Exactly 100 chars
  },
  errorMessage: {
    simple: createErrorMessage('An error occurred'),
    detailed: createErrorMessage('Confirm this action?'),
    fileNotFound: createErrorMessage('File not found'),
    invalidInput: createErrorMessage('Invalid input provided'),
  },
};

/**
 * Helper for creating safe Results in tests
 */
export function createSafeResult<T extends { create(value: any): Result<T, ValidationError> }>(
  Type: T,
  value: any,
): T {
  const result = (Type as any).create(value);
  if (result.isErr()) {
    throw new Error(`Failed to create ${Type.constructor.name}: ${result.error.message}`);
  }
  return result.value;
}

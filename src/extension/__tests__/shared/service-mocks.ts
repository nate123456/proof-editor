/**
 * Shared service mocks for extension tests
 *
 * This file provides mocked implementations of the various services
 * and controllers used by the extension for testing purposes.
 */

import { ok } from 'neverthrow';
import { vi } from 'vitest';

// Mock all the service dependencies
export const createMockUIPort = () => ({
  showInformation: vi.fn(),
  showWarning: vi.fn(),
  showError: vi.fn(),
  showQuickPick: vi.fn(),
  createWebviewPanel: vi.fn(),
  showInputBox: vi.fn(),
});

export const createMockFileSystemPort = () => ({
  readFile: vi.fn().mockResolvedValue(ok('test content')),
  writeFile: vi.fn().mockResolvedValue(ok(undefined)),
  capabilities: vi.fn(),
  getWriteCapabilities: vi.fn(),
});

export const createMockDocumentService = () => ({
  createDocument: vi.fn().mockResolvedValue(ok({})),
  getDocument: vi.fn().mockResolvedValue(ok({})),
  updateDocument: vi.fn().mockResolvedValue(ok({})),
  deleteDocument: vi.fn().mockResolvedValue(ok({})),
  getDocumentStats: vi.fn().mockResolvedValue(ok({})),
  getDocumentWithStats: vi.fn().mockResolvedValue(ok({})),
  listDocuments: vi.fn().mockResolvedValue(ok([])),
  capabilities: vi.fn(),
});

export const createMockParserService = () => ({
  parse: vi.fn().mockResolvedValue(ok({})),
  parseWithStats: vi.fn().mockResolvedValue(ok({})),
  parseWithDetailedErrors: vi.fn().mockResolvedValue(ok({})),
  validateSyntax: vi.fn().mockResolvedValue(ok({})),
  capabilities: vi.fn(),
});

export const createMockPlatformService = () => ({
  getPlatformInfo: vi.fn().mockReturnValue({
    type: 'test',
    version: '1.0',
    os: 'test',
    arch: 'test',
  }),
  getInputCapabilities: vi.fn().mockReturnValue({ primaryInput: 'keyboard' }),
  getDisplayCapabilities: vi.fn().mockReturnValue({
    supportsColor: true,
    supportsGraphics: true,
    screenSize: { width: 1920, height: 1080 },
    dpi: 96,
  }),
  getStorageCapabilities: vi.fn().mockReturnValue({ canPersist: true }),
  readFromClipboard: vi.fn().mockResolvedValue(ok('test')),
  writeToClipboard: vi.fn().mockResolvedValue(ok(undefined)),
  capabilities: vi.fn(),
});

export const createMockContainer = () => ({
  resolve: vi.fn((token) => {
    switch (token) {
      case 'UIPort':
        return createMockUIPort();
      case 'FileSystemPort':
        return createMockFileSystemPort();
      case 'DocumentService':
        return createMockDocumentService();
      case 'ParserService':
        return createMockParserService();
      case 'PlatformService':
        return createMockPlatformService();
      case 'DocumentQueryService':
        return {
          getDocumentById: vi.fn().mockResolvedValue(ok({})),
          parseDocumentContent: vi.fn().mockResolvedValue(ok({})),
          validateDocumentContent: vi.fn().mockResolvedValue(ok({})),
          getDocumentWithStats: vi.fn().mockResolvedValue(ok({})),
        };
      case 'VisualizationService':
        return {
          generateVisualization: vi.fn().mockResolvedValue(ok({})),
          updateVisualization: vi.fn().mockResolvedValue(ok({})),
          parseWithDetailedErrors: vi.fn().mockResolvedValue(ok({})),
        };
      case 'ViewStateManager':
        return {
          getViewState: vi.fn().mockResolvedValue(ok({})),
          subscribeToChanges: vi.fn().mockResolvedValue(ok({})),
          updateViewState: vi.fn().mockResolvedValue(ok({})),
        };
      case 'ViewStatePort':
        return {
          capabilities: vi.fn().mockReturnValue({ canPersist: true }),
          getViewState: vi.fn().mockResolvedValue(ok({})),
          saveViewState: vi.fn().mockResolvedValue(ok({})),
        };
      case 'BootstrapController':
        return {
          createBootstrapArgument: vi.fn().mockResolvedValue(ok({})),
          createEmptyImplicationLine: vi.fn().mockResolvedValue(ok({})),
          getBootstrapWorkflow: vi.fn().mockResolvedValue(ok({})),
          initializeEmptyDocument: vi.fn().mockResolvedValue(ok({})),
          populateEmptyArgument: vi.fn().mockResolvedValue(ok({})),
        };
      case 'ProofApplicationService':
        return {
          createArgument: vi.fn().mockResolvedValue(ok({})),
          getDocuments: vi.fn().mockResolvedValue(ok([])),
          processCommand: vi.fn().mockResolvedValue(ok({})),
        };
      case 'YAMLSerializer':
        return {
          serialize: vi.fn().mockResolvedValue(ok('')),
          deserialize: vi.fn().mockResolvedValue(ok({})),
          serializeDocument: vi.fn().mockResolvedValue(ok('')),
          deserializeDocument: vi.fn().mockResolvedValue(ok({})),
        };
      case 'ExportService':
        return {
          exportDocument: vi.fn().mockResolvedValue(ok('')),
          getSupportedFormats: vi.fn().mockResolvedValue(ok([])),
          validateExportFormat: vi.fn().mockResolvedValue(ok(true)),
        };
      case 'DocumentIdService':
        return {
          generateId: vi.fn().mockResolvedValue(ok('test-id')),
          validateId: vi.fn().mockResolvedValue(ok(true)),
          isTemporaryId: vi.fn().mockResolvedValue(ok(false)),
          convertTemporaryId: vi.fn().mockResolvedValue(ok('test-id')),
        };
      default:
        return {};
    }
  }),
  createWithServices: vi.fn().mockResolvedValue(ok({})),
});

export const createMockValidationController = () => ({
  validateDocumentImmediate: vi.fn(),
  validateDocumentDebounced: vi.fn(),
  clearDocumentValidation: vi.fn(),
  dispose: vi.fn(),
});

export const createMockDocumentController = () => ({
  handleDocumentOpened: vi.fn().mockResolvedValue(ok({})),
  handleDocumentChanged: vi.fn().mockResolvedValue(ok({})),
  handleDocumentClosed: vi.fn().mockResolvedValue(ok({})),
  dispose: vi.fn(),
});

export const createMockBootstrapController = () => ({
  initializeEmptyDocument: vi.fn().mockResolvedValue(ok({})),
  createBootstrapArgument: vi.fn().mockResolvedValue(ok({})),
  populateEmptyArgument: vi.fn().mockResolvedValue(ok({})),
  getBootstrapWorkflow: vi.fn().mockResolvedValue(ok({})),
  createEmptyImplicationLine: vi.fn().mockResolvedValue(ok({})),
});

export const createMockProofTreeController = () => ({
  showProofTreeForDocument: vi.fn().mockResolvedValue(ok({})),
  hideProofTreeForDocument: vi.fn().mockResolvedValue(ok({})),
  updateProofTreeForDocument: vi.fn().mockResolvedValue(ok({})),
  dispose: vi.fn(),
});

export const createMockPanelManager = () => ({
  createPanelWithServices: vi.fn().mockResolvedValue(ok({})),
  getPanelForDocument: vi.fn().mockResolvedValue(ok({})),
  closePanelForDocument: vi.fn(),
  getPanel: vi.fn(),
  hasPanel: vi.fn(),
});

export const setupServiceMocks = () => {
  // Mock container module
  vi.mock('../../infrastructure/container/Container.js', () => ({
    Container: {
      getInstance: vi.fn(() => createMockContainer()),
    },
  }));

  // Mock validation controller
  vi.mock('../../infrastructure/validation/ValidationController.js', () => ({
    ValidationController: vi.fn(() => createMockValidationController()),
  }));

  // Mock document controller
  vi.mock('../../infrastructure/document/DocumentController.js', () => ({
    DocumentController: vi.fn(() => createMockDocumentController()),
  }));

  // Mock bootstrap controller
  vi.mock('../../infrastructure/bootstrap/BootstrapController.js', () => ({
    BootstrapController: vi.fn(() => createMockBootstrapController()),
  }));

  // Mock proof tree controller
  vi.mock('../../infrastructure/proof-tree/ProofTreeController.js', () => ({
    ProofTreeController: vi.fn(() => createMockProofTreeController()),
  }));

  // Mock ProofTreePanel
  vi.mock('../../webview/ProofTreePanel.js', () => ({
    ProofTreePanel: {
      createWithServices: vi.fn().mockResolvedValue(ok({})),
    },
  }));

  // Mock panel manager
  vi.mock('../../webview/ProofTreePanelManager.js', () => ({
    ProofTreePanelManager: {
      getInstance: vi.fn(() => createMockPanelManager()),
    },
  }));
};

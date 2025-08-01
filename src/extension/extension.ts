import 'reflect-metadata';
import type * as vscode from 'vscode';
import type { IViewStatePort } from '../application/ports/IViewStatePort.js';
import {
  type ApplicationContainer,
  getContainer,
  initializeContainer,
  registerPlatformAdapters,
} from '../infrastructure/di/container.js';
import { TOKENS } from '../infrastructure/di/tokens.js';
import type { BootstrapController } from '../presentation/controllers/BootstrapController.js';
import type { DocumentController } from '../presentation/controllers/DocumentController.js';
import type { ProofTreeController } from '../presentation/controllers/ProofTreeController.js';
import type { ValidationController } from '../validation/ValidationController.js';
import { createCommandRegistry } from './commands/CommandRegistry.js';
import { createEventHandlers } from './events/EventHandlers.js';
import { createFileWatchingService } from './services/FileWatchingService.js';

export async function activate(context: vscode.ExtensionContext) {
  // Initialize the DI container
  await initializeContainer();
  const container = getContainer();

  // Register platform adapters with VS Code context
  await registerPlatformAdapters(container, context);

  // Register presentation layer controllers
  await registerPresentationControllers(container);

  // Get controllers from DI container
  const controllers = await resolveControllers(container);

  // Wire up document controller with panel manager and view state port
  await setupDocumentController(container, controllers.documentController);

  // Register commands
  const commandRegistryResult = createCommandRegistry(container, context);
  if (commandRegistryResult.isErr()) {
    throw new Error(`Failed to register commands: ${commandRegistryResult.error.message}`);
  }

  // Register event handlers
  const eventHandlersResult = createEventHandlers(
    container,
    controllers.documentController,
    controllers.validationController,
  );
  if (eventHandlersResult.isErr()) {
    throw new Error(`Failed to register event handlers: ${eventHandlersResult.error.message}`);
  }

  // Set up file watching
  const fileWatchingResult = createFileWatchingService(container);
  if (fileWatchingResult.isErr()) {
    // File watching is optional, log but don't throw
    // File watching setup failed: fileWatchingResult.error.message
  }

  // Add all disposables to context
  context.subscriptions.push(
    controllers.validationController,
    commandRegistryResult.value,
    eventHandlersResult.value,
  );

  if (fileWatchingResult.isOk()) {
    context.subscriptions.push(fileWatchingResult.value);
  }

  // Check for existing proof files
  await eventHandlersResult.value.checkForExistingProofFiles(controllers.proofTreeController);
}

export function deactivate() {
  // Extension deactivated
}

async function registerPresentationControllers(container: ApplicationContainer): Promise<void> {
  const { DocumentController: DocumentControllerImpl } = await import(
    '../presentation/controllers/DocumentController.js'
  );
  const { ProofTreeController: ProofTreeControllerImpl } = await import(
    '../presentation/controllers/ProofTreeController.js'
  );

  container.registerFactory(
    TOKENS.DocumentController,
    (c) =>
      new DocumentControllerImpl(
        c.resolve(TOKENS.IUIPort),
        c.resolve(TOKENS.IPlatformPort),
        c.resolve(TOKENS.IFileSystemPort),
      ),
  );

  container.registerFactory(
    TOKENS.ProofTreeController,
    (c) => new ProofTreeControllerImpl(c.resolve(TOKENS.IUIPort)),
  );
}

interface Controllers {
  documentController: DocumentController;
  proofTreeController: ProofTreeController;
  validationController: ValidationController;
  bootstrapController: BootstrapController;
}

async function resolveControllers(container: ApplicationContainer): Promise<Controllers> {
  try {
    return {
      documentController: container.resolve<DocumentController>(TOKENS.DocumentController),
      proofTreeController: container.resolve<ProofTreeController>(TOKENS.ProofTreeController),
      validationController: container.resolve<ValidationController>(
        TOKENS.InfrastructureValidationController,
      ),
      bootstrapController: container.resolve<BootstrapController>(TOKENS.BootstrapController),
    };
  } catch (error) {
    throw new Error(
      `Failed to resolve required services: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function setupDocumentController(
  container: ApplicationContainer,
  documentController: DocumentController,
): Promise<void> {
  const { ProofTreePanelManager } = await import('../webview/ProofTreePanelManager.js');
  const panelManager = ProofTreePanelManager.getInstance();
  const viewStatePort = container.resolve<IViewStatePort>(TOKENS.IViewStatePort);

  documentController.setPanelManager(panelManager);
  documentController.setViewStatePort(viewStatePort);
}

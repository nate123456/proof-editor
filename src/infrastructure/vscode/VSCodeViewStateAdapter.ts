import { err, ok, type Result } from 'neverthrow';
import type * as vscode from 'vscode';
import type { IViewStatePort, ViewStateScope } from '../../application/ports/IViewStatePort.js';

/**
 * VS Code implementation of view state storage port
 *
 * Provides persistent storage for view state using VS Code's
 * globalState and workspaceState APIs with proper error handling
 * and Result pattern throughout.
 */
export class VSCodeViewStateAdapter implements IViewStatePort {
  private readonly storage: vscode.Memento;
  private readonly namespace: string;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly scope: ViewStateScope = 'global',
    namespace: string = 'proof-editor',
  ) {
    this.storage = scope === 'workspace' ? context.workspaceState : context.globalState;
    this.namespace = namespace;
  }

  async saveViewState(key: string, state: unknown): Promise<Result<void, Error>> {
    if (!this.isValidKey(key)) {
      return err(new Error('Invalid key: key cannot be empty or contain invalid characters'));
    }

    try {
      const storageKey = this.buildStorageKey(key);
      await this.storage.update(storageKey, state);
      return ok(undefined);
    } catch (error) {
      return err(
        new Error(
          `Failed to save view state for key '${key}': ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async loadViewState(key: string): Promise<Result<unknown | null, Error>> {
    if (!this.isValidKey(key)) {
      return err(new Error('Invalid key: key cannot be empty or contain invalid characters'));
    }

    try {
      const storageKey = this.buildStorageKey(key);
      const value = this.storage.get(storageKey, null);
      return ok(value);
    } catch (error) {
      return err(
        new Error(
          `Failed to load view state for key '${key}': ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async clearViewState(key: string): Promise<Result<void, Error>> {
    if (!this.isValidKey(key)) {
      return err(new Error('Invalid key: key cannot be empty or contain invalid characters'));
    }

    try {
      const storageKey = this.buildStorageKey(key);
      await this.storage.update(storageKey, undefined);
      return ok(undefined);
    } catch (error) {
      return err(
        new Error(
          `Failed to clear view state for key '${key}': ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async hasViewState(key: string): Promise<Result<boolean, Error>> {
    if (!this.isValidKey(key)) {
      return err(new Error('Invalid key: key cannot be empty or contain invalid characters'));
    }

    try {
      const storageKey = this.buildStorageKey(key);
      const value = this.storage.get(storageKey, null);
      return ok(value !== null && value !== undefined);
    } catch (error) {
      return err(
        new Error(
          `Failed to check view state for key '${key}': ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async getAllStateKeys(): Promise<Result<string[], Error>> {
    try {
      const allKeys = this.storage.keys();
      const viewStatePrefix = `${this.namespace}.view-state.`;

      const filteredKeys = allKeys
        .filter((key) => key.startsWith(viewStatePrefix))
        .map((key) => key.substring(viewStatePrefix.length))
        .filter((key) => key.length > 0);

      return ok(filteredKeys);
    } catch (error) {
      return err(
        new Error(
          `Failed to get state keys: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async clearAllViewState(): Promise<Result<void, Error>> {
    try {
      const keysResult = await this.getAllStateKeys();
      if (keysResult.isErr()) {
        return err(keysResult.error);
      }

      const clearPromises = keysResult.value.map(async (key) => {
        const storageKey = this.buildStorageKey(key);
        await this.storage.update(storageKey, undefined);
      });

      await Promise.all(clearPromises);
      return ok(undefined);
    } catch (error) {
      return err(
        new Error(
          `Failed to clear all view state: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  private buildStorageKey(key: string): string {
    return `${this.namespace}.view-state.${key}`;
  }

  private isValidKey(key: string): boolean {
    return typeof key === 'string' && key.trim().length > 0;
  }
}

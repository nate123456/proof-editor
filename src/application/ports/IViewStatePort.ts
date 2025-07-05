import type { Result } from 'neverthrow';

/**
 * Platform abstraction for view state persistence
 *
 * This port provides platform-agnostic storage capabilities for view state.
 * Implementations should handle platform-specific storage mechanisms
 * (VS Code globalState/workspaceState, browser localStorage, etc.)
 */
export interface IViewStatePort {
  /**
   * Save view state data to persistent storage
   *
   * @param key - Storage key identifying the state type
   * @param state - State data to persist
   * @returns Result indicating success or failure
   */
  saveViewState(key: string, state: unknown): Promise<Result<void, Error>>;

  /**
   * Load view state data from persistent storage
   *
   * @param key - Storage key identifying the state type
   * @returns Result containing state data or null if not found
   */
  loadViewState(key: string): Promise<Result<unknown | null, Error>>;

  /**
   * Clear view state data from persistent storage
   *
   * @param key - Storage key identifying the state type
   * @returns Result indicating success or failure
   */
  clearViewState(key: string): Promise<Result<void, Error>>;

  /**
   * Check if view state exists for the given key
   *
   * @param key - Storage key to check
   * @returns Result indicating if state exists
   */
  hasViewState(key: string): Promise<Result<boolean, Error>>;

  /**
   * Get all available view state keys
   *
   * @returns Result containing array of available keys
   */
  getAllStateKeys(): Promise<Result<string[], Error>>;

  /**
   * Clear all view state data
   *
   * @returns Result indicating success or failure
   */
  clearAllViewState(): Promise<Result<void, Error>>;
}

/**
 * Storage scope for view state
 */
export type ViewStateScope = 'global' | 'workspace' | 'document';

/**
 * Configuration for view state storage
 */
export interface ViewStateStorageConfig {
  scope: ViewStateScope;
  namespace?: string;
  encryptSensitiveData?: boolean;
  compressionEnabled?: boolean;
}

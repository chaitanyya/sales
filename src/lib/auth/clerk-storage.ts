import { invoke } from "@tauri-apps/api/core";

/**
 * Custom storage adapter for Clerk that uses Tauri's secure storage
 * instead of localStorage. This allows session tokens to persist
 * across app restarts in a Tauri desktop application.
 *
 * Note: Clerk uses localStorage by default, which doesn't persist
 * reliably in Tauri apps. This adapter uses Tauri's secure storage
 * plugin to persist tokens.
 */
class TauriClerkStorage {
  /**
   * Get a value from Tauri secure storage
   */
  async getItem(key: string): Promise<string | null> {
    try {
      const value = await invoke<string | null>("storage_get", { key });
      return value;
    } catch (error) {
      console.error(`Failed to get ${key} from storage:`, error);
      return null;
    }
  }

  /**
   * Set a value in Tauri secure storage
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      await invoke("storage_set", { key, value });
    } catch (error) {
      console.error(`Failed to set ${key} in storage:`, error);
    }
  }

  /**
   * Remove a value from Tauri secure storage
   */
  async removeItem(key: string): Promise<void> {
    try {
      await invoke("storage_remove", { key });
    } catch (error) {
      console.error(`Failed to remove ${key} from storage:`, error);
    }
  }
}

/**
 * Export an instance of the Tauri storage adapter
 * This can be passed to Clerk's storage option
 */
export const tauriClerkStorage = new TauriClerkStorage();

/**
 * Type for the storage adapter
 * Clerk's storage interface requires these methods
 */
export type CustomClerkStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

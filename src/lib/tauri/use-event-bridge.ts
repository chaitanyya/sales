import { useEffect } from "react";
import { initializeEventBridge, cleanupEventBridge } from "./event-bridge";

/**
 * Hook that initializes the Tauri event bridge.
 * Should be called once at the app root level.
 *
 * This sets up listeners for backend events (lead-updated, person-updated, etc.)
 * and routes them to TanStack Query cache invalidations.
 */
export function useEventBridge() {
  useEffect(() => {
    initializeEventBridge();

    return () => {
      cleanupEventBridge();
    };
  }, []);
}

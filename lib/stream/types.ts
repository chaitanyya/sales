import { ClientLogEntry } from "@/lib/types/claude";

// Connection status for UI display
export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

// Retry configuration with exponential backoff
export interface StreamConnectionConfig {
  maxRetries: number;
  baseDelay: number; // ms
  maxDelay: number; // ms
  backoffMultiplier: number;
}

// Default retry config: 1s -> 2s -> 4s -> 8s -> 16s (max)
export const DEFAULT_STREAM_CONFIG: StreamConnectionConfig = {
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 16000,
  backoffMultiplier: 2,
};

// Callbacks for stream connection events
export interface StreamConnectionCallbacks {
  onLog: (log: ClientLogEntry) => void;
  onComplete: () => void;
  onError: (message: string) => void;
  onStatusChange: (status: ConnectionStatus) => void;
}

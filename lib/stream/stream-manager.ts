import { StreamConnection } from "./stream-connection";
import { ConnectionStatus, StreamConnectionCallbacks } from "./types";
import { ClientLogEntry } from "@/lib/types/claude";

export interface StreamManagerCallbacks {
  onLog: (jobId: string, log: ClientLogEntry) => void;
  onComplete: (jobId: string) => void;
  onError: (jobId: string, message: string) => void;
  onStatusChange: (jobId: string, status: ConnectionStatus) => void;
  getLastEventIndex: (jobId: string) => number;
  incrementLastEventIndex: (jobId: string) => void;
}

/**
 * Singleton managing all stream connections.
 * Integrates with Zustand store through callbacks.
 */
class StreamManagerImpl {
  private connections: Map<string, StreamConnection> = new Map();
  private callbacks: StreamManagerCallbacks | null = null;

  /**
   * Initialize the manager with callbacks to the Zustand store.
   * Must be called before subscribing to any streams.
   */
  init(callbacks: StreamManagerCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Subscribe to a job's log stream.
   * Creates a new connection or returns existing one.
   */
  subscribe(jobId: string): void {
    if (!this.callbacks) {
      console.error("StreamManager not initialized. Call init() first.");
      return;
    }

    // Already have an active connection for this job
    if (this.connections.has(jobId)) {
      return;
    }

    const lastEventIndex = this.callbacks.getLastEventIndex(jobId);

    const connectionCallbacks: StreamConnectionCallbacks = {
      onLog: (log) => {
        this.callbacks!.onLog(jobId, log);
        this.callbacks!.incrementLastEventIndex(jobId);
      },
      onComplete: () => {
        this.callbacks!.onComplete(jobId);
        this.connections.delete(jobId);
      },
      onError: (message) => {
        this.callbacks!.onError(jobId, message);
        this.connections.delete(jobId);
      },
      onStatusChange: (status) => {
        this.callbacks!.onStatusChange(jobId, status);
      },
    };

    const connection = new StreamConnection(jobId, lastEventIndex, connectionCallbacks);

    this.connections.set(jobId, connection);
    connection.connect();
  }

  /**
   * Unsubscribe from a job's log stream.
   * Destroys the connection.
   */
  unsubscribe(jobId: string): void {
    const connection = this.connections.get(jobId);
    if (connection) {
      connection.destroy();
      this.connections.delete(jobId);
    }
  }

  /**
   * Check if there's an active connection for a job.
   */
  hasConnection(jobId: string): boolean {
    return this.connections.has(jobId);
  }

  /**
   * Get all active job IDs.
   */
  getActiveJobIds(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Destroy all connections.
   */
  destroyAll(): void {
    for (const connection of this.connections.values()) {
      connection.destroy();
    }
    this.connections.clear();
  }
}

// Export singleton instance
export const StreamManager = new StreamManagerImpl();

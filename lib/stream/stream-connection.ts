import { ClientLogEntry, SSEEvent } from "@/lib/types/claude";
import {
  ConnectionStatus,
  StreamConnectionConfig,
  StreamConnectionCallbacks,
  DEFAULT_STREAM_CONFIG,
} from "./types";

let idCounter = 0;

/**
 * Single connection manager for a research job stream.
 * Handles EventSource connection with automatic retry and exponential backoff.
 */
export class StreamConnection {
  private jobId: string;
  private config: StreamConnectionConfig;
  private callbacks: StreamConnectionCallbacks;
  private eventSource: EventSource | null = null;
  private retryCount = 0;
  private retryTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private lastEventIndex: number;
  private destroyed = false;

  constructor(
    jobId: string,
    lastEventIndex: number,
    callbacks: StreamConnectionCallbacks,
    config: StreamConnectionConfig = DEFAULT_STREAM_CONFIG
  ) {
    this.jobId = jobId;
    this.lastEventIndex = lastEventIndex;
    this.callbacks = callbacks;
    this.config = config;
  }

  /**
   * Connect to the SSE stream, resuming from lastEventIndex if available.
   */
  connect(): void {
    if (this.destroyed) {
      return;
    }

    // Clean up any existing connection
    this.closeEventSource();

    const status: ConnectionStatus = this.retryCount === 0 ? "connecting" : "reconnecting";
    this.callbacks.onStatusChange(status);

    const url =
      this.lastEventIndex > 0
        ? `/api/research/${this.jobId}/stream?from=${this.lastEventIndex}`
        : `/api/research/${this.jobId}/stream`;

    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      if (this.destroyed) {
        this.closeEventSource();
        return;
      }
      // Reset retry count on successful connection
      this.retryCount = 0;
      this.callbacks.onStatusChange("connected");
    };

    this.eventSource.onmessage = (event) => {
      if (this.destroyed) return;

      try {
        const data = JSON.parse(event.data) as SSEEvent;

        if (data.type === "log") {
          const entry: ClientLogEntry = {
            id: `${Date.now()}-${idCounter++}`,
            type: data.logType,
            content: data.content,
            toolName: data.toolName,
            timestamp: new Date(data.timestamp),
          };
          this.callbacks.onLog(entry);
          this.lastEventIndex++;
        } else if (data.type === "complete") {
          this.callbacks.onComplete();
          this.destroy();
        } else if (data.type === "error") {
          this.callbacks.onError(data.message);
          this.destroy();
        }
      } catch {
        // Non-JSON message from SSE, ignore
      }
    };

    this.eventSource.onerror = () => {
      if (this.destroyed) return;
      this.handleError();
    };
  }

  /**
   * Handle connection error with retry logic.
   */
  private handleError(): void {
    this.closeEventSource();

    if (this.retryCount >= this.config.maxRetries) {
      // Max retries exceeded, permanent error
      this.callbacks.onStatusChange("error");
      this.callbacks.onError(`Connection failed after ${this.config.maxRetries} retries`);
      return;
    }

    // Schedule retry with exponential backoff
    this.scheduleRetry();
  }

  /**
   * Schedule a retry with exponential backoff.
   * delay = min(baseDelay * 2^retryCount, maxDelay)
   */
  private scheduleRetry(): void {
    const delay = Math.min(
      this.config.baseDelay * Math.pow(this.config.backoffMultiplier, this.retryCount),
      this.config.maxDelay
    );

    this.retryCount++;
    this.callbacks.onStatusChange("reconnecting");

    this.retryTimeoutId = setTimeout(() => {
      if (!this.destroyed) {
        this.connect();
      }
    }, delay);
  }

  /**
   * Close the EventSource without destroying the connection.
   */
  private closeEventSource(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  /**
   * Get the current last event index (for persistence).
   */
  getLastEventIndex(): number {
    return this.lastEventIndex;
  }

  /**
   * Clean shutdown of the connection.
   */
  destroy(): void {
    this.destroyed = true;

    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }

    this.closeEventSource();
    this.callbacks.onStatusChange("disconnected");
  }
}

import { z } from 'zod';
import { logger } from '../utils/logger';

// Channel message schemas
export const IncomingMessageSchema = z.object({
  content: z.string(),
  sender: z.string(),
  channel: z.enum(['phone', 'whatsapp', 'messenger', 'sms', 'email', 'web']),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.date().default(() => new Date()),
  messageId: z.string(),
  threadId: z.string().optional(),
});

export const OutgoingMessageSchema = z.object({
  content: z.string(),
  recipient: z.string(),
  channel: z.enum(['phone', 'whatsapp', 'messenger', 'sms', 'email', 'web']),
  metadata: z.record(z.unknown()).optional(),
  replyToId: z.string().optional(),
  attachments: z.array(z.object({
    type: z.enum(['image', 'document', 'audio', 'video']),
    url: z.string(),
    filename: z.string().optional(),
  })).optional(),
});

export type IncomingMessage = z.infer<typeof IncomingMessageSchema>;
export type OutgoingMessage = z.infer<typeof OutgoingMessageSchema>;

/**
 * Base interface for all channel adapters
 */
export abstract class BaseChannelAdapter {
  protected channelName: string;
  protected isActive: boolean = false;

  constructor(channelName: string) {
    this.channelName = channelName;
  }

  /**
   * Initialize the channel adapter
   */
  abstract initialize(): Promise<void>;

  /**
   * Start listening for incoming messages
   */
  abstract startListening(): Promise<void>;

  /**
   * Stop listening for incoming messages
   */
  abstract stopListening(): Promise<void>;

  /**
   * Send a message through this channel
   */
  abstract sendMessage(message: OutgoingMessage): Promise<boolean>;

  /**
   * Validate incoming message format
   */
  protected validateIncoming(data: unknown): IncomingMessage {
    return IncomingMessageSchema.parse(data);
  }

  /**
   * Validate outgoing message format
   */
  protected validateOutgoing(data: unknown): OutgoingMessage {
    return OutgoingMessageSchema.parse(data);
  }

  /**
   * Get channel status
   */
  getStatus(): { name: string; active: boolean } {
    return {
      name: this.channelName,
      active: this.isActive,
    };
  }

  /**
   * Log channel activity
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: unknown): void {
    const logMessage = `[${this.channelName.toUpperCase()}] ${message}`;
    logger[level](logMessage, data);
  }

  /**
   * Handle errors uniformly across channels
   */
  protected handleError(error: Error, context: string): void {
    this.log('error', `Error in ${context}:`, error);
  }

  /**
   * Generate unique session ID for this channel
   */
  protected generateSessionId(sender: string): string {
    return `${this.channelName}-${sender}-${Date.now()}`;
  }

  /**
   * Format content based on channel capabilities
   */
  protected formatContent(content: string): string {
    // Base implementation - can be overridden by specific adapters
    return content;
  }

  /**
   * Extract sender information from channel-specific data
   */
  protected abstract extractSender(data: unknown): string;

  /**
   * Extract message content from channel-specific data
   */
  protected abstract extractContent(data: unknown): string;

  /**
   * Handle connection status changes
   */
  protected onConnectionStatusChange(connected: boolean): void {
    this.isActive = connected;
    this.log('info', `Connection status changed: ${connected ? 'connected' : 'disconnected'}`);
  }
}
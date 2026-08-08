import { z } from 'zod';

// Channel types
export const ChannelMessageSchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1),
  userId: z.string().optional(),
  userName: z.string().optional(),
  timestamp: z.date(),
  metadata: z.record(z.unknown()).optional(),
});

export const ChannelResponseSchema = z.object({
  content: z.string().min(1),
  type: z.enum(['TEXT', 'IMAGE', 'FILE', 'QUICK_REPLY']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type ChannelMessage = z.infer<typeof ChannelMessageSchema>;
export type ChannelResponse = z.infer<typeof ChannelResponseSchema>;

// Channel adapter interface
export interface IChannelAdapter {
  name: string;
  initialize(config: Record<string, unknown>): Promise<void>;
  sendMessage(userId: string, response: ChannelResponse): Promise<boolean>;
  onMessage(callback: (message: ChannelMessage) => Promise<void>): void;
  disconnect(): Promise<void>;
}

import { z } from 'zod';

// AI Provider types
export const AIMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  name: z.string().optional(),
});

export const AIResponseSchema = z.object({
  content: z.string(),
  usage: z.object({
    promptTokens: z.number(),
    completionTokens: z.number(),
    totalTokens: z.number(),
  }).optional(),
  finishReason: z.string().optional(),
});

export const AIProviderConfigSchema = z.object({
  provider: z.enum(['mistral', 'openai', 'claude']),
  model: z.string(),
  apiKey: z.string(),
  baseUrl: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().optional(),
});

export type AIMessage = z.infer<typeof AIMessageSchema>;
export type AIResponse = z.infer<typeof AIResponseSchema>;
export type AIProviderConfig = z.infer<typeof AIProviderConfigSchema>;

// AI Provider interface
export interface IAIProvider {
  name: string;
  initialize(config: AIProviderConfig): Promise<void>;
  generateResponse(messages: AIMessage[], options?: Record<string, unknown>): Promise<AIResponse>;
  isHealthy(): Promise<boolean>;
}

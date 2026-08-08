import { z } from 'zod';

// Tool Engine types
export const ToolParameterSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
  required: z.boolean(),
  description: z.string(),
  validation: z.any().optional(),
});

export const ToolDefinitionSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  parameters: z.array(ToolParameterSchema),
  category: z.string().min(1),
  requiresAuth: z.boolean(),
  rateLimit: z.number().optional(),
});

export const ToolExecutionResultSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  executionTime: z.number(),
  toolName: z.string(),
  tenantId: z.string(),
});

export const ToolContextSchema = z.object({
  tenantId: z.string().min(1),
  userId: z.string().optional(),
  conversationId: z.string().optional(),
  customerId: z.string().optional(),
  sessionData: z.record(z.unknown()).optional(),
});

export type ToolParameter = z.infer<typeof ToolParameterSchema>;
export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;
export type ToolExecutionResult = z.infer<typeof ToolExecutionResultSchema>;
export type ToolContext = z.infer<typeof ToolContextSchema>;

// Tool interfaces
export interface ITool {
  definition: ToolDefinition;
  execute(context: ToolContext, parameters: Record<string, unknown>): Promise<ToolExecutionResult>;
  validate(parameters: Record<string, unknown>): boolean;
}

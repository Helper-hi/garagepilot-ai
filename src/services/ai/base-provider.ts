import { AIMessage, AIResponse, AIProviderConfig, IAIProvider } from '../../types/ai';
import { logger } from '../../utils/logger';

export abstract class BaseAIProvider implements IAIProvider {
  abstract name: string;
  protected config!: AIProviderConfig;
  protected initialized = false;

  async initialize(config: AIProviderConfig): Promise<void> {
    this.config = config;
    this.initialized = true;
    logger.info(`🤖 ${this.name} AI Provider initialized`);
  }

  abstract generateResponse(
    messages: AIMessage[], 
    options?: Record<string, unknown>
  ): Promise<AIResponse>;

  abstract isHealthy(): Promise<boolean>;

  protected validateInitialization(): void {
    if (!this.initialized) {
      throw new Error(`${this.name} provider not initialized`);
    }
  }

  protected formatMessages(messages: AIMessage[]): any[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      ...(msg.name && { name: msg.name })
    }));
  }

  protected createResponse(
    content: string, 
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number },
    finishReason?: string
  ): AIResponse {
    return {
      content,
      usage,
      finishReason
    };
  }
}

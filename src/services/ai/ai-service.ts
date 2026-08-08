import { AIMessage, AIResponse, AIProviderConfig, IAIProvider } from '../../types/ai';
import { MistralProvider } from './mistral-provider';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export class AIService {
  private provider: IAIProvider;
  private static instance: AIService;

  private constructor() {
    // Initialize based on config
    switch (config.AI_PROVIDER) {
      case 'mistral':
        this.provider = new MistralProvider();
        break;
      case 'openai':
        // TODO: Implement OpenAI provider
        throw new Error('OpenAI provider not implemented yet');
      case 'claude':
        // TODO: Implement Claude provider
        throw new Error('Claude provider not implemented yet');
      default:
        throw new Error(`Unsupported AI provider: ${config.AI_PROVIDER}`);
    }
  }

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  async initialize(): Promise<void> {
    const providerConfig: AIProviderConfig = {
      provider: config.AI_PROVIDER,
      model: config.AI_MODEL,
      apiKey: config.AI_API_KEY,
      baseUrl: config.AI_BASE_URL,
      temperature: config.AI_TEMPERATURE,
      maxTokens: config.AI_MAX_TOKENS
    };

    await this.provider.initialize(providerConfig);
    logger.info('🧠 AI Service initialized successfully');
  }

  async generateResponse(
    messages: AIMessage[], 
    options?: Record<string, unknown>
  ): Promise<AIResponse> {
    try {
      logger.debug('Generating AI response', { 
        messagesCount: messages.length,
        provider: this.provider.name 
      });
      
      const response = await this.provider.generateResponse(messages, options);
      
      logger.debug('AI response generated successfully', {
        contentLength: response.content.length,
        usage: response.usage
      });
      
      return response;
    } catch (error) {
      logger.error('Failed to generate AI response:', error);
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    return await this.provider.isHealthy();
  }

  getProviderName(): string {
    return this.provider.name;
  }
}

// Export singleton instance
export const aiService = AIService.getInstance();

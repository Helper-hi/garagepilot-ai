import { AIMessage, AIResponse, AIProviderConfig } from '../../types/ai';
import { BaseAIProvider } from './base-provider';
import { logger } from '../../utils/logger';

interface MistralMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface MistralResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class MistralProvider extends BaseAIProvider {
  name = 'Mistral';
  private baseUrl = 'https://api.mistral.ai/v1';

  async initialize(config: AIProviderConfig): Promise<void> {
    await super.initialize(config);
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    }
  }

  async generateResponse(
    messages: AIMessage[], 
    options: Record<string, unknown> = {}
  ): Promise<AIResponse> {
    this.validateInitialization();

    try {
      const mistralMessages: MistralMessage[] = messages.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content
      }));

      const requestBody = {
        model: this.config.model,
        messages: mistralMessages,
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 1000,
        ...options
      };

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Mistral API error: ${response.status} ${errorText}`);
      }

      const data: MistralResponse = await response.json();
      const choice = data.choices[0];

      if (!choice) {
        throw new Error('No response choice from Mistral API');
      }

      return this.createResponse(
        choice.message.content,
        {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens
        },
        choice.finish_reason
      );
    } catch (error) {
      logger.error('Mistral API call failed:', error);
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });
      return response.ok;
    } catch (error) {
      logger.error('Mistral health check failed:', error);
      return false;
    }
  }
}

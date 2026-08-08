import { ITools, ToolDefinition, ToolExecutionResult, ToolContext } from '../../types/tools';
import { logger } from '../../utils/logger';

export abstract class BaseTool implements ITools {
  abstract definition: ToolDefinition;

  async execute(
    context: ToolContext,
    parameters: Record<string, unknown>
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Validate parameters
      const isValid = this.validate(parameters);
      if (!isValid) {
        return {
          success: false,
          error: 'Invalid parameters provided',
          executionTime: Date.now() - startTime,
          toolName: this.definition.name,
          tenantId: context.tenantId
        };
      }

      // Log tool execution
      logger.debug('Executing tool', {
        toolName: this.definition.name,
        tenantId: context.tenantId,
        parameters: this.sanitizeParameters(parameters)
      });

      // Execute the tool logic
      const result = await this.executeInternal(context, parameters);
      
      const executionTime = Date.now() - startTime;
      
      logger.debug('Tool execution completed', {
        toolName: this.definition.name,
        success: result.success,
        executionTime
      });

      return {
        ...result,
        executionTime,
        toolName: this.definition.name,
        tenantId: context.tenantId
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.error('Tool execution failed', {
        toolName: this.definition.name,
        error: error.message,
        executionTime
      });

      return {
        success: false,
        error: error.message || 'Unknown error occurred',
        executionTime,
        toolName: this.definition.name,
        tenantId: context.tenantId
      };
    }
  }

  validate(parameters: Record<string, unknown>): boolean {
    try {
      // Check required parameters
      for (const param of this.definition.parameters) {
        if (param.required && !(param.name in parameters)) {
          logger.warn('Missing required parameter', {
            toolName: this.definition.name,
            parameter: param.name
          });
          return false;
        }

        // Basic type validation
        if (param.name in parameters) {
          const value = parameters[param.name];
          if (!this.validateParameterType(value, param.type)) {
            logger.warn('Invalid parameter type', {
              toolName: this.definition.name,
              parameter: param.name,
              expected: param.type,
              actual: typeof value
            });
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      logger.error('Parameter validation error', {
        toolName: this.definition.name,
        error: error.message
      });
      return false;
    }
  }

  protected abstract executeInternal(
    context: ToolContext,
    parameters: Record<string, unknown>
  ): Promise<Omit<ToolExecutionResult, 'executionTime' | 'toolName' | 'tenantId'>>;

  private validateParameterType(value: unknown, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null;
      case 'array':
        return Array.isArray(value);
      default:
        return true; // Unknown type, assume valid
    }
  }

  private sanitizeParameters(parameters: Record<string, unknown>): Record<string, unknown> {
    // Remove sensitive data from logs
    const sanitized = { ...parameters };
    const sensitiveKeys = ['password', 'token', 'key', 'secret'];
    
    Object.keys(sanitized).forEach(key => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}

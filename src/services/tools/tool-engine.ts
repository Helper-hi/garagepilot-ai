import { ITools, ToolDefinition, ToolExecutionResult, ToolContext } from '../../types/tools';
import { logger } from '../../utils/logger';

export class ToolEngine {
  private static instance: ToolEngine;
  private tools: Map<string, ITools> = new Map();
  private toolCategories: Map<string, string[]> = new Map();

  private constructor() {}

  static getInstance(): ToolEngine {
    if (!ToolEngine.instance) {
      ToolEngine.instance = new ToolEngine();
    }
    return ToolEngine.instance;
  }

  registerTool(tool: ITools): void {
    const name = tool.definition.name;
    
    if (this.tools.has(name)) {
      logger.warn('Tool already registered, overwriting', { toolName: name });
    }

    this.tools.set(name, tool);
    
    // Add to category
    const category = tool.definition.category;
    if (!this.toolCategories.has(category)) {
      this.toolCategories.set(category, []);
    }
    
    const categoryTools = this.toolCategories.get(category)!;
    if (!categoryTools.includes(name)) {
      categoryTools.push(name);
    }

    logger.info('Tool registered successfully', {
      toolName: name,
      category,
      requiresAuth: tool.definition.requiresAuth
    });
  }

  async executeTool(
    toolName: string,
    context: ToolContext,
    parameters: Record<string, unknown>
  ): Promise<ToolExecutionResult> {
    const tool = this.tools.get(toolName);
    
    if (!tool) {
      logger.error('Tool not found', { toolName, availableTools: Array.from(this.tools.keys()) });
      return {
        success: false,
        error: `Tool '${toolName}' not found`,
        executionTime: 0,
        toolName,
        tenantId: context.tenantId
      };
    }

    // Check authentication if required
    if (tool.definition.requiresAuth && !context.userId) {
      return {
        success: false,
        error: 'Authentication required for this tool',
        executionTime: 0,
        toolName,
        tenantId: context.tenantId
      };
    }

    // Rate limiting would go here if implemented
    
    return await tool.execute(context, parameters);
  }

  getAvailableTools(category?: string): ToolDefinition[] {
    let toolsToReturn: ITools[];
    
    if (category) {
      const toolNames = this.toolCategories.get(category) || [];
      toolsToReturn = toolNames.map(name => this.tools.get(name)!).filter(Boolean);
    } else {
      toolsToReturn = Array.from(this.tools.values());
    }
    
    return toolsToReturn.map(tool => tool.definition);
  }

  getToolDefinition(toolName: string): ToolDefinition | null {
    const tool = this.tools.get(toolName);
    return tool ? tool.definition : null;
  }

  getCategories(): string[] {
    return Array.from(this.toolCategories.keys());
  }

  getToolsForContext(context: ToolContext): ToolDefinition[] {
    return this.getAvailableTools().filter(tool => {
      // Filter based on auth requirements
      if (tool.requiresAuth && !context.userId) {
        return false;
      }
      
      // Additional context-based filtering can be added here
      
      return true;
    });
  }

  async validateTool(toolName: string, parameters: Record<string, unknown>): Promise<boolean> {
    const tool = this.tools.get(toolName);
    
    if (!tool) {
      return false;
    }

    return tool.validate(parameters);
  }

  getToolsStats(): Record<string, any> {
    return {
      totalTools: this.tools.size,
      categories: this.getCategories().length,
      toolsByCategory: Object.fromEntries(
        Array.from(this.toolCategories.entries()).map(([category, tools]) => [
          category,
          tools.length
        ])
      )
    };
  }
}

export const toolEngine = ToolEngine.getInstance();

import { z } from 'zod';
import { logger } from '../utils/logger';
import { AIService } from '../services/ai/ai-service';
import { MemoryService } from '../services/memory/memory-service';
import { ToolEngine } from '../services/tools/tool-engine';
import { CustomerService } from '../services/business/customer-service';

// Brain Pipeline Schemas
export const ObservationSchema = z.object({
  channel: z.enum(['phone', 'whatsapp', 'messenger', 'sms', 'email', 'web']),
  content: z.string(),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.date(),
  userId: z.string().optional(),
  sessionId: z.string(),
});

export const UnderstandingSchema = z.object({
  intent: z.string(),
  entities: z.record(z.unknown()),
  sentiment: z.enum(['positive', 'neutral', 'negative']),
  urgency: z.enum(['low', 'medium', 'high', 'urgent']),
  confidence: z.number().min(0).max(1),
  language: z.string().default('fr'),
});

export const ContextSchema = z.object({
  customer: z.unknown().optional(),
  vehicle: z.unknown().optional(),
  appointment: z.unknown().optional(),
  conversation: z.array(z.unknown()).default([]),
  preferences: z.record(z.unknown()).default({}),
});

export const PlanSchema = z.object({
  actions: z.array(z.object({
    type: z.enum(['respond', 'tool', 'memory', 'workflow']),
    tool: z.string().optional(),
    parameters: z.record(z.unknown()).optional(),
    priority: z.number().default(1),
  })),
  responseType: z.enum(['text', 'voice', 'multimedia']),
  requiresConfirmation: z.boolean().default(false),
});

export const ExecutionResultSchema = z.object({
  success: z.boolean(),
  response: z.string(),
  data: z.unknown().optional(),
  errors: z.array(z.string()).default([]),
  nextActions: z.array(z.string()).default([]),
});

// Types
export type Observation = z.infer<typeof ObservationSchema>;
export type Understanding = z.infer<typeof UnderstandingSchema>;
export type Context = z.infer<typeof ContextSchema>;
export type Plan = z.infer<typeof PlanSchema>;
export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;

/**
 * GaragePilot AI Brain - Core intelligence engine
 * Implements OBSERVE -> UNDERSTAND -> IDENTIFY CONTEXT -> RETRIEVE MEMORY -> PLAN -> EXECUTE -> VERIFY -> RESPOND -> SAVE pipeline
 */
export class Brain {
  private aiService: AIService;
  private memoryService: MemoryService;
  private toolEngine: ToolEngine;
  private customerService: CustomerService;

  constructor(
    aiService: AIService,
    memoryService: MemoryService,
    toolEngine: ToolEngine,
    customerService: CustomerService
  ) {
    this.aiService = aiService;
    this.memoryService = memoryService;
    this.toolEngine = toolEngine;
    this.customerService = customerService;
  }

  /**
   * Main processing pipeline
   */
  async process(input: Observation): Promise<ExecutionResult> {
    try {
      logger.info(`🧠 Brain processing input from ${input.channel}`);

      // 1. OBSERVE - Input already validated
      const observation = ObservationSchema.parse(input);
      
      // 2. UNDERSTAND - Analyze intent and extract entities
      const understanding = await this.understand(observation);
      
      // 3. IDENTIFY CONTEXT - Get relevant context
      const context = await this.identifyContext(observation, understanding);
      
      // 4. RETRIEVE MEMORY - Get relevant memories
      await this.retrieveMemory(context, observation.sessionId);
      
      // 5. PLAN - Decide what to do
      const plan = await this.plan(observation, understanding, context);
      
      // 6. EXECUTE - Execute the plan
      const result = await this.execute(plan, context);
      
      // 7. VERIFY - Check results
      const verified = await this.verify(result, plan);
      
      // 8. SAVE MEMORY - Store the interaction
      await this.saveMemory(observation, understanding, context, verified);
      
      return verified;
      
    } catch (error) {
      logger.error('❌ Brain processing failed:', error);
      return {
        success: false,
        response: 'Je rencontre une difficulté technique. Pouvez-vous reformuler votre demande ?',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * 2. UNDERSTAND - Analyze the input using AI
   */
  private async understand(observation: Observation): Promise<Understanding> {
    const prompt = `
Analyse cette demande client pour un garage automobile :

Message: ${observation.content}
Canal: ${observation.channel}

Extrait :
1. L'intention principale (rendez-vous, information, réclamation, etc.)
2. Les entités importantes (nom, téléphone, véhicule, date, etc.)
3. Le sentiment (positif/neutre/négatif)
4. L'urgence (low/medium/high/urgent)
5. Ta confiance dans l'analyse (0-1)

Réponds en JSON avec cette structure :
{
  "intent": "description de l'intention",
  "entities": {
    "customerName": "nom si mentionné",
    "phone": "téléphone si mentionné",
    "vehicleInfo": "informations véhicule",
    "appointmentDate": "date/heure si mentionnée",
    "serviceType": "type de service demandé"
  },
  "sentiment": "positive|neutral|negative",
  "urgency": "low|medium|high|urgent",
  "confidence": 0.95
}`;

    const response = await this.aiService.generateText(prompt);
    
    try {
      const parsed = JSON.parse(response);
      return UnderstandingSchema.parse({
        ...parsed,
        language: 'fr'
      });
    } catch (error) {
      logger.warn('Failed to parse AI understanding response, using fallback');
      return {
        intent: 'demande_generale',
        entities: {},
        sentiment: 'neutral',
        urgency: 'medium',
        confidence: 0.5,
        language: 'fr'
      };
    }
  }

  /**
   * 3. IDENTIFY CONTEXT - Get relevant context
   */
  private async identifyContext(observation: Observation, understanding: Understanding): Promise<Context> {
    const context: Context = {
      conversation: [],
      preferences: {}
    };

    // Try to identify customer from entities or previous context
    const customerInfo = understanding.entities.customerName || understanding.entities.phone;
    if (customerInfo) {
      try {
        // Search for existing customer
        const customers = await this.customerService.searchCustomers(customerInfo.toString());
        if (customers.length > 0) {
          context.customer = customers[0];
          logger.info(`👤 Customer identified: ${customers[0].firstName} ${customers[0].lastName}`);
        }
      } catch (error) {
        logger.warn('Failed to identify customer:', error);
      }
    }

    return context;
  }

  /**
   * 4. RETRIEVE MEMORY - Get conversation history and relevant memories
   */
  private async retrieveMemory(context: Context, sessionId: string): Promise<void> {
    try {
      const memories = await this.memoryService.retrieveConversationMemory(sessionId);
      context.conversation = memories;
    } catch (error) {
      logger.warn('Failed to retrieve memory:', error);
    }
  }

  /**
   * 5. PLAN - Decide what actions to take
   */
  private async plan(observation: Observation, understanding: Understanding, context: Context): Promise<Plan> {
    const planPrompt = `
En tant qu'assistant IA pour garage automobile, analyse cette situation :

INTENTION: ${understanding.intent}
SENTIMENT: ${understanding.sentiment}
URGENCE: ${understanding.urgency}
CLIENT IDENTIFIÉ: ${context.customer ? 'Oui' : 'Non'}
CONTEXTE CONVERSATION: ${context.conversation.length} messages précédents

Détermine les actions à effectuer :

1. Si c'est une prise de rendez-vous -> tool: schedule_appointment
2. Si c'est une recherche d'info client -> tool: get_customer_info
3. Si c'est une question générale -> respond avec informations
4. Si urgence élevée -> priorité 1

Réponds en JSON :
{
  "actions": [
    {
      "type": "tool|respond|memory|workflow",
      "tool": "nom_du_tool",
      "parameters": {},
      "priority": 1
    }
  ],
  "responseType": "text",
  "requiresConfirmation": false
}`;

    const response = await this.aiService.generateText(planPrompt);
    
    try {
      const parsed = JSON.parse(response);
      return PlanSchema.parse(parsed);
    } catch (error) {
      logger.warn('Failed to parse planning response, using default plan');
      return {
        actions: [{
          type: 'respond',
          priority: 1
        }],
        responseType: 'text',
        requiresConfirmation: false
      };
    }
  }

  /**
   * 6. EXECUTE - Execute the planned actions
   */
  private async execute(plan: Plan, context: Context): Promise<ExecutionResult> {
    const results: ExecutionResult[] = [];
    
    // Sort actions by priority
    const sortedActions = plan.actions.sort((a, b) => a.priority - b.priority);
    
    for (const action of sortedActions) {
      try {
        let result: ExecutionResult;
        
        switch (action.type) {
          case 'tool':
            if (action.tool) {
              result = await this.executeTool(action.tool, action.parameters || {}, context);
            } else {
              result = { success: false, response: 'Tool name missing', errors: ['No tool specified'] };
            }
            break;
            
          case 'respond':
            result = await this.generateResponse(context, plan);
            break;
            
          case 'memory':
            result = await this.executeMemoryAction(action.parameters || {}, context);
            break;
            
          default:
            result = { success: false, response: 'Unknown action type', errors: [`Unknown action: ${action.type}`] };
        }
        
        results.push(result);
        
        // If critical action fails, stop execution
        if (!result.success && action.priority === 1) {
          break;
        }
        
      } catch (error) {
        const errorResult = {
          success: false,
          response: 'Action execution failed',
          errors: [error instanceof Error ? error.message : 'Unknown error']
        };
        results.push(errorResult);
        
        if (action.priority === 1) {
          break;
        }
      }
    }
    
    // Combine results
    const successfulResults = results.filter(r => r.success);
    const errors = results.flatMap(r => r.errors);
    
    if (successfulResults.length === 0) {
      return {
        success: false,
        response: 'Je n\'ai pas pu traiter votre demande. Pouvez-vous reformuler ?',
        errors
      };
    }
    
    return {
      success: true,
      response: successfulResults[successfulResults.length - 1].response,
      data: successfulResults[successfulResults.length - 1].data,
      errors
    };
  }

  /**
   * Execute a tool action
   */
  private async executeTool(toolName: string, parameters: Record<string, unknown>, context: Context): Promise<ExecutionResult> {
    try {
      const result = await this.toolEngine.executeTool(toolName, parameters, context);
      return {
        success: true,
        response: result.response || 'Tool executed successfully',
        data: result.data
      };
    } catch (error) {
      return {
        success: false,
        response: 'Tool execution failed',
        errors: [error instanceof Error ? error.message : 'Unknown tool error']
      };
    }
  }

  /**
   * Generate AI response
   */
  private async generateResponse(context: Context, plan: Plan): Promise<ExecutionResult> {
    const responsePrompt = `
En tant qu'assistant IA pour garage automobile, génère une réponse appropriée :

CONTEXTE CLIENT: ${context.customer ? `${JSON.stringify(context.customer)}` : 'Client non identifié'}
CONVERSATION PRÉCÉDENTE: ${context.conversation.length} messages
TYPE DE RÉPONSE: ${plan.responseType}

Génère une réponse professionnelle, chaleureuse et utile en français.
Tutoie le client et utilise un ton amical mais professionnel.

Réponds directement (pas de JSON) :`;

    try {
      const response = await this.aiService.generateText(responsePrompt);
      return {
        success: true,
        response: response.trim()
      };
    } catch (error) {
      return {
        success: false,
        response: 'Bonjour ! Comment puis-je vous aider aujourd\'hui ?',
        errors: [error instanceof Error ? error.message : 'AI generation failed']
      };
    }
  }

  /**
   * Execute memory action
   */
  private async executeMemoryAction(parameters: Record<string, unknown>, context: Context): Promise<ExecutionResult> {
    // Placeholder for memory actions
    return {
      success: true,
      response: 'Memory action completed'
    };
  }

  /**
   * 7. VERIFY - Verify the execution results
   */
  private async verify(result: ExecutionResult, plan: Plan): Promise<ExecutionResult> {
    // Basic verification - can be enhanced
    if (!result.success) {
      return result;
    }

    // Check if response is appropriate
    if (!result.response || result.response.length === 0) {
      return {
        success: false,
        response: 'Je n\'ai pas pu générer une réponse appropriée. Pouvez-vous reformuler ?',
        errors: ['Empty response generated']
      };
    }

    return result;
  }

  /**
   * 8. SAVE MEMORY - Store the interaction in memory
   */
  private async saveMemory(
    observation: Observation,
    understanding: Understanding,
    context: Context,
    result: ExecutionResult
  ): Promise<void> {
    try {
      await this.memoryService.storeInteraction({
        sessionId: observation.sessionId,
        timestamp: observation.timestamp,
        channel: observation.channel,
        input: observation.content,
        intent: understanding.intent,
        entities: understanding.entities,
        response: result.response,
        success: result.success,
        metadata: {
          sentiment: understanding.sentiment,
          urgency: understanding.urgency,
          confidence: understanding.confidence,
          customerId: context.customer ? (context.customer as any).id : undefined
        }
      });
    } catch (error) {
      logger.warn('Failed to save memory:', error);
    }
  }
}
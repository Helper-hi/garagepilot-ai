import { BaseChannelAdapter, IncomingMessage, OutgoingMessage } from './base-adapter';
import { Brain } from '../core/brain';
import { ComposioService } from '../services/integrations/composio-service';
import { nanoid } from 'nanoid';

/**
 * Email channel adapter using Composio Gmail integration
 */
export class EmailAdapter extends BaseChannelAdapter {
  private composioService: ComposioService;
  private brain: Brain;
  private pollingInterval?: NodeJS.Timeout;
  private lastCheckedTime: Date = new Date();
  private readonly POLLING_INTERVAL_MS = 30000; // 30 seconds

  constructor(composioService: ComposioService, brain: Brain) {
    super('email');
    this.composioService = composioService;
    this.brain = brain;
  }

  async initialize(): Promise<void> {
    try {
      this.log('info', 'Initializing email adapter...');
      
      // Test Gmail connection
      await this.composioService.testGmailConnection();
      
      this.log('info', 'Email adapter initialized successfully');
    } catch (error) {
      this.handleError(error as Error, 'initialize');
      throw error;
    }
  }

  async startListening(): Promise<void> {
    try {
      this.log('info', 'Starting email polling...');
      
      // Start polling for new emails
      this.pollingInterval = setInterval(async () => {
        await this.checkForNewEmails();
      }, this.POLLING_INTERVAL_MS);
      
      // Do initial check
      await this.checkForNewEmails();
      
      this.isActive = true;
      this.log('info', 'Email polling started');
    } catch (error) {
      this.handleError(error as Error, 'startListening');
      throw error;
    }
  }

  async stopListening(): Promise<void> {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }
    
    this.isActive = false;
    this.log('info', 'Email polling stopped');
  }

  async sendMessage(message: OutgoingMessage): Promise<boolean> {
    try {
      const validMessage = this.validateOutgoing(message);
      
      this.log('info', `Sending email to ${validMessage.recipient}`);
      
      const success = await this.composioService.sendEmail({
        to: validMessage.recipient,
        subject: this.extractSubjectFromMetadata(validMessage.metadata) || 'Réponse de votre garage',
        body: validMessage.content,
        replyToId: validMessage.replyToId,
      });
      
      if (success) {
        this.log('info', 'Email sent successfully');
      } else {
        this.log('error', 'Failed to send email');
      }
      
      return success;
    } catch (error) {
      this.handleError(error as Error, 'sendMessage');
      return false;
    }
  }

  protected extractSender(data: unknown): string {
    // Extract email sender from Gmail API response
    if (typeof data === 'object' && data !== null && 'sender' in data) {
      return (data as any).sender || 'unknown@example.com';
    }
    return 'unknown@example.com';
  }

  protected extractContent(data: unknown): string {
    // Extract email content from Gmail API response
    if (typeof data === 'object' && data !== null && 'messageText' in data) {
      return (data as any).messageText || '';
    }
    return '';
  }

  private async checkForNewEmails(): Promise<void> {
    try {
      this.log('info', 'Checking for new emails...');
      
      // Fetch new emails since last check
      const emails = await this.composioService.fetchNewEmails(this.lastCheckedTime);
      
      for (const email of emails) {
        await this.processIncomingEmail(email);
      }
      
      // Update last checked time
      this.lastCheckedTime = new Date();
      
      if (emails.length > 0) {
        this.log('info', `Processed ${emails.length} new emails`);
      }
    } catch (error) {
      this.handleError(error as Error, 'checkForNewEmails');
    }
  }

  private async processIncomingEmail(emailData: any): Promise<void> {
    try {
      // Convert Gmail data to our internal format
      const incomingMessage: IncomingMessage = {
        content: this.extractContent(emailData),
        sender: this.extractSender(emailData),
        channel: 'email',
        metadata: {
          subject: emailData.subject,
          messageId: emailData.messageId,
          threadId: emailData.threadId,
          timestamp: emailData.internalDate ? new Date(parseInt(emailData.internalDate)) : new Date(),
        },
        timestamp: emailData.internalDate ? new Date(parseInt(emailData.internalDate)) : new Date(),
        messageId: emailData.messageId || nanoid(),
        threadId: emailData.threadId,
      };

      // Validate the message
      const validMessage = this.validateIncoming(incomingMessage);
      
      this.log('info', `Processing email from ${validMessage.sender}: ${validMessage.metadata?.subject}`);
      
      // Create observation for Brain processing
      const observation = {
        channel: 'email' as const,
        content: validMessage.content,
        metadata: validMessage.metadata,
        timestamp: validMessage.timestamp,
        userId: validMessage.sender,
        sessionId: this.generateSessionId(validMessage.sender),
      };
      
      // Process through Brain
      const result = await this.brain.process(observation);
      
      // Send response if needed
      if (result.success && result.response) {
        const responseMessage: OutgoingMessage = {
          content: result.response,
          recipient: validMessage.sender,
          channel: 'email',
          metadata: {
            subject: `Re: ${validMessage.metadata?.subject || 'Votre demande'}`,
          },
          replyToId: validMessage.messageId,
        };
        
        await this.sendMessage(responseMessage);
      }
    } catch (error) {
      this.handleError(error as Error, 'processIncomingEmail');
    }
  }

  private extractSubjectFromMetadata(metadata?: Record<string, unknown>): string | undefined {
    if (metadata && 'subject' in metadata && typeof metadata.subject === 'string') {
      return metadata.subject;
    }
    return undefined;
  }

  /**
   * Get email-specific status information
   */
  getEmailStatus() {
    return {
      ...this.getStatus(),
      lastChecked: this.lastCheckedTime,
      pollingInterval: this.POLLING_INTERVAL_MS,
      isPolling: !!this.pollingInterval,
    };
  }

  /**
   * Manually trigger email check (for testing or immediate response)
   */
  async triggerEmailCheck(): Promise<void> {
    await this.checkForNewEmails();
  }

  /**
   * Update polling interval
   */
  setPollingInterval(intervalMs: number): void {
    if (intervalMs < 10000) {
      throw new Error('Polling interval must be at least 10 seconds to avoid rate limits');
    }
    
    this.POLLING_INTERVAL_MS = intervalMs;
    
    // Restart polling with new interval if currently active
    if (this.isActive && this.pollingInterval) {
      this.stopListening();
      this.startListening();
    }
    
    this.log('info', `Polling interval updated to ${intervalMs}ms`);
  }
}
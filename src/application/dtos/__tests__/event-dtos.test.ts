import { describe, expect, test } from 'vitest';
import { mapToApplicationEvent, type StatementCreatedEvent } from '../event-dtos.js';

describe('Event DTOs', () => {
  describe('mapToApplicationEvent', () => {
    test('maps domain event to application event', () => {
      const domainEvent = {
        eventType: 'StatementCreated',
        aggregateId: 'doc-123',
        eventData: {
          statementId: 'stmt-456',
          content: 'Test statement',
        },
        timestamp: 1234567890,
      };

      const applicationEvent = mapToApplicationEvent(domainEvent);

      expect(applicationEvent.eventType).toBe('StatementCreated');
      expect(applicationEvent.aggregateId).toBe('doc-123');
      expect(applicationEvent.eventData.statementId).toBe('stmt-456');
      expect(applicationEvent.eventData.content).toBe('Test statement');
      expect(applicationEvent.timestamp).toBe(1234567890);
    });

    test('provides default timestamp when not provided', () => {
      const domainEvent = {
        eventType: 'StatementCreated',
        aggregateId: 'doc-123',
        eventData: {
          statementId: 'stmt-456',
          content: 'Test statement',
        },
      };

      const applicationEvent = mapToApplicationEvent(domainEvent);

      expect(applicationEvent.timestamp).toBeGreaterThan(0);
      expect(typeof applicationEvent.timestamp).toBe('number');
    });
  });

  describe('StatementCreatedEvent type', () => {
    test('has correct structure', () => {
      const event: StatementCreatedEvent = {
        eventType: 'StatementCreated',
        aggregateId: 'doc-123',
        eventData: {
          statementId: 'stmt-456',
          content: 'Test statement',
        },
        timestamp: Date.now(),
      };

      expect(event.eventData.statementId).toBe('stmt-456');
      expect(event.eventData.content).toBe('Test statement');
    });
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import type { DomainEvent } from '../../../domain/events/base-event.js';
import {
  OrderedSetCreated,
  OrderedSetDeleted,
  StatementCreated,
  StatementDeleted,
} from '../../../domain/events/proof-document-events.js';
import { Timestamp } from '../../../domain/shared/value-objects.js';
import { StatementUsageEventHandler, StatementUsageTracker } from '../StatementUsageTracker.js';

describe('StatementUsageTracker', () => {
  let tracker: StatementUsageTracker;

  beforeEach(() => {
    tracker = new StatementUsageTracker();
  });

  describe('handleStatementCreated', () => {
    it('should initialize statement with zero usage count', () => {
      const event = new StatementCreated('doc-1', {
        statementId: 'stmt-1',
        content: 'All men are mortal',
      });

      tracker.handleStatementCreated(event);

      expect(tracker.getUsageCount('stmt-1')).toBe(0);
      expect(tracker.getStatementContent('stmt-1')).toBe('All men are mortal');
    });

    it('should handle multiple statement creation events', () => {
      const event1 = new StatementCreated('doc-1', {
        statementId: 'stmt-1',
        content: 'All men are mortal',
      });

      const event2 = new StatementCreated('doc-1', {
        statementId: 'stmt-2',
        content: 'Socrates is a man',
      });

      tracker.handleStatementCreated(event1);
      tracker.handleStatementCreated(event2);

      expect(tracker.getUsageCount('stmt-1')).toBe(0);
      expect(tracker.getUsageCount('stmt-2')).toBe(0);
      expect(tracker.getStatementContent('stmt-1')).toBe('All men are mortal');
      expect(tracker.getStatementContent('stmt-2')).toBe('Socrates is a man');
    });

    it('should handle statement creation with empty content', () => {
      const event = new StatementCreated('doc-1', {
        statementId: 'stmt-1',
        content: '',
      });

      tracker.handleStatementCreated(event);

      expect(tracker.getUsageCount('stmt-1')).toBe(0);
      expect(tracker.getStatementContent('stmt-1')).toBe('');
    });
  });

  describe('handleStatementDeleted', () => {
    it('should remove statement from tracking', () => {
      const createEvent = new StatementCreated('doc-1', {
        statementId: 'stmt-1',
        content: 'All men are mortal',
      });

      const deleteEvent = new StatementDeleted('doc-1', {
        statementId: 'stmt-1',
        content: 'All men are mortal',
      });

      tracker.handleStatementCreated(createEvent);
      tracker.handleStatementDeleted(deleteEvent);

      expect(tracker.getUsageCount('stmt-1')).toBe(0);
      expect(tracker.getStatementContent('stmt-1')).toBeUndefined();
    });

    it('should handle deletion of non-existent statement', () => {
      const event = new StatementDeleted('doc-1', {
        statementId: 'non-existent',
        content: 'Some content',
      });

      expect(() => tracker.handleStatementDeleted(event)).not.toThrow();
    });
  });

  describe('handleOrderedSetCreated', () => {
    it('should increment usage counts for statements in the set', () => {
      const createStmt1 = new StatementCreated('doc-1', {
        statementId: 'stmt-1',
        content: 'All men are mortal',
      });

      const createStmt2 = new StatementCreated('doc-1', {
        statementId: 'stmt-2',
        content: 'Socrates is a man',
      });

      const createSet = new OrderedSetCreated('doc-1', {
        orderedSetId: 'set-1',
        statementIds: ['stmt-1', 'stmt-2'],
      });

      tracker.handleStatementCreated(createStmt1);
      tracker.handleStatementCreated(createStmt2);
      tracker.handleOrderedSetCreated(createSet);

      expect(tracker.getUsageCount('stmt-1')).toBe(1);
      expect(tracker.getUsageCount('stmt-2')).toBe(1);
    });

    it('should handle statements that do not exist', () => {
      const event = new OrderedSetCreated('doc-1', {
        orderedSetId: 'set-1',
        statementIds: ['non-existent-1', 'non-existent-2'],
      });

      tracker.handleOrderedSetCreated(event);

      expect(tracker.getUsageCount('non-existent-1')).toBe(1);
      expect(tracker.getUsageCount('non-existent-2')).toBe(1);
    });

    it('should handle duplicate statement IDs in the same set', () => {
      const createStmt = new StatementCreated('doc-1', {
        statementId: 'stmt-1',
        content: 'All men are mortal',
      });

      const createSet = new OrderedSetCreated('doc-1', {
        orderedSetId: 'set-1',
        statementIds: ['stmt-1', 'stmt-1', 'stmt-1'],
      });

      tracker.handleStatementCreated(createStmt);
      tracker.handleOrderedSetCreated(createSet);

      expect(tracker.getUsageCount('stmt-1')).toBe(3);
    });

    it('should handle empty statement IDs array', () => {
      const event = new OrderedSetCreated('doc-1', {
        orderedSetId: 'set-1',
        statementIds: [],
      });

      expect(() => tracker.handleOrderedSetCreated(event)).not.toThrow();
    });
  });

  describe('handleOrderedSetDeleted', () => {
    it('should decrement usage counts for statements in the set', () => {
      const createStmt1 = new StatementCreated('doc-1', {
        statementId: 'stmt-1',
        content: 'All men are mortal',
      });

      const createStmt2 = new StatementCreated('doc-1', {
        statementId: 'stmt-2',
        content: 'Socrates is a man',
      });

      const createSet = new OrderedSetCreated('doc-1', {
        orderedSetId: 'set-1',
        statementIds: ['stmt-1', 'stmt-2'],
      });

      const deleteSet = new OrderedSetDeleted('doc-1', {
        orderedSetId: 'set-1',
        statementIds: ['stmt-1', 'stmt-2'],
      });

      tracker.handleStatementCreated(createStmt1);
      tracker.handleStatementCreated(createStmt2);
      tracker.handleOrderedSetCreated(createSet);
      tracker.handleOrderedSetDeleted(deleteSet);

      expect(tracker.getUsageCount('stmt-1')).toBe(0);
      expect(tracker.getUsageCount('stmt-2')).toBe(0);
    });

    it('should not allow usage count to go below zero', () => {
      const createStmt = new StatementCreated('doc-1', {
        statementId: 'stmt-1',
        content: 'All men are mortal',
      });

      const deleteSet = new OrderedSetDeleted('doc-1', {
        orderedSetId: 'set-1',
        statementIds: ['stmt-1'],
      });

      tracker.handleStatementCreated(createStmt);
      tracker.handleOrderedSetDeleted(deleteSet);

      expect(tracker.getUsageCount('stmt-1')).toBe(0);
    });

    it('should handle non-existent statements', () => {
      const event = new OrderedSetDeleted('doc-1', {
        orderedSetId: 'set-1',
        statementIds: ['non-existent'],
      });

      expect(() => tracker.handleOrderedSetDeleted(event)).not.toThrow();
      expect(tracker.getUsageCount('non-existent')).toBe(0);
    });
  });

  describe('getUsageCount', () => {
    it('should return 0 for non-existent statement', () => {
      expect(tracker.getUsageCount('non-existent')).toBe(0);
    });

    it('should return correct usage count', () => {
      const createStmt = new StatementCreated('doc-1', {
        statementId: 'stmt-1',
        content: 'All men are mortal',
      });

      const createSet1 = new OrderedSetCreated('doc-1', {
        orderedSetId: 'set-1',
        statementIds: ['stmt-1'],
      });

      const createSet2 = new OrderedSetCreated('doc-1', {
        orderedSetId: 'set-2',
        statementIds: ['stmt-1'],
      });

      tracker.handleStatementCreated(createStmt);
      tracker.handleOrderedSetCreated(createSet1);
      tracker.handleOrderedSetCreated(createSet2);

      expect(tracker.getUsageCount('stmt-1')).toBe(2);
    });
  });

  describe('getStatementContent', () => {
    it('should return undefined for non-existent statement', () => {
      expect(tracker.getStatementContent('non-existent')).toBeUndefined();
    });

    it('should return correct content', () => {
      const event = new StatementCreated('doc-1', {
        statementId: 'stmt-1',
        content: 'All men are mortal',
      });

      tracker.handleStatementCreated(event);

      expect(tracker.getStatementContent('stmt-1')).toBe('All men are mortal');
    });
  });

  describe('getUnusedStatements', () => {
    it('should return empty array when no statements exist', () => {
      expect(tracker.getUnusedStatements()).toEqual([]);
    });

    it('should return statements with zero usage', () => {
      const createStmt1 = new StatementCreated('doc-1', {
        statementId: 'stmt-1',
        content: 'All men are mortal',
      });

      const createStmt2 = new StatementCreated('doc-1', {
        statementId: 'stmt-2',
        content: 'Socrates is a man',
      });

      const createSet = new OrderedSetCreated('doc-1', {
        orderedSetId: 'set-1',
        statementIds: ['stmt-1'],
      });

      tracker.handleStatementCreated(createStmt1);
      tracker.handleStatementCreated(createStmt2);
      tracker.handleOrderedSetCreated(createSet);

      const unused = tracker.getUnusedStatements();
      expect(unused).toEqual([{ id: 'stmt-2', content: 'Socrates is a man' }]);
    });

    it('should handle statements with content but no tracking', () => {
      const createStmt = new StatementCreated('doc-1', {
        statementId: 'stmt-1',
        content: 'All men are mortal',
      });

      tracker.handleStatementCreated(createStmt);

      const unused = tracker.getUnusedStatements();
      expect(unused).toEqual([{ id: 'stmt-1', content: 'All men are mortal' }]);
    });
  });

  describe('getMostUsedStatements', () => {
    it('should return empty array when no statements exist', () => {
      expect(tracker.getMostUsedStatements()).toEqual([]);
    });

    it('should return statements sorted by usage count', () => {
      const createStmt1 = new StatementCreated('doc-1', {
        statementId: 'stmt-1',
        content: 'All men are mortal',
      });

      const createStmt2 = new StatementCreated('doc-1', {
        statementId: 'stmt-2',
        content: 'Socrates is a man',
      });

      const createStmt3 = new StatementCreated('doc-1', {
        statementId: 'stmt-3',
        content: 'Socrates is mortal',
      });

      tracker.handleStatementCreated(createStmt1);
      tracker.handleStatementCreated(createStmt2);
      tracker.handleStatementCreated(createStmt3);

      // Create usage patterns
      tracker.handleOrderedSetCreated(
        new OrderedSetCreated('doc-1', {
          orderedSetId: 'set-1',
          statementIds: ['stmt-1', 'stmt-2'],
        }),
      );

      tracker.handleOrderedSetCreated(
        new OrderedSetCreated('doc-1', {
          orderedSetId: 'set-2',
          statementIds: ['stmt-1'],
        }),
      );

      tracker.handleOrderedSetCreated(
        new OrderedSetCreated('doc-1', {
          orderedSetId: 'set-3',
          statementIds: ['stmt-2'],
        }),
      );

      const mostUsed = tracker.getMostUsedStatements();
      expect(mostUsed).toEqual([
        { id: 'stmt-1', content: 'All men are mortal', usageCount: 2 },
        { id: 'stmt-2', content: 'Socrates is a man', usageCount: 2 },
      ]);
    });

    it('should respect the limit parameter', () => {
      const createStmt1 = new StatementCreated('doc-1', {
        statementId: 'stmt-1',
        content: 'Statement 1',
      });

      const createStmt2 = new StatementCreated('doc-1', {
        statementId: 'stmt-2',
        content: 'Statement 2',
      });

      const createStmt3 = new StatementCreated('doc-1', {
        statementId: 'stmt-3',
        content: 'Statement 3',
      });

      tracker.handleStatementCreated(createStmt1);
      tracker.handleStatementCreated(createStmt2);
      tracker.handleStatementCreated(createStmt3);

      tracker.handleOrderedSetCreated(
        new OrderedSetCreated('doc-1', {
          orderedSetId: 'set-1',
          statementIds: ['stmt-1', 'stmt-2', 'stmt-3'],
        }),
      );

      const mostUsed = tracker.getMostUsedStatements(2);
      expect(mostUsed).toHaveLength(2);
    });

    it('should not include statements with zero usage', () => {
      const createStmt1 = new StatementCreated('doc-1', {
        statementId: 'stmt-1',
        content: 'Used statement',
      });

      const createStmt2 = new StatementCreated('doc-1', {
        statementId: 'stmt-2',
        content: 'Unused statement',
      });

      tracker.handleStatementCreated(createStmt1);
      tracker.handleStatementCreated(createStmt2);

      tracker.handleOrderedSetCreated(
        new OrderedSetCreated('doc-1', {
          orderedSetId: 'set-1',
          statementIds: ['stmt-1'],
        }),
      );

      const mostUsed = tracker.getMostUsedStatements();
      expect(mostUsed).toEqual([{ id: 'stmt-1', content: 'Used statement', usageCount: 1 }]);
    });
  });

  describe('getUsageStats', () => {
    it('should return zero stats when no statements exist', () => {
      const stats = tracker.getUsageStats();
      expect(stats).toEqual({
        totalStatements: 0,
        usedStatements: 0,
        unusedStatements: 0,
        averageUsage: 0,
        maxUsage: 0,
        totalUsages: 0,
      });
    });

    it('should return correct statistics', () => {
      const createStmt1 = new StatementCreated('doc-1', {
        statementId: 'stmt-1',
        content: 'Statement 1',
      });

      const createStmt2 = new StatementCreated('doc-1', {
        statementId: 'stmt-2',
        content: 'Statement 2',
      });

      const createStmt3 = new StatementCreated('doc-1', {
        statementId: 'stmt-3',
        content: 'Statement 3',
      });

      tracker.handleStatementCreated(createStmt1);
      tracker.handleStatementCreated(createStmt2);
      tracker.handleStatementCreated(createStmt3);

      // stmt-1 used 3 times, stmt-2 used 1 time, stmt-3 unused
      tracker.handleOrderedSetCreated(
        new OrderedSetCreated('doc-1', {
          orderedSetId: 'set-1',
          statementIds: ['stmt-1', 'stmt-2'],
        }),
      );

      tracker.handleOrderedSetCreated(
        new OrderedSetCreated('doc-1', {
          orderedSetId: 'set-2',
          statementIds: ['stmt-1'],
        }),
      );

      tracker.handleOrderedSetCreated(
        new OrderedSetCreated('doc-1', {
          orderedSetId: 'set-3',
          statementIds: ['stmt-1'],
        }),
      );

      const stats = tracker.getUsageStats();
      expect(stats).toEqual({
        totalStatements: 3,
        usedStatements: 2,
        unusedStatements: 1,
        averageUsage: 4 / 3, // (3 + 1 + 0) / 3
        maxUsage: 3,
        totalUsages: 4,
      });
    });
  });

  describe('isStatementUsed', () => {
    it('should return false for non-existent statement', () => {
      expect(tracker.isStatementUsed('non-existent')).toBe(false);
    });

    it('should return false for unused statement', () => {
      const event = new StatementCreated('doc-1', {
        statementId: 'stmt-1',
        content: 'Unused statement',
      });

      tracker.handleStatementCreated(event);

      expect(tracker.isStatementUsed('stmt-1')).toBe(false);
    });

    it('should return true for used statement', () => {
      const createStmt = new StatementCreated('doc-1', {
        statementId: 'stmt-1',
        content: 'Used statement',
      });

      const createSet = new OrderedSetCreated('doc-1', {
        orderedSetId: 'set-1',
        statementIds: ['stmt-1'],
      });

      tracker.handleStatementCreated(createStmt);
      tracker.handleOrderedSetCreated(createSet);

      expect(tracker.isStatementUsed('stmt-1')).toBe(true);
    });
  });

  describe('findStatementsByContent', () => {
    it('should return empty array when no statements exist', () => {
      expect(tracker.findStatementsByContent('search')).toEqual([]);
    });

    it('should find statements by content pattern', () => {
      const createStmt1 = new StatementCreated('doc-1', {
        statementId: 'stmt-1',
        content: 'All men are mortal',
      });

      const createStmt2 = new StatementCreated('doc-1', {
        statementId: 'stmt-2',
        content: 'Socrates is a man',
      });

      const createStmt3 = new StatementCreated('doc-1', {
        statementId: 'stmt-3',
        content: 'All humans are mortal',
      });

      tracker.handleStatementCreated(createStmt1);
      tracker.handleStatementCreated(createStmt2);
      tracker.handleStatementCreated(createStmt3);

      const results = tracker.findStatementsByContent('mortal');
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.id)).toEqual(['stmt-1', 'stmt-3']);
    });

    it('should perform case-insensitive search', () => {
      const createStmt = new StatementCreated('doc-1', {
        statementId: 'stmt-1',
        content: 'All Men Are Mortal',
      });

      tracker.handleStatementCreated(createStmt);

      const results = tracker.findStatementsByContent('men');
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe('stmt-1');
    });

    it('should sort results by usage count', () => {
      const createStmt1 = new StatementCreated('doc-1', {
        statementId: 'stmt-1',
        content: 'All men are mortal',
      });

      const createStmt2 = new StatementCreated('doc-1', {
        statementId: 'stmt-2',
        content: 'All humans are mortal',
      });

      tracker.handleStatementCreated(createStmt1);
      tracker.handleStatementCreated(createStmt2);

      // Give stmt-2 higher usage
      tracker.handleOrderedSetCreated(
        new OrderedSetCreated('doc-1', {
          orderedSetId: 'set-1',
          statementIds: ['stmt-2'],
        }),
      );

      tracker.handleOrderedSetCreated(
        new OrderedSetCreated('doc-1', {
          orderedSetId: 'set-2',
          statementIds: ['stmt-2'],
        }),
      );

      tracker.handleOrderedSetCreated(
        new OrderedSetCreated('doc-1', {
          orderedSetId: 'set-3',
          statementIds: ['stmt-1'],
        }),
      );

      const results = tracker.findStatementsByContent('mortal');
      expect(results[0]?.id).toBe('stmt-2');
      expect(results[0]?.usageCount).toBe(2);
      expect(results[1]?.id).toBe('stmt-1');
      expect(results[1]?.usageCount).toBe(1);
    });
  });

  describe('getAllStatementsWithUsage', () => {
    it('should return empty array when no statements exist', () => {
      expect(tracker.getAllStatementsWithUsage()).toEqual([]);
    });

    it('should return all statements with their usage counts', () => {
      const createStmt1 = new StatementCreated('doc-1', {
        statementId: 'stmt-1',
        content: 'All men are mortal',
      });

      const createStmt2 = new StatementCreated('doc-1', {
        statementId: 'stmt-2',
        content: 'Socrates is a man',
      });

      tracker.handleStatementCreated(createStmt1);
      tracker.handleStatementCreated(createStmt2);

      tracker.handleOrderedSetCreated(
        new OrderedSetCreated('doc-1', {
          orderedSetId: 'set-1',
          statementIds: ['stmt-1'],
        }),
      );

      const results = tracker.getAllStatementsWithUsage();
      expect(results).toHaveLength(2);
      expect(results.find((r) => r.id === 'stmt-1')?.usageCount).toBe(1);
      expect(results.find((r) => r.id === 'stmt-2')?.usageCount).toBe(0);
    });

    it('should sort results by content', () => {
      const createStmt1 = new StatementCreated('doc-1', {
        statementId: 'stmt-1',
        content: 'Z statement',
      });

      const createStmt2 = new StatementCreated('doc-1', {
        statementId: 'stmt-2',
        content: 'A statement',
      });

      tracker.handleStatementCreated(createStmt1);
      tracker.handleStatementCreated(createStmt2);

      const results = tracker.getAllStatementsWithUsage();
      expect(results[0]?.content).toBe('A statement');
      expect(results[1]?.content).toBe('Z statement');
    });
  });

  describe('clear', () => {
    it('should clear all tracked data', () => {
      const createStmt = new StatementCreated('doc-1', {
        statementId: 'stmt-1',
        content: 'All men are mortal',
      });

      const createSet = new OrderedSetCreated('doc-1', {
        orderedSetId: 'set-1',
        statementIds: ['stmt-1'],
      });

      tracker.handleStatementCreated(createStmt);
      tracker.handleOrderedSetCreated(createSet);

      expect(tracker.getUsageCount('stmt-1')).toBe(1);
      expect(tracker.getStatementContent('stmt-1')).toBe('All men are mortal');

      tracker.clear();

      expect(tracker.getUsageCount('stmt-1')).toBe(0);
      expect(tracker.getStatementContent('stmt-1')).toBeUndefined();
      expect(tracker.getUsageStats().totalStatements).toBe(0);
    });
  });

  describe('export', () => {
    it('should export tracked data', () => {
      const createStmt = new StatementCreated('doc-1', {
        statementId: 'stmt-1',
        content: 'All men are mortal',
      });

      const createSet = new OrderedSetCreated('doc-1', {
        orderedSetId: 'set-1',
        statementIds: ['stmt-1'],
      });

      tracker.handleStatementCreated(createStmt);
      tracker.handleOrderedSetCreated(createSet);

      const exported = tracker.export();
      expect(exported).toEqual({
        usageCounts: { 'stmt-1': 1 },
        statementContent: { 'stmt-1': 'All men are mortal' },
      });
    });

    it('should export empty data when no statements exist', () => {
      const exported = tracker.export();
      expect(exported).toEqual({
        usageCounts: {},
        statementContent: {},
      });
    });
  });

  describe('import', () => {
    it('should import tracked data', () => {
      const data = {
        usageCounts: { 'stmt-1': 2, 'stmt-2': 1 },
        statementContent: { 'stmt-1': 'All men are mortal', 'stmt-2': 'Socrates is a man' },
      };

      tracker.import(data);

      expect(tracker.getUsageCount('stmt-1')).toBe(2);
      expect(tracker.getUsageCount('stmt-2')).toBe(1);
      expect(tracker.getStatementContent('stmt-1')).toBe('All men are mortal');
      expect(tracker.getStatementContent('stmt-2')).toBe('Socrates is a man');
    });

    it('should replace existing data when importing', () => {
      const createStmt = new StatementCreated('doc-1', {
        statementId: 'stmt-1',
        content: 'Original content',
      });

      tracker.handleStatementCreated(createStmt);

      const data = {
        usageCounts: { 'stmt-1': 5 },
        statementContent: { 'stmt-1': 'Imported content' },
      };

      tracker.import(data);

      expect(tracker.getUsageCount('stmt-1')).toBe(5);
      expect(tracker.getStatementContent('stmt-1')).toBe('Imported content');
    });

    it('should handle empty import data', () => {
      const data = {
        usageCounts: {},
        statementContent: {},
      };

      tracker.import(data);

      expect(tracker.getUsageStats().totalStatements).toBe(0);
    });
  });
});

describe('StatementUsageEventHandler', () => {
  let tracker: StatementUsageTracker;
  let handler: StatementUsageEventHandler;

  beforeEach(() => {
    tracker = new StatementUsageTracker();
    handler = new StatementUsageEventHandler(tracker);
  });

  describe('handle', () => {
    it('should handle StatementCreated events', () => {
      const event = new StatementCreated('doc-1', {
        statementId: 'stmt-1',
        content: 'All men are mortal',
      });

      handler.handle(event);

      expect(tracker.getUsageCount('stmt-1')).toBe(0);
      expect(tracker.getStatementContent('stmt-1')).toBe('All men are mortal');
    });

    it('should handle StatementDeleted events', () => {
      const createEvent = new StatementCreated('doc-1', {
        statementId: 'stmt-1',
        content: 'All men are mortal',
      });

      const deleteEvent = new StatementDeleted('doc-1', {
        statementId: 'stmt-1',
        content: 'All men are mortal',
      });

      handler.handle(createEvent);
      handler.handle(deleteEvent);

      expect(tracker.getUsageCount('stmt-1')).toBe(0);
      expect(tracker.getStatementContent('stmt-1')).toBeUndefined();
    });

    it('should handle OrderedSetCreated events', () => {
      const createStmt = new StatementCreated('doc-1', {
        statementId: 'stmt-1',
        content: 'All men are mortal',
      });

      const createSet = new OrderedSetCreated('doc-1', {
        orderedSetId: 'set-1',
        statementIds: ['stmt-1'],
      });

      handler.handle(createStmt);
      handler.handle(createSet);

      expect(tracker.getUsageCount('stmt-1')).toBe(1);
    });

    it('should handle OrderedSetDeleted events', () => {
      const createStmt = new StatementCreated('doc-1', {
        statementId: 'stmt-1',
        content: 'All men are mortal',
      });

      const createSet = new OrderedSetCreated('doc-1', {
        orderedSetId: 'set-1',
        statementIds: ['stmt-1'],
      });

      const deleteSet = new OrderedSetDeleted('doc-1', {
        orderedSetId: 'set-1',
        statementIds: ['stmt-1'],
      });

      handler.handle(createStmt);
      handler.handle(createSet);
      handler.handle(deleteSet);

      expect(tracker.getUsageCount('stmt-1')).toBe(0);
    });
  });

  describe('canHandle', () => {
    it('should return true for StatementCreated events', () => {
      const event = new StatementCreated('doc-1', {
        statementId: 'stmt-1',
        content: 'All men are mortal',
      });

      expect(handler.canHandle(event)).toBe(true);
    });

    it('should return true for StatementDeleted events', () => {
      const event = new StatementDeleted('doc-1', {
        statementId: 'stmt-1',
        content: 'All men are mortal',
      });

      expect(handler.canHandle(event)).toBe(true);
    });

    it('should return true for OrderedSetCreated events', () => {
      const event = new OrderedSetCreated('doc-1', {
        orderedSetId: 'set-1',
        statementIds: ['stmt-1'],
      });

      expect(handler.canHandle(event)).toBe(true);
    });

    it('should return true for OrderedSetDeleted events', () => {
      const event = new OrderedSetDeleted('doc-1', {
        orderedSetId: 'set-1',
        statementIds: ['stmt-1'],
      });

      expect(handler.canHandle(event)).toBe(true);
    });

    it('should return false for other event types', () => {
      const mockEvent = {
        eventId: 'event-1',
        eventType: 'UnknownEvent',
        aggregateId: 'doc-1',
        aggregateType: 'ProofDocument',
        eventVersion: 1,
        eventData: {},
        occurredAt: Timestamp.now(),
        metadata: {},
        toEventRecord: () => ({
          eventId: 'event-1',
          eventType: 'UnknownEvent',
          aggregateId: 'doc-1',
          aggregateType: 'ProofDocument',
          eventVersion: 1,
          eventData: {},
          occurredAt: Timestamp.now().getValue(),
          metadata: {},
        }),
        getMetadata: () => ({}),
      } as unknown as DomainEvent;

      expect(handler.canHandle(mockEvent)).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex event sequences', () => {
      const events = [
        new StatementCreated('doc-1', {
          statementId: 'stmt-1',
          content: 'All men are mortal',
        }),
        new StatementCreated('doc-1', {
          statementId: 'stmt-2',
          content: 'Socrates is a man',
        }),
        new OrderedSetCreated('doc-1', {
          orderedSetId: 'set-1',
          statementIds: ['stmt-1', 'stmt-2'],
        }),
        new OrderedSetCreated('doc-1', {
          orderedSetId: 'set-2',
          statementIds: ['stmt-1'],
        }),
        new OrderedSetDeleted('doc-1', {
          orderedSetId: 'set-1',
          statementIds: ['stmt-1', 'stmt-2'],
        }),
      ];

      for (const event of events) {
        handler.handle(event);
      }

      expect(tracker.getUsageCount('stmt-1')).toBe(1);
      expect(tracker.getUsageCount('stmt-2')).toBe(0);
      expect(tracker.isStatementUsed('stmt-1')).toBe(true);
      expect(tracker.isStatementUsed('stmt-2')).toBe(false);
    });

    it('should handle rapid statement creation and deletion', () => {
      for (let i = 0; i < 100; i++) {
        const createEvent = new StatementCreated('doc-1', {
          statementId: `stmt-${i}`,
          content: `Statement ${i}`,
        });

        const deleteEvent = new StatementDeleted('doc-1', {
          statementId: `stmt-${i}`,
          content: `Statement ${i}`,
        });

        handler.handle(createEvent);
        handler.handle(deleteEvent);
      }

      expect(tracker.getUsageStats().totalStatements).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle malformed events gracefully', () => {
      const malformedEvent = {
        eventType: 'StatementCreated',
        eventData: {
          statementId: null,
          content: undefined,
        },
      } as any;

      expect(() => handler.handle(malformedEvent)).not.toThrow();
    });

    it('should handle events with missing data gracefully', () => {
      const incompleteEvent = {
        eventType: 'OrderedSetCreated',
        eventData: {
          orderedSetId: 'set-1',
          statementIds: [],
        },
      } as any;

      expect(() => handler.handle(incompleteEvent)).not.toThrow();
    });
  });
});

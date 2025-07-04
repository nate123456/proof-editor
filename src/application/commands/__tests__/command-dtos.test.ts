import { describe, expect, test } from 'vitest';
import type { FindConnectionsQuery } from '../../queries/connection-queries.js';
import { validateCreateStatement } from '../../validation/command-validators.js';
import type { CreateStatementCommand } from '../statement-commands.js';

describe('Command DTOs', () => {
  test('CreateStatementCommand structure', () => {
    const command: CreateStatementCommand = {
      documentId: 'doc123',
      content: 'All men are mortal',
    };

    expect(command).toHaveProperty('documentId');
    expect(command).toHaveProperty('content');
  });

  test('Command validation', () => {
    const invalidCommand: CreateStatementCommand = {
      documentId: '',
      content: '',
    };

    const errors = validateCreateStatement(invalidCommand);
    expect(errors).toContain('Document ID is required');
    expect(errors).toContain('Statement content is required');
  });
});

describe('Query DTOs', () => {
  test('FindConnectionsQuery with filters', () => {
    const query: FindConnectionsQuery = {
      documentId: 'doc123',
      argumentId: 'arg456',
    };

    expect(query.argumentId).toBeDefined();
  });
});

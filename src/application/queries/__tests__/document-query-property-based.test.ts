/**
 * Property-based tests for document queries
 *
 * Uses fast-check to test queries with arbitrary inputs,
 * ensuring robustness across edge cases and unexpected data.
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ErrorSeverity } from '../../../domain/shared/value-objects/index.js';
import type {
  AnalyzeProofStructureQuery,
  DocumentDTO,
  DocumentStatsDTO,
  GetDocumentQuery,
  GetDocumentStateQuery,
  GetValidationReportQuery,
} from '../document-queries.js';
import type { ValidationErrorDTO } from '../shared-types.js';
import { createTestErrorCode, createTestErrorMessage } from './shared/branded-type-helpers.js';

describe('Property-based Document Query Tests', () => {
  describe('GetDocumentQuery properties', () => {
    it('should handle arbitrary document IDs', () => {
      fc.assert(
        fc.property(fc.string(), (documentId) => {
          const query: GetDocumentQuery = {
            documentId,
          };

          expect(typeof query.documentId).toBe('string');
          expect(query.documentId).toBe(documentId);
        }),
      );
    });

    it('should handle document IDs with various lengths', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 1000 }), (documentId) => {
          const query: GetDocumentQuery = {
            documentId,
          };

          expect(query.documentId.length).toBeLessThanOrEqual(1000);
          expect(query.documentId).toBe(documentId);
        }),
      );
    });

    it('should handle unicode document IDs', () => {
      fc.assert(
        fc.property(fc.string({ unit: 'grapheme' }), (documentId) => {
          const query: GetDocumentQuery = {
            documentId,
          };

          expect(query.documentId).toBe(documentId);
        }),
      );
    });
  });

  describe('GetDocumentStateQuery properties', () => {
    it('should handle arbitrary document state queries', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.option(fc.boolean(), { nil: undefined }),
          (documentId, includeStats) => {
            const query: GetDocumentStateQuery = {
              documentId,
              ...(includeStats !== undefined && { includeStats }),
            };

            expect(typeof query.documentId).toBe('string');
            if (query.includeStats !== undefined) {
              expect(typeof query.includeStats).toBe('boolean');
            }
          },
        ),
      );
    });
  });

  describe('GetValidationReportQuery properties', () => {
    it('should handle arbitrary validation report queries', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.option(fc.boolean(), { nil: undefined }),
          (documentId, includeCustomScripts) => {
            const query: GetValidationReportQuery = {
              documentId,
              ...(includeCustomScripts !== undefined && { includeCustomScripts }),
            };

            expect(typeof query.documentId).toBe('string');
            if (query.includeCustomScripts !== undefined) {
              expect(typeof query.includeCustomScripts).toBe('boolean');
            }
          },
        ),
      );
    });
  });

  describe('AnalyzeProofStructureQuery properties', () => {
    it('should handle arbitrary proof structure analysis queries', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.constantFrom('completeness', 'consistency', 'complexity'),
          (documentId, analysisType) => {
            const query: AnalyzeProofStructureQuery = {
              documentId,
              analysisType,
            };

            expect(typeof query.documentId).toBe('string');
            expect(['completeness', 'consistency', 'complexity']).toContain(query.analysisType);
          },
        ),
      );
    });
  });

  describe('DocumentDTO properties', () => {
    it('should handle arbitrary document DTOs', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string(),
            version: fc.nat(),
            createdAt: fc
              .integer({
                min: new Date('2000-01-01').getTime(),
                max: new Date('2100-12-31').getTime(),
              })
              .map((timestamp) => new Date(timestamp).toISOString()),
            modifiedAt: fc
              .integer({
                min: new Date('2000-01-01').getTime(),
                max: new Date('2100-12-31').getTime(),
              })
              .map((timestamp) => new Date(timestamp).toISOString()),
            statements: fc.record({}),
            orderedSets: fc.record({}),
            atomicArguments: fc.record({}),
            trees: fc.record({}),
          }),
          (params) => {
            const document: DocumentDTO = params;

            expect(typeof document.id).toBe('string');
            expect(typeof document.version).toBe('number');
            expect(document.version).toBeGreaterThanOrEqual(0);
            expect(typeof document.createdAt).toBe('string');
            expect(typeof document.modifiedAt).toBe('string');
            expect(() => new Date(document.createdAt)).not.toThrow();
            expect(() => new Date(document.modifiedAt)).not.toThrow();
            expect(typeof document.statements).toBe('object');
            expect(typeof document.orderedSets).toBe('object');
            expect(typeof document.atomicArguments).toBe('object');
            expect(typeof document.trees).toBe('object');
          },
        ),
      );
    });

    it('should handle documents with large collections', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string(),
            version: fc.nat(),
            createdAt: fc
              .date({ min: new Date('2000-01-01'), max: new Date('2100-12-31') })
              .filter((d) => !Number.isNaN(d.getTime()))
              .map((d) => d.toISOString()),
            modifiedAt: fc
              .date({ min: new Date('2000-01-01'), max: new Date('2100-12-31') })
              .filter((d) => !Number.isNaN(d.getTime()))
              .map((d) => d.toISOString()),
            statements: fc.dictionary(
              fc.string(),
              fc.record({
                id: fc.string(),
                content: fc.string(),
                usageCount: fc.nat(),
                createdAt: fc
                  .date({ min: new Date('2000-01-01'), max: new Date('2100-12-31') })
                  .filter((d) => !Number.isNaN(d.getTime()))
                  .map((d) => d.toISOString()),
                modifiedAt: fc
                  .date({ min: new Date('2000-01-01'), max: new Date('2100-12-31') })
                  .filter((d) => !Number.isNaN(d.getTime()))
                  .map((d) => d.toISOString()),
              }),
              { maxKeys: 100 },
            ),
            orderedSets: fc.dictionary(fc.string(), fc.anything(), { maxKeys: 50 }),
            atomicArguments: fc.dictionary(fc.string(), fc.anything(), { maxKeys: 50 }),
            trees: fc.dictionary(fc.string(), fc.anything(), { maxKeys: 10 }),
          }),
          (document) => {
            expect(Object.keys(document.statements).length).toBeLessThanOrEqual(100);
            expect(Object.keys(document.orderedSets).length).toBeLessThanOrEqual(50);
            expect(Object.keys(document.atomicArguments).length).toBeLessThanOrEqual(50);
            expect(Object.keys(document.trees).length).toBeLessThanOrEqual(10);
          },
        ),
      );
    });

    it('should maintain timestamp ordering', () => {
      fc.assert(
        fc.property(
          fc
            .date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') })
            .filter((d) => !Number.isNaN(d.getTime())),
          fc.nat({ max: 365 * 24 * 60 * 60 * 1000 }),
          (createdDate, timeDiff) => {
            // Ensure we have a valid date
            if (Number.isNaN(createdDate.getTime())) return;

            const createdAt = createdDate.toISOString();
            const modifiedDate = new Date(createdDate.getTime() + timeDiff);

            // Ensure the modified date is also valid
            if (Number.isNaN(modifiedDate.getTime())) return;

            const modifiedAt = modifiedDate.toISOString();

            const document: DocumentDTO = {
              id: 'test_doc',
              version: 1,
              createdAt,
              modifiedAt,
              statements: {},
              orderedSets: {},
              atomicArguments: {},
              trees: {},
            };

            const created = new Date(document.createdAt);
            const modified = new Date(document.modifiedAt);
            expect(modified.getTime()).toBeGreaterThanOrEqual(created.getTime());
          },
        ),
      );
    });
  });

  describe('DocumentStatsDTO properties', () => {
    it('should handle arbitrary document stats DTOs', () => {
      fc.assert(
        fc.property(
          fc.record({
            statementCount: fc.nat(),
            argumentCount: fc.nat(),
            treeCount: fc.nat(),
            connectionCount: fc.nat(),
            unusedStatements: fc.array(fc.string()),
            unconnectedArguments: fc.array(fc.string()),
            cyclesDetected: fc.array(
              fc.record({
                path: fc.array(fc.string(), { minLength: 1 }),
                severity: fc.constantFrom('low', 'medium', 'high'),
              }),
            ),
            validationStatus: fc.record({
              isValid: fc.boolean(),
              errors: fc.array(
                fc
                  .record({
                    code: fc
                      .stringMatching(/^[A-Z][A-Z0-9_]*$/)
                      .filter((s) => s.length >= 1 && s.length <= 50),
                    message: fc
                      .string({ minLength: 1, maxLength: 200 })
                      .filter((s) => s.trim().length > 0),
                    severity: fc.constantFrom(
                      ErrorSeverity.ERROR,
                      ErrorSeverity.WARNING,
                      ErrorSeverity.INFO,
                    ),
                  })
                  .map((err) => ({
                    code: createTestErrorCode(err.code),
                    message: createTestErrorMessage(err.message),
                    severity: err.severity,
                  })),
              ),
            }),
          }),
          (params) => {
            const stats: DocumentStatsDTO = params;

            expect(typeof stats.statementCount).toBe('number');
            expect(stats.statementCount).toBeGreaterThanOrEqual(0);
            expect(typeof stats.argumentCount).toBe('number');
            expect(stats.argumentCount).toBeGreaterThanOrEqual(0);
            expect(typeof stats.treeCount).toBe('number');
            expect(stats.treeCount).toBeGreaterThanOrEqual(0);
            expect(typeof stats.connectionCount).toBe('number');
            expect(stats.connectionCount).toBeGreaterThanOrEqual(0);

            expect(Array.isArray(stats.unusedStatements)).toBe(true);
            expect(Array.isArray(stats.unconnectedArguments)).toBe(true);
            expect(Array.isArray(stats.cyclesDetected)).toBe(true);

            stats.unusedStatements.forEach((stmt) => {
              expect(typeof stmt).toBe('string');
            });

            stats.unconnectedArguments.forEach((arg) => {
              expect(typeof arg).toBe('string');
            });

            stats.cyclesDetected.forEach((cycle) => {
              expect(Array.isArray(cycle.path)).toBe(true);
              expect(['low', 'medium', 'high']).toContain(cycle.severity);
              cycle.path.forEach((step) => {
                expect(typeof step).toBe('string');
              });
            });

            expect(typeof stats.validationStatus.isValid).toBe('boolean');
            expect(Array.isArray(stats.validationStatus.errors)).toBe(true);
          },
        ),
      );
    });

    it('should ensure cycle paths are closed loops', () => {
      fc.assert(
        fc.property(fc.array(fc.string(), { minLength: 2, maxLength: 10 }), (pathNodes) => {
          const firstNode = pathNodes[0];
          if (!firstNode) return; // Skip if array is empty (shouldn't happen with minLength: 2)
          const closedPath = [...pathNodes, firstNode];
          const stats: DocumentStatsDTO = {
            statementCount: 10,
            argumentCount: 5,
            treeCount: 1,
            connectionCount: 4,
            unusedStatements: [],
            unconnectedArguments: [],
            cyclesDetected: [
              {
                path: closedPath,
                severity: 'medium',
              },
            ],
            validationStatus: {
              isValid: false,
              errors: [],
            },
          };

          const cycle = stats.cyclesDetected[0];
          expect(cycle).toBeDefined();
          expect(cycle?.path[0]).toBe(cycle?.path[cycle.path.length - 1]);
          expect(cycle?.path.length).toBeGreaterThan(2);
        }),
      );
    });

    it('should maintain logical count relationships', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 1000 }),
          fc.nat({ max: 500 }),
          fc.nat({ max: 100 }),
          (statements, arguments_, trees) => {
            const stats: DocumentStatsDTO = {
              statementCount: statements,
              argumentCount: arguments_,
              treeCount: trees,
              connectionCount: Math.min(arguments_, statements),
              unusedStatements: [],
              unconnectedArguments: [],
              cyclesDetected: [],
              validationStatus: {
                isValid: true,
                errors: [],
              },
            };

            expect(stats.connectionCount).toBeLessThanOrEqual(stats.argumentCount);
            expect(stats.connectionCount).toBeLessThanOrEqual(stats.statementCount);
          },
        ),
      );
    });
  });

  describe('Query result consistency', () => {
    it('should maintain document ID consistency across queries', () => {
      fc.assert(
        fc.property(fc.string(), (documentId) => {
          const getQuery: GetDocumentQuery = { documentId };
          const stateQuery: GetDocumentStateQuery = { documentId };
          const validationQuery: GetValidationReportQuery = { documentId };
          const analysisQuery: AnalyzeProofStructureQuery = {
            documentId,
            analysisType: 'completeness',
          };

          expect(getQuery.documentId).toBe(documentId);
          expect(stateQuery.documentId).toBe(documentId);
          expect(validationQuery.documentId).toBe(documentId);
          expect(analysisQuery.documentId).toBe(documentId);
        }),
      );
    });
  });
});

/**
 * Parser → Domain Integration Tests
 *
 * Tests integration between parser layer and domain entities:
 * - YAML proof file parsing → core domain entity creation
 * - Error mapping from parser to domain validation
 * - Proof document structure → argument tree construction
 * - Parser validation → domain constraint enforcement
 * - End-to-end proof file processing workflows
 */

import { beforeEach, describe, expect, it } from 'vitest';

// Core Domain Services
import { StatementFlowService } from '../../domain/services/StatementFlowService.js';
import { TreeStructureService } from '../../domain/services/TreeStructureService.js';
// Parser layer
import { ProofFileParser } from '../../parser/ProofFileParser.js';
import { YAMLValidator } from '../../parser/YAMLValidator.js';
// Validation layer
import { ErrorMapper } from '../../validation/ErrorMapper.js';
import { ValidationController } from '../../validation/ValidationController.js';

describe('Parser → Domain Integration Tests', () => {
  let parserService: ProofFileParser;
  let yamlValidator: YAMLValidator;
  let domainServices: {
    statementFlow: StatementFlowService;
    treeStructure: TreeStructureService;
  };
  let validationServices: {
    errorMapper: ErrorMapper;
    validationController: ValidationController;
  };

  beforeEach(() => {
    // Initialize parser services
    parserService = new ProofFileParser();
    yamlValidator = new YAMLValidator();

    // Initialize domain services
    domainServices = {
      statementFlow: new StatementFlowService(),
      treeStructure: new TreeStructureService(),
    };

    // Initialize validation services
    validationServices = {
      errorMapper: new ErrorMapper(),
      validationController: new ValidationController(),
    };
  });

  describe('YAML Parsing → Entity Creation Workflow', () => {
    it('should parse valid YAML proof and create domain entities', () => {
      // Arrange - Valid proof YAML
      const validYaml = `
statements:
  s1: "All humans are mortal"
  s2: "Socrates is human"
  s3: "Therefore, Socrates is mortal"

arguments:
  arg1:
    premises: [s1, s2]
    conclusions: [s3]

proof:
  n1: {arg: arg1}
`;

      // Act - Parse YAML and create entities
      const yamlValidationResult = yamlValidator.validate(validYaml);
      expect(yamlValidationResult.isOk()).toBe(true);

      if (yamlValidationResult.isOk()) {
        const parseResult = parserService.parse(validYaml, 'test-proof.proof');
        expect(parseResult.isOk()).toBe(true);

        if (parseResult.isOk()) {
          const proofDoc = parseResult.value;

          // Verify parser extracted correct data
          const statements = proofDoc.getStatements();
          expect(statements.size).toBe(3);
          expect(statements.get('s1')).toBe('All humans are mortal');
          expect(statements.get('s2')).toBe('Socrates is human');
          expect(statements.get('s3')).toBe('Therefore, Socrates is mortal');

          const argumentsMap = proofDoc.getArguments();
          expect(argumentsMap.size).toBe(1);
          const arg1 = argumentsMap.get('arg1');
          expect(arg1).toBeDefined();
          expect(arg1!.premises).toEqual(['s1', 's2']);
          expect(arg1!.conclusions).toEqual(['s3']);

          // Create domain entities from parsed data
          const domainStatements = [];
          for (const [id, content] of statements) {
            const statementResult =
              domainServices.statementFlow.createStatementFromContent(content);
            expect(statementResult.isOk()).toBe(true);
            if (statementResult.isOk()) {
              domainStatements.push({ id, statement: statementResult.value });
            }
          }

          expect(domainStatements).toHaveLength(3);

          // Create atomic arguments from parsed argument definitions
          for (const [, argDef] of argumentsMap) {
            const premiseStatements = argDef.premises
              .map(premiseId => domainStatements.find(ds => ds.id === premiseId)?.statement)
              .filter(stmt => stmt !== undefined);

            const conclusionStatements = argDef.conclusions
              .map(conclusionId => domainStatements.find(ds => ds.id === conclusionId)?.statement)
              .filter(stmt => stmt !== undefined);

            expect(premiseStatements).toHaveLength(argDef.premises.length);
            expect(conclusionStatements).toHaveLength(argDef.conclusions.length);

            const premiseSetResult =
              domainServices.statementFlow.createOrderedSetFromStatements(premiseStatements);
            const conclusionSetResult =
              domainServices.statementFlow.createOrderedSetFromStatements(conclusionStatements);

            expect(premiseSetResult.isOk()).toBe(true);
            expect(conclusionSetResult.isOk()).toBe(true);

            if (premiseSetResult.isOk() && conclusionSetResult.isOk()) {
              const atomicArgumentResult =
                domainServices.statementFlow.createAtomicArgumentWithSets(
                  premiseSetResult.value,
                  conclusionSetResult.value
                );
              expect(atomicArgumentResult.isOk()).toBe(true);
            }
          }
        }
      }
    });

    it('should handle invalid YAML with proper error mapping', () => {
      // Arrange - Invalid YAML with syntax errors
      const invalidYaml = `
statements:
  s1: "Missing quote
  s2: "Valid statement"

arguments:
  arg1:
    premises: [s1, s2
    conclusions: [s3]  # s3 not defined

proof:
  n1: {arg: invalid_arg}  # invalid_arg not defined
`;

      // Act - Parse invalid YAML
      const yamlValidationResult = yamlValidator.validate(invalidYaml);
      expect(yamlValidationResult.isErr()).toBe(true);

      if (yamlValidationResult.isErr()) {
        // Map parser errors to domain errors
        const mappedError = validationServices.errorMapper.mapParseError(
          yamlValidationResult.error
        );
        expect(mappedError).toBeDefined();
        expect(mappedError.message).toContain('syntax');
      }
    });

    it('should handle semantic validation errors between parser and domain', () => {
      // Arrange - Syntactically valid but semantically problematic YAML
      const semanticErrorYaml = `
statements:
  s1: "Statement 1"
  s2: "Statement 2"
  s3: "Statement 3"

arguments:
  arg1:
    premises: [s1, s2]
    conclusions: [s3]
  arg2:
    premises: [s3]  # Uses conclusion from arg1
    conclusions: [s1]  # Creates circular dependency

proof:
  n1: {arg: arg1}
  n2: {n1: arg2, on: 0}  # Creates potential circular reference
`;

      // Act - Parse and validate semantics
      const yamlValidationResult = yamlValidator.validate(semanticErrorYaml);
      expect(yamlValidationResult.isOk()).toBe(true);

      if (yamlValidationResult.isOk()) {
        const parseResult = parserService.parse(semanticErrorYaml, 'semantic-test.proof');
        expect(parseResult.isOk()).toBe(true);

        if (parseResult.isOk()) {
          const proofDoc = parseResult.value;

          // Validate semantic constraints at domain level
          const validationResult =
            validationServices.validationController.validateProofDocument(proofDoc);

          // Should detect semantic issues
          expect(validationResult.isOk()).toBe(true);
          if (validationResult.isOk()) {
            const diagnostics = validationResult.value;
            expect(diagnostics.length).toBeGreaterThan(0);

            // Should have warnings about potential circular dependencies
            const circularWarnings = diagnostics.filter(d =>
              d.message.toLowerCase().includes('circular')
            );
            expect(circularWarnings.length).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  describe('Proof Tree Construction Integration', () => {
    it('should build valid tree structure from parsed proof definition', () => {
      // Arrange - Complex proof tree structure
      const complexProofYaml = `
statements:
  s1: "All humans are mortal"
  s2: "Socrates is human"
  s3: "Socrates is mortal"
  s4: "All mortals have finite lives"
  s5: "Socrates has a finite life"

arguments:
  modus_ponens_1:
    premises: [s1, s2]
    conclusions: [s3]
  modus_ponens_2:
    premises: [s4, s3]
    conclusions: [s5]

proof:
  n1: {arg: modus_ponens_1}
  n2: {n1: modus_ponens_2, on: 0}
`;

      // Act - Parse and build tree structure
      const parseResult = parserService.parse(complexProofYaml, 'complex-proof.proof');
      expect(parseResult.isOk()).toBe(true);

      if (parseResult.isOk()) {
        const proofDoc = parseResult.value;

        // Extract tree structure from proof definition
        const proofDefinition = proofDoc.getProofTrees();
        expect(proofDefinition.length).toBe(1);

        const tree = proofDefinition[0]!;
        expect(tree.nodes.size).toBe(2);

        // Verify tree structure relationships
        const n1 = tree.nodes.get('n1');
        const n2 = tree.nodes.get('n2');

        expect(n1).toBeDefined();
        expect(n2).toBeDefined();

        expect(n1!.arg).toBe('modus_ponens_1');
        expect(n2!.parent).toBe('n1');
        expect(n2!.position).toBe(0);
        expect(n2!.arg).toBe('modus_ponens_2');

        // Create domain tree structure
        const treeCreationResult = domainServices.treeStructure.createTreeFromDefinition(tree);
        expect(treeCreationResult.isOk()).toBe(true);
      }
    });

    it('should handle complex branching structures', () => {
      // Arrange - Proof with multiple branches
      const branchingYaml = `
statements:
  premise1: "P"
  premise2: "Q"
  premise3: "R"
  intermediate1: "P and Q"
  intermediate2: "Q or R"
  conclusion: "Final conclusion"

arguments:
  conjunction:
    premises: [premise1, premise2]
    conclusions: [intermediate1]
  disjunction:
    premises: [premise2, premise3]
    conclusions: [intermediate2]
  final_step:
    premises: [intermediate1, intermediate2]
    conclusions: [conclusion]

proof:
  n1: {arg: conjunction}
  n2: {arg: disjunction}
  n3: {n1: final_step, on: 0}
  n4: {n2: final_step, on: 1}
`;

      // Act - Parse and validate branching structure
      const parseResult = parserService.parse(branchingYaml, 'branching-proof.proof');
      expect(parseResult.isOk()).toBe(true);

      if (parseResult.isOk()) {
        const proofDoc = parseResult.value;
        const validationResult =
          validationServices.validationController.validateProofDocument(proofDoc);

        expect(validationResult.isOk()).toBe(true);
        if (validationResult.isOk()) {
          const diagnostics = validationResult.value;
          // Should detect that n3 and n4 both reference final_step but at different positions
          const structuralIssues = diagnostics.filter(d =>
            d.message.toLowerCase().includes('structure')
          );
          expect(structuralIssues.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Error Recovery and Incremental Parsing', () => {
    it('should provide partial parsing results with recoverable errors', () => {
      // Arrange - YAML with some valid and some invalid parts
      const partialValidYaml = `
statements:
  s1: "Valid statement 1"
  s2: "Valid statement 2"
  s3: "Valid statement 3"
  s4:   # Missing value - should be recoverable

arguments:
  valid_arg:
    premises: [s1, s2]
    conclusions: [s3]
  invalid_arg:
    premises: [s4]  # References invalid statement
    conclusions: [s3]

proof:
  n1: {arg: valid_arg}
  n2: {arg: invalid_arg}  # Should fail but allow partial processing
`;

      // Act - Parse with error recovery
      const parseResult = parserService.parse(partialValidYaml, 'partial-valid.proof');

      // Should provide partial results even with errors
      if (parseResult.isOk()) {
        const proofDoc = parseResult.value;

        // Valid statements should be preserved
        const statements = proofDoc.getStatements();
        expect(statements.get('s1')).toBe('Valid statement 1');
        expect(statements.get('s2')).toBe('Valid statement 2');
        expect(statements.get('s3')).toBe('Valid statement 3');

        // Valid arguments should be preserved
        const argumentsMapLocal = proofDoc.getArguments();
        expect(argumentsMapLocal.has('valid_arg')).toBe(true);

        // Validation should report specific issues
        const validationResult =
          validationServices.validationController.validateProofDocument(proofDoc);
        expect(validationResult.isOk()).toBe(true);

        if (validationResult.isOk()) {
          const diagnostics = validationResult.value;
          expect(diagnostics.length).toBeGreaterThan(0);

          // Should identify the specific problem with s4 and invalid_arg
          const missingValueDiagnostics = diagnostics.filter(d => {
            const message = d.message.toLowerCase();
            const hasMissing = message.includes('missing');
            const hasUndefined = message.includes('undefined');
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            return hasMissing || hasUndefined;
          });
          expect(missingValueDiagnostics.length).toBeGreaterThan(0);
        }
      }
    });

    it('should handle incremental updates to proof documents', () => {
      // Arrange - Initial valid proof
      const initialYaml = `
statements:
  s1: "Initial statement"
  s2: "Another statement"

arguments:
  initial_arg:
    premises: [s1]
    conclusions: [s2]

proof:
  n1: {arg: initial_arg}
`;

      // Parse initial document
      const initialParseResult = parserService.parse(initialYaml, 'incremental.proof');
      expect(initialParseResult.isOk()).toBe(true);

      if (initialParseResult.isOk()) {
        // Initial document parsed successfully

        // Act - Simulate incremental update (adding new statement and argument)
        const updatedYaml = `
statements:
  s1: "Initial statement"
  s2: "Another statement"
  s3: "New statement added"

arguments:
  initial_arg:
    premises: [s1]
    conclusions: [s2]
  new_arg:
    premises: [s2]
    conclusions: [s3]

proof:
  n1: {arg: initial_arg}
  n2: {n1: new_arg, on: 0}
`;

        const updatedParseResult = parserService.parse(updatedYaml, 'incremental.proof');
        expect(updatedParseResult.isOk()).toBe(true);

        if (updatedParseResult.isOk()) {
          const updatedDoc = updatedParseResult.value;

          // Verify incremental changes
          expect(updatedDoc.getStatements().size).toBe(3);
          expect(updatedDoc.getArguments().size).toBe(2);
          expect(updatedDoc.getProofTrees()[0]?.nodes.size).toBe(2);

          // Validate that the update maintains consistency
          const validationResult =
            validationServices.validationController.validateProofDocument(updatedDoc);
          expect(validationResult.isOk()).toBe(true);

          if (validationResult.isOk()) {
            const diagnostics = validationResult.value;
            // Should have no errors for valid incremental update
            const errors = diagnostics.filter(d => d.severity === 'error');
            expect(errors).toHaveLength(0);
          }
        }
      }
    });
  });

  describe('Performance and Memory Integration', () => {
    it('should handle large proof documents efficiently', () => {
      // Arrange - Generate large proof document
      const largeStatementCount = 100;
      const largeArgumentCount = 50;

      let largeYaml = 'statements:\n';
      for (let i = 1; i <= largeStatementCount; i++) {
        largeYaml += `  s${i}: "Statement ${i}"\n`;
      }

      largeYaml += '\narguments:\n';
      for (let i = 1; i <= largeArgumentCount; i++) {
        const premise1 = i;
        const premise2 = i + 1 <= largeStatementCount ? i + 1 : 1;
        const conclusion = i + 2 <= largeStatementCount ? i + 2 : 2;
        largeYaml += `  arg${i}:\n`;
        largeYaml += `    premises: [s${premise1}, s${premise2}]\n`;
        largeYaml += `    conclusions: [s${conclusion}]\n`;
      }

      largeYaml += '\nproof:\n';
      for (let i = 1; i <= Math.min(largeArgumentCount, 20); i++) {
        largeYaml += `  n${i}: {arg: arg${i}}\n`;
      }

      // Act - Measure parsing performance
      const startTime = Date.now();
      const parseResult = parserService.parse(largeYaml, 'large-proof.proof');
      const parseTime = Date.now() - startTime;

      // Assert - Should handle large document efficiently
      expect(parseResult.isOk()).toBe(true);
      expect(parseTime).toBeLessThan(5000); // Should parse within 5 seconds

      if (parseResult.isOk()) {
        const proofDoc = parseResult.value;
        expect(proofDoc.getStatements().size).toBe(largeStatementCount);
        expect(proofDoc.getArguments().size).toBe(largeArgumentCount);

        // Validation should also be efficient
        const validationStartTime = Date.now();
        const validationResult =
          validationServices.validationController.validateProofDocument(proofDoc);
        const validationTime = Date.now() - validationStartTime;

        expect(validationResult.isOk()).toBe(true);
        expect(validationTime).toBeLessThan(3000); // Should validate within 3 seconds
      }
    });
  });
});

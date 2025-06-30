import type { Result } from "../../../../domain/shared/result.js"
import { ValidationError, DomainError } from '../errors/DomainErrors';
import { ValidationResultEntity } from '../entities/ValidationResultEntity';
import { DiagnosticEntity } from '../entities/DiagnosticEntity';
import { LanguagePackageEntity } from '../entities/LanguagePackageEntity';
import { ValidationLevel } from '../value-objects/ValidationLevel';
import { ValidationMetrics } from '../value-objects/ValidationMetrics';
import { SourceLocation } from '@contexts/analysis/domain/index.ts';
import { DiagnosticSeverity } from '../value-objects/DiagnosticSeverity';
import { PerformanceTracker } from '../value-objects/PerformanceTracker';

export class LogicValidationService {
  private readonly performanceTarget = 10; // 10ms target

  async validateStatement(
    statement: string,
    location: SourceLocation,
    languagePackage: LanguagePackageEntity,
    level: ValidationLevel
  ): Promise<Result<ValidationResultEntity, DomainError>> {
    const tracker = PerformanceTracker.start();
    const documentId = `temp-${Date.now()}`;

    try {
      const diagnostics: DiagnosticEntity[] = [];

      // Syntax validation
      if (level.includesLevel(ValidationLevel.syntax())) {
        const syntaxDiagnostics = await this.validateSyntax(
          statement,
          location,
          languagePackage
        );
        diagnostics.push(...syntaxDiagnostics);
      }

      // Flow validation  
      if (level.includesLevel(ValidationLevel.flow())) {
        const flowDiagnostics = await this.validateFlow(
          statement,
          location,
          languagePackage
        );
        diagnostics.push(...flowDiagnostics);
      }

      // Semantic validation
      if (level.includesLevel(ValidationLevel.semantic())) {
        const semanticDiagnostics = await this.validateSemantics(
          statement,
          location,
          languagePackage
        );
        diagnostics.push(...semanticDiagnostics);
      }

      // Style validation
      if (level.includesLevel(ValidationLevel.style())) {
        const styleDiagnostics = await this.validateStyle(
          statement,
          location,
          languagePackage
        );
        diagnostics.push(...styleDiagnostics);
      }

      const metrics = ValidationMetrics.create(
        tracker.getElapsedMs(),
        diagnostics.length,
        statement.length,
        1
      );

      if (!metrics.success) {
        return {
          success: false,
          error: new ValidationError('Failed to create validation metrics')
        };
      }

      // Create result based on validation outcome
      const hasErrors = diagnostics.some(d => d.getSeverity().isError());

      if (hasErrors) {
        return ValidationResultEntity.createFailedValidation(
          level,
          diagnostics,
          documentId,
          languagePackage.getId().getValue(),
          metrics.data
        );
      } else {
        return {
          success: true,
          data: ValidationResultEntity.createSuccessfulValidation(
            level,
            documentId,
            languagePackage.getId().getValue(),
            metrics.data
          )
        };
      }
    } catch (error) {
      return {
        success: false,
        error: new ValidationError('Validation failed with unexpected error', error instanceof Error ? error : undefined)
      };
    } finally {
      tracker.stop();
    }
  }

  async validateInference(
    premises: string[],
    conclusions: string[],
    languagePackage: LanguagePackageEntity,
    level: ValidationLevel
  ): Promise<Result<ValidationResultEntity, DomainError>> {
    const tracker = PerformanceTracker.start();
    const documentId = `inference-${Date.now()}`;

    try {
      const diagnostics: DiagnosticEntity[] = [];

      // Find matching inference rules
      const matchingRules = languagePackage.findMatchingRules(premises, conclusions);

      if (matchingRules.length === 0) {
        const errorResult = DiagnosticEntity.createSemanticError(
          'No valid inference rule found for this argument structure',
          SourceLocation.createDefault(),
          languagePackage.getId().getValue(),
          ['Try breaking down the argument into simpler steps']
        );

        if (!errorResult.success) {
          return {
            success: false,
            error: new ValidationError('Failed to create diagnostic')
          };
        }

        diagnostics.push(errorResult.data);
      } else {
        // Validate with the best matching rule
        const bestRule = this.selectBestRule(matchingRules, premises, conclusions);
        const ruleValidation = await this.validateWithRule(
          premises,
          conclusions,
          bestRule,
          languagePackage,
          level
        );

        if (!ruleValidation.success) {
          return ruleValidation;
        }

        diagnostics.push(...ruleValidation.data);
      }

      const metrics = ValidationMetrics.create(
        tracker.getElapsedMs(),
        diagnostics.length,
        premises.join(' ').length + conclusions.join(' ').length,
        premises.length + conclusions.length
      );

      if (!metrics.success) {
        return {
          success: false,
          error: new ValidationError('Failed to create validation metrics')
        };
      }

      const hasErrors = diagnostics.some(d => d.getSeverity().isError());

      if (hasErrors) {
        return ValidationResultEntity.createFailedValidation(
          level,
          diagnostics,
          documentId,
          languagePackage.getId().getValue(),
          metrics.data
        );
      } else {
        return {
          success: true,
          data: ValidationResultEntity.createSuccessfulValidation(
            level,
            documentId,
            languagePackage.getId().getValue(),
            metrics.data
          )
        };
      }
    } catch (error) {
      return {
        success: false,
        error: new ValidationError('Inference validation failed', error instanceof Error ? error : undefined)
      };
    } finally {
      tracker.stop();
    }
  }

  async validateProofStructure(
    statements: string[],
    connections: Array<{ from: number; to: number }>,
    languagePackage: LanguagePackageEntity
  ): Promise<Result<ValidationResultEntity, DomainError>> {
    const tracker = PerformanceTracker.start();
    const documentId = `proof-${Date.now()}`;

    try {
      const diagnostics: DiagnosticEntity[] = [];

      // Validate structural integrity
      const structuralDiagnostics = await this.validateStructuralIntegrity(
        statements,
        connections,
        languagePackage
      );
      diagnostics.push(...structuralDiagnostics);

      // Validate logical flow
      const flowDiagnostics = await this.validateLogicalFlow(
        statements,
        connections,
        languagePackage
      );
      diagnostics.push(...flowDiagnostics);

      // Check for cycles
      const cycleDiagnostics = this.validateNoCycles(connections, languagePackage.getId().getValue());
      diagnostics.push(...cycleDiagnostics);

      const metrics = ValidationMetrics.create(
        tracker.getElapsedMs(),
        diagnostics.length,
        statements.join(' ').length,
        statements.length
      );

      if (!metrics.success) {
        return {
          success: false,
          error: new ValidationError('Failed to create validation metrics')
        };
      }

      const hasErrors = diagnostics.some(d => d.getSeverity().isError());

      if (hasErrors) {
        return ValidationResultEntity.createFailedValidation(
          ValidationLevel.semantic(),
          diagnostics,
          documentId,
          languagePackage.getId().getValue(),
          metrics.data
        );
      } else {
        return {
          success: true,
          data: ValidationResultEntity.createSuccessfulValidation(
            ValidationLevel.semantic(),
            documentId,
            languagePackage.getId().getValue(),
            metrics.data
          )
        };
      }
    } catch (error) {
      return {
        success: false,
        error: new ValidationError('Proof structure validation failed', error instanceof Error ? error : undefined)
      };
    } finally {
      tracker.stop();
    }
  }

  private async validateSyntax(
    statement: string,
    location: SourceLocation,
    languagePackage: LanguagePackageEntity
  ): Promise<DiagnosticEntity[]> {
    const diagnostics: DiagnosticEntity[] = [];

    // Check for empty statements
    if (!statement || statement.trim().length === 0) {
      const errorResult = DiagnosticEntity.createSyntaxError(
        'Statement cannot be empty',
        location,
        languagePackage.getId().getValue()
      );
      if (errorResult.success) {
        diagnostics.push(errorResult.data);
      }
      return diagnostics;
    }

    // Check for balanced parentheses
    if (!this.hasBalancedParentheses(statement)) {
      const errorResult = DiagnosticEntity.createSyntaxError(
        'Unbalanced parentheses in statement',
        location,
        languagePackage.getId().getValue(),
        ['Add missing closing parenthesis', 'Remove extra opening parenthesis']
      );
      if (errorResult.success) {
        diagnostics.push(errorResult.data);
      }
    }

    // Check for valid symbols
    const invalidSymbols = this.findInvalidSymbols(statement, languagePackage);
    if (invalidSymbols.length > 0) {
      const errorResult = DiagnosticEntity.createSyntaxError(
        `Invalid symbols found: ${invalidSymbols.join(', ')}`,
        location,
        languagePackage.getId().getValue(),
        [`Use valid symbols from ${languagePackage.getName().getValue()}`]
      );
      if (errorResult.success) {
        diagnostics.push(errorResult.data);
      }
    }

    return diagnostics;
  }

  private async validateFlow(
    statement: string,
    location: SourceLocation,
    languagePackage: LanguagePackageEntity
  ): Promise<DiagnosticEntity[]> {
    const diagnostics: DiagnosticEntity[] = [];

    // Check for proper logical connectives
    const hasLogicalStructure = this.hasProperLogicalStructure(statement, languagePackage);
    if (!hasLogicalStructure) {
      const warningResult = DiagnosticEntity.create(
        DiagnosticSeverity.warning(),
        'Statement lacks clear logical structure',
        'flow-structure',
        location,
        languagePackage.getId().getValue(),
        ['Add logical connectives', 'Clarify the logical relationship'],
        ['flow']
      );
      if (warningResult.success) {
        diagnostics.push(warningResult.data);
      }
    }

    return diagnostics;
  }

  private async validateSemantics(
    statement: string,
    location: SourceLocation,
    languagePackage: LanguagePackageEntity
  ): Promise<DiagnosticEntity[]> {
    const diagnostics: DiagnosticEntity[] = [];

    // Check for modal logic consistency (if package supports modal logic)
    if (languagePackage.supportsModalLogic()) {
      const modalDiagnostics = this.validateModalSemantics(statement, location, languagePackage);
      diagnostics.push(...modalDiagnostics);
    }

    // Check for tautologies or contradictions
    const logicalProperties = this.analyzeLogicalProperties(statement, languagePackage);
    if (logicalProperties.isTautology) {
      const infoResult = DiagnosticEntity.createEducationalInfo(
        'This statement is a tautology (always true)',
        location,
        languagePackage.getId().getValue(),
        ['Consider if this is the intended meaning']
      );
      if (infoResult.success) {
        diagnostics.push(infoResult.data);
      }
    } else if (logicalProperties.isContradiction) {
      const errorResult = DiagnosticEntity.createSemanticError(
        'This statement is a contradiction (always false)',
        location,
        languagePackage.getId().getValue(),
        ['Review the logical structure', 'Check for conflicting conditions']
      );
      if (errorResult.success) {
        diagnostics.push(errorResult.data);
      }
    }

    return diagnostics;
  }

  private async validateStyle(
    statement: string,
    location: SourceLocation,
    languagePackage: LanguagePackageEntity
  ): Promise<DiagnosticEntity[]> {
    const diagnostics: DiagnosticEntity[] = [];

    // Check for consistent symbol usage
    const inconsistentSymbols = this.findInconsistentSymbolUsage(statement, languagePackage);
    if (inconsistentSymbols.length > 0) {
      const warningResult = DiagnosticEntity.createStyleWarning(
        `Inconsistent symbol usage: ${inconsistentSymbols.join(', ')}`,
        location,
        languagePackage.getId().getValue(),
        ['Use consistent symbols throughout']
      );
      if (warningResult.success) {
        diagnostics.push(warningResult.data);
      }
    }

    // Check statement length
    if (statement.length > 200) {
      const warningResult = DiagnosticEntity.createStyleWarning(
        'Statement is very long, consider breaking it down',
        location,
        languagePackage.getId().getValue(),
        ['Split into multiple statements', 'Use clearer structure']
      );
      if (warningResult.success) {
        diagnostics.push(warningResult.data);
      }
    }

    return diagnostics;
  }

  private selectBestRule(rules: any[], premises: string[], conclusions: string[]): any {
    let bestRule = rules[0];
    let bestScore = 0;

    for (const rule of rules) {
      const confidence = rule.getPatternConfidence(premises, conclusions);
      if (confidence > bestScore) {
        bestScore = confidence;
        bestRule = rule;
      }
    }

    return bestRule;
  }

  private async validateWithRule(
    premises: string[],
    conclusions: string[],
    rule: any,
    languagePackage: LanguagePackageEntity,
    level: ValidationLevel
  ): Promise<Result<DiagnosticEntity[], DomainError>> {
    const diagnostics: DiagnosticEntity[] = [];

    // This is a simplified validation - in a real implementation,
    // this would involve more sophisticated logical reasoning
    const confidence = rule.getPatternConfidence(premises, conclusions);
    
    if (confidence < 0.8) {
      const warningResult = DiagnosticEntity.create(
        DiagnosticSeverity.warning(),
        `Low confidence match with rule ${rule.getName().getValue()}`,
        'rule-confidence',
        SourceLocation.createDefault(),
        languagePackage.getId().getValue(),
        ['Review the inference steps', 'Check premise-conclusion relationship'],
        ['semantic']
      );
      if (warningResult.success) {
        diagnostics.push(warningResult.data);
      }
    }

    return { success: true, data: diagnostics };
  }

  private async validateStructuralIntegrity(
    statements: string[],
    connections: Array<{ from: number; to: number }>,
    languagePackage: LanguagePackageEntity
  ): Promise<DiagnosticEntity[]> {
    const diagnostics: DiagnosticEntity[] = [];

    // Check for out-of-bounds connections
    for (const connection of connections) {
      if (connection.from < 0 || connection.from >= statements.length ||
          connection.to < 0 || connection.to >= statements.length) {
        const errorResult = DiagnosticEntity.createSemanticError(
          `Invalid connection: statement index out of bounds`,
          SourceLocation.createDefault(),
          languagePackage.getId().getValue()
        );
        if (errorResult.success) {
          diagnostics.push(errorResult.data);
        }
      }
    }

    // Check for orphaned statements
    const connectedStatements = new Set<number>();
    for (const connection of connections) {
      connectedStatements.add(connection.from);
      connectedStatements.add(connection.to);
    }

    for (let i = 0; i < statements.length; i++) {
      if (!connectedStatements.has(i) && statements.length > 1) {
        const warningResult = DiagnosticEntity.create(
          DiagnosticSeverity.warning(),
          `Statement ${i + 1} is not connected to the proof structure`,
          'orphan-statement',
          SourceLocation.createDefault(),
          languagePackage.getId().getValue(),
          ['Connect this statement to the proof', 'Remove if not needed'],
          ['structure']
        );
        if (warningResult.success) {
          diagnostics.push(warningResult.data);
        }
      }
    }

    return diagnostics;
  }

  private async validateLogicalFlow(
    statements: string[],
    connections: Array<{ from: number; to: number }>,
    languagePackage: LanguagePackageEntity
  ): Promise<DiagnosticEntity[]> {
    const diagnostics: DiagnosticEntity[] = [];

    // For each connection, validate that the logical flow makes sense
    for (const connection of connections) {
      const fromStatement = statements[connection.from];
      const toStatement = statements[connection.to];

      // This is simplified - in practice, this would involve
      // sophisticated logical analysis
      if (!this.canLogicallyFollow(fromStatement ?? '', toStatement ?? '', languagePackage)) {
        const errorResult = DiagnosticEntity.createSemanticError(
          `Statement ${connection.to + 1} does not logically follow from statement ${connection.from + 1}`,
          SourceLocation.createDefault(),
          languagePackage.getId().getValue(),
          ['Add intermediate steps', 'Review the logical connection']
        );
        if (errorResult.success) {
          diagnostics.push(errorResult.data);
        }
      }
    }

    return diagnostics;
  }

  private validateNoCycles(
    connections: Array<{ from: number; to: number }>,
    languagePackageId: string
  ): DiagnosticEntity[] {
    const diagnostics: DiagnosticEntity[] = [];

    // Simple cycle detection using DFS
    const graph = new Map<number, number[]>();
    for (const connection of connections) {
      if (!graph.has(connection.from)) {
        graph.set(connection.from, []);
      }
      graph.get(connection.from)!.push(connection.to);
    }

    const visited = new Set<number>();
    const recursionStack = new Set<number>();

    const hasCycleDFS = (node: number): boolean => {
      visited.add(node);
      recursionStack.add(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycleDFS(neighbor)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(node);
      return false;
    };

    for (const [node] of graph) {
      if (!visited.has(node)) {
        if (hasCycleDFS(node)) {
          const errorResult = DiagnosticEntity.createSemanticError(
            'Circular dependency detected in proof structure',
            SourceLocation.createDefault(),
            languagePackageId,
            ['Remove circular connections', 'Restructure the proof']
          );
          if (errorResult.success) {
            diagnostics.push(errorResult.data);
          }
          break;
        }
      }
    }

    return diagnostics;
  }

  // Helper methods for validation logic
  private hasBalancedParentheses(statement: string): boolean {
    let count = 0;
    for (const char of statement) {
      if (char === '(') count++;
      else if (char === ')') count--;
      if (count < 0) return false;
    }
    return count === 0;
  }

  private findInvalidSymbols(statement: string, languagePackage: LanguagePackageEntity): string[] {
    const validSymbols = new Set(languagePackage.getSymbols().values());
    const symbols = statement.match(/[^\w\s()]/g) || [];
    return symbols.filter(symbol => !validSymbols.has(symbol));
  }

  private hasProperLogicalStructure(statement: string, languagePackage: LanguagePackageEntity): boolean {
    const logicalConnectives = Array.from(languagePackage.getSymbols().values());
    return logicalConnectives.some(connective => statement.includes(connective));
  }

  private validateModalSemantics(
    statement: string,
    location: SourceLocation,
    languagePackage: LanguagePackageEntity
  ): DiagnosticEntity[] {
    const diagnostics: DiagnosticEntity[] = [];

    // Check for proper modal operator usage
    if (statement.includes('□') || statement.includes('◇')) {
      // Simplified modal validation
      const hasProperModalStructure = /[□◇]\s*\([^)]+\)/.test(statement) || 
                                    /[□◇]\s*[A-Z]/.test(statement);
      
      if (!hasProperModalStructure) {
        const warningResult = DiagnosticEntity.create(
          DiagnosticSeverity.warning(),
          'Modal operators should be followed by proper formulas',
          'modal-structure',
          location,
          languagePackage.getId().getValue(),
          ['Use proper modal operator syntax'],
          ['modal', 'semantic']
        );
        if (warningResult.success) {
          diagnostics.push(warningResult.data);
        }
      }
    }

    return diagnostics;
  }

  private analyzeLogicalProperties(statement: string, languagePackage: LanguagePackageEntity): {
    isTautology: boolean;
    isContradiction: boolean;
  } {
    // Simplified analysis - in practice this would use a theorem prover
    const isTautology = /\(.*\)\s*∨\s*¬\(.*\)/.test(statement) || // P ∨ ¬P
                       statement.includes('⊤') ||
                       /.*→.*/.test(statement) && statement.includes(statement.split('→')[0] ?? '');
    
    const isContradiction = /\(.*\)\s*∧\s*¬\(.*\)/.test(statement) || // P ∧ ¬P
                           statement.includes('⊥');

    return { isTautology, isContradiction };
  }

  private findInconsistentSymbolUsage(statement: string, languagePackage: LanguagePackageEntity): string[] {
    // Simplified check for style consistency
    const inconsistent: string[] = [];
    
    // Check for mixed implication symbols
    if (statement.includes('→') && statement.includes('⊃')) {
      inconsistent.push('mixed implication symbols');
    }
    
    // Check for mixed conjunction symbols
    if (statement.includes('∧') && statement.includes('&')) {
      inconsistent.push('mixed conjunction symbols');
    }

    return inconsistent;
  }

  private canLogicallyFollow(fromStatement: string, toStatement: string, languagePackage: LanguagePackageEntity): boolean {
    // Simplified logical flow validation
    // In practice, this would involve sophisticated logical analysis
    
    // Basic checks
    if (fromStatement === toStatement) return true;
    
    // Check if it's a simple modus ponens pattern
    if (fromStatement.includes('→') && toStatement) {
      const parts = fromStatement.split('→');
      if (parts.length === 2 && parts[0] && parts[1]) {
        const antecedent = parts[0].trim();
        const consequent = parts[1].trim();
        return toStatement.includes(consequent);
      }
    }

    return true; // Default to allowing the connection
  }
}
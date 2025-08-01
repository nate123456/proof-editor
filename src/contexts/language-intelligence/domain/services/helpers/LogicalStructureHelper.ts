import { err, ok, type Result } from 'neverthrow';
import { injectable } from 'tsyringe';

import type { LanguagePackage } from '../../entities/LanguagePackage';
import { PatternRecognitionError } from '../../errors/DomainErrors';
import type {
  DetailedLogicalStructureAnalysis,
  RecognizedPattern,
  RecognizedPatternResult,
} from '../PatternRecognitionService';

@injectable()
export class LogicalStructureHelper {
  detectLogicalStructure(
    statement: string,
    languagePackage: LanguagePackage,
  ): Result<DetailedLogicalStructureAnalysis, PatternRecognitionError> {
    try {
      const mainOperator = this.identifyMainConnective(statement);
      const subformulas = this.extractSubformulas(statement);
      const atomicPropositions = this.extractAtomicPropositions(statement);
      const operators = this.extractLogicalOperators(statement, languagePackage);

      // Determine if atomic or compound
      const isAtomic = mainOperator === null;
      const isCompound = !isAtomic;

      // For atomic formulas, subformulas should be empty
      const finalSubformulas = isAtomic ? [] : subformulas;

      // Check for nesting
      const parenthesesDepth = this.calculateParenthesesDepth(statement);
      const hasMultipleOperators = operators.length > 1;
      const hasParentheses = statement.includes('(') && statement.includes(')');
      const isNested = parenthesesDepth > 0 || hasParentheses || hasMultipleOperators;

      // Calculate logical depth
      const logicalDepth =
        hasParentheses && hasMultipleOperators ? parenthesesDepth + 1 : parenthesesDepth;

      // Extract quantifiers and variables
      const quantifiers = this.extractQuantifiers(statement);
      const variables = this.extractVariables(statement);
      const hasQuantifiers = quantifiers.length > 0;

      // Extract modal operators
      const modalOperators = this.extractModalOperators(statement);
      const hasModalOperators = modalOperators.length > 0;

      const structure: DetailedLogicalStructureAnalysis = {
        mainOperator,
        subformulas: finalSubformulas,
        complexity: this.calculateStatementComplexity(statement),
        operators,
        isWellFormed: this.checkWellFormedness(statement, languagePackage),
        parenthesesDepth,
        atomicPropositions,
        isAtomic,
        isCompound,
        isNested,
        depth: logicalDepth,
        hasQuantifiers,
        quantifiers,
        variables,
        hasModalOperators,
        modalOperators,
      };

      return ok(structure);
    } catch (error) {
      return err(
        new PatternRecognitionError(
          'Failed to detect logical structure',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  recognizePatterns(
    statements: string[],
    languagePackage: LanguagePackage,
  ): Result<RecognizedPatternResult, PatternRecognitionError> {
    try {
      // Recognize logical patterns in statements
      const logicalPatterns = this.recognizeLogicalPatterns(statements, languagePackage);

      // Recognize structural patterns
      const connections = this.inferConnectionsFromStatements(statements);
      const structuralPatterns = this.recognizeStructuralPatterns(statements, connections);

      // Custom patterns
      const customPatterns = this.recognizeCustomPatterns(statements, languagePackage);

      // Calculate overall complexity
      const overallComplexity = this.calculateOverallComplexity(statements);

      return ok({
        logicalPatterns,
        structuralPatterns,
        customPatterns,
        overallComplexity,
      });
    } catch (error) {
      return err(
        new PatternRecognitionError(
          'Failed to recognize patterns',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  private identifyMainConnective(statement: string): string | null {
    // Find the main connective (the one with lowest precedence at the top level)
    const connectives = ['↔', '→', '∨', '∧'];
    let depth = 0;
    let mainConnective = null;
    let minDepth = Number.POSITIVE_INFINITY;

    for (let i = 0; i < statement.length; i++) {
      const char = statement[i];
      if (char === '(') {
        depth++;
      } else if (char === ')') {
        depth--;
      } else if (char !== undefined && connectives.includes(char) && depth < minDepth) {
        minDepth = depth;
        mainConnective = char;
      }
    }

    return mainConnective;
  }

  private extractSubformulas(statement: string): string[] {
    const subformulas: string[] = [];
    let current = '';
    let depth = 0;
    let startDepth = 0;

    for (let i = 0; i < statement.length; i++) {
      const char = statement[i];
      if (!char) continue;

      if (char === '(') {
        if (depth === 0) {
          // Starting a new subformula
          if (current.trim()) {
            subformulas.push(current.trim());
            current = '';
          }
          startDepth = 1;
        }
        depth++;
        current += char;
      } else if (char === ')') {
        depth--;
        current += char;
        if (depth === 0 && startDepth > 0) {
          // Completed a parenthesized subformula
          subformulas.push(current.trim());
          current = '';
          startDepth = 0;
        }
      } else if (depth === 0 && /[∧∨→↔]/.test(char)) {
        // Top-level operator
        if (current.trim()) {
          subformulas.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      subformulas.push(current.trim());
    }

    return subformulas;
  }

  private extractAtomicPropositions(statement: string): string[] {
    // Extract single capital letters that represent atomic propositions
    const matches = statement.match(/[A-Z]/g) ?? [];
    return Array.from(new Set(matches));
  }

  private extractLogicalOperators(statement: string, languagePackage: LanguagePackage): string[] {
    const operators: string[] = [];

    if (
      'getSupportedConnectives' in languagePackage &&
      typeof languagePackage.getSupportedConnectives === 'function'
    ) {
      const supportedOps = (languagePackage.getSupportedConnectives as () => unknown[])();
      if (Array.isArray(supportedOps)) {
        for (const op of supportedOps) {
          if (statement.includes(String(op))) {
            operators.push(String(op));
          }
        }
      }
    } else {
      // Fallback to default operators
      const defaultOps = ['∧', '∨', '→', '↔', '¬'];
      for (const op of defaultOps) {
        if (statement.includes(op)) {
          operators.push(op);
        }
      }
    }

    return operators;
  }

  private calculateParenthesesDepth(statement: string): number {
    let depth = 0;
    let maxDepth = 0;

    for (const char of statement) {
      if (char === '(') {
        depth++;
        maxDepth = Math.max(maxDepth, depth);
      } else if (char === ')') {
        depth--;
      }
    }

    return maxDepth;
  }

  private calculateStatementComplexity(statement: string): number {
    let complexity = 0;

    // Count logical operators
    complexity += (statement.match(/[∧∨→↔¬]/g) ?? []).length;

    // Count quantifiers (higher weight)
    complexity += (statement.match(/[∀∃]/g) ?? []).length * 2;

    // Count modal operators
    complexity += (statement.match(/[□◇]/g) ?? []).length * 1.5;

    // Count parentheses depth
    complexity += this.calculateParenthesesDepth(statement) * 0.5;

    // Consider length
    complexity += statement.length * 0.05;

    return Math.round(complexity);
  }

  private checkWellFormedness(statement: string, _languagePackage: LanguagePackage): boolean {
    // Basic well-formedness checks
    const openParens = (statement.match(/\(/g) ?? []).length;
    const closeParens = (statement.match(/\)/g) ?? []).length;

    if (openParens !== closeParens) {
      return false;
    }

    // Check operator placement
    if (!this.checkOperatorPlacement(statement)) {
      return false;
    }

    // Language-specific checks would go here
    // For now, just return the basic checks

    return true;
  }

  private checkOperatorPlacement(statement: string): boolean {
    // Check that binary operators have operands on both sides
    const binaryOps = ['∧', '∨', '→', '↔'];

    for (const op of binaryOps) {
      const index = statement.indexOf(op);
      if (index !== -1) {
        // Check left side
        if (index === 0 || statement.substring(0, index).trim() === '') {
          return false;
        }
        // Check right side
        if (index === statement.length - 1 || statement.substring(index + 1).trim() === '') {
          return false;
        }
      }
    }

    // Check that negation is followed by something
    const negIndex = statement.indexOf('¬');
    if (negIndex !== -1 && negIndex === statement.length - 1) {
      return false;
    }

    return true;
  }

  private extractQuantifiers(statement: string): string[] {
    const quantifierMatches = statement.match(/[∀∃]/g);
    return quantifierMatches ? Array.from(new Set(quantifierMatches)) : [];
  }

  private extractVariables(statement: string): string[] {
    // Extract variables from quantified statements
    const variableMatches = statement.match(/[∀∃]([a-z])/g);
    if (!variableMatches) return [];

    return Array.from(new Set(variableMatches.map((match) => match.charAt(1))));
  }

  private extractModalOperators(statement: string): string[] {
    const modalMatches = statement.match(/[□◇]/g);
    return modalMatches ? Array.from(new Set(modalMatches)) : [];
  }

  private recognizeLogicalPatterns(
    statements: string[],
    _languagePackage: LanguagePackage,
  ): RecognizedPattern[] {
    const patterns: RecognizedPattern[] = [];

    // Common logical patterns
    if (statements.some((s) => s.includes('→'))) {
      patterns.push({
        type: 'logical-pattern',
        name: 'implication',
        description: 'Implication pattern detected',
        confidence: 0.8,
        instances: this.findPatternInstances(statements, '→'),
        properties: { operator: '→' },
      });
    }

    if (statements.some((s) => s.includes('∧'))) {
      patterns.push({
        type: 'logical-pattern',
        name: 'conjunction',
        description: 'Conjunction pattern detected',
        confidence: 0.8,
        instances: this.findPatternInstances(statements, '∧'),
        properties: { operator: '∧' },
      });
    }

    if (statements.some((s) => s.includes('∨'))) {
      patterns.push({
        type: 'logical-pattern',
        name: 'disjunction',
        description: 'Disjunction pattern detected',
        confidence: 0.8,
        instances: this.findPatternInstances(statements, '∨'),
        properties: { operator: '∨' },
      });
    }

    // Quantifier patterns
    if (statements.some((s) => /[∀∃]/.test(s))) {
      patterns.push({
        type: 'logical-pattern',
        name: 'quantified',
        description: 'Quantified statement pattern detected',
        confidence: 0.85,
        instances: this.findQuantifierInstances(statements),
        properties: { hasQuantifiers: true },
      });
    }

    // Modal patterns
    if (statements.some((s) => /[□◇]/.test(s))) {
      patterns.push({
        type: 'logical-pattern',
        name: 'modal',
        description: 'Modal logic pattern detected',
        confidence: 0.85,
        instances: this.findModalInstances(statements),
        properties: { hasModalOperators: true },
      });
    }

    return patterns;
  }

  private recognizeStructuralPatterns(
    statements: string[],
    connections: { from: number; to: number }[],
  ): RecognizedPattern[] {
    const patterns: RecognizedPattern[] = [];

    // Check for sequential pattern
    if (this.isSequentialPattern(connections)) {
      patterns.push({
        type: 'structural-pattern',
        name: 'sequential',
        description: 'Sequential reasoning pattern',
        confidence: 0.9,
        instances: [{ startIndex: 0, endIndex: statements.length - 1 }],
        properties: { structure: 'sequential' },
      });
    }

    // Check for branching pattern
    if (this.hasBranchingPattern(connections)) {
      patterns.push({
        type: 'structural-pattern',
        name: 'branching',
        description: 'Branching argument structure',
        confidence: 0.85,
        instances: this.findBranchingInstances(connections),
        properties: { structure: 'branching' },
      });
    }

    return patterns;
  }

  private recognizeCustomPatterns(
    _statements: string[],
    _languagePackage: LanguagePackage,
  ): RecognizedPattern[] {
    const patterns: RecognizedPattern[] = [];

    // Check for language-specific patterns
    // This would be extended with actual language package pattern support

    return patterns;
  }

  private calculateOverallComplexity(statements: string[]): number {
    const complexities = statements.map((s) => this.calculateStatementComplexity(s));
    return complexities.reduce((sum, c) => sum + c, 0);
  }

  private inferConnectionsFromStatements(statements: string[]): { from: number; to: number }[] {
    const connections: { from: number; to: number }[] = [];

    // Simple heuristic: if statement i+1 contains elements from statement i, assume connection
    for (let i = 0; i < statements.length - 1; i++) {
      const currentStmt = statements[i];
      const nextStmt = statements[i + 1];
      if (currentStmt && nextStmt && this.hasLogicalConnection(currentStmt, nextStmt)) {
        connections.push({ from: i, to: i + 1 });
      }
    }

    return connections;
  }

  private hasLogicalConnection(statement1: string, statement2: string): boolean {
    // Check for shared atomic propositions
    const props1 = this.extractAtomicPropositions(statement1);
    const props2 = this.extractAtomicPropositions(statement2);

    return props1.some((prop) => props2.includes(prop));
  }

  // Helper methods for pattern detection
  private findPatternInstances(
    statements: string[],
    operator: string,
  ): { startIndex: number; endIndex: number }[] {
    const instances: { startIndex: number; endIndex: number }[] = [];

    for (let i = 0; i < statements.length; i++) {
      if (statements[i]?.includes(operator)) {
        instances.push({ startIndex: i, endIndex: i });
      }
    }

    return instances;
  }

  private findQuantifierInstances(
    statements: string[],
  ): { startIndex: number; endIndex: number }[] {
    const instances: { startIndex: number; endIndex: number }[] = [];

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt && /[∀∃]/.test(stmt)) {
        instances.push({ startIndex: i, endIndex: i });
      }
    }

    return instances;
  }

  private findModalInstances(statements: string[]): { startIndex: number; endIndex: number }[] {
    const instances: { startIndex: number; endIndex: number }[] = [];

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt && /[□◇]/.test(stmt)) {
        instances.push({ startIndex: i, endIndex: i });
      }
    }

    return instances;
  }

  private isSequentialPattern(connections: { from: number; to: number }[]): boolean {
    // Check if connections form a simple sequence
    for (let i = 0; i < connections.length - 1; i++) {
      const current = connections[i];
      const next = connections[i + 1];
      if (!current || !next || current.to !== next.from) {
        return false;
      }
    }
    return connections.length > 0;
  }

  private hasBranchingPattern(connections: { from: number; to: number }[]): boolean {
    // Check if any node has multiple outgoing connections
    const outgoingCount = new Map<number, number>();

    for (const conn of connections) {
      outgoingCount.set(conn.from, (outgoingCount.get(conn.from) ?? 0) + 1);
    }

    return Array.from(outgoingCount.values()).some((count) => count > 1);
  }

  private findBranchingInstances(
    connections: { from: number; to: number }[],
  ): { startIndex: number; endIndex: number }[] {
    const instances: { startIndex: number; endIndex: number }[] = [];
    const branchPoints = new Map<number, number[]>();

    for (const conn of connections) {
      if (!branchPoints.has(conn.from)) {
        branchPoints.set(conn.from, []);
      }
      branchPoints.get(conn.from)?.push(conn.to);
    }

    for (const [from, tos] of branchPoints) {
      if (tos.length > 1) {
        instances.push({
          startIndex: from,
          endIndex: Math.max(...tos),
        });
      }
    }

    return instances;
  }

  private matchesCustomPattern(statements: string[], pattern: unknown): boolean {
    // Simplified custom pattern matching
    if (typeof pattern === 'object' && pattern !== null && 'matcher' in pattern) {
      const matcher = (pattern as { matcher?: (statements: string[]) => boolean }).matcher;
      return matcher ? matcher(statements) : false;
    }
    return false;
  }

  private findCustomPatternInstances(
    statements: string[],
    pattern: unknown,
  ): { startIndex: number; endIndex: number }[] {
    // Simplified custom pattern instance finding
    if (typeof pattern === 'object' && pattern !== null && 'findInstances' in pattern) {
      const findInstances = (
        pattern as {
          findInstances?: (statements: string[]) => { startIndex: number; endIndex: number }[];
        }
      ).findInstances;
      return findInstances ? findInstances(statements) : [];
    }
    return [];
  }
}

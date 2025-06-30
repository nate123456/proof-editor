import { Result } from '../shared/types/Result';
import { PatternRecognitionError } from '../errors/DomainErrors';
import { LanguagePackageEntity } from '../entities/LanguagePackageEntity';
import { ValidationResultEntity } from '../entities/ValidationResultEntity';
import { InferenceRuleEntity } from '../entities/InferenceRuleEntity';
import { PerformanceTracker } from '../value-objects/PerformanceTracker';

export class PatternRecognitionService {
  private readonly patternCache = new Map<string, RecognizedPattern[]>();
  private readonly maxCacheSize = 1000;
  private readonly confidenceThreshold = 0.7;

  async recognizeProofPatterns(
    statements: string[],
    connections: Array<{ from: number; to: number }>,
    languagePackage: LanguagePackageEntity
  ): Promise<Result<ProofPatternAnalysis, PatternRecognitionError>> {
    const tracker = PerformanceTracker.start();

    try {
      const patterns: RecognizedPattern[] = [];
      
      // Analyze structural patterns
      const structuralPatterns = await this.recognizeStructuralPatterns(statements, connections);
      patterns.push(...structuralPatterns);

      // Analyze logical patterns
      const logicalPatterns = await this.recognizeLogicalPatterns(statements, languagePackage);
      patterns.push(...logicalPatterns);

      // Analyze inference patterns
      const inferencePatterns = await this.recognizeInferencePatterns(statements, connections, languagePackage);
      patterns.push(...inferencePatterns);

      // Filter by confidence threshold
      const highConfidencePatterns = patterns.filter(p => p.confidence >= this.confidenceThreshold);

      // Generate insights
      const insights = this.generatePatternInsights(highConfidencePatterns, languagePackage);

      tracker.stop();

      return {
        success: true,
        data: {
          recognizedPatterns: highConfidencePatterns,
          structuralFeatures: this.extractStructuralFeatures(statements, connections),
          logicalFeatures: this.extractLogicalFeatures(statements, languagePackage),
          patternInsights: insights,
          confidence: this.calculateOverallConfidence(highConfidencePatterns),
          performance: tracker.getPerformanceReport()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: new PatternRecognitionError('Failed to recognize proof patterns', error)
      };
    } finally {
      tracker.stop();
    }
  }

  async recognizeArgumentStructure(
    premises: string[],
    conclusions: string[],
    languagePackage: LanguagePackageEntity
  ): Promise<Result<ArgumentStructureAnalysis, PatternRecognitionError>> {
    try {
      const structure = this.analyzeArgumentStructure(premises, conclusions);
      const patterns = await this.matchInferenceRules(premises, conclusions, languagePackage);
      const complexity = this.calculateArgumentComplexity(premises, conclusions);

      return {
        success: true,
        data: {
          argumentType: structure.type,
          inferenceRules: patterns.matchingRules,
          complexity,
          validity: patterns.isValid,
          soundness: patterns.iSound,
          logicalFeatures: this.extractArgumentFeatures(premises, conclusions),
          suggestions: this.generateStructureImprovement(structure, patterns)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: new PatternRecognitionError('Failed to recognize argument structure', error)
      };
    }
  }

  async detectCommonMistakes(
    validationResults: ValidationResultEntity[],
    languagePackage: LanguagePackageEntity
  ): Promise<Result<MistakeAnalysis, PatternRecognitionError>> {
    try {
      const mistakes: CommonMistake[] = [];
      const patterns = this.analyzeErrorPatterns(validationResults);

      // Detect circular reasoning
      const circularReasoning = this.detectCircularReasoning(validationResults);
      if (circularReasoning.detected) {
        mistakes.push({
          type: 'circular-reasoning',
          description: 'Circular reasoning detected in proof structure',
          confidence: circularReasoning.confidence,
          instances: circularReasoning.instances,
          suggestion: 'Ensure conclusions do not depend on themselves'
        });
      }

      // Detect invalid inferences
      const invalidInferences = this.detectInvalidInferences(validationResults, languagePackage);
      mistakes.push(...invalidInferences);

      // Detect missing premises
      const missingPremises = this.detectMissingPremises(validationResults);
      mistakes.push(...missingPremises);

      // Detect modal logic errors
      if (languagePackage.supportsModalLogic()) {
        const modalErrors = this.detectModalLogicErrors(validationResults);
        mistakes.push(...modalErrors);
      }

      return {
        success: true,
        data: {
          commonMistakes: mistakes,
          errorFrequency: this.calculateErrorFrequency(patterns),
          severityDistribution: this.analyzeSeverityDistribution(validationResults),
          improvementAreas: this.identifyImprovementAreas(mistakes),
          learningRecommendations: this.generateLearningRecommendations(mistakes)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: new PatternRecognitionError('Failed to detect common mistakes', error)
      };
    }
  }

  async identifyProofStrategies(
    premises: string[],
    conclusion: string,
    languagePackage: LanguagePackageEntity
  ): Promise<Result<ProofStrategyRecommendations, PatternRecognitionError>> {
    try {
      const strategies: ProofStrategyRecommendation[] = [];
      
      // Analyze the logical structure
      const structure = this.analyzeLogicalStructure(premises, conclusion, languagePackage);

      // Direct proof strategy
      const directProof = this.analyzeDirectProofViability(premises, conclusion, languagePackage);
      if (directProof.viable) {
        strategies.push({
          name: 'Direct Proof',
          description: 'Proceed directly from premises to conclusion',
          confidence: directProof.confidence,
          difficulty: directProof.difficulty,
          steps: directProof.steps,
          applicableRules: directProof.rules
        });
      }

      // Proof by contradiction
      const contradictionProof = this.analyzeContradictionProofViability(premises, conclusion);
      if (contradictionProof.viable) {
        strategies.push({
          name: 'Proof by Contradiction',
          description: 'Assume negation of conclusion and derive contradiction',
          confidence: contradictionProof.confidence,
          difficulty: contradictionProof.difficulty,
          steps: contradictionProof.steps,
          applicableRules: contradictionProof.rules
        });
      }

      // Proof by cases
      const casesProof = this.analyzeCasesProofViability(premises, conclusion);
      if (casesProof.viable) {
        strategies.push({
          name: 'Proof by Cases',
          description: 'Break into exhaustive cases and prove each',
          confidence: casesProof.confidence,
          difficulty: casesProof.difficulty,
          steps: casesProof.steps,
          applicableRules: casesProof.rules
        });
      }

      // Mathematical induction (if applicable)
      if (this.isInductionApplicable(premises, conclusion)) {
        const inductionProof = this.analyzeInductionProofViability(premises, conclusion);
        if (inductionProof.viable) {
          strategies.push({
            name: 'Mathematical Induction',
            description: 'Prove base case and inductive step',
            confidence: inductionProof.confidence,
            difficulty: inductionProof.difficulty,
            steps: inductionProof.steps,
            applicableRules: inductionProof.rules
          });
        }
      }

      // Sort by confidence
      strategies.sort((a, b) => b.confidence - a.confidence);

      return {
        success: true,
        data: {
          recommendedStrategies: strategies,
          structuralAnalysis: structure,
          complexityAssessment: this.assessProofComplexity(premises, conclusion),
          alternativeApproaches: this.suggestAlternativeApproaches(strategies),
          prerequisiteChecks: this.identifyPrerequisites(strategies, languagePackage)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: new PatternRecognitionError('Failed to identify proof strategies', error)
      };
    }
  }

  private async recognizeStructuralPatterns(
    statements: string[],
    connections: Array<{ from: number; to: number }>
  ): Promise<RecognizedPattern[]> {
    const patterns: RecognizedPattern[] = [];

    // Linear proof pattern
    if (this.isLinearProof(connections)) {
      patterns.push({
        type: 'linear-proof',
        name: 'Linear Proof Structure',
        description: 'Statements form a linear chain of reasoning',
        confidence: 0.9,
        instances: [{ startIndex: 0, endIndex: statements.length - 1 }],
        properties: { length: statements.length }
      });
    }

    // Tree proof pattern
    if (this.isTreeProof(connections)) {
      patterns.push({
        type: 'tree-proof',
        name: 'Tree Proof Structure',
        description: 'Statements form a tree-like branching structure',
        confidence: 0.85,
        instances: this.findTreeBranches(connections),
        properties: { branches: this.countBranches(connections) }
      });
    }

    // Diamond pattern (convergent reasoning)
    const diamondPatterns = this.findDiamondPatterns(connections);
    patterns.push(...diamondPatterns);

    return patterns;
  }

  private async recognizeLogicalPatterns(
    statements: string[],
    languagePackage: LanguagePackageEntity
  ): Promise<RecognizedPattern[]> {
    const patterns: RecognizedPattern[] = [];

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Modus ponens pattern
      const modusPonens = this.detectModusPonens(statement, statements, i);
      if (modusPonens) {
        patterns.push(modusPonens);
      }

      // Modus tollens pattern
      const modusTollens = this.detectModusTollens(statement, statements, i);
      if (modusTollens) {
        patterns.push(modusTollens);
      }

      // Hypothetical syllogism
      const hypotheticalSyllogism = this.detectHypotheticalSyllogism(statement, statements, i);
      if (hypotheticalSyllogism) {
        patterns.push(hypotheticalSyllogism);
      }

      // Modal logic patterns
      if (languagePackage.supportsModalLogic()) {
        const modalPatterns = this.detectModalPatterns(statement, statements, i);
        patterns.push(...modalPatterns);
      }
    }

    return patterns;
  }

  private async recognizeInferencePatterns(
    statements: string[],
    connections: Array<{ from: number; to: number }>,
    languagePackage: LanguagePackageEntity
  ): Promise<RecognizedPattern[]> {
    const patterns: RecognizedPattern[] = [];
    const rules = languagePackage.getInferenceRules();

    for (const connection of connections) {
      const fromStatement = statements[connection.from];
      const toStatement = statements[connection.to];

      // Check against known inference rules
      for (const rule of rules) {
        if (rule.isRuleActive() && rule.matchesPattern([fromStatement], [toStatement])) {
          patterns.push({
            type: 'inference-rule',
            name: rule.getName().getValue(),
            description: `Application of ${rule.getName().getValue()}`,
            confidence: rule.getPatternConfidence([fromStatement], [toStatement]),
            instances: [{ startIndex: connection.from, endIndex: connection.to }],
            properties: { rule: rule.getName().getValue() }
          });
        }
      }
    }

    return patterns;
  }

  private isLinearProof(connections: Array<{ from: number; to: number }>): boolean {
    // Check if connections form a linear sequence
    if (connections.length === 0) return true;
    
    const sorted = connections.sort((a, b) => a.from - b.from);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].to !== sorted[i + 1].from) {
        return false;
      }
    }
    return true;
  }

  private isTreeProof(connections: Array<{ from: number; to: number }>): boolean {
    const inDegree = new Map<number, number>();
    const outDegree = new Map<number, number>();

    for (const { from, to } of connections) {
      outDegree.set(from, (outDegree.get(from) || 0) + 1);
      inDegree.set(to, (inDegree.get(to) || 0) + 1);
    }

    // Tree properties: exactly one root (in-degree 0) and all others have in-degree 1
    const roots = Array.from(inDegree.entries()).filter(([_, degree]) => degree === 0);
    const nonRoots = Array.from(inDegree.entries()).filter(([_, degree]) => degree > 0);

    return roots.length === 1 && nonRoots.every(([_, degree]) => degree === 1);
  }

  private findTreeBranches(connections: Array<{ from: number; to: number }>): PatternInstance[] {
    const branches: PatternInstance[] = [];
    const outDegree = new Map<number, number>();

    for (const { from } of connections) {
      outDegree.set(from, (outDegree.get(from) || 0) + 1);
    }

    // Find branch points (nodes with out-degree > 1)
    for (const [node, degree] of outDegree.entries()) {
      if (degree > 1) {
        branches.push({ startIndex: node, endIndex: node });
      }
    }

    return branches;
  }

  private countBranches(connections: Array<{ from: number; to: number }>): number {
    return this.findTreeBranches(connections).length;
  }

  private findDiamondPatterns(connections: Array<{ from: number; to: number }>): RecognizedPattern[] {
    const patterns: RecognizedPattern[] = [];
    
    // Look for convergent patterns where multiple paths lead to the same conclusion
    const inDegree = new Map<number, number>();
    for (const { to } of connections) {
      inDegree.set(to, (inDegree.get(to) || 0) + 1);
    }

    for (const [node, degree] of inDegree.entries()) {
      if (degree > 1) {
        patterns.push({
          type: 'convergent-reasoning',
          name: 'Convergent Reasoning',
          description: 'Multiple lines of reasoning converge to same conclusion',
          confidence: 0.8,
          instances: [{ startIndex: node, endIndex: node }],
          properties: { convergencePoint: node, inputCount: degree }
        });
      }
    }

    return patterns;
  }

  private detectModusPonens(
    statement: string,
    allStatements: string[],
    index: number
  ): RecognizedPattern | null {
    // Simplified modus ponens detection: P, P → Q, therefore Q
    const implicationPattern = /(.+)\s*→\s*(.+)/;
    const match = statement.match(implicationPattern);
    
    if (match) {
      const antecedent = match[1].trim();
      const consequent = match[2].trim();
      
      // Look for the antecedent in previous statements
      for (let i = 0; i < index; i++) {
        if (allStatements[i].trim() === antecedent) {
          return {
            type: 'modus-ponens',
            name: 'Modus Ponens',
            description: 'From P and P → Q, infer Q',
            confidence: 0.95,
            instances: [{ startIndex: i, endIndex: index }],
            properties: { antecedent, consequent }
          };
        }
      }
    }

    return null;
  }

  private detectModusTollens(
    statement: string,
    allStatements: string[],
    index: number
  ): RecognizedPattern | null {
    // Simplified modus tollens detection: P → Q, ¬Q, therefore ¬P
    const negationPattern = /¬(.+)/;
    const match = statement.match(negationPattern);
    
    if (match) {
      const negatedFormula = match[1].trim();
      
      // Look for implications with this formula as consequent
      for (let i = 0; i < index; i++) {
        const implicationMatch = allStatements[i].match(/(.+)\s*→\s*(.+)/);
        if (implicationMatch && implicationMatch[2].trim() === negatedFormula) {
          return {
            type: 'modus-tollens',
            name: 'Modus Tollens',
            description: 'From P → Q and ¬Q, infer ¬P',
            confidence: 0.9,
            instances: [{ startIndex: i, endIndex: index }],
            properties: { 
              implication: allStatements[i],
              negation: statement
            }
          };
        }
      }
    }

    return null;
  }

  private detectHypotheticalSyllogism(
    statement: string,
    allStatements: string[],
    index: number
  ): RecognizedPattern | null {
    // P → Q, Q → R, therefore P → R
    const implicationPattern = /(.+)\s*→\s*(.+)/;
    const match = statement.match(implicationPattern);
    
    if (match) {
      const finalAntecedent = match[1].trim();
      const finalConsequent = match[2].trim();
      
      // Look for chain of implications
      for (let i = 0; i < index; i++) {
        for (let j = i + 1; j < index; j++) {
          const match1 = allStatements[i].match(implicationPattern);
          const match2 = allStatements[j].match(implicationPattern);
          
          if (match1 && match2) {
            const [, ant1, cons1] = match1;
            const [, ant2, cons2] = match2;
            
            if (ant1.trim() === finalAntecedent && 
                cons1.trim() === ant2.trim() && 
                cons2.trim() === finalConsequent) {
              return {
                type: 'hypothetical-syllogism',
                name: 'Hypothetical Syllogism',
                description: 'From P → Q and Q → R, infer P → R',
                confidence: 0.88,
                instances: [{ startIndex: i, endIndex: index }],
                properties: { 
                  firstImplication: allStatements[i],
                  secondImplication: allStatements[j],
                  conclusion: statement
                }
              };
            }
          }
        }
      }
    }

    return null;
  }

  private detectModalPatterns(
    statement: string,
    allStatements: string[],
    index: number
  ): RecognizedPattern[] {
    const patterns: RecognizedPattern[] = [];

    // Necessity distribution: □(P ∧ Q) ↔ (□P ∧ □Q)
    if (statement.includes('□') && statement.includes('∧')) {
      patterns.push({
        type: 'necessity-distribution',
        name: 'Necessity Distribution',
        description: 'Distribution of necessity over conjunction',
        confidence: 0.7,
        instances: [{ startIndex: index, endIndex: index }],
        properties: { formula: statement }
      });
    }

    // Possibility duality: ◇P ↔ ¬□¬P
    if (statement.includes('◇') || (statement.includes('¬') && statement.includes('□'))) {
      patterns.push({
        type: 'modal-duality',
        name: 'Modal Duality',
        description: 'Duality between possibility and necessity',
        confidence: 0.75,
        instances: [{ startIndex: index, endIndex: index }],
        properties: { formula: statement }
      });
    }

    return patterns;
  }

  private extractStructuralFeatures(
    statements: string[],
    connections: Array<{ from: number; to: number }>
  ): StructuralFeatures {
    return {
      statementCount: statements.length,
      connectionCount: connections.length,
      maxDepth: this.calculateMaxDepth(connections),
      branchingFactor: this.calculateBranchingFactor(connections),
      isLinear: this.isLinearProof(connections),
      isTree: this.isTreeProof(connections),
      hasCycles: this.hasCycles(connections)
    };
  }

  private extractLogicalFeatures(statements: string[], languagePackage: LanguagePackageEntity): LogicalFeatures {
    const features: LogicalFeatures = {
      hasQuantifiers: false,
      hasModalOperators: false,
      hasNegations: false,
      hasImplications: false,
      hasConjunctions: false,
      hasDisjunctions: false,
      logicalComplexity: 0
    };

    for (const statement of statements) {
      if (/[∀∃]/.test(statement)) features.hasQuantifiers = true;
      if (/[□◇]/.test(statement)) features.hasModalOperators = true;
      if (/¬/.test(statement)) features.hasNegations = true;
      if (/→/.test(statement)) features.hasImplications = true;
      if (/∧/.test(statement)) features.hasConjunctions = true;
      if (/∨/.test(statement)) features.hasDisjunctions = true;
      
      features.logicalComplexity += this.calculateStatementComplexity(statement);
    }

    features.logicalComplexity = Math.round(features.logicalComplexity / statements.length);
    return features;
  }

  private calculateMaxDepth(connections: Array<{ from: number; to: number }>): number {
    if (connections.length === 0) return 0;
    
    const graph = new Map<number, number[]>();
    const inDegree = new Map<number, number>();
    
    for (const { from, to } of connections) {
      if (!graph.has(from)) graph.set(from, []);
      graph.get(from)!.push(to);
      inDegree.set(to, (inDegree.get(to) || 0) + 1);
    }

    // Find roots (nodes with in-degree 0)
    const roots = Array.from(inDegree.entries())
      .filter(([_, degree]) => degree === 0)
      .map(([node, _]) => node);

    let maxDepth = 0;
    for (const root of roots) {
      maxDepth = Math.max(maxDepth, this.dfsDepth(root, graph, new Set()));
    }

    return maxDepth;
  }

  private dfsDepth(node: number, graph: Map<number, number[]>, visited: Set<number>): number {
    if (visited.has(node)) return 0;
    visited.add(node);
    
    const children = graph.get(node) || [];
    let maxChildDepth = 0;
    
    for (const child of children) {
      maxChildDepth = Math.max(maxChildDepth, this.dfsDepth(child, graph, visited));
    }
    
    visited.delete(node);
    return 1 + maxChildDepth;
  }

  private calculateBranchingFactor(connections: Array<{ from: number; to: number }>): number {
    const outDegree = new Map<number, number>();
    
    for (const { from } of connections) {
      outDegree.set(from, (outDegree.get(from) || 0) + 1);
    }

    if (outDegree.size === 0) return 0;
    
    const totalOutDegree = Array.from(outDegree.values()).reduce((sum, degree) => sum + degree, 0);
    return totalOutDegree / outDegree.size;
  }

  private hasCycles(connections: Array<{ from: number; to: number }>): boolean {
    const graph = new Map<number, number[]>();
    
    for (const { from, to } of connections) {
      if (!graph.has(from)) graph.set(from, []);
      graph.get(from)!.push(to);
    }

    const visited = new Set<number>();
    const recursionStack = new Set<number>();

    const hasCycleDFS = (node: number): boolean => {
      visited.add(node);
      recursionStack.add(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycleDFS(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(node);
      return false;
    };

    for (const [node] of graph) {
      if (!visited.has(node)) {
        if (hasCycleDFS(node)) return true;
      }
    }

    return false;
  }

  private calculateStatementComplexity(statement: string): number {
    let complexity = 0;
    complexity += statement.length * 0.1;
    complexity += (statement.match(/[∀∃∧∨→↔¬□◇]/g) || []).length * 2;
    complexity += (statement.match(/\(/g) || []).length * 1.5;
    return complexity;
  }

  private generatePatternInsights(
    patterns: RecognizedPattern[],
    languagePackage: LanguagePackageEntity
  ): PatternInsight[] {
    const insights: PatternInsight[] = [];

    const patternTypes = new Set(patterns.map(p => p.type));

    if (patternTypes.has('modus-ponens')) {
      insights.push({
        type: 'inference-style',
        description: 'This proof uses modus ponens, a fundamental inference rule',
        confidence: 0.9,
        implications: ['Strong logical foundation', 'Clear reasoning steps']
      });
    }

    if (patternTypes.has('linear-proof')) {
      insights.push({
        type: 'structure-style',
        description: 'Linear proof structure suggests straightforward reasoning',
        confidence: 0.85,
        implications: ['Easy to follow', 'Minimal complexity']
      });
    }

    if (patternTypes.has('convergent-reasoning')) {
      insights.push({
        type: 'reasoning-style',
        description: 'Multiple lines of reasoning converge, showing thorough analysis',
        confidence: 0.8,
        implications: ['Comprehensive approach', 'Higher confidence in conclusion']
      });
    }

    return insights;
  }

  private calculateOverallConfidence(patterns: RecognizedPattern[]): number {
    if (patterns.length === 0) return 0;
    
    const totalConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0);
    return totalConfidence / patterns.length;
  }

  private analyzeArgumentStructure(premises: string[], conclusions: string[]): ArgumentStructure {
    // Simplified analysis
    return {
      type: conclusions.length === 1 ? 'deductive' : 'complex',
      premiseCount: premises.length,
      conclusionCount: conclusions.length,
      isValid: true, // Would need proper logical analysis
      strength: this.calculateArgumentStrength(premises, conclusions)
    };
  }

  private calculateArgumentStrength(premises: string[], conclusions: string[]): number {
    // Simplified strength calculation based on premise-conclusion ratio
    const premiseLength = premises.join('').length;
    const conclusionLength = conclusions.join('').length;
    return Math.min(1, premiseLength / Math.max(conclusionLength, 1));
  }

  private async matchInferenceRules(
    premises: string[],
    conclusions: string[],
    languagePackage: LanguagePackageEntity
  ): Promise<{ matchingRules: string[]; isValid: boolean; iSound: boolean }> {
    const matchingRules: string[] = [];
    const rules = languagePackage.getInferenceRules();

    for (const rule of rules) {
      if (rule.isRuleActive() && rule.matchesPattern(premises, conclusions)) {
        matchingRules.push(rule.getName().getValue());
      }
    }

    return {
      matchingRules,
      isValid: matchingRules.length > 0,
      iSound: matchingRules.length > 0 // Simplified
    };
  }

  private calculateArgumentComplexity(premises: string[], conclusions: string[]): ArgumentComplexity {
    const allStatements = [...premises, ...conclusions];
    const totalLength = allStatements.join('').length;
    const logicalSymbols = allStatements.join('').match(/[∀∃∧∨→↔¬□◇]/g) || [];
    
    return {
      score: Math.round(totalLength * 0.1 + logicalSymbols.length * 2),
      level: this.categorizeComplexity(totalLength, logicalSymbols.length),
      factors: {
        statementCount: allStatements.length,
        averageLength: totalLength / allStatements.length,
        logicalSymbolCount: logicalSymbols.length
      }
    };
  }

  private categorizeComplexity(totalLength: number, symbolCount: number): 'low' | 'medium' | 'high' {
    const complexityScore = totalLength * 0.1 + symbolCount * 2;
    if (complexityScore < 10) return 'low';
    if (complexityScore < 30) return 'medium';
    return 'high';
  }

  private extractArgumentFeatures(premises: string[], conclusions: string[]): ArgumentFeatures {
    const allStatements = [...premises, ...conclusions];
    
    return {
      hasConditionals: allStatements.some(s => s.includes('→')),
      hasNegations: allStatements.some(s => s.includes('¬')),
      hasQuantifiers: allStatements.some(s => /[∀∃]/.test(s)),
      hasModalOperators: allStatements.some(s => /[□◇]/.test(s)),
      averageStatementLength: allStatements.reduce((sum, s) => sum + s.length, 0) / allStatements.length,
      logicalDepth: this.calculateLogicalDepth(allStatements)
    };
  }

  private calculateLogicalDepth(statements: string[]): number {
    // Count maximum nesting level of parentheses
    let maxDepth = 0;
    
    for (const statement of statements) {
      let currentDepth = 0;
      let statementMaxDepth = 0;
      
      for (const char of statement) {
        if (char === '(') {
          currentDepth++;
          statementMaxDepth = Math.max(statementMaxDepth, currentDepth);
        } else if (char === ')') {
          currentDepth--;
        }
      }
      
      maxDepth = Math.max(maxDepth, statementMaxDepth);
    }
    
    return maxDepth;
  }

  private generateStructureImprovement(
    structure: ArgumentStructure,
    patterns: { matchingRules: string[]; isValid: boolean; iSound: boolean }
  ): string[] {
    const suggestions: string[] = [];
    
    if (!patterns.isValid) {
      suggestions.push('Consider adding intermediate steps to strengthen the logical connection');
    }
    
    if (structure.strength < 0.5) {
      suggestions.push('The argument could benefit from additional supporting premises');
    }
    
    if (structure.premiseCount > 5) {
      suggestions.push('Consider grouping related premises to improve clarity');
    }

    return suggestions;
  }

  private analyzeErrorPatterns(validationResults: ValidationResultEntity[]): Map<string, number> {
    const patterns = new Map<string, number>();
    
    for (const result of validationResults) {
      for (const diagnostic of result.getDiagnostics()) {
        const code = diagnostic.getCode().getCode();
        patterns.set(code, (patterns.get(code) || 0) + 1);
      }
    }

    return patterns;
  }

  private detectCircularReasoning(
    validationResults: ValidationResultEntity[]
  ): { detected: boolean; confidence: number; instances: string[] } {
    // Simplified circular reasoning detection
    // In practice, this would involve more sophisticated dependency analysis
    
    return {
      detected: false,
      confidence: 0,
      instances: []
    };
  }

  private detectInvalidInferences(
    validationResults: ValidationResultEntity[],
    languagePackage: LanguagePackageEntity
  ): CommonMistake[] {
    const mistakes: CommonMistake[] = [];
    
    for (const result of validationResults) {
      for (const diagnostic of result.getDiagnostics()) {
        if (diagnostic.getCode().getCode().includes('inference')) {
          mistakes.push({
            type: 'invalid-inference',
            description: diagnostic.getMessage().getText(),
            confidence: 0.8,
            instances: [diagnostic.getLocation().toString()],
            suggestion: 'Review the inference rule being applied'
          });
        }
      }
    }

    return mistakes;
  }

  private detectMissingPremises(validationResults: ValidationResultEntity[]): CommonMistake[] {
    const mistakes: CommonMistake[] = [];
    
    // Simplified detection - look for semantic errors that might indicate missing premises
    for (const result of validationResults) {
      const semanticErrors = result.getDiagnostics().filter(d => d.isSemanticRelated());
      
      if (semanticErrors.length > 0) {
        mistakes.push({
          type: 'missing-premise',
          description: 'Possible missing premise detected',
          confidence: 0.6,
          instances: semanticErrors.map(d => d.getLocation().toString()),
          suggestion: 'Consider if additional premises are needed to support the conclusion'
        });
      }
    }

    return mistakes;
  }

  private detectModalLogicErrors(validationResults: ValidationResultEntity[]): CommonMistake[] {
    const mistakes: CommonMistake[] = [];
    
    for (const result of validationResults) {
      for (const diagnostic of result.getDiagnostics()) {
        const message = diagnostic.getMessage().getText().toLowerCase();
        
        if (message.includes('modal') || message.includes('necessity') || message.includes('possibility')) {
          mistakes.push({
            type: 'modal-logic-error',
            description: diagnostic.getMessage().getText(),
            confidence: 0.85,
            instances: [diagnostic.getLocation().toString()],
            suggestion: 'Review modal logic principles and operator usage'
          });
        }
      }
    }

    return mistakes;
  }

  private calculateErrorFrequency(patterns: Map<string, number>): Record<string, number> {
    const frequency: Record<string, number> = {};
    const total = Array.from(patterns.values()).reduce((sum, count) => sum + count, 0);
    
    for (const [pattern, count] of patterns.entries()) {
      frequency[pattern] = total > 0 ? count / total : 0;
    }

    return frequency;
  }

  private analyzeSeverityDistribution(validationResults: ValidationResultEntity[]): Record<string, number> {
    const distribution = { error: 0, warning: 0, info: 0 };
    
    for (const result of validationResults) {
      for (const diagnostic of result.getDiagnostics()) {
        const severity = diagnostic.getSeverity().getSeverity();
        distribution[severity]++;
      }
    }

    return distribution;
  }

  private identifyImprovementAreas(mistakes: CommonMistake[]): string[] {
    const areas = new Set<string>();
    
    for (const mistake of mistakes) {
      switch (mistake.type) {
        case 'invalid-inference':
          areas.add('logical-reasoning');
          break;
        case 'missing-premise':
          areas.add('argument-structure');
          break;
        case 'modal-logic-error':
          areas.add('modal-logic');
          break;
        case 'circular-reasoning':
          areas.add('logical-dependencies');
          break;
      }
    }

    return Array.from(areas);
  }

  private generateLearningRecommendations(mistakes: CommonMistake[]): string[] {
    const recommendations: string[] = [];
    const mistakeTypes = new Set(mistakes.map(m => m.type));
    
    if (mistakeTypes.has('invalid-inference')) {
      recommendations.push('Study basic inference rules (modus ponens, modus tollens, etc.)');
    }
    
    if (mistakeTypes.has('modal-logic-error')) {
      recommendations.push('Review modal logic concepts and operator semantics');
    }
    
    if (mistakeTypes.has('circular-reasoning')) {
      recommendations.push('Practice identifying logical dependencies and avoiding circular arguments');
    }

    return recommendations;
  }

  private analyzeLogicalStructure(
    premises: string[],
    conclusion: string,
    languagePackage: LanguagePackageEntity
  ): LogicalStructureAnalysis {
    return {
      hasConditionals: [...premises, conclusion].some(s => s.includes('→')),
      hasNegations: [...premises, conclusion].some(s => s.includes('¬')),
      hasQuantifiers: [...premises, conclusion].some(s => /[∀∃]/.test(s)),
      hasModalOperators: [...premises, conclusion].some(s => /[□◇]/.test(s)),
      logicalComplexity: this.calculateLogicalComplexity(premises, conclusion),
      structureType: this.determineStructureType(premises, conclusion)
    };
  }

  private calculateLogicalComplexity(premises: string[], conclusion: string): number {
    const allStatements = [...premises, conclusion];
    const totalLength = allStatements.join('').length;
    const symbols = allStatements.join('').match(/[∀∃∧∨→↔¬□◇]/g) || [];
    return Math.round(totalLength * 0.1 + symbols.length * 2);
  }

  private determineStructureType(premises: string[], conclusion: string): string {
    if (premises.some(p => p.includes('∨'))) return 'disjunctive';
    if (premises.some(p => p.includes('→'))) return 'conditional';
    if (conclusion.includes('∀') || conclusion.includes('∃')) return 'quantificational';
    return 'basic';
  }

  private analyzeDirectProofViability(
    premises: string[],
    conclusion: string,
    languagePackage: LanguagePackageEntity
  ): ProofViabilityAnalysis {
    // Simplified analysis - in practice would use theorem prover
    return {
      viable: true,
      confidence: 0.8,
      difficulty: 'medium',
      steps: [
        'Start with given premises',
        'Apply logical rules step by step',
        'Derive the conclusion'
      ],
      rules: ['modus-ponens', 'conjunction-elimination']
    };
  }

  private analyzeContradictionProofViability(premises: string[], conclusion: string): ProofViabilityAnalysis {
    return {
      viable: true,
      confidence: 0.7,
      difficulty: 'medium',
      steps: [
        'Assume the negation of the conclusion',
        'Combine with the given premises',
        'Derive a contradiction',
        'Conclude the original statement'
      ],
      rules: ['contradiction-introduction', 'negation-elimination']
    };
  }

  private analyzeCasesProofViability(premises: string[], conclusion: string): ProofViabilityAnalysis {
    const hasDisjunction = premises.some(p => p.includes('∨'));
    
    return {
      viable: hasDisjunction,
      confidence: hasDisjunction ? 0.85 : 0.2,
      difficulty: 'medium',
      steps: [
        'Identify the relevant cases from disjunctive premises',
        'Prove the conclusion for each case separately',
        'Combine the results using disjunction elimination'
      ],
      rules: ['disjunction-elimination', 'case-analysis']
    };
  }

  private isInductionApplicable(premises: string[], conclusion: string): boolean {
    // Check if the conclusion involves universal quantification over natural numbers
    return /∀n/.test(conclusion) || conclusion.includes('all n');
  }

  private analyzeInductionProofViability(premises: string[], conclusion: string): ProofViabilityAnalysis {
    return {
      viable: true,
      confidence: 0.9,
      difficulty: 'hard',
      steps: [
        'Prove the base case (typically n = 0 or n = 1)',
        'Assume the statement holds for some arbitrary k',
        'Prove it holds for k + 1',
        'Conclude by mathematical induction'
      ],
      rules: ['mathematical-induction', 'universal-generalization']
    };
  }

  private assessProofComplexity(premises: string[], conclusion: string): ComplexityAssessment {
    const complexity = this.calculateLogicalComplexity(premises, conclusion);
    
    return {
      score: complexity,
      level: complexity < 10 ? 'low' : complexity < 30 ? 'medium' : 'high',
      factors: [
        'Number of logical operators',
        'Statement length',
        'Nesting depth'
      ],
      recommendations: complexity > 30 ? ['Consider breaking into smaller steps'] : []
    };
  }

  private suggestAlternativeApproaches(strategies: ProofStrategyRecommendation[]): string[] {
    const alternatives: string[] = [];
    
    if (strategies.length > 1) {
      alternatives.push('Multiple proof strategies are viable - choose based on your comfort level');
    }
    
    if (strategies.some(s => s.name === 'Direct Proof')) {
      alternatives.push('If direct proof seems difficult, consider proof by contradiction');
    }

    return alternatives;
  }

  private identifyPrerequisites(
    strategies: ProofStrategyRecommendation[],
    languagePackage: LanguagePackageEntity
  ): string[] {
    const prerequisites: string[] = [];
    
    for (const strategy of strategies) {
      if (strategy.name === 'Mathematical Induction') {
        prerequisites.push('Understanding of natural number properties');
      }
      
      if (strategy.applicableRules.some(rule => rule.includes('modal'))) {
        prerequisites.push('Modal logic fundamentals');
      }
    }

    return Array.from(new Set(prerequisites));
  }
}

// Types and interfaces
export interface RecognizedPattern {
  type: string;
  name: string;
  description: string;
  confidence: number;
  instances: PatternInstance[];
  properties: Record<string, unknown>;
}

export interface PatternInstance {
  startIndex: number;
  endIndex: number;
}

export interface ProofPatternAnalysis {
  recognizedPatterns: RecognizedPattern[];
  structuralFeatures: StructuralFeatures;
  logicalFeatures: LogicalFeatures;
  patternInsights: PatternInsight[];
  confidence: number;
  performance: any;
}

export interface StructuralFeatures {
  statementCount: number;
  connectionCount: number;
  maxDepth: number;
  branchingFactor: number;
  isLinear: boolean;
  isTree: boolean;
  hasCycles: boolean;
}

export interface LogicalFeatures {
  hasQuantifiers: boolean;
  hasModalOperators: boolean;
  hasNegations: boolean;
  hasImplications: boolean;
  hasConjunctions: boolean;
  hasDisjunctions: boolean;
  logicalComplexity: number;
}

export interface PatternInsight {
  type: string;
  description: string;
  confidence: number;
  implications: string[];
}

export interface ArgumentStructureAnalysis {
  argumentType: string;
  inferenceRules: string[];
  complexity: ArgumentComplexity;
  validity: boolean;
  soundness: boolean;
  logicalFeatures: ArgumentFeatures;
  suggestions: string[];
}

export interface ArgumentStructure {
  type: string;
  premiseCount: number;
  conclusionCount: number;
  isValid: boolean;
  strength: number;
}

export interface ArgumentComplexity {
  score: number;
  level: 'low' | 'medium' | 'high';
  factors: {
    statementCount: number;
    averageLength: number;
    logicalSymbolCount: number;
  };
}

export interface ArgumentFeatures {
  hasConditionals: boolean;
  hasNegations: boolean;
  hasQuantifiers: boolean;
  hasModalOperators: boolean;
  averageStatementLength: number;
  logicalDepth: number;
}

export interface MistakeAnalysis {
  commonMistakes: CommonMistake[];
  errorFrequency: Record<string, number>;
  severityDistribution: Record<string, number>;
  improvementAreas: string[];
  learningRecommendations: string[];
}

export interface CommonMistake {
  type: string;
  description: string;
  confidence: number;
  instances: string[];
  suggestion: string;
}

export interface ProofStrategyRecommendations {
  recommendedStrategies: ProofStrategyRecommendation[];
  structuralAnalysis: LogicalStructureAnalysis;
  complexityAssessment: ComplexityAssessment;
  alternativeApproaches: string[];
  prerequisiteChecks: string[];
}

export interface ProofStrategyRecommendation {
  name: string;
  description: string;
  confidence: number;
  difficulty: string;
  steps: string[];
  applicableRules: string[];
}

export interface LogicalStructureAnalysis {
  hasConditionals: boolean;
  hasNegations: boolean;
  hasQuantifiers: boolean;
  hasModalOperators: boolean;
  logicalComplexity: number;
  structureType: string;
}

export interface ComplexityAssessment {
  score: number;
  level: string;
  factors: string[];
  recommendations: string[];
}

export interface ProofViabilityAnalysis {
  viable: boolean;
  confidence: number;
  difficulty: string;
  steps: string[];
  rules: string[];
}
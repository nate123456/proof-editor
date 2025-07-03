import { ValidationLevel } from '../value-objects/ValidationLevel';

export const ValidationBusinessRules = {
  HIERARCHY_RULES: {
    description:
      'Validation must follow hierarchical order based on dependencies and business requirements',
    rules: [
      'Syntactic validation must pass before semantic validation can proceed',
      'Flow validation requires successful syntactic validation but is independent of semantic validation',
      'Style validation can run independently after syntactic validation or in parallel with other levels',
      'Higher priority levels (lower number) must complete before dependent levels can execute',
      'Multiple independent validation levels can execute in parallel to improve performance',
    ],
    implementation: {
      syntaxFirst:
        'Always execute syntax validation first as all other validations depend on syntactic correctness',
      parallelExecution:
        'Semantic, flow, and style validations can run in parallel after syntax passes',
      errorPropagation: 'Syntax errors block all dependent validations to prevent cascade failures',
    },
  },

  LEVEL_REQUIREMENTS: {
    description:
      'Business rules determining when each validation level is required based on context',
    rules: {
      [ValidationLevel.syntax().toString()]: {
        requirement: 'Always required for all validation requests',
        rationale: 'Basic syntactic correctness is prerequisite for all logical analysis',
        skipConditions: 'Cannot be skipped under any circumstances',
        dependencies: [],
        performanceTarget: '5ms maximum execution time',
      },
      [ValidationLevel.semantic().toString()]: {
        requirement: 'Required when logical consistency and meaning analysis are needed',
        rationale: 'Ensures logical validity and semantic coherence of statements',
        skipConditions: 'Can be skipped for pure style-only changes that do not affect meaning',
        dependencies: ['syntax'],
        performanceTarget: '10ms maximum execution time',
      },
      [ValidationLevel.flow().toString()]: {
        requirement: 'Required for proof construction and argument chain validation',
        rationale: 'Validates logical flow and connections between statements in arguments',
        skipConditions:
          'Can be skipped for isolated statement changes that do not affect argument structure',
        dependencies: ['syntax'],
        performanceTarget: '8ms maximum execution time',
      },
      [ValidationLevel.style().toString()]: {
        requirement: 'Required for presentation and formatting compliance',
        rationale: 'Ensures consistency with style guidelines and formatting standards',
        skipConditions:
          'Can be skipped for very short statements (< 50 characters) or when style is not a concern',
        dependencies: ['syntax'],
        performanceTarget: '15ms maximum execution time',
      },
    },
  },

  SKIP_CONDITIONS: {
    description: 'Specific conditions under which validation levels can be safely skipped',
    rules: [
      {
        level: 'syntax',
        condition: 'Never',
        rationale: 'Syntactic validation is fundamental and cannot be bypassed',
        examples: [],
      },
      {
        level: 'semantic',
        condition: 'Style-only changes',
        rationale: 'Pure formatting changes do not affect logical meaning',
        examples: [
          'Whitespace modifications',
          'Symbol spacing adjustments',
          'Capitalization changes that do not affect meaning',
        ],
      },
      {
        level: 'flow',
        condition: 'Isolated statement modifications',
        rationale: 'Changes that do not affect argument structure or logical connections',
        examples: [
          'Editing individual premise content without changing logical role',
          'Modifying conclusion phrasing without changing logical meaning',
          'Adding or removing non-logical descriptive text',
        ],
      },
      {
        level: 'style',
        condition: 'Short statements or style-insensitive contexts',
        rationale: 'Style validation overhead may exceed benefit for trivial content',
        examples: [
          'Statements under 50 characters',
          'Mathematical expressions',
          'Formal logical notation',
        ],
      },
    ],
  },

  PERFORMANCE_TARGETS: {
    description: 'Performance expectations and optimization requirements for each validation level',
    targets: {
      syntax: {
        maxExecutionTime: '5ms',
        rationale: 'Fast syntactic checking enables real-time feedback',
        optimizations: [
          'Use efficient parsing algorithms',
          'Cache commonly used patterns',
          'Fail fast on obvious syntax errors',
        ],
      },
      flow: {
        maxExecutionTime: '8ms',
        rationale: 'Flow analysis requires more computation but should remain responsive',
        optimizations: [
          'Lazy evaluation of complex flow patterns',
          'Incremental analysis for large argument trees',
          'Parallel processing of independent flow branches',
        ],
      },
      semantic: {
        maxExecutionTime: '10ms',
        rationale: 'Semantic analysis is most complex but must maintain responsiveness',
        optimizations: [
          'Progressive semantic analysis depth',
          'Cache semantic rule evaluations',
          'Use heuristics for quick semantic checks',
        ],
      },
      style: {
        maxExecutionTime: '15ms',
        rationale: 'Style validation can afford longer execution for comprehensive checking',
        optimizations: [
          'Batch style rule evaluation',
          'Skip expensive style checks for short content',
          'Use configurable style rule sets',
        ],
      },
    },
    monitoring: {
      alertThresholds: 'Alert if any validation level exceeds 2x target time',
      performanceMetrics: 'Track average, 95th percentile, and maximum execution times',
      degradationHandling: 'Gracefully degrade to faster validation modes under load',
    },
  },

  DEPENDENCY_RULES: {
    description: 'Dependencies and relationships between validation levels',
    dependencies: {
      syntax: {
        dependsOn: [],
        blocksOnFailure: ['semantic', 'flow', 'style'],
        canRunInParallel: false,
        mustCompleteFirst: true,
      },
      semantic: {
        dependsOn: ['syntax'],
        blocksOnFailure: [],
        canRunInParallel: ['flow', 'style'],
        mustCompleteFirst: false,
      },
      flow: {
        dependsOn: ['syntax'],
        blocksOnFailure: [],
        canRunInParallel: ['semantic', 'style'],
        mustCompleteFirst: false,
      },
      style: {
        dependsOn: ['syntax'],
        blocksOnFailure: [],
        canRunInParallel: ['semantic', 'flow'],
        mustCompleteFirst: false,
      },
    },
    executionStrategy: {
      sequentialRequired: ['syntax must complete before any other level'],
      parallelOptional: ['semantic, flow, and style can execute in parallel after syntax'],
      errorHandling: [
        'syntax errors terminate all validation',
        'non-syntax errors are collected but do not block other levels',
      ],
    },
  },

  ERROR_HANDLING: {
    description: 'Error handling and recovery strategies for validation workflow',
    strategies: {
      syntaxErrors: {
        action: 'Terminate validation workflow immediately',
        rationale: 'Syntax errors make all other validations meaningless',
        recovery: 'Return syntax error diagnostics with suggestions for fixes',
      },
      semanticErrors: {
        action: 'Continue with other validation levels',
        rationale: 'Semantic errors do not prevent style or flow analysis',
        recovery: 'Collect semantic diagnostics and proceed with remaining validations',
      },
      flowErrors: {
        action: 'Continue with other validation levels',
        rationale: 'Flow errors are independent of semantic and style validation',
        recovery: 'Collect flow diagnostics and proceed with remaining validations',
      },
      styleErrors: {
        action: 'Continue with validation workflow',
        rationale: 'Style issues are non-blocking warnings',
        recovery: 'Collect style diagnostics as warnings',
      },
      systemErrors: {
        action: 'Return partial results with error indication',
        rationale: 'Provide best-effort validation even when system issues occur',
        recovery: 'Log system errors and return available diagnostic information',
      },
    },
  },

  QUALITY_ASSURANCE: {
    description: 'Quality assurance rules for validation implementation',
    requirements: {
      testCoverage: '95% minimum test coverage for all validation policies',
      performanceTesting: 'Regular performance benchmarks against target times',
      businessRuleCompliance: 'Automated testing of all business rule implementations',
      regressionTesting: 'Comprehensive regression tests for validation behavior changes',
    },
    monitoring: {
      businessRuleViolations: 'Alert on any violations of documented business rules',
      performanceDegradation: 'Track and alert on validation performance issues',
      errorRateMonitoring: 'Monitor validation error rates and patterns',
      usagePatterns: 'Analyze validation level usage to optimize performance',
    },
  },
} as const;

export type ValidationBusinessRuleType = typeof ValidationBusinessRules;

export function validateHierarchyCompliance(
  executedLevels: ValidationLevel[],
  errors: string[],
): { isCompliant: boolean; violations: string[] } {
  const violations: string[] = [];

  const hasSyntax = executedLevels.some((level) => level.isSyntax());
  if (!hasSyntax) {
    violations.push('Syntax validation is required but was not executed');
  }

  const hasSemanticErrors = errors.some((error) => error.includes('semantic'));
  const hasFlowErrors = errors.some((error) => error.includes('flow'));

  if (hasSemanticErrors && hasFlowErrors && hasSyntax) {
    violations.push('Multiple validation levels failed after syntax validation');
  }

  return {
    isCompliant: violations.length === 0,
    violations,
  };
}

export function validatePerformanceCompliance(executionTimes: Map<ValidationLevel, number>): {
  isCompliant: boolean;
  violations: string[];
} {
  const violations: string[] = [];
  const targets = ValidationBusinessRules.PERFORMANCE_TARGETS.targets;

  for (const [level, time] of Array.from(executionTimes)) {
    const levelName = level.toString() as keyof typeof targets;
    const target = targets[levelName];

    if (target) {
      const maxTime = Number.parseInt(target.maxExecutionTime.replace('ms', ''));
      if (time > maxTime) {
        violations.push(`${levelName} validation exceeded target time: ${time}ms > ${maxTime}ms`);
      }
    }
  }

  return {
    isCompliant: violations.length === 0,
    violations,
  };
}

export function validateDependencyCompliance(
  requestedLevel: ValidationLevel,
  executedLevels: ValidationLevel[],
): { isCompliant: boolean; violations: string[] } {
  const violations: string[] = [];
  const dependencies = ValidationBusinessRules.DEPENDENCY_RULES.dependencies;

  const levelName = requestedLevel.toString() as keyof typeof dependencies;
  const levelDeps = dependencies[levelName];

  if (levelDeps) {
    for (const depName of levelDeps.dependsOn) {
      const hasDependency = executedLevels.some((level) => level.toString() === depName);
      if (!hasDependency) {
        violations.push(
          `${levelName} validation requires ${depName} validation but it was not executed`,
        );
      }
    }
  }

  return {
    isCompliant: violations.length === 0,
    violations,
  };
}

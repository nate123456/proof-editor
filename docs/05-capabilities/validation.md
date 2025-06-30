# Validation

## Real-Time Statement Flow Checking and Intelligent Feedback

Validation provides intelligent, educational feedback that helps users understand their statement flow networks and improve their proof routing. The validation system operates across all platforms through coordinated efforts between the core engine, language servers, and platform-specific UI components, ensuring statement pathways are feasible and correctly configured.

## Real-Time Validation

### Continuous Checking
- **As-you-type validation** [CORE]: Tracks structural changes and triggers validation
  - Core engine detects modifications to atomic arguments
  - Debounced change notifications to prevent excessive validation
  - Maintains document state for incremental updates

- **Visual indicators** [PLATFORM]: Display validation status to users
  - Receives validation results from LSP
  - Renders status using platform-appropriate visual cues
  - Updates display in real-time as validation completes

- **Non-blocking processing** [LSP]: Validates without freezing the interface
  - Asynchronous validation processing
  - Cancellable operations for rapid editing
  - Progressive results as validation proceeds

- **Incremental validation** [CORE + LSP]: Only validate what changed
  - Core tracks changed atomic arguments
  - LSP performs minimal revalidation
  - Dependency analysis determines affected arguments

### LSP Validation Protocol
```typescript
// Custom LSP request for proof validation
interface ValidateProofRequest {
  documentId: string;
  changedAtomicArguments: string[];  // Only validate what changed
  fullProofContext: ProofDocument;   // Full context for analysis
}

interface ValidationResponse {
  diagnostics: ProofDiagnostic[];
  globalIssues: GlobalIssue[];       // Document-level problems
  performanceMetrics: ValidationMetrics;
}
```

### Multi-Level Validation
- **Statement syntax validation** [LSP]: Well-formed statement text
  - Parses statement content for syntactic correctness
  - Validates domain-specific notation
  - Checks symbol and formula well-formedness

- **Flow pathway validation** [CORE]: Valid statement routing through networks
  - Validates statement flow pathway integrity
  - Ensures statement routing feasibility through network structure
  - Maintains flow consistency across document

- **Statement transformation validation** [LSP]: Sound statement processing within domain
  - Validates statement transformation rule applications
  - Checks statement processing soundness and validity
  - Enforces domain-specific statement transformation rules

- **Flow network style validation** [LSP]: Best practices and conventions
  - Enforces routing style guidelines
  - Provides flow organization recommendations
  - Checks domain-specific flow conventions

### Ultra-Fast Experience
For detailed performance targets and validation timing requirements, see [Non-Functional Requirements](../09-non-functional-requirements.md#ultra-fast-validation-performance).

- **Hot reload performance** [CORE + LSP]: <100ms language switching
  - Pre-warmed LSP servers start early
  - Language contexts cached in memory
  - Validation results cached aggressively
  - Incremental compilation and rule parsing

- **Multi-layer caching** [CORE + LSP]: Zero-latency for common operations
  - Validation result cache (immediate access)
  - Compiled rule cache (skip parsing)
  - Language context cache (avoid reload)
  - Pattern recognition cache (accelerate matching)

- **Single-user optimization** [CORE + LSP]: Not cloud-scale, ultra-responsive individual
  - Adaptive memory allocation per language (optimized for system resources)
  - Direct execution vs worker threads where beneficial
  - Pre-warmed computation contexts
  - Aggressive prefetching of likely validations

## Intelligent Feedback

### Error Messages That Teach [LSP]
- **Problem identification**: Clear descriptions of what went wrong
- **Educational context**: Explanations of why issues matter
- **Solution guidance**: Actionable fix suggestions
- **Learning resources**: References to relevant concepts

### Contextual Suggestions [LSP]
- **Next step inference**: Analyze current state to suggest continuations
- **Alternative analysis**: Identify different proof approaches
- **Optimization hints**: Suggest cleaner proof structures
- **Gap detection**: Identify missing logical steps

### Progressive Assistance [LSP + PLATFORM]
- **Skill adaptation** [LSP]: Adjust feedback complexity to user level
- **UI customization** [PLATFORM]: Display appropriate interface elements
- **Learning tracking** [CORE]: Store user preference data
- **Dynamic adjustment** [LSP]: Evolve assistance based on usage patterns

## Validation Types

### Statement Flow Correctness [LSP]
- **Transformation rule validation**: Check proper statement transformation rule application
- **Input verification**: Ensure all required statements are available at processing points
- **Output checking**: Verify statement production follows transformation rules
- **Flow consistency analysis**: Detect statement routing contradictions

### Flow Network Validation [CORE + LSP]
- **Flow completeness checking** [LSP]: Identify missing statement pathways
- **Routing validation** [CORE]: Verify statement flow pathway references
- **Circular flow detection** [LSP]: Find circular statement routing patterns
- **Flow dependency validation** [CORE + LSP]: Ensure valid statement flow ordering

### Domain Flow Validation [LSP]
- **Custom routing rules**: Implement field-specific statement flow requirements
- **Flow notation checking**: Validate proper statement flow formatting
- **Flow compliance verification**: Check regulatory statement routing standards
- **Flow convention enforcement**: Apply domain statement flow best practices

## Visual Feedback

### Status Indicators [PLATFORM]
Platforms display validation status using appropriate visual cues:

**Generic Status Types** (determined by [LSP]):
- **Valid and complete**: All validation passes
- **Valid but incomplete**: No errors but missing elements
- **Errors present**: Validation failures detected
- **Not yet checked**: Awaiting validation

**Platform Implementations**:
- **Desktop (VS Code)**: Color-coded indicators in editor gutter
- **Mobile**: Status badges with haptic feedback
- **Web**: Icon-based status with tooltips

### Problem Highlighting [PLATFORM]
Platforms highlight issues based on LSP diagnostics:

**Generic Highlighting** (issues identified by [LSP]):
- **Inline indicators**: Mark problematic locations
- **Problem lists**: Aggregate all issues
- **Flow visualization**: Show error propagation
- **Complexity indicators**: Display analytical metrics

**Platform Implementations**:
- **Desktop (VS Code)**: Squiggly underlines and Problems panel
- **Mobile**: Touch-friendly error cards and swipe navigation
- **Web**: Hover tooltips and collapsible error panels

### Success Celebration [PLATFORM]
- **Completion effects**: Visual reward for valid proofs
- **Progress tracking**: Show proof advancement
- **Achievement system**: Recognize milestones
- **Sharing features**: Export successful proofs

## Educational Features

### Structured Learning Support [CORE + LSP]
Clear feedback and guidance that transform error recovery into accelerated learning opportunities:

```typescript
interface EducationalFeedbackRequest {
  method: 'education/provideFeedback';
  params: {
    studentError: ValidationError;
    currentProofState: ProofDocument;
    educationalContext: string;
  };
}

interface EducationalFeedbackResponse {
  explanation: ConceptualExplanation;
  suggestedSteps: CorrectionStep[];
  relatedExamples: ProofExample[];
  documentationLinks: string[];
}
```

**Comprehensive Error Explanation**:
- **Clear Error Messages**: Validation errors include domain-specific explanations
- **Example-Driven Learning**: Provide related examples that demonstrate correct usage
- **Concept Linkage**: Connect errors to relevant documentation and learning materials
- **Progressive Guidance**: Structure feedback to build understanding step by step

**Documentation-Based Learning Paths**:
- **Structured Examples**: Comprehensive example library organized by difficulty and concept
- **Concept Documentation**: Clear explanations of logical concepts with practical applications
- **Practice Problems**: Curated problem sets that reinforce key logical reasoning skills
- **Reference Materials**: Quick access to relevant logical rules and validation criteria

### Enhanced Error Analysis and Recovery [LSP]

```typescript
interface ErrorAnalysisRequest {
  method: 'validation/analyzeError';
  params: {
    error: ValidationError;
    proofContext: ProofDocument;
    logicalSystem: LogicalSystemInfo;
  };
}

interface ErrorAnalysisResult {
  errorClassification: ErrorType;
  correctionSuggestions: CorrectionStep[];
  conceptualReferences: DocumentationLink[];
  relatedExamples: ProofExample[];
}
```

**Comprehensive Error Understanding**:
- **Error Classification**: Categorize errors by type (syntax, logic, inference, etc.)
- **Context Analysis**: Analyze errors within the full proof context
- **Pattern Recognition**: Identify common error patterns and provide targeted guidance
- **Systematic Feedback**: Provide structured feedback that builds logical reasoning skills

**Structured Feedback Generation**:
- **Step-by-Step Guidance**: Break down corrections into manageable steps
- **Example-Based Learning**: Show correct examples that demonstrate proper reasoning
- **Documentation Integration**: Link to relevant concept explanations and rules
- **Practice Recommendations**: Suggest specific exercises to reinforce correct reasoning

### Learning Progress Tracking [CORE]

```typescript
interface ProgressTrackingRequest {
  method: 'education/trackProgress';
  params: {
    studentId: string;
    timeWindow: TimeRange;
    progressMetrics: string[];
  };
}

interface ProgressAnalysis {
  skillDevelopment: SkillProgress[];
  completedExercises: ExerciseCompletion[];
  errorPatterns: ErrorPattern[];
  recommendedPractice: PracticeRecommendation[];
}
```

**Systematic Progress Monitoring**:
- **Skill Development Tracking**: Monitor progress across different logical reasoning skills
- **Optimal Challenge**: Maintain learning in the zone of proximal development
- **Retention Monitoring**: Track long-term concept retention and provide timely reinforcement
- **Collaboration Opportunities**: Identify when peer learning would be most beneficial

**Metacognitive Development**:
- **Self-Assessment Training**: Help students develop accurate self-evaluation skills
- **Strategy Awareness**: Make logical reasoning strategies explicit and teachable
- **Reflection Prompts**: Generate questions that encourage metacognitive thinking
- **Goal Setting**: Support students in setting and achieving personal learning objectives

### Learning Mode [LSP + PLATFORM]
- **Error explanations** [LSP]: Generate detailed error breakdowns
- **Visual demonstrations** [PLATFORM]: Show error context visually
- **Practice generation** [LSP]: Create exercises for skill building
- **Concept references** [LSP]: Link to theoretical foundations

### Guided Validation [LSP + PLATFORM]
- **Incremental checking** [LSP]: Validate proof step-by-step
- **Progress recognition** [LSP]: Award credit for partial solutions
- **Hint generation** [LSP]: Provide contextual guidance
- **Path suggestions** [LSP]: Show possible proof directions

### Error Pattern Analysis [CORE + LSP]
- **Pattern detection** [LSP]: Identify common mistake types
- **User tracking** [CORE]: Store error history per user
- **Targeted assistance** [LSP]: Generate personalized help
- **Progress metrics** [CORE]: Track improvement over time

## Advanced Validation

### Custom Validators [LSP]
- **User-defined rules**: Extend validation with personal standards
  - Plugin system for custom validation logic
  - User-defined inference rule implementations
  - Personal style and convention enforcement

- **Team standards**: Share organizational validation rules
  - Configuration management for teams
  - Shared validation rule libraries
  - Organizational style guide enforcement

- **Research requirements**: Meet publication standards
  - Journal-specific validation rules
  - Citation and reference checking
  - Domain notation standards

- **Teaching constraints**: Educational validation modes
  - Assignment-specific rule sets
  - Grading integration support
  - Student progress tracking

### Flow Network Strategies [LSP]
- **Routing strategy recognition**: Identify statement flow approaches
  - Pattern-based routing strategy detection
  - Common flow technique identification
  - Flow strategy classification system

- **Alternative routing suggestions**: Explore different pathways
  - Generate alternative routing strategies
  - Compare flow approach effectiveness
  - Guide statement pathway exploration

- **Flow optimization analysis**: Improve routing efficiency
  - Detect redundant pathways
  - Suggest flow simplifications
  - Minimize statement routing complexity

- **Flow quality metrics**: Assess beyond correctness
  - Flow clarity and readability scores
  - Routing elegance measurements
  - Domain-specific flow quality criteria

### Meta-Flow-Validation [LSP]
- **Flow validator validation**: Verify custom flow validators work correctly
- **Flow consistency checking**: Ensure routing rule system coherence
- **Flow coverage analysis**: Measure flow validation completeness
- **Flow soundness verification**: Deep flow correctness checks

## Integration Possibilities

### External Tool Integration [LSP]
Connect with formal verification tools through LSP extensions:

```typescript
// Generic external validation interface
interface ExternalValidationRequest {
  proofContent: string;
  toolName: string;  // 'coq', 'lean', 'isabelle', etc.
  timeout: number;
  options?: Record<string, any>;
}
```

**Integration Features**:
- Plugin architecture for validation engines
- Domain-specific rule implementations
- Custom diagnostic formatting
- Configurable validation levels
- Batch processing support

### Collaborative Flow Validation [PLATFORM + LSP]

**Team Workflows**:
- **Automated flow validation** [LSP]: Integrate with CI/CD pipelines
- **Batch flow processing** [LSP]: Handle multiple flow networks efficiently
- **Flow history tracking** [CORE]: Store flow validation results over time
- **Flow comparison tools** [LSP]: Analyze different statement routing approaches

**Platform Implementations**:
- **Desktop**: Integration with Git, CI/CD tools
- **Mobile**: Cloud-based validation services
- **Web**: Browser-based validation APIs

## LSP Extension Points

### Custom LSP Requests
```typescript
// Domain-specific validation requests
interface CustomValidationRequest {
  method: 'proof/validateInferenceRule';
  params: {
    rule: string;
    premises: string[];
    conclusion: string;
    context: ProofContext;
  };
}

// Real-time suggestion requests
interface SuggestionRequest {
  method: 'proof/getSuggestions';
  params: {
    currentState: ProofState;
    position: CursorPosition;
    maxSuggestions: number;
  };
}
```

### Ultra-Fast Performance Targets
For comprehensive performance targets, timing requirements, and optimization strategies, see [Non-Functional Requirements](../09-non-functional-requirements.md#performance-requirements).

### Performance Architecture
```
Validation Request
       ↓
Cache Check (0ms) → Pattern Match (1-3ms) → JS Rule (2-5ms) → Result
                             ↑
                    Cache Miss Path Only
```

### Resource Limits (Single-User Optimization)
- **Memory per language**: Adaptive allocation (optimized for system resources)
- **Concurrent validations**: Unlimited (single user, no contention)
- **Cache size**: Generous (battery/memory not shared across users)
- **Pre-warming**: Aggressive (start early, cache everything)

## Philosophy

### Validation as Flow Teaching
Every routing error is a learning opportunity. The validation system doesn't just identify flow problems - it educates users about statement routing through intelligent feedback and constructive pathway suggestions.

### Encouraging Flow Exploration
Users should feel safe to experiment with statement routing. Validation guides rather than punishes, providing gentle correction and educational support that encourages learning through flow trial.

### Building Flow Confidence
Clear feedback builds understanding. Users develop their statement flow intuition through consistent, helpful validation that explains both what routing went wrong and why proper flow matters.

### Continuous Flow Improvement
The validation system evolves with usage, learning from common flow patterns to provide increasingly relevant assistance tailored to specific domains and statement routing needs.
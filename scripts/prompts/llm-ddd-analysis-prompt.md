# **Data-Driven DDD Analysis Prompt for LLM**

## **Instructions**

You are a senior Domain-Driven Design expert. I have provided you with pre-analyzed, structured data about a TypeScript codebase. Your job is to review this data and provide a comprehensive DDD analysis.

**IMPORTANT**: All the codebase analysis, dependency mapping, and file inspection has already been completed. You do NOT need to read individual files or perform dynamic analysis. Everything you need is in the provided JSON data.

## **Required Files**

Upload these files with your analysis:
1. `llm-analysis-input.json` - Complete structured analysis data
2. `llm-analysis-summary.md` - Human-readable overview

## **Verification Protocol**

Before starting your analysis, confirm you can access the data by answering these questions from the JSON:

1. **Data Access Verification**:
   - How many TypeScript files are in this codebase?
   - What are the main bounded contexts identified?
   - How many domain services were found?
   - What is the current test coverage percentage?

*Reference the `analysisPrompts.verificationQuestions` in the JSON for expected answers.*

## **Analysis Framework**

Using the provided structured data, analyze these DDD aspects:

### **1. Strategic Design Assessment**
- **Bounded Context Analysis**: Review `domainAnalysis.boundedContexts`
- **Context Boundary Violations**: Examine `dependencies.circularDependencies` 
- **Shared Kernel Health**: Assess `domainAnalysis.sharedKernel` size and contents

### **2. Tactical Design Issues**
- **Anemic Domain Models**: Analyze `domainAnalysis.anemicEntities` vs `domainAnalysis.richEntities`
- **Domain Service Overuse**: Review `domainAnalysis.domainServices` with focus on elimination
- **Aggregate Boundaries**: Examine dependency patterns in high-dependency files

### **3. Priority-Based Analysis**
- **Critical Issues**: Focus on `priorities.insights.highImpactLowCoverage` files
- **Foundational Files**: Examine `priorities.insights.foundational` for architectural importance
- **Orphaned Components**: Review `priorities.insights.orphans` for cleanup opportunities

## **Domain Service Elimination Protocol**

For each domain service in `domainAnalysis.domainServices`, analyze:

```json
{
  "service_analysis": {
    "service_name": "[from data]",
    "elimination_verdict": "ELIMINATE|KEEP|CONVERT_TO_APPLICATION_SERVICE", 
    "reasoning": "[based on methodCount, suspiciousPatterns, and dependency data]",
    "refactor_target": "[which entity should own this logic]",
    "business_justification": "[why this belongs elsewhere]"
  }
}
```

## **Expected Output Format**

```markdown
# DDD Analysis Report - Data-Driven Assessment

## Data Verification ✅
- **Files Analyzed**: [from JSON]
- **Bounded Contexts**: [from JSON]  
- **Domain Services**: [from JSON]
- **Test Coverage**: [from JSON]

## Strategic Design Issues

### Bounded Context Health
[Analysis based on domainAnalysis.boundedContexts and dependencies.circularDependencies]

### Shared Kernel Assessment  
[Analysis based on domainAnalysis.sharedKernel size and dependency patterns]

## Tactical Design Issues

### Critical: Anemic Domain Models
[Analysis based on domainAnalysis.anemicEntities with high anemiaScore]

**Evidence from Data**:
- Files with high anemia scores: [list from data]
- Business logic indicators: [from hasValidation and businessMethodCount]

### Critical: Domain Service Overuse
[Analysis of each service in domainAnalysis.domainServices]

**Service Elimination Analysis**:
[For each service, provide elimination verdict based on data]

### High Priority: Dependency Issues
[Analysis based on priorities.insights.highImpactLowCoverage]

**Files Requiring Immediate Attention**:
[List from priorities.insights with rationale]

## Implementation Roadmap

### Phase 1: Critical Issues (Week 1-2)
[Based on highest priority items from data]

### Phase 2: Architectural Improvements (Week 3-4)  
[Based on foundational files and dependency improvements]

### Phase 3: Technical Debt (Week 5+)
[Based on orphans and lower priority items]

## Architectural Recommendations

### Context Reorganization
[Based on circular dependencies and context boundaries]

### Service Elimination Plan  
[Specific plan for each domain service marked for elimination]

## Code Quality Metrics Summary
```json
{
  "ddd_compliance_score": "[calculated based on data analysis]",
  "anemic_model_percentage": "[from domainAnalysis]", 
  "domain_service_elimination_candidates": "[count from analysis]",
  "critical_dependency_violations": "[from circular deps]",
  "test_coverage_adequacy": "[from coverage summary]"
}
```

## Evidence Summary
[Reference specific data points from JSON that support each major finding]
```

## **Quality Assurance**

Your analysis must:
- ✅ Reference specific data from the provided JSON
- ✅ Provide concrete recommendations based on actual metrics
- ✅ Focus on actionable improvements with clear business impact
- ✅ Eliminate or justify every domain service found
- ✅ Prioritize issues based on the dependency and coverage analysis

## **Success Criteria**

A successful analysis will:
1. **Use the data**: Every finding references specific data points from the JSON
2. **Be actionable**: Recommendations include specific files and refactoring steps
3. **Be prioritized**: Issues ranked by business impact using the priority analysis
4. **Be comprehensive**: Address all major DDD concerns found in the data
5. **Be evidence-based**: Claims supported by metrics and dependency analysis

---

**Remember**: You're analyzing pre-processed data, not raw code. Focus on interpreting the structured information to provide strategic DDD guidance.
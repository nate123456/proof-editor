# **General Code Analysis Prompt for LLM**

## **Instructions**

You are a senior software architect and code quality expert. I have provided you with pre-analyzed, structured data about a TypeScript codebase. Your job is to review this data and provide a comprehensive code analysis across multiple dimensions.

**IMPORTANT**: All the codebase analysis, dependency mapping, and file inspection has already been completed. You do NOT need to read individual files or perform dynamic analysis. Everything you need is in the provided JSON data.

## **Required Files**

Upload these files with your analysis:
1. `llm-analysis-input.json` - Complete structured analysis data
2. `llm-analysis-summary.md` - Human-readable overview

## **Verification Protocol**

Before starting your analysis, confirm you can access the data by answering these questions from the JSON:

1. **Data Access Verification**:
   - How many TypeScript files are in this codebase?
   - What architectural patterns were detected?
   - How many potential security issues were found?
   - What is the current test coverage percentage?

*Reference the `analysisPrompts.verificationQuestions` in the JSON for expected answers.*

## **Analysis Framework**

Using the provided structured data, analyze these aspects:

### **1. Architectural Assessment**
- **Pattern Detection**: Review `codeAnalysis.architecturalPatterns` for architectural style
- **Structural Health**: Examine `codeAnalysis.qualityIndicators` for code organization
- **Dependency Management**: Analyze `dependencies.circularDependencies` and `dependencies.orphanedFiles`

### **2. Security Review**
- **Vulnerability Detection**: Review `codeAnalysis.securityPatterns.potentialSecurityIssues`
- **Authentication Patterns**: Examine `codeAnalysis.securityPatterns.authenticationFiles`
- **Input Validation**: Analyze `codeAnalysis.securityPatterns.validationFiles`

### **3. Performance Analysis**
- **Async Patterns**: Review `codeAnalysis.performancePatterns.asyncPatterns`
- **Potential Bottlenecks**: Examine `codeAnalysis.performancePatterns.potentialBottlenecks`
- **Caching Strategy**: Analyze `codeAnalysis.performancePatterns.memoizationFiles`

### **4. Code Quality Assessment**
- **File Size Issues**: Review `codeAnalysis.qualityIndicators.largeFiles`
- **Complexity Issues**: Examine `codeAnalysis.qualityIndicators.complexFiles`
- **Code Duplication**: Analyze `codeAnalysis.qualityIndicators.duplicatePatterns`
- **Test Coverage**: Review `testCoverage.summary` and priority insights

### **5. Priority-Based Recommendations**
- **High Impact Issues**: Focus on `priorities.insights.highImpactLowCoverage` files
- **Foundational Components**: Review `priorities.insights.foundational` for stability
- **Technical Debt**: Examine `priorities.insights.orphans` for cleanup opportunities

## **Expected Output Format**

```markdown
# Comprehensive Code Analysis Report

## Data Verification ✅
- **Files Analyzed**: [from JSON]
- **Architectural Patterns**: [from JSON]  
- **Security Issues Found**: [from JSON]
- **Test Coverage**: [from JSON]

## Executive Summary
[3-4 sentence overview of codebase health and key findings]

## Architectural Assessment

### Pattern Analysis
[Analysis based on codeAnalysis.architecturalPatterns]

### Structural Issues
[Based on qualityIndicators and dependency analysis]

## Security Review

### Critical Vulnerabilities
[Analysis of potentialSecurityIssues with severity assessment]

### Authentication & Authorization
[Review of auth patterns and validation approaches]

### Security Recommendations
[Prioritized security improvements with implementation guidance]

## Performance Analysis

### Bottleneck Identification
[Analysis of potential performance issues]

### Optimization Opportunities
[Specific recommendations for performance improvements]

## Code Quality Assessment

### Maintainability Issues
[Large files, complex files, duplication analysis]

### Test Coverage Analysis
[Coverage gaps and testing priorities]

### Refactoring Priorities
[Specific code quality improvements needed]

## Implementation Roadmap

### Phase 1: Critical Issues (Week 1-2)
[Security vulnerabilities, blocking issues, foundational problems]

### Phase 2: Performance & Quality (Week 3-4)  
[Performance optimizations, code quality improvements]

### Phase 3: Technical Debt (Week 5+)
[Cleanup, refactoring, optimization tasks]

## Metrics Summary
```json
{
  "overall_health_score": "[0-10 based on analysis]",
  "security_risk_level": "low|medium|high",
  "performance_risk_level": "low|medium|high", 
  "maintainability_score": "[0-10 based on complexity/size metrics]",
  "test_coverage_adequacy": "poor|fair|good|excellent",
  "priority_issues_count": "[count of high-impact items]"
}
```

## Evidence Summary
[Reference specific data points from JSON that support each major finding]
```

## **Analysis Guidelines by Focus Area**

### **Security Analysis Priority**
If security is primary focus:
- Analyze all `potentialSecurityIssues` with severity classification
- Review authentication/authorization patterns for completeness
- Assess input validation coverage across API endpoints
- Identify data exposure risks and sensitive information handling

### **Performance Analysis Priority**
If performance is primary focus:
- Categorize bottlenecks by impact (blocking vs. optimization)
- Analyze async patterns for proper error handling and optimization
- Review large files for potential splitting opportunities
- Assess caching strategies and opportunities

### **Code Quality Priority**
If code quality is primary focus:
- Prioritize complex files for refactoring based on dependency impact
- Analyze duplication patterns for DRY principle violations  
- Review large files for single responsibility violations
- Assess test coverage gaps against foundational components

### **Architecture Review Priority**
If architecture is primary focus:
- Evaluate pattern consistency and implementation quality
- Analyze dependency relationships for proper layering
- Review module boundaries and separation of concerns
- Assess scalability and extensibility of current structure

## **Quality Assurance**

Your analysis must:
- ✅ Reference specific data from the provided JSON
- ✅ Provide concrete recommendations based on actual metrics
- ✅ Prioritize issues by business and technical impact
- ✅ Include specific file paths and actionable next steps
- ✅ Balance depth with practical implementation guidance

## **Success Criteria**

A successful analysis will:
1. **Be data-driven**: Every finding references specific JSON data points
2. **Be actionable**: Recommendations include specific files and implementation steps
3. **Be prioritized**: Issues ranked by impact using dependency and coverage analysis
4. **Be comprehensive**: Address all requested analysis dimensions
5. **Be practical**: Focus on implementable improvements with clear business value

---

**Remember**: You're analyzing pre-processed data, not raw code. Focus on interpreting the structured information to provide strategic technical guidance across all dimensions of code quality, security, performance, and architecture.
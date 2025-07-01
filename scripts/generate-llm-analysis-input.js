#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Generates comprehensive LLM analysis input by combining:
 * - Source file collection
 * - Dependency analysis 
 * - Test coverage data
 * - Priority analysis
 * - Structured metadata
 */

function runCommand(cmd, options = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...options });
  } catch (error) {
    if (options.allowFailure) {
      return null;
    }
    console.error(`Command failed: ${cmd}`);
    console.error(error.message);
    return null;
  }
}

function collectSourceFiles() {
  console.log('📁 Collecting source files...');
  
  // Run our source file collector
  runCommand('node scripts/collect-source-files.js');
  
  if (!fs.existsSync('./llm-source-files.json')) {
    throw new Error('Source file collection failed');
  }
  
  const sourceData = JSON.parse(fs.readFileSync('./llm-source-files.json', 'utf8'));
  console.log(`✅ Collected ${sourceData.files.length} source files`);
  return sourceData;
}

function getDependencyAnalysis() {
  console.log('🔗 Analyzing dependencies...');
  
  try {
    // Get dependency data using madge
    const tempFile = './temp-madge-deps.json';
    runCommand(`npm run deps:json > ${tempFile}`, { allowFailure: true });
    
    let dependencies = {};
    if (fs.existsSync(tempFile)) {
      const depsContent = fs.readFileSync(tempFile, 'utf8');
      // Extract JSON from the output (madge includes other text)
      const jsonMatch = depsContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        dependencies = JSON.parse(jsonMatch[0]);
      }
      fs.unlinkSync(tempFile);
    }
    
    // Get circular dependencies
    const circularDeps = runCommand('npm run deps:circular', { allowFailure: true }) || '';
    const circularList = circularDeps
      .split('\n')
      .filter(line => line.trim() && !line.includes('No circular dependency found'))
      .map(line => line.trim());
    
    // Get orphaned files
    const orphanDeps = runCommand('npm run deps:orphans', { allowFailure: true }) || '';
    const orphanList = orphanDeps
      .split('\n')
      .filter(line => line.trim() && !line.includes('No orphan modules found'))
      .map(line => line.trim());
    
    // Build dependents map (reverse dependencies)
    const dependents = {};
    Object.entries(dependencies).forEach(([file, deps]) => {
      deps.forEach(dep => {
        if (!dependents[dep]) dependents[dep] = [];
        dependents[dep].push(file);
      });
    });
    
    console.log(`✅ Found ${Object.keys(dependencies).length} files with dependencies`);
    console.log(`⚠️  Found ${circularList.length} circular dependencies`);
    console.log(`🏝️  Found ${orphanList.length} orphaned files`);
    
    return {
      dependencies,
      dependents,
      circularDependencies: circularList,
      orphanedFiles: orphanList,
      stats: {
        totalFilesWithDeps: Object.keys(dependencies).length,
        circularCount: circularList.length,
        orphanCount: orphanList.length
      }
    };
  } catch (error) {
    console.warn('⚠️  Dependency analysis failed:', error.message);
    return {
      dependencies: {},
      dependents: {},
      circularDependencies: [],
      orphanedFiles: [],
      stats: { totalFilesWithDeps: 0, circularCount: 0, orphanCount: 0 }
    };
  }
}

function getCoverageAnalysis() {
  console.log('🧪 Analyzing test coverage...');
  
  try {
    // Run tests to generate coverage
    console.log('   Running tests for coverage data...');
    runCommand('npm test', { allowFailure: true });
    
    const coveragePath = './coverage/coverage-final.json';
    if (!fs.existsSync(coveragePath)) {
      console.warn('⚠️  No coverage data found');
      return { fileCoverage: {}, summary: null };
    }
    
    const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    const fileCoverage = {};
    let totalLines = 0, coveredLines = 0;
    let totalFunctions = 0, coveredFunctions = 0;
    let totalBranches = 0, coveredBranches = 0;
    let totalStatements = 0, coveredStatements = 0;
    
    Object.entries(coverageData).forEach(([filePath, data]) => {
      const relativePath = path.relative(process.cwd(), filePath);
      if (relativePath.startsWith('src/')) {
        const srcRelativePath = relativePath.replace(/^src\//, '');
        
        const { lines, functions, branches, statements } = data;
        const linesPct = (lines.covered / lines.total) * 100 || 0;
        const funcsPct = (functions.covered / functions.total) * 100 || 0;
        const branchesPct = (branches.covered / branches.total) * 100 || 0;
        const stmtsPct = (statements.covered / statements.total) * 100 || 0;
        const avgCoverage = (linesPct + funcsPct + branchesPct + stmtsPct) / 4;
        
        fileCoverage[srcRelativePath] = {
          coverage: Math.round(avgCoverage * 100) / 100,
          lines: Math.round(linesPct * 100) / 100,
          functions: Math.round(funcsPct * 100) / 100,
          branches: Math.round(branchesPct * 100) / 100,
          statements: Math.round(stmtsPct * 100) / 100,
          totals: { 
            lines: lines.total, 
            functions: functions.total, 
            branches: branches.total, 
            statements: statements.total 
          },
          covered: {
            lines: lines.covered,
            functions: functions.covered,
            branches: branches.covered,
            statements: statements.covered
          }
        };
        
        // Accumulate totals
        totalLines += lines.total;
        coveredLines += lines.covered;
        totalFunctions += functions.total;
        coveredFunctions += functions.covered;
        totalBranches += branches.total;
        coveredBranches += branches.covered;
        totalStatements += statements.total;
        coveredStatements += statements.covered;
      }
    });
    
    const summary = {
      lines: Math.round((coveredLines / totalLines) * 10000) / 100 || 0,
      functions: Math.round((coveredFunctions / totalFunctions) * 10000) / 100 || 0,
      branches: Math.round((coveredBranches / totalBranches) * 10000) / 100 || 0,
      statements: Math.round((coveredStatements / totalStatements) * 10000) / 100 || 0,
      totals: { totalLines, totalFunctions, totalBranches, totalStatements },
      covered: { coveredLines, coveredFunctions, coveredBranches, coveredStatements }
    };
    
    console.log(`✅ Coverage analysis complete - ${summary.lines}% line coverage`);
    return { fileCoverage, summary };
  } catch (error) {
    console.warn('⚠️  Coverage analysis failed:', error.message);
    return { fileCoverage: {}, summary: null };
  }
}

function getTestPriorityAnalysis(dependencies, dependents, coverage) {
  console.log('🎯 Calculating test priorities...');
  
  try {
    // Get all TypeScript files
    const allFiles = runCommand('find src -name "*.ts" -type f')
      .trim()
      .split('\n')
      .map(f => f.replace(/^src\//, ''))
      .filter(f => f && !f.includes('.d.ts') && !f.includes('.test.'));
    
    const priorities = allFiles.map(file => {
      const dependentCount = (dependents[file] || []).length;
      const dependencyCount = (dependencies[file] || []).length;
      const coveragePct = coverage[file]?.coverage || 0;
      
      // Priority calculation from existing script
      const dependentScore = dependentCount * 10;
      const coverageScore = (100 - coveragePct) * 2;
      const simplicityScore = Math.max(0, 10 - dependencyCount);
      const totalScore = dependentScore + coverageScore + simplicityScore;
      
      return {
        file,
        score: Math.round(totalScore * 100) / 100,
        dependentCount,
        dependencyCount,
        coverage: coveragePct,
        priority: dependentCount >= 5 ? 'foundational' : 
                 dependentCount >= 3 && coveragePct < 50 ? 'high-impact-low-coverage' :
                 dependentCount === 0 && dependencyCount === 0 ? 'orphan' :
                 'normal'
      };
    });
    
    priorities.sort((a, b) => b.score - a.score);
    
    const insights = {
      foundational: priorities.filter(p => p.dependentCount >= 5),
      highImpactLowCoverage: priorities.filter(p => p.dependentCount >= 3 && p.coverage < 50),
      orphans: priorities.filter(p => p.dependentCount === 0 && p.dependencyCount === 0),
      topPriority: priorities.slice(0, 10)
    };
    
    console.log(`✅ Priority analysis complete - ${insights.foundational.length} foundational files identified`);
    return { priorities, insights };
  } catch (error) {
    console.warn('⚠️  Priority analysis failed:', error.message);
    return { priorities: [], insights: {} };
  }
}

function generateCodeAnalysisMetadata(sourceData, depAnalysis, coverage) {
  console.log('🏗️  Generating code analysis metadata...');
  
  const { files, categories } = sourceData;
  
  // General code structure analysis
  const codeStructure = {
    // Architecture patterns
    architecturalPatterns: {
      layeredArchitecture: files.some(f => f.path.includes('/domain/') || f.path.includes('/application/') || f.path.includes('/infrastructure/')),
      hexagonalArchitecture: files.some(f => f.path.includes('/ports/') || f.path.includes('/adapters/')),
      microservices: files.some(f => f.path.includes('/services/') && f.path.includes('/api/')),
      eventDriven: categories.events.length > 0,
      ddd: files.some(f => f.path.includes('/domain/') && (f.path.includes('/entities/') || f.path.includes('/value-objects/')))
    },
    
    // DDD-specific analysis (if applicable)
    domainDrivenDesign: {
      boundedContexts: [],
      sharedKernel: [],
      domainServices: [],
      anemicEntities: [],
      richEntities: [],
      aggregateRoots: [],
      valueObjects: categories.valueObjects,
      repositories: categories.repositories,
      events: categories.events
    },
    
    // Security patterns
    securityPatterns: {
      authenticationFiles: files.filter(f => 
        f.content.toLowerCase().includes('auth') || 
        f.content.toLowerCase().includes('token') ||
        f.content.toLowerCase().includes('jwt')
      ).map(f => f.path),
      
      validationFiles: files.filter(f => 
        f.content.includes('validate') || 
        f.content.includes('sanitize') ||
        f.content.includes('schema')
      ).map(f => f.path),
      
      potentialSecurityIssues: files.filter(f => 
        f.content.includes('eval(') ||
        f.content.includes('innerHTML') ||
        f.content.includes('document.write') ||
        f.content.includes('setTimeout(') && f.content.includes('string')
      ).map(f => f.path)
    },
    
    // Performance patterns
    performancePatterns: {
      asyncPatterns: files.filter(f => 
        f.content.includes('async ') || 
        f.content.includes('Promise') ||
        f.content.includes('await ')
      ).length,
      
      memoizationFiles: files.filter(f => 
        f.content.includes('memo') || 
        f.content.includes('cache') ||
        f.content.includes('Cache')
      ).map(f => f.path),
      
      potentialBottlenecks: files.filter(f => 
        f.content.includes('forEach') && f.lineCount > 100 ||
        f.content.includes('find(') && f.content.includes('filter(') ||
        (f.content.match(/for\s*\(/g) || []).length > 3
      ).map(f => f.path)
    },
    
    // Code quality indicators
    qualityIndicators: {
      largeFiles: files.filter(f => f.lineCount > 500).map(f => ({
        path: f.path,
        lines: f.lineCount,
        size: f.size
      })),
      
      complexFiles: files.filter(f => {
        const cyclomaticComplexity = (f.content.match(/\b(if|for|while|switch|catch|&&|\|\|)\b/g) || []).length;
        return cyclomaticComplexity > 20;
      }).map(f => f.path),
      
      duplicatePatterns: findPotentialDuplication(files),
      
      testCoverage: Object.entries(coverage).map(([file, data]) => ({
        file,
        coverage: data.coverage || 0,
        hasTests: files.some(f => f.path.includes(file.replace('.ts', '.test.ts')))
      }))
    }
  };
  
  // DDD-specific analysis if domain structure detected
  if (codeStructure.architecturalPatterns.ddd) {
    const dddAnalysis = generateDDDSpecificAnalysis(files, categories, depAnalysis);
    codeStructure.domainDrivenDesign = { ...codeStructure.domainDrivenDesign, ...dddAnalysis };
  }
  
  return codeStructure;
}

function generateDDDSpecificAnalysis(files, categories, depAnalysis) {
  // Identify bounded contexts from directory structure
  const contextDirs = new Set();
  files.forEach(file => {
    const pathParts = file.path.split('/');
    if (pathParts.includes('domain') && pathParts.length > 2) {
      const domainIndex = pathParts.indexOf('domain');
      if (domainIndex + 1 < pathParts.length) {
        contextDirs.add(pathParts[domainIndex + 1]);
      }
    }
  });
  
  // Identify shared kernel
  const sharedKernel = files
    .filter(f => f.path.includes('shared-kernel/') || f.path.includes('shared/'))
    .map(f => f.path);
  
  // Analyze domain services
  const domainServices = categories.services.map(servicePath => {
    const serviceFile = files.find(f => f.path === servicePath);
    if (!serviceFile) return null;
    
    const methodCount = (serviceFile.content.match(/\s+\w+\s*\([^)]*\)\s*[:{\n]/g) || []).length;
    const hasBusinessLogic = serviceFile.content.includes('validate') || 
                            serviceFile.content.includes('calculate') ||
                            serviceFile.content.includes('process');
    
    return {
      path: servicePath,
      methodCount,
      hasBusinessLogic,
      linesOfCode: serviceFile.lineCount,
      dependents: (depAnalysis.dependents[servicePath] || []).length,
      suspiciousPatterns: [
        serviceFile.content.includes('set') && serviceFile.content.includes('get') ? 'anemic-helper' : null,
        methodCount > 10 ? 'god-service' : null,
        serviceFile.content.toLowerCase().includes('manager') ? 'manager-pattern' : null
      ].filter(Boolean)
    };
  }).filter(Boolean);
  
  // Analyze entities for anemic patterns
  const anemicEntities = [];
  const richEntities = [];
  
  categories.entities.forEach(entityPath => {
    const entityFile = files.find(f => f.path === entityPath);
    if (!entityFile) return;
    
    const getterSetterCount = (entityFile.content.match(/\s+get\s+\w+\(\)|set\s+\w+\(/g) || []).length;
    const businessMethodCount = (entityFile.content.match(/\s+\w+\s*\([^)]*\)\s*[:{\n]/g) || []).length - getterSetterCount;
    const hasValidation = entityFile.content.includes('validate') || entityFile.content.includes('invariant');
    
    const analysis = {
      path: entityPath,
      getterSetterCount,
      businessMethodCount,
      hasValidation,
      linesOfCode: entityFile.lineCount,
      anemiaScore: getterSetterCount > businessMethodCount ? (getterSetterCount / Math.max(businessMethodCount, 1)) : 0
    };
    
    if (analysis.anemiaScore > 2) {
      anemicEntities.push(analysis);
    } else {
      richEntities.push(analysis);
    }
  });
  
  return {
    boundedContexts: Array.from(contextDirs),
    sharedKernel,
    domainServices,
    anemicEntities,
    richEntities
  };
}

function findPotentialDuplication(files) {
  // Simple heuristic for finding potential code duplication
  const duplicates = [];
  const codeBlocks = new Map();
  
  files.forEach(file => {
    const lines = file.content.split('\n');
    for (let i = 0; i < lines.length - 5; i++) {
      const block = lines.slice(i, i + 5).join('\n').trim();
      if (block.length > 50 && !block.includes('//') && !block.includes('*')) {
        if (codeBlocks.has(block)) {
          codeBlocks.get(block).push({ file: file.path, startLine: i + 1 });
        } else {
          codeBlocks.set(block, [{ file: file.path, startLine: i + 1 }]);
        }
      }
    }
  });
  
  codeBlocks.forEach((locations, block) => {
    if (locations.length > 1) {
      duplicates.push({
        blockPreview: block.substring(0, 100) + '...',
        locations
      });
    }
  });
  
  return duplicates.slice(0, 10); // Limit to top 10 potential duplicates
}

function main() {
  console.log('🚀 Generating comprehensive LLM analysis input...\n');
  
  try {
    // Collect all analysis data
    const sourceData = collectSourceFiles();
    const depAnalysis = getDependencyAnalysis();
    const { fileCoverage, summary: coverageSummary } = getCoverageAnalysis();
    const { priorities, insights } = getTestPriorityAnalysis(
      depAnalysis.dependencies, 
      depAnalysis.dependents, 
      fileCoverage
    );
    const codeAnalysis = generateCodeAnalysisMetadata(sourceData, depAnalysis, fileCoverage);
    
    // Combine into comprehensive analysis input
    const analysisInput = {
      metadata: {
        generatedAt: new Date().toISOString(),
        analysisVersion: '1.0.0',
        project: 'proof-editor',
        description: 'Comprehensive codebase analysis for LLM-powered multi-dimensional review'
      },
      
      summary: {
        totalFiles: sourceData.files.length,
        totalLines: sourceData.metadata.totalLines,
        totalSize: sourceData.metadata.totalSize,
        testCoverage: coverageSummary,
        dependencyStats: depAnalysis.stats,
        architecturalHealth: {
          patterns: codeAnalysis.architecturalPatterns,
          domainModelHealth: codeAnalysis.domainDrivenDesign ? {
            boundedContexts: codeAnalysis.domainDrivenDesign.boundedContexts.length,
            domainServices: codeAnalysis.domainDrivenDesign.domainServices.length,
            anemicEntities: codeAnalysis.domainDrivenDesign.anemicEntities.length,
            richEntities: codeAnalysis.domainDrivenDesign.richEntities.length,
            sharedKernelSize: codeAnalysis.domainDrivenDesign.sharedKernel.length
          } : null,
          qualityIndicators: {
            largeFiles: codeAnalysis.qualityIndicators.largeFiles.length,
            complexFiles: codeAnalysis.qualityIndicators.complexFiles.length,
            duplicatePatterns: codeAnalysis.qualityIndicators.duplicatePatterns.length,
            securityIssues: codeAnalysis.securityPatterns.potentialSecurityIssues.length
          }
        }
      },
      
      sourceFiles: {
        files: sourceData.files,
        categories: sourceData.categories,
        errorFiles: sourceData.errorFiles
      },
      
      dependencies: {
        graph: depAnalysis.dependencies,
        dependents: depAnalysis.dependents,
        circularDependencies: depAnalysis.circularDependencies,
        orphanedFiles: depAnalysis.orphanedFiles
      },
      
      testCoverage: {
        fileCoverage,
        summary: coverageSummary
      },
      
      priorities: {
        ranking: priorities,
        insights
      },
      
      codeAnalysis,
      
      analysisPrompts: {
        verificationQuestions: [
          `How many TypeScript files are in this codebase? (Expected: ${sourceData.files.length})`,
          `What architectural patterns were detected? (Expected: ${Object.entries(codeAnalysis.architecturalPatterns).filter(([k,v]) => v).map(([k,v]) => k).join(', ') || 'None'})`,
          `How many potential security issues were found? (Expected: ${codeAnalysis.securityPatterns.potentialSecurityIssues.length})`,
          `What is the current test coverage? (Expected: ${coverageSummary?.lines || 0}% lines)`
        ],
        
        analysisTypes: {
          domainDrivenDesign: codeAnalysis.architecturalPatterns.ddd,
          securityReview: true,
          performanceAudit: true,
          codeQuality: true,
          architecturalAssessment: true
        },
        
        focusAreas: [
          'Architectural pattern analysis',
          'Code quality assessment',
          'Security vulnerability detection',
          'Performance bottleneck identification',
          'Dependency management review',
          'Test coverage analysis'
        ]
      }
    };
    
    // Write comprehensive analysis input
    const outputPath = './llm-analysis-input.json';
    fs.writeFileSync(outputPath, JSON.stringify(analysisInput, null, 2));
    
    // Write human-readable summary
    const summaryPath = './llm-analysis-summary.md';
    const summaryContent = `# LLM Analysis Input Summary

Generated: ${new Date().toISOString()}

## Codebase Overview
- **Files**: ${analysisInput.summary.totalFiles}
- **Lines**: ${analysisInput.summary.totalLines.toLocaleString()}
- **Size**: ${(analysisInput.summary.totalSize / 1024).toFixed(1)} KB

## Test Coverage
${coverageSummary ? `
- **Lines**: ${coverageSummary.lines}%
- **Functions**: ${coverageSummary.functions}%
- **Branches**: ${coverageSummary.branches}%
- **Statements**: ${coverageSummary.statements}%
` : '- No coverage data available'}

## Architectural Analysis
- **Patterns Detected**: ${Object.entries(codeAnalysis.architecturalPatterns).filter(([k,v]) => v).map(([k,v]) => k).join(', ') || 'None'}
- **Quality Issues**: ${codeAnalysis.qualityIndicators.largeFiles.length} large files, ${codeAnalysis.qualityIndicators.complexFiles.length} complex files
- **Security Issues**: ${codeAnalysis.securityPatterns.potentialSecurityIssues.length} potential vulnerabilities
- **Performance**: ${codeAnalysis.performancePatterns.potentialBottlenecks.length} potential bottlenecks

${codeAnalysis.architecturalPatterns.ddd ? `## Domain Model Health (DDD Detected)
- **Bounded Contexts**: ${codeAnalysis.domainDrivenDesign.boundedContexts.length} (${codeAnalysis.domainDrivenDesign.boundedContexts.join(', ') || 'None'})
- **Domain Services**: ${codeAnalysis.domainDrivenDesign.domainServices.length}
- **Anemic Entities**: ${codeAnalysis.domainDrivenDesign.anemicEntities.length}
- **Rich Entities**: ${codeAnalysis.domainDrivenDesign.richEntities.length}
- **Shared Kernel Size**: ${codeAnalysis.domainDrivenDesign.sharedKernel.length} files` : ''}

## Dependency Analysis
- **Circular Dependencies**: ${depAnalysis.stats.circularCount}
- **Orphaned Files**: ${depAnalysis.stats.orphanCount}
- **Files with Dependencies**: ${depAnalysis.stats.totalFilesWithDeps}

## High Priority Issues
${insights.highImpactLowCoverage.length > 0 ? `
### High Impact, Low Coverage Files:
${insights.highImpactLowCoverage.slice(0, 5).map(f => `- ${f.file} (${f.dependentCount} dependents, ${f.coverage}% coverage)`).join('\n')}
` : '- None identified'}
${codeAnalysis.architecturalPatterns.ddd && codeAnalysis.domainDrivenDesign.domainServices.length > 0 ? `
### Domain Services for Review:
${codeAnalysis.domainDrivenDesign.domainServices.slice(0, 5).map(s => `- ${s.path} (${s.methodCount} methods, ${s.suspiciousPatterns.join(', ') || 'no patterns'})`).join('\n')}
` : ''}

${codeAnalysis.securityPatterns.potentialSecurityIssues.length > 0 ? `
### Security Issues for Review:
${codeAnalysis.securityPatterns.potentialSecurityIssues.slice(0, 5).map(file => `- ${file}`).join('\n')}
` : ''}

${codeAnalysis.qualityIndicators.largeFiles.length > 0 ? `
### Large Files Needing Review:
${codeAnalysis.qualityIndicators.largeFiles.slice(0, 5).map(f => `- ${f.path} (${f.lines} lines)`).join('\n')}
` : ''}

## Verification Questions for LLM
${analysisInput.analysisPrompts.verificationQuestions.map(q => `- ${q}`).join('\n')}

---
*This analysis input is ready for LLM consumption. Use the JSON file for structured analysis.*
`;
    
    fs.writeFileSync(summaryPath, summaryContent);
    
    console.log('\n✅ ANALYSIS INPUT GENERATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`📊 Comprehensive data: ${outputPath}`);
    console.log(`📋 Human summary: ${summaryPath}`);
    console.log(`📦 Total data size: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
    
    console.log('\n🎯 READY FOR LLM ANALYSIS');
    console.log('Upload the following files to your LLM:');
    console.log(`1. ${outputPath} (primary analysis data)`);
    console.log(`2. ${summaryPath} (human-readable context)`);
    
    // Cleanup temp files
    ['./llm-source-files.json', './temp-madge-deps.json'].forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
    
  } catch (error) {
    console.error('❌ Analysis generation failed:', error.message);
    process.exit(1);
  }
}

main();
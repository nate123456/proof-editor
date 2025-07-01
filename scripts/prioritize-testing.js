#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Script to prioritize files for testing based on:
 * 1. Position in dependency tree (foundational files = higher priority)
 * 2. Current test coverage (low coverage = higher priority) 
 * 3. Number of dependents (more dependents = higher impact)
 */

function runCommand(cmd, options = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...options });
  } catch (error) {
    if (options.allowFailure) {
      return null;
    }
    throw error;
  }
}

function getDependencyData() {
  console.log('📊 Analyzing dependency tree...');
  
  try {
    // Write madge output to temp file to avoid output size limits
    const tempFile = './madge-deps.json';
    runCommand(`npx madge --json --extensions ts --exclude "^node_modules" src > ${tempFile}`, { allowFailure: true });
    
    if (!fs.existsSync(tempFile)) {
      console.log('⚠️  No dependency data available');
      return { dependencies: {}, dependents: {} };
    }

    const depsJson = fs.readFileSync(tempFile, 'utf8');
    fs.unlinkSync(tempFile); // Clean up temp file
    
    const dependencies = JSON.parse(depsJson);
    const dependents = {};
    
    // Build reverse dependency map (who depends on each file)
    Object.entries(dependencies).forEach(([file, deps]) => {
      deps.forEach(dep => {
        if (!dependents[dep]) dependents[dep] = [];
        dependents[dep].push(file);
      });
    });

    return { dependencies, dependents };
  } catch (error) {
    console.log('⚠️  Failed to parse dependency data:', error.message);
    return { dependencies: {}, dependents: {} };
  }
}

function getCoverageData() {
  console.log('🧪 Getting coverage data...');
  
  // Run tests with coverage to generate coverage data
  runCommand('npm run test', { allowFailure: true });
  
  const coveragePath = './coverage/coverage-final.json';
  if (!fs.existsSync(coveragePath)) {
    console.log('⚠️  No coverage data found. Run `npm test` first.');
    return {};
  }

  try {
    const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    const fileCoverage = {};
    
    Object.entries(coverageData).forEach(([filePath, data]) => {
      // Convert absolute path to relative path from src/
      const relativePath = path.relative(process.cwd(), filePath);
      if (relativePath.startsWith('src/')) {
        const srcRelativePath = relativePath.replace(/^src\//, '');
        
        // Calculate average coverage percentage
        const { lines, functions, branches, statements } = data;
        const linesPct = (lines.covered / lines.total) * 100 || 0;
        const funcsPct = (functions.covered / functions.total) * 100 || 0;
        const branchesPct = (branches.covered / branches.total) * 100 || 0;
        const stmtsPct = (statements.covered / statements.total) * 100 || 0;
        
        const avgCoverage = (linesPct + funcsPct + branchesPct + stmtsPct) / 4;
        
        fileCoverage[srcRelativePath] = {
          coverage: Math.round(avgCoverage * 100) / 100,
          lines: linesPct,
          functions: funcsPct,
          branches: branchesPct,
          statements: stmtsPct,
          totals: { lines: lines.total, functions: functions.total, branches: branches.total, statements: statements.total }
        };
      }
    });
    
    return fileCoverage;
  } catch (error) {
    console.log('⚠️  Failed to parse coverage data:', error.message);
    return {};
  }
}

function calculatePriority(file, dependents, dependencies, coverage) {
  // Base priority factors
  const dependentCount = (dependents[file] || []).length;
  const dependencyCount = (dependencies[file] || []).length;
  const coveragePct = coverage[file]?.coverage || 0;
  
  // Priority calculation:
  // - More dependents = higher priority (foundational impact)
  // - Lower coverage = higher priority (more need for testing)
  // - Fewer dependencies = slightly higher priority (easier to test in isolation)
  
  const dependentScore = dependentCount * 10; // Heavy weight for impact
  const coverageScore = (100 - coveragePct) * 2; // Higher score for lower coverage
  const simplicityScore = Math.max(0, 10 - dependencyCount); // Bonus for simpler files
  
  const totalScore = dependentScore + coverageScore + simplicityScore;
  
  return {
    score: Math.round(totalScore * 100) / 100,
    dependentCount,
    dependencyCount,
    coverage: coveragePct,
    reasons: [
      dependentCount > 0 ? `${dependentCount} dependent files` : 'No dependents',
      `${Math.round(coveragePct)}% coverage`,
      `${dependencyCount} dependencies`
    ]
  };
}

function main() {
  console.log('🎯 Analyzing test priorities...\n');
  
  const { dependencies, dependents } = getDependencyData();
  const coverage = getCoverageData();
  
  // Get all TypeScript files in src/
  const allFiles = runCommand('find src -name "*.ts" -type f')
    .trim()
    .split('\n')
    .map(f => f.replace(/^src\//, ''))
    .filter(f => f && !f.includes('.d.ts') && !f.includes('.test.'));
  
  console.log(`\n📋 Found ${allFiles.length} TypeScript files\n`);
  
  // Calculate priorities for all files
  const priorities = allFiles.map(file => {
    const priority = calculatePriority(file, dependents, dependencies, coverage);
    return { file, ...priority };
  });
  
  // Sort by priority score (highest first)
  priorities.sort((a, b) => b.score - a.score);
  
  // Output results
  console.log('🏆 TEST PRIORITY RANKING');
  console.log('=' .repeat(80));
  console.log('Rank | Score | File | Coverage | Dependents | Dependencies | Rationale');
  console.log('-'.repeat(80));
  
  priorities.slice(0, 20).forEach((item, index) => {
    const rank = (index + 1).toString().padStart(2);
    const score = item.score.toString().padStart(5);
    const coverage = `${Math.round(item.coverage)}%`.padStart(4);
    const dependents = item.dependentCount.toString().padStart(3);
    const dependencies = item.dependencyCount.toString().padStart(3);
    const rationale = item.reasons.join(', ');
    
    console.log(`${rank}   | ${score} | ${item.file.padEnd(40)} | ${coverage}     | ${dependents}        | ${dependencies}          | ${rationale}`);
  });
  
  console.log('\n💡 INSIGHTS:');
  
  const highImpactLowCoverage = priorities.filter(p => p.dependentCount >= 3 && p.coverage < 50);
  if (highImpactLowCoverage.length > 0) {
    console.log(`🚨 ${highImpactLowCoverage.length} high-impact files with <50% coverage need immediate attention`);
  }
  
  const orphans = priorities.filter(p => p.dependentCount === 0 && p.dependencyCount === 0);
  if (orphans.length > 0) {
    console.log(`🧹 ${orphans.length} orphaned files could be candidates for cleanup`);
  }
  
  const foundational = priorities.filter(p => p.dependentCount >= 5);
  if (foundational.length > 0) {
    console.log(`🏗️  ${foundational.length} foundational files (5+ dependents) - test these first for maximum impact`);
  }
  
  console.log('\n📈 Next steps:');
  console.log('1. Focus on top 5-10 files from this list');
  console.log('2. Write tests for foundational files first');
  console.log('3. Re-run this script after adding tests to see progress');
  console.log('4. Use `npm run test:watch` while developing tests');
}

// Run main function if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
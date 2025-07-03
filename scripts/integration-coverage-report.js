#!/usr/bin/env node

/**
 * Integration Test Coverage Analysis Script
 * 
 * Analyzes test coverage specifically for service layers and integration points
 * between bounded contexts to ensure 95% coverage target is met.
 */

const fs = require('fs');
const path = require('path');

/**
 * Service layer paths to analyze for coverage
 */
const SERVICE_LAYER_PATHS = [
  // Core Domain Services
  'src/domain/services/',
  
  // Language Intelligence Services
  'src/contexts/language-intelligence/domain/services/',
  
  // Package Ecosystem Services
  'src/contexts/package-ecosystem/domain/services/',
  
  // Synchronization Services
  'src/contexts/synchronization/domain/services/',
  
  // Analysis Services (if exists)
  'src/contexts/analysis/domain/services/',
];

/**
 * Integration test files that should provide coverage
 */
const INTEGRATION_TEST_PATHS = [
  'src/__tests__/integration/',
  'src/contexts/*/domain/__tests__/integration/',
];

/**
 * Find all service files that need coverage
 */
function findServiceFiles() {
  const serviceFiles = [];
  
  for (const servicePath of SERVICE_LAYER_PATHS) {
    const fullPath = path.join(process.cwd(), servicePath);
    
    if (fs.existsSync(fullPath)) {
      const files = fs.readdirSync(fullPath, { recursive: true })
        .filter(file => file.endsWith('.ts') && !file.endsWith('.test.ts'))
        .map(file => path.join(servicePath, file));
      
      serviceFiles.push(...files);
    }
  }
  
  return serviceFiles;
}

/**
 * Find all integration test files
 */
function findIntegrationTests() {
  const testFiles = [];
  
  // Find integration test files in main test directory
  const mainTestPath = path.join(process.cwd(), 'src/__tests__/integration/');
  if (fs.existsSync(mainTestPath)) {
    const files = fs.readdirSync(mainTestPath)
      .filter(file => file.endsWith('.test.ts'))
      .map(file => path.join('src/__tests__/integration/', file));
    
    testFiles.push(...files);
  }
  
  // Find integration test files in bounded contexts
  const contextsPath = path.join(process.cwd(), 'src/contexts/');
  if (fs.existsSync(contextsPath)) {
    const contexts = fs.readdirSync(contextsPath);
    
    for (const context of contexts) {
      const integrationTestPath = path.join(
        contextsPath, 
        context, 
        'domain/__tests__/integration/'
      );
      
      if (fs.existsSync(integrationTestPath)) {
        const files = fs.readdirSync(integrationTestPath)
          .filter(file => file.endsWith('.test.ts'))
          .map(file => path.join(`src/contexts/${context}/domain/__tests__/integration/`, file));
        
        testFiles.push(...files);
      }
    }
  }
  
  return testFiles;
}

/**
 * Analyze test coverage based on service imports
 */
function analyzeTestCoverage() {
  const serviceFiles = findServiceFiles();
  const testFiles = findIntegrationTests();
  
  console.log('=== INTEGRATION TEST COVERAGE ANALYSIS ===\n');
  
  console.log(`📊 Service Layer Files to Cover: ${serviceFiles.length}`);
  console.log(`🧪 Integration Test Files: ${testFiles.length}\n`);
  
  // Track which services are covered by tests
  const serviceCoverage = new Map();
  serviceFiles.forEach(service => serviceCoverage.set(service, { covered: false, tests: [] }));
  
  // Analyze each test file for service imports
  for (const testFile of testFiles) {
    const fullTestPath = path.join(process.cwd(), testFile);
    
    if (fs.existsSync(fullTestPath)) {
      const testContent = fs.readFileSync(fullTestPath, 'utf8');
      
      // Find service imports in test files
      for (const serviceFile of serviceFiles) {
        const serviceName = path.basename(serviceFile, '.ts');
        
        // Check if service is imported in test
        if (testContent.includes(serviceName)) {
          const coverage = serviceCoverage.get(serviceFile);
          coverage.covered = true;
          coverage.tests.push(testFile);
          serviceCoverage.set(serviceFile, coverage);
        }
      }
    }
  }
  
  // Calculate coverage statistics
  const coveredServices = Array.from(serviceCoverage.values()).filter(c => c.covered);
  const uncoveredServices = Array.from(serviceCoverage.entries()).filter(([_, c]) => !c.covered);
  const coveragePercentage = (coveredServices.length / serviceFiles.length) * 100;
  
  console.log('=== COVERAGE SUMMARY ===\n');
  console.log(`✅ Covered Services: ${coveredServices.length}/${serviceFiles.length}`);
  console.log(`❌ Uncovered Services: ${uncoveredServices.length}`);
  console.log(`📈 Coverage Percentage: ${coveragePercentage.toFixed(1)}%`);
  
  if (coveragePercentage >= 95) {
    console.log(`🎉 TARGET ACHIEVED: Coverage exceeds 95% threshold!`);
  } else {
    const needed = Math.ceil((0.95 * serviceFiles.length) - coveredServices.length);
    console.log(`🎯 TARGET NEEDED: ${needed} more services need coverage to reach 95%`);
  }
  
  console.log('\n=== DETAILED COVERAGE ANALYSIS ===\n');
  
  // Group by bounded context
  const contextGroups = {};
  
  for (const [serviceFile, coverage] of serviceCoverage.entries()) {
    let context = 'Core Domain';
    
    if (serviceFile.includes('language-intelligence')) {
      context = 'Language Intelligence';
    } else if (serviceFile.includes('package-ecosystem')) {
      context = 'Package Ecosystem';
    } else if (serviceFile.includes('synchronization')) {
      context = 'Synchronization';
    } else if (serviceFile.includes('analysis')) {
      context = 'Analysis';
    }
    
    if (!contextGroups[context]) {
      contextGroups[context] = { covered: [], uncovered: [] };
    }
    
    if (coverage.covered) {
      contextGroups[context].covered.push({ service: serviceFile, tests: coverage.tests });
    } else {
      contextGroups[context].uncovered.push(serviceFile);
    }
  }
  
  // Report by context
  for (const [context, group] of Object.entries(contextGroups)) {
    const total = group.covered.length + group.uncovered.length;
    const contextCoverage = (group.covered.length / total) * 100;
    
    console.log(`\n📋 ${context}: ${group.covered.length}/${total} services covered (${contextCoverage.toFixed(1)}%)`);
    
    if (group.uncovered.length > 0) {
      console.log(`   ❌ Uncovered services:`);
      group.uncovered.forEach(service => {
        console.log(`      - ${service}`);
      });
    }
    
    if (group.covered.length > 0) {
      console.log(`   ✅ Covered services:`);
      group.covered.forEach(({ service, tests }) => {
        console.log(`      - ${service} (tested by: ${tests.length} files)`);
      });
    }
  }
  
  // Recommendations for improving coverage
  console.log('\n=== COVERAGE IMPROVEMENT RECOMMENDATIONS ===\n');
  
  if (uncoveredServices.length > 0) {
    console.log('🔧 To reach 95% coverage, consider adding integration tests for:');
    uncoveredServices.forEach(([service, _]) => {
      const serviceName = path.basename(service, '.ts');
      console.log(`   - ${serviceName}: Add integration test covering cross-context scenarios`);
    });
  }
  
  console.log('\n💡 Integration testing best practices:');
  console.log('   - Focus on service-to-service interactions');
  console.log('   - Test cross-context communication patterns');
  console.log('   - Verify error propagation across boundaries');
  console.log('   - Test realistic end-to-end workflows');
  console.log('   - Mock external dependencies appropriately');
  
  return {
    totalServices: serviceFiles.length,
    coveredServices: coveredServices.length,
    coveragePercentage,
    targetMet: coveragePercentage >= 95,
    contextsAnalysis: contextGroups
  };
}

/**
 * Generate coverage improvement plan
 */
function generateImprovementPlan(analysisResult) {
  if (analysisResult.targetMet) {
    console.log('\n🎯 COVERAGE TARGET MET - No additional tests required!');
    return;
  }
  
  console.log('\n=== COVERAGE IMPROVEMENT PLAN ===\n');
  
  const needed = Math.ceil((0.95 * analysisResult.totalServices) - analysisResult.coveredServices);
  
  console.log(`📋 Action Plan to reach 95% coverage:`);
  console.log(`   1. Add integration tests for ${needed} uncovered services`);
  console.log(`   2. Priority: Focus on cross-context scenarios`);
  console.log(`   3. Ensure each test covers realistic workflows`);
  console.log(`   4. Re-run this script to validate progress`);
  
  console.log('\n📝 Suggested test structure:');
  console.log(`   - Create service-specific integration tests`);
  console.log(`   - Add cross-context communication scenarios`);
  console.log(`   - Include error handling and boundary tests`);
  console.log(`   - Test performance under realistic load`);
}

/**
 * Check if integration tests are properly structured
 */
function validateTestStructure() {
  const testFiles = findIntegrationTests();
  
  console.log('\n=== INTEGRATION TEST STRUCTURE VALIDATION ===\n');
  
  const testValidation = {
    hasMainIntegrationTests: false,
    hasContextIntegrationTests: false,
    hasCrossContextTests: false,
    hasErrorPropagationTests: false,
    testCount: testFiles.length
  };
  
  for (const testFile of testFiles) {
    const fullPath = path.join(process.cwd(), testFile);
    
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      if (testFile.includes('src/__tests__/integration/')) {
        testValidation.hasMainIntegrationTests = true;
      }
      
      if (testFile.includes('/contexts/') && testFile.includes('/integration/')) {
        testValidation.hasContextIntegrationTests = true;
      }
      
      if (content.includes('cross-context') || content.includes('CrossContext')) {
        testValidation.hasCrossContextTests = true;
      }
      
      if (content.includes('error') && content.includes('propagation')) {
        testValidation.hasErrorPropagationTests = true;
      }
    }
  }
  
  console.log(`📁 Test Structure Analysis:`);
  console.log(`   ✅ Main integration tests: ${testValidation.hasMainIntegrationTests ? 'Present' : 'Missing'}`);
  console.log(`   ✅ Context-specific tests: ${testValidation.hasContextIntegrationTests ? 'Present' : 'Missing'}`);
  console.log(`   ✅ Cross-context tests: ${testValidation.hasCrossContextTests ? 'Present' : 'Missing'}`);
  console.log(`   ✅ Error propagation tests: ${testValidation.hasErrorPropagationTests ? 'Present' : 'Missing'}`);
  console.log(`   📊 Total integration test files: ${testValidation.testCount}`);
  
  return testValidation;
}

// Main execution
function main() {
  try {
    console.log('🚀 Starting Integration Test Coverage Analysis...\n');
    
    const analysisResult = analyzeTestCoverage();
    const testStructure = validateTestStructure();
    
    generateImprovementPlan(analysisResult);
    
    console.log('\n=== SUMMARY ===\n');
    console.log(`📈 Current Coverage: ${analysisResult.coveragePercentage.toFixed(1)}%`);
    console.log(`🎯 Target Coverage: 95.0%`);
    console.log(`${analysisResult.targetMet ? '✅' : '❌'} Target Status: ${analysisResult.targetMet ? 'ACHIEVED' : 'IN PROGRESS'}`);
    console.log(`🧪 Integration Test Files: ${testStructure.testCount}`);
    
    if (!analysisResult.targetMet) {
      console.log('\n🔧 Next Steps:');
      console.log('   1. Fix failing integration tests');
      console.log('   2. Add missing service coverage');
      console.log('   3. Ensure tests cover realistic scenarios');
      console.log('   4. Run: npm test -- --coverage');
    }
    
    process.exit(analysisResult.targetMet ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Coverage analysis failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { analyzeTestCoverage, findServiceFiles, findIntegrationTests };
#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Collects only git-tracked source files for LLM analysis
 * Excludes: node_modules, .git, build artifacts, etc.
 */

function runCommand(cmd, options = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...options });
  } catch (error) {
    if (options.allowFailure) {
      return '';
    }
    throw error;
  }
}

function getGitTrackedFiles() {
  console.log('📁 Getting git-tracked files...');
  
  const gitFiles = runCommand('git ls-files', { allowFailure: true })
    .trim()
    .split('\n')
    .filter(file => file && 
      // Include only source files
      (file.endsWith('.ts') || 
       file.endsWith('.js') || 
       file.endsWith('.json') ||
       file.endsWith('.md') ||
       file.endsWith('.mjs')) &&
      // Exclude build artifacts and temp files
      !file.includes('node_modules') &&
      !file.includes('.git') &&
      !file.includes('coverage') &&
      !file.includes('dist') &&
      !file.includes('build') &&
      !file.endsWith('.d.ts')
    );

  console.log(`✅ Found ${gitFiles.length} source files under git control`);
  return gitFiles;
}

function getFileInfo(filePath) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    
    // Extract imports/exports
    const imports = lines
      .filter(line => line.trim().startsWith('import '))
      .map(line => line.trim());
    
    const exports = lines
      .filter(line => line.trim().includes('export '))
      .map(line => line.trim());

    // Extract class/interface/function names
    const classNames = [...content.matchAll(/(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/g)]
      .map(match => match[1]);
    
    const interfaceNames = [...content.matchAll(/(?:export\s+)?interface\s+(\w+)/g)]
      .map(match => match[1]);
    
    const functionNames = [...content.matchAll(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/g)]
      .map(match => match[1]);
    
    const typeNames = [...content.matchAll(/(?:export\s+)?type\s+(\w+)/g)]
      .map(match => match[1]);

    return {
      path: filePath,
      lineCount: lines.length,
      size: content.length,
      content: content,
      firstThreeLines: lines.slice(0, 3),
      lastThreeLines: lines.slice(-3),
      imports,
      exports,
      classNames,
      interfaceNames,
      functionNames,
      typeNames,
      isEmpty: content.trim().length === 0
    };
  } catch (error) {
    return {
      path: filePath,
      error: error.message,
      isEmpty: true
    };
  }
}

function categorizeFiles(files) {
  const categories = {
    entities: [],
    services: [],
    repositories: [],
    valueObjects: [],
    events: [],
    errors: [],
    types: [],
    configs: [],
    tests: [],
    docs: [],
    scripts: [],
    other: []
  };

  files.forEach(file => {
    const fileName = path.basename(file).toLowerCase();
    const dirPath = path.dirname(file).toLowerCase();
    
    if (file.includes('.test.') || file.includes('.spec.')) {
      categories.tests.push(file);
    } else if (file.endsWith('.md')) {
      categories.docs.push(file);
    } else if (file.startsWith('scripts/')) {
      categories.scripts.push(file);
    } else if (fileName.includes('entity') || dirPath.includes('entities')) {
      categories.entities.push(file);
    } else if (fileName.includes('service') || dirPath.includes('services')) {
      categories.services.push(file);
    } else if (fileName.includes('repository') || dirPath.includes('repositories')) {
      categories.repositories.push(file);
    } else if (dirPath.includes('value-objects')) {
      categories.valueObjects.push(file);
    } else if (dirPath.includes('events')) {
      categories.events.push(file);
    } else if (fileName.includes('error') || dirPath.includes('errors')) {
      categories.errors.push(file);
    } else if (fileName.includes('type') || fileName.includes('config') || file.endsWith('.json')) {
      categories.types.push(file);
    } else {
      categories.other.push(file);
    }
  });

  return categories;
}

function main() {
  console.log('🔍 Collecting source files for LLM analysis...\n');
  
  const gitFiles = getGitTrackedFiles();
  console.log('\n📊 Analyzing file structure...');
  
  const fileInfos = gitFiles.map(getFileInfo);
  const validFiles = fileInfos.filter(f => !f.error && !f.isEmpty);
  const errorFiles = fileInfos.filter(f => f.error);
  
  console.log(`✅ Successfully analyzed: ${validFiles.length} files`);
  if (errorFiles.length > 0) {
    console.log(`⚠️  Failed to read: ${errorFiles.length} files`);
  }
  
  const categories = categorizeFiles(validFiles.map(f => f.path));
  
  const output = {
    metadata: {
      collectionDate: new Date().toISOString(),
      totalFiles: validFiles.length,
      totalLines: validFiles.reduce((sum, f) => sum + f.lineCount, 0),
      totalSize: validFiles.reduce((sum, f) => sum + f.size, 0)
    },
    categories,
    files: validFiles,
    errorFiles: errorFiles.map(f => ({ path: f.path, error: f.error }))
  };
  
  // Write to output file
  const outputPath = './llm-source-files.json';
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  
  console.log('\n📋 COLLECTION SUMMARY:');
  console.log('='.repeat(50));
  console.log(`Total files: ${validFiles.length}`);
  console.log(`Total lines: ${output.metadata.totalLines.toLocaleString()}`);
  console.log(`Total size: ${(output.metadata.totalSize / 1024).toFixed(1)} KB`);
  
  console.log('\n📁 FILE CATEGORIES:');
  Object.entries(categories).forEach(([category, files]) => {
    if (files.length > 0) {
      console.log(`  ${category}: ${files.length} files`);
    }
  });
  
  if (errorFiles.length > 0) {
    console.log('\n❌ FILES WITH ERRORS:');
    errorFiles.forEach(f => console.log(`  ${f.path}: ${f.error}`));
  }
  
  console.log(`\n✅ Source file collection saved to: ${outputPath}`);
  console.log('📤 Ready for LLM analysis input generation');
}

main();

export { getGitTrackedFiles, getFileInfo, categorizeFiles };
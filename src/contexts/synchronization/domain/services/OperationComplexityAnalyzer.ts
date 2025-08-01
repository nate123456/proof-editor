import { injectable } from 'tsyringe';

import type { IOperation } from '../entities/shared-types';

export type TransformationComplexity = 'SIMPLE' | 'MODERATE' | 'COMPLEX' | 'INTRACTABLE';

export interface ComplexityMetrics {
  readonly operationCount: number;
  readonly structuralOperations: number;
  readonly semanticOperations: number;
  readonly concurrentGroups: number;
  readonly maxGroupSize: number;
  readonly averagePayloadSize: number;
  readonly maxPayloadSize: number;
  readonly dependencyChainLength: number;
}

export interface ComplexityAnalysis {
  readonly complexity: TransformationComplexity;
  readonly metrics: ComplexityMetrics;
  readonly factors: string[];
  readonly recommendations: string[];
}

export interface IOperationComplexityAnalyzer {
  calculateComplexity(operations: IOperation[]): TransformationComplexity;
  analyzeComplexity(operations: IOperation[]): ComplexityAnalysis;
  getOperationSize(operation: IOperation): number;
  getOperationComplexity(operation: IOperation): TransformationComplexity;
  estimateTransformationTime(operations: IOperation[]): number;
  identifyBottlenecks(operations: IOperation[]): string[];
}

@injectable()
export class OperationComplexityAnalyzer implements IOperationComplexityAnalyzer {
  calculateComplexity(operations: IOperation[]): TransformationComplexity {
    if (operations.length <= 2) {
      return 'SIMPLE';
    }

    if (operations.length > 20) {
      return 'INTRACTABLE';
    }

    const structuralOps = operations.filter((op) => op.isStructuralOperation());
    const semanticOps = operations.filter((op) => op.isSemanticOperation());
    const concurrentGroups = this.findConcurrentGroups(operations);

    if (semanticOps.length > 5) {
      return 'COMPLEX';
    }

    if (concurrentGroups.length > 3) {
      return 'COMPLEX';
    }

    if (structuralOps.length > 10) {
      return 'MODERATE';
    }

    const maxPayloadSize = Math.max(...operations.map((op) => this.getOperationSize(op)));
    if (maxPayloadSize > 50000) {
      return 'COMPLEX';
    }

    return 'MODERATE';
  }

  analyzeComplexity(operations: IOperation[]): ComplexityAnalysis {
    const metrics = this.calculateMetrics(operations);
    const complexity = this.determineComplexityFromMetrics(metrics);
    const factors = this.identifyComplexityFactors(metrics);
    const recommendations = this.generateRecommendations(complexity, metrics);

    return {
      complexity,
      metrics,
      factors,
      recommendations,
    };
  }

  getOperationSize(operation: IOperation): number {
    const payloadSize = JSON.stringify(operation.getPayload().getData()).length;
    const metadataSize = operation.getTargetPath().length + operation.getId().getValue().length;
    return payloadSize + metadataSize;
  }

  getOperationComplexity(operation: IOperation): TransformationComplexity {
    const size = this.getOperationSize(operation);
    const isStructural = operation.isStructuralOperation();
    const isSemantic = operation.isSemanticOperation();

    if (size > 50000 || (isSemantic && isStructural && size > 10000)) {
      return 'COMPLEX';
    }

    if (size > 10000 || (isSemantic && size > 5000)) {
      return 'MODERATE';
    }

    return 'SIMPLE';
  }

  estimateTransformationTime(operations: IOperation[]): number {
    const analysis = this.analyzeComplexity(operations);
    const baseTime = this.getBaseTransformationTime(analysis.complexity);

    // Adjust based on specific factors
    let multiplier = 1;

    if (analysis.metrics.concurrentGroups > 2) {
      multiplier *= 1.5;
    }

    if (analysis.metrics.semanticOperations > 3) {
      multiplier *= 2;
    }

    if (analysis.metrics.maxPayloadSize > 10000) {
      multiplier *= 1.3;
    }

    if (analysis.metrics.dependencyChainLength > 5) {
      multiplier *= 1.4;
    }

    return Math.round(baseTime * multiplier);
  }

  identifyBottlenecks(operations: IOperation[]): string[] {
    const bottlenecks: string[] = [];
    const analysis = this.analyzeComplexity(operations);

    if (analysis.metrics.semanticOperations > 5) {
      bottlenecks.push(`High semantic operation count (${analysis.metrics.semanticOperations})`);
    }

    if (analysis.metrics.concurrentGroups > 3) {
      bottlenecks.push(`Too many concurrent groups (${analysis.metrics.concurrentGroups})`);
    }

    if (analysis.metrics.maxGroupSize > 10) {
      bottlenecks.push(`Large concurrent group size (${analysis.metrics.maxGroupSize})`);
    }

    if (analysis.metrics.maxPayloadSize > 50000) {
      bottlenecks.push(`Large payload size (${analysis.metrics.maxPayloadSize} bytes)`);
    }

    if (analysis.metrics.dependencyChainLength > 10) {
      bottlenecks.push(`Long dependency chain (${analysis.metrics.dependencyChainLength})`);
    }

    const heavyOperations = operations.filter((op) => this.getOperationSize(op) > 20000);
    if (heavyOperations.length > 0) {
      bottlenecks.push(`${heavyOperations.length} operations with large payloads`);
    }

    return bottlenecks;
  }

  private calculateMetrics(operations: IOperation[]): ComplexityMetrics {
    const structuralOps = operations.filter((op) => op.isStructuralOperation());
    const semanticOps = operations.filter((op) => op.isSemanticOperation());
    const concurrentGroups = this.findConcurrentGroups(operations);
    const payloadSizes = operations.map((op) => this.getOperationSize(op));

    return {
      operationCount: operations.length,
      structuralOperations: structuralOps.length,
      semanticOperations: semanticOps.length,
      concurrentGroups: concurrentGroups.length,
      maxGroupSize:
        concurrentGroups.length > 0 ? Math.max(...concurrentGroups.map((g) => g.length)) : 0,
      averagePayloadSize:
        payloadSizes.length > 0
          ? Math.round(payloadSizes.reduce((a, b) => a + b, 0) / payloadSizes.length)
          : 0,
      maxPayloadSize: payloadSizes.length > 0 ? Math.max(...payloadSizes) : 0,
      dependencyChainLength: this.calculateMaxDependencyChain(operations),
    };
  }

  private determineComplexityFromMetrics(metrics: ComplexityMetrics): TransformationComplexity {
    // Intractable conditions
    if (metrics.operationCount > 50 || metrics.semanticOperations > 20) {
      return 'INTRACTABLE';
    }

    // Complex conditions
    if (
      metrics.operationCount > 20 ||
      metrics.semanticOperations > 5 ||
      metrics.concurrentGroups > 3 ||
      metrics.maxGroupSize > 10 ||
      metrics.maxPayloadSize > 50000 ||
      metrics.dependencyChainLength > 10
    ) {
      return 'COMPLEX';
    }

    // Moderate conditions
    if (
      metrics.operationCount > 5 ||
      metrics.structuralOperations > 10 ||
      metrics.semanticOperations > 2 ||
      metrics.concurrentGroups > 1 ||
      metrics.maxPayloadSize > 10000 ||
      metrics.dependencyChainLength > 5
    ) {
      return 'MODERATE';
    }

    return 'SIMPLE';
  }

  private identifyComplexityFactors(metrics: ComplexityMetrics): string[] {
    const factors: string[] = [];

    if (metrics.operationCount > 10) {
      factors.push(`High operation count (${metrics.operationCount})`);
    }

    if (metrics.semanticOperations > 3) {
      factors.push(`Many semantic operations (${metrics.semanticOperations})`);
    }

    if (metrics.concurrentGroups > 2) {
      factors.push(`Multiple concurrent groups (${metrics.concurrentGroups})`);
    }

    if (metrics.maxGroupSize > 5) {
      factors.push(`Large concurrent groups (max size: ${metrics.maxGroupSize})`);
    }

    if (metrics.averagePayloadSize > 5000) {
      factors.push(`Large average payload size (${metrics.averagePayloadSize} bytes)`);
    }

    if (metrics.dependencyChainLength > 5) {
      factors.push(`Long dependency chains (${metrics.dependencyChainLength})`);
    }

    return factors;
  }

  private generateRecommendations(
    complexity: TransformationComplexity,
    metrics: ComplexityMetrics,
  ): string[] {
    const recommendations: string[] = [];

    switch (complexity) {
      case 'INTRACTABLE':
        recommendations.push('Consider breaking operation sequence into smaller batches');
        recommendations.push('Implement progressive transformation with checkpoints');
        recommendations.push('Use asynchronous processing with progress tracking');
        break;

      case 'COMPLEX':
        recommendations.push('Monitor transformation progress closely');
        recommendations.push('Consider timeout mechanisms');
        if (metrics.semanticOperations > 5) {
          recommendations.push('Group semantic operations for batch processing');
        }
        if (metrics.concurrentGroups > 3) {
          recommendations.push('Optimize concurrent group resolution order');
        }
        break;

      case 'MODERATE':
        recommendations.push('Standard transformation approach should work');
        if (metrics.maxPayloadSize > 10000) {
          recommendations.push('Consider payload compression for large operations');
        }
        break;

      case 'SIMPLE':
        recommendations.push('Fast transformation expected');
        recommendations.push('No special handling required');
        break;
    }

    return recommendations;
  }

  private findConcurrentGroups(operations: IOperation[]): IOperation[][] {
    const groups: IOperation[][] = [];
    const processed = new Set<string>();

    for (const op of operations) {
      if (processed.has(op.getId().toString())) continue;

      const group = [op];
      processed.add(op.getId().toString());

      for (const otherOp of operations) {
        if (
          !op.getId().equals(otherOp.getId()) &&
          !processed.has(otherOp.getId().toString()) &&
          op.isConcurrentWith(otherOp)
        ) {
          group.push(otherOp);
          processed.add(otherOp.getId().toString());
        }
      }

      if (group.length > 1) {
        groups.push(group);
      }
    }

    return groups;
  }

  private calculateMaxDependencyChain(operations: IOperation[]): number {
    const dependencyMap = new Map<string, string[]>();

    // Build dependency map
    for (const op of operations) {
      const opId = op.getId().getValue();
      dependencyMap.set(opId, []);

      for (const otherOp of operations) {
        if (op.hasCausalDependencyOn(otherOp)) {
          const deps = dependencyMap.get(opId) || [];
          deps.push(otherOp.getId().getValue());
          dependencyMap.set(opId, deps);
        }
      }
    }

    // Find longest chain
    let maxChain = 0;
    for (const opId of dependencyMap.keys()) {
      const chainLength = this.getChainLength(opId, dependencyMap, new Set());
      maxChain = Math.max(maxChain, chainLength);
    }

    return maxChain;
  }

  private getChainLength(
    opId: string,
    dependencyMap: Map<string, string[]>,
    visited: Set<string>,
  ): number {
    if (visited.has(opId)) {
      return 0; // Avoid cycles
    }

    visited.add(opId);
    const dependencies = dependencyMap.get(opId) || [];

    if (dependencies.length === 0) {
      visited.delete(opId);
      return 1;
    }

    let maxDepth = 0;
    for (const depId of dependencies) {
      const depth = this.getChainLength(depId, dependencyMap, visited);
      maxDepth = Math.max(maxDepth, depth);
    }

    visited.delete(opId);
    return maxDepth + 1;
  }

  private getBaseTransformationTime(complexity: TransformationComplexity): number {
    switch (complexity) {
      case 'SIMPLE':
        return 10; // 10ms
      case 'MODERATE':
        return 100; // 100ms
      case 'COMPLEX':
        return 1000; // 1s
      case 'INTRACTABLE':
        return 10000; // 10s
      default:
        return 100;
    }
  }
}

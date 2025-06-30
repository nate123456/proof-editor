import type { Result } from '../../../../domain/shared/result';
import { OperationType } from './OperationType';

export interface StatementPayload {
  readonly id: string;
  readonly content: string;
  readonly metadata?: Record<string, unknown>;
}

export interface ArgumentPayload {
  readonly id: string;
  readonly premises: string[];
  readonly conclusions: string[];
  readonly metadata?: Record<string, unknown>;
}

export interface TreePayload {
  readonly id: string;
  readonly rootNodeId: string;
  readonly position: { x: number; y: number };
  readonly metadata?: Record<string, unknown>;
}

export interface ConnectionPayload {
  readonly sourceId: string;
  readonly targetId: string;
  readonly connectionType: string;
  readonly metadata?: Record<string, unknown>;
}

export interface PositionPayload {
  readonly x: number;
  readonly y: number;
  readonly z?: number;
}

export interface MetadataPayload {
  readonly key: string;
  readonly value: unknown;
  readonly previousValue?: unknown;
}

export type OperationPayloadData = 
  | StatementPayload
  | ArgumentPayload 
  | TreePayload
  | ConnectionPayload
  | PositionPayload
  | MetadataPayload
  | Record<string, unknown>;

export class OperationPayload {
  private constructor(
    private readonly data: OperationPayloadData,
    private readonly payloadType: string,
    private readonly size: number
  ) {}

  static create(data: OperationPayloadData, operationType: OperationType): Result<OperationPayload, Error> {
    if (data === null || data === undefined) {
      return { success: false, error: new Error('Operation payload data cannot be null or undefined') };
    }

    const validationResult = OperationPayload.validatePayloadForOperationType(data, operationType);
    if (!validationResult.success) {
      return { success: false, error: validationResult.error };
    }

    const payloadType = OperationPayload.determinePayloadType(data, operationType);
    const size = OperationPayload.calculatePayloadSize(data);

    if (size > 1024 * 1024) { // 1MB limit
      return { success: false, error: new Error('Operation payload exceeds maximum size of 1MB') };
    }

    return {
      success: true,
      data: new OperationPayload(data, payloadType, size)
    };
  }

  static createEmpty(): Result<OperationPayload, Error> {
    return {
      success: true,
      data: new OperationPayload({}, 'EMPTY', 0)
    };
  }

  private static validatePayloadForOperationType(
    data: OperationPayloadData, 
    operationType: OperationType
  ): Result<void, Error> {
    const opType = operationType.getValue();

    switch (opType) {
      case 'CREATE_STATEMENT':
      case 'UPDATE_STATEMENT':
        return OperationPayload.validateStatementPayload(data);
      
      case 'CREATE_ARGUMENT':
      case 'UPDATE_ARGUMENT':
        return OperationPayload.validateArgumentPayload(data);
      
      case 'CREATE_TREE':
        return OperationPayload.validateTreePayload(data);
      
      case 'UPDATE_TREE_POSITION':
        return OperationPayload.validatePositionPayload(data);
      
      case 'CREATE_CONNECTION':
        return OperationPayload.validateConnectionPayload(data);
      
      case 'UPDATE_METADATA':
        return OperationPayload.validateMetadataPayload(data);
      
      case 'DELETE_STATEMENT':
      case 'DELETE_ARGUMENT':
      case 'DELETE_TREE':
      case 'DELETE_CONNECTION':
        return { success: true, data: undefined };
      
      default:
        return { success: false, error: new Error(`Unknown operation type: ${opType}`) };
    }
  }

  private static validateStatementPayload(data: OperationPayloadData): Result<void, Error> {
    if (typeof data !== 'object' || data === null) {
      return { success: false, error: new Error('Statement payload must be an object') };
    }

    const payload = data as Partial<StatementPayload>;
    
    if (!payload.id || typeof payload.id !== 'string') {
      return { success: false, error: new Error('Statement payload must have a valid id') };
    }

    if (!payload.content || typeof payload.content !== 'string') {
      return { success: false, error: new Error('Statement payload must have valid content') };
    }

    return { success: true, data: undefined };
  }

  private static validateArgumentPayload(data: OperationPayloadData): Result<void, Error> {
    if (typeof data !== 'object' || data === null) {
      return { success: false, error: new Error('Argument payload must be an object') };
    }

    const payload = data as Partial<ArgumentPayload>;
    
    if (!payload.id || typeof payload.id !== 'string') {
      return { success: false, error: new Error('Argument payload must have a valid id') };
    }

    if (!Array.isArray(payload.premises)) {
      return { success: false, error: new Error('Argument payload must have premises array') };
    }

    if (!Array.isArray(payload.conclusions)) {
      return { success: false, error: new Error('Argument payload must have conclusions array') };
    }

    return { success: true, data: undefined };
  }

  private static validateTreePayload(data: OperationPayloadData): Result<void, Error> {
    if (typeof data !== 'object' || data === null) {
      return { success: false, error: new Error('Tree payload must be an object') };
    }

    const payload = data as Partial<TreePayload>;
    
    if (!payload.id || typeof payload.id !== 'string') {
      return { success: false, error: new Error('Tree payload must have a valid id') };
    }

    if (!payload.rootNodeId || typeof payload.rootNodeId !== 'string') {
      return { success: false, error: new Error('Tree payload must have a valid rootNodeId') };
    }

    if (!payload.position || typeof payload.position !== 'object') {
      return { success: false, error: new Error('Tree payload must have position object') };
    }

    return { success: true, data: undefined };
  }

  private static validatePositionPayload(data: OperationPayloadData): Result<void, Error> {
    if (typeof data !== 'object' || data === null) {
      return { success: false, error: new Error('Position payload must be an object') };
    }

    const payload = data as Partial<PositionPayload>;
    
    if (typeof payload.x !== 'number' || typeof payload.y !== 'number') {
      return { success: false, error: new Error('Position payload must have numeric x and y coordinates') };
    }

    return { success: true, data: undefined };
  }

  private static validateConnectionPayload(data: OperationPayloadData): Result<void, Error> {
    if (typeof data !== 'object' || data === null) {
      return { success: false, error: new Error('Connection payload must be an object') };
    }

    const payload = data as Partial<ConnectionPayload>;
    
    if (!payload.sourceId || typeof payload.sourceId !== 'string') {
      return { success: false, error: new Error('Connection payload must have a valid sourceId') };
    }

    if (!payload.targetId || typeof payload.targetId !== 'string') {
      return { success: false, error: new Error('Connection payload must have a valid targetId') };
    }

    return { success: true, data: undefined };
  }

  private static validateMetadataPayload(data: OperationPayloadData): Result<void, Error> {
    if (typeof data !== 'object' || data === null) {
      return { success: false, error: new Error('Metadata payload must be an object') };
    }

    const payload = data as Partial<MetadataPayload>;
    
    if (!payload.key || typeof payload.key !== 'string') {
      return { success: false, error: new Error('Metadata payload must have a valid key') };
    }

    return { success: true, data: undefined };
  }

  private static determinePayloadType(data: OperationPayloadData, operationType: OperationType): string {
    const opType = operationType.getValue();
    
    if (opType.includes('STATEMENT')) return 'STATEMENT';
    if (opType.includes('ARGUMENT')) return 'ARGUMENT';
    if (opType.includes('TREE')) return 'TREE';
    if (opType.includes('CONNECTION')) return 'CONNECTION';
    if (opType.includes('METADATA')) return 'METADATA';
    
    return 'GENERIC';
  }

  private static calculatePayloadSize(data: OperationPayloadData): number {
    return JSON.stringify(data).length;
  }

  getData(): OperationPayloadData {
    return this.data;
  }

  getPayloadType(): string {
    return this.payloadType;
  }

  getSize(): number {
    return this.size;
  }

  isEmpty(): boolean {
    return this.payloadType === 'EMPTY' || this.size === 0;
  }

  equals(other: OperationPayload): boolean {
    return JSON.stringify(this.data) === JSON.stringify(other.data) &&
           this.payloadType === other.payloadType;
  }

  clone(): Result<OperationPayload, Error> {
    try {
      const clonedData = JSON.parse(JSON.stringify(this.data));
      return {
        success: true,
        data: new OperationPayload(clonedData, this.payloadType, this.size)
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Failed to clone payload') 
      };
    }
  }

  transform(otherPayload: OperationPayload, transformationType: string): Result<OperationPayload, Error> {
    switch (transformationType) {
      case 'POSITION_OFFSET':
        return this.transformPositionOffset(otherPayload);
      
      case 'CONTENT_MERGE':
        return this.transformContentMerge(otherPayload);
      
      case 'METADATA_MERGE':
        return this.transformMetadataMerge(otherPayload);
      
      default:
        return { success: true, data: this };
    }
  }

  private transformPositionOffset(otherPayload: OperationPayload): Result<OperationPayload, Error> {
    if (this.payloadType !== 'TREE' || otherPayload.payloadType !== 'TREE') {
      return { success: true, data: this };
    }

    const thisData = this.data as PositionPayload;
    const otherData = otherPayload.data as PositionPayload;

    const transformedData = {
      ...thisData,
      x: thisData.x + (otherData.x * 0.1),
      y: thisData.y + (otherData.y * 0.1)
    };

    return {
      success: true,
      data: new OperationPayload(transformedData, this.payloadType, this.size)
    };
  }

  private transformContentMerge(otherPayload: OperationPayload): Result<OperationPayload, Error> {
    if (typeof this.data !== 'object' || typeof otherPayload.data !== 'object') {
      return { success: true, data: this };
    }

    const mergedData = { 
      ...this.data as Record<string, unknown>, 
      ...otherPayload.data as Record<string, unknown> 
    };

    return {
      success: true,
      data: new OperationPayload(
        mergedData, 
        this.payloadType, 
        OperationPayload.calculatePayloadSize(mergedData)
      )
    };
  }

  private transformMetadataMerge(otherPayload: OperationPayload): Result<OperationPayload, Error> {
    if (this.payloadType !== 'METADATA' || otherPayload.payloadType !== 'METADATA') {
      return { success: true, data: this };
    }

    const thisData = this.data as MetadataPayload;
    const otherData = otherPayload.data as MetadataPayload;

    if (thisData.key !== otherData.key) {
      return { success: true, data: this };
    }

    const mergedData: MetadataPayload = {
      key: thisData.key,
      value: otherData.value,
      previousValue: thisData.value
    };

    return {
      success: true,
      data: new OperationPayload(
        mergedData, 
        this.payloadType, 
        OperationPayload.calculatePayloadSize(mergedData)
      )
    };
  }

  toJSON(): Record<string, unknown> {
    return {
      data: this.data,
      payloadType: this.payloadType,
      size: this.size
    };
  }

  toString(): string {
    return `${this.payloadType}(${this.size} bytes)`;
  }

  hasField(fieldName: string): boolean {
    return typeof this.data === 'object' && 
           this.data !== null && 
           fieldName in this.data;
  }

  getField(fieldName: string): unknown {
    if (typeof this.data === 'object' && this.data !== null) {
      return (this.data as Record<string, unknown>)[fieldName];
    }
    return undefined;
  }
}
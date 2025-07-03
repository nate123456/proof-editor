/**
 * Test factories for synchronization domain entities and value objects
 * Using Fishery and Faker for realistic test data generation
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import { Conflict, type ConflictResolutionStrategy } from '../entities/Conflict';
import { Operation } from '../entities/Operation';
import { VectorClock } from '../entities/VectorClock';
import { ConflictType } from '../value-objects/ConflictType';
import { DeviceId } from '../value-objects/DeviceId';
import { OperationId } from '../value-objects/OperationId';
import { OperationPayload } from '../value-objects/OperationPayload';
import { OperationType, type OperationTypeValue } from '../value-objects/OperationType';

// Device ID factory
export const deviceIdFactory = Factory.define<DeviceId>(() => {
  const deviceIdResult = DeviceId.generateRandom();
  if (deviceIdResult.isErr()) {
    throw new Error('Failed to generate test device ID');
  }
  return deviceIdResult.value;
});

// Operation ID factory
export const operationIdFactory = Factory.define<OperationId>(() => {
  const deviceId = deviceIdFactory.build();
  const operationIdResult = OperationId.generateWithUUID(deviceId);
  if (operationIdResult.isErr()) {
    throw new Error('Failed to generate test operation ID');
  }
  return operationIdResult.value;
});

// Vector Clock factory
export const vectorClockFactory = Factory.define<VectorClock>(() => {
  const deviceId = deviceIdFactory.build();
  const clockData = new Map<string, number>();

  // Add the primary device
  clockData.set(deviceId.getValue(), faker.number.int({ min: 1, max: 100 }));

  // Add some other devices randomly
  const otherDeviceCount = faker.number.int({ min: 0, max: 3 });
  for (let i = 0; i < otherDeviceCount; i++) {
    const otherDevice = deviceIdFactory.build();
    clockData.set(otherDevice.getValue(), faker.number.int({ min: 1, max: 50 }));
  }

  const vectorClockResult = VectorClock.fromMap(clockData);
  if (vectorClockResult.isErr()) {
    throw new Error('Failed to create test vector clock');
  }
  return vectorClockResult.value;
});

// Operation Type factory
export const operationTypeFactory = Factory.define<OperationType>(() => {
  const operationTypes: OperationTypeValue[] = [
    'CREATE_STATEMENT',
    'UPDATE_STATEMENT',
    'DELETE_STATEMENT',
    'CREATE_ARGUMENT',
    'UPDATE_ARGUMENT',
    'DELETE_ARGUMENT',
    'CREATE_TREE',
    'UPDATE_TREE_POSITION',
    'DELETE_TREE',
    'CREATE_CONNECTION',
    'DELETE_CONNECTION',
    'UPDATE_METADATA',
  ];

  const randomType = faker.helpers.arrayElement(operationTypes);
  const operationTypeResult = OperationType.create(randomType);
  if (operationTypeResult.isErr()) {
    throw new Error('Failed to create test operation type');
  }
  return operationTypeResult.value;
});

// Operation Payload factory
export const operationPayloadFactory = Factory.define<OperationPayload>(() => {
  const operationType = operationTypeFactory.build();

  let payloadData: Record<string, unknown>;

  switch (operationType.getValue()) {
    case 'CREATE_STATEMENT':
    case 'UPDATE_STATEMENT':
      payloadData = {
        id: faker.string.uuid(),
        content: faker.lorem.sentence(),
        metadata: {
          createdAt: faker.date.recent().toISOString(),
          author: faker.person.fullName(),
        },
      };
      break;

    case 'CREATE_ARGUMENT':
    case 'UPDATE_ARGUMENT':
      payloadData = {
        id: faker.string.uuid(),
        premises: [faker.lorem.sentence(), faker.lorem.sentence()],
        conclusions: [faker.lorem.sentence()],
        metadata: {
          createdAt: faker.date.recent().toISOString(),
        },
      };
      break;

    case 'CREATE_TREE':
      payloadData = {
        id: faker.string.uuid(),
        rootNodeId: faker.string.uuid(),
        position: {
          x: faker.number.int({ min: 0, max: 1000 }),
          y: faker.number.int({ min: 0, max: 1000 }),
        },
        metadata: {
          createdAt: faker.date.recent().toISOString(),
        },
      };
      break;

    case 'UPDATE_TREE_POSITION':
      payloadData = {
        x: faker.number.int({ min: 0, max: 1000 }),
        y: faker.number.int({ min: 0, max: 1000 }),
        z: faker.number.int({ min: 0, max: 10 }),
      };
      break;

    case 'CREATE_CONNECTION':
      payloadData = {
        sourceId: faker.string.uuid(),
        targetId: faker.string.uuid(),
        connectionType: faker.helpers.arrayElement(['premise', 'conclusion']),
        metadata: {
          createdAt: faker.date.recent().toISOString(),
        },
      };
      break;

    case 'UPDATE_METADATA':
      payloadData = {
        key: faker.word.noun(),
        value: faker.lorem.words(3),
        previousValue: faker.lorem.words(2),
      };
      break;

    case 'DELETE_STATEMENT':
    case 'DELETE_ARGUMENT':
    case 'DELETE_TREE':
    case 'DELETE_CONNECTION':
      // Delete operations can have any payload structure
      payloadData = {
        id: faker.string.uuid(),
        reason: 'User deleted',
        timestamp: faker.date.recent().toISOString(),
      };
      break;

    default:
      payloadData = {
        id: faker.string.uuid(),
        data: faker.lorem.words(3),
        timestamp: faker.date.recent().toISOString(),
      };
  }

  const payloadResult = OperationPayload.create(payloadData, operationType);
  if (payloadResult.isErr()) {
    throw new Error(
      `Failed to create test operation payload for ${operationType.getValue()}: ${payloadResult.error.message}`
    );
  }
  return payloadResult.value;
});

// Operation factory
export const operationFactory = Factory.define<Operation>(() => {
  const id = operationIdFactory.build();
  const deviceId = deviceIdFactory.build();
  const operationType = operationTypeFactory.build();
  const targetPath = `/${faker.word.noun()}/${faker.string.uuid()}`;
  const payload = operationPayloadFactory.build();
  const vectorClock = vectorClockFactory.build();

  const operationResult = Operation.create(
    id,
    deviceId,
    operationType,
    targetPath,
    payload,
    vectorClock
  );

  if (operationResult.isErr()) {
    throw new Error('Failed to create test operation');
  }
  return operationResult.value;
});

// Conflict Type factory
export const conflictTypeFactory = Factory.define<ConflictType>(() => {
  const types = ['structural', 'semantic', 'deletion', 'concurrentModification'] as const;
  const randomType = faker.helpers.arrayElement(types);

  let conflictTypeResult;
  switch (randomType) {
    case 'structural':
      conflictTypeResult = ConflictType.structural();
      break;
    case 'semantic':
      conflictTypeResult = ConflictType.semantic();
      break;
    case 'deletion':
      conflictTypeResult = ConflictType.deletion();
      break;
    case 'concurrentModification':
      conflictTypeResult = ConflictType.concurrentModification();
      break;
  }

  if (conflictTypeResult.isErr()) {
    throw new Error('Failed to create test conflict type');
  }
  return conflictTypeResult.value;
});

// Conflict factory
export const conflictFactory = Factory.define<Conflict>(({ params }) => {
  const id = params.id ?? `conflict-${faker.string.uuid()}`;
  const conflictType = params.conflictType ?? conflictTypeFactory.build();
  const targetPath = params.targetPath ?? `/${faker.word.noun()}/${faker.string.uuid()}`;
  const operations = params.conflictingOperations ?? [
    operationFactory.build(),
    operationFactory.build(),
  ];

  const conflictResult = Conflict.create(id, conflictType, targetPath, operations);
  if (conflictResult.isErr()) {
    throw new Error(`Failed to create test conflict: ${conflictResult.error.message}`);
  }
  return conflictResult.value;
});

// Specialized factories for specific scenarios

// Concurrent operations (same target path, concurrent vector clocks)
export const concurrentOperationsFactory = Factory.define<Operation[]>(() => {
  const targetPath = `/${faker.word.noun()}/${faker.string.uuid()}`;
  const device1 = deviceIdFactory.build();
  const device2 = deviceIdFactory.build();

  // Create concurrent vector clocks
  const clock1Data = new Map<string, number>();
  clock1Data.set(device1.getValue(), 5);
  clock1Data.set(device2.getValue(), 3);

  const clock2Data = new Map<string, number>();
  clock2Data.set(device1.getValue(), 4);
  clock2Data.set(device2.getValue(), 6);

  const vectorClock1Result = VectorClock.fromMap(clock1Data);
  const vectorClock2Result = VectorClock.fromMap(clock2Data);

  if (vectorClock1Result.isErr() || vectorClock2Result.isErr()) {
    throw new Error('Failed to create concurrent vector clocks');
  }

  const op1Result = Operation.create(
    operationIdFactory.build(),
    device1,
    operationTypeFactory.build(),
    targetPath,
    operationPayloadFactory.build(),
    vectorClock1Result.value
  );

  const op2Result = Operation.create(
    operationIdFactory.build(),
    device2,
    operationTypeFactory.build(),
    targetPath,
    operationPayloadFactory.build(),
    vectorClock2Result.value
  );

  if (op1Result.isErr() || op2Result.isErr()) {
    throw new Error('Failed to create concurrent operations');
  }

  return [op1Result.value, op2Result.value];
});

// Sequential operations (causal dependencies)
export const sequentialOperationsFactory = Factory.define<Operation[]>(() => {
  const targetPath = `/${faker.word.noun()}/${faker.string.uuid()}`;
  const device = deviceIdFactory.build();

  // Create causally ordered vector clocks
  const clock1Data = new Map<string, number>();
  clock1Data.set(device.getValue(), 1);

  const clock2Data = new Map<string, number>();
  clock2Data.set(device.getValue(), 2);

  const vectorClock1Result = VectorClock.fromMap(clock1Data);
  const vectorClock2Result = VectorClock.fromMap(clock2Data);

  if (vectorClock1Result.isErr() || vectorClock2Result.isErr()) {
    throw new Error('Failed to create sequential vector clocks');
  }

  const op1Result = Operation.create(
    operationIdFactory.build(),
    device,
    operationTypeFactory.build(),
    targetPath,
    operationPayloadFactory.build(),
    vectorClock1Result.value
  );

  const op2Result = Operation.create(
    operationIdFactory.build(),
    device,
    operationTypeFactory.build(),
    targetPath,
    operationPayloadFactory.build(),
    vectorClock2Result.value
  );

  if (op1Result.isErr() || op2Result.isErr()) {
    throw new Error('Failed to create sequential operations');
  }

  return [op1Result.value, op2Result.value];
});

// Test scenarios
export const syncTestScenarios = {
  // Conflict resolution strategies
  resolutionStrategies: [
    'LAST_WRITER_WINS',
    'FIRST_WRITER_WINS',
    'MERGE_OPERATIONS',
    'USER_DECISION_REQUIRED',
  ] as ConflictResolutionStrategy[],

  // Common operation types for structural changes
  structuralOperations: [
    'CREATE_ARGUMENT',
    'DELETE_ARGUMENT',
    'CREATE_CONNECTION',
    'DELETE_CONNECTION',
    'UPDATE_TREE_POSITION',
  ] as OperationTypeValue[],

  // Common operation types for semantic changes
  semanticOperations: [
    'CREATE_STATEMENT',
    'UPDATE_STATEMENT',
    'UPDATE_METADATA',
  ] as OperationTypeValue[],

  // Common target paths
  targetPaths: [
    '/arguments/arg-123',
    '/statements/stmt-456',
    '/trees/tree-789',
    '/connections/conn-abc',
    '/metadata/meta-def',
  ],
};

// Helper functions
export const createConflictingOperations = (targetPath: string, count = 2): Operation[] => {
  return Array.from({ length: count }, () => {
    const operation = operationFactory.build();
    // Create a new operation with the same target path
    const operationResult = Operation.create(
      operation.getId(),
      operation.getDeviceId(),
      operation.getOperationType(),
      targetPath,
      operation.getPayload(),
      operation.getVectorClock()
    );

    if (operationResult.isErr()) {
      throw new Error('Failed to create conflicting operation');
    }
    return operationResult.value;
  });
};

export const createOperationsWithComplexity = (
  complexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX'
): Operation[] => {
  let count: number;
  switch (complexity) {
    case 'SIMPLE':
      count = faker.number.int({ min: 1, max: 2 });
      break;
    case 'MODERATE':
      count = faker.number.int({ min: 3, max: 10 });
      break;
    case 'COMPLEX':
      count = faker.number.int({ min: 11, max: 20 });
      break;
  }

  return Array.from({ length: count }, () => operationFactory.build());
};

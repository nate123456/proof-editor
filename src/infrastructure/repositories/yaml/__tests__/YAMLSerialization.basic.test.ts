import { describe, expect, test } from 'vitest';
import { ProofDocument } from '../../../../domain/aggregates/ProofDocument.js';
import { ProofDocumentId } from '../../../../domain/shared/value-objects/index.js';
import { YAMLDeserializer } from '../YAMLDeserializer.js';
import { YAMLSerializer } from '../YAMLSerializer.js';

describe('Basic YAML Repository Validation', () => {
  test('serializer can serialize bootstrap document', async () => {
    const testId = ProofDocumentId.create('test-bootstrap');
    expect(testId.isOk()).toBe(true);
    if (testId.isErr()) return;

    const bootstrapResult = ProofDocument.createBootstrap(testId.value);
    expect(bootstrapResult.isOk()).toBe(true);
    if (bootstrapResult.isErr()) return;

    const serializer = new YAMLSerializer();
    const result = await serializer.serialize(bootstrapResult.value);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;

    const yamlContent = result.value;
    expect(yamlContent).toContain('statements: {}');
    expect(yamlContent).toContain('orderedSets: {}');
    expect(yamlContent).toContain('atomicArguments: {}');
    expect(yamlContent).toContain('trees: {}');
  });

  test('deserializer can deserialize bootstrap document', async () => {
    const yamlContent = `
version: 1
metadata:
  id: test-doc
  createdAt: 2024-01-01T00:00:00.000Z
  modifiedAt: 2024-01-01T00:00:00.000Z
  schemaVersion: "1.0.0"
statements: {}
orderedSets: {}
atomicArguments: {}
trees: {}
`;

    const deserializer = new YAMLDeserializer();
    const result = await deserializer.deserialize(yamlContent);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;

    const document = result.value;
    expect(document.getId().getValue()).toBe('test-doc');
    expect(document.getAllStatements()).toHaveLength(0);
    expect(document.getAllOrderedSets()).toHaveLength(0);
    expect(document.getAllAtomicArguments()).toHaveLength(0);
  });

  test('round-trip serialization works', async () => {
    const testId = ProofDocumentId.create('round-trip-test');
    expect(testId.isOk()).toBe(true);
    if (testId.isErr()) return;

    const originalDoc = ProofDocument.createBootstrap(testId.value);
    expect(originalDoc.isOk()).toBe(true);
    if (originalDoc.isErr()) return;

    const serializer = new YAMLSerializer();
    const deserializer = new YAMLDeserializer();

    // Serialize
    const serializedResult = await serializer.serialize(originalDoc.value);
    expect(serializedResult.isOk()).toBe(true);
    if (serializedResult.isErr()) return;

    // Deserialize
    const deserializedResult = await deserializer.deserialize(serializedResult.value);
    expect(deserializedResult.isOk()).toBe(true);
    if (deserializedResult.isErr()) return;

    const roundTripDoc = deserializedResult.value;
    expect(roundTripDoc.getId().getValue()).toBe(originalDoc.value.getId().getValue());
    expect(roundTripDoc.getAllStatements()).toHaveLength(0);
    expect(roundTripDoc.getAllOrderedSets()).toHaveLength(0);
    expect(roundTripDoc.getAllAtomicArguments()).toHaveLength(0);
  });
});

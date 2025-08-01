/**
 * Test data factories using Fishery and Faker
 *
 * Provides realistic test data generation for domain entities
 * following the Factory pattern similar to .NET's AutoFixture
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';
import { ProofDocument } from '../../aggregates/ProofDocument.js';
import { AtomicArgument, type SideLabels } from '../../entities/AtomicArgument.js';
import { Node } from '../../entities/Node.js';
import { Statement } from '../../entities/Statement.js';
import { Tree } from '../../entities/Tree.js';
import {
  AlignmentMode,
  AtomicArgumentId,
  Attachment,
  ExpansionDirection,
  LayoutStyle,
  NodeId,
  PhysicalProperties,
  Position2D,
  ProofDocumentId,
  StatementId,
  TreeId,
} from '../../shared/value-objects/index.js';

// Factory for creating StatementId value objects
export const statementIdFactory = Factory.define<StatementId>(() => {
  const result = StatementId.fromString(faker.string.uuid());
  if (result.isErr()) {
    throw result.error;
  }
  return result.value;
});

// Factory for creating AtomicArgumentId value objects
export const atomicArgumentIdFactory = Factory.define<AtomicArgumentId>(() => {
  const result = AtomicArgumentId.fromString(faker.string.uuid());
  if (result.isErr()) {
    throw result.error;
  }
  return result.value;
});

// Factory for creating NodeId value objects
export const nodeIdFactory = Factory.define<NodeId>(() => {
  const result = NodeId.fromString(faker.string.uuid());
  if (result.isErr()) {
    throw result.error;
  }
  return result.value;
});

// Factory for creating TreeId value objects
export const treeIdFactory = Factory.define<TreeId>(() => {
  const result = TreeId.fromString(faker.string.uuid());
  if (result.isErr()) {
    throw result.error;
  }
  return result.value;
});

// Factory for creating ProofDocumentId value objects
export const proofDocumentIdFactory = Factory.define<ProofDocumentId>(() => {
  const result = ProofDocumentId.fromString(faker.string.uuid());
  if (result.isErr()) {
    throw result.error;
  }
  return result.value;
});

// Factory for creating realistic statement content
export const statementContentFactory = Factory.define<string>(({ sequence }) => {
  const contentTypes = [
    () => `All ${faker.word.noun()}s are ${faker.word.adjective()}`,
    () => `If ${faker.word.verb()} then ${faker.word.verb()}`,
    () => `${faker.person.firstName()} is ${faker.word.adjective()}`,
    () => `Every ${faker.word.noun()} has ${faker.word.noun()}`,
    () => `${faker.word.noun()} implies ${faker.word.noun()}`,
    () => `Statement ${sequence}: ${faker.lorem.sentence()}`,
  ];

  return faker.helpers.arrayElement(contentTypes)();
});

// Test data configurations for different scenarios
export const testScenarios = {
  // Simple logical chain: A → B → C
  simpleChain: {
    premises: ['All men are mortal', 'Socrates is a man'],
    conclusions: ['Socrates is mortal', 'Therefore, Socrates will die'],
  },

  // Complex branching argument
  complexBranching: {
    premises: [
      'All animals need food',
      'Cats are animals',
      'Dogs are animals',
      'Fluffy is a cat',
      'Rex is a dog',
    ],
    conclusions: ['Cats need food', 'Dogs need food', 'Fluffy needs food', 'Rex needs food'],
  },

  // Mathematical reasoning
  mathematical: {
    premises: ['All prime numbers greater than 2 are odd', '7 is a prime number', '7 > 2'],
    conclusions: ['7 is odd', 'Therefore, 7 is not even'],
  },
};

// Helper functions for creating test data
export const createTestStatements = (count = 5) => {
  return Array.from({ length: count }, () => statementContentFactory.build());
};

export const createTestIds = (count = 3) => ({
  statementIds: Array.from({ length: count }, () => statementIdFactory.build()),
  argumentIds: Array.from({ length: count }, () => atomicArgumentIdFactory.build()),
});

// Realistic domain-specific test data
export const proofTestData = {
  logicalConnectives: ['and', 'or', 'if...then', 'if and only if', 'not'],
  quantifiers: ['all', 'some', 'none', 'every', 'any'],
  commonPredicates: ['is', 'has', 'contains', 'implies', 'equals', 'belongs to'],
  academicSubjects: ['philosophy', 'mathematics', 'logic', 'science', 'ethics'],
  logicalFallacies: [
    'ad hominem',
    'straw man',
    'false dichotionary',
    'circular reasoning',
    'appeal to authority',
  ],
};

// Factory for creating Statement entities
export const statementFactory = Factory.define<Statement>(({ sequence: _sequence }) => {
  const content = statementContentFactory.build();
  const result = Statement.create(content);
  if (result.isErr()) {
    throw result.error;
  }
  return result.value;
});

// Factory for creating SideLabels
export const sideLabelsFactory = Factory.define<SideLabels>(() => {
  const result: SideLabels = {};
  if (faker.helpers.maybe(() => true, { probability: 0.3 })) {
    result.left = faker.word.noun();
  }
  if (faker.helpers.maybe(() => true, { probability: 0.3 })) {
    result.right = faker.word.adjective();
  }
  return result;
});

// Factory for creating AtomicArgument entities
export const atomicArgumentFactory = Factory.define<AtomicArgument>(({ transientParams }) => {
  const { premises, conclusions, sideLabels } = transientParams as {
    premises?: Statement[];
    conclusions?: Statement[];
    sideLabels?: SideLabels;
  };

  const actualSideLabels = sideLabels ?? sideLabelsFactory.build();
  const actualPremises = premises ?? [];
  const actualConclusions = conclusions ?? [];

  const result = AtomicArgument.create(actualPremises, actualConclusions, actualSideLabels);
  if (result.isErr()) {
    throw result.error;
  }
  return result.value;
});

// Factory for creating Position2D value objects
export const position2DFactory = Factory.define<Position2D>(() => {
  const x = faker.number.float({ min: -1000, max: 1000 });
  const y = faker.number.float({ min: -1000, max: 1000 });
  const result = Position2D.create(x, y);
  if (result.isErr()) {
    throw result.error;
  }
  return result.value;
});

// Factory for creating PhysicalProperties value objects
export const physicalPropertiesFactory = Factory.define<PhysicalProperties>(() => {
  const layoutStyle = faker.helpers.arrayElement([
    LayoutStyle.bottomUp(),
    LayoutStyle.topDown(),
    LayoutStyle.leftRight(),
    LayoutStyle.rightLeft(),
  ]);
  const spacingX = faker.number.int({ min: 20, max: 100 });
  const spacingY = faker.number.int({ min: 20, max: 100 });
  const minWidth = faker.number.int({ min: 50, max: 200 });
  const minHeight = faker.number.int({ min: 30, max: 150 });
  const expansionDirection = faker.helpers.arrayElement([
    ExpansionDirection.horizontal(),
    ExpansionDirection.vertical(),
    ExpansionDirection.radial(),
  ]);
  const alignmentMode = faker.helpers.arrayElement([
    AlignmentMode.left(),
    AlignmentMode.center(),
    AlignmentMode.right(),
    AlignmentMode.justify(),
  ]);

  const result = PhysicalProperties.create(
    layoutStyle,
    spacingX,
    spacingY,
    minWidth,
    minHeight,
    expansionDirection,
    alignmentMode,
  );
  if (result.isErr()) {
    throw result.error;
  }
  return result.value;
});

// Factory for creating Tree entities
export const treeFactory = Factory.define<Tree>(({ transientParams }) => {
  const {
    documentId = faker.string.uuid(),
    position = position2DFactory.build(),
    physicalProperties = physicalPropertiesFactory.build(),
    title,
  } = transientParams as {
    documentId?: string;
    position?: Position2D;
    physicalProperties?: PhysicalProperties;
    title?: string;
  };

  const result = Tree.create(documentId, position, physicalProperties, title);
  if (result.isErr()) {
    throw result.error;
  }
  return result.value;
});

// Factory for creating Attachment value objects
export const attachmentFactory = Factory.define<Attachment>(({ transientParams }) => {
  const {
    parentNodeId = nodeIdFactory.build(),
    premisePosition = faker.number.int({ min: 0, max: 5 }),
    fromPosition,
  } = transientParams as {
    parentNodeId?: NodeId;
    premisePosition?: number;
    fromPosition?: number;
  };

  const result = Attachment.create(parentNodeId, premisePosition, fromPosition);
  if (result.isErr()) {
    throw result.error;
  }
  return result.value;
});

// Factory for creating Node entities
export const nodeFactory = Factory.define<Node>(({ transientParams }) => {
  const {
    argumentId = atomicArgumentIdFactory.build(),
    attachment,
    isRoot = false,
  } = transientParams as {
    argumentId?: AtomicArgumentId;
    attachment?: Attachment;
    isRoot?: boolean;
  };

  if (isRoot) {
    const result = Node.createRoot(argumentId);
    if (result.isErr()) {
      throw result.error;
    }
    return result.value;
  } else {
    const nodeAttachment = attachment ?? attachmentFactory.build();
    const result = Node.createChild(argumentId, nodeAttachment);
    if (result.isErr()) {
      throw result.error;
    }
    return result.value;
  }
});

// Factory for creating ProofDocument aggregates
export const proofDocumentFactory = Factory.define<ProofDocument>(({ transientParams }) => {
  const { id = proofDocumentIdFactory.build(), isEmpty = false } = transientParams as {
    id?: ProofDocumentId;
    isEmpty?: boolean;
  };

  if (isEmpty) {
    const result = ProofDocument.createBootstrap(id);
    if (result.isErr()) {
      throw result.error;
    }
    return result.value;
  }

  // Create a document with some sample content
  const doc = ProofDocument.create();

  // Add some statements
  const statement1 = doc.createStatement('All men are mortal');
  const statement2 = doc.createStatement('Socrates is a man');
  const statement3 = doc.createStatement('Socrates is mortal');

  if (statement1.isErr() || statement2.isErr() || statement3.isErr()) {
    throw new Error('Failed to create test statements');
  }

  // Create atomic argument with Statement arrays
  const premises = [statement1.value, statement2.value];
  const conclusions = [statement3.value];
  const argument = doc.createAtomicArgument(premises, conclusions);
  if (argument.isErr()) {
    throw new Error('Failed to create test atomic argument');
  }

  return doc;
});

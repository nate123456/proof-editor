/**
 * Test data factories using Fishery and Faker
 *
 * Provides realistic test data generation for domain entities
 * following the Factory pattern similar to .NET's AutoFixture
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import { AtomicArgument, type SideLabels } from '../../entities/AtomicArgument.js';
import { Node } from '../../entities/Node.js';
import { OrderedSet } from '../../entities/OrderedSet.js';
import { Statement } from '../../entities/Statement.js';
import { Tree } from '../../entities/Tree.js';
import {
  AtomicArgumentId,
  Attachment,
  NodeId,
  OrderedSetId,
  PhysicalProperties,
  Position2D,
  StatementId,
  TreeId,
} from '../../shared/value-objects.js';

// Factory for creating StatementId value objects
export const statementIdFactory = Factory.define<StatementId>(() => {
  return StatementId.fromString(faker.string.uuid());
});

// Factory for creating AtomicArgumentId value objects
export const atomicArgumentIdFactory = Factory.define<AtomicArgumentId>(() => {
  return AtomicArgumentId.fromString(faker.string.uuid());
});

// Factory for creating OrderedSetId value objects
export const orderedSetIdFactory = Factory.define<OrderedSetId>(() => {
  return OrderedSetId.fromString(faker.string.uuid());
});

// Factory for creating NodeId value objects
export const nodeIdFactory = Factory.define<NodeId>(() => {
  return NodeId.fromString(faker.string.uuid());
});

// Factory for creating TreeId value objects
export const treeIdFactory = Factory.define<TreeId>(() => {
  return TreeId.fromString(faker.string.uuid());
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
  orderedSetIds: Array.from({ length: count }, () => orderedSetIdFactory.build()),
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
export const statementFactory = Factory.define<Statement>(({ sequence }) => {
  const content = statementContentFactory.build({ sequence });
  const result = Statement.create(content);
  if (result.isErr()) {
    throw result.error;
  }
  return result.value;
});

// Factory for creating OrderedSet entities
export const orderedSetFactory = Factory.define<OrderedSet>(({ transientParams }) => {
  const { statementIds = [] } = transientParams as { statementIds?: StatementId[] };
  const result = OrderedSet.create(statementIds);
  if (result.isErr()) {
    throw result.error;
  }
  return result.value;
});

// Factory for creating SideLabels
export const sideLabelsFactory = Factory.define<SideLabels>(() => ({
  left: faker.helpers.maybe(() => faker.word.noun(), { probability: 0.3 }),
  right: faker.helpers.maybe(() => faker.word.adjective(), { probability: 0.3 }),
}));

// Factory for creating AtomicArgument entities
export const atomicArgumentFactory = Factory.define<AtomicArgument>(({ transientParams }) => {
  const {
    premiseSetRef,
    conclusionSetRef,
    sideLabels = sideLabelsFactory.build(),
  } = transientParams as {
    premiseSetRef?: OrderedSetId;
    conclusionSetRef?: OrderedSetId;
    sideLabels?: SideLabels;
  };

  const result = AtomicArgument.create(premiseSetRef, conclusionSetRef, sideLabels);
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
    'bottom-up',
    'top-down',
    'left-right',
    'right-left',
  ]);
  const spacingX = faker.number.int({ min: 20, max: 100 });
  const spacingY = faker.number.int({ min: 20, max: 100 });
  const minWidth = faker.number.int({ min: 50, max: 200 });
  const minHeight = faker.number.int({ min: 30, max: 150 });
  const expansionDirection = faker.helpers.arrayElement(['horizontal', 'vertical', 'radial']);
  const alignmentMode = faker.helpers.arrayElement(['left', 'center', 'right', 'justify']);

  const result = PhysicalProperties.create(
    layoutStyle,
    spacingX,
    spacingY,
    minWidth,
    minHeight,
    expansionDirection,
    alignmentMode
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

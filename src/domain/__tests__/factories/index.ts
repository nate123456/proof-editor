/**
 * Test data factories using Fishery and Faker
 *
 * Provides realistic test data generation for domain entities
 * following the Factory pattern similar to .NET's AutoFixture
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import { AtomicArgumentId, OrderedSetId, StatementId } from '../../shared/value-objects.js';

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
    'false dichotomy',
    'circular reasoning',
    'appeal to authority',
  ],
};

/**
 * Test suite for AtomicArgument side labels management
 *
 * Focuses on:
 * - Complete and partial side label updates
 * - Individual left/right label manipulation
 * - Label clearing and removal
 * - Edge cases with whitespace and empty strings
 * - Modification timestamp tracking for label changes
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AtomicArgument, type SideLabels } from '../../entities/AtomicArgument.js';
import { FIXED_TIMESTAMP } from './atomic-argument-test-utils.js';

describe('Side Labels Management', () => {
  let mockDateNow: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockDateNow = vi.spyOn(Date, 'now').mockReturnValue(FIXED_TIMESTAMP) as any;
  });

  afterEach(() => {
    mockDateNow.mockRestore();
  });

  describe('side label updates', () => {
    it('should update complete side labels', () => {
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        const newLabels: SideLabels = { left: 'New Left', right: 'New Right' };

        mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
        const updateResult = argument.updateSideLabels(newLabels);

        expect(updateResult.isOk()).toBe(true);
        expect(argument.getSideLabels()).toEqual(newLabels);
        expect(argument.hasSideLabels()).toBe(true);
        expect(argument.hasLeftSideLabel()).toBe(true);
        expect(argument.hasRightSideLabel()).toBe(true);
        expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP + 1000);
      }
    });

    it('should update partial side labels', () => {
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        const partialLabels: SideLabels = { left: 'Only Left' };

        const updateResult = argument.updateSideLabels(partialLabels);

        expect(updateResult.isOk()).toBe(true);
        expect(argument.getSideLabels()).toEqual(partialLabels);
        expect(argument.hasLeftSideLabel()).toBe(true);
        expect(argument.hasRightSideLabel()).toBe(false);
        expect(argument.hasSideLabels()).toBe(true);
      }
    });

    it('should clear side labels', () => {
      const sideLabels: SideLabels = { left: 'Clear Me', right: 'Me Too' };
      const result = AtomicArgument.create(undefined, undefined, sideLabels);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;

        const updateResult = argument.updateSideLabels({});
        expect(updateResult.isOk()).toBe(true);
        expect(argument.getSideLabels()).toEqual({});
        expect(argument.hasSideLabels()).toBe(false);
      }
    });

    it('should not update modification time for identical labels', () => {
      const sideLabels: SideLabels = { left: 'Same', right: 'Labels' };
      const result = AtomicArgument.create(undefined, undefined, sideLabels);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        const originalModified = argument.getModifiedAt();

        mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
        const updateResult = argument.updateSideLabels(sideLabels);

        expect(updateResult.isOk()).toBe(true);
        expect(argument.getModifiedAt()).toBe(originalModified); // Should not change
      }
    });

    it('should replace existing labels completely', () => {
      const initialLabels: SideLabels = { left: 'Initial Left', right: 'Initial Right' };
      const result = AtomicArgument.create(undefined, undefined, initialLabels);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        const newLabels: SideLabels = { left: 'New Left' }; // No right label

        const updateResult = argument.updateSideLabels(newLabels);

        expect(updateResult.isOk()).toBe(true);
        expect(argument.getSideLabels()).toEqual(newLabels);
        expect(argument.hasLeftSideLabel()).toBe(true);
        expect(argument.hasRightSideLabel()).toBe(false); // Right label removed
      }
    });
  });

  describe('individual side label updates', () => {
    it('should set left side label', () => {
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;

        mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
        const setResult = argument.setLeftSideLabel('Left Label');

        expect(setResult.isOk()).toBe(true);
        expect(argument.getSideLabels().left).toBe('Left Label');
        expect(argument.hasLeftSideLabel()).toBe(true);
        expect(argument.hasRightSideLabel()).toBe(false);
        expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP + 1000);
      }
    });

    it('should clear left side label', () => {
      const sideLabels: SideLabels = { left: 'Remove Me' };
      const result = AtomicArgument.create(undefined, undefined, sideLabels);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;

        const clearResult = argument.setLeftSideLabel(undefined);
        expect(clearResult.isOk()).toBe(true);
        expect(argument.getSideLabels().left).toBeUndefined();
        expect(argument.hasLeftSideLabel()).toBe(false);
      }
    });

    it('should set right side label', () => {
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;

        const setResult = argument.setRightSideLabel('Right Label');
        expect(setResult.isOk()).toBe(true);
        expect(argument.getSideLabels().right).toBe('Right Label');
        expect(argument.hasRightSideLabel()).toBe(true);
        expect(argument.hasLeftSideLabel()).toBe(false);
      }
    });

    it('should clear right side label', () => {
      const sideLabels: SideLabels = { right: 'Remove Me' };
      const result = AtomicArgument.create(undefined, undefined, sideLabels);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;

        const clearResult = argument.setRightSideLabel(undefined);
        expect(clearResult.isOk()).toBe(true);
        expect(argument.getSideLabels().right).toBeUndefined();
        expect(argument.hasRightSideLabel()).toBe(false);
      }
    });

    it('should preserve other label when updating one', () => {
      const sideLabels: SideLabels = { left: 'Keep Me', right: 'Update Me' };
      const result = AtomicArgument.create(undefined, undefined, sideLabels);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;

        const setResult = argument.setRightSideLabel('Updated');
        expect(setResult.isOk()).toBe(true);
        expect(argument.getSideLabels()).toEqual({ left: 'Keep Me', right: 'Updated' });
      }
    });

    it('should handle setting both labels individually', () => {
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;

        const leftResult = argument.setLeftSideLabel('Left');
        expect(leftResult.isOk()).toBe(true);

        const rightResult = argument.setRightSideLabel('Right');
        expect(rightResult.isOk()).toBe(true);

        expect(argument.getSideLabels()).toEqual({ left: 'Left', right: 'Right' });
      }
    });
  });

  describe('side label edge cases', () => {
    it('should handle empty string labels correctly', () => {
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;

        const setResult = argument.setLeftSideLabel('   ');
        expect(setResult.isOk()).toBe(true);
        expect(argument.getSideLabels().left).toBe('   ');
        expect(argument.hasLeftSideLabel()).toBe(false); // Whitespace-only is false
      }
    });

    it('should handle whitespace-only labels in detection', () => {
      const sideLabels: SideLabels = { left: '', right: '   ' };
      const result = AtomicArgument.create(undefined, undefined, sideLabels);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        expect(argument.hasLeftSideLabel()).toBe(false);
        expect(argument.hasRightSideLabel()).toBe(false);
        expect(argument.hasSideLabels()).toBe(false);
      }
    });

    it('should handle very long side labels', () => {
      const longLabel = 'A'.repeat(1000);
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        const setResult = argument.setLeftSideLabel(longLabel);

        expect(setResult.isOk()).toBe(true);
        expect(argument.getSideLabels().left).toBe(longLabel);
        expect(argument.hasLeftSideLabel()).toBe(true);
      }
    });

    it('should handle special characters in labels', () => {
      const specialLabels: SideLabels = {
        left: '~!@#$%^&*()_+{}[]:";<>?,./\u2019',
        right: 'éñüäöß',
      };
      const result = AtomicArgument.create(undefined, undefined, specialLabels);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        expect(argument.getSideLabels()).toEqual(specialLabels);
        expect(argument.hasSideLabels()).toBe(true);
      }
    });
  });
});

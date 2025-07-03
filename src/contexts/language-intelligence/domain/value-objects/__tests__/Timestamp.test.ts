import { describe, expect, it, vi } from 'vitest';

import { ValidationError } from '../../errors/DomainErrors.js';
import { Timestamp } from '../Timestamp.js';

describe('Timestamp', () => {
  describe('create', () => {
    it('should create timestamp with valid date', () => {
      const date = new Date('2023-01-01T12:00:00Z');
      const result = Timestamp.create(date);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const timestamp = result.value;
        expect(timestamp.getValue()).toEqual(date);
        expect(timestamp.getMilliseconds()).toBe(date.getTime());
      }
    });

    it('should create defensive copy of date', () => {
      const originalDate = new Date('2023-01-01T12:00:00Z');
      const result = Timestamp.create(originalDate);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const timestamp = result.value;
        originalDate.setFullYear(2024); // Modify original date
        expect(timestamp.getValue().getFullYear()).toBe(2023); // Timestamp unchanged
      }
    });

    it('should return defensive copy from getValue', () => {
      const date = new Date('2023-01-01T12:00:00Z');
      const result = Timestamp.create(date);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const timestamp = result.value;
        const retrievedDate = timestamp.getValue();
        retrievedDate.setFullYear(2024); // Modify retrieved date
        expect(timestamp.getValue().getFullYear()).toBe(2023); // Timestamp unchanged
      }
    });

    it('should reject invalid date', () => {
      const invalidDate = new Date('invalid-date-string');
      const result = Timestamp.create(invalidDate);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Invalid date provided');
      }
    });

    it('should reject null date', () => {
      const result = Timestamp.create(null as any);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Invalid date provided');
      }
    });

    it('should reject undefined date', () => {
      const result = Timestamp.create(undefined as any);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Invalid date provided');
      }
    });
  });

  describe('fromMilliseconds', () => {
    it('should create timestamp from valid milliseconds', () => {
      const milliseconds = Date.UTC(2023, 0, 1, 12, 0, 0);
      const result = Timestamp.fromMilliseconds(milliseconds);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const timestamp = result.value;
        expect(timestamp.getMilliseconds()).toBe(milliseconds);
        expect(timestamp.getValue()).toEqual(new Date(milliseconds));
      }
    });

    it('should accept zero milliseconds', () => {
      const result = Timestamp.fromMilliseconds(0);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const timestamp = result.value;
        expect(timestamp.getMilliseconds()).toBe(0);
        expect(timestamp.getValue()).toEqual(new Date(0));
      }
    });

    it('should reject negative milliseconds', () => {
      const result = Timestamp.fromMilliseconds(-1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Timestamp cannot be negative');
      }
    });

    it('should reject large negative values', () => {
      const result = Timestamp.fromMilliseconds(-1000000);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Timestamp cannot be negative');
      }
    });
  });

  describe('fromISOString', () => {
    it('should create timestamp from valid ISO string', () => {
      const isoString = '2023-01-01T12:00:00.000Z';
      const result = Timestamp.fromISOString(isoString);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const timestamp = result.value;
        expect(timestamp.toISOString()).toBe(isoString);
      }
    });

    it('should handle different ISO string formats', () => {
      const formats = [
        '2023-01-01T12:00:00Z',
        '2023-01-01T12:00:00.123Z',
        '2023-01-01T12:00:00+00:00',
        '2023-01-01T12:00:00-05:00',
      ];

      for (const format of formats) {
        const result = Timestamp.fromISOString(format);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.toISOString()).toBeDefined();
        }
      }
    });

    it('should reject invalid ISO string', () => {
      const result = Timestamp.fromISOString('invalid-iso-string');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Invalid date provided');
      }
    });

    it('should reject empty string', () => {
      const result = Timestamp.fromISOString('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Invalid date provided');
      }
    });

    it('should reject malformed date strings', () => {
      const malformedStrings = ['2023-13-01', '2023-01-32', '2023-01-01T25:00:00Z'];

      for (const malformed of malformedStrings) {
        const result = Timestamp.fromISOString(malformed);
        expect(result.isErr()).toBe(true);
      }
    });
  });

  describe('now', () => {
    it('should create timestamp for current time', () => {
      const before = Date.now();
      const timestamp = Timestamp.now();
      const after = Date.now();

      const timestampMs = timestamp.getMilliseconds();
      expect(timestampMs).toBeGreaterThanOrEqual(before);
      expect(timestampMs).toBeLessThanOrEqual(after);
    });

    it('should create different timestamps on subsequent calls', async () => {
      const timestamp1 = Timestamp.now();
      await new Promise((resolve) => setTimeout(resolve, 1)); // Wait 1ms
      const timestamp2 = Timestamp.now();

      expect(timestamp1.getMilliseconds()).toBeLessThanOrEqual(timestamp2.getMilliseconds());
    });
  });

  describe('formatting methods', () => {
    describe('toISOString', () => {
      it('should return correct ISO string', () => {
        const date = new Date('2023-01-01T12:00:00.000Z');
        const result = Timestamp.create(date);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.toISOString()).toBe('2023-01-01T12:00:00.000Z');
        }
      });
    });

    describe('toLocaleDateString', () => {
      it('should return locale date string', () => {
        const date = new Date('2023-01-01T12:00:00.000Z');
        const result = Timestamp.create(date);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const dateString = result.value.toLocaleDateString();
          expect(typeof dateString).toBe('string');
          expect(dateString.length).toBeGreaterThan(0);
        }
      });
    });

    describe('toLocaleTimeString', () => {
      it('should return locale time string', () => {
        const date = new Date('2023-01-01T12:00:00.000Z');
        const result = Timestamp.create(date);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const timeString = result.value.toLocaleTimeString();
          expect(typeof timeString).toBe('string');
          expect(timeString.length).toBeGreaterThan(0);
        }
      });
    });

    describe('toLocaleString', () => {
      it('should return locale string', () => {
        const date = new Date('2023-01-01T12:00:00.000Z');
        const result = Timestamp.create(date);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const localeString = result.value.toLocaleString();
          expect(typeof localeString).toBe('string');
          expect(localeString.length).toBeGreaterThan(0);
        }
      });
    });

    describe('toString', () => {
      it('should return ISO string', () => {
        const date = new Date('2023-01-01T12:00:00.000Z');
        const result = Timestamp.create(date);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.toString()).toBe('2023-01-01T12:00:00.000Z');
        }
      });
    });
  });

  describe('comparison methods', () => {
    describe('isBefore', () => {
      it('should return true when timestamp is before another', () => {
        const earlier = Timestamp.create(new Date('2023-01-01'));
        const later = Timestamp.create(new Date('2023-01-02'));

        expect(earlier.isOk()).toBe(true);
        expect(later.isOk()).toBe(true);

        if (earlier.isOk() && later.isOk()) {
          expect(earlier.value.isBefore(later.value)).toBe(true);
        }
      });

      it('should return false when timestamp is after another', () => {
        const earlier = Timestamp.create(new Date('2023-01-01'));
        const later = Timestamp.create(new Date('2023-01-02'));

        expect(earlier.isOk()).toBe(true);
        expect(later.isOk()).toBe(true);

        if (earlier.isOk() && later.isOk()) {
          expect(later.value.isBefore(earlier.value)).toBe(false);
        }
      });

      it('should return false when timestamps are equal', () => {
        const date = new Date('2023-01-01');
        const timestamp1 = Timestamp.create(date);
        const timestamp2 = Timestamp.create(new Date(date.getTime()));

        expect(timestamp1.isOk()).toBe(true);
        expect(timestamp2.isOk()).toBe(true);

        if (timestamp1.isOk() && timestamp2.isOk()) {
          expect(timestamp1.value.isBefore(timestamp2.value)).toBe(false);
        }
      });
    });

    describe('isAfter', () => {
      it('should return true when timestamp is after another', () => {
        const earlier = Timestamp.create(new Date('2023-01-01'));
        const later = Timestamp.create(new Date('2023-01-02'));

        expect(earlier.isOk()).toBe(true);
        expect(later.isOk()).toBe(true);

        if (earlier.isOk() && later.isOk()) {
          expect(later.value.isAfter(earlier.value)).toBe(true);
        }
      });

      it('should return false when timestamp is before another', () => {
        const earlier = Timestamp.create(new Date('2023-01-01'));
        const later = Timestamp.create(new Date('2023-01-02'));

        expect(earlier.isOk()).toBe(true);
        expect(later.isOk()).toBe(true);

        if (earlier.isOk() && later.isOk()) {
          expect(earlier.value.isAfter(later.value)).toBe(false);
        }
      });

      it('should return false when timestamps are equal', () => {
        const date = new Date('2023-01-01');
        const timestamp1 = Timestamp.create(date);
        const timestamp2 = Timestamp.create(new Date(date.getTime()));

        expect(timestamp1.isOk()).toBe(true);
        expect(timestamp2.isOk()).toBe(true);

        if (timestamp1.isOk() && timestamp2.isOk()) {
          expect(timestamp1.value.isAfter(timestamp2.value)).toBe(false);
        }
      });
    });

    describe('equals', () => {
      it('should return true for equal timestamps', () => {
        const date = new Date('2023-01-01T12:00:00.000Z');
        const timestamp1 = Timestamp.create(date);
        const timestamp2 = Timestamp.create(new Date(date.getTime()));

        expect(timestamp1.isOk()).toBe(true);
        expect(timestamp2.isOk()).toBe(true);

        if (timestamp1.isOk() && timestamp2.isOk()) {
          expect(timestamp1.value.equals(timestamp2.value)).toBe(true);
        }
      });

      it('should return false for different timestamps', () => {
        const timestamp1 = Timestamp.create(new Date('2023-01-01'));
        const timestamp2 = Timestamp.create(new Date('2023-01-02'));

        expect(timestamp1.isOk()).toBe(true);
        expect(timestamp2.isOk()).toBe(true);

        if (timestamp1.isOk() && timestamp2.isOk()) {
          expect(timestamp1.value.equals(timestamp2.value)).toBe(false);
        }
      });

      it('should handle millisecond precision', () => {
        const timestamp1 = Timestamp.create(new Date('2023-01-01T12:00:00.000Z'));
        const timestamp2 = Timestamp.create(new Date('2023-01-01T12:00:00.001Z'));

        expect(timestamp1.isOk()).toBe(true);
        expect(timestamp2.isOk()).toBe(true);

        if (timestamp1.isOk() && timestamp2.isOk()) {
          expect(timestamp1.value.equals(timestamp2.value)).toBe(false);
        }
      });
    });
  });

  describe('age methods', () => {
    describe('getAge', () => {
      it('should return correct age in milliseconds', () => {
        const mockNow = 1000000;
        vi.spyOn(Date, 'now').mockReturnValue(mockNow);

        const timestamp = Timestamp.create(new Date(500000));

        expect(timestamp.isOk()).toBe(true);
        if (timestamp.isOk()) {
          expect(timestamp.value.getAge()).toBe(500000);
        }

        vi.restoreAllMocks();
      });

      it('should return 0 for current timestamp', () => {
        const now = Date.now();
        vi.spyOn(Date, 'now').mockReturnValue(now);

        const timestamp = Timestamp.create(new Date(now));

        expect(timestamp.isOk()).toBe(true);
        if (timestamp.isOk()) {
          expect(timestamp.value.getAge()).toBe(0);
        }

        vi.restoreAllMocks();
      });
    });

    describe('isOlderThan', () => {
      it('should return true when timestamp is older than specified milliseconds', () => {
        const mockNow = 1000000;
        vi.spyOn(Date, 'now').mockReturnValue(mockNow);

        const timestamp = Timestamp.create(new Date(500000));

        expect(timestamp.isOk()).toBe(true);
        if (timestamp.isOk()) {
          expect(timestamp.value.isOlderThan(400000)).toBe(true);
        }

        vi.restoreAllMocks();
      });

      it('should return false when timestamp is newer than specified milliseconds', () => {
        const mockNow = 1000000;
        vi.spyOn(Date, 'now').mockReturnValue(mockNow);

        const timestamp = Timestamp.create(new Date(800000));

        expect(timestamp.isOk()).toBe(true);
        if (timestamp.isOk()) {
          expect(timestamp.value.isOlderThan(300000)).toBe(false);
        }

        vi.restoreAllMocks();
      });
    });

    describe('isNewerThan', () => {
      it('should return true when timestamp is newer than specified milliseconds', () => {
        const mockNow = 1000000;
        vi.spyOn(Date, 'now').mockReturnValue(mockNow);

        const timestamp = Timestamp.create(new Date(800000));

        expect(timestamp.isOk()).toBe(true);
        if (timestamp.isOk()) {
          expect(timestamp.value.isNewerThan(300000)).toBe(true);
        }

        vi.restoreAllMocks();
      });

      it('should return false when timestamp is older than specified milliseconds', () => {
        const mockNow = 1000000;
        vi.spyOn(Date, 'now').mockReturnValue(mockNow);

        const timestamp = Timestamp.create(new Date(500000));

        expect(timestamp.isOk()).toBe(true);
        if (timestamp.isOk()) {
          expect(timestamp.value.isNewerThan(400000)).toBe(false);
        }

        vi.restoreAllMocks();
      });
    });
  });

  describe('arithmetic methods', () => {
    describe('addMilliseconds', () => {
      it('should add positive milliseconds', () => {
        const original = Timestamp.create(new Date('2023-01-01T12:00:00.000Z'));

        expect(original.isOk()).toBe(true);
        if (original.isOk()) {
          const added = original.value.addMilliseconds(5000);
          expect(added.toISOString()).toBe('2023-01-01T12:00:05.000Z');
        }
      });

      it('should add negative milliseconds (subtract)', () => {
        const original = Timestamp.create(new Date('2023-01-01T12:00:05.000Z'));

        expect(original.isOk()).toBe(true);
        if (original.isOk()) {
          const subtracted = original.value.addMilliseconds(-5000);
          expect(subtracted.toISOString()).toBe('2023-01-01T12:00:00.000Z');
        }
      });

      it('should not modify original timestamp', () => {
        const original = Timestamp.create(new Date('2023-01-01T12:00:00.000Z'));

        expect(original.isOk()).toBe(true);
        if (original.isOk()) {
          const originalIso = original.value.toISOString();
          original.value.addMilliseconds(5000);
          expect(original.value.toISOString()).toBe(originalIso);
        }
      });
    });

    describe('addSeconds', () => {
      it('should add seconds correctly', () => {
        const original = Timestamp.create(new Date('2023-01-01T12:00:00.000Z'));

        expect(original.isOk()).toBe(true);
        if (original.isOk()) {
          const added = original.value.addSeconds(30);
          expect(added.toISOString()).toBe('2023-01-01T12:00:30.000Z');
        }
      });

      it('should handle fractional seconds', () => {
        const original = Timestamp.create(new Date('2023-01-01T12:00:00.000Z'));

        expect(original.isOk()).toBe(true);
        if (original.isOk()) {
          const added = original.value.addSeconds(1.5);
          expect(added.toISOString()).toBe('2023-01-01T12:00:01.500Z');
        }
      });
    });

    describe('addMinutes', () => {
      it('should add minutes correctly', () => {
        const original = Timestamp.create(new Date('2023-01-01T12:00:00.000Z'));

        expect(original.isOk()).toBe(true);
        if (original.isOk()) {
          const added = original.value.addMinutes(30);
          expect(added.toISOString()).toBe('2023-01-01T12:30:00.000Z');
        }
      });

      it('should handle fractional minutes', () => {
        const original = Timestamp.create(new Date('2023-01-01T12:00:00.000Z'));

        expect(original.isOk()).toBe(true);
        if (original.isOk()) {
          const added = original.value.addMinutes(1.5);
          expect(added.toISOString()).toBe('2023-01-01T12:01:30.000Z');
        }
      });
    });

    describe('addHours', () => {
      it('should add hours correctly', () => {
        const original = Timestamp.create(new Date('2023-01-01T12:00:00.000Z'));

        expect(original.isOk()).toBe(true);
        if (original.isOk()) {
          const added = original.value.addHours(6);
          expect(added.toISOString()).toBe('2023-01-01T18:00:00.000Z');
        }
      });

      it('should handle day rollover', () => {
        const original = Timestamp.create(new Date('2023-01-01T20:00:00.000Z'));

        expect(original.isOk()).toBe(true);
        if (original.isOk()) {
          const added = original.value.addHours(8);
          expect(added.toISOString()).toBe('2023-01-02T04:00:00.000Z');
        }
      });
    });

    describe('addDays', () => {
      it('should add days correctly', () => {
        const original = Timestamp.create(new Date('2023-01-01T12:00:00.000Z'));

        expect(original.isOk()).toBe(true);
        if (original.isOk()) {
          const added = original.value.addDays(7);
          expect(added.toISOString()).toBe('2023-01-08T12:00:00.000Z');
        }
      });

      it('should handle month rollover', () => {
        const original = Timestamp.create(new Date('2023-01-25T12:00:00.000Z'));

        expect(original.isOk()).toBe(true);
        if (original.isOk()) {
          const added = original.value.addDays(10);
          expect(added.toISOString()).toBe('2023-02-04T12:00:00.000Z');
        }
      });

      it('should handle negative days (subtract)', () => {
        const original = Timestamp.create(new Date('2023-01-08T12:00:00.000Z'));

        expect(original.isOk()).toBe(true);
        if (original.isOk()) {
          const subtracted = original.value.addDays(-7);
          expect(subtracted.toISOString()).toBe('2023-01-01T12:00:00.000Z');
        }
      });
    });
  });

  describe('edge cases', () => {
    it('should handle leap year dates', () => {
      const leapDay = Timestamp.create(new Date('2024-02-29T12:00:00.000Z'));

      expect(leapDay.isOk()).toBe(true);
      if (leapDay.isOk()) {
        expect(leapDay.value.toISOString()).toBe('2024-02-29T12:00:00.000Z');
      }
    });

    it('should handle daylight saving time transitions', () => {
      // This test verifies DST handling by working with UTC timestamps
      const beforeDST = Timestamp.create(new Date('2023-03-12T06:00:00.000Z'));
      const afterDST = Timestamp.create(new Date('2023-03-12T07:00:00.000Z'));

      expect(beforeDST.isOk()).toBe(true);
      expect(afterDST.isOk()).toBe(true);

      if (beforeDST.isOk() && afterDST.isOk()) {
        expect(afterDST.value.isAfter(beforeDST.value)).toBe(true);
      }
    });

    it('should handle very large timestamps', () => {
      const largeTimestamp = 8640000000000000; // Year 275760
      const result = Timestamp.fromMilliseconds(largeTimestamp);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getMilliseconds()).toBe(largeTimestamp);
      }
    });

    it('should handle year boundaries', () => {
      const newYearEve = Timestamp.create(new Date('2022-12-31T23:59:59.999Z'));
      const newYear = Timestamp.create(new Date('2023-01-01T00:00:00.000Z'));

      expect(newYearEve.isOk()).toBe(true);
      expect(newYear.isOk()).toBe(true);

      if (newYearEve.isOk() && newYear.isOk()) {
        expect(newYear.value.isAfter(newYearEve.value)).toBe(true);
        expect(newYear.value.getMilliseconds() - newYearEve.value.getMilliseconds()).toBe(1);
      }
    });
  });
});

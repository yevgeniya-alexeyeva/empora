import { describe, expect, it } from '@jest/globals';
import { parseTtlSeconds } from './ttl';

describe('parseTtlSeconds', () => {
  it.each([
    ['30s', 30],
    ['15m', 900],
    ['2h', 7200],
    ['7d', 604800],
  ])('parses %s', (value, expected) => {
    expect(parseTtlSeconds(value)).toBe(expected);
  });

  it.each(['', '15', '0m', '-1h', '1w', '1.5h', '9007199254740991d'])(
    'rejects unsafe TTL %s',
    (value) => {
      expect(() => parseTtlSeconds(value)).toThrow();
    },
  );
});

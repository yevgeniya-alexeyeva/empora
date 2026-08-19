const TTL_MULTIPLIERS = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
} as const;

export function parseTtlSeconds(value: string): number {
  const match = /^([1-9]\d*)([smhd])$/.exec(value);
  if (!match) throw new Error(`Unsupported JWT TTL: ${value}`);

  const amount = Number(match[1]);
  const seconds =
    amount * TTL_MULTIPLIERS[match[2] as keyof typeof TTL_MULTIPLIERS];
  if (!Number.isSafeInteger(seconds)) {
    throw new Error(`JWT TTL is too large: ${value}`);
  }

  return seconds;
}

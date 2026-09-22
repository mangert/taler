const durationPattern = /^([1-9]\d*)(ms|s|m|h|d|w)$/;
const millisecondsByUnit = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
} as const;

export function jwtDurationToSeconds(value: string): number {
  const match = durationPattern.exec(value);

  if (!match) {
    throw new Error('JWT_EXPIRES_IN must be a positive duration');
  }

  const amount = Number(match[1]);
  const unit = match[2] as keyof typeof millisecondsByUnit;

  return Math.max(1, Math.ceil((amount * millisecondsByUnit[unit]) / 1_000));
}

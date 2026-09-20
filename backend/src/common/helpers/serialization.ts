export interface DecimalValue {
  toFixed(fractionDigits: number): string;
}

export function serializeDecimal(
  value: DecimalValue,
  fractionDigits: number,
): string {
  return value.toFixed(fractionDigits);
}

export function serializeIsoDateTime(value: Date): string {
  return value.toISOString();
}

export function serializeIsoDate(value: Date): string {
  return serializeIsoDateTime(value).slice(0, 10);
}

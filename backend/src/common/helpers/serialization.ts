/** Форматирует числа и даты для ответов API. */
export interface DecimalValue {
  toFixed(fractionDigits: number): string;
}

/** Преобразует десятичное число в строку. */
export function serializeDecimal(
  value: DecimalValue,
  fractionDigits: number,
): string {
  return value.toFixed(fractionDigits);
}

/** Форматирует дату и время по ISO. */
export function serializeIsoDateTime(value: Date): string {
  return value.toISOString();
}

/** Форматирует календарную дату по ISO. */
export function serializeIsoDate(value: Date): string {
  return serializeIsoDateTime(value).slice(0, 10);
}

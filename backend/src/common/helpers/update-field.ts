export type UpdateFieldState<T> =
  { isProvided: false } | { isProvided: true; value: T };

export function getUpdateFieldState<
  TDto extends object,
  TKey extends keyof TDto,
>(dto: TDto, key: TKey): UpdateFieldState<TDto[TKey]> {
  if (Object.prototype.hasOwnProperty.call(dto, key)) {
    return {
      isProvided: true,
      value: dto[key],
    };
  }

  return { isProvided: false };
}

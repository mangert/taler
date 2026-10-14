/** Проверяет идентификаторы часовых поясов. */
/** Проверяет идентификатор часового пояса. */
export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('ru-RU', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

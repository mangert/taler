import { expect, type Page } from '@playwright/test';

export function trackBrowserErrors(page: Page): () => void {
  const consoleErrors: string[] = [];
  const uncaughtErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => uncaughtErrors.push(error.message));

  return () => {
    expect(consoleErrors, 'browser console errors').toEqual([]);
    expect(uncaughtErrors, 'uncaught browser errors').toEqual([]);
  };
}

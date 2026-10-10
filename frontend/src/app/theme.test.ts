import { getContrastRatio } from '@mui/material/styles';
import { appTheme } from './theme';

function channels(hex: string): number[] {
  return [1, 3, 5].map((start) =>
    Number.parseInt(hex.slice(start, start + 2), 16),
  );
}

it('uses a readable dark palette with warm gold and moss accents', () => {
  const { palette } = appTheme;

  expect(palette.mode).toBe('dark');
  expect(
    getContrastRatio(palette.text.primary, palette.background.default),
  ).toBeGreaterThanOrEqual(7);
  expect(
    getContrastRatio(palette.text.secondary, palette.background.paper),
  ).toBeGreaterThanOrEqual(4.5);
  expect(
    getContrastRatio(palette.primary.main, palette.background.paper),
  ).toBeGreaterThanOrEqual(4.5);
  expect(
    getContrastRatio(palette.secondary.main, palette.background.paper),
  ).toBeGreaterThanOrEqual(4.5);
  expect(
    getContrastRatio(palette.primary.contrastText, palette.primary.main),
  ).toBeGreaterThanOrEqual(4.5);
  for (const tone of ['success', 'warning', 'error', 'info'] as const) {
    expect(
      getContrastRatio(palette[tone].main, palette.background.paper),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      getContrastRatio(palette[tone].contrastText, palette[tone].main),
    ).toBeGreaterThanOrEqual(4.5);
  }

  const [goldRed, goldGreen, goldBlue] = channels(palette.primary.main);
  const [mossRed, mossGreen, mossBlue] = channels(palette.secondary.main);
  expect(goldRed).toBeGreaterThan(goldGreen);
  expect(goldGreen).toBeGreaterThan(goldBlue);
  expect(mossGreen).toBeGreaterThan(mossRed);
  expect(mossRed).toBeGreaterThan(mossBlue);
});

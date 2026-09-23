import { pickCategoryIconColor } from './category-color';

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => {
    const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first: string, second: string): number {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

it.each([
  '#000000',
  '#FFFFFF',
  '#777777',
  '#2E7D32',
  '#EF6C00',
  '#123456',
  '#AAAAAA',
])('chooses an icon color with WCAG AA contrast on %s', (background) => {
  expect(
    contrastRatio(background, pickCategoryIconColor(background)),
  ).toBeGreaterThanOrEqual(4.5);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import colors from '../constants/colors.ts';

function rgba(value) {
  if (value.startsWith('#')) {
    return [...value.slice(1).match(/../g).map(channel => parseInt(channel, 16) / 255), 1];
  }
  const parts = value.match(/[\d.]+/g).map(Number);
  return [parts[0] / 255, parts[1] / 255, parts[2] / 255, parts[3] ?? 1];
}

function over(foreground, background) {
  const alpha = foreground[3];
  return foreground.slice(0, 3).map((channel, index) => channel * alpha + background[index] * (1 - alpha)).concat(1);
}

function withOpacity(value, opacity) {
  const colour = rgba(value);
  colour[3] *= opacity;
  return colour;
}

function luminance(value) {
  const channels = value.slice(0, 3).map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('premium card surfaces remain translucent in both appearances', () => {
  for (const appearance of ['light', 'dark']) {
    const theme = colors[appearance];
    assert.ok(rgba(theme.glassFill)[3] > 0 && rgba(theme.glassFill)[3] < 1);
    for (const token of ['glassTintTeal', 'glassTintGold', 'glassBorder', 'glassHighlight', 'canvasWashTeal', 'canvasWashGold', 'canvasWashMist']) {
      assert.equal(rgba(theme[token]).length, 4, `${appearance} ${token}`);
    }
    assert.equal(theme.buttonBackground, theme.splashEnd, 'primary buttons retain the exact approved colour');
  }
});

test('body and secondary labels remain readable over static and animated glass layers', () => {
  const minimumRatios = new Map();
  for (const appearance of ['light', 'dark']) {
    const theme = colors[appearance];
    const base = rgba(theme.background);
    for (const wash of ['canvasWashTeal', 'canvasWashGold', 'canvasWashMist']) {
      const washBase = over(rgba(theme[wash]), base);
      // Match BrandBackdrop paint order and maximum field opacities. Test the
      // conservative overlap even though the moving fields sit in opposite corners.
      const fields = over(withOpacity(theme.canvasWashGold, 0.7), over(withOpacity(theme.canvasWashTeal, 0.75), washBase));
      for (const [mode, canvas] of [
        ['static', over(rgba(theme.canvasWashMist), washBase)],
        ['moving', over(rgba(theme.canvasWashMist), fields)],
      ]) {
        const card = over(rgba(theme.glassFill), canvas);
        for (const tint of ['glassTintTeal', 'glassTintGold', 'glassFill']) {
          const surface = over(rgba(theme[tint]), card);
          const sheen = over(withOpacity(theme.glassHighlight, 0.55), surface);
          const corner = over(withOpacity(theme.glassHighlight, 0.22), sheen);
          const reflection = over(withOpacity(theme.glassHighlight, 0.32), corner);
          for (const background of [canvas, surface, sheen, corner, reflection]) {
            for (const text of ['foreground', 'mutedForeground']) {
              const ratio = contrast(rgba(theme[text]), background);
              const key = `${appearance} ${mode} ${text}`;
              minimumRatios.set(key, Math.min(minimumRatios.get(key) ?? Infinity, ratio));
            }
          }
        }
      }
    }
  }
  const failures = [...minimumRatios].filter(([, ratio]) => ratio < 4.5)
    .map(([key, ratio]) => `${key}: ${ratio.toFixed(2)}:1`);
  assert.deepEqual(failures, [], 'all text must retain at least 4.5:1 contrast, including peak reflections');
});

test('glass decorations do not intercept gestures or enter the accessibility tree', () => {
  const source = readFileSync(new URL('../components/GlassSurface.tsx', import.meta.url), 'utf8');
  for (const name of ['GlassLayers', 'BrandBackdrop']) {
    const remainder = source.slice(source.indexOf(`export function ${name}`));
    const nextFunction = remainder.indexOf('\nexport function ', 1);
    const body = nextFunction === -1 ? remainder : remainder.slice(0, nextFunction);
    assert.match(body, /pointerEvents="none"/);
    assert.match(body, /accessible=\{false\}/);
    assert.match(body, /importantForAccessibility="no-hide-descendants"/);
  }
  assert.doesNotMatch(source, /import.*BlurView/, 'scrolling cards use lightweight layers rather than individual backdrop blurs');
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { inflateSync } from 'node:zlib';
import colors from '../constants/colors.ts';

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map(value => {
    const channel = Number.parseInt(value, 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('mobile brand accents use the supplied splash reference teal', () => {
  assert.equal(colors.light.primary.toUpperCase(), '#0A3335');
  assert.equal(colors.light.tint, colors.light.primary);
  assert.equal(colors.light.allocationBalance, colors.light.primary);
});

test('brand buttons and body text remain readable in light and dark appearances', () => {
  for (const name of ['light', 'dark']) {
    const theme = colors[name];
    assert.equal(theme.buttonBackground, theme.splashEnd, `${name} buttons match the splash background exactly`);
    assert.ok(contrast(theme.buttonBackground, theme.buttonForeground) >= 4.5, `${name} button label contrast`);
    assert.ok(contrast(theme.primary, theme.primaryForeground) >= 4.5, `${name} button text contrast`);
    assert.ok(contrast(theme.background, theme.foreground) >= 4.5, `${name} body text contrast`);
    assert.notEqual(theme.primary, theme.destructive, `${name} errors retain a separate semantic color`);
    assert.notEqual(theme.primary, theme.statusPending, `${name} pending states retain a separate semantic color`);
  }
});

test('splash artwork colors stay consistent across appearance settings', () => {
  for (const key of ['splashStart', 'splashMid', 'splashEnd', 'splashText', 'splashMuted']) {
    assert.equal(colors.light[key], colors.dark[key], key);
  }
  assert.ok(contrast(colors.light.splashEnd, colors.light.splashText) >= 4.5);
});

test('native splash uses a bundled PNG and the matching runtime splash background', () => {
  const config = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo;
  const plugin = config.plugins.find(value => Array.isArray(value) && value[0] === 'expo-splash-screen');
  assert.ok(plugin, 'native splash plugin is configured');
  assert.equal(plugin[1].backgroundColor, colors.light.splashEnd);
  assert.equal(plugin[1].image, './assets/images/splash-transparent.png');
  const image = readFileSync(new URL(`../${plugin[1].image.replace(/^\.\//, '')}`, import.meta.url));
  assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
});

test('native launch splash keeps its teal background without showing a second logo', () => {
  const config = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo;
  const plugin = config.plugins.find(value => Array.isArray(value) && value[0] === 'expo-splash-screen');
  const image = readFileSync(new URL(`../${plugin[1].image.replace(/^\.\//, '')}`, import.meta.url));
  const chunks = [];
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  while (offset < image.length) {
    const length = image.readUInt32BE(offset);
    const type = image.toString('ascii', offset + 4, offset + 8);
    const data = image.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
    } else if (type === 'IDAT') {
      chunks.push(data);
    }
    offset += length + 12;
  }
  const decoded = inflateSync(Buffer.concat(chunks));
  const rowBytes = width * 4;
  assert.equal(colorType, 6, 'the image uses RGBA transparency');
  assert.equal(width, 288);
  assert.equal(height, 288);
  for (let y = 0; y < height; y += 1) {
    const row = decoded.subarray(y * (rowBytes + 1), (y + 1) * (rowBytes + 1));
    assert.equal(row[0], 0, 'each image row uses the None filter');
    assert.ok(row.subarray(1).every(channel => channel === 0), 'all native splash pixels are transparent');
  }
});

test('the branded splash wordmark fits the available width on narrow devices', () => {
  const screen = readFileSync(new URL('../app/index.tsx', import.meta.url), 'utf8');
  assert.match(screen, /const textBlockWidth = Math\.min\(Math\.max\(width - 48, 0\), 400\)/);
  assert.match(screen, /const wordmarkFontSize = Math\.min\(26, Math\.max\(17, Math\.round\(textBlockWidth \/ 14\)\)\)/);
  assert.match(screen, /adjustsFontSizeToFit/);
  assert.match(screen, /minimumFontScale=\{0\.72\}/);
});

function pngDimensions(relativePath) {
  const data = readFileSync(new URL(`../${relativePath.replace(/^\.\//, '')}`, import.meta.url));
  assert.deepEqual([...data.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
}

test('official mobile launcher assets use properly sized approved-logo PNGs', () => {
  const config = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo;
  assert.equal(config.icon, './assets/images/og-app-icon.png');
  assert.equal(config.ios.icon, config.icon);
  assert.equal(config.android.icon, config.icon);
  assert.deepEqual(pngDimensions(config.icon), [1024, 1024]);
  assert.equal(config.android.adaptiveIcon.foregroundImage, './assets/images/og-adaptive-foreground.png');
  assert.deepEqual(pngDimensions(config.android.adaptiveIcon.foregroundImage), [1024, 1024]);
  assert.equal(config.android.adaptiveIcon.backgroundColor, colors.light.splashEnd);
  assert.equal(config.android.adaptiveIcon.backgroundImage, './assets/images/og-icon-background.png');
  assert.deepEqual(pngDimensions(config.android.adaptiveIcon.backgroundImage), [1024, 1024]);
  assert.equal(config.web.favicon, './assets/images/og-favicon.png');
  assert.deepEqual(pngDimensions(config.web.favicon), [128, 128]);
});

test('approved OG vector draws the G layers after its background', () => {
  const source = readFileSync(new URL('../assets/images/og-official-mark.svg', import.meta.url), 'utf8');
  assert.match(source, /<g id="G">/);
  assert.match(source, /<g id="Gout"/);
  assert.match(source, /<rect width="1024" height="1024" fill="url\(#bg\)"\/>\s*<use href="#Gout"\/>\s*<use href="#G"\/>/);
});

test('screen and PDF branding share the transparent approved splash mark', () => {
  assert.deepEqual(pngDimensions('assets/images/og-official-mark.png'), [389, 270]);
  const component = readFileSync(new URL('../components/BrandMark.tsx', import.meta.url), 'utf8');
  const pdf = readFileSync(new URL('./pdf-export.ts', import.meta.url), 'utf8');
  assert.ok(component.includes("require('../assets/images/og-official-mark.png')"));
  assert.ok(pdf.includes("import { officialPdfLogoDataUri } from './pdf-logo'"));
  assert.equal(pdf.includes('Asset.fromModule'), false);
  assert.equal(pdf.includes('.base64()'), false, 'PDF branding does not read the asset through a potentially relative native file URI');
  for (const route of ['(auth)/login', '(auth)/register', 'lock', 'onboarding', '(tabs)/index']) {
    const source = readFileSync(new URL(`../app/${route}.tsx`, import.meta.url), 'utf8');
    assert.match(source, /<(?:BrandMark|AuthBrandHeader)\b/, `${route} uses shared approved branding`);
    assert.equal(source.includes('og-logo.png'), false, `${route} does not use the former logo`);
  }
});

test('login and registration use the same brand sizing and approved logo component', () => {
  const header = readFileSync(new URL('../components/AuthBrandHeader.tsx', import.meta.url), 'utf8');
  assert.match(header, /<BrandMark width=\{120\}/);
  assert.match(header, /fontSize: 22, lineHeight: 28/);
  for (const route of ['login', 'register']) {
    const source = readFileSync(new URL(`../app/(auth)/${route}.tsx`, import.meta.url), 'utf8');
    assert.match(source, /<AuthBrandHeader\s*\/>/);
  }
});

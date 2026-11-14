import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import themes from '../constants/colors.ts';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const decoration = read('../components/BalanceGlass.tsx');
const parse = text => ts.createSourceFile('surface.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function nodes(source, predicate) {
  const found = [];
  function visit(node) {
    if (predicate(node)) found.push(node);
    ts.forEachChild(node, visit);
  }
  visit(source);
  return found;
}
const opening = node => ts.isJsxElement(node) ? node.openingElement : node;
const attr = (node, name) => opening(node).attributes.properties.find(prop => prop.name?.getText() === name);
const jsx = node => ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node);
function inside(node, ancestor) {
  for (let parent = node.parent; parent; parent = parent.parent) if (parent === ancestor) return true;
  return false;
}
const files = [
  ['../app/(tabs)/index.tsx', 'home-fixed-balance-card'],
  ['../app/(tabs)/wallet.tsx', 'wallet-balance-card'],
];

test('combined balance-glass opacity has a real, explicit maximum of ten percent', () => {
  const source = parse(decoration);
  const constants = new Map(nodes(source, ts.isVariableDeclaration)
    .filter(node => node.initializer && ts.isNumericLiteral(node.initializer))
    .map(node => [node.name.getText(), Number(node.initializer.text)]));
  assert.equal(constants.get('BALANCE_GLASS_MAX_OPACITY'), 0.1);
  const opacities = nodes(source, node => ts.isPropertyAssignment(node) && node.name.getText() === 'opacity')
    .map(node => ts.isNumericLiteral(node.initializer) ? Number(node.initializer.text) : constants.get(node.initializer.getText()));
  assert.ok(opacities.length > 0);
  assert.ok(opacities.every(value => Number.isFinite(value) && value > 0));
  assert.ok(opacities.reduce((sum, value) => sum + value, 0) <= constants.get('BALANCE_GLASS_MAX_OPACITY') + 1e-9,
    'even overlapping decorative layers cannot exceed the requested budget');
});

test('glass decoration cannot capture touches, speak to screen readers or add a new animation workload', () => {
  assert.match(decoration, /pointerEvents="none"/);
  assert.match(decoration, /accessible=\{false\}/);
  assert.match(decoration, /accessibilityElementsHidden/);
  assert.match(decoration, /importantForAccessibility="no-hide-descendants"/);
  assert.match(decoration, /StyleSheet\.absoluteFill/);
  assert.match(decoration, /colors\.balanceCardText/);
  assert.doesNotMatch(decoration, /\b(?:Animated|BlurView|useEffect|setTimeout|setInterval|requestAnimationFrame|onLayout)\b/);
});

test('the frosted finish has no shine band and its outline follows each card shape', () => {
  const source = parse(decoration);
  const frost = nodes(source, node => jsx(node) && attr(node, 'testID')?.initializer?.text === 'balance-glass-frost')[0];
  assert.ok(frost);
  assert.equal(opening(frost).tagName.getText(), 'View');
  assert.match(attr(frost, 'style').getText(), /StyleSheet\.absoluteFill/);
  assert.match(attr(frost, 'style').getText(), /backgroundColor: tint/);
  assert.doesNotMatch(decoration, /LinearGradient|SHEEN_OPACITY|balance-glass-sheen/);
  assert.match(decoration, /borderTopLeftRadius: 0/);
  assert.match(decoration, /borderBottomLeftRadius: radius/);
  assert.match(decoration, /borderTopWidth: bottomOnly \? 0/);
  assert.match(read('../app/(tabs)/index.tsx'), /<BalanceGlass radius=\{30\} bottomOnly \/>/);
  assert.match(read('../app/(tabs)/wallet.tsx'), /<BalanceGlass radius=\{22\} \/>/);
});

test('only the two existing opaque green heroes receive the shared glass decoration', () => {
  for (const [path, id] of files) {
    const source = parse(read(path));
    const hero = nodes(source, node => jsx(node) && attr(node, 'testID')?.initializer?.text === id)[0];
    assert.ok(hero, id);
    const overlays = nodes(source, node => jsx(node) && opening(node).tagName.getText() === 'BalanceGlass');
    assert.equal(overlays.length, 1);
    assert.ok(inside(overlays[0], hero));
    assert.doesNotMatch(attr(hero, 'style').getText(), /\bopacity\b/, 'do not fade the balance or make the card transparent');
    const gradient = attr(hero, 'colors').getText();
    assert.match(gradient, /colors\.balanceCardStart/);
    assert.match(gradient, /colors\.balanceCardEnd/);
    assert.match(attr(hero, 'style').getText(), /overflow: 'hidden'/);
  }
});

const rgb = hex => hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255);
const over = (front, back, alpha) => front.map((value, index) => value * alpha + back[index] * (1 - alpha));
const luminance = colour => colour.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);

test('small secondary labels remain readable in either theme at the maximum glass strength', () => {
  const labelOpacities = [1];
  for (const [path, id] of files) {
    const source = parse(read(path));
    const hero = nodes(source, node => jsx(node) && attr(node, 'testID')?.initializer?.text === id)[0];
    for (const text of nodes(hero, node => jsx(node) && opening(node).tagName.getText() === 'Text')) {
      const style = attr(text, 'style');
      if (!style) continue;
      const values = nodes(style, node => ts.isPropertyAssignment(node) && node.name.getText() === 'opacity');
      for (const value of values) {
        assert.ok(ts.isNumericLiteral(value.initializer), 'secondary text alpha stays explicit');
        labelOpacities.push(Number(value.initializer.text));
      }
    }
  }
  for (const theme of [themes.light, themes.dark]) {
    const ink = rgb(theme.balanceCardText);
    for (let step = 0; step <= 20; step++) {
      const base = over(rgb(theme.balanceCardStart), rgb(theme.balanceCardEnd), step / 20);
      const background = over(ink, base, 0.1);
      for (const opacity of labelOpacities) {
        const foreground = over(ink, background, opacity);
        const ratio = (luminance(foreground) + 0.05) / (luminance(background) + 0.05);
        assert.ok(ratio >= 4.5, `secondary alpha ${opacity} must retain normal-text contrast, got ${ratio.toFixed(2)}`);
      }
    }
  }
});

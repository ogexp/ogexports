import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const text = readFileSync(new URL('../app/(tabs)/index.tsx', import.meta.url), 'utf8');
const source = ts.createSourceFile('home.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const elements = [];
function visit(node) {
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) elements.push(node);
  ts.forEachChild(node, visit);
}
visit(source);
const opening = node => ts.isJsxElement(node) ? node.openingElement : node;
const tag = node => opening(node).tagName.getText(source);
function byId(id) {
  const element = elements.find(node => opening(node).attributes.properties.some(prop =>
    ts.isJsxAttribute(prop) && prop.name.getText(source) === 'testID'
      && prop.initializer && ts.isStringLiteral(prop.initializer) && prop.initializer.text === id));
  assert.ok(element, `expected ${id}`);
  return element;
}
function ancestors(node) {
  const result = [];
  for (let parent = node.parent; parent; parent = parent.parent) result.push(parent);
  return result;
}

test('the Home balance and four-action dock stay outside the scrolling content', () => {
  const fixed = byId('home-fixed-header');
  const lower = byId('home-lower-region');
  const scroll = byId('home-scroll-content');
  assert.equal(fixed.parent, lower.parent, 'fixed hero and lower region are siblings');
  assert.equal(scroll.parent, lower, 'the lower region owns scrolling');
  assert.ok(fixed.pos < scroll.pos, 'header stays before the scrolling body');
  assert.equal(tag(scroll), 'ScrollView');
  for (const id of ['home-fixed-balance-card', 'home-fixed-quick-actions']) {
    const parents = ancestors(byId(id));
    assert.ok(parents.includes(id === 'home-fixed-balance-card' ? fixed : lower), `${id} belongs to its pinned layer`);
    assert.ok(!parents.some(node => ts.isJsxElement(node) && tag(node) === 'ScrollView'), `${id} cannot move with a scroll container`);
  }
});

test('the background below the green hero scrolls behind the floating action card', () => {
  const scroll = byId('home-scroll-content');
  const background = byId('home-scrolling-background');
  assert.ok(ancestors(background).includes(scroll), 'background belongs to scrolling content, not the fixed screen root');
  const backdrops = elements.filter(node => tag(node) === 'RouteBrandBackdrop');
  assert.equal(backdrops.length, 1);
  assert.ok(ancestors(backdrops[0]).includes(background));
  const dock = byId('home-fixed-quick-actions');
  assert.ok(!ancestors(dock).includes(scroll), 'only the glass action card stays fixed over the moving background');
  assert.match(dock.getText(source), /onLayout=.*setQuickActionsHeight/);
  assert.match(scroll.getText(source), /paddingTop: Math\.max\(0, quickActionsHeight - quickActionsOverlap\) \+ quickActionsGap/);
  const overlay = ancestors(dock).find(node => ts.isJsxElement(node) && opening(node).attributes.properties.some(prop =>
    ts.isJsxAttribute(prop) && prop.name.getText(source) === 'pointerEvents'
      && prop.initializer && ts.isStringLiteral(prop.initializer) && prop.initializer.text === 'box-none'));
  assert.ok(overlay, 'the transparent overlay passes gestures outside the card through to the page');
});

test('balance privacy, account menu and header navigation stay in the pinned region', () => {
  const fixed = byId('home-fixed-header');
  for (const id of ['home-account-menu', 'home-account-selector', 'home-toggle-sensitive-values', 'home-notifications', 'home-settings']) {
    assert.ok(ancestors(byId(id)).includes(fixed), `${id} stays available while scrolling`);
  }
  for (const route of ['/wallet/deposit', '/(tabs)/opportunities', '/wallet/withdraw', '/(tabs)/portfolio']) {
    assert.ok(text.includes(`router.push('${route}')`), `${route} remains a quick-action destination`);
  }
});

test('the lower Home region keeps refresh, tab-scroll behavior and room above navigation', () => {
  const scroll = byId('home-scroll-content');
  assert.ok(ancestors(byId('home-pull-to-refresh')).includes(scroll), 'pull-to-refresh stays on the lower content');
  const body = scroll.getText(source);
  assert.match(body, /HomeSection title="Account Overview"/);
  assert.match(body, /onScroll=\{tabBarBehavior\.onScroll\}/);
  assert.match(body, /onMomentumScrollEnd=\{tabBarBehavior\.onScrollSettled\}/);
  assert.match(body, /minHeight: 0/);
  assert.match(body, /insets\.bottom \+ 112/);
});

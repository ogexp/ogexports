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
  const scroll = byId('home-scroll-content');
  assert.equal(fixed.parent, scroll.parent, 'fixed header and content are siblings in the flex screen');
  assert.ok(fixed.pos < scroll.pos, 'header stays before the scrolling body');
  assert.equal(tag(scroll), 'ScrollView');
  for (const id of ['home-fixed-balance-card', 'home-fixed-quick-actions']) {
    const parents = ancestors(byId(id));
    assert.ok(parents.includes(fixed), `${id} belongs to the fixed group`);
    assert.ok(!parents.some(node => ts.isJsxElement(node) && tag(node) === 'ScrollView'), `${id} cannot move with a scroll container`);
  }
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

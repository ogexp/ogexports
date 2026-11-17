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
const attr = (node, name) => opening(node).attributes.properties.find(prop => ts.isJsxAttribute(prop) && prop.name.getText(source) === name);
const attrText = (node, name) => attr(node, name)?.initializer?.getText(source) ?? '';
function byId(id) {
  const element = elements.find(node => {
    const prop = attr(node, 'testID');
    return prop && prop.initializer && ts.isStringLiteral(prop.initializer) && prop.initializer.text === id;
  });
  assert.ok(element, `expected ${id}`);
  return element;
}
function ancestors(node) {
  const result = [];
  for (let parent = node.parent; parent; parent = parent.parent) result.push(parent);
  return result;
}
const jsxParent = node => ancestors(node).find(n => ts.isJsxElement(n));
const insideScroll = node => ancestors(node).some(n => ts.isJsxElement(n) && tag(n) === 'ScrollView');

test('the balance hero and quick actions live in the same natural scroll flow', () => {
  const scroll = byId('home-scroll-content');
  assert.equal(tag(scroll), 'ScrollView');
  for (const id of ['home-scrolling-hero', 'home-balance-card', 'home-quick-actions-layer', 'home-quick-actions']) {
    assert.ok(ancestors(byId(id)).includes(scroll), `${id} scrolls with page content`);
  }
  assert.doesNotMatch(attrText(byId('home-scrolling-hero'), 'style'), /position: 'absolute'/);
  assert.doesNotMatch(attrText(byId('home-quick-actions-layer'), 'style'), /position: 'absolute'/);
  assert.match(attrText(scroll, 'contentContainerStyle'), /paddingTop: 0/);
  assert.doesNotMatch(text, /home-fixed-overlay|home-fixed-header|home-fixed-dock-layer/);
});

test('the scrolling background extends behind the rounded hero corner cutouts', () => {
  const scroll = byId('home-scroll-content');
  const background = byId('home-scrolling-background');
  assert.ok(ancestors(background).includes(scroll));
  assert.match(attrText(background, 'style'), /StyleSheet\.absoluteFill/);
  const backdrops = elements.filter(node => tag(node) === 'RouteBrandBackdrop');
  assert.equal(backdrops.length, 1);
  assert.ok(ancestors(backdrops[0]).includes(background));
  const hero = byId('home-balance-card');
  const parents = ancestors(hero);
  for (const layer of [hero, ...parents.slice(0, 3)]) {
    if (ts.isJsxElement(layer) && ['LinearGradient', 'MotionReveal', 'View'].includes(tag(layer))) {
      if (attr(layer, 'pointerEvents')) {
        assert.match(attrText(layer, 'pointerEvents'), /box-none/, 'transparent hero corner areas pass drag gestures to the scroll plane');
      }
    }
  }
  const heroStyle = attrText(hero, 'style');
  assert.match(heroStyle, /borderBottomLeftRadius: 30/);
  assert.match(heroStyle, /borderBottomRightRadius: 30/);
});

test('hero, quick actions and controls all move with the page', () => {
  const scroll = byId('home-scroll-content');
  for (const id of ['home-scrolling-hero', 'home-balance-card', 'home-quick-actions-layer', 'home-quick-actions',
    'home-account-menu', 'home-account-selector', 'home-toggle-sensitive-values', 'home-notifications', 'home-settings']) {
    const node = byId(id);
    assert.ok(ancestors(node).includes(scroll), `${id} lives inside the scroll content`);
  }
  const dock = byId('home-quick-actions');
  assert.doesNotMatch(attrText(byId('home-quick-actions-layer'), 'style'), /height:/, 'dock layer is not clipped to a fixed height');
  const actionButtons = elements.filter(node => attrText(node, 'testID') === '{`home-action-${index}`}');
  assert.equal(actionButtons.length, 1);
  assert.ok(ancestors(actionButtons[0]).includes(dock), 'all four action buttons render inside the dock');
  assert.ok(insideScroll(actionButtons[0]));
  for (const route of ['/wallet/deposit', '/(tabs)/opportunities', '/wallet/withdraw', '/(tabs)/portfolio']) {
    assert.ok(text.includes(`router.push('${route}')`), `${route} remains a quick-action destination`);
  }
});

test('refresh and bottom clearance remain on the shared scroll plane', () => {
  const scroll = byId('home-scroll-content');
  const refresh = byId('home-pull-to-refresh');
  assert.ok(ancestors(refresh).includes(scroll));
  assert.doesNotMatch(attrText(refresh, 'progressViewOffset'), /.+/);
  assert.match(text, /useTabBarScrollBehavior\(\)/);
  assert.doesNotMatch(text, /useTabBarBehavior\(/);
  const body = scroll.getText(source);
  assert.match(body, /HomeSection title="Account Overview"/);
  assert.match(body, /onScroll=\{tabBarBehavior\.onScroll\}/);
  assert.match(body, /onScrollEndDrag=\{tabBarBehavior\.onScrollSettled\}/);
  assert.match(body, /onMomentumScrollEnd=\{tabBarBehavior\.onScrollSettled\}/);
  assert.match(body, /scrollEventThrottle=\{32\}/);
  assert.match(body, /minHeight: 0/);
  assert.match(body, /insets\.bottom \+ 112/);
  assert.match(text, /onTouchStart=\{tabBarBehavior\.onTouchStart\}/);
  assert.match(text, /onTouchEnd=\{tabBarBehavior\.onTouchEnd\}/);
  assert.match(body, /onScrollBeginDrag=\{tabBarBehavior\.onScrollBeginDrag\}/);
});

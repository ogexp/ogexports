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

test('one full-height scroll plane sits under an absolute transparent fixed overlay', () => {
  const overlay = byId('home-fixed-overlay');
  const scroll = byId('home-scroll-content');
  assert.equal(tag(scroll), 'ScrollView');
  assert.equal(jsxParent(overlay), jsxParent(scroll), 'overlay and scroll plane are root siblings');
  assert.ok(!insideScroll(overlay));
  assert.match(attrText(overlay, 'pointerEvents'), /'box-none'|"box-none"/);
  const overlayStyle = attrText(overlay, 'style');
  assert.match(overlayStyle, /position: 'absolute'/);
  assert.match(overlayStyle, /top: 0/);
  assert.match(overlayStyle, /backgroundColor: 'transparent'/);
  assert.match(overlayStyle, /zIndex: 3/);
  const scrollStyle = attrText(scroll, 'style');
  assert.match(scrollStyle, /flex: 1/);
  assert.doesNotMatch(scrollStyle, /marginTop/, 'scroll plane starts at the screen top, behind the hero corners');
});

test('the scrolling background extends behind the rounded hero corner cutouts', () => {
  const scroll = byId('home-scroll-content');
  const background = byId('home-scrolling-background');
  assert.ok(ancestors(background).includes(scroll));
  assert.match(attrText(background, 'style'), /StyleSheet\.absoluteFill/);
  const backdrops = elements.filter(node => tag(node) === 'RouteBrandBackdrop');
  assert.equal(backdrops.length, 1);
  assert.ok(ancestors(backdrops[0]).includes(background));
  const hero = byId('home-fixed-balance-card');
  const overlay = byId('home-fixed-overlay');
  const parents = ancestors(hero);
  for (const layer of [hero, ...parents.slice(0, parents.indexOf(overlay) + 1)]) {
    if (ts.isJsxElement(layer) && ['LinearGradient', 'MotionReveal', 'View'].includes(tag(layer))) {
      assert.match(attrText(layer, 'pointerEvents'), /box-none/, 'transparent hero corner areas pass drag gestures to the scroll plane');
    }
  }
  const heroStyle = attrText(hero, 'style');
  assert.match(heroStyle, /borderBottomLeftRadius: 30/);
  assert.match(heroStyle, /borderBottomRightRadius: 30/);
  for (const id of ['home-fixed-header', 'home-fixed-dock-layer']) {
    const style = attrText(byId(id), 'style');
    assert.match(style, /backgroundColor: 'transparent'/, `${id} paints nothing behind the corners`);
    assert.match(attrText(byId(id), 'pointerEvents'), /box-none/);
  }
});

test('hero, dock and every control stay fixed outside the ScrollView', () => {
  const overlay = byId('home-fixed-overlay');
  for (const id of ['home-fixed-header', 'home-fixed-balance-card', 'home-fixed-dock-layer', 'home-fixed-quick-actions',
    'home-account-menu', 'home-account-selector', 'home-toggle-sensitive-values', 'home-notifications', 'home-settings']) {
    const node = byId(id);
    assert.ok(ancestors(node).includes(overlay), `${id} lives in the fixed overlay`);
    assert.ok(!insideScroll(node), `${id} cannot move with scrolling`);
  }
  const dock = byId('home-fixed-quick-actions');
  assert.doesNotMatch(attrText(byId('home-fixed-dock-layer'), 'style'), /height:/, 'dock layer is not clipped to a fixed height');
  const actionButtons = elements.filter(node => attrText(node, 'testID') === '{`home-action-${index}`}');
  assert.equal(actionButtons.length, 1);
  assert.ok(ancestors(actionButtons[0]).includes(dock), 'all four action buttons render inside the fixed dock');
  assert.ok(!insideScroll(actionButtons[0]));
  for (const route of ['/wallet/deposit', '/(tabs)/opportunities', '/wallet/withdraw', '/(tabs)/portfolio']) {
    assert.ok(text.includes(`router.push('${route}')`), `${route} remains a quick-action destination`);
  }
});

test('content inset is measured from the overlay with a stable estimate and no fixed header height', () => {
  const overlay = byId('home-fixed-overlay');
  assert.match(attrText(overlay, 'onLayout'), /onFixedLayout/);
  assert.match(text, /const fixedInset = measuredFixedHeight \?\? estimatedFixedHeight/);
  assert.match(text, /Math\.abs\(current - next\) < 1 \? current : next/, 'sub-pixel layout changes do not re-render');
  assert.match(text, /estimatedFixedHeight = heroTopPadding \+ heroBodyEstimate/);
  assert.doesNotMatch(text, /\b400\b/);
  const scroll = byId('home-scroll-content');
  assert.match(attrText(scroll, 'contentContainerStyle'), /paddingTop: fixedInset \+ quickActionsGap/);
});

test('refresh, tab-scroll behavior and bottom clearance remain on the scroll plane', () => {
  const scroll = byId('home-scroll-content');
  const refresh = byId('home-pull-to-refresh');
  assert.ok(ancestors(refresh).includes(scroll));
  assert.match(attrText(refresh, 'progressViewOffset'), /fixedInset/);
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

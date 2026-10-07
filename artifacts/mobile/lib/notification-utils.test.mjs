import test from 'node:test';
import assert from 'node:assert/strict';
import { formatNotificationTimestamp, isInvestorNotificationUnread } from './notification-utils.ts';

test('notification read timestamp overrides stale unread flags', () => {
  assert.equal(isInvestorNotificationUnread({ read_at: '2026-10-08T10:00:00Z', is_read: false }), false);
});

test('notification read flags accept booleans and common API string values', () => {
  assert.equal(isInvestorNotificationUnread({ is_read: true }), false);
  assert.equal(isInvestorNotificationUnread({ read: 'TRUE' }), false);
  assert.equal(isInvestorNotificationUnread({ read: '1' }), false);
  assert.equal(isInvestorNotificationUnread({ is_read: false }), true);
  assert.equal(isInvestorNotificationUnread({ read: 'unread' }), true);
});

test('notifications without read markers remain unread until explicitly marked', () => {
  assert.equal(isInvestorNotificationUnread({ title: 'Payout update' }), true);
});

test('notification timestamps are formatted while invalid source values stay visible', () => {
  assert.notEqual(formatNotificationTimestamp('2026-10-08T10:30:00Z'), '2026-10-08T10:30:00Z');
  assert.equal(formatNotificationTimestamp('date not supplied'), 'date not supplied');
  assert.equal(formatNotificationTimestamp('  '), '');
});

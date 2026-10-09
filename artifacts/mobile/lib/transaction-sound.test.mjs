import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldPlayTransactionChime,
  transactionAudioModeForPlatform,
} from './transaction-sound.ts';

test('plays the confirmation chime when a successful transaction popup opens', () => {
  assert.equal(shouldPlayTransactionChime(true, 'success'), true);
  assert.equal(shouldPlayTransactionChime(true, 'approved'), true);
  assert.equal(shouldPlayTransactionChime(true, 'ack'), true);
});

test('keeps hidden and rejected transaction popups silent', () => {
  assert.equal(shouldPlayTransactionChime(false, 'success'), false);
  assert.equal(shouldPlayTransactionChime(false, 'ack'), false);
  assert.equal(shouldPlayTransactionChime(true, 'attention'), false);
});

test('allows the chime through the iOS silent switch', () => {
  assert.deepEqual(transactionAudioModeForPlatform('ios'), {
    playsInSilentMode: true,
    interruptionMode: 'mixWithOthers',
  });
});

test('respects Android silent and vibrate modes while using media volume', () => {
  assert.deepEqual(transactionAudioModeForPlatform('android'), {
    playsInSilentMode: false,
    interruptionMode: 'mixWithOthers',
  });
});

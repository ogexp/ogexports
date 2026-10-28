import test from 'node:test';
import assert from 'node:assert/strict';
import { profileUserPhone, updatedInvestorUser } from './profile-response.ts';

test('reads updated investor from the direct user response', () => {
  const user = { id: 'investor-1', country: 'Pakistan' };
  assert.deepEqual(updatedInvestorUser({ success: true, user }), user);
});

test('reads updated investor from a data-wrapped response', () => {
  const user = { id: 'investor-1', country: 'Pakistan' };
  assert.deepEqual(updatedInvestorUser({ data: user }), user);
});

test('reads updated investor from nested data and user envelopes', () => {
  const user = { id: 'investor-1', country: 'Pakistan' };
  assert.deepEqual(updatedInvestorUser({ data: { success: true, user } }), user);
  assert.deepEqual(updatedInvestorUser({ data: { user } }), user);
});

test('does not treat a success-only response as an updated investor', () => {
  assert.deepEqual(updatedInvestorUser({ success: true }), {});
});

test('reads the production phone field and the legacy mobile field', () => {
  assert.equal(profileUserPhone({ phone: '+92 300 1234567' }), '+92 300 1234567');
  assert.equal(profileUserPhone({ mobile: '+92 300 1234567' }), '+92 300 1234567');
});

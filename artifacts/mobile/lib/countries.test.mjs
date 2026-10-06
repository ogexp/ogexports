import test from 'node:test';
import assert from 'node:assert/strict';
import { COUNTRIES, countryLabelForValue, searchCountries } from './countries.ts';

test('country picker uses the complete country directory and includes Pakistan', () => {
  assert.ok(COUNTRIES.length > 240);
  assert.ok(COUNTRIES.some(country => country.code === 'PK' && country.label === 'Pakistan'));
});

test('country search supports ISO codes, common aliases, and official country names', () => {
  assert.equal(searchCountries('PK').find(country => country.code === 'PK')?.label, 'Pakistan');
  assert.equal(searchCountries('UAE').find(country => country.code === 'AE')?.label, 'United Arab Emirates');
  assert.equal(searchCountries('South Korea').find(country => country.code === 'KR')?.label, 'South Korea');
  assert.equal(countryLabelForValue('United Arab Emirates (the)'), 'United Arab Emirates');
});

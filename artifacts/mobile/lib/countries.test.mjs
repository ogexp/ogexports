import test from 'node:test';
import assert from 'node:assert/strict';
import { COUNTRIES, POPULAR_COUNTRIES, countryLabelForValue, countrySections, searchCountries } from './countries.ts';

test('country picker uses the complete country directory and includes Pakistan', () => {
  assert.ok(COUNTRIES.length > 240);
  assert.ok(COUNTRIES.some(country => country.code === 'PK' && country.label === 'Pakistan'));
  assert.equal(COUNTRIES[0].code, 'PK');
  assert.equal(POPULAR_COUNTRIES[0].code, 'PK');
  assert.deepEqual(countrySections('').map(section => section.title), ['Popular markets', 'All countries']);
  assert.equal(countrySections('')[0].data[0].label, 'Pakistan');
  assert.ok(countrySections('')[1].data.length > 200);
});

test('country search supports ISO codes, common aliases, and official country names', () => {
  assert.equal(searchCountries('PK').find(country => country.code === 'PK')?.label, 'Pakistan');
  assert.equal(searchCountries('UAE').find(country => country.code === 'AE')?.label, 'UAE');
  assert.equal(searchCountries('South Korea').find(country => country.code === 'KR')?.label, 'South Korea');
  assert.equal(searchCountries('Czech Republic').find(country => country.code === 'CZ')?.label, 'Czech Republic');
  assert.equal(countryLabelForValue('United Arab Emirates (the)'), 'UAE');
  assert.equal(countryLabelForValue('Türkiye'), 'Turkey');
  assert.equal(countrySections('UAE')[0].title, 'Search results');
  assert.equal(countrySections('no country can match this')[0], undefined);
});

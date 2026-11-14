import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { countryForApi, countryLabelForValue, kycProfileCountry, profileUserCountry, searchCountries } from './countries.ts';

test('profile country selected through ISO search maps to the API name and reload shape', () => {
  const selectedCountry = searchCountries('PK').find(country => country.code === 'PK');
  assert.ok(selectedCountry);
  const request = { country: countryForApi(selectedCountry.label) };
  assert.equal(request.country, 'Pakistan');

  const reloadedUser = { id: 'investor-1', country: request.country };
  assert.equal(profileUserCountry(reloadedUser), 'Pakistan');
});

test('KYC country selected by name maps to the canonical API label and reload shape', () => {
  const selectedCountry = searchCountries('United Arab Emirates (the)').find(country => country.code === 'AE');
  assert.ok(selectedCountry);
  const request = {
    country: countryForApi(selectedCountry.label),
    payload: { country: countryForApi(selectedCountry.label) },
  };
  assert.equal(request.country, 'UAE');
  assert.equal(request.payload.country, 'UAE');

  const reloadedProfile = { address: { country: request.payload.country } };
  assert.equal(kycProfileCountry(reloadedProfile), 'UAE');
});

test('KYC reload accepts country stored at the profile root for older responses', () => {
  assert.equal(kycProfileCountry({ country: 'Pakistan' }), 'Pakistan');
});

test('KYC nationality uses its own controlled searchable picker, not a text field', () => {
  const source = readFileSync(new URL('../app/account/kyc.tsx', import.meta.url), 'utf8');
  assert.match(source, /<CountryPicker label="Nationality \(required\)" value=\{nationality\} onChange=\{setNationality\}[^>]*selectionType="nationality"[^>]*testID="kyc-nationality"/);
  assert.doesNotMatch(source, /<Field label="Nationality/);
  assert.match(source, /<CountryPicker label="Country of residence \(required\)" value=\{country\} onChange=\{setCountry\}/);
  assert.match(source, /nationality: nationality\.trim\(\)/);
});

test('nationality selections retain country labels and do not erase legacy saved nationalities', () => {
  assert.equal(countryLabelForValue('PK'), 'Pakistan');
  assert.equal(countryLabelForValue('Pakistan'), 'Pakistan');
  assert.equal(countryLabelForValue('Pakistani'), 'Pakistani');
  assert.equal(countryLabelForValue(''), '');
});

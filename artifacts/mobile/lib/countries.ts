export type CountryOption = {
  code: string;
  officialName: string;
  label: string;
  searchTerms: string[];
};

const COUNTRY_ROWS = `
AD|Andorra
AE|United Arab Emirates (the)
AF|Afghanistan
AG|Antigua and Barbuda
AI|Anguilla
AL|Albania
AM|Armenia
AO|Angola
AQ|Antarctica
AR|Argentina
AS|American Samoa
AT|Austria
AU|Australia
AW|Aruba
AZ|Azerbaijan
BA|Bosnia and Herzegovina
BB|Barbados
BI|Burundi
BE|Belgium
BF|Burkina Faso
BG|Bulgaria
BH|Bahrain
BD|Bangladesh
BJ|Benin
BM|Bermuda
BN|Brunei Darussalam
BO|Bolivia, Plurinational State of
BR|Brazil
BS|Bahamas
BT|Bhutan
BW|Botswana
BY|Belarus
BZ|Belize
CA|Canada
CC|Cocos (Keeling) Islands
CD|Congo, The Democratic Republic of the
CF|Central African Republic
CG|Congo
CH|Switzerland
CI|Côte d'Ivoire
CK|Cook Islands
CL|Chile
CM|Cameroon
CN|China
CO|Colombia
CR|Costa Rica
CU|Cuba
CV|Cape Verde
CX|Christmas Island
CY|Cyprus
CZ|Czechia
DE|Germany
DJ|Djibouti
DK|Denmark
DM|Dominica
DO|Dominican Republic
DZ|Algeria
EC|Ecuador
EE|Estonia
EG|Egypt
EH|Western Sahara
ER|Eritrea
ES|Spain
ET|Ethiopia
FI|Finland
FJ|Fiji
FK|Falkland Islands (Malvinas)
FM|Micronesia, Federated States of
FO|Faroe Islands
FR|France
GA|Gabon
GB|United Kingdom
GD|Grenada
GE|Georgia
GF|French Guiana
GH|Ghana
GI|Gibraltar
GL|Greenland
GM|Gambia
GN|Guinea
GP|Guadeloupe
GQ|Equatorial Guinea
GR|Greece
GS|South Georgia and the South Sandwich Islands
GT|Guatemala
GU|Guam
GW|Guinea-Bissau
GY|Guyana
HK|Hong Kong
HM|Heard Island and McDonald Islands
HN|Honduras
HR|Croatia
HT|Haiti
HU|Hungary
ID|Indonesia
IE|Ireland
IL|Israel
IN|India
IO|British Indian Ocean Territory
IQ|Iraq
IR|Iran, Islamic Republic of
IS|Iceland
IT|Italy
JM|Jamaica
JO|Jordan
JP|Japan
KE|Kenya
KG|Kyrgyzstan
KH|Cambodia
KI|Kiribati
KM|Comoros
KN|Saint Kitts and Nevis
KP|Korea, Democratic People's Republic of
KR|Korea, Republic of
KW|Kuwait
KY|Cayman Islands
KZ|Kazakhstan
LA|Lao People's Democratic Republic
LB|Lebanon
LC|Saint Lucia
LI|Liechtenstein
LK|Sri Lanka
LR|Liberia
LS|Lesotho
LT|Lithuania
LU|Luxembourg
LV|Latvia
LY|Libya
MA|Morocco
MC|Monaco
MD|Moldova, Republic of
MG|Madagascar
MH|Marshall Islands (the)
MK|North Macedonia
ML|Mali
MM|Myanmar
MN|Mongolia
MO|Macao
MP|Northern Mariana Islands (the)
MQ|Martinique
MR|Mauritania
MS|Montserrat
MT|Malta
MU|Mauritius
MV|Maldives
MW|Malawi
MX|Mexico
MY|Malaysia
MZ|Mozambique
NA|Namibia
NC|New Caledonia
NE|Niger
NF|Norfolk Island
NG|Nigeria
NI|Nicaragua
NL|Netherlands
NO|Norway
NP|Nepal
NR|Nauru
NU|Niue
NZ|New Zealand
OM|Oman
PA|Panama
PE|Peru
PF|French Polynesia
PG|Papua New Guinea
PH|Philippines (the)
PK|Pakistan
PL|Poland
PM|Saint Pierre and Miquelon
PN|Pitcairn
PR|Puerto Rico
PS|Palestine, State of
PT|Portugal
PW|Palau
PY|Paraguay
QA|Qatar
RE|Réunion
RO|Romania
RU|Russian Federation (the)
RW|Rwanda
SA|Saudi Arabia
SB|Solomon Islands
SC|Seychelles
SD|Sudan (the)
SE|Sweden
SG|Singapore
SH|Saint Helena, Ascension and Tristan Da Cunha
SI|Slovenia
SJ|Svalbard and Jan Mayen
SK|Slovakia
SL|Sierra Leone
SM|San Marino
SN|Senegal
SO|Somalia
SR|Suriname
ST|Sao Tome and Principe
SV|El Salvador
SY|Syrian Arab Republic (the)
SZ|Eswatini
TC|Turks and Caicos Islands (the)
TD|Chad
TF|French Southern Territories
TG|Togo
TH|Thailand
TJ|Tajikistan
TK|Tokelau
TM|Turkmenistan
TN|Tunisia
TO|Tonga
TL|Timor-Leste
TR|Türkiye
TT|Trinidad and Tobago
TV|Tuvalu
TW|Taiwan (Province of China)
TZ|Tanzania, United Republic of
UA|Ukraine
UG|Uganda
UM|United States Minor Outlying Islands
US|United States of America (the)
UY|Uruguay
UZ|Uzbekistan
VA|Holy See (Vatican City State)
VC|Saint Vincent and the Grenadines
VE|Venezuela (Bolivarian Republic of)
VG|Virgin Islands (British)
VI|Virgin Islands (U.S.)
VN|Viet Nam
VU|Vanuatu
WF|Wallis and Futuna
WS|Samoa
YE|Yemen
YT|Mayotte
ZA|South Africa
ZM|Zambia
ZW|Zimbabwe
XZ|Installations in International Waters
RS|Serbia
ME|Montenegro
JE|Jersey
GG|Guernsey
IM|Isle of Man
AX|Åland Islands
CW|Curaçao
BQ|Bonaire, Sint Eustatius and Saba
BL|Saint Barthélemy
MF|Saint Martin (French Part)
SX|Sint Maarten (Dutch Part)
SS|South Sudan
`.trim();

const DISPLAY_NAMES: Record<string, string> = {
  AE: 'UAE',
  BN: 'Brunei',
  BO: 'Bolivia',
  CD: 'DR Congo',
  CI: "Côte d'Ivoire",
  CZ: 'Czech Republic',
  FK: 'Falkland Islands',
  FM: 'Micronesia',
  IR: 'Iran',
  KP: 'North Korea',
  KR: 'South Korea',
  LA: 'Laos',
  MD: 'Moldova',
  MF: 'Saint Martin',
  MH: 'Marshall Islands',
  MP: 'Northern Mariana Islands',
  PH: 'Philippines',
  RU: 'Russia',
  SD: 'Sudan',
  SH: 'Saint Helena',
  SY: 'Syria',
  TC: 'Turks and Caicos Islands',
  TR: 'Turkey',
  TW: 'Taiwan',
  TZ: 'Tanzania',
  US: 'United States',
  VE: 'Venezuela',
  VG: 'British Virgin Islands',
  VI: 'U.S. Virgin Islands',
  VN: 'Vietnam',
  VA: 'Vatican City',
};

const COUNTRY_ALIASES: Record<string, string[]> = {
  AE: ['UAE', 'Emirates'],
  BA: ['Bosnia', 'Herzegovina'],
  BN: ['Brunei Darussalam'],
  CD: ['DRC', 'Democratic Republic of the Congo', 'Congo Kinshasa', 'Zaire'],
  CG: ['Republic of the Congo', 'Congo Brazzaville'],
  CH: ['Swiss'],
  CI: ['Ivory Coast'],
  CN: ['PRC', 'Mainland China'],
  CV: ['Cabo Verde'],
  CZ: ['Czech Republic'],
  DE: ['Deutschland'],
  GB: ['UK', 'Britain', 'Great Britain', 'England', 'Scotland', 'Wales', 'Northern Ireland'],
  HK: ['Hongkong'],
  IR: ['Persia'],
  KP: ['DPRK'],
  KR: ['ROK'],
  MK: ['Macedonia'],
  MM: ['Burma'],
  MO: ['Macau', 'Macao'],
  NL: ['Holland', 'Dutch'],
  PS: ['Palestine'],
  RU: ['Russian Federation'],
  SA: ['KSA'],
  SZ: ['Swaziland'],
  TL: ['East Timor'],
  TR: ['Turkey', 'Turkiye'],
  US: ['USA', 'America', 'United States of America'],
  VA: ['Vatican', 'Holy See'],
  VN: ['Viet Nam'],
};

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\bthe\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function displayName(code: string, officialName: string): string {
  return DISPLAY_NAMES[code] ?? officialName.replace(/\s*\(the\)\s*$/i, '').trim();
}

const countryOptions: CountryOption[] = COUNTRY_ROWS.split(/\r?\n/)
  .map(row => {
    const separator = row.indexOf('|');
    const code = row.slice(0, separator).trim().toUpperCase();
    const officialName = row.slice(separator + 1).trim();
    const label = displayName(code, officialName);
    return {
      code,
      officialName,
      label,
      searchTerms: [code, officialName, label, ...(COUNTRY_ALIASES[code] ?? [])],
    };
  })
  .filter(country => country.code !== 'XZ')
  .sort((a, b) => {
    if (a.code === 'PK') return -1;
    if (b.code === 'PK') return 1;
    return a.label.localeCompare(b.label);
  });

countryOptions.push({
  code: '',
  officialName: 'Other',
  label: 'Other',
  searchTerms: ['Other'],
});

export const COUNTRIES = countryOptions;

const POPULAR_MARKET_CODES = ['PK', 'AE', 'SA', 'GB', 'US', 'CA', 'AU', 'CN', 'IN', 'MY', 'SG', 'QA'];
const popularMarketCodeSet = new Set(POPULAR_MARKET_CODES);
const countryByCode = new Map(COUNTRIES.map(country => [country.code, country]));

export const POPULAR_COUNTRIES = POPULAR_MARKET_CODES
  .map(code => countryByCode.get(code))
  .filter((country): country is CountryOption => Boolean(country));

export type CountrySection = {
  title: 'Popular markets' | 'All countries' | 'Search results';
  data: CountryOption[];
};

export function searchCountries(query: string): CountryOption[] {
  const needle = normalize(query);
  if (!needle) return COUNTRIES;
  return COUNTRIES.filter(country =>
    country.searchTerms.some(term => {
      const normalizedTerm = normalize(term);
      return normalizedTerm === needle || (normalizedTerm.length >= 3 && normalizedTerm.includes(needle));
    }),
  );
}

export function countrySections(query: string): CountrySection[] {
  if (query.trim()) {
    const results = searchCountries(query);
    return results.length ? [{ title: 'Search results', data: results }] : [];
  }

  return [
    { title: 'Popular markets', data: POPULAR_COUNTRIES },
    {
      title: 'All countries',
      data: COUNTRIES.filter(country => !popularMarketCodeSet.has(country.code)),
    },
  ];
}

export function countryLabelForValue(value: string): string {
  const needle = normalize(value);
  if (!needle) return '';
  return COUNTRIES.find(country => country.searchTerms.some(term => normalize(term) === needle))?.label ?? value;
}

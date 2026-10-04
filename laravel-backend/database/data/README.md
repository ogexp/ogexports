# Country and port reference data

The CSV files in this directory come from the
[`datasets/un-locode`](https://github.com/datasets/un-locode) mirror of the
UNECE UN/LOCODE release.

- `country-codes.csv` contains ISO 3166 alpha-2 countries and territories.
- `unlocode.csv` contains UN/LOCODE locations. `CountryPortSeeder` imports
  rows whose function classifier starts with `1`, meaning maritime transport
  (sea or maritime port).

The source data is bundled so application dropdowns never depend on a
third-party service at runtime.

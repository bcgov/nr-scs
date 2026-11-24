/**
 * QRY-001 (Search Clients) — DB-grounded known values, discovered 2026-07-23 against the real extract
 * (container real-data-seeded-scs-db, :1525) via the live search endpoint `GET /api/clients/search`
 * (→ ClientRepository → SP scs_client_vw_pkg). Client search is READ-ONLY, so these fixtures are pinned
 * by their real id/value and shared freely across parallel tests — no mutation, no cleanup, no
 * parallel-safety concern. Real data is non-deterministic across re-extracts: RE-VERIFY each value with
 * the query in its comment on any DB re-extract.
 */

export type ClientSearchCase = {
  /** Human label of the search field (maps to the input id in ClientSearchPage.fieldId). */
  fieldLabel: 'client number' | 'location code' | 'company name' | 'last name' | 'first name';
  /** The value typed into that field. */
  value: string;
  /** The `client` cell text ("{clientNumber} / {locn}") of a row the search must return. */
  expectedClient: string;
  /** Exact number of rows the search returns (drives the "Result List: N records" assertion). */
  expectedCount: number;
};

/**
 * Search by LAST NAME → exactly one real client. Also the row used to prove the results columns render
 * cell data (last name / first name / city).
 * Query: GET /api/clients/search?lastName=KALCHTHALER&primarySort=1&secondarySort=0
 *        -> [{client:"00001003 / 00", lastName:"KALCHTHALER", firstName:"HETTIE", city:"PORT CLEMENTS", …}] (1 row).
 */
export const byLastName: ClientSearchCase = {
  fieldLabel: 'last name',
  value: 'KALCHTHALER',
  expectedClient: '00001003 / 00',
  expectedCount: 1,
};

/** The full row content of the byLastName client — asserted to prove the results table maps cells correctly. */
export const byLastNameRow = {
  client: '00001003 / 00',
  lastName: 'KALCHTHALER',
  firstName: 'HETTIE',
  city: 'PORT CLEMENTS',
} as const;

/**
 * Search by COMPANY NAME → two real client locations (same client number, locn 00 + 01).
 * Query: GET /api/clients/search?companyName=MANAGEMENT%20ABEYANCE&… -> ["00000001 / 00","00000001 / 01"] (2 rows).
 */
export const byCompanyName: ClientSearchCase = {
  fieldLabel: 'company name',
  value: 'MANAGEMENT ABEYANCE',
  expectedClient: '00000001 / 00',
  expectedCount: 2,
};

/**
 * Search by CLIENT NUMBER (exact; the repo zero-pads the criterion) → exactly one real client.
 * Query: GET /api/clients/search?clientNumber=00001003&… -> [{client:"00001003 / 00", …}] (1 row).
 */
export const byClientNumber: ClientSearchCase = {
  fieldLabel: 'client number',
  value: '00001003',
  expectedClient: '00001003 / 00',
  expectedCount: 1,
};

/** All happy-path field-search cases (drives the S01 Scenario Outline — field-search symmetry). */
export const searchCases: ClientSearchCase[] = [byLastName, byCompanyName, byClientNumber];

/**
 * A company-name value that matches NO client, for the zero-results slice (S04).
 * Query: GET /api/clients/search?companyName=ZZZNOMATCH99999 -> [] (confirmed 2026-07-23).
 */
export const noMatchCompanyName = 'ZZZNOMATCH99999';

// NOTE — the blank-search anchor (first row of the unfiltered list, `00000001 / 00`) is NOT exported here:
// the accepted-divergence scenario asserts it directly as a Gherkin literal (validation.feature), so an
// export would be dead code. Ground-truth 2026-07-23: GET /api/clients/search (no params) -> HTTP 200 +
// the FULL client list, first row {client:"00000001 / 00", …}.

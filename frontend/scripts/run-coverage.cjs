/**
 * `npm run test:coverage` — runs the unit suite with coverage, then normalises the lcov paths for
 * SonarQube.
 *
 * Deliberately does not depend on `playwright install`: the browser suite is legacy and is not run
 * by default, and the proxy blocks the Chromium download (UNABLE_TO_GET_ISSUER_CERT_LOCALLY), so a
 * pretest hook for it would make coverage unrunnable here.
 */
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const frontendDir = path.join(__dirname, '..');
const run = (command, args) =>
  spawnSync(command, args, { cwd: frontendDir, stdio: 'inherit', shell: process.platform === 'win32' });

const vitest = run('npx', [
  'vitest',
  '--config',
  'vitest.config.ts',
  'run',
  '--coverage',
  // Still emit a report when tests fail, so a red run is diagnosable from the coverage output.
  '--coverage.reportOnFailure',
]);

// Normalise regardless of the test outcome: the report exists either way and Sonar reads it.
// A failed normalisation must fail the run too, or CI stays green while Sonar reads paths it cannot
// match and reports 0% - the very thing this script exists to prevent.
const normalize = run('node', [path.join(__dirname, 'normalize-lcov.cjs')]);

process.exit((vitest.status ?? 1) || (normalize.status ?? 1));

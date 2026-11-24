/**
 * Rewrites the `SF:` paths in coverage/lcov.info to forward slashes relative to this directory.
 *
 * The v8 coverage provider emits native Windows paths (`SF:src\utils\email.ts`). SonarQube matches
 * lcov entries to analysed files by path and does not normalise separators, so a backslash record
 * silently matches nothing and the project reports 0% coverage rather than failing loudly.
 */
const fs = require('node:fs');
const path = require('node:path');

const lcovPath = path.join(__dirname, '..', 'coverage', 'lcov.info');

if (!fs.existsSync(lcovPath)) {
  console.error(`normalize-lcov: ${lcovPath} not found — did the coverage run fail?`);
  process.exit(1);
}

const original = fs.readFileSync(lcovPath, 'utf8');
let rewritten = 0;
const normalized = original.replace(/^SF:(.*)$/gm, (line, file) => {
  const forward = file.replace(/\\/g, '/');
  if (forward !== file) {
    rewritten += 1;
  }
  return `SF:${forward}`;
});

fs.writeFileSync(lcovPath, normalized);
console.log(`normalize-lcov: normalised ${rewritten} of ${(original.match(/^SF:/gm) || []).length} SF paths`);

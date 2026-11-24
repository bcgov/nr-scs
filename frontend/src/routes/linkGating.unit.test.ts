import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const SRC = join(process.cwd(), 'src');

/**
 * `PermissionLink` itself renders the router link; `Layout`'s side-nav renders entries already
 * filtered by `filterNavigation`, so both legitimately use the raw component.
 */
const ALLOWED = [
  join('components', 'core', 'PermissionLink'),
  join('components', 'Layout'),
];

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      return sourceFiles(full);
    }
    if (!full.endsWith('.tsx')) {
      return [];
    }
    if (full.includes('.test.')) {
      return [];
    }
    return [full];
  });

describe('link gating convention', () => {
  /**
   * Every in-app link must go through `PermissionLink`, so a destination the user's role cannot reach
   * renders as plain text instead of leading to `/unauthorized`. A raw `RouterLink` bypasses that.
   */
  it('routes every in-app link through PermissionLink', () => {
    const offenders: string[] = [];

    for (const file of [...sourceFiles(join(SRC, 'pages')), ...sourceFiles(join(SRC, 'components'))]) {
      if (ALLOWED.some((allowed) => file.includes(allowed))) {
        continue;
      }

      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(/<(RouterLink|Link)\s+to=/g)) {
        offenders.push(`${file.replace(SRC, 'src')} → <${match[1]} to=`);
      }
    }

    expect(
      offenders,
      'Use PermissionLink (or ScalerLicenceLink / ScaleSiteLink) so the link degrades to plain text '
        + 'for a role that cannot reach its destination',
    ).toEqual([]);
  });

  it('finds enough files to make the assertion meaningful', () => {
    const files = [...sourceFiles(join(SRC, 'pages')), ...sourceFiles(join(SRC, 'components'))];
    expect(files.length).toBeGreaterThan(100);
  });
});

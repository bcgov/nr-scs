import { describe, it, expect } from 'vitest';

import { APP_ROUTES } from './routePaths';

describe('routePaths', () => {
  it('exports the application route definitions', () => {
    expect(Array.isArray(APP_ROUTES)).toBe(true);
    expect(APP_ROUTES.length).toBeGreaterThan(0);
  });

  it('includes the root redirect and landing routes', () => {
    expect(APP_ROUTES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'RootRedirect', path: '/' }),
        expect.objectContaining({ id: 'Landing', path: '/welcome' }),
      ]),
    );
  });

  it('includes the maintenance authorization clauses route', () => {
    expect(APP_ROUTES).toContainEqual(
      expect.objectContaining({
        id: 'Maintenance Authorization Clauses',
        path: '/maintenance/authorization-clauses',
      }),
    );
  });
});

/**
 * Helpers for reading scenario state off the shared `ScsWorld` (`steps/fixtures/global.ts`).
 */

/**
 * Builds a `req` for one step file: reads a required piece of scenario state, failing with a clear
 * message naming the suite and the missing key if a prior step didn't set it. That is a good deal
 * more useful than a bare `world.x!` non-null assertion, which blows up deep inside a page object
 * with no indication of which Given was skipped.
 *
 * The prefix is what tells you WHICH suite's step failed, so each caller passes its own:
 *
 *     const req = makeRequire('ins-edit');
 *     const id = req(world.inspectionId, 'inspectionId');
 *     // -> [ins-edit] expected "inspectionId" in world — a prior step should have set it
 *
 * @param prefix - Suite tag for the error message, without brackets (e.g. `ins-edit`).
 */
export const makeRequire =
  (prefix: string) =>
  <T>(value: T | undefined | null, name: string): T => {
    if (value === undefined || value === null) {
      throw new Error(`[${prefix}] expected "${name}" in world — a prior step should have set it`);
    }
    return value;
  };

import { describe, expect, it } from 'vitest';

import { isInspectorGuid } from './inspectorGuid';

/**
 * Mirrors the backend's SCSUtils.isUuidLike: either 32 undashed hex characters (the legacy euser
 * GUID form) or a canonical dashed UUID.
 */
describe('isInspectorGuid', () => {
  it('accepts a legacy 32-character undashed GUID', () => {
    expect(isInspectorGuid('F5E59074276C40558FF6A17CF1AB3EC2')).toBe(true);
  });

  it('accepts a canonical dashed UUID', () => {
    expect(isInspectorGuid('A1B2C3D4-E5F6-7890-1234-56789ABCDEF0')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isInspectorGuid('f5e59074276c40558ff6a17cf1ab3ec2')).toBe(true);
    expect(isInspectorGuid('a1b2c3d4-e5f6-7890-1234-56789abcdef0')).toBe(true);
  });

  it('trims surrounding whitespace before judging', () => {
    expect(isInspectorGuid('  F5E59074276C40558FF6A17CF1AB3EC2  ')).toBe(true);
  });

  it('rejects a person name, which is what users type by mistake', () => {
    expect(isInspectorGuid('Jane Smith')).toBe(false);
  });

  it('rejects an empty or absent value', () => {
    expect(isInspectorGuid('')).toBe(false);
    expect(isInspectorGuid('   ')).toBe(false);
    expect(isInspectorGuid(null)).toBe(false);
    expect(isInspectorGuid(undefined)).toBe(false);
  });

  it('rejects a GUID one character short or long', () => {
    expect(isInspectorGuid('F5E59074276C40558FF6A17CF1AB3EC')).toBe(false);
    expect(isInspectorGuid('F5E59074276C40558FF6A17CF1AB3EC22')).toBe(false);
  });

  it('rejects non-hex characters', () => {
    expect(isInspectorGuid('G5E59074276C40558FF6A17CF1AB3EC2')).toBe(false);
  });

  it('rejects a dashed value with the wrong group lengths', () => {
    expect(isInspectorGuid('A1B2C3D4-E5F6-7890-1234-56789ABCDEF')).toBe(false);
    expect(isInspectorGuid('A1B2C3D-4E5F6-7890-1234-56789ABCDEF0')).toBe(false);
  });

  it('rejects a partially dashed value', () => {
    expect(isInspectorGuid('A1B2C3D4E5F6-7890-1234-56789ABCDEF0')).toBe(false);
  });

  it('rejects surrounding text around an otherwise valid GUID', () => {
    // The pattern is anchored, so an id embedded in a sentence is not accepted.
    expect(isInspectorGuid('user F5E59074276C40558FF6A17CF1AB3EC2 here')).toBe(false);
  });
});

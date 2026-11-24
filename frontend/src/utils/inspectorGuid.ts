/**
 * Client-side check that an inspector value is a user GUID the backend will accept, mirroring
 * `SCSUtils.isUuidLike` (backend): either 32 undashed hex chars (the legacy euser GUID form, e.g.
 * `F5E59074276C40558FF6A17CF1AB3EC2`) or a canonical dashed UUID (e.g.
 * `A1B2C3D4-E5F6-7890-1234-56789ABCDEF0`). The inspection create/edit forms validate the inspector
 * with this so a bad value is caught inline instead of surfacing as a backend 400. The backend remains
 * the source of truth; this is only a pre-submit guard.
 */
const UNDASHED_HEX = /^[0-9a-f]{32}$/i;
const CANONICAL_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isInspectorGuid = (value: string | null | undefined): boolean => {
  const trimmed = (value ?? "").trim();
  return UNDASHED_HEX.test(trimmed) || CANONICAL_UUID.test(trimmed);
};

/**
 * Shared audit / "who did it" metadata carried by every persisted record, mirroring the backend
 * `AuditDetail` OpenAPI schema. Detail interfaces should `extends AuditDetails` (or intersect it for
 * `type` aliases) rather than repeating these five fields.
 */
export interface AuditDetails {
  entryTimestamp?: string | null;
  entryUserid?: string | null;
  updateTimestamp?: string | null;
  updateUserid?: string | null;
  revisionCount?: number | null;
}

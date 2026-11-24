import { randomUUID } from 'node:crypto';

/**
 * Known-good test data for Maintain Templates (UC-CCQ-003 — Scale Authorization Templates) at
 * `/maintenance/templates`. Pinned from the seeded local Docker Oracle DB
 * (`localhost:1525 / DBDOCK_01 / THE`) + the running app's LOVs on 2026-07-28. Nothing is fabricated.
 *
 * NOTE ON THE UC NAME: the source docs label UC-CCQ-003 "Maintain Risk Questionnaire Template", but the
 * recovered legacy gherkin (`scaleAuthTemplateDto.scaleAuthTemplateName`, `scaleConditionClassCode`, "bind
 * conditions", `MaintainTemplatesAction`, `/maintainTemplates.do`) and the built React page both maintain
 * **Scale Authorization Templates** (a name + a condition class + a Reg/Dist, with bound conditions) — NOT
 * a risk questionnaire. The page is built and routed; the old "deferred to unbuilt RSK" disposition was a
 * misread. See this UC's coverage.md.
 *
 * Provenance (all via the running backend on :8080):
 *  - Type LOV (`GET /api/static-lov?tableKey=SCALE_CONDITION_CLASS_CODE`): MSD=Mark Site Designation,
 *      SIA=Scale Site Authorization, SCA=Scaler Authorization. We create as **MSD** — the smallest
 *      condition class (11 active conditions) so the create-modal conditions table is a single short page,
 *      and MSD templates are few, so the list class filter + page-size 50 puts a seeded row on one page.
 *  - Reg/Dist LOV (`GET /api/region-district-lov`): code "1826" = "RCB - Cariboo-Chilcotin Natural
 *      Resource District" (the same DCC district the MNT-001 signatory fixture uses). The <Select> value
 *      is the org-unit code; the API persists/returns it as the numeric `orgUnitNo`.
 *  - Bindable conditions (`GET /api/scaler-authorizations/conditions?scaleConditionClassCode=MSD`):
 *      condition #185 "DIRECT TRANSPORTATION" (ministryStandardInd=Y, sortOrderNo=0 → first row of the
 *      create-modal conditions table).
 *  - Save request shape (`POST /api/scale-auth-templates`): { scaleAuthTemplateName, scaleConditionClassCode,
 *      orgUnitNo (number), conditions?: [{ scaleConditionClassCode, scaleAuthConditionId }] }. PK
 *      `scaleAuthTemplateId` is server-generated, read back from the view (`#view-template-id`).
 *  - Backend `ScaleAuthTemplateService.validate()`: name + type required (blank → 400). Length is enforced
 *      by Jakarta `@Size(max=100)` on the request model → a name > 100 chars returns a clean 400
 *      VALIDATION_ERROR ("size must be between 0 and 100"). NB: the legacy rule / DB column is 200 chars —
 *      the new app caps at 100. See defects.md Divergence #1.
 */

/** Type (condition-class) code -> the description shown in the read-only view's Type field. */
export const TYPE_LABEL: Record<string, string> = {
  MSD: 'Mark Site Designation',
  SIA: 'Scale Site Authorization',
  SCA: 'Scaler Authorization',
};

/** Reg/Dist used for every seeded template: org-unit code + the description shown in the view. */
export const TEMPLATE_REG_DIST = {
  orgUnitCode: '1826',
  orgUnitNo: 1826,
  description: 'RCB - Cariboo-Chilcotin Natural Resource District',
} as const;

/**
 * A SECOND real Reg/Dist, used only as the "change it to something else" value when a scenario edits the
 * field. A different district from TEMPLATE_REG_DIST, so a read-back that silently kept the original
 * cannot pass. (Both sit in the RCB region — it is the org-unit number the assertion compares, 1826 vs 50.)
 * Provenance (2026-09-08): `GET /api/region-district-lov` -> code "50" = "RCB - Quesnel Natural Resource
 * District". Nothing in this suite seeds on it, so it stays a safe target under fullyParallel.
 */
export const TEMPLATE_REG_DIST_ALT = {
  orgUnitCode: '50',
  orgUnitNo: 50,
  description: 'RCB - Quesnel Natural Resource District',
} as const;

/** A real, active MSD condition — bound in the "create and bind a condition" scenario. */
export const BINDABLE_MSD_CONDITION = { id: 185, title: 'DIRECT TRANSPORTATION' } as const;

/** The app enforces this via `@Size(max=100)`; the legacy/DB limit is 200 (see defects.md Divergence #1). */
export const NAME_MAX_LENGTH = 100;

export interface TemplateBody {
  scaleAuthTemplateName: string;
  scaleConditionClassCode: string; // Type (MSD | SIA | SCA)
  orgUnitCode: string; // the <Select> value the UI takes
  orgUnitNo: number; // what the API persists (read-back comparand)
}

/** A fully valid create/update body with a globally-unique name. `classCode` defaults to MSD. */
export function buildTemplateBody(label = 'create', classCode = 'MSD'): TemplateBody {
  const unique = randomUUID().slice(0, 8);
  return {
    scaleAuthTemplateName: `E2E CCQ003 ${label} ${unique}`,
    scaleConditionClassCode: classCode,
    orgUnitCode: TEMPLATE_REG_DIST.orgUnitCode,
    orgUnitNo: TEMPLATE_REG_DIST.orgUnitNo,
  };
}

/** A globally-unique name of exactly `len` characters (for the over-length rejection scenario). */
export function buildTemplateNameOfLength(len: number): string {
  const prefix = `E2E CCQ003 len ${randomUUID().slice(0, 8)} `;
  if (len <= prefix.length) return prefix.slice(0, len);
  return prefix + 'A'.repeat(len - prefix.length);
}

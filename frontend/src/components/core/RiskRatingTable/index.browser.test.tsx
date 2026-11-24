// @vitest-environment happy-dom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@/context/auth/permissions";
import { SYS_ADMIN_ROLE } from "@/context/auth/types";

import RiskRatingTable, { type RiskRatingRow } from "./index";

// PermissionLink (behind the assessment-id cell) reads the signed-in user; these tests are
// about sorting and rendering, so stub an administrator who can reach every route.
vi.mock("@/context/auth/useAuth", () => ({
  useAuth: () => ({ user: { roles: [SYS_ADMIN_ROLE], privileges: {} } }),
}));

const ROWS: RiskRatingRow[] = [
  {
    riskQuestionnaireId: 200,
    entryTimestamp: "2025-03-01T09:00:00Z",
    riskRating: 30,
    riskTypeCode: "H",
    codeDescription: "High",
    rangeLowValue: 25,
    rangeHighValue: 40,
    ratingDescription: "4 checks every 12 months",
    versionNo: 3,
  },
  {
    riskQuestionnaireId: 100,
    entryTimestamp: "2025-01-01T09:00:00Z",
    riskRating: 8,
    riskTypeCode: "L",
    codeDescription: "Low",
    rangeLowValue: 0,
    rangeHighValue: 10,
    ratingDescription: "1 check every 12 months",
    versionNo: 2,
  },
];

const renderTable = () =>
  render(
    <MemoryRouter>
      <RiskRatingTable
        rows={ROWS}
        assessmentViewPath={(id) => `/scaler-risk-assessments/view/${id}`}
        viewPermission={PERMISSIONS.SCALER_RISK_ASSESSMENT_READ}
      />
    </MemoryRouter>,
  );

// The assessment-id link text of each body row, in render order.
const rowIds = () =>
  screen
    .getAllByRole("row")
    .slice(1) // drop the header row
    .map((row) => within(row).getAllByRole("cell")[0].textContent);

describe("RiskRatingTable", () => {
  it("renders the risk level as a coloured chip", () => {
    renderTable();
    expect(screen.getByText("High")).toHaveClass("risk-level-pill--high");
    expect(screen.getByText("Low")).toHaveClass("risk-level-pill--low");
  });

  it("links the assessment id to the provided view path", () => {
    renderTable();
    expect(screen.getByRole("link", { name: "200" })).toHaveAttribute(
      "href",
      "/scaler-risk-assessments/view/200",
    );
  });

  it("opens sorted by Assessment ID descending (newest first), whatever order the backend sent", async () => {
    // The backend view returns the summaries ASCENDING by assessment id; the table must flip them.
    render(
      <MemoryRouter>
        <RiskRatingTable
          rows={[...ROWS].sort(
            (a, b) => (a.riskQuestionnaireId ?? 0) - (b.riskQuestionnaireId ?? 0),
          )}
          assessmentViewPath={(id) => `/scaler-risk-assessments/view/${id}`}
          viewPermission={PERMISSIONS.SCALER_RISK_ASSESSMENT_READ}
        />
      </MemoryRouter>,
    );

    expect(rowIds()).toEqual(["200", "100"]);
  });

  it("toggles the Assessment ID column, with no unsorted step to land on", async () => {
    renderTable();

    expect(rowIds()).toEqual(["200", "100"]);

    const header = screen.getByRole("button", {
      name: /Assessment ID/,
    });

    await userEvent.click(header); // ASC
    expect(rowIds()).toEqual(["100", "200"]);

    await userEvent.click(header); // back to DESC
    expect(rowIds()).toEqual(["200", "100"]);

    await userEvent.click(header); // ASC again — it toggles rather than dropping the sort
    expect(rowIds()).toEqual(["100", "200"]);
  });

  it("starts at ASC when the default sort's column is chosen again from another column", async () => {
    // Ratings deliberately disagree with the id order, so each click's direction is unambiguous.
    const mixed: RiskRatingRow[] = [
      { riskQuestionnaireId: 1, riskRating: 20 },
      { riskQuestionnaireId: 2, riskRating: 30 },
      { riskQuestionnaireId: 3, riskRating: 10 },
    ];
    render(
      <MemoryRouter>
        <RiskRatingTable rows={mixed} assessmentViewPath={(id) => `/x/${id}`}
          viewPermission={PERMISSIONS.SCALER_RISK_ASSESSMENT_READ} />
      </MemoryRouter>,
    );

    expect(rowIds()).toEqual(["3", "2", "1"]); // default: id DESC

    await userEvent.click(screen.getByRole("button", { name: /^Rating/ })); // ASC by rating
    expect(rowIds()).toEqual(["3", "1", "2"]);

    await userEvent.click(screen.getByRole("button", { name: /Assessment ID/ }));
    expect(rowIds()).toEqual(["1", "2", "3"]);
  });

  it("sorts the Level column by risk severity, not alphabetically", async () => {
    // Ids encode the expected severity order: Low=1, Medium=2, High=3, supplied shuffled.
    const levels: RiskRatingRow[] = [
      { riskQuestionnaireId: 3, riskTypeCode: "H", codeDescription: "High" },
      { riskQuestionnaireId: 1, riskTypeCode: "L", codeDescription: "Low" },
      { riskQuestionnaireId: 2, riskTypeCode: "M", codeDescription: "Medium" },
    ];
    render(
      <MemoryRouter>
        <RiskRatingTable
          rows={levels}
          assessmentViewPath={(id) => `/x/${id}`}
          viewPermission={PERMISSIONS.SCALER_RISK_ASSESSMENT_READ}
        />
      </MemoryRouter>,
    );

    const header = screen.getByRole("button", { name: /Level/ });

    await userEvent.click(header); // ASC → low, medium, high
    expect(rowIds()).toEqual(["1", "2", "3"]);

    await userEvent.click(header); // DESC → high, medium, low
    expect(rowIds()).toEqual(["3", "2", "1"]);
  });

  it("keeps unrecognized levels symmetric — DESC reverses ASC instead of pinning them last", async () => {
    // "X" is outside the known H/M/L tiers: it must not sink to the bottom of *both* directions.
    const levels: RiskRatingRow[] = [
      { riskQuestionnaireId: 3, riskTypeCode: "H", codeDescription: "High" },
      { riskQuestionnaireId: 1, riskTypeCode: "L", codeDescription: "Low" },
      { riskQuestionnaireId: 9, riskTypeCode: "X", codeDescription: "Unknown" },
    ];
    render(
      <MemoryRouter>
        <RiskRatingTable rows={levels} assessmentViewPath={(id) => `/x/${id}`}
          viewPermission={PERMISSIONS.SCALER_RISK_ASSESSMENT_READ} />
      </MemoryRouter>,
    );

    const header = screen.getByRole("button", { name: /Level/ });

    await userEvent.click(header); // ASC → unknown (lowest), low, high
    expect(rowIds()).toEqual(["9", "1", "3"]);

    await userEvent.click(header); // DESC → high, low, unknown (true reverse)
    expect(rowIds()).toEqual(["3", "1", "9"]);
  });

  it("colours and sorts the Level from the same source when only riskTypeCode is present", async () => {
    // No codeDescription: colour must still classify (from riskTypeCode) and match the rank.
    render(
      <MemoryRouter>
        <RiskRatingTable
          rows={[{ riskQuestionnaireId: 5, riskTypeCode: "H" }]}
          assessmentViewPath={(id) => `/x/${id}`}
          viewPermission={PERMISSIONS.SCALER_RISK_ASSESSMENT_READ}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("H")).toHaveClass("risk-level-pill--high");
  });

  it("sorts the Range column by the full low-high value, not the low bound alone", async () => {
    // Two ranges share a low bound (10) but differ in high — the high must break the tie so the
    // sort order matches the displayed "low-high".
    const ranges: RiskRatingRow[] = [
      { riskQuestionnaireId: 2, rangeLowValue: 10, rangeHighValue: 40 },
      { riskQuestionnaireId: 1, rangeLowValue: 10, rangeHighValue: 20 },
      { riskQuestionnaireId: 3, rangeLowValue: 25, rangeHighValue: 30 },
    ];
    render(
      <MemoryRouter>
        <RiskRatingTable rows={ranges} assessmentViewPath={(id) => `/x/${id}`}
          viewPermission={PERMISSIONS.SCALER_RISK_ASSESSMENT_READ} />
      </MemoryRouter>,
    );

    const header = screen.getByRole("button", { name: /Range/ });

    await userEvent.click(header); // ASC → 10-20, 10-40, 25-30
    expect(rowIds()).toEqual(["1", "2", "3"]);

    await userEvent.click(header); // DESC → 25-30, 10-40, 10-20
    expect(rowIds()).toEqual(["3", "2", "1"]);
  });

  it("sorts a row missing a bound with the blanks (as it displays '—'), not among valued ranges", async () => {
    // Row 9 has a low bound but no high, so it renders "—"; it must not interleave among the
    // valued ranges by its low bound alone — it sorts with the other blank rows (last, both ways).
    const ranges: RiskRatingRow[] = [
      { riskQuestionnaireId: 2, rangeLowValue: 20, rangeHighValue: 30 },
      { riskQuestionnaireId: 9, rangeLowValue: 10, rangeHighValue: null },
      { riskQuestionnaireId: 1, rangeLowValue: 5, rangeHighValue: 15 },
    ];
    render(
      <MemoryRouter>
        <RiskRatingTable rows={ranges} assessmentViewPath={(id) => `/x/${id}`}
          viewPermission={PERMISSIONS.SCALER_RISK_ASSESSMENT_READ} />
      </MemoryRouter>,
    );

    const header = screen.getByRole("button", { name: /Range/ });

    await userEvent.click(header); // ASC → 5-15, 20-30, then the blank row last
    expect(rowIds()).toEqual(["1", "2", "9"]);

    await userEvent.click(header); // DESC → 20-30, 5-15, blank still last (hook sorts nulls last)
    expect(rowIds()).toEqual(["2", "1", "9"]);
  });
});

// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useParams } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import "@/config/tests/setup-env";
import { SYS_ADMIN_ROLE } from '@/context/auth/types';
import * as authModule from "@/context/auth/useAuth";

import RiskRatingTab from "./RiskRatingTab";

import type { AuthContextType } from "@/context/auth/AuthContext";

const mockGetScaleSiteRiskRatings = vi.fn();

vi.mock("@/context/auth/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/services/APIs", () => ({
  default: {
    scaleSiteRiskAssessments: {
      getScaleSiteRiskRatings: (...args: unknown[]) =>
        mockGetScaleSiteRiskRatings(...args),
    },
  },
  BackendApiConfig: { BASE: "/api", TOKEN: async () => null },
}));

// Landing marker for the routed create page, so we can assert the Add button navigates there with
// the correct scale site id in the path.
const CreateRouteMarker = () => {
  const { scaleSiteIdNmbr } = useParams<{ scaleSiteIdNmbr: string }>();
  return <div>create-route:{scaleSiteIdNmbr}</div>;
};

describe("ScaleSite RiskRatingTab", () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);

  const createAuthContextValue = (): AuthContextType => ({
    // An administrator, so permission-gated controls render: these tests are about the
    // component behaviour, not authorization (see permissions.unit.test.ts for that).
    user: { roles: [SYS_ADMIN_ROLE], privileges: { [SYS_ADMIN_ROLE]: null } },
    isLoggedIn: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    userToken: vi.fn().mockResolvedValue("token"),
  });

  const renderTab = (isActive = true, scaleSiteIdNmbr = "A12345") => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route
              path="/"
              element={
                <RiskRatingTab isActive={isActive} scaleSiteIdNmbr={scaleSiteIdNmbr} />
              }
            />
            <Route
              path="/scale-sites/:scaleSiteIdNmbr/risk-assessments/create"
              element={<CreateRouteMarker />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  beforeEach(() => {
    mockGetScaleSiteRiskRatings.mockReset();
    mockUseAuth.mockReturnValue(createAuthContextValue());
  });

  it("renders a risk-assessment row with all spec columns", async () => {
    mockGetScaleSiteRiskRatings.mockResolvedValue([
      {
        riskQuestionnaireId: 12345,
        entryTimestamp: "2025-01-10T10:30:00Z",
        riskRating: 24,
        riskTypeCode: "H",
        codeDescription: "High",
        rangeLowValue: 20,
        rangeHighValue: 30,
        ratingDescription: "2 checks every 12 months",
        versionNo: 3,
      },
    ]);

    renderTab();

    const table = within(await screen.findByRole("table"));
    // Assessment ID links to the read-only scale-site assessment view page.
    expect(table.getByRole("link", { name: "12345" })).toHaveAttribute(
      "href",
      "/scale-site-risk-assessments/view/12345",
    );
    // Date Created is shown to the second (no timezone shift).
    expect(table.getByText("2025-01-10 10:30:00")).toBeInTheDocument();
    expect(table.getByText("24")).toBeInTheDocument();
    expect(table.getByText("High")).toBeInTheDocument();
    expect(table.getByText("20-30")).toBeInTheDocument();
    expect(table.getByText("2 checks every 12 months")).toBeInTheDocument();
    expect(table.getByText("3")).toBeInTheDocument();
  });

  it("lists the assessments newest first, whatever order the backend returned", async () => {
    // The backend view returns them ASCENDING by assessment id; the tab must show the highest
    // (newest) id first, on this subject as well as the scaler.
    mockGetScaleSiteRiskRatings.mockResolvedValue([
      { riskQuestionnaireId: 100, riskRating: 8 },
      { riskQuestionnaireId: 200, riskRating: 30 },
      { riskQuestionnaireId: 300, riskRating: 12 },
    ]);

    renderTab();

    const table = within(await screen.findByRole("table"));
    const ids = table
      .getAllByRole("row")
      .slice(1) // drop the header row
      .map((row) => within(row).getAllByRole("cell")[0].textContent);
    expect(ids).toEqual(["300", "200", "100"]);
  });

  it("navigates to the routed create page when Add Risk Assessment is clicked", async () => {
    mockGetScaleSiteRiskRatings.mockResolvedValue([]);

    renderTab();

    const addButton = await screen.findByRole("button", {
      name: /Add Risk Assessment/,
    });
    expect(addButton).toBeEnabled();

    fireEvent.click(addButton);

    // Lands on the shared routed create page with the scale site id in the path.
    expect(await screen.findByText("create-route:A12345")).toBeInTheDocument();
  });

  it("shows the empty state when there are no assessments", async () => {
    mockGetScaleSiteRiskRatings.mockResolvedValue([]);

    renderTab();

    expect(
      await screen.findByText("No risk assessments found for this scale site."),
    ).toBeInTheDocument();
  });

  it("shows an error notification when the request fails", async () => {
    mockGetScaleSiteRiskRatings.mockRejectedValue(new Error("Boom"));

    renderTab();

    expect(
      await screen.findByText("Risk assessments unavailable."),
    ).toBeInTheDocument();
  });

  it("does not call the API when the tab is inactive", () => {
    renderTab(false);

    expect(mockGetScaleSiteRiskRatings).not.toHaveBeenCalled();
  });
});

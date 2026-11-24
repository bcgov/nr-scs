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

const mockGetScalerRiskRatings = vi.fn();

vi.mock("@/context/auth/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/services/APIs", () => ({
  default: {
    scalerRiskAssessments: {
      getScalerRiskRatings: (...args: unknown[]) =>
        mockGetScalerRiskRatings(...args),
    },
  },
  BackendApiConfig: { BASE: "/api", TOKEN: async () => null },
}));

// Landing marker for the routed create page, so we can assert the Add button navigates there with
// the correct scaler licence number in the path.
const CreateRouteMarker = () => {
  const { scalerLicenceNo } = useParams<{ scalerLicenceNo: string }>();
  return <div>create-route:{scalerLicenceNo}</div>;
};

describe("RiskRatingTab", () => {
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

  const renderTab = (isActive = true, scalerLicenceNo = "1234") => {
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
                <RiskRatingTab isActive={isActive} scalerLicenceNo={scalerLicenceNo} />
              }
            />
            <Route
              path="/scalers/:scalerLicenceNo/risk-assessments/create"
              element={<CreateRouteMarker />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  beforeEach(() => {
    mockGetScalerRiskRatings.mockReset();
    mockUseAuth.mockReturnValue(createAuthContextValue());
  });

  it("renders a risk-assessment row with all spec columns", async () => {
    mockGetScalerRiskRatings.mockResolvedValue([
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
    // Assessment ID links to the read-only view page.
    expect(table.getByRole("link", { name: "12345" })).toHaveAttribute(
      "href",
      "/scaler-risk-assessments/view/12345",
    );
    // Date Created is shown to the second (no timezone shift).
    expect(table.getByText("2025-01-10 10:30:00")).toBeInTheDocument();
    expect(table.getByText("24")).toBeInTheDocument();
    expect(table.getByText("High")).toBeInTheDocument();
    expect(table.getByText("20-30")).toBeInTheDocument();
    expect(table.getByText("2 checks every 12 months")).toBeInTheDocument();
    expect(table.getByText("3")).toBeInTheDocument();
  });

  it("heads the section with the same <h4> the other record tabs use", async () => {
    // The standardized record-tab section heading (Check Scales, Scale Site Summary): an h4 carrying
    // the shared tab-view class, NOT the larger/bolder h3 this tab used to render.
    mockGetScalerRiskRatings.mockResolvedValue([]);

    renderTab();

    const heading = await screen.findByRole("heading", { name: "Risk Assessments" });
    expect(heading.tagName).toBe("H4");
    expect(heading).toHaveClass("scs__tab-view__section-title");
  });

  it("navigates to the routed create page when Add Risk Assessment is clicked", async () => {
    mockGetScalerRiskRatings.mockResolvedValue([]);

    renderTab();

    const addButton = await screen.findByRole("button", {
      name: /Add Risk Assessment/,
    });
    expect(addButton).toBeEnabled();

    fireEvent.click(addButton);

    // Lands on the shared routed create page with the scaler licence number in the path.
    expect(await screen.findByText("create-route:1234")).toBeInTheDocument();
  });

  it("shows the empty state when there are no assessments", async () => {
    mockGetScalerRiskRatings.mockResolvedValue([]);

    renderTab();

    expect(
      await screen.findByText("No risk assessments found for this scaler."),
    ).toBeInTheDocument();
  });

  it("shows an error notification when the request fails", async () => {
    mockGetScalerRiskRatings.mockRejectedValue(new Error("Boom"));

    renderTab();

    expect(
      await screen.findByText("Risk assessments unavailable."),
    ).toBeInTheDocument();
  });

  it("does not call the API when the tab is inactive", () => {
    renderTab(false);

    expect(mockGetScalerRiskRatings).not.toHaveBeenCalled();
  });
});

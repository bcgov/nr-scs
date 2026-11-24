// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import "@/config/tests/setup-env";
import { SYS_ADMIN_ROLE } from '@/context/auth/types';
import * as authModule from "@/context/auth/useAuth";
import { PageTitleProvider } from "@/context/pageTitle/PageTitleProvider";

import ScaleSiteRiskAssessmentCreatePage from "./index";

import type { AuthContextType } from "@/context/auth/AuthContext";

const mockGetCreateInit = vi.fn();
const mockCreate = vi.fn();

vi.mock("@/context/auth/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/services/APIs", () => ({
  default: {
    scaleSiteRiskAssessments: {
      getScaleSiteRiskAssessmentCreateInit: (...args: unknown[]) =>
        mockGetCreateInit(...args),
      createScaleSiteRiskAssessment: (...args: unknown[]) => mockCreate(...args),
    },
  },
  BackendApiConfig: { BASE: "/api", TOKEN: async () => null },
}));

const createInitDetail = {
  scaleSiteIdNmbr: "A12345",
  siteName: "MAIN YARD",
  regionName: "Coast",
  districtName: "Cascadia",
  templateId: 7,
  versionNo: 3,
  comments: null,
  sections: [
    {
      sectionId: 1,
      sectionDescription: "Values (A)",
      sectionOrder: 1,
      questions: [
        {
          questionId: 101,
          questionText: "Activity Level",
          questionOrder: 1,
          selectedAnswerId: null,
          answers: [
            { answerId: 5001, answerText: "Low", weight: 1, answerOrder: 1 },
            { answerId: 5002, answerText: "High", weight: 5, answerOrder: 2 },
          ],
        },
      ],
    },
  ],
  riskRatings: [
    {
      riskTypeCode: "H",
      codeDescription: "High",
      ratingDescription: "2 checks every 12 months",
      rangeLowValue: 20,
      rangeHighValue: 30,
    },
  ],
};

describe("ScaleSiteRiskAssessmentCreatePage", () => {
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

  const renderPage = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <PageTitleProvider>
          <MemoryRouter initialEntries={["/scale-sites/A12345/risk-assessments/create"]}>
            <Routes>
            <Route
              path="/scale-sites/:scaleSiteIdNmbr/risk-assessments/create"
              element={<ScaleSiteRiskAssessmentCreatePage />}
            />
            {/* successRedirect / createReturnPath both land on the record's Risk Rating tab. */}
            <Route
              path="/scale-sites/view/:scaleSiteIdNmbr"
              element={<div>record-page</div>}
            />
            </Routes>
          </MemoryRouter>
        </PageTitleProvider>
      </QueryClientProvider>,
    );
  };

  beforeEach(() => {
    mockGetCreateInit.mockReset();
    mockCreate.mockReset();
    mockUseAuth.mockReturnValue(createAuthContextValue());
  });

  it("loads the blank active-template questionnaire and scale-site header", async () => {
    mockGetCreateInit.mockResolvedValue(createInitDetail);

    renderPage();

    expect(await screen.findByText("Scale Site Record")).toBeInTheDocument();
    expect(mockGetCreateInit).toHaveBeenCalledWith("A12345", "token");
    expect(await screen.findByText("Values (A)")).toBeInTheDocument();
    expect(screen.getByDisplayValue("MAIN YARD")).toBeInTheDocument();
  });

  it("blocks create until every question is answered", async () => {
    mockGetCreateInit.mockResolvedValue(createInitDetail);

    renderPage();

    await screen.findByText("Values (A)");
    fireEvent.click(screen.getByRole("button", { name: /Save Assessment/ }));

    expect(
      await screen.findByText(
        /All questions must be answered in order to save the assessment\./,
      ),
    ).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("creates the assessment once all questions are answered and returns to the record", async () => {
    mockGetCreateInit.mockResolvedValue(createInitDetail);
    mockCreate.mockResolvedValue({ riskQuestionnaireId: 999, scaleSiteIdNmbr: "A12345" });

    renderPage();

    await screen.findByText("Values (A)");
    fireEvent.change(screen.getByLabelText("Activity Level"), {
      target: { value: "5002" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save Assessment/ }));

    expect(await screen.findByText("record-page")).toBeInTheDocument();
    expect(mockCreate).toHaveBeenCalledWith(
      "A12345",
      expect.objectContaining({
        responses: [{ questionId: 101, answerId: 5002 }],
      }),
      "token",
    );
  });

  it("keeps a Back control when the create form fails to load (no dead-end)", async () => {
    mockGetCreateInit.mockRejectedValue(new Error("boom"));

    renderPage();

    // Load failed: the form still renders its action row, so the user can return to the record.
    const backButton = await screen.findByRole("button", { name: /Back/ });
    fireEvent.click(backButton);

    expect(await screen.findByText("record-page")).toBeInTheDocument();
  });
});

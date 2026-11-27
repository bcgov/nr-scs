import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { testAuthContext } from "@/config/tests/renderWithProviders";
import { AuthContext } from "@/context/auth/AuthContext";

import AuthCallbackPage from "./index";

const renderCallback = (completeSignIn: () => Promise<void>) =>
  render(
    <AuthContext.Provider
      value={{ ...testAuthContext(undefined), completeSignIn }}
    >
      <MemoryRouter initialEntries={["/authCallback?code=abc&state=xyz"]}>
        <Routes>
          <Route path="/authCallback" element={<AuthCallbackPage />} />
          <Route path="/" element={<div>home</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

describe("AuthCallbackPage", () => {
  it("completes the sign-in once and navigates home", async () => {
    const completeSignIn = vi.fn().mockResolvedValue(undefined);
    renderCallback(completeSignIn);
    await waitFor(() => expect(screen.getByText("home")).toBeInTheDocument());
    expect(completeSignIn).toHaveBeenCalledTimes(1);
  });

  it("shows an error with a way home when the exchange fails", async () => {
    renderCallback(vi.fn().mockRejectedValue(new Error("invalid_grant")));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Sign-in could not be completed",
    );
    expect(screen.getByRole("link", { name: "Return to SCS" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});

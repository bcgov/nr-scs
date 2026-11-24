// @vitest-environment happy-dom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ScaleSiteInspectionQuestions from "./index";
vi.mock("@/components/core/DateInput", () => ({
  default: ({
    id,
    value = "",
    onChange,
    labelText,
    hideLabel = true,
    invalid = false,
    invalidText,
    disabled = false,
  }: {
    id: string;
    value?: string;
    onChange?: (value: string) => void;
    labelText?: ReactNode;
    hideLabel?: boolean;
    invalid?: boolean;
    invalidText?: string;
    disabled?: boolean;
  }) => (
    <>
      {hideLabel ? null : <label htmlFor={id}>{labelText}</label>}
      <input
        id={id}
        value={value}
        aria-invalid={invalid}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
      />
      {invalid && invalidText ? <div>{invalidText}</div> : null}
    </>
  ),
}));
vi.mock("@/components/core/EmptySection", () => ({
  default: ({ title, description }: { title: string; description: string }) => (
    <div>
      <h5>{title}</h5>
      <p>{description}</p>
    </div>
  ),
}));

afterEach(() => {
  cleanup();
});

describe("ScaleSiteInspectionQuestions", () => {
  const baseProps = {
    questions: [
      {
        inspectionQuestionId: 101,
        questionText: "Was the scale tested?",
        answerOptions: [
          { code: "Y", description: "Yes" },
          { code: "N", description: "No" },
        ],
        inspectionAnswerCode: "Y",
        commentsText: "Everything passed.",
        followUpRequiredInd: "N",
        followUpActionText: "",
        followUpDueDate: "",
        followUpCompletedInd: "",
      },
    ],
    errors: [
      {
        followUpActionText:
          "Action Required is required when follow-up is required.",
      },
    ],
    disabled: false,
    requiredIndicatorClassName: "scale-site-inspection-edit__required",
    emptyStateDescription: "No questions are required for this inspection.",
    onFieldChange: vi.fn(),
  } as const;
  it("renders question tables with the existing styling hooks", () => {
    render(<ScaleSiteInspectionQuestions {...baseProps} />);

    const questionHeading = screen.queryByText("Questions");
    const questionTable = screen.getByRole("table", {
      name: /inspection question 1/i,
    });

    expect(questionHeading).not.toBeNull();
    expect(questionTable.className).toContain(
      "scale-site-inspection-questions__question-table",
    );
    expect(screen.queryByText("Was the scale tested?")).not.toBeNull();
  });
  it("disables follow-up detail fields when follow-up is not required", () => {
    render(<ScaleSiteInspectionQuestions {...baseProps} />);

    const followUpAction = document.getElementById(
      "question-follow-up-action-101",
    ) as HTMLTextAreaElement | null;
    const followUpDueDate = document.getElementById(
      "question-follow-up-due-date-101",
    ) as HTMLInputElement | null;
    const followUpCompleted = screen.getAllByRole(
      "combobox",
    )[2] as HTMLSelectElement;

    expect(followUpAction?.disabled).toBe(true);
    expect(followUpDueDate?.disabled).toBe(true);
    expect(followUpCompleted.disabled).toBe(true);
  });
  it("forwards field changes to the page handler", () => {
    const onFieldChange = vi.fn();
    render(
      <ScaleSiteInspectionQuestions
        {...baseProps}
        onFieldChange={onFieldChange}
      />,
    );
    const questionTable = screen.getByRole("table", {
      name: /inspection question 1/i,
    });
    const answerSelect = within(questionTable).getAllByRole("combobox")[0];

    fireEvent.change(answerSelect, { target: { value: "N" } });
    expect(onFieldChange).toHaveBeenCalledWith(0, "inspectionAnswerCode", "N");
  });
  it("renders the configurable empty state when no questions are available", () => {
    render(
      <ScaleSiteInspectionQuestions
        {...baseProps}
        questions={[]}
        errors={[]}
      />,
    );
    expect(screen.queryByText("No question responses")).not.toBeNull();
    expect(
      screen.queryByText("No questions are required for this inspection."),
    ).not.toBeNull();
  });

  it("renders plain-text values in view mode with description fallbacks", () => {
    render(
      <ScaleSiteInspectionQuestions
        mode="view"
        questions={[
          {
            questionText: "Was the scale head sealed?",
            inspectionAnswerCode: "Y",
            commentsText: "Seal intact.",
            followUpRequiredInd: "N",
            followUpActionText: "",
            followUpDueDate: "",
            followUpCompletedInd: "Y",
          },
        ]}
        emptyStateDescription="No questions are required for this inspection."
      />,
    );

    const questionTable = screen.getByRole("table", {
      name: /inspection question 1/i,
    });

    expect(within(questionTable).getByText("Was the scale head sealed?")).toBeTruthy();
    expect(within(questionTable).getAllByText("Y").length).toBeGreaterThan(0);
    expect(within(questionTable).getByText("Seal intact.")).toBeTruthy();
    expect(within(questionTable).getAllByText("N").length).toBeGreaterThan(0);
    expect(screen.queryByRole("combobox")).toBeNull();
  });
});

import { Reset as ResetIcon, Save as SaveIcon } from "@carbon/icons-react";
import {
  Column,
  Form,
  Grid,
  InlineNotification,
  SkeletonText,
} from "@carbon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import EmptySection from "@/components/core/EmptySection";
import Button from "@/components/core/Button";
import PageTitle from "@/components/core/PageTitle";
import ScaleSiteInspectionDetails from "@/components/Form/ScaleSiteInspectionDetails";
import { mapInspectionServerFieldErrors } from "@/components/Form/ScaleSiteInspectionDetails/fieldErrors";
import {
  FOLLOW_UP_ACTION_MAX_LENGTH,
  INSPECTION_COMMENTS_MAX_LENGTH,
  maxLengthError,
  QUESTION_COMMENTS_MAX_LENGTH,
} from "@/components/Form/ScaleSiteInspectionDetails/limits";
import ScaleSiteInspectionQuestions from "@/components/Form/ScaleSiteInspectionQuestions";
import { useAuth } from "@/context/auth/useAuth";
import API from "@/services/APIs";
import type {
  ScaleSiteInspectionAnswerOption,
  ScaleSiteInspectionEditView,
  ScaleSiteInspectionUpdateRequest,
} from "@/services/scaleSiteInspections.service";
import { isFutureDateOnly } from "@/utils/dateOnly";
import { extractApiError } from "@/utils/extractApiError";
import { isInspectorGuid } from "@/utils/inspectorGuid";
import { scrollToError } from "@/utils/scrollToError";
import "./index.scss";

type YesNoValue = "" | "Y" | "N";

type DisplayFieldValue = string | number | null | undefined;

type ScaleSiteInspectionFormQuestionResponse = {
  inspectionQuestionId: number;
  questionText: string;
  answerOptions: ScaleSiteInspectionAnswerOption[];
  inspectionAnswerCode: string;
  commentsText: string;
  followUpRequiredInd: YesNoValue;
  followUpActionText: string;
  followUpDueDate: string;
  followUpCompletedInd: YesNoValue;
};

type ScaleSiteInspectionFormValues = {
  inspectionDate: string;
  inspector: string;
  siteOperatorPresentInd: YesNoValue;
  comments: string;
  questionResponses: ScaleSiteInspectionFormQuestionResponse[];
};

type ScaleSiteInspectionQuestionErrors = {
  inspectionAnswerCode?: string;
  commentsText?: string;
  followUpRequiredInd?: string;
  followUpActionText?: string;
  followUpDueDate?: string;
  followUpCompletedInd?: string;
};

type ScaleSiteInspectionFormErrors = {
  inspectionDate?: string;
  inspector?: string;
  siteOperatorPresentInd?: string;
  comments?: string;
  questionResponses?: ScaleSiteInspectionQuestionErrors[];
};

type QuestionFieldKey =
  | "inspectionAnswerCode"
  | "commentsText"
  | "followUpRequiredInd"
  | "followUpActionText"
  | "followUpDueDate"
  | "followUpCompletedInd";

type BannerMode = "validation" | "api";

const textValue = (value: DisplayFieldValue): string => {
  if (value == null) {
    return "";
  }

  return String(value).trim();
};

const isYesNoValue = (value: string): value is "Y" | "N" => {
  return value === "Y" || value === "N";
};

const toYesNoValue = (value: DisplayFieldValue): YesNoValue => {
  const normalized = textValue(value);
  return isYesNoValue(normalized) ? normalized : "";
};

const normalizeAnswerOptions = (
  options: ScaleSiteInspectionAnswerOption[] | undefined,
  selectedCode: string,
  selectedDescription?: string | null,
): ScaleSiteInspectionAnswerOption[] => {
  const normalized = (options ?? [])
    .filter((option) => textValue(option.code).length > 0)
    .map((option) => ({
      code: textValue(option.code),
      description: textValue(option.description) || textValue(option.code),
    }));

  if (
    selectedCode &&
    !normalized.some((option) => option.code === selectedCode)
  ) {
    normalized.unshift({
      code: selectedCode,
      description: textValue(selectedDescription) || selectedCode,
    });
  }

  return normalized;
};

const cloneFormValues = (
  values: ScaleSiteInspectionFormValues,
): ScaleSiteInspectionFormValues => ({
  ...values,
  questionResponses: values.questionResponses.map((question) => ({
    ...question,
    answerOptions: question.answerOptions.map((option) => ({ ...option })),
  })),
});

const toFormValues = (
  data: ScaleSiteInspectionEditView,
): ScaleSiteInspectionFormValues => ({
  inspectionDate: textValue(data.inspectionDate),
  inspector: textValue(data.inspector),
  siteOperatorPresentInd: toYesNoValue(data.siteOperatorPresentInd),
  comments: textValue(data.comments),
  questionResponses: (data.questionResponses ?? []).map((question) => {
    const selectedAnswerCode = textValue(question.inspectionAnswerCode);

    return {
      inspectionQuestionId: question.inspectionQuestionId,
      questionText: textValue(question.questionText),
      answerOptions: normalizeAnswerOptions(
        question.answerOptions,
        selectedAnswerCode,
        question.inspectionAnswerDescription,
      ),
      inspectionAnswerCode: selectedAnswerCode,
      commentsText: textValue(question.commentsText),
      followUpRequiredInd: toYesNoValue(question.followUpRequiredInd),
      followUpActionText: textValue(question.followUpActionText),
      followUpDueDate: textValue(question.followUpDueDate),
      followUpCompletedInd: toYesNoValue(question.followUpCompletedInd),
    };
  }),
});

const trimToNull = (value: string): string | null => {
  const normalized = value.trim();
  return normalized || null;
};

const buildUpdateRequest = (
  values: ScaleSiteInspectionFormValues,
): ScaleSiteInspectionUpdateRequest => ({
  inspectionDate: values.inspectionDate,
  inspector: values.inspector.trim(),
  siteOperatorPresentInd: values.siteOperatorPresentInd as "Y" | "N",
  comments: trimToNull(values.comments),
  questionResponses: values.questionResponses.map((question) => ({
    inspectionQuestionId: question.inspectionQuestionId,
    inspectionAnswerCode: question.inspectionAnswerCode,
    commentsText: trimToNull(question.commentsText),
    followUpRequiredInd: question.followUpRequiredInd as "Y" | "N",
    followUpActionText:
      question.followUpRequiredInd === "Y"
        ? trimToNull(question.followUpActionText)
        : null,
    followUpDueDate:
      question.followUpRequiredInd === "Y"
        ? trimToNull(question.followUpDueDate)
        : null,
    followUpCompletedInd:
      question.followUpRequiredInd === "Y"
        ? (question.followUpCompletedInd as "Y" | "N")
        : null,
  })),
});

const validateFormValues = (
  values: ScaleSiteInspectionFormValues,
): ScaleSiteInspectionFormErrors => {
  const errors: ScaleSiteInspectionFormErrors = {};

  if (!values.inspectionDate.trim()) {
    errors.inspectionDate = "Inspection Date is required.";
  } else if (isFutureDateOnly(values.inspectionDate.trim())) {
    errors.inspectionDate = "Inspection Date cannot be in the future.";
  }

  if (!values.inspector.trim()) {
    errors.inspector = "Inspector # is required.";
  } else if (!isInspectorGuid(values.inspector)) {
    // Backend requires a valid euser GUID; catch a bad value inline rather than as a 400.
    errors.inspector = "Inspector must be a valid user GUID.";
  }

  if (!isYesNoValue(values.siteOperatorPresentInd)) {
    errors.siteOperatorPresentInd =
      "Site Operator present during Inspection is required.";
  }

  const commentsError = maxLengthError(
    values.comments.trim(),
    INSPECTION_COMMENTS_MAX_LENGTH,
    "General Comments",
  );
  if (commentsError) {
    errors.comments = commentsError;
  }

  const questionErrors =
    values.questionResponses.map<ScaleSiteInspectionQuestionErrors>(
      (question) => {
        const rowErrors: ScaleSiteInspectionQuestionErrors = {};

        if (!question.inspectionAnswerCode.trim()) {
          rowErrors.inspectionAnswerCode = "Answer is required.";
        }

        const commentsTextError = maxLengthError(
          question.commentsText.trim(),
          QUESTION_COMMENTS_MAX_LENGTH,
          "Comments",
        );
        if (commentsTextError) {
          rowErrors.commentsText = commentsTextError;
        }

        if (!isYesNoValue(question.followUpRequiredInd)) {
          rowErrors.followUpRequiredInd = "Follow-Up Required is required.";
        }

        if (question.followUpRequiredInd === "Y") {
          if (!question.followUpActionText.trim()) {
            rowErrors.followUpActionText =
              "Action Required is required when follow-up is required.";
          } else {
            const followUpActionError = maxLengthError(
              question.followUpActionText.trim(),
              FOLLOW_UP_ACTION_MAX_LENGTH,
              "Action Required",
            );
            if (followUpActionError) {
              rowErrors.followUpActionText = followUpActionError;
            }
          }

          if (!question.followUpDueDate.trim()) {
            rowErrors.followUpDueDate =
              "Due Date is required when follow-up is required.";
          }

          if (!isYesNoValue(question.followUpCompletedInd)) {
            rowErrors.followUpCompletedInd =
              "Complete? is required when follow-up is required.";
          }
        }

        return rowErrors;
      },
    );

  if (questionErrors.some((question) => Object.keys(question).length > 0)) {
    errors.questionResponses = questionErrors;
  }

  return errors;
};

const hasValidationErrors = (
  errors: ScaleSiteInspectionFormErrors,
): boolean => {
  return Boolean(
    errors.inspectionDate ||
    errors.inspector ||
    errors.siteOperatorPresentInd ||
    errors.comments ||
    errors.questionResponses?.some(
      (question) => Object.keys(question).length > 0,
    ),
  );
};

const firstValidationError = (
  errors: ScaleSiteInspectionFormErrors,
): string => {
  return (
    errors.inspectionDate ||
    errors.inspector ||
    errors.siteOperatorPresentInd ||
    errors.comments ||
    errors.questionResponses
      ?.flatMap((question) => Object.values(question))
      .find(Boolean) ||
    "Please fix the errors below."
  );
};

const firstInvalidFieldId = (
  errors: ScaleSiteInspectionFormErrors,
  values: ScaleSiteInspectionFormValues,
): string | null => {
  if (errors.inspectionDate) {
    return "inspection-date";
  }

  if (errors.inspector) {
    return "inspector";
  }

  if (errors.siteOperatorPresentInd) {
    return "site-operator-present";
  }

  if (errors.comments) {
    return "inspection-comments";
  }

  for (let index = 0; index < values.questionResponses.length; index += 1) {
    const question = values.questionResponses[index];
    const questionErrors = errors.questionResponses?.[index];

    if (!question || !questionErrors) {
      continue;
    }

    if (questionErrors.inspectionAnswerCode) {
      return `question-answer-${question.inspectionQuestionId}`;
    }

    if (questionErrors.commentsText) {
      return `question-comments-${question.inspectionQuestionId}`;
    }

    if (questionErrors.followUpRequiredInd) {
      return `question-follow-up-required-${question.inspectionQuestionId}`;
    }

    if (questionErrors.followUpActionText) {
      return `question-follow-up-action-${question.inspectionQuestionId}`;
    }

    if (questionErrors.followUpDueDate) {
      return `question-follow-up-due-date-${question.inspectionQuestionId}`;
    }

    if (questionErrors.followUpCompletedInd) {
      return `question-follow-up-completed-${question.inspectionQuestionId}`;
    }
  }

  return null;
};

// Scroll-to-error uses the shared scrollToError(fieldId) util with an explicit id; this form resolves
// the first-error field via firstInvalidFieldId because its error fields include radio/checkbox groups,
// so an explicit id is more reliable than scrollToError()'s Carbon `--invalid` class auto-detect.


const ScaleSiteInspectionEditPage = () => {
  const { scaleSiteIdNmbr, inspectionId } = useParams<{
    scaleSiteIdNmbr: string;
    inspectionId: string;
  }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userToken } = useAuth();

  const numericInspectionId = inspectionId ? Number(inspectionId) : Number.NaN;
  const isValidInspectionId =
    Number.isInteger(numericInspectionId) && numericInspectionId > 0;
  const inspectionDetailPath = `/scale-sites/${encodeURIComponent(scaleSiteIdNmbr ?? '')}/inspections/view/${numericInspectionId}`;

  const [formValues, setFormValues] =
    useState<ScaleSiteInspectionFormValues | null>(null);
  const [initialValues, setInitialValues] =
    useState<ScaleSiteInspectionFormValues | null>(null);
  const [formErrors, setFormErrors] = useState<ScaleSiteInspectionFormErrors>(
    {},
  );
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [bannerMode, setBannerMode] = useState<BannerMode | null>(null);

  const inspectionQuery = useQuery<ScaleSiteInspectionEditView, Error>({
    queryKey: ["scale-site-inspection-edit", numericInspectionId],
    queryFn: async () => {
      const token = await userToken();
      return API.scaleSiteInspections.getScaleSiteInspectionEdit(
        numericInspectionId,
        token,
      );
    },
    enabled: isValidInspectionId,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!inspectionQuery.data) {
      return;
    }

    const nextValues = toFormValues(inspectionQuery.data);
    setInitialValues(nextValues);
    setFormValues(cloneFormValues(nextValues));
    setFormErrors({});
    setBannerMessage(null);
    setBannerMode(null);
  }, [inspectionQuery.data]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!formValues) {
        throw new Error("Inspection form is not ready.");
      }

      const token = await userToken();
      return API.scaleSiteInspections.updateScaleSiteInspection(
        numericInspectionId,
        buildUpdateRequest(formValues),
        token,
      );
    },
    onSuccess: (detail) => {
      queryClient.setQueryData(
        ["scale-site-inspection-detail", numericInspectionId],
        detail,
      );
      queryClient.removeQueries({
        queryKey: ["scale-site-inspection-edit", numericInspectionId],
      });
      if (detail.scaleSiteIdNmbr) {
        queryClient.removeQueries({
          queryKey: ["scale-site-inspections", detail.scaleSiteIdNmbr],
        });
      }
      navigate(inspectionDetailPath);
    },
    onError: (error: unknown) => {
      // A future Inspection Date comes back as a field-scoped error — surface it inline on the field
      // rather than as a banner the user gets scrolled away from. (previousInspectionId is create-only,
      // so it never appears here, but the shared mapper is harmless.)
      const mapped = mapInspectionServerFieldErrors(error);

      if (mapped.firstFieldId) {
        setFormErrors((previous) => ({ ...previous, ...mapped.errors }));
        setBannerMode("validation");
        setBannerMessage(mapped.firstMessage ?? "Please fix the highlighted fields.");
        scrollToError(mapped.firstFieldId);
        return;
      }

      setBannerMode("api");
      setBannerMessage(
        mapped.unmapped.length > 0
          ? mapped.unmapped.join(" ")
          : extractApiError(error, "Could not update inspection."),
      );
    },
  });

  const inspectionTypeName =
    inspectionQuery.data?.inspectionTypeDescription ?? "";
  const isInspectionLoading = inspectionQuery.isPending;
  const isFormInitializing = inspectionQuery.isSuccess && !formValues;

  const isSubmitting = updateMutation.isPending;

  const clearQuestionError = (
    index: number,
    field: keyof ScaleSiteInspectionQuestionErrors,
  ) => {
    setFormErrors((previous) => {
      if (!previous.questionResponses?.[index]?.[field]) {
        return previous;
      }

      const nextQuestionErrors = [...previous.questionResponses];
      nextQuestionErrors[index] = {
        ...nextQuestionErrors[index],
        [field]: undefined,
      };

      return {
        ...previous,
        questionResponses: nextQuestionErrors,
      };
    });
  };

  const handleRootFieldChange = (
    field:
      | "inspectionDate"
      | "inspector"
      | "siteOperatorPresentInd"
      | "comments",
    value: string,
  ) => {
    setFormValues((previous) => {
      if (!previous) {
        return previous;
      }

      return {
        ...previous,
        [field]: value,
      };
    });

    setBannerMessage(null);
    setBannerMode(null);
    setFormErrors((previous) => ({
      ...previous,
      [field]: undefined,
    }));
  };

  const handleQuestionFieldChange = (
    index: number,
    field: QuestionFieldKey,
    value: string,
  ) => {
    setFormValues((previous) => {
      if (!previous) {
        return previous;
      }

      const nextQuestions = previous.questionResponses.map(
        (question, questionIndex) => {
          if (questionIndex !== index) {
            return question;
          }

          const nextQuestion: ScaleSiteInspectionFormQuestionResponse = {
            ...question,
            [field]: value,
          };

          if (field === "followUpRequiredInd" && value === "N") {
            nextQuestion.followUpActionText = "";
            nextQuestion.followUpDueDate = "";
            nextQuestion.followUpCompletedInd = "";
          }

          return nextQuestion;
        },
      );

      return {
        ...previous,
        questionResponses: nextQuestions,
      };
    });

    setBannerMessage(null);
    setBannerMode(null);

    if (field === "inspectionAnswerCode") {
      clearQuestionError(index, "inspectionAnswerCode");
    }

    if (field === "followUpRequiredInd") {
      clearQuestionError(index, "followUpRequiredInd");
      if (value === "N") {
        clearQuestionError(index, "followUpActionText");
        clearQuestionError(index, "followUpDueDate");
        clearQuestionError(index, "followUpCompletedInd");
      }
    }

    if (field === "commentsText") {
      clearQuestionError(index, "commentsText");
    }

    if (field === "followUpActionText") {
      clearQuestionError(index, "followUpActionText");
    }

    if (field === "followUpDueDate") {
      clearQuestionError(index, "followUpDueDate");
    }

    if (field === "followUpCompletedInd") {
      clearQuestionError(index, "followUpCompletedInd");
    }
  };

  const handleReset = () => {
    if (!initialValues) {
      return;
    }

    setFormValues(cloneFormValues(initialValues));
    setFormErrors({});
    setBannerMessage(null);
    setBannerMode(null);
  };

  const submitForm = () => {
    if (!formValues) {
      return;
    }

    const nextErrors = validateFormValues(formValues);
    setFormErrors(nextErrors);

    if (hasValidationErrors(nextErrors)) {
      setBannerMode("validation");
      setBannerMessage(firstValidationError(nextErrors));
      scrollToError(firstInvalidFieldId(nextErrors, formValues));
      return;
    }

    setBannerMessage(null);
    setBannerMode(null);
    updateMutation.mutate();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitForm();
  };

  if (!inspectionId || !isValidInspectionId) {
    return (
      <Grid className="scale-site-inspection-edit">
        <PageTitle
          title="Scale Site Inspection - Edit"
          breadCrumbs={[
            { name: "Scale Sites", path: "/scale-sites" },
            ...(scaleSiteIdNmbr
              ? [{
                  name: `Scale Site ${scaleSiteIdNmbr}`,
                  path: `/scale-sites/view/${encodeURIComponent(scaleSiteIdNmbr)}?tab=inspections`,
                }]
              : []),
            { name: "Inspection Edit" },
          ]}
        />
        <Column lg={16} md={8} sm={4}>
          <div className="scale-site-inspection-edit__content scs__view">
            <EmptySection
              icon="WarningFilled"
              title="Inspection not available"
              description="A valid inspection id was not provided in the route."
              whiteLayer
            />
          </div>
        </Column>
      </Grid>
    );
  }

  if (isInspectionLoading || isFormInitializing) {
    return (
      <Grid className="scale-site-inspection-edit">
        <PageTitle
          title="Scale Site Inspection - Edit"
          breadCrumbs={[
            { name: "Scale Sites", path: "/scale-sites" },
            ...(scaleSiteIdNmbr
              ? [{
                  name: `Scale Site ${scaleSiteIdNmbr}`,
                  path: `/scale-sites/view/${encodeURIComponent(scaleSiteIdNmbr)}?tab=inspections`,
                }]
              : []),
            {
              name: `Inspection ${inspectionId}`,
              path: `/scale-sites/${encodeURIComponent(scaleSiteIdNmbr ?? '')}/inspections/view/${encodeURIComponent(inspectionId)}`,
            },
            { name: "Edit" },
          ]}
        />
        <Column lg={16} md={8} sm={4}>
          <div className="scale-site-inspection-edit__content scs__view">
            <div className="scale-site-inspection-edit__panel">
              <SkeletonText paragraph lineCount={12} />
            </div>
          </div>
        </Column>
      </Grid>
    );
  }

  if (inspectionQuery.isError) {
    return (
      <Grid className="scale-site-inspection-edit">
        <PageTitle
          title="Scale Site Inspection - Edit"
          breadCrumbs={[
            { name: "Scale Sites", path: "/scale-sites" },
            ...(scaleSiteIdNmbr
              ? [{
                  name: `Scale Site ${scaleSiteIdNmbr}`,
                  path: `/scale-sites/view/${encodeURIComponent(scaleSiteIdNmbr)}?tab=inspections`,
                }]
              : []),
            {
              name: `Inspection ${inspectionId}`,
              path: `/scale-sites/${encodeURIComponent(scaleSiteIdNmbr ?? '')}/inspections/view/${encodeURIComponent(inspectionId)}`,
            },
            { name: "Edit" },
          ]}
        />
        <Column lg={16} md={8} sm={4}>
          <div className="scale-site-inspection-edit__content scs__view">
            <EmptySection
              icon="WarningFilled"
              title="Could not load inspection"
              description={
                inspectionQuery.error?.message ??
                "The inspection edit payload could not be retrieved."
              }
              whiteLayer
            />
          </div>
        </Column>
      </Grid>
    );
  }

  if (!inspectionQuery.data || !formValues) {
    return (
      <Grid className="scale-site-inspection-edit">
        <PageTitle
          title="Scale Site Inspection - Edit"
          breadCrumbs={[
            { name: "Scale Sites", path: "/scale-sites" },
            ...(scaleSiteIdNmbr
              ? [{
                  name: `Scale Site ${scaleSiteIdNmbr}`,
                  path: `/scale-sites/view/${encodeURIComponent(scaleSiteIdNmbr)}?tab=inspections`,
                }]
              : []),
            {
              name: `Inspection ${inspectionId}`,
              path: `/scale-sites/${encodeURIComponent(scaleSiteIdNmbr ?? '')}/inspections/view/${encodeURIComponent(inspectionId)}`,
            },
            { name: "Edit" },
          ]}
        />
        <Column lg={16} md={8} sm={4}>
          <div className="scale-site-inspection-edit__content scs__view">
            <EmptySection
              icon="WarningFilled"
              title="Could not load inspection"
              description="The inspection edit payload could not be retrieved."
              whiteLayer
            />
          </div>
        </Column>
      </Grid>
    );
  }

  return (
    <Grid className="scale-site-inspection-edit">
      <PageTitle
        title={`Site Inspection${inspectionTypeName ? ` - ${inspectionTypeName}` : ""}`}
        breadCrumbs={[
          { name: "Scale Sites", path: "/scale-sites" },
          ...(scaleSiteIdNmbr
            ? [{
                name: `Scale Site ${scaleSiteIdNmbr}`,
                path: `/scale-sites/view/${encodeURIComponent(scaleSiteIdNmbr)}?tab=inspections`,
              }]
            : []),
          {
            name: `Inspection ${inspectionId}`,
            path: `/scale-sites/${encodeURIComponent(scaleSiteIdNmbr ?? '')}/inspections/view/${encodeURIComponent(inspectionId)}`,
          },
          { name: "Edit" },
        ]}
      />
      <Column lg={16} md={8} sm={4}>
        <Form
          className="scale-site-inspection-edit__content scs__form"
          onSubmit={handleSubmit}
        >
          {bannerMessage ? (
            <InlineNotification
              kind="error"
              lowContrast
              title={
                bannerMode === "api"
                  ? "Inspection update failed"
                  : "Please fix the highlighted fields"
              }
              subtitle={bannerMessage}
              className="scale-site-inspection-edit__notification"
            />
          ) : null}

          <ScaleSiteInspectionDetails
            mode="edit"
            displayValues={{
              scaleSiteIdNmbr: inspectionQuery.data.scaleSiteIdNmbr,
              siteName: inspectionQuery.data.siteName,
              siteLocation: inspectionQuery.data.siteLocation,
              siteOwnerName: inspectionQuery.data.siteOwnerName,
              inspectionTypeDescription:
                inspectionQuery.data.inspectionTypeDescription,
              siteTypeDisplay: inspectionQuery.data.siteTypeDisplay,
              previousInspectionId: inspectionQuery.data.previousInspectionId,
              recipient: inspectionQuery.data.recipient,
              inspectionId: inspectionQuery.data.inspectionId,
            }}
            formValues={{
              recipient: "",
              siteOperatorPresentInd: formValues.siteOperatorPresentInd,
              inspector: formValues.inspector,
              inspectionDate: formValues.inspectionDate,
              comments: formValues.comments,
            }}
            errors={{
              siteOperatorPresentInd: formErrors.siteOperatorPresentInd,
              inspector: formErrors.inspector,
              inspectionDate: formErrors.inspectionDate,
              comments: formErrors.comments,
            }}
            disabled={isSubmitting}
            requiredIndicatorClassName="scale-site-inspection-edit__required"
            onFieldChange={handleRootFieldChange}
          />

          <div className="scs__form__divider" />

          <ScaleSiteInspectionQuestions
            mode="edit"
            questions={formValues.questionResponses}
            errors={formErrors.questionResponses}
            disabled={isSubmitting}
            requiredIndicatorClassName="scale-site-inspection-edit__required"
            emptyStateDescription="This inspection does not have any editable question responses."
            onFieldChange={handleQuestionFieldChange}
          />

          <div className="scale-site-inspection-edit__actions form-actions">
            <Button
              kind="secondary"
              type="button"
              onClick={() => navigate(inspectionDetailPath)}
              disabled={isSubmitting}
            >
              Back
            </Button>
            <Button
              kind="secondary"
              type="button"
              renderIcon={ResetIcon}
              onClick={handleReset}
              disabled={isSubmitting || !initialValues}
            >
              Reset
            </Button>
            <Button
              kind="primary"
              type="button"
              renderIcon={SaveIcon}
              onClick={submitForm}
              disabled={
                isSubmitting || formValues.questionResponses.length === 0
              }
            >
              Save Record
            </Button>
          </div>
        </Form>
      </Column>
    </Grid>
  );
};

export default ScaleSiteInspectionEditPage;

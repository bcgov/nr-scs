import { Reset as ResetIcon, Save as SaveIcon } from "@carbon/icons-react";
import {
  Checkbox,
  Column,
  Form,
  Grid,
  InlineNotification,
  Select,
  SelectItem,
  SkeletonText,
} from "@carbon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
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
import type { ScaleMethodTypeLov, StaticLov } from "@/services/lov.service";
import type {
  ScaleSiteInspectionAnswerOption,
  ScaleSiteInspectionCreateInitView,
  ScaleSiteInspectionCreateRequest,
  ScaleSiteInspectionEditQuestionResponse,
  ScaleSiteInspectionRecipientOption,
} from "@/services/scaleSiteInspections.service";
import { isFutureDateOnly } from "@/utils/dateOnly";
import { extractApiError } from "@/utils/extractApiError";
import { isInspectorGuid } from "@/utils/inspectorGuid";
import { requiredLabel } from "@/utils/requiredLabel";
import { scrollToError } from "@/utils/scrollToError";

import "../../Edit/ScaleSiteInspection/index.scss";
import "./index.scss";

type YesNoValue = "" | "Y" | "N";

type DisplayFieldValue = string | number | null | undefined;

type InspectionTypeOption = {
  code: string;
  description: string;
};

type SiteTypeOption = {
  code: string;
  description: string;
};

type StageOneValues = {
  inspectionTypeCode: string;
  siteTypeCodes: string[];
};

type StageOneErrors = {
  inspectionTypeCode?: string;
  siteTypeCodes?: string;
};

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
  previousInspectionId: string;
  recipient: string;
  siteOperatorPresentInd: YesNoValue;
  inspector: string;
  inspectionDate: string;
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
  previousInspectionId?: string;
  siteOperatorPresentInd?: string;
  inspector?: string;
  inspectionDate?: string;
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

const INSPECTION_TYPE_TABLE_KEY = "SCALE_SITE_INSPCTN_TYPE_CODE";
const AUTOMATED_INSPECTION_TYPE_CODE = "AUT";
const WEIGHT_SCALE_METHOD_CODE = "W";

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

const trimToNull = (value: string): string | null => {
  const normalized = value.trim();
  return normalized || null;
};

const toInspectionTypeOptions = (
  lovs: StaticLov[] | undefined,
): InspectionTypeOption[] => {
  return (lovs ?? [])
    .map((lov) => ({
      code: textValue(lov.code),
      description: textValue(lov.description) || textValue(lov.code),
    }))
    .filter((lov) => lov.code.length > 0);
};

const toSiteTypeOptions = (
  lovs: ScaleMethodTypeLov[] | undefined,
): SiteTypeOption[] => {
  return (lovs ?? [])
    .map((lov) => ({
      code: textValue(lov.code),
      description: textValue(lov.description) || textValue(lov.code),
    }))
    .filter((lov) => lov.code.length > 0);
};

const toRecipientOptions = (
  options: ScaleSiteInspectionRecipientOption[] | undefined,
): ScaleSiteInspectionRecipientOption[] => {
  return (options ?? [])
    .map((option) => ({
      value: textValue(option.value),
      label: textValue(option.label),
    }))
    .filter((option) => option.value.length > 0);
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

const toFormQuestionResponse = (
  question: ScaleSiteInspectionEditQuestionResponse,
): ScaleSiteInspectionFormQuestionResponse => {
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
};

const toFormValues = (
  payload: ScaleSiteInspectionCreateInitView,
): ScaleSiteInspectionFormValues => ({
  previousInspectionId: textValue(payload.previousInspectionId),
  recipient: textValue(payload.recipient),
  siteOperatorPresentInd: toYesNoValue(payload.siteOperatorPresentInd),
  inspector: textValue(payload.inspector),
  inspectionDate: textValue(payload.inspectionDate),
  comments: textValue(payload.comments),
  questionResponses: (payload.questionResponses ?? []).map(
    toFormQuestionResponse,
  ),
});

const buildCreateRequest = (
  stageOneValues: StageOneValues,
  values: ScaleSiteInspectionFormValues,
): ScaleSiteInspectionCreateRequest => ({
  inspectionTypeCode: stageOneValues.inspectionTypeCode,
  siteTypeCodes: stageOneValues.siteTypeCodes,
  inspectionDate: values.inspectionDate,
  inspector: values.inspector.trim(),
  previousInspectionId: values.previousInspectionId.trim()
    ? Number(values.previousInspectionId.trim())
    : null,
  recipient: trimToNull(values.recipient),
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

const validateStageOneValues = (values: StageOneValues): StageOneErrors => {
  const errors: StageOneErrors = {};

  if (!values.inspectionTypeCode.trim()) {
    errors.inspectionTypeCode = "Inspection Type is required.";
  }

  if (values.siteTypeCodes.length === 0) {
    errors.siteTypeCodes = "Site Type is required.";
  }

  if (
    values.inspectionTypeCode === AUTOMATED_INSPECTION_TYPE_CODE &&
    (values.siteTypeCodes.length !== 1 ||
      values.siteTypeCodes[0] !== WEIGHT_SCALE_METHOD_CODE)
  ) {
    errors.siteTypeCodes =
      "Automated inspections must use Weight Scale as the site type.";
  }

  return errors;
};

const validateFormValues = (
  values: ScaleSiteInspectionFormValues,
): ScaleSiteInspectionFormErrors => {
  const errors: ScaleSiteInspectionFormErrors = {};

  if (values.previousInspectionId.trim()) {
    const parsedValue = Number(values.previousInspectionId.trim());
    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
      errors.previousInspectionId =
        "Follow-up to Inspection # must be a positive whole number.";
    }
  }

  if (!isYesNoValue(values.siteOperatorPresentInd)) {
    errors.siteOperatorPresentInd =
      "Site Operator present during Inspection is required.";
  }

  // The inspector is the euser GUID of who performed the inspection (defaulted to the current user).
  // The backend requires a valid GUID; validate the same here so a cleared/edited field is caught inline.
  if (!values.inspector.trim()) {
    errors.inspector = "Inspector # is required.";
  } else if (!isInspectorGuid(values.inspector)) {
    errors.inspector = "Inspector must be a valid user GUID.";
  }

  if (!values.inspectionDate.trim()) {
    errors.inspectionDate = "Inspection Date is required.";
  } else if (isFutureDateOnly(values.inspectionDate.trim())) {
    errors.inspectionDate = "Inspection Date cannot be in the future.";
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
    errors.previousInspectionId ||
    errors.siteOperatorPresentInd ||
    errors.inspector ||
    errors.inspectionDate ||
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
    errors.previousInspectionId ||
    errors.siteOperatorPresentInd ||
    errors.inspector ||
    errors.inspectionDate ||
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
  if (errors.previousInspectionId) {
    return "previous-inspection-id";
  }

  if (errors.siteOperatorPresentInd) {
    return "site-operator-present";
  }

  if (errors.inspector) {
    return "inspector";
  }

  if (errors.inspectionDate) {
    return "inspection-date";
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

const buildReturnToScaleSitePath = (scaleSiteIdNmbr: string): string => {
  return `/scale-sites/view/${encodeURIComponent(scaleSiteIdNmbr)}?tab=inspections`;
};

const ScaleSiteInspectionCreatePage = () => {
  const { scaleSiteIdNmbr } = useParams<{ scaleSiteIdNmbr: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userToken } = useAuth();

  const normalizedScaleSiteIdNmbr = scaleSiteIdNmbr?.trim() ?? "";
  const hasValidScaleSiteId = normalizedScaleSiteIdNmbr.length > 0;
  const returnToScaleSitePath = buildReturnToScaleSitePath(
    normalizedScaleSiteIdNmbr,
  );

  const [stageOneValues, setStageOneValues] = useState<StageOneValues>({
    inspectionTypeCode: "",
    siteTypeCodes: [],
  });
  const [stageOneErrors, setStageOneErrors] = useState<StageOneErrors>({});
  const [submittedStageOneValues, setSubmittedStageOneValues] =
    useState<StageOneValues | null>(null);
  const [formValues, setFormValues] =
    useState<ScaleSiteInspectionFormValues | null>(null);
  const [initialValues, setInitialValues] =
    useState<ScaleSiteInspectionFormValues | null>(null);
  const [formErrors, setFormErrors] = useState<ScaleSiteInspectionFormErrors>(
    {},
  );
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [bannerMode, setBannerMode] = useState<BannerMode | null>(null);

  const clearCreateInitCache = () => {
    queryClient.removeQueries({
      queryKey: [
        "scale-site-inspection-create-init",
        normalizedScaleSiteIdNmbr,
      ],
    });
  };

  const inspectionTypesQuery = useQuery<StaticLov[], Error>({
    queryKey: ["inspection-create-inspection-types"],
    queryFn: async () => {
      const token = await userToken();
      return API.lov.getStaticLov(
        { tableKey: INSPECTION_TYPE_TABLE_KEY },
        token,
      );
    },
    enabled: hasValidScaleSiteId,
    refetchOnWindowFocus: false,
  });

  const siteTypesQuery = useQuery<ScaleMethodTypeLov[], Error>({
    queryKey: ["inspection-create-site-types"],
    queryFn: async () => {
      const token = await userToken();
      return API.lov.getScaleMethodTypeLov(undefined, token);
    },
    enabled: hasValidScaleSiteId,
    refetchOnWindowFocus: false,
  });

  const createInitQuery = useQuery<ScaleSiteInspectionCreateInitView, Error>({
    queryKey: [
      "scale-site-inspection-create-init",
      normalizedScaleSiteIdNmbr,
      submittedStageOneValues?.inspectionTypeCode ?? "",
      submittedStageOneValues?.siteTypeCodes.join("|") ?? "",
    ],
    queryFn: async () => {
      if (!submittedStageOneValues) {
        throw new Error("Inspection create options are not ready.");
      }

      const token = await userToken();
      return API.scaleSiteInspections.getScaleSiteInspectionCreateInit(
        normalizedScaleSiteIdNmbr,
        submittedStageOneValues.inspectionTypeCode,
        submittedStageOneValues.siteTypeCodes,
        token,
      );
    },
    enabled: hasValidScaleSiteId && submittedStageOneValues !== null,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const inspectionTypeOptions = useMemo(
    () => toInspectionTypeOptions(inspectionTypesQuery.data),
    [inspectionTypesQuery.data],
  );
  const siteTypeOptions = useMemo(
    () => toSiteTypeOptions(siteTypesQuery.data),
    [siteTypesQuery.data],
  );
  const recipientOptions = useMemo(
    () => toRecipientOptions(createInitQuery.data?.recipientOptions),
    [createInitQuery.data?.recipientOptions],
  );
  const isAutomatedInspection =
    stageOneValues.inspectionTypeCode === AUTOMATED_INSPECTION_TYPE_CODE;

  useEffect(() => {
    if (!createInitQuery.data) {
      return;
    }

    const nextFormValues = toFormValues(createInitQuery.data);
    setInitialValues(nextFormValues);
    setFormValues(cloneFormValues(nextFormValues));
    setFormErrors({});
    setBannerMessage(null);
    setBannerMode(null);
  }, [createInitQuery.data]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!formValues || !submittedStageOneValues) {
        throw new Error("Inspection create form is not ready.");
      }

      const token = await userToken();
      return API.scaleSiteInspections.createScaleSiteInspection(
        normalizedScaleSiteIdNmbr,
        buildCreateRequest(submittedStageOneValues, formValues),
        token,
      );
    },
    onSuccess: async (detail) => {
      const inspectionId = detail.inspectionId;
      queryClient.setQueryData(
        ["scale-site-inspection-detail", inspectionId],
        detail,
      );
      queryClient.removeQueries({
        queryKey: ["scale-site-inspections", normalizedScaleSiteIdNmbr],
      });

      if (inspectionId == null) {
        setBannerMode("api");
        setBannerMessage(
          "Inspection was created but no inspection id was returned.",
        );
        return;
      }

      navigate(
        `/scale-sites/${encodeURIComponent(normalizedScaleSiteIdNmbr)}/inspections/view/${encodeURIComponent(String(inspectionId))}`,
      );
    },
    onError: (error: unknown) => {
      // Field-scoped validation errors (a non-existent "Follow-up to Inspection #", or a future
      // Inspection Date) come back as structured fieldErrors — surface them inline on the field
      // rather than as a generic banner the user gets scrolled away from.
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
          : extractApiError(error, "Could not create inspection."),
      );
    },
  });

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

  const resetStageTwoState = () => {
    setSubmittedStageOneValues(null);
    setFormValues(null);
    setInitialValues(null);
    setFormErrors({});
    setBannerMessage(null);
    setBannerMode(null);
  };

  const handleInspectionTypeChange = (value: string) => {
    setStageOneValues((previous) => ({
      ...previous,
      inspectionTypeCode: value,
      siteTypeCodes:
        value === AUTOMATED_INSPECTION_TYPE_CODE
          ? [WEIGHT_SCALE_METHOD_CODE]
          : previous.siteTypeCodes,
    }));
    setStageOneErrors((previous) => ({
      ...previous,
      inspectionTypeCode: undefined,
      siteTypeCodes:
        value === AUTOMATED_INSPECTION_TYPE_CODE
          ? undefined
          : previous.siteTypeCodes,
    }));
    resetStageTwoState();
    clearCreateInitCache();
  };

  const handleSiteTypesChange = (code: string, checked: boolean) => {
    setStageOneValues((previous) => ({
      ...previous,
      siteTypeCodes: isAutomatedInspection
        ? [WEIGHT_SCALE_METHOD_CODE]
        : siteTypeOptions
            .map((option) => option.code)
            .filter((optionCode) => {
              if (optionCode === code) {
                return checked;
              }

              return previous.siteTypeCodes.includes(optionCode);
            }),
    }));
    setStageOneErrors((previous) => ({
      ...previous,
      siteTypeCodes: undefined,
    }));
    resetStageTwoState();
    clearCreateInitCache();
  };

  const handleRootFieldChange = (
    field: keyof Omit<ScaleSiteInspectionFormValues, "questionResponses">,
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

  const handleStageOneNext = () => {
    const nextErrors = validateStageOneValues(stageOneValues);
    setStageOneErrors(nextErrors);

    if (nextErrors.inspectionTypeCode || nextErrors.siteTypeCodes) {
      return;
    }

    setSubmittedStageOneValues({
      inspectionTypeCode: stageOneValues.inspectionTypeCode,
      siteTypeCodes: [...stageOneValues.siteTypeCodes],
    });
    setBannerMessage(null);
    setBannerMode(null);
  };

  const handleStageTwoBack = () => {
    resetStageTwoState();
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
    createMutation.mutate();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitForm();
  };

  const inspectionTypeName = textValue(
    createInitQuery.data?.inspectionTypeDescription,
  );
  const isOptionsLoading =
    inspectionTypesQuery.isPending || siteTypesQuery.isPending;
  const isOptionsError = inspectionTypesQuery.isError || siteTypesQuery.isError;
  const isInitializingStageTwo =
    createInitQuery.fetchStatus === "fetching" && !formValues;
  const isStageTwoLoaded = Boolean(createInitQuery.data && formValues);
  const isSubmitting = createMutation.isPending;

  if (!hasValidScaleSiteId) {
    return (
      <Grid className="scale-site-inspection-edit scale-site-inspection-create">
        <PageTitle
          title="Site Inspection - Create"
          breadCrumbs={[
            { name: "Scale Sites", path: "/scale-sites" },
            { name: "Inspection Create" },
          ]}
        />
        <Column lg={16} md={8} sm={4}>
          <div className="scale-site-inspection-edit__content scs__view">
            <EmptySection
              icon="WarningFilled"
              title="Inspection create not available"
              description="A valid scale site number was not provided in the route."
              whiteLayer
            />
          </div>
        </Column>
      </Grid>
    );
  }

  if (isOptionsLoading) {
    return (
      <Grid className="scale-site-inspection-edit scale-site-inspection-create">
        <PageTitle
          title="Site Inspection - Create"
          breadCrumbs={[
            { name: "Scale Sites", path: "/scale-sites" },
            {
              name: `Scale Site ${normalizedScaleSiteIdNmbr}`,
              path: returnToScaleSitePath,
            },
            { name: "Inspection Create" },
          ]}
        />
        <Column lg={16} md={8} sm={4}>
          <div className="scale-site-inspection-edit__content scs__view">
            <div className="scale-site-inspection-edit__panel">
              <SkeletonText paragraph lineCount={10} />
            </div>
          </div>
        </Column>
      </Grid>
    );
  }

  if (isOptionsError) {
    return (
      <Grid className="scale-site-inspection-edit scale-site-inspection-create">
        <PageTitle
          title="Site Inspection - Create"
          breadCrumbs={[
            { name: "Scale Sites", path: "/scale-sites" },
            {
              name: `Scale Site ${normalizedScaleSiteIdNmbr}`,
              path: returnToScaleSitePath,
            },
            { name: "Inspection Create" },
          ]}
        />
        <Column lg={16} md={8} sm={4}>
          <div className="scale-site-inspection-edit__content scs__view">
            <EmptySection
              icon="WarningFilled"
              title="Could not load create options"
              description={
                inspectionTypesQuery.error?.message ??
                siteTypesQuery.error?.message ??
                "The inspection create options could not be retrieved."
              }
              whiteLayer
            />
          </div>
        </Column>
      </Grid>
    );
  }

  return (
    <Grid className="scale-site-inspection-edit scale-site-inspection-create">
      <PageTitle
        title={`Site Inspection - Create${inspectionTypeName ? ` - ${inspectionTypeName}` : ""}`}
        breadCrumbs={[
          { name: "Scale Sites", path: "/scale-sites" },
          {
            name: `Scale Site ${normalizedScaleSiteIdNmbr}`,
            path: returnToScaleSitePath,
          },
          { name: "Inspection Create" },
        ]}
      />
      <Column lg={16} md={8} sm={4}>
        {!isStageTwoLoaded ? (
          <Form
            className="scale-site-inspection-edit__content scs__form"
            onSubmit={(event) => event.preventDefault()}
          >
            {createInitQuery.isError ? (
              <InlineNotification
                kind="error"
                lowContrast
                title="Could not load inspection create form"
                subtitle={extractApiError(
                  createInitQuery.error,
                  "The inspection create form could not be loaded.",
                )}
                className="scale-site-inspection-edit__notification"
              />
            ) : null}

            <h4 className="scs__form__section-title">
              Choose your inspection parameters
            </h4>
            <Grid className="scs__form__grid">
              <Column lg={8} md={8} sm={4}>
                <Select
                  id="inspection-type-code"
                  labelText={requiredLabel(
                    "Inspection Type",
                    "scale-site-inspection-edit__required",
                  )}
                  value={stageOneValues.inspectionTypeCode}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                    handleInspectionTypeChange(event.target.value)
                  }
                  invalid={Boolean(stageOneErrors.inspectionTypeCode)}
                  invalidText={stageOneErrors.inspectionTypeCode}
                  disabled={isInitializingStageTwo}
                >
                  <SelectItem value="" text="Select" />
                  {inspectionTypeOptions.map((option) => (
                    <SelectItem
                      key={option.code}
                      value={option.code}
                      text={option.description}
                    />
                  ))}
                </Select>
              </Column>

              <Column
                lg={8}
                md={8}
                sm={4}
                className="scale-site-inspection-create__stage-one-site-type"
              >
                <fieldset
                  className="scale-site-inspection-create__stage-one-fieldset"
                  aria-invalid={Boolean(stageOneErrors.siteTypeCodes)}
                  aria-describedby={
                    stageOneErrors.siteTypeCodes
                      ? "site-type-codes-error"
                      : undefined
                  }
                >
                  <legend className="scale-site-inspection-create__stage-one-legend">
                    {requiredLabel(
                      "Site Type",
                      "scale-site-inspection-edit__required",
                    )}
                  </legend>

                  <div className="scale-site-inspection-create__stage-one-checkbox-group">
                    {siteTypeOptions.map((option) => (
                      <Checkbox
                        key={option.code}
                        id={`site-type-code-${option.code}`}
                        labelText={option.description}
                        checked={stageOneValues.siteTypeCodes.includes(
                          option.code,
                        )}
                        onChange={(_, data) =>
                          handleSiteTypesChange(option.code, data.checked)
                        }
                        disabled={
                          isInitializingStageTwo || isAutomatedInspection
                        }
                      />
                    ))}
                  </div>

                  {stageOneErrors.siteTypeCodes ? (
                    <p
                      id="site-type-codes-error"
                      className="scale-site-inspection-create__stage-one-error cds--form-requirement"
                    >
                      {stageOneErrors.siteTypeCodes}
                    </p>
                  ) : null}

                  {isAutomatedInspection ? (
                    <p className="scale-site-inspection-create__stage-one-helper">
                      Automated inspections require Weight Scale and this
                      selection has been applied automatically.
                    </p>
                  ) : null}
                </fieldset>
              </Column>
            </Grid>

            {isInitializingStageTwo ? (
              <section className="scale-site-inspection-create__stage-one-skeleton">
                <SkeletonText paragraph lineCount={8} />
              </section>
            ) : null}

            <div className="scs__form__divider scs__form__divider--actions" />

            <div className="form-actions">
              <Button
                kind="secondary"
                type="button"
                onClick={() => navigate(returnToScaleSitePath)}
                disabled={isInitializingStageTwo}
              >
                Back
              </Button>
              <Button
                kind="primary"
                type="button"
                onClick={handleStageOneNext}
                disabled={isInitializingStageTwo}
              >
                Next
              </Button>
            </div>
          </Form>
        ) : (
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
                    ? "Inspection create failed"
                    : "Please fix the highlighted fields"
                }
                subtitle={bannerMessage}
                className="scale-site-inspection-edit__notification"
              />
            ) : null}

            <ScaleSiteInspectionDetails
              mode="create"
              displayValues={{
                scaleSiteIdNmbr:
                  createInitQuery.data?.scaleSiteIdNmbr ??
                  normalizedScaleSiteIdNmbr,
                siteName: createInitQuery.data?.siteName,
                siteLocation: createInitQuery.data?.siteLocation,
                siteOwnerName: createInitQuery.data?.siteOwnerName,
                inspectionTypeDescription:
                  createInitQuery.data?.inspectionTypeDescription,
                siteTypeDisplay: createInitQuery.data?.siteTypeDisplay,
                inspectionId: "",
              }}
              formValues={{
                previousInspectionId: formValues.previousInspectionId,
                recipient: formValues.recipient,
                siteOperatorPresentInd: formValues.siteOperatorPresentInd,
                inspector: formValues.inspector,
                inspectionDate: formValues.inspectionDate,
                comments: formValues.comments,
              }}
              errors={{
                previousInspectionId: formErrors.previousInspectionId,
                siteOperatorPresentInd: formErrors.siteOperatorPresentInd,
                inspector: formErrors.inspector,
                inspectionDate: formErrors.inspectionDate,
                comments: formErrors.comments,
              }}
              recipientOptions={recipientOptions}
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
              emptyStateDescription="This inspection context does not require any question responses before save."
              onFieldChange={handleQuestionFieldChange}
            />

            <div className="scale-site-inspection-edit__actions form-actions">
              <Button
                kind="secondary"
                type="button"
                onClick={handleStageTwoBack}
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
                disabled={isSubmitting}
              >
                Save Record
              </Button>
            </div>
          </Form>
        )}
      </Column>
    </Grid>
  );
};

export default ScaleSiteInspectionCreatePage;

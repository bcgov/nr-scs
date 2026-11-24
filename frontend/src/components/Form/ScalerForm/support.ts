import { useCallback, useMemo } from 'react';

import { useAuth } from '@/context/auth/useAuth';
import { useLovOptions } from '@/hooks/useLovOptions';
import API from '@/services/APIs';
import type { GradingCodeAppointmentTypeLov, ScalerTrainingTypeLov } from '@/services/lov.service';
import { extractApiError } from '@/utils/extractApiError';
import { GRADING_CODE_APPOINTMENT_TYPE_LOV, SCALER_TRAINING_TYPE_LOV } from '@/utils/lovCache';

import type { ScalerAppointmentOption, ScalerTrainingOption } from './logic';

export interface ServerFieldError {
  field?: string | null;
  message?: string | null;
}

const SERVER_FIELD_TO_FORM: Record<string, string> = {
  clientNumber: 'client',
  orgUnitNo: 'district',
  issuedDate: 'effectiveDate',
  expiryDate: 'expiryDate',
  oathTakenInd: 'oathTaken',
};

/** Form keys that have a visible error slot in edit mode (client/loc render read-only there). */
export const EDIT_VISIBLE_FIELD_KEYS: ReadonlySet<string> = new Set([
  'district',
  'effectiveDate',
  'expiryDate',
  'oathTaken',
  'licenceTypes',
  'appointment',
  'provinceWide',
  'appointmentEffectiveDate',
  'appointmentExpiryDate',
  'examUpgrade',
  'completedBy',
]);

/**
 * Resolves a failed save into form state: server `fieldErrors` map onto form keys, messages for
 * keys without a visible slot (per `visibleKeys`) join the banner, and anything else falls back
 * to the extracted API error message.
 */
export const resolveServerErrors = (
  error: unknown,
  fallbackMessage: string,
  visibleKeys?: ReadonlySet<string>,
): { fieldErrors: Record<string, string>; formError: string | null } => {
  const serverFieldErrors =
    (error as { response?: { data?: { fieldErrors?: ServerFieldError[] } } })
      ?.response?.data?.fieldErrors ?? null;

  const fieldErrors: Record<string, string> = {};
  const bannerParts: string[] = [];
  (serverFieldErrors ?? []).forEach((fe) => {
    const message = fe.message ?? '';
    const formKey = fe.field ? SERVER_FIELD_TO_FORM[fe.field] : undefined;
    if (formKey && (!visibleKeys || visibleKeys.has(formKey))) {
      fieldErrors[formKey] = message;
    } else if (message) {
      bannerParts.push(message);
    }
  });

  if (Object.keys(fieldErrors).length === 0 && bannerParts.length === 0) {
    return { fieldErrors: {}, formError: extractApiError(error, fallbackMessage) };
  }
  return { fieldErrors, formError: bannerParts.length > 0 ? bannerParts.join(' ') : null };
};

/** The appointment + exam/upgrade LOV options shared by the create page and the edit modal. */
export const useScalerFormLovOptions = () => {
  const { userToken } = useAuth();

  const loadAppointmentTypes = useCallback(async () => {
    const token = await userToken();
    return API.lov.getGradingCodeAppointmentTypeLov(token);
  }, [userToken]);

  const loadTrainingTypes = useCallback(async () => {
    const token = await userToken();
    return API.lov.getScalerTrainingTypeLov(token);
  }, [userToken]);

  const { data: appointmentTypes, error: appointmentTypesError } = useLovOptions<GradingCodeAppointmentTypeLov>(loadAppointmentTypes, {
    errorMessage: 'Could not load appointment types.',
    cacheKey: GRADING_CODE_APPOINTMENT_TYPE_LOV,
  });
  const { data: trainingTypes, error: trainingTypesError } = useLovOptions<ScalerTrainingTypeLov>(loadTrainingTypes, {
    errorMessage: 'Could not load exam / upgrade types.',
    cacheKey: SCALER_TRAINING_TYPE_LOV,
  });

  const appointmentOptions: ScalerAppointmentOption[] = useMemo(
    () =>
      appointmentTypes
        .filter((item) => item.code && item.description)
        .map((item) => ({
          value: String(item.code),
          text: String(item.description),
          scalerAppointmentType: item.scalerAppointmentType ?? '',
          scaleGradingSystemCode: item.scaleGradingSystemCode ?? '',
        })),
    [appointmentTypes],
  );

  const trainingOptions: ScalerTrainingOption[] = useMemo(
    () =>
      trainingTypes
        .filter((item) => item.code && item.description)
        .map((item) => ({
          value: String(item.code),
          text: String(item.description),
        })),
    [trainingTypes],
  );

  return { appointmentOptions, trainingOptions, appointmentTypesError, trainingTypesError };
};

import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./APIs', () => ({ BackendApiConfig: { BASE: '/api' } }));
vi.mock('axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { AppointmentTypesService } from './appointmentTypes.service';
import { AuthorizationClausesService } from './authorizationClauses.service';
import { ConditionsService } from './conditions.service';
import { ExamUpgradesService } from './examUpgrades.service';
import { InspectionQuestionsService } from './inspectionQuestions.service';
import { ScaleAuthTemplatesService } from './scaleAuthTemplates.service';
import { ScalerAppointmentsService } from './scalerAppointments.service';
import { ScalerExamsService } from './scalerExams.service';
import { ScalerPerformanceRemarksService } from './scalerPerformanceRemarks.service';
import { ValidLicenceAttributesService } from './validLicenceAttributes.service';

const axiosGet = vi.mocked(axios.get);
const axiosPost = vi.mocked(axios.post);
const axiosPut = vi.mocked(axios.put);
const axiosDelete = vi.mocked(axios.delete);

beforeEach(() => {
  axiosGet.mockReset().mockResolvedValue({ data: [] });
  axiosPost.mockReset().mockResolvedValue({ data: {} });
  axiosPut.mockReset().mockResolvedValue({ data: {} });
  axiosDelete.mockReset().mockResolvedValue({ status: 204 });
});

describe('ConditionsService', () => {
  const service = new ConditionsService();

  it('searches the collection with the params object', async () => {
    const params = { scaleConditionClassCode: 'SA' } as never;

    await service.searchConditions(params);

    expect(axiosGet).toHaveBeenCalledWith('/api/conditions', expect.objectContaining({ params }));
  });

  it('addresses a single condition by class code and id', async () => {
    axiosGet.mockResolvedValue({ data: {} });

    await service.getCondition('SA', 12);

    expect(axiosGet).toHaveBeenCalledWith('/api/conditions/SA/12', expect.anything());
  });

  it('escapes a class code that needs it', async () => {
    axiosGet.mockResolvedValue({ data: {} });

    await service.getCondition('S A/B', 12);

    expect(axiosGet).toHaveBeenCalledWith('/api/conditions/S%20A%2FB/12', expect.anything());
  });

  it('creates at the collection URL', async () => {
    const payload = { scaleAuthConditionTitle: 'No night hauling' } as never;

    await service.createCondition(payload);

    expect(axiosPost).toHaveBeenCalledWith('/api/conditions', payload, expect.anything());
  });

  it('updates at the id-scoped URL', async () => {
    await service.updateCondition('SA', 12, {} as never);

    expect(axiosPut).toHaveBeenCalledWith('/api/conditions/SA/12', {}, expect.anything());
  });

  it('lets a failure bubble up', async () => {
    axiosGet.mockRejectedValue(new Error('Conditions unavailable.'));

    await expect(service.searchConditions()).rejects.toThrow('Conditions unavailable.');
  });
});

describe('ExamUpgradesService', () => {
  const service = new ExamUpgradesService();

  it('lists at the collection URL', async () => {
    await service.listExamUpgrades();

    expect(axiosGet).toHaveBeenCalledWith('/api/exam-upgrades', expect.anything());
  });

  it('addresses one entry by class code and type id', async () => {
    axiosGet.mockResolvedValue({ data: {} });

    await service.getExamUpgrade('SC', 'EXAM');

    expect(axiosGet).toHaveBeenCalledWith('/api/exam-upgrades/SC/EXAM', expect.anything());
  });

  it('creates and updates at the expected URLs', async () => {
    await service.createExamUpgrade({} as never);
    await service.updateExamUpgrade('SC', 'EXAM', {} as never);

    expect(axiosPost).toHaveBeenCalledWith('/api/exam-upgrades', {}, expect.anything());
    expect(axiosPut).toHaveBeenCalledWith('/api/exam-upgrades/SC/EXAM', {}, expect.anything());
  });
});

describe('AppointmentTypesService', () => {
  const service = new AppointmentTypesService();

  it('searches, creates, updates and deletes at the expected URLs', async () => {
    await service.searchAppointmentTypes();
    await service.createAppointmentType({} as never);
    await service.updateAppointmentType('PERM', {} as never);
    await service.deleteAppointmentType('PERM');

    expect(axiosGet).toHaveBeenCalledWith('/api/appointment-types', expect.anything());
    expect(axiosPost).toHaveBeenCalledWith('/api/appointment-types', {}, expect.anything());
    expect(axiosPut).toHaveBeenCalledWith(
      '/api/appointment-types/PERM',
      {},
      expect.anything(),
    );
    expect(axiosDelete).toHaveBeenCalledWith('/api/appointment-types/PERM', expect.anything());
  });

  it('lets a failed delete bubble up', async () => {
    axiosDelete.mockRejectedValue(new Error('In use'));

    await expect(service.deleteAppointmentType('PERM')).rejects.toThrow('In use');
  });
});

describe('ScalerExamsService', () => {
  const service = new ScalerExamsService();

  it('scopes every call to the scaler licence', async () => {
    await service.getScalerExams('S1234');
    await service.createScalerExam('S1234', {} as never);
    await service.updateScalerExam('S1234', 'T1', {} as never);
    await service.deleteScalerExam('S1234', 'T1');

    expect(axiosGet).toHaveBeenCalledWith('/api/scalers/S1234/exams', expect.anything());
    expect(axiosPost).toHaveBeenCalledWith('/api/scalers/S1234/exams', {}, expect.anything());
    expect(axiosPut).toHaveBeenCalledWith('/api/scalers/S1234/exams/T1', {}, expect.anything());
    expect(axiosDelete).toHaveBeenCalledWith('/api/scalers/S1234/exams/T1', expect.anything());
  });

  it('escapes a licence number that needs it', async () => {
    await service.getScalerExams('S 1234/A');

    expect(axiosGet).toHaveBeenCalledWith('/api/scalers/S%201234%2FA/exams', expect.anything());
  });
});

describe('the remaining maintenance services', () => {
  it.each([
    ['AuthorizationClausesService', () => new AuthorizationClausesService()],
    ['InspectionQuestionsService', () => new InspectionQuestionsService()],
    ['ScaleAuthTemplatesService', () => new ScaleAuthTemplatesService()],
    ['ScalerAppointmentsService', () => new ScalerAppointmentsService()],
    ['ScalerPerformanceRemarksService', () => new ScalerPerformanceRemarksService()],
    ['ValidLicenceAttributesService', () => new ValidLicenceAttributesService()],
  ])('%s constructs and exposes its methods', (_name, make) => {
    const service = make() as unknown as Record<string, unknown>;
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(service)).filter(
      (name) => name !== 'constructor',
    );

    expect(methods.length).toBeGreaterThan(0);
    methods.forEach((name) => expect(typeof service[name]).toBe('function'));
  });

  it('sends a bearer header when a token is supplied', async () => {
    await new ConditionsService().searchConditions(undefined, 'tok-123');

    expect(axiosGet).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tok-123' }),
      }),
    );
  });

  it('omits the bearer header when no token is supplied', async () => {
    await new ConditionsService().searchConditions();

    const [, config] = axiosGet.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(config.headers.Authorization).toBeUndefined();
  });
});

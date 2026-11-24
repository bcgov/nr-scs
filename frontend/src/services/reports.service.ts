import axios from 'axios';

import { BackendApiConfig } from './APIs';
import { blobHeaders } from './utils/headers';

import { extractFilename } from './utils/contentDisposition';
export type ScalerRegisterReportRequest = {
  regDist: string;
  licenceStatus: string;
  authStatus: string;
  appointmentType: string;
  fromDate?: string;
  toDate?: string;
  primarySort: number;
  secondarySort: number;
  outputFormat: 'PDF' | 'XLS';
  emailRecipient?: string;
  preview: boolean;
};

export type ScaleSiteRegisterReportRequest = {
  regDist: string;
  scaleType: string;
  scaleSiteNumber?: string;
  siteStatus: string;
  fromDate?: string;
  toDate?: string;
  primarySort: number;
  secondarySort: number;
  outputFormat: 'PDF' | 'XLS';
  emailRecipient?: string;
  preview: boolean;
  authorizedScalersOnly?: boolean;
};

export type MarkSiteDesignationReportRequest = {
  regDist: string;
  markOrSite: string;
  markExemption?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  expiryFrom?: string;
  expiryTo?: string;
  siteMark1?: string;
  siteMark2?: string;
  siteMark3?: string;
  siteMark4?: string;
  siteMark5?: string;
  siteMark6?: string;
  outputFormat: 'PDF' | 'XLS';
  emailRecipient?: string;
  preview: boolean;
};

export type DesignatedMarksExceptionReportRequest = {
  fromDate?: string;
  toDate?: string;
  markRegDist: string;
  siteRegDist: string;
  mark1?: string;
  mark2?: string;
  mark3?: string;
  mark4?: string;
  mark5?: string;
  mark6?: string;
  site1?: string;
  site2?: string;
  site3?: string;
  site4?: string;
  site5?: string;
  site6?: string;
  outputFormat: 'PDF' | 'XLS';
  emailRecipient?: string;
  preview: boolean;
};

export type ScalingAdministrationReportRequest = {
  regDist: string;
  fromDate?: string;
  toDate?: string;
  outputFormat: 'PDF' | 'XLS';
  emailRecipient?: string;
  preview: boolean;
};

export type ScalingExceptionReportRequest = {
  regDist: string;
  fromDate?: string;
  toDate?: string;
  primarySort: number;
  secondarySort: number;
  outputFormat: 'PDF' | 'XLS';
  emailRecipient?: string;
  preview: boolean;
};

export type DistrictCheckScalePerformanceReportRequest = {
  regDist: string;
  fromDate?: string;
  toDate?: string;
  outputFormat: 'PDF' | 'XLS';
  emailRecipient?: string;
  preview: boolean;
};

export type DistrictSiteInspectionPerformanceReportRequest = {
  regDist: string;
  fromDate?: string;
  toDate?: string;
  outputFormat: 'PDF' | 'XLS';
  emailRecipient?: string;
  preview: boolean;
};

export type ScaleSiteComplianceReportRequest = {
  inspectionId: number;
  outputFormat: 'PDF' | 'XLS';
  emailRecipient?: string;
  preview: boolean;
};

export type ReportDownload = {
  blob: Blob;
  filename?: string | null;
};

export class ReportsService {
  async submitScalerRegisterReport(
    payload: ScalerRegisterReportRequest,
    token?: string,
  ): Promise<ReportDownload> {
    const response = await axios.post(`${BackendApiConfig.BASE}/reports/scaler-register`, payload, {
      responseType: 'blob',
      headers: blobHeaders(token),
    });

    return {
      blob: response.data as Blob,
      filename: extractFilename(response.headers?.['content-disposition']),
    };
  }

  async submitScaleSiteRegisterReport(
    payload: ScaleSiteRegisterReportRequest,
    token?: string,
  ): Promise<ReportDownload> {
    const response = await axios.post(`${BackendApiConfig.BASE}/reports/scale-site-register`, payload, {
      responseType: 'blob',
      headers: blobHeaders(token),
    });

    return {
      blob: response.data as Blob,
      filename: extractFilename(response.headers?.['content-disposition']),
    };
  }

  async submitMarkSiteDesignationReport(
    payload: MarkSiteDesignationReportRequest,
    token?: string,
  ): Promise<ReportDownload> {
    const response = await axios.post(`${BackendApiConfig.BASE}/reports/mark-site-designation`, payload, {
      responseType: 'blob',
      headers: blobHeaders(token),
    });

    return {
      blob: response.data as Blob,
      filename: extractFilename(response.headers?.['content-disposition']),
    };
  }

  async submitDesignatedMarksExceptionReport(
    payload: DesignatedMarksExceptionReportRequest,
    token?: string,
  ): Promise<ReportDownload> {
    const response = await axios.post(`${BackendApiConfig.BASE}/reports/designated-marks-exception`, payload, {
      responseType: 'blob',
      headers: blobHeaders(token),
    });

    return {
      blob: response.data as Blob,
      filename: extractFilename(response.headers?.['content-disposition']),
    };
  }

  async submitScalingAdministrationReport(
    payload: ScalingAdministrationReportRequest,
    token?: string,
  ): Promise<ReportDownload> {
    const response = await axios.post(`${BackendApiConfig.BASE}/reports/scaling-administration`, payload, {
      responseType: 'blob',
      headers: blobHeaders(token),
    });

    return {
      blob: response.data as Blob,
      filename: extractFilename(response.headers?.['content-disposition']),
    };
  }

  async submitScalingExceptionReport(
    payload: ScalingExceptionReportRequest,
    token?: string,
  ): Promise<ReportDownload> {
    const response = await axios.post(`${BackendApiConfig.BASE}/reports/scaling-exception`, payload, {
      responseType: 'blob',
      headers: blobHeaders(token),
    });

    return {
      blob: response.data as Blob,
      filename: extractFilename(response.headers?.['content-disposition']),
    };
  }

  async submitDistrictCheckScalePerformanceReport(
    payload: DistrictCheckScalePerformanceReportRequest,
    token?: string,
  ): Promise<ReportDownload> {
    const response = await axios.post(`${BackendApiConfig.BASE}/reports/district-check-scale-performance`, payload, {
      responseType: 'blob',
      headers: blobHeaders(token),
    });

    return {
      blob: response.data as Blob,
      filename: extractFilename(response.headers?.['content-disposition']),
    };
  }

  async submitDistrictSiteInspectionPerformanceReport(
    payload: DistrictSiteInspectionPerformanceReportRequest,
    token?: string,
  ): Promise<ReportDownload> {
    const response = await axios.post(`${BackendApiConfig.BASE}/reports/district-site-inspection-performance`, payload, {
      responseType: 'blob',
      headers: blobHeaders(token),
    });

    return {
      blob: response.data as Blob,
      filename: extractFilename(response.headers?.['content-disposition']),
    };
  }

  async submitScaleSiteComplianceReport(
    payload: ScaleSiteComplianceReportRequest,
    token?: string,
  ): Promise<ReportDownload> {
    const response = await axios.post(`${BackendApiConfig.BASE}/reports/scale-site-compliance`, payload, {
      responseType: 'blob',
      headers: blobHeaders(token),
    });

    return {
      blob: response.data as Blob,
      filename: extractFilename(response.headers?.['content-disposition']),
    };
  }
}

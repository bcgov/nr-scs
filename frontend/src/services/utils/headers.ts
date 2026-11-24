import { activeClientHeader } from '@/context/auth/activeClientHeader';
import { mockClientHeader } from '@/context/auth/mockClientHeader';
import { mockRolesHeader } from '@/context/auth/mockRolesHeader';

/**
 * Standard request headers for the SCS API, shared across service classes.
 * Adds bearer auth only when a token is supplied.
 */
export const jsonHeaders = (token?: string) => ({
  'Content-Type': 'application/json',
  Accept: 'application/json',
  ...(token && { Authorization: `Bearer ${token}` }),
  ...mockRolesHeader(),
  ...mockClientHeader(),
  ...activeClientHeader(),
});

/** Headers for binary downloads (PDF/Excel report and letter responses). */
export const blobHeaders = (token?: string) => ({
  'Content-Type': 'application/json',
  Accept: 'application/pdf, application/vnd.ms-excel, application/json',
  ...(token && { Authorization: `Bearer ${token}` }),
  ...mockRolesHeader(),
  ...mockClientHeader(),
  ...activeClientHeader(),
});

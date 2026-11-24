import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/context/auth/useAuth';
import API from '@/services/APIs';
import type { ScaleSiteContact } from '@/services/scaleSiteContacts.types';

// Shared full-contact fetch used by both the contact view and edit screens. The contacts
// list view omits cell phone / effective / expiry dates, so both screens load the full
// record by client contact id. Keeping the query key and fetch in one place means the two
// screens, plus the cache invalidation in ContactsEdit/ContactsTab, stay in sync.
export function useScaleSiteContactQuery(scaleSiteIdNmbr: string, clientContactId?: number | null) {
  const { userToken } = useAuth();
  return useQuery<ScaleSiteContact>({
    queryKey: ['scale-site-contact', scaleSiteIdNmbr, clientContactId],
    queryFn: async () => {
      const token = await userToken();
      return API.scaleSiteContacts.getScaleSiteContact(scaleSiteIdNmbr, clientContactId!, token);
    },
    enabled: clientContactId != null,
  });
}

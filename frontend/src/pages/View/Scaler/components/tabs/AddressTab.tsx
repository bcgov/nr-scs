import {
  Column,
  Grid,
  InlineNotification,
  SkeletonText,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@carbon/react';
import { useQuery } from '@tanstack/react-query';
import type { FC } from 'react';

import { useAuth } from '@/context/auth/useAuth';
import { asText, formatPhone } from '@/pages/View/Scaler/utils';
import API from '@/services/APIs';
import { extractApiError } from '@/utils/extractApiError';

interface Props {
  isActive: boolean;
  scalerLicenceNo: string;
}

const AddressTab: FC<Props> = ({ isActive, scalerLicenceNo }) => {
  const { userToken } = useAuth();

  const addressQuery = useQuery({
    queryKey: ['scaler-address', scalerLicenceNo],
    queryFn: async () => {
      const token = await userToken();
      return API.scalers.getScalerAddress(scalerLicenceNo, token);
    },
    enabled: isActive && Boolean(scalerLicenceNo),
  });

  const loading = addressQuery.isLoading && !addressQuery.data;
  const loadError = addressQuery.error
    ? extractApiError(addressQuery.error, 'Address unavailable.')
    : null;
  const address = addressQuery.data;

  return (
    <div className="scs__tab-view__panel">
      {loadError ? (
        <InlineNotification
          kind="error"
          lowContrast
          title="Address unavailable."
          subtitle={loadError}
          className="view-scaler__notification"
        />
      ) : null}

      {loading ? <SkeletonText paragraph lineCount={8} /> : null}

      {!loading && !loadError && !address ? (
        <p>No address found for this scaler.</p>
      ) : null}

      {!loading && !loadError && address ? (
        <Grid>
          <Column lg={8} md={4} sm={4}>
            <h4>Contact Info</h4>
            <Table size="sm" useZebraStyles className="scs__tab-view__table" aria-label="Scaler contact info">
              <TableBody>
                <TableRow>
                  <TableCell className="scs__tab-view__label">Company Name:</TableCell>
                  <TableCell>{asText(address.company)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="scs__tab-view__label">Last Name:</TableCell>
                  <TableCell>{asText(address.lastName)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="scs__tab-view__label">First Name:</TableCell>
                  <TableCell>{asText(address.firstName)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="scs__tab-view__label">Bus. Phone #:</TableCell>
                  <TableCell>{asText(formatPhone(address.businessPhone))}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="scs__tab-view__label">Res. Phone #:</TableCell>
                  <TableCell>{asText(formatPhone(address.homePhone))}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="scs__tab-view__label">Cell Phone #:</TableCell>
                  <TableCell>{asText(formatPhone(address.cellPhone))}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="scs__tab-view__label">Fax #:</TableCell>
                  <TableCell>{asText(formatPhone(address.faxNumber))}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="scs__tab-view__label">Email:</TableCell>
                  <TableCell>{asText(address.emailAddress)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Column>

          <Column lg={8} md={4} sm={4}>
            <h4>Address</h4>
            <Table size="sm" useZebraStyles className="scs__tab-view__table" aria-label="Scaler address">
              <TableBody>
                <TableRow>
                  <TableCell className="scs__tab-view__label">Address Line 1:</TableCell>
                  <TableCell>{asText(address.address1)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="scs__tab-view__label">Address Line 2:</TableCell>
                  <TableCell>{asText(address.address2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="scs__tab-view__label">Address Line 3:</TableCell>
                  <TableCell>{asText(address.address3)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="scs__tab-view__label">City:</TableCell>
                  <TableCell>{asText(address.city)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="scs__tab-view__label">Province:</TableCell>
                  <TableCell>{asText(address.province)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="scs__tab-view__label">Country:</TableCell>
                  <TableCell>{asText(address.country)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="scs__tab-view__label">Postal Code:</TableCell>
                  <TableCell>{asText(address.postalCode)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Column>
        </Grid>
      ) : null}
    </div>
  );
};

export default AddressTab;

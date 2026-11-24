import {
  Column,
  Grid,
  Link,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TextArea,
  TextInput,
} from '@carbon/react';
import type { FC, ReactNode } from 'react';

import { PERMISSIONS } from '@/context/auth/permissions';
import { usePermissions } from '@/context/auth/usePermissions';
import DdnDdvTable from '@/components/core/DdnDdvTable';
import type { StaticLov } from '@/services/lov.service';
import { NET_VALUE_MAX_LENGTH } from '@/utils/netValue';
import { requiredLabel } from '@/utils/requiredLabel';

export type CheckScaleFormMode = 'create' | 'edit' | 'view';

export type CheckScaleFormYesNo = 'Yes' | 'No' | '';

export interface CheckScaleFormValues {
  // header
  returnType: 'Log Tally' | 'Sample Log Tally';
  checkDdn: string;
  checkDdv: string;
  originalDdn: string;
  originalDdv: string;

  // editable in create + edit, read-only in view
  checkScaleType: string;
  followedGoodPractices: CheckScaleFormYesNo;
  originalWithinStandard: CheckScaleFormYesNo;
  comment: string;
  originalNetValue: string;
  checkNetValue: string;

  // HBS-derived, read-only in all modes
  checkScalerLicence: string;
  originalScalerLicence: string;
  secondScalerLicence: string;
  loadArrival: string;
  weighSlip: string;
  timberMark: string;
  scaleSite: string;
  checkReplacesOriginal: string;
  population: string;
  stratum: string;
  year: string;

  // scale-side comparison (read-only on both sides for date/return#/tops/butts/length)
  originalScaleDate: string;
  checkScaleDate: string;
  originalScaleReturn: string;
  checkScaleReturn: string;
  originalTops: string;
  checkTops: string;
  originalButts: string;
  checkButts: string;
  originalLength: string;
  checkLength: string;

  // Net Volume — view-only display
  originalNetVolume: string;
  checkNetVolume: string;
}

export type CheckScaleFormEditableField =
  | 'checkScaleType'
  | 'followedGoodPractices'
  | 'originalWithinStandard'
  | 'comment'
  | 'originalNetValue'
  | 'checkNetValue';

export type CheckScaleFormErrors = Partial<Record<CheckScaleFormEditableField, string>>;

export interface CheckScaleFormProps {
  mode: CheckScaleFormMode;
  values: CheckScaleFormValues;
  checkScaleTypeOptions: StaticLov[];
  errors?: CheckScaleFormErrors;
  onChange?: (field: CheckScaleFormEditableField, value: string) => void;
  /**
   * View-only affordance — when set and {@code mode === 'view'}, the three scaler-licence fields
   * render as clickable links instead of read-only text inputs. Returns the link URL for a given
   * licence number.
   */
  licenceLinkHref?: (licenceNo: string) => string;
}

const labeledLink = (id: string, label: string, value: string, href?: string): ReactNode => {
  if (!value || !href) {
    return <TextInput id={id} labelText={label} value={value} readOnly />;
  }
  return (
    <div className="cds--form-item">
      <div className="cds--label">{label}</div>
      <div
        style={{
          width: '100%',
          minHeight: '2.5rem',
          padding: '0 1rem',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid var(--cds-border-subtle)',
        }}
      >
        <Link id={id} href={href}>
          {value}
        </Link>
      </div>
    </div>
  );
};

const lookupDescription = (options: StaticLov[], code: string): string => {
  if (!code) {
    return '';
  }
  const match = options.find((o) => o.code === code);
  return match?.description ?? code;
};

const CheckScaleForm: FC<CheckScaleFormProps> = ({
  mode,
  values,
  checkScaleTypeOptions,
  errors = {},
  onChange,
  licenceLinkHref,
}) => {
  const { can } = usePermissions();
  const canReadScaler = can(PERMISSIONS.SCALER_READ);
  const readOnly = mode === 'view';
  // Net Volume is a view-only display row; legacy create/edit forms omit it (createCheckScale2.jsp /
  // updateCheckScale.jsp end at Net Value, viewCheckScale.jsp adds Net Volume after it).
  const showNetVolume = mode === 'view';
  const change = (field: CheckScaleFormEditableField) => (e: { target: { value: string } }) =>
    onChange?.(field, e.target.value);

  const licenceField = (id: string, label: string, value: string) => {
    if (readOnly && licenceLinkHref) {
      // No SCALER_READ → the value stays, as a read-only field rather than a link that would deny.
      return labeledLink(
        id,
        label,
        value,
        value && canReadScaler ? licenceLinkHref(value) : undefined,
      );
    }
    return <TextInput id={id} labelText={label} value={value} readOnly />;
  };

  return (
    <Grid style={{ rowGap: '32px', marginTop: '8px' }}>
      <Column lg={16} md={8} sm={4}>
        <div style={{ marginBottom: '8px' }}>
          <strong>Return Type:</strong> {values.returnType}
        </div>
        <DdnDdvTable
          checkDdn={values.checkDdn}
          checkDdv={values.checkDdv}
          originalDdn={values.originalDdn}
          originalDdv={values.originalDdv}
          readOnly
        />
      </Column>

      <Column lg={8} md={8} sm={4}>
        {readOnly ? (
          <TextInput
            id="check-scale-type"
            labelText="Check Scale Type"
            value={lookupDescription(checkScaleTypeOptions, values.checkScaleType)}
            readOnly
          />
        ) : (
          <Select
            id="check-scale-type"
            labelText={requiredLabel('Check Scale Type:', 'scs__required')}
            value={values.checkScaleType}
            onChange={change('checkScaleType')}
            required
            invalid={Boolean(errors.checkScaleType)}
            invalidText={errors.checkScaleType}
          >
            <SelectItem value="" text="" />
            {checkScaleTypeOptions.map((opt) => (
              <SelectItem
                key={opt.code ?? ''}
                value={opt.code ?? ''}
                text={opt.description ?? opt.code ?? ''}
              />
            ))}
          </Select>
        )}
      </Column>

      <Column lg={8} md={8} sm={4}>
        {licenceField('check-scaler-licence', 'Check Scaler Licence #', values.checkScalerLicence)}
      </Column>
      <Column lg={8} md={8} sm={4}>
        {licenceField('original-scaler-licence', 'Original Scaler Licence #', values.originalScalerLicence)}
      </Column>
      <Column lg={8} md={8} sm={4}>
        {licenceField('second-scaler-licence', 'Second Scaler Licence #', values.secondScalerLicence)}
      </Column>

      <Column lg={8} md={8} sm={4}>
        <TextInput id="load-arrival" labelText="Load Arrival #" value={values.loadArrival} readOnly />
      </Column>
      <Column lg={8} md={8} sm={4}>
        <TextInput id="weigh-slip" labelText="Weigh Slip #" value={values.weighSlip} readOnly />
      </Column>

      <Column lg={8} md={8} sm={4}>
        <TextInput id="timber-mark" labelText="Timber Mark" value={values.timberMark} readOnly />
      </Column>
      <Column lg={8} md={8} sm={4}>
        <TextInput id="scale-site" labelText="Scale Site #" value={values.scaleSite} readOnly />
      </Column>

      <Column lg={8} md={8} sm={4}>
        {readOnly ? (
          <TextInput
            id="followed-good-practices"
            labelText="Followed Good Practices?"
            value={values.followedGoodPractices}
            readOnly
          />
        ) : (
          <Select
            id="followed-good-practices"
            labelText={requiredLabel('Followed Good Practices?', 'scs__required')}
            value={values.followedGoodPractices}
            onChange={change('followedGoodPractices')}
            required
            invalid={Boolean(errors.followedGoodPractices)}
            invalidText={errors.followedGoodPractices}
          >
            <SelectItem value="" text="" />
            <SelectItem value="Yes" text="Yes" />
            <SelectItem value="No" text="No" />
          </Select>
        )}
      </Column>

      <Column lg={8} md={8} sm={4}>
        {readOnly ? (
          <TextInput
            id="original-within-standard"
            labelText="Original within Standard?"
            value={values.originalWithinStandard}
            readOnly
          />
        ) : (
          <Select
            id="original-within-standard"
            labelText={requiredLabel('Original within Standard?', 'scs__required')}
            value={values.originalWithinStandard}
            onChange={change('originalWithinStandard')}
            required
            invalid={Boolean(errors.originalWithinStandard)}
            invalidText={errors.originalWithinStandard}
          >
            <SelectItem value="" text="" />
            <SelectItem value="Yes" text="Yes" />
            <SelectItem value="No" text="No" />
          </Select>
        )}
      </Column>

      <Column lg={8} md={8} sm={4}>
        <TextInput
          id="check-replaces-original"
          labelText="Check Replaces Original?"
          value={values.checkReplacesOriginal}
          readOnly
        />
      </Column>

      <Column lg={8} md={8} sm={4}>
        <TextInput id="population" labelText="Population" value={values.population} readOnly />
      </Column>
      <Column lg={8} md={8} sm={4}>
        <TextInput id="stratum" labelText="Stratum" value={values.stratum} readOnly />
      </Column>
      <Column lg={8} md={8} sm={4}>
        <TextInput id="year" labelText="Year" value={values.year} readOnly />
      </Column>

      <Column lg={16} md={8} sm={4}>
        <TextArea
          id="check-scaler-comment"
          labelText="Check Scaler Comment"
          value={values.comment}
          onChange={readOnly ? undefined : change('comment')}
          readOnly={readOnly}
          maxLength={4000}
          rows={5}
        />
      </Column>

      <Column lg={16} md={8} sm={4}>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader scope="col" />
              <TableHeader scope="col">Original Scale</TableHeader>
              <TableHeader scope="col">Check Scale</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableHeader scope="row">Date of Scale</TableHeader>
              <TableCell>
                <TextInput id="orig-date" labelText="" value={values.originalScaleDate} readOnly />
              </TableCell>
              <TableCell>
                <TextInput id="check-date" labelText="" value={values.checkScaleDate} readOnly />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableHeader scope="row">Scale Return #</TableHeader>
              <TableCell>
                <TextInput id="orig-return" labelText="" value={values.originalScaleReturn} readOnly />
              </TableCell>
              <TableCell>
                <TextInput id="check-return" labelText="" value={values.checkScaleReturn} readOnly />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableHeader scope="row">Tops (total)</TableHeader>
              <TableCell>
                <TextInput id="orig-tops" labelText="" value={values.originalTops} readOnly />
              </TableCell>
              <TableCell>
                <TextInput id="check-tops" labelText="" value={values.checkTops} readOnly />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableHeader scope="row">Butts (total)</TableHeader>
              <TableCell>
                <TextInput id="orig-butts" labelText="" value={values.originalButts} readOnly />
              </TableCell>
              <TableCell>
                <TextInput id="check-butts" labelText="" value={values.checkButts} readOnly />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableHeader scope="row">Length (total)</TableHeader>
              <TableCell>
                <TextInput id="orig-length" labelText="" value={values.originalLength} readOnly />
              </TableCell>
              <TableCell>
                <TextInput id="check-length" labelText="" value={values.checkLength} readOnly />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableHeader scope="row">
                {readOnly ? 'Net Value' : requiredLabel('Net Value', 'scs__required')}
              </TableHeader>
              <TableCell>
                <TextInput
                  id="orig-net"
                  labelText=""
                  type="text"
                  inputMode={readOnly ? undefined : 'decimal'}
                  maxLength={NET_VALUE_MAX_LENGTH}
                  value={values.originalNetValue}
                  onChange={readOnly ? undefined : change('originalNetValue')}
                  readOnly={readOnly}
                  required={!readOnly}
                  invalid={Boolean(errors.originalNetValue)}
                  invalidText={errors.originalNetValue}
                />
              </TableCell>
              <TableCell>
                <TextInput
                  id="check-net"
                  labelText=""
                  type="text"
                  inputMode={readOnly ? undefined : 'decimal'}
                  maxLength={NET_VALUE_MAX_LENGTH}
                  value={values.checkNetValue}
                  onChange={readOnly ? undefined : change('checkNetValue')}
                  readOnly={readOnly}
                  required={!readOnly}
                  invalid={Boolean(errors.checkNetValue)}
                  invalidText={errors.checkNetValue}
                />
              </TableCell>
            </TableRow>
            {showNetVolume && (
              <TableRow>
                <TableHeader scope="row">Net Volume</TableHeader>
                <TableCell>
                  <TextInput id="orig-net-volume" labelText="" value={values.originalNetVolume} readOnly />
                </TableCell>
                <TableCell>
                  <TextInput id="check-net-volume" labelText="" value={values.checkNetVolume} readOnly />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Column>
    </Grid>
  );
};

export default CheckScaleForm;

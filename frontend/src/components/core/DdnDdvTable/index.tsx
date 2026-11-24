import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TextInput } from '@carbon/react';
import React from 'react';

interface Props {
  checkLabel?: string;
  originalLabel?: string;
  checkDdn: string;
  checkDdv: string;
  originalDdn: string;
  originalDdv: string;
  readOnly?: boolean;
  onChangeCheckDdn?: (v: string) => void;
  onChangeCheckDdv?: (v: string) => void;
  onChangeOriginalDdn?: (v: string) => void;
  onChangeOriginalDdv?: (v: string) => void;
  checkDdnError?: string;
  checkDdvError?: string;
  originalDdnError?: string;
  originalDdvError?: string;
}

const DdnDdvTable: React.FC<Props> = ({
  checkLabel = 'Check Scale',
  originalLabel = 'Original Scale',
  checkDdn,
  checkDdv,
  originalDdn,
  originalDdv,
  readOnly = false,
  onChangeCheckDdn,
  onChangeCheckDdv,
  onChangeOriginalDdn,
  onChangeOriginalDdv,
  checkDdnError,
  checkDdvError,
  originalDdnError,
  originalDdvError,
}) => {
  return (
    <div style={{ marginTop: 12 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeader scope="col" />
            <TableHeader scope="col">DDN</TableHeader>
            <TableHeader scope="col">DDV</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableHeader scope="row">{checkLabel}</TableHeader>
            <TableCell>
              <TextInput
                id="ddn-check"
                labelText=""
                maxLength={13}
                value={checkDdn}
                readOnly={readOnly}
                required={!readOnly}
                aria-required={!readOnly}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChangeCheckDdn?.(e.target.value)}
                invalid={Boolean(checkDdnError)}
                invalidText={checkDdnError}
              />
            </TableCell>
            <TableCell>
              <TextInput
                id="ddv-check"
                labelText=""
                maxLength={9}
                value={checkDdv}
                readOnly={readOnly}
                required={!readOnly}
                aria-required={!readOnly}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChangeCheckDdv?.(e.target.value)}
                invalid={Boolean(checkDdvError)}
                invalidText={checkDdvError}
              />
            </TableCell>
          </TableRow>
          <TableRow>
            <TableHeader scope="row">{originalLabel}</TableHeader>
            <TableCell>
              <TextInput
                id="ddn-orig"
                labelText=""
                maxLength={13}
                value={originalDdn}
                readOnly={readOnly}
                required={!readOnly}
                aria-required={!readOnly}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChangeOriginalDdn?.(e.target.value)}
                invalid={Boolean(originalDdnError)}
                invalidText={originalDdnError}
              />
            </TableCell>
            <TableCell>
              <TextInput
                id="ddv-orig"
                labelText=""
                maxLength={9}
                value={originalDdv}
                readOnly={readOnly}
                required={!readOnly}
                aria-required={!readOnly}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChangeOriginalDdv?.(e.target.value)}
                invalid={Boolean(originalDdvError)}
                invalidText={originalDdvError}
              />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

export default DdnDdvTable;
